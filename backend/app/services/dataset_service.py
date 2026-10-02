from typing import List, Dict, Any, Optional
from sqlalchemy import text, inspect
from app.extensions import db
from app.models.dataset import Dataset, DatasetTable
from app.models.query_history import QueryHistory
from app.utils.security import sanitize_identifier

SUPPORTED_TYPES = {
    'INT': 'INT',
    'VARCHAR': 'VARCHAR(255)',
    'TEXT': 'TEXT',
    'FLOAT': 'FLOAT',
    'DOUBLE': 'DOUBLE',
    'BOOLEAN': 'BOOLEAN',
    'DATE': 'DATE',
    'DATETIME': 'DATETIME'
}

class DatasetService:
    @staticmethod
    def get_user_datasets(user_id: int) -> List[Dict[str, Any]]:
        datasets = Dataset.query.filter_by(user_id=user_id).order_by(Dataset.created_at.desc()).all()
        return [d.to_dict(include_tables=True) for d in datasets]

    @staticmethod
    def get_dataset(user_id: int, dataset_id: int) -> Optional[Dataset]:
        """Fetch dataset and verify user ownership."""
        return Dataset.query.filter_by(id=dataset_id, user_id=user_id).first()

    @staticmethod
    def delete_dataset(user_id: int, dataset_id: int) -> bool:
        dataset = Dataset.query.filter_by(id=dataset_id, user_id=user_id).first()
        if not dataset:
            return False

        # Drop physical tables from MySQL
        for table in dataset.tables:
            try:
                db.session.execute(text(f"DROP TABLE IF EXISTS `{table.physical_table_name}`"))
            except Exception:
                pass

        db.session.delete(dataset)
        db.session.commit()
        return True

    @staticmethod
    def create_manual_dataset(
        user_id: int,
        dataset_name: str,
        table_name: str,
        columns: List[Dict[str, Any]],
        rows: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        if not dataset_name or not dataset_name.strip():
            raise ValueError("Dataset name is required.")

        clean_table_name = sanitize_identifier(table_name or "my_table")
        if not columns:
            raise ValueError("At least one column is required.")

        # Validate columns
        col_defs = []
        clean_col_names = []
        seen = set()

        for col in columns:
            raw_name = col.get('name', '').strip()
            c_name = sanitize_identifier(raw_name)
            if not c_name:
                continue

            orig_name = c_name
            idx = 1
            while c_name in seen:
                c_name = f"{orig_name}_{idx}"
                idx += 1
            seen.add(c_name)
            clean_col_names.append(c_name)

            raw_type = col.get('type', 'VARCHAR').upper()
            sql_type = SUPPORTED_TYPES.get(raw_type, 'VARCHAR(255)')
            nullable = "NULL" if col.get('nullable', True) else "NOT NULL"
            col_defs.append(f"`{c_name}` {sql_type} {nullable}")

        if not col_defs:
            raise ValueError("No valid columns provided.")

        try:
            # Create Dataset record
            dataset = Dataset(
                user_id=user_id,
                name=dataset_name.strip(),
                source_type='manual'
            )
            db.session.add(dataset)
            db.session.flush()

            physical_table = f"ds_{dataset.id}_{clean_table_name}"

            # Create physical table
            if db.engine.dialect.name == 'sqlite':
                create_sql = f"""
                CREATE TABLE `{physical_table}` (
                    `_row_id` INTEGER PRIMARY KEY AUTOINCREMENT,
                    {', '.join(col_defs)}
                );
                """
            else:
                create_sql = f"""
                CREATE TABLE `{physical_table}` (
                    `_row_id` INT AUTO_INCREMENT PRIMARY KEY,
                    {', '.join(col_defs)}
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """
            db.session.execute(text(create_sql))

            # Insert initial rows if provided
            inserted_count = 0
            if rows and isinstance(rows, list):
                valid_rows = []
                for r in rows:
                    if isinstance(r, dict):
                        # Filter to known column keys
                        valid_r = {c: r.get(c, None) for c in clean_col_names}
                        valid_rows.append(valid_r)

                if valid_rows:
                    cols_str = ", ".join([f"`{c}`" for c in clean_col_names])
                    params_str = ", ".join([f":{c}" for c in clean_col_names])
                    insert_stmt = text(f"INSERT INTO `{physical_table}` ({cols_str}) VALUES ({params_str})")
                    db.session.execute(insert_stmt, valid_rows)
                    inserted_count = len(valid_rows)

            dataset_table = DatasetTable(
                dataset_id=dataset.id,
                table_name=clean_table_name,
                physical_table_name=physical_table,
                row_count=inserted_count
            )
            db.session.add(dataset_table)
            db.session.commit()

            return {
                'dataset': dataset.to_dict(include_tables=True),
                'table': dataset_table.to_dict(),
                'columns': clean_col_names,
                'row_count': inserted_count
            }
        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def create_table_in_dataset(
        user_id: int,
        dataset_id: int,
        table_name: str,
        columns: List[Dict[str, Any]],
        rows: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Create a new table inside an existing dataset."""
        dataset = Dataset.query.filter_by(id=dataset_id, user_id=user_id).first()
        if not dataset:
            raise ValueError("Dataset not found or access denied.")

        clean_table_name = sanitize_identifier(table_name or "my_table")
        if not clean_table_name:
            raise ValueError("Valid table name is required.")

        existing = DatasetTable.query.filter_by(dataset_id=dataset.id, table_name=clean_table_name).first()
        if existing:
            raise ValueError(f"Table '{clean_table_name}' already exists in this dataset.")

        if not columns:
            raise ValueError("At least one column is required.")

        # Validate columns
        col_defs = []
        clean_col_names = []
        seen = set()

        for col in columns:
            raw_name = col.get('name', '').strip()
            c_name = sanitize_identifier(raw_name)
            if not c_name:
                continue

            orig_name = c_name
            idx = 1
            while c_name in seen:
                c_name = f"{orig_name}_{idx}"
                idx += 1
            seen.add(c_name)
            clean_col_names.append(c_name)

            raw_type = col.get('type', 'VARCHAR').upper()
            sql_type = SUPPORTED_TYPES.get(raw_type, 'VARCHAR(255)')
            nullable = "NULL" if col.get('nullable', True) else "NOT NULL"
            col_defs.append(f"`{c_name}` {sql_type} {nullable}")

        if not col_defs:
            raise ValueError("No valid columns provided.")

        try:
            physical_table = f"ds_{dataset.id}_{clean_table_name}"

            # Create physical table
            if db.engine.dialect.name == 'sqlite':
                create_sql = f"""
                CREATE TABLE `{physical_table}` (
                    `_row_id` INTEGER PRIMARY KEY AUTOINCREMENT,
                    {', '.join(col_defs)}
                );
                """
            else:
                create_sql = f"""
                CREATE TABLE `{physical_table}` (
                    `_row_id` INT AUTO_INCREMENT PRIMARY KEY,
                    {', '.join(col_defs)}
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """
            db.session.execute(text(create_sql))

            # Insert initial rows if provided
            inserted_count = 0
            if rows and isinstance(rows, list):
                valid_rows = []
                for r in rows:
                    if isinstance(r, dict):
                        valid_r = {c: r.get(c, None) for c in clean_col_names}
                        valid_rows.append(valid_r)

                if valid_rows:
                    cols_str = ", ".join([f"`{c}`" for c in clean_col_names])
                    params_str = ", ".join([f":{c}" for c in clean_col_names])
                    insert_stmt = text(f"INSERT INTO `{physical_table}` ({cols_str}) VALUES ({params_str})")
                    db.session.execute(insert_stmt, valid_rows)
                    inserted_count = len(valid_rows)

            dataset_table = DatasetTable(
                dataset_id=dataset.id,
                table_name=clean_table_name,
                physical_table_name=physical_table,
                row_count=inserted_count
            )
            db.session.add(dataset_table)
            db.session.commit()

            return {
                'dataset': dataset.to_dict(include_tables=True),
                'table': dataset_table.to_dict(),
                'columns': clean_col_names,
                'row_count': inserted_count
            }
        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def get_table_details(user_id: int, dataset_id: int, table_name: str) -> Dict[str, Any]:
        """Fetch columns, types, row count, and first 10 sample rows."""
        dataset = Dataset.query.filter_by(id=dataset_id, user_id=user_id).first()
        if not dataset:
            raise ValueError("Dataset not found or access denied.")

        table_rec = DatasetTable.query.filter_by(dataset_id=dataset.id, table_name=table_name).first()
        if not table_rec:
            raise ValueError(f"Table '{table_name}' does not exist in this dataset.")

        physical_table = table_rec.physical_table_name

        # Inspect table columns
        inspector = inspect(db.engine)
        columns_meta = []
        for col in inspector.get_columns(physical_table):
            col_name = col['name']
            if col_name == '_row_id':
                continue
            columns_meta.append({
                'name': col_name,
                'type': str(col['type']),
                'nullable': col.get('nullable', True)
            })

        # Fetch row count
        count_res = db.session.execute(text(f"SELECT COUNT(*) FROM `{physical_table}`")).scalar() or 0
        table_rec.row_count = count_res
        db.session.commit()

        # Fetch sample rows (excluding internal `_row_id`)
        col_names = [c['name'] for c in columns_meta]
        sample_rows = []
        if col_names:
            select_cols = ", ".join([f"`{c}`" for c in col_names])
            query = text(f"SELECT {select_cols} FROM `{physical_table}` LIMIT 10")
            result = db.session.execute(query)
            for row in result.mappings():
                sample_rows.append(dict(row))

        return {
            'dataset_id': dataset.id,
            'dataset_name': dataset.name,
            'table_name': table_rec.table_name,
            'physical_table_name': physical_table,
            'row_count': count_res,
            'columns': columns_meta,
            'column_names': col_names,
            'preview_rows': sample_rows
        }

    @staticmethod
    def get_dataset_eer(
        user_id: Optional[int] = None,
        dataset_id: Optional[int] = None,
        dataset_name: Optional[str] = None,
        target_table: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate EER diagram metadata: tables, columns, primary keys, foreign keys, and relationships.
        Resolves both explicit SQL foreign keys and smart heuristic relationships.
        """
        dataset = None
        if dataset_id:
            dataset = Dataset.query.filter_by(id=dataset_id).first()
        elif dataset_name:
            dataset = Dataset.query.filter_by(name=dataset_name).first()

        table_records = []
        if dataset:
            table_records = list(dataset.tables)
        elif target_table:
            # Check if this target_table belongs to any dataset_table
            t_match = DatasetTable.query.filter(
                (DatasetTable.table_name == target_table) | (DatasetTable.physical_table_name == target_table)
            ).first()
            if t_match and t_match.dataset:
                dataset = t_match.dataset
                table_records = list(dataset.tables)
            else:
                table_records = [{'table_name': target_table, 'physical_table_name': target_table}]

        inspector = inspect(db.engine)
        schema_map = {}

        def normalize_name(s: str) -> str:
            clean = s.lower().replace('_table', '').replace('table', '')
            if clean.endswith('ies'):
                clean = clean[:-3] + 'y'
            elif clean.endswith('es'):
                clean = clean[:-2]
            elif clean.endswith('s'):
                clean = clean[:-1]
            return clean.replace('_', '')

        for t in table_records:
            t_name = t.table_name if hasattr(t, 'table_name') else t['table_name']
            p_name = t.physical_table_name if hasattr(t, 'physical_table_name') else t['physical_table_name']
            norm_t = normalize_name(t_name)

            try:
                raw_cols = inspector.get_columns(p_name)
            except Exception:
                continue

            pk_res = inspector.get_pk_constraint(p_name) or {}
            pk_cols = set(pk_res.get('constrained_columns', []))

            # Smart PK resolution if no explicit physical constraint exists
            if not pk_cols:
                # 1. Exact 'id'
                for c in raw_cols:
                    if c['name'].lower() == 'id':
                        pk_cols.add(c['name'])
                        break
            if not pk_cols:
                # 2. Table root prefix e.g. customer_id for customers_table, patient_id for patients
                for c in raw_cols:
                    c_low = c['name'].lower()
                    if c_low.startswith(norm_t) and (c_low.endswith('_id') or c_low.endswith('id')):
                        pk_cols.add(c['name'])
                        break
            if not pk_cols:
                # 3. First column ending with '_id'
                for c in raw_cols:
                    if c['name'].lower().endswith('_id') and c['name'] != '_row_id':
                        pk_cols.add(c['name'])
                        break

            # Physical row count
            try:
                row_cnt = db.session.execute(text(f"SELECT COUNT(*) FROM `{p_name}`")).scalar() or 0
            except Exception:
                row_cnt = getattr(t, 'row_count', 0) if hasattr(t, 'row_count') else 0

            cols_list = []
            for c in raw_cols:
                c_name = c['name']
                if c_name == '_row_id':
                    continue
                is_pk = c_name in pk_cols
                cols_list.append({
                    'name': c_name,
                    'type': str(c['type']),
                    'is_pk': is_pk,
                    'is_fk': False,
                    'ref_table': None,
                    'ref_col': None,
                    'nullable': c.get('nullable', True)
                })

            schema_map[t_name] = {
                'table_name': t_name,
                'physical_table_name': p_name,
                'row_count': row_cnt,
                'columns': cols_list
            }

        # Resolve relationships (Explicit + Heuristics)
        relationships = []
        rel_signatures = set()

        # Step 1: Explicit Foreign Keys from DB engine
        for t_name, t_info in schema_map.items():
            p_name = t_info['physical_table_name']
            try:
                fks = inspector.get_foreign_keys(p_name)
                for fk in fks:
                    referred_table = fk.get('referred_table')
                    constrained_cols = fk.get('constrained_columns', [])
                    referred_cols = fk.get('referred_columns', [])
                    for i in range(min(len(constrained_cols), len(referred_cols))):
                        from_c = constrained_cols[i]
                        to_c = referred_cols[i]
                        target_tname = referred_table
                        for candidate_tname, c_info in schema_map.items():
                            if c_info['physical_table_name'] == referred_table or candidate_tname == referred_table:
                                target_tname = candidate_tname
                                break

                        rel_key = f"{t_name}.{from_c}->{target_tname}.{to_c}"
                        if rel_key not in rel_signatures:
                            rel_signatures.add(rel_key)
                            relationships.append({
                                'id': rel_key,
                                'from_table': t_name,
                                'from_column': from_c,
                                'to_table': target_tname,
                                'to_column': to_c,
                                'cardinality': 'N:1',
                                'is_inferred': False
                            })
                            for col in t_info['columns']:
                                if col['name'] == from_c:
                                    col['is_fk'] = True
                                    col['ref_table'] = target_tname
                                    col['ref_col'] = to_c
            except Exception:
                pass

        # Step 2: Intelligent Heuristic Resolution (for CSVs/Excel/Manual datasets)
        for t_name, t_info in schema_map.items():
            norm_t = normalize_name(t_name)
            for col in t_info['columns']:
                if col['is_fk']:
                    continue
                c_name = col['name']
                c_low = c_name.lower()

                for target_tname, target_info in schema_map.items():
                    if target_tname == t_name:
                        continue
                    norm_target = normalize_name(target_tname)

                    # Look for Target Table PK
                    target_pk = next((tc for tc in target_info['columns'] if tc['is_pk']), None)

                    # Matches if column in current table starts with target entity name and ends with '_id' or 'id'
                    matches_target_prefix = (
                        c_low.startswith(norm_target) and (c_low.endswith('_id') or c_low.endswith('id'))
                    )
                    # Or if column has the exact same name as target table's PK (e.g. both have 'patient_id')
                    matches_same_col = (
                        target_pk and target_pk['name'].lower() == c_low and c_low != 'id'
                    )

                    if matches_target_prefix or matches_same_col:
                        # Prevent self/parent reversal: if this column is the PK of this table and matches its own root
                        if col['is_pk'] and c_low.startswith(norm_t):
                            continue

                        # Determine target column
                        target_col_name = None
                        if target_pk:
                            target_col_name = target_pk['name']
                        else:
                            for tc in target_info['columns']:
                                if tc['name'].lower() == c_low:
                                    target_col_name = tc['name']
                                    break

                        if target_col_name:
                            rel_key = f"{t_name}.{col['name']}->{target_tname}.{target_col_name}"
                            if rel_key not in rel_signatures:
                                rel_signatures.add(rel_key)
                                col['is_fk'] = True
                                col['ref_table'] = target_tname
                                col['ref_col'] = target_col_name
                                relationships.append({
                                    'id': rel_key,
                                    'from_table': t_name,
                                    'from_column': col['name'],
                                    'to_table': target_tname,
                                    'to_column': target_col_name,
                                    'cardinality': 'N:1',
                                })
                                break

        tables_output = list(schema_map.values())
        return {
            'dataset_id': dataset.id if dataset else None,
            'dataset_name': dataset.name if dataset else (dataset_name or target_table or 'Database Schema'),
            'table_count': len(tables_output),
            'tables': tables_output,
            'relationships': relationships
        }

    @staticmethod
    def insert_row(user_id: int, dataset_id: int, table_name: str, row_data: Dict[str, Any]) -> Dict[str, Any]:
        dataset = Dataset.query.filter_by(id=dataset_id, user_id=user_id).first()
        if not dataset:
            raise ValueError("Dataset not found or access denied.")

        table_rec = DatasetTable.query.filter_by(dataset_id=dataset.id, table_name=table_name).first()
        if not table_rec:
            raise ValueError(f"Table '{table_name}' not found.")

        # Get valid columns
        inspector = inspect(db.engine)
        valid_cols = {col['name'] for col in inspector.get_columns(table_rec.physical_table_name) if col['name'] != '_row_id'}

        filtered_data = {k: v for k, v in row_data.items() if k in valid_cols}
        if not filtered_data:
            raise ValueError("No matching columns to insert.")

        cols_str = ", ".join([f"`{k}`" for k in filtered_data.keys()])
        vals_str = ", ".join([f":{k}" for k in filtered_data.keys()])
        stmt = text(f"INSERT INTO `{table_rec.physical_table_name}` ({cols_str}) VALUES ({vals_str})")
        db.session.execute(stmt, filtered_data)

        # Update row count
        count_res = db.session.execute(text(f"SELECT COUNT(*) FROM `{table_rec.physical_table_name}`")).scalar() or 0
        table_rec.row_count = count_res
        db.session.commit()

        return {'success': True, 'row_count': count_res}

    @staticmethod
    def get_dashboard_stats(user_id: int) -> Dict[str, Any]:
        datasets_count = Dataset.query.filter_by(user_id=user_id).count()

        # Tables count across user's datasets
        tables_count = db.session.query(DatasetTable).join(Dataset).filter(Dataset.user_id == user_id).count()

        # Queries count
        queries_count = QueryHistory.query.filter_by(user_id=user_id).count()

        # Recent activities (datasets and queries)
        recent_datasets = Dataset.query.filter_by(user_id=user_id).order_by(Dataset.created_at.desc()).limit(5).all()
        recent_queries = QueryHistory.query.filter_by(user_id=user_id).order_by(QueryHistory.created_at.desc()).limit(5).all()

        return {
            'total_datasets': datasets_count,
            'total_tables': tables_count,
            'queries_executed': queries_count,
            'recent_datasets': [d.to_dict(include_tables=True) for d in recent_datasets],
            'recent_queries': [q.to_dict() for q in recent_queries]
        }

    @staticmethod
    def load_sample_dataset(user_id: int, sample_key: str) -> Dict[str, Any]:
        """Create a multi-table industry dataset for practice with 1-click."""
        presets = {
            'ecommerce': {
                'name': 'E-Commerce Global Store',
                'tables': [
                    {
                        'name': 'customers',
                        'columns': [
                            {'name': 'customer_id', 'type': 'INT'},
                            {'name': 'full_name', 'type': 'VARCHAR'},
                            {'name': 'email', 'type': 'VARCHAR'},
                            {'name': 'city', 'type': 'VARCHAR'},
                            {'name': 'country', 'type': 'VARCHAR'},
                            {'name': 'credit_limit', 'type': 'INT'}
                        ],
                        'rows': [
                            {'customer_id': 1, 'full_name': 'Alice Johnson', 'email': 'alice@shop.com', 'city': 'Berlin', 'country': 'Germany', 'credit_limit': 5000},
                            {'customer_id': 2, 'full_name': 'Bob Smith', 'email': 'bob@shop.com', 'city': 'London', 'country': 'UK', 'credit_limit': 3500},
                            {'customer_id': 3, 'full_name': 'Carlos Gomez', 'email': 'carlos@shop.com', 'city': 'Madrid', 'country': 'Spain', 'credit_limit': 7000},
                            {'customer_id': 4, 'full_name': 'Diana Ross', 'email': 'diana@shop.com', 'city': 'New York', 'country': 'USA', 'credit_limit': 8200},
                            {'customer_id': 5, 'full_name': 'Evan Wright', 'email': 'evan@shop.com', 'city': 'Toronto', 'country': 'Canada', 'credit_limit': 4000}
                        ]
                    },
                    {
                        'name': 'orders',
                        'columns': [
                            {'name': 'order_id', 'type': 'INT'},
                            {'name': 'customer_id', 'type': 'INT'},
                            {'name': 'order_date', 'type': 'VARCHAR'},
                            {'name': 'total_amount', 'type': 'FLOAT'},
                            {'name': 'order_status', 'type': 'VARCHAR'}
                        ],
                        'rows': [
                            {'order_id': 101, 'customer_id': 1, 'order_date': '2024-01-15', 'total_amount': 249.99, 'order_status': 'Completed'},
                            {'order_id': 102, 'customer_id': 2, 'order_date': '2024-01-18', 'total_amount': 120.50, 'order_status': 'Completed'},
                            {'order_id': 103, 'customer_id': 1, 'order_date': '2024-02-01', 'total_amount': 890.00, 'order_status': 'Shipped'},
                            {'order_id': 104, 'customer_id': 3, 'order_date': '2024-02-12', 'total_amount': 450.75, 'order_status': 'Pending'},
                            {'order_id': 105, 'customer_id': 4, 'order_date': '2024-02-15', 'total_amount': 1500.00, 'order_status': 'Completed'},
                            {'order_id': 106, 'customer_id': 2, 'order_date': '2024-03-02', 'total_amount': 65.00, 'order_status': 'Cancelled'}
                        ]
                    },
                    {
                        'name': 'products',
                        'columns': [
                            {'name': 'product_id', 'type': 'INT'},
                            {'name': 'product_name', 'type': 'VARCHAR'},
                            {'name': 'category', 'type': 'VARCHAR'},
                            {'name': 'price', 'type': 'FLOAT'},
                            {'name': 'stock_quantity', 'type': 'INT'}
                        ],
                        'rows': [
                            {'product_id': 1, 'product_name': 'Wireless Noise Cancelling Headphones', 'category': 'Electronics', 'price': 199.99, 'stock_quantity': 45},
                            {'product_id': 2, 'product_name': 'Ergonomic Office Chair', 'category': 'Furniture', 'price': 289.50, 'stock_quantity': 18},
                            {'product_id': 3, 'product_name': 'Mechanical Gaming Keyboard', 'category': 'Electronics', 'price': 89.99, 'stock_quantity': 60},
                            {'product_id': 4, 'product_name': '4K Ultra-HD Monitor 27-inch', 'category': 'Electronics', 'price': 349.00, 'stock_quantity': 25},
                            {'product_id': 5, 'product_name': 'Stainless Steel Thermal Flask', 'category': 'Home & Kitchen', 'price': 24.95, 'stock_quantity': 120}
                        ]
                    }
                ]
            },
            'streaming': {
                'name': 'Entertainment & Streaming Movies',
                'tables': [
                    {
                        'name': 'movies',
                        'columns': [
                            {'name': 'movie_id', 'type': 'INT'},
                            {'name': 'title', 'type': 'VARCHAR'},
                            {'name': 'genre', 'type': 'VARCHAR'},
                            {'name': 'release_year', 'type': 'INT'},
                            {'name': 'rating', 'type': 'FLOAT'},
                            {'name': 'duration_min', 'type': 'INT'}
                        ],
                        'rows': [
                            {'movie_id': 1, 'title': 'Inception', 'genre': 'Sci-Fi', 'release_year': 2010, 'rating': 8.8, 'duration_min': 148},
                            {'movie_id': 2, 'title': 'The Dark Knight', 'genre': 'Action', 'release_year': 2008, 'rating': 9.0, 'duration_min': 152},
                            {'movie_id': 3, 'title': 'Interstellar', 'genre': 'Sci-Fi', 'release_year': 2014, 'rating': 8.6, 'duration_min': 169},
                            {'movie_id': 4, 'title': 'Parasite', 'genre': 'Thriller', 'release_year': 2019, 'rating': 8.5, 'duration_min': 132},
                            {'movie_id': 5, 'title': 'Whiplash', 'genre': 'Drama', 'release_year': 2014, 'rating': 8.5, 'duration_min': 106},
                            {'movie_id': 6, 'title': 'Pulp Fiction', 'genre': 'Crime', 'release_year': 1994, 'rating': 8.9, 'duration_min': 154}
                        ]
                    },
                    {
                        'name': 'watch_history',
                        'columns': [
                            {'name': 'watch_id', 'type': 'INT'},
                            {'name': 'user_name', 'type': 'VARCHAR'},
                            {'name': 'movie_id', 'type': 'INT'},
                            {'name': 'watch_date', 'type': 'VARCHAR'},
                            {'name': 'completion_pct', 'type': 'INT'}
                        ],
                        'rows': [
                            {'watch_id': 1, 'user_name': 'Rahul', 'movie_id': 1, 'watch_date': '2024-03-01', 'completion_pct': 100},
                            {'watch_id': 2, 'user_name': 'Priya', 'movie_id': 2, 'watch_date': '2024-03-02', 'completion_pct': 100},
                            {'watch_id': 3, 'user_name': 'Rahul', 'movie_id': 3, 'watch_date': '2024-03-05', 'completion_pct': 75},
                            {'watch_id': 4, 'user_name': 'Amit', 'movie_id': 1, 'watch_date': '2024-03-07', 'completion_pct': 40},
                            {'watch_id': 5, 'user_name': 'Sneha', 'movie_id': 4, 'watch_date': '2024-03-10', 'completion_pct': 100}
                        ]
                    }
                ]
            },
            'tech_hr': {
                'name': 'Tech Enterprise & Payroll',
                'tables': [
                    {
                        'name': 'employees',
                        'columns': [
                            {'name': 'emp_id', 'type': 'INT'},
                            {'name': 'emp_name', 'type': 'VARCHAR'},
                            {'name': 'dept_id', 'type': 'INT'},
                            {'name': 'job_title', 'type': 'VARCHAR'},
                            {'name': 'salary', 'type': 'INT'},
                            {'name': 'hire_date', 'type': 'VARCHAR'}
                        ],
                        'rows': [
                            {'emp_id': 1, 'emp_name': 'Sarah Connor', 'dept_id': 1, 'job_title': 'Lead Software Engineer', 'salary': 115000, 'hire_date': '2021-03-15'},
                            {'emp_id': 2, 'emp_name': 'John Matrix', 'dept_id': 1, 'job_title': 'Backend Developer', 'salary': 92000, 'hire_date': '2022-06-01'},
                            {'emp_id': 3, 'emp_name': 'Ellen Ripley', 'dept_id': 2, 'job_title': 'Product Marketing Lead', 'salary': 105000, 'hire_date': '2020-01-10'},
                            {'emp_id': 4, 'emp_name': 'Arthur Dent', 'dept_id': 3, 'job_title': 'Financial Analyst', 'salary': 88000, 'hire_date': '2023-02-20'},
                            {'emp_id': 5, 'emp_name': 'Dana Scully', 'dept_id': 4, 'job_title': 'Senior Data Scientist', 'salary': 128000, 'hire_date': '2021-09-01'},
                            {'emp_id': 6, 'emp_name': 'Fox Mulder', 'dept_id': 4, 'job_title': 'Data Analyst', 'salary': 82000, 'hire_date': '2023-08-15'}
                        ]
                    },
                    {
                        'name': 'departments',
                        'columns': [
                            {'name': 'dept_id', 'type': 'INT'},
                            {'name': 'dept_name', 'type': 'VARCHAR'},
                            {'name': 'location', 'type': 'VARCHAR'},
                            {'name': 'annual_budget', 'type': 'INT'}
                        ],
                        'rows': [
                            {'dept_id': 1, 'dept_name': 'Engineering', 'location': 'Building A', 'annual_budget': 1200000},
                            {'dept_id': 2, 'dept_name': 'Marketing', 'location': 'Building B', 'annual_budget': 650000},
                            {'dept_id': 3, 'dept_name': 'Finance', 'location': 'Building C', 'annual_budget': 500000},
                            {'dept_id': 4, 'dept_name': 'Data Intelligence', 'location': 'Building A', 'annual_budget': 950000}
                        ]
                    }
                ]
            },
            'healthcare': {
                'name': 'Healthcare & Patient Care',
                'tables': [
                    {
                        'name': 'patients',
                        'columns': [
                            {'name': 'patient_id', 'type': 'INT'},
                            {'name': 'full_name', 'type': 'VARCHAR'},
                            {'name': 'age', 'type': 'INT'},
                            {'name': 'gender', 'type': 'VARCHAR'},
                            {'name': 'blood_group', 'type': 'VARCHAR'},
                            {'name': 'city', 'type': 'VARCHAR'}
                        ],
                        'rows': [
                            {'patient_id': 1, 'full_name': 'Robert Taylor', 'age': 45, 'gender': 'Male', 'blood_group': 'O+', 'city': 'Pune'},
                            {'patient_id': 2, 'full_name': 'Maria Garcia', 'age': 32, 'gender': 'Female', 'blood_group': 'A+', 'city': 'Mumbai'},
                            {'patient_id': 3, 'full_name': 'James Wilson', 'age': 58, 'gender': 'Male', 'blood_group': 'B-', 'city': 'Kolhapur'},
                            {'patient_id': 4, 'full_name': 'Linda Davis', 'age': 27, 'gender': 'Female', 'blood_group': 'AB+', 'city': 'Pune'},
                            {'patient_id': 5, 'full_name': 'David Martinez', 'age': 64, 'gender': 'Male', 'blood_group': 'O-', 'city': 'Sangli'}
                        ]
                    },
                    {
                        'name': 'appointments',
                        'columns': [
                            {'name': 'appt_id', 'type': 'INT'},
                            {'name': 'patient_id', 'type': 'INT'},
                            {'name': 'doctor_name', 'type': 'VARCHAR'},
                            {'name': 'department', 'type': 'VARCHAR'},
                            {'name': 'fee', 'type': 'FLOAT'},
                            {'name': 'status', 'type': 'VARCHAR'}
                        ],
                        'rows': [
                            {'appt_id': 1, 'patient_id': 1, 'doctor_name': 'Dr. Sharma', 'department': 'Cardiology', 'fee': 150.00, 'status': 'Completed'},
                            {'appt_id': 2, 'patient_id': 2, 'doctor_name': 'Dr. Patel', 'department': 'Dermatology', 'fee': 90.00, 'status': 'Completed'},
                            {'appt_id': 3, 'patient_id': 3, 'doctor_name': 'Dr. Deshmukh', 'department': 'Orthopedics', 'fee': 120.00, 'status': 'Scheduled'},
                            {'appt_id': 4, 'patient_id': 1, 'doctor_name': 'Dr. Sharma', 'department': 'Cardiology', 'fee': 150.00, 'status': 'Completed'},
                            {'appt_id': 5, 'patient_id': 4, 'doctor_name': 'Dr. Joshi', 'department': 'General Medicine', 'fee': 75.00, 'status': 'Cancelled'},
                            {'appt_id': 6, 'patient_id': 5, 'doctor_name': 'Dr. Deshmukh', 'department': 'Orthopedics', 'fee': 120.00, 'status': 'Completed'}
                        ]
                    }
                ]
            }
        }

        if sample_key not in presets:
            raise ValueError(f"Invalid sample dataset '{sample_key}'. Available: {list(presets.keys())}")

        preset = presets[sample_key]
        tables_def = preset['tables']

        # 1. Create dataset with first table
        first_table = tables_def[0]
        init_res = DatasetService.create_manual_dataset(
            user_id=user_id,
            dataset_name=preset['name'],
            table_name=first_table['name'],
            columns=first_table['columns'],
            rows=first_table['rows']
        )

        dataset_id = init_res['dataset']['id']

        # 2. Create subsequent tables in the same dataset
        for extra_table in tables_def[1:]:
            DatasetService.create_table_in_dataset(
                user_id=user_id,
                dataset_id=dataset_id,
                table_name=extra_table['name'],
                columns=extra_table['columns'],
                rows=extra_table['rows']
            )

        updated_dataset = Dataset.query.get(dataset_id)
        return {
            'success': True,
            'dataset': updated_dataset.to_dict(include_tables=True),
            'tables_created': len(tables_def)
        }

