import time
import re
from typing import Dict, Any, List, Optional
from sqlalchemy import text, inspect
from app.extensions import db
from app.models.dataset import Dataset, DatasetTable
from app.models.query_history import QueryHistory
from app.utils.query_builder import build_display_sql, build_execution_sql
from app.utils.security import check_destructive_sql, mask_sensitive_error, strip_sql_comments

class QueryService:
    @staticmethod
    def execute_query(user_id: int, dataset_id: int, query_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a visual query or safe SQL query against the user's dataset.
        query_data can be:
        - Structured: {'query_spec': {...}}
        - Or Direct SQL: {'raw_sql': '...'}
        """
        # 1. Verify dataset ownership
        dataset = Dataset.query.filter_by(id=dataset_id, user_id=user_id).first()
        if not dataset:
            raise ValueError("Dataset not found or access denied.")

        # Build table mappings: e.g. {'students': 'ds_1_students'}
        tables = DatasetTable.query.filter_by(dataset_id=dataset.id).all()
        if not tables:
            raise ValueError("This dataset has no tables.")

        table_mapping = {t.table_name: t.physical_table_name for t in tables}

        # Build allowed columns map
        inspector = inspect(db.engine)
        allowed_columns_map = {}
        for t in tables:
            cols = {c['name'] for c in inspector.get_columns(t.physical_table_name) if c['name'] != '_row_id'}
            allowed_columns_map[t.table_name] = cols

        query_spec = query_data.get('query_spec')
        raw_sql = query_data.get('raw_sql') or query_data.get('sql')

        # If query_spec is a dict that contains raw_sql and not a table spec, unwrap it
        if isinstance(query_spec, dict) and ('raw_sql' in query_spec or 'sql' in query_spec) and not query_spec.get('table'):
            raw_sql = query_spec.get('raw_sql') or query_spec.get('sql')
            query_spec = None

        if query_spec:
            display_sql = build_display_sql(query_spec)
            exec_sql_str, params = build_execution_sql(query_spec, table_mapping, allowed_columns_map)
        elif raw_sql:
            display_sql = str(raw_sql).strip()
            # Safety check on raw SQL
            is_safe, sec_err = check_destructive_sql(display_sql)
            if not is_safe:
                # Record failed query in history
                history = QueryHistory(
                    user_id=user_id,
                    dataset_id=dataset_id,
                    query_text=display_sql,
                    status='error',
                    error_message=sec_err,
                    execution_time=0.0
                )
                db.session.add(history)
                db.session.commit()
                return {
                    'success': False,
                    'display_sql': display_sql,
                    'error': sec_err
                }

            # Strip SQL comments for engine execution to prevent MySQL 1064 syntax errors
            # while preserving user's original commented query in display_sql
            exec_sql_str = strip_sql_comments(display_sql).strip()

            if not exec_sql_str:
                return {
                    'success': False,
                    'display_sql': display_sql,
                    'error': 'Query contains only comments or whitespace. Please enter an executable SQL statement.'
                }

            # Replace logical table names with physical table names in raw SQL
            for log_name, phys_name in sorted(table_mapping.items(), key=lambda x: len(x[0]), reverse=True):
                # Match `table_name`, "table_name", or bare table_name to avoid double backtick escaping
                pattern = rf'[`"]{re.escape(log_name)}[`"]|\b{re.escape(log_name)}\b'
                exec_sql_str = re.sub(pattern, f"`{phys_name}`", exec_sql_str, flags=re.IGNORECASE)

            # Ensure trailing semicolon is stripped before adding LIMIT
            exec_sql_str = exec_sql_str.strip().rstrip(';').strip()
            if exec_sql_str.lstrip().upper().startswith('SELECT') and not re.search(r'\bLIMIT\b', exec_sql_str, re.IGNORECASE):
                exec_sql_str += " LIMIT 100"

            params = {}
        else:
            raise ValueError("Either 'query_spec' or 'raw_sql' must be provided.")

        # 2. Execute SQL with timing
        start_time = time.perf_counter()
        try:
            stmt = text(exec_sql_str)
            result = db.session.execute(stmt, params)

            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if result.returns_rows:
                rows_data = []
                # Clean column names (strip physical table prefixes if any, and skip internal `_row_id`)
                raw_columns = list(result.keys())
                clean_columns = [c for c in raw_columns if c != '_row_id']

                for row in result.mappings():
                    r_dict = dict(row)
                    if '_row_id' in r_dict:
                        del r_dict['_row_id']
                    rows_data.append(r_dict)

                # Record success in query_history
                history = QueryHistory(
                    user_id=user_id,
                    dataset_id=dataset_id,
                    query_text=display_sql,
                    status='success',
                    execution_time=elapsed_ms
                )
                db.session.add(history)
                db.session.commit()

                return {
                    'success': True,
                    'operation': query_spec.get('operation', 'SELECT') if query_spec else 'SELECT',
                    'display_sql': display_sql,
                    'columns': clean_columns,
                    'rows': rows_data,
                    'row_count': len(rows_data),
                    'execution_time_ms': elapsed_ms,
                    'history_id': history.id
                }
            else:
                affected_rows = result.rowcount
                db.session.commit()

                # Update row count in dataset_tables if affected
                target_table_name = query_spec.get('table') if query_spec else None
                for t in tables:
                    if not target_table_name or t.table_name == target_table_name:
                        try:
                            cnt_res = db.session.execute(text(f"SELECT COUNT(*) FROM `{t.physical_table_name}`")).scalar()
                            t.row_count = cnt_res if cnt_res is not None else 0
                        except Exception:
                            pass
                db.session.commit()

                # Record success in query_history
                history = QueryHistory(
                    user_id=user_id,
                    dataset_id=dataset_id,
                    query_text=display_sql,
                    status='success',
                    execution_time=elapsed_ms
                )
                db.session.add(history)
                db.session.commit()

                op = (query_spec.get('operation') if query_spec else None) or 'DML'
                return {
                    'success': True,
                    'operation': op,
                    'display_sql': display_sql,
                    'affected_rows': affected_rows,
                    'message': f"Query executed successfully. {affected_rows} row(s) affected.",
                    'columns': [],
                    'rows': [],
                    'row_count': 0,
                    'execution_time_ms': elapsed_ms,
                    'history_id': history.id
                }

        except Exception as e:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            safe_err = mask_sensitive_error(str(e))

            # Record failure in query_history
            try:
                db.session.rollback()
                history = QueryHistory(
                    user_id=user_id,
                    dataset_id=dataset_id,
                    query_text=display_sql,
                    status='error',
                    error_message=safe_err,
                    execution_time=elapsed_ms
                )
                db.session.add(history)
                db.session.commit()
            except Exception:
                db.session.rollback()

            return {
                'success': False,
                'display_sql': display_sql,
                'error': safe_err,
                'execution_time_ms': elapsed_ms
            }

    @staticmethod
    def get_user_history(user_id: int, page: int = 1, per_page: int = 20) -> Dict[str, Any]:
        """Fetch paginated query history for the user, newest first."""
        query = QueryHistory.query.filter_by(user_id=user_id).order_by(QueryHistory.created_at.desc())
        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()

        return {
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page if total > 0 else 1,
            'history': [item.to_dict() for item in items]
        }

    @staticmethod
    def get_history_detail(user_id: int, history_id: int) -> Optional[Dict[str, Any]]:
        item = QueryHistory.query.filter_by(id=history_id, user_id=user_id).first()
        return item.to_dict() if item else None

    @staticmethod
    def explain_query(sql: str) -> Dict[str, Any]:
        """Parse query clauses and return educational execution lifecycle steps."""
        if not sql or not sql.strip():
            return {'success': False, 'message': 'SQL query cannot be empty.'}

        clean = sql.strip().rstrip(';')
        clean_upper = clean.upper()

        steps = []

        # 1. FROM & JOIN
        from_match = re.search(r'\bFROM\s+([a-zA-Z0-9_`.]+)', clean, re.IGNORECASE)
        from_table = from_match.group(1).replace('`', '') if from_match else "Target Table"

        join_matches = re.findall(r'\b(INNER|LEFT|RIGHT|CROSS|FULL)?\s*JOIN\s+([a-zA-Z0-9_`.]+)', clean, re.IGNORECASE)
        join_desc = f"Loads base table `{from_table}`."
        if join_matches:
            joined_tables = ", ".join([f"{j[0] or 'INNER'} JOIN `{j[1].replace('`', '')}`" for j in join_matches])
            join_desc += f" Performs {joined_tables} and evaluates ON join conditions."

        steps.append({
            'step_num': 1,
            'clause': 'FROM & JOIN',
            'action': 'Identify & Combine Base Tables',
            'description': join_desc,
            'active': True,
            'pedagogical_tip': 'SQL engines always execute FROM and JOINs first to determine the working dataset before any filtering or calculations.'
        })

        # 2. WHERE
        where_match = re.search(r'\bWHERE\s+(.*?)(?=\bGROUP\s+BY\b|\bHAVING\b|\bORDER\s+BY\b|\bLIMIT\b|$)', clean, re.IGNORECASE | re.DOTALL)
        has_where = bool(where_match)
        steps.append({
            'step_num': 2,
            'clause': 'WHERE',
            'action': 'Row-Level Filtering',
            'description': f"Filters rows using condition: `{where_match.group(1).strip()}`" if has_where else "No WHERE filter applied (all rows passed forward).",
            'active': has_where,
            'pedagogical_tip': 'WHERE filters rows individually BEFORE grouping. This is why you CANNOT use aggregate functions (like SUM or COUNT) or column aliases inside WHERE.'
        })

        # 3. GROUP BY
        group_match = re.search(r'\bGROUP\s+BY\s+(.*?)(?=\bHAVING\b|\bORDER\s+BY\b|\bLIMIT\b|$)', clean, re.IGNORECASE | re.DOTALL)
        has_group = bool(group_match)
        steps.append({
            'step_num': 3,
            'clause': 'GROUP BY',
            'action': 'Aggregate Grouping',
            'description': f"Groups surviving rows by `{group_match.group(1).strip()}` for aggregate calculations." if has_group else "No GROUP BY clause (query operates as a single group or row-by-row).",
            'active': has_group,
            'pedagogical_tip': 'GROUP BY collapses rows with matching keys into single summary rows. Any non-aggregated column in SELECT must be included here.'
        })

        # 4. HAVING
        having_match = re.search(r'\bHAVING\s+(.*?)(?=\bORDER\s+BY\b|\bLIMIT\b|$)', clean, re.IGNORECASE | re.DOTALL)
        has_having = bool(having_match)
        steps.append({
            'step_num': 4,
            'clause': 'HAVING',
            'action': 'Aggregate Group Filtering',
            'description': f"Filters grouped records matching `{having_match.group(1).strip()}`." if has_having else "No HAVING filter applied.",
            'active': has_having,
            'pedagogical_tip': 'HAVING is the WHERE clause for groups! It runs after GROUP BY has created aggregate values (e.g. HAVING COUNT(*) > 5).'
        })

        # 5. SELECT & Window Functions
        select_match = re.search(r'\bSELECT\s+(.*?)(?=\bFROM\b|$)', clean, re.IGNORECASE | re.DOTALL)
        select_cols = select_match.group(1).strip() if select_match else "*"
        has_window = 'OVER (' in clean_upper or 'OVER(' in clean_upper
        steps.append({
            'step_num': 5,
            'clause': 'SELECT & WINDOW FUNCTIONS',
            'action': 'Project Columns & Calculate Expressions',
            'description': f"Evaluates expressions and selects: `{select_cols}`" + (" (Includes Window Functions)." if has_window else "."),
            'active': True,
            'pedagogical_tip': 'SELECT runs late in the pipeline! This is where column aliases (AS alias_name) are created.'
        })

        # 6. DISTINCT
        has_distinct = 'DISTINCT' in clean_upper
        steps.append({
            'step_num': 6,
            'clause': 'DISTINCT',
            'action': 'Duplicate Elimination',
            'description': 'Removes duplicate row combinations from the final projected set.' if has_distinct else 'No DISTINCT deduplication requested.',
            'active': has_distinct,
            'pedagogical_tip': 'DISTINCT only runs after SELECT has determined which columns are in the output.'
        })

        # 7. ORDER BY
        order_match = re.search(r'\bORDER\s+BY\s+(.*?)(?=\bLIMIT\b|$)', clean, re.IGNORECASE | re.DOTALL)
        has_order = bool(order_match)
        steps.append({
            'step_num': 7,
            'clause': 'ORDER BY',
            'action': 'Sort Output Rows',
            'description': f"Sorts result set by `{order_match.group(1).strip()}`." if has_order else "No specific sort order (database default order returned).",
            'active': has_order,
            'pedagogical_tip': 'ORDER BY runs after SELECT, which is why ORDER BY CAN use column aliases and aggregate values computed in SELECT!'
        })

        # 8. LIMIT & OFFSET
        limit_match = re.search(r'\bLIMIT\s+([0-9]+)(\s+OFFSET\s+[0-9]+)?', clean, re.IGNORECASE)
        has_limit = bool(limit_match)
        steps.append({
            'step_num': 8,
            'clause': 'LIMIT & OFFSET',
            'action': 'Paginate & Restrict Rows',
            'description': f"Restricts output to `{limit_match.group(0).strip()}`." if has_limit else "Returns all matching rows.",
            'active': has_limit,
            'pedagogical_tip': 'LIMIT is the very last operation. It slices the final sorted output before sending records back to the client.'
        })

        return {
            'success': True,
            'query': sql,
            'execution_steps': steps,
            'active_step_count': sum(1 for s in steps if s['active'])
        }

