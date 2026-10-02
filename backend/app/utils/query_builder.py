from typing import Dict, List, Any, Tuple, Optional, Union
import re
from app.utils.validators import (
    ALLOWED_OPERATORS,
    ALLOWED_JOIN_TYPES,
    ALLOWED_DIRECTIONS,
    ALLOWED_AGGREGATES,
    ALLOWED_FUNCTIONS,
    ALLOWED_OPERATIONS,
)


def _format_display_literal(val: Any) -> str:
    """Format literal value for human display SQL."""
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    # String
    s_val = str(val).replace("'", "''")
    return f"'{s_val}'"


def _normalize_select_items(query_spec: Dict[str, Any]) -> List[Any]:
    """Merge columns, aggregates, and functions into a unified list of select items."""
    items = []
    raw_cols = query_spec.get("columns", [])
    if raw_cols:
        for c in raw_cols:
            if c != "*":
                items.append(c)

    raw_aggs = query_spec.get("aggregates", [])
    for a in raw_aggs:
        if isinstance(a, dict):
            func = a.get("function") or a.get("func") or "COUNT"
            col = a.get("column", "*")
            alias = a.get("alias", "")
            items.append({
                "type": "aggregate",
                "func": func,
                "column": col,
                "alias": alias
            })

    raw_funcs = query_spec.get("functions", [])
    for f in raw_funcs:
        if isinstance(f, dict):
            f_type = (f.get("type") or f.get("func") or "function").upper()
            alias = f.get("alias", "")
            if f_type == "CASE":
                when_clauses = f.get("when_clauses") or f.get("conditions") or []
                else_val = f.get("else_value") or f.get("else_val")
                items.append({
                    "type": "case",
                    "conditions": when_clauses,
                    "else_val": else_val,
                    "alias": alias
                })
            elif f_type in ("IFNULL", "NULLIF"):
                col = f.get("column")
                fallback = f.get("fallback") or f.get("arg2") or f.get("second")
                args = f.get("args") or ([col, fallback] if col is not None else [])
                items.append({
                    "type": "function",
                    "func": f_type,
                    "args": args,
                    "alias": alias
                })
            elif f_type == "COALESCE":
                args = f.get("args") or []
                if not args and f.get("columns"):
                    args = f.get("columns")
                items.append({
                    "type": "function",
                    "func": "COALESCE",
                    "args": args,
                    "alias": alias
                })
            elif f_type == "IF":
                cond = f.get("condition")
                true_val = f.get("true_value") or f.get("then")
                false_val = f.get("false_value") or f.get("else")
                args = f.get("args") or [cond, true_val, false_val]
                items.append({
                    "type": "function",
                    "func": "IF",
                    "args": args,
                    "alias": alias
                })
            else:
                items.append(f)

    if not items:
        items = ["*"]
    return items


def _format_display_expression(item: Union[str, Dict[str, Any]]) -> str:
    """Format single SELECT column or expression for human display SQL."""
    if isinstance(item, str):
        return item.strip() if item.strip() else "*"

    item_type = item.get("type", "column")
    alias = item.get("alias", "").strip()
    alias_clause = f" AS `{alias}`" if alias else ""

    if item_type == "aggregate":
        func = item.get("func", "COUNT").upper()
        col = item.get("column", "*").strip() or "*"
        return f"{func}({col}){alias_clause}"

    if item_type == "function":
        func = item.get("func", "IFNULL").upper()
        args = item.get("args", [])
        formatted_args = ", ".join([
            _format_display_literal(a) if not (isinstance(a, str) and re.match(r'^[a-zA-Z_][a-zA-Z0-9_\.]*$', a)) else a
            for a in args
        ])
        return f"{func}({formatted_args}){alias_clause}"

    if item_type == "case":
        branches = item.get("conditions", [])
        else_val = item.get("else_val")
        parts = ["CASE"]
        for b in branches:
            if "condition" in b:
                when = _format_display_where_clause([b["condition"]])
            else:
                when = b.get("when", "")
            then = _format_display_literal(b.get("then", ""))
            parts.append(f"WHEN {when} THEN {then}")
        if else_val is not None:
            parts.append(f"ELSE {_format_display_literal(else_val)}")
        parts.append("END")
        return f"{' '.join(parts)}{alias_clause}"

    # Default column type
    name = item.get("name", "*").strip() or "*"
    return f"{name}{alias_clause}"


def _format_display_where_clause(conditions: Union[List[Dict[str, Any]], Dict[str, Any]]) -> str:
    """Format WHERE conditions (flat list or nested tree) for display SQL."""
    if not conditions:
        return ""

    # Nested tree format
    if isinstance(conditions, dict):
        conjunction = conditions.get("conjunction", "AND").upper()
        is_not = conditions.get("not", False)
        rules = conditions.get("rules", [])
        if not rules:
            return ""

        compiled_rules = []
        for r in rules:
            if "rules" in r:
                sub = _format_display_where_clause(r)
                if sub:
                    compiled_rules.append(f"({sub})")
            else:
                rule_str = _format_display_single_rule(r)
                if rule_str:
                    compiled_rules.append(rule_str)

        if not compiled_rules:
            return ""

        res = f" {conjunction} ".join(compiled_rules)
        return f"NOT ({res})" if is_not else res

    # Flat list format
    cond_clauses = []
    for i, cond in enumerate(conditions):
        rule_str = _format_display_single_rule(cond)
        if not rule_str:
            continue
        conj = cond.get("conjunction", "AND").upper() if i > 0 else ""
        if i > 0:
            cond_clauses.append(f"{conj} {rule_str}")
        else:
            cond_clauses.append(rule_str)

    return " ".join(cond_clauses)


def _format_display_single_rule(cond: Dict[str, Any]) -> str:
    """Format single condition rule for display SQL."""
    col = cond.get("column", "").strip()
    op = cond.get("operator", "=").strip().upper()
    val = cond.get("value")
    is_not = cond.get("not", False)

    if not col and op not in ("EXISTS", "NOT EXISTS"):
        return ""

    if op in ("IS NULL", "IS NOT NULL"):
        clause = f"{col} {op}"
    elif op in ("BETWEEN", "NOT BETWEEN"):
        if isinstance(val, (list, tuple)) and len(val) >= 2:
            clause = f"{col} {op} {_format_display_literal(val[0])} AND {_format_display_literal(val[1])}"
        else:
            parts = str(val).split("AND") if "AND" in str(val) else str(val).split(",")
            v1 = parts[0].strip() if len(parts) > 0 else ""
            v2 = parts[1].strip() if len(parts) > 1 else ""
            clause = f"{col} {op} {_format_display_literal(v1)} AND {_format_display_literal(v2)}"
    elif op in ("IN", "NOT IN"):
        if isinstance(val, (list, tuple)):
            items = ", ".join([_format_display_literal(v) for v in val])
        else:
            items = ", ".join([_format_display_literal(x.strip()) for x in str(val).split(",")])
        clause = f"{col} {op} ({items})"
    elif op in ("EXISTS", "NOT EXISTS"):
        clause = f"{op} ({val})"
    elif op in ("LIKE", "NOT LIKE"):
        clause = f"{col} {op} '{val}'"
    else:
        clause = f"{col} {op} {_format_display_literal(val)}"

    return f"NOT ({clause})" if is_not else clause


def build_display_sql(query_spec: Dict[str, Any]) -> str:
    """Generate clean, user-friendly SQL for display and clipboard copy."""
    operation = query_spec.get("operation", "SELECT").upper()
    if operation not in ALLOWED_OPERATIONS:
        operation = "SELECT"

    table = query_spec.get("table", "").strip()
    if not table:
        return "-- Please select a table"

    # 1. INSERT Operation
    if operation == "INSERT":
        insert_data = query_spec.get("insert_data") or {}
        if isinstance(insert_data, dict) and "columns" not in insert_data and "values" not in insert_data:
            columns = list(insert_data.keys())
            values = list(insert_data.values())
        else:
            columns = insert_data.get("columns") or query_spec.get("columns") or []
            values = insert_data.get("values") or query_spec.get("values") or []

        if not columns:
            return f"-- Define columns to insert into {table}"

        cols_str = ", ".join([f"`{c}`" for c in columns])
        # Values can be single row or multiple rows
        if values and isinstance(values[0], (list, tuple)):
            row_strs = []
            for r in values:
                val_items = ", ".join([_format_display_literal(v) for v in r])
                row_strs.append(f"({val_items})")
            val_clause = ", ".join(row_strs)
        else:
            val_items = ", ".join([_format_display_literal(v) for v in values])
            val_clause = f"({val_items})"

        return f"INSERT INTO {table} ({cols_str})\nVALUES {val_clause};"

    # 2. UPDATE Operation
    if operation == "UPDATE":
        update_data = query_spec.get("update_data") or {}
        if isinstance(update_data, dict) and "assignments" not in update_data:
            assignments = [{"column": k, "value": v} for k, v in update_data.items() if k not in ("where", "conditions")]
            where_conds = update_data.get("where") or query_spec.get("conditions") or query_spec.get("where")
        else:
            assignments = update_data.get("assignments") or query_spec.get("assignments") or []
            where_conds = update_data.get("where") or query_spec.get("conditions") or query_spec.get("where")

        if not assignments:
            return f"-- Define column assignments to update in {table}"

        set_clauses = [
            f"`{a.get('column')}` = {_format_display_literal(a.get('value'))}"
            for a in assignments if a.get("column")
        ]
        sql = f"UPDATE {table}\nSET {', '.join(set_clauses)}"

        where_str = _format_display_where_clause(where_conds)
        if where_str:
            sql += f"\nWHERE {where_str}"
        return sql + ";"

    # 3. DELETE Operation
    if operation == "DELETE":
        delete_data = query_spec.get("delete_data") or {}
        where_conds = delete_data.get("where") or query_spec.get("conditions") or query_spec.get("where")

        sql = f"DELETE FROM {table}"
        where_str = _format_display_where_clause(where_conds)
        if where_str:
            sql += f"\nWHERE {where_str}"
        return sql + ";"

    # 4. SELECT Operation (Default)
    columns = _normalize_select_items(query_spec)
    if not columns or (len(columns) == 1 and columns[0] == "*"):
        col_str = "*"
    else:
        col_str = ", ".join([_format_display_expression(c) for c in columns])

    sql = f"SELECT {col_str}\nFROM {table}"

    # JOINs (support single object or list of joins)
    joins = query_spec.get("joins") or []
    single_join = query_spec.get("join")
    if single_join and isinstance(single_join, dict):
        joins = [single_join]

    for j in joins:
        if not isinstance(j, dict) or not j.get("table"):
            continue
        j_type = j.get("type", "INNER JOIN").upper()
        if j_type not in ALLOWED_JOIN_TYPES:
            j_type = "INNER JOIN"
        j_table = j.get("table")
        j_alias = f" AS `{j.get('alias')}`" if j.get("alias") else ""
        on_clause = j.get("on")
        if not on_clause and j.get("left_on") and j.get("right_on"):
            on_clause = f"{j.get('left_on')} = {j.get('right_on')}"

        if j_type == "CROSS JOIN":
            sql += f"\nCROSS JOIN {j_table}{j_alias}"
        elif j_type == "SELF JOIN":
            alias_name = j.get("alias") or f"{j_table}_self"
            sql += f"\nINNER JOIN {j_table} AS `{alias_name}` ON {on_clause}"
        elif on_clause:
            sql += f"\n{j_type} {j_table}{j_alias} ON {on_clause}"

    # WHERE Conditions
    where_conds = query_spec.get("where") or query_spec.get("conditions") or []
    where_str = _format_display_where_clause(where_conds)
    if where_str:
        sql += f"\nWHERE {where_str}"

    # GROUP BY
    group_by = query_spec.get("group_by", [])
    if group_by:
        gb_cols = group_by if isinstance(group_by, list) else [str(group_by)]
        sql += f"\nGROUP BY {', '.join([c.strip() for c in gb_cols if c.strip()])}"

    # HAVING
    having = query_spec.get("having", [])
    if having:
        having_str = _format_display_where_clause(having)
        if having_str:
            sql += f"\nHAVING {having_str}"

    # ORDER BY
    order_by = query_spec.get("order_by")
    if order_by:
        if isinstance(order_by, list):
            ob_parts = [
                f"{ob.get('column')} {ob.get('direction', 'ASC').upper()}"
                for ob in order_by if ob.get("column")
            ]
            if ob_parts:
                sql += f"\nORDER BY {', '.join(ob_parts)}"
        elif isinstance(order_by, dict) and order_by.get("column"):
            dir_str = order_by.get("direction", "ASC").upper()
            if dir_str not in ALLOWED_DIRECTIONS:
                dir_str = "ASC"
            sql += f"\nORDER BY {order_by.get('column')} {dir_str}"

    # LIMIT & OFFSET
    limit = query_spec.get("limit")
    if limit is not None:
        try:
            lim_val = int(limit)
            if lim_val > 0:
                sql += f"\nLIMIT {lim_val}"
                offset = query_spec.get("offset")
                if offset is not None:
                    off_val = int(offset)
                    if off_val > 0:
                        sql += f" OFFSET {off_val}"
        except (ValueError, TypeError):
            pass

    return sql + ";"


# ----------------------------------------------------------------------
# Execution SQL Compiler (Parameterized & Physical Table Mapping)
# ----------------------------------------------------------------------

class ExecutionCompiler:
    def __init__(self, table_mapping: Dict[str, str], allowed_columns_map: Dict[str, set]):
        self.table_mapping = table_mapping
        self.allowed_columns_map = allowed_columns_map
        self.params: Dict[str, Any] = {}
        self.param_idx = 0

    def next_param(self, val: Any) -> str:
        name = f"p_{self.param_idx}"
        self.param_idx += 1
        self.params[name] = val
        return f":{name}"

    def resolve_column(self, col_ref: str, default_table: str) -> str:
        col_clean = col_ref.strip()
        if "." in col_clean:
            t_part, c_part = col_clean.split(".", 1)
            t_part = t_part.strip("`")
            c_part = c_part.strip("`")
            matched_t = next((k for k in self.table_mapping if k.lower() == t_part.lower()), None)
            if matched_t:
                valid_cols = self.allowed_columns_map.get(matched_t, set())
                matched_c = next((c for c in valid_cols if c.lower() == c_part.lower()), None)
                if matched_c:
                    target = self.table_mapping[matched_t]
                    return f"`{target}`.`{matched_c}`"
            raise ValueError(f"Invalid column reference: '{col_ref}'")
        else:
            c_part = col_clean.strip("`")
            matched_t = next((k for k in self.table_mapping if k.lower() == default_table.lower()), default_table)
            valid_cols = self.allowed_columns_map.get(matched_t, set())
            matched_c = next((c for c in valid_cols if c.lower() == c_part.lower()), None)
            if matched_c:
                target = self.table_mapping.get(matched_t, matched_t)
                return f"`{target}`.`{matched_c}`"
            raise ValueError(f"Column '{c_part}' does not exist in table '{default_table}'.")

    def compile_rule(self, cond: Dict[str, Any], default_table: str) -> str:
        col = cond.get("column", "").strip()
        op = cond.get("operator", "=").strip().upper()
        val = cond.get("value")
        is_not = cond.get("not", False)

        if op not in ALLOWED_OPERATORS:
            raise ValueError(f"Operator '{op}' is not permitted.")

        if op in ("IS NULL", "IS NOT NULL"):
            col_sql = self.resolve_column(col, default_table)
            clause = f"{col_sql} {op}"
        elif op in ("BETWEEN", "NOT BETWEEN"):
            col_sql = self.resolve_column(col, default_table)
            if isinstance(val, (list, tuple)) and len(val) >= 2:
                p1 = self.next_param(val[0])
                p2 = self.next_param(val[1])
            else:
                parts = str(val).split("AND") if "AND" in str(val) else str(val).split(",")
                p1 = self.next_param(parts[0].strip() if len(parts) > 0 else "")
                p2 = self.next_param(parts[1].strip() if len(parts) > 1 else "")
            clause = f"{col_sql} {op} {p1} AND {p2}"
        elif op in ("IN", "NOT IN"):
            col_sql = self.resolve_column(col, default_table)
            if isinstance(val, (list, tuple)):
                items = [self.next_param(v) for v in val]
            else:
                items = [self.next_param(x.strip()) for x in str(val).split(",")]
            in_clause = ", ".join(items) if items else "NULL"
            clause = f"{col_sql} {op} ({in_clause})"
        elif op in ("EXISTS", "NOT EXISTS"):
            # Subquery validation: basic safety check
            raw_sub = str(val).strip()
            for log_name, phys_name in sorted(self.table_mapping.items(), key=lambda x: len(x[0]), reverse=True):
                pattern = rf'[`"]{re.escape(log_name)}[`"]|\b{re.escape(log_name)}\b'
                raw_sub = re.sub(pattern, f"`{phys_name}`", raw_sub, flags=re.IGNORECASE)
            clause = f"{op} ({raw_sub})"
        else:
            col_sql = self.resolve_column(col, default_table)
            param_ref = self.next_param(val)
            clause = f"{col_sql} {op} {param_ref}"

        return f"NOT ({clause})" if is_not else clause

    def compile_where_group(self, conditions: Union[List[Dict[str, Any]], Dict[str, Any]], default_table: str) -> str:
        if not conditions:
            return ""

        if isinstance(conditions, dict):
            conj = conditions.get("conjunction", "AND").strip().upper()
            if conj not in ("AND", "OR"):
                conj = "AND"
            is_not = conditions.get("not", False)
            rules = conditions.get("rules", [])
            if not rules:
                return ""

            compiled = []
            for r in rules:
                if "rules" in r:
                    sub = self.compile_where_group(r, default_table)
                    if sub:
                        compiled.append(f"({sub})")
                else:
                    rule_sql = self.compile_rule(r, default_table)
                    if rule_sql:
                        compiled.append(rule_sql)

            if not compiled:
                return ""
            res = f" {conj} ".join(compiled)
            return f"NOT ({res})" if is_not else res

        # Flat array
        compiled = []
        for i, cond in enumerate(conditions):
            rule_sql = self.compile_rule(cond, default_table)
            if not rule_sql:
                continue
            conj = cond.get("conjunction", "AND").strip().upper() if i > 0 else ""
            if conj not in ("AND", "OR"):
                conj = "AND"
            if i > 0:
                compiled.append(f"{conj} {rule_sql}")
            else:
                compiled.append(rule_sql)

        return " ".join(compiled)


def build_execution_sql(
    query_spec: Dict[str, Any],
    table_mapping: Dict[str, str],
    allowed_columns_map: Dict[str, set]
) -> Tuple[str, Dict[str, Any]]:
    """
    Safely compile executable SQL with physical table replacements and parameter bindings.
    Supports SELECT, INSERT, UPDATE, and DELETE.
    """
    operation = query_spec.get("operation", "SELECT").upper()
    if operation not in ALLOWED_OPERATIONS:
        operation = "SELECT"

    raw_table = query_spec.get("table", "").strip()
    matched_table = next((k for k in table_mapping if k.lower() == raw_table.lower()), None)
    if not matched_table:
        raise ValueError(f"Table '{raw_table}' not found in this dataset.")
    table = matched_table

    physical_table = table_mapping[table]
    valid_cols = allowed_columns_map.get(table, set())
    compiler = ExecutionCompiler(table_mapping, allowed_columns_map)

    # 1. INSERT
    if operation == "INSERT":
        insert_data = query_spec.get("insert_data") or {}
        if isinstance(insert_data, dict) and "columns" not in insert_data and "values" not in insert_data:
            columns = list(insert_data.keys())
            values = list(insert_data.values())
        else:
            columns = insert_data.get("columns") or query_spec.get("columns") or []
            values = insert_data.get("values") or query_spec.get("values") or []

        if not columns:
            raise ValueError("No columns specified for INSERT operation.")

        clean_cols = []
        for c in columns:
            c_name = c.strip("`").strip()
            if c_name not in valid_cols:
                raise ValueError(f"Column '{c_name}' does not exist in table '{table}'.")
            clean_cols.append(f"`{c_name}`")

        # Values validation
        if not values:
            raise ValueError("No row values provided for INSERT.")

        if isinstance(values[0], (list, tuple)):
            rows_params = []
            for row in values:
                if len(row) != len(clean_cols):
                    raise ValueError("Number of values does not match number of columns.")
                p_items = [compiler.next_param(v) for v in row]
                rows_params.append(f"({', '.join(p_items)})")
            vals_sql = ", ".join(rows_params)
        else:
            if len(values) != len(clean_cols):
                raise ValueError("Number of values does not match number of columns.")
            p_items = [compiler.next_param(v) for v in values]
            vals_sql = f"({', '.join(p_items)})"

        sql = f"INSERT INTO `{physical_table}` ({', '.join(clean_cols)})\nVALUES {vals_sql}"
        return sql, compiler.params

    # 2. UPDATE
    if operation == "UPDATE":
        update_data = query_spec.get("update_data") or {}
        if isinstance(update_data, dict) and "assignments" not in update_data:
            assignments = [{"column": k, "value": v} for k, v in update_data.items() if k not in ("where", "conditions")]
            where_conds = update_data.get("where") or query_spec.get("conditions") or query_spec.get("where")
        else:
            assignments = update_data.get("assignments") or query_spec.get("assignments") or []
            where_conds = update_data.get("where") or query_spec.get("conditions") or query_spec.get("where")

        if not assignments:
            raise ValueError("No column assignments provided for UPDATE.")

        set_parts = []
        for a in assignments:
            col_name = a.get("column", "").strip("`").strip()
            if col_name not in valid_cols:
                raise ValueError(f"Column '{col_name}' does not exist in table '{table}'.")
            val = a.get("value")
            param_ref = compiler.next_param(val)
            set_parts.append(f"`{col_name}` = {param_ref}")

        sql = f"UPDATE `{physical_table}`\nSET {', '.join(set_parts)}"
        where_sql = compiler.compile_where_group(where_conds, table)
        if where_sql:
            sql += f"\nWHERE {where_sql}"
        return sql, compiler.params

    # 3. DELETE
    if operation == "DELETE":
        delete_data = query_spec.get("delete_data") or {}
        where_conds = delete_data.get("where") or query_spec.get("conditions") or query_spec.get("where")

        sql = f"DELETE FROM `{physical_table}`"
        where_sql = compiler.compile_where_group(where_conds, table)
        if where_sql:
            sql += f"\nWHERE {where_sql}"
        return sql, compiler.params

    # 4. SELECT
    req_cols = _normalize_select_items(query_spec)
    selected_cols = []
    if not req_cols or (len(req_cols) == 1 and req_cols[0] == "*"):
        col_expr = "*"
    else:
        for item in req_cols:
            if isinstance(item, str):
                col_clean = item.strip()
                if col_clean == "*":
                    selected_cols.append("*")
                elif "." in col_clean:
                    t_part, c_part = col_clean.split(".", 1)
                    matched_t = next((k for k in table_mapping if k.lower() == t_part.lower()), None)
                    if matched_t:
                        valid_c = allowed_columns_map.get(matched_t, set())
                        matched_c = next((c for c in valid_c if c.lower() == c_part.lower()), None)
                        if matched_c:
                            selected_cols.append(f"`{table_mapping[matched_t]}`.`{matched_c}` AS `{matched_t}_{matched_c}`")
                        else:
                            raise ValueError(f"Invalid column: '{col_clean}'")
                    else:
                        raise ValueError(f"Invalid column: '{col_clean}'")
                else:
                    matched_c = next((c for c in valid_cols if c.lower() == col_clean.lower()), None)
                    if matched_c:
                        selected_cols.append(f"`{physical_table}`.`{matched_c}`")
                    else:
                        raise ValueError(f"Column '{col_clean}' does not exist in table '{table}'.")
            elif isinstance(item, dict):
                i_type = item.get("type", "column")
                alias = item.get("alias", "").strip()
                alias_sql = f" AS `{alias}`" if alias else ""

                if i_type == "aggregate":
                    func = item.get("func", "COUNT").upper()
                    if func not in ALLOWED_AGGREGATES:
                        raise ValueError(f"Aggregate function '{func}' not supported.")
                    col = item.get("column", "*").strip()
                    if col != "*" and col not in valid_cols:
                        raise ValueError(f"Column '{col}' not in table '{table}'.")
                    col_target = "*" if col == "*" else f"`{physical_table}`.`{col}`"
                    selected_cols.append(f"{func}({col_target}){alias_sql}")

                elif i_type == "function":
                    func = item.get("func", "IFNULL").upper()
                    if func not in ALLOWED_FUNCTIONS:
                        raise ValueError(f"Function '{func}' not supported.")
                    args = item.get("args", [])
                    # Compile args: columns resolve to physical table, literals to parameters
                    arg_sqls = []
                    for a in args:
                        a_str = str(a).strip()
                        if a_str in valid_cols:
                            arg_sqls.append(f"`{physical_table}`.`{a_str}`")
                        else:
                            p_ref = compiler.next_param(a)
                            arg_sqls.append(p_ref)
                    selected_cols.append(f"{func}({', '.join(arg_sqls)}){alias_sql}")

                elif i_type == "case":
                    branches = item.get("conditions", [])
                    else_val = item.get("else_val")
                    case_parts = ["CASE"]
                    for b in branches:
                        if "condition" in b:
                            when = compiler.compile_where_group([b["condition"]], table)
                        else:
                            when = b.get("when", "")
                        then = b.get("then", "")
                        then_param = compiler.next_param(then)
                        case_parts.append(f"WHEN {when} THEN {then_param}")
                    if else_val is not None:
                        else_param = compiler.next_param(else_val)
                        case_parts.append(f"ELSE {else_param}")
                    case_parts.append("END")
                    selected_cols.append(f"{' '.join(case_parts)}{alias_sql}")

                else:
                    name = item.get("name", "*").strip()
                    if name in valid_cols:
                        selected_cols.append(f"`{physical_table}`.`{name}`{alias_sql}")

        col_expr = ", ".join(selected_cols) if selected_cols else "*"

    sql = f"SELECT {col_expr}\nFROM `{physical_table}`"

    # JOINs
    joins = query_spec.get("joins") or []
    single_join = query_spec.get("join")
    if single_join and isinstance(single_join, dict):
        joins = [single_join]

    for j in joins:
        if not isinstance(j, dict) or not j.get("table"):
            continue
        raw_j_tab = j.get("table")
        matched_j_tab = next((k for k in table_mapping if k.lower() == raw_j_tab.lower()), None)
        if not matched_j_tab:
            raise ValueError(f"Joined table '{raw_j_tab}' not found in dataset.")
        j_tab = matched_j_tab
        j_phys = table_mapping[j_tab]
        j_type = j.get("type", "INNER JOIN").upper()
        if j_type not in ALLOWED_JOIN_TYPES:
            j_type = "INNER JOIN"

        if j_type == "CROSS JOIN":
            j_alias = f" AS `{j.get('alias')}`" if j.get("alias") else ""
            sql += f"\nCROSS JOIN `{j_phys}`{j_alias}"
        elif j_type == "SELF JOIN":
            alias_name = j.get("alias") or f"{j_tab}_self"
            compiler.table_mapping[alias_name] = alias_name
            compiler.allowed_columns_map[alias_name] = set(allowed_columns_map.get(j_tab, set()))
            left_on = j.get("left_on")
            right_on = j.get("right_on")
            if left_on and right_on:
                l_col = compiler.resolve_column(left_on, table)
                if "." in right_on:
                    r_t, r_c = right_on.split(".", 1)
                    if r_t.lower() == j_tab.lower() or r_t.lower() == alias_name.lower():
                        r_col = compiler.resolve_column(f"{alias_name}.{r_c}", alias_name)
                    else:
                        r_col = compiler.resolve_column(right_on, alias_name)
                else:
                    r_col = compiler.resolve_column(right_on, alias_name)
                sql += f"\nINNER JOIN `{j_phys}` AS `{alias_name}` ON {l_col} = {r_col}"
        else:
            j_alias = j.get("alias")
            if j_alias:
                compiler.table_mapping[j_alias] = j_alias
                compiler.allowed_columns_map[j_alias] = set(allowed_columns_map.get(j_tab, set()))
                alias_sql = f" AS `{j_alias}`"
            else:
                alias_sql = ""
            left_on = j.get("left_on")
            right_on = j.get("right_on")
            if left_on and right_on:
                l_col = compiler.resolve_column(left_on, table)
                r_col = compiler.resolve_column(right_on, j_alias or j_tab)
                sql += f"\n{j_type} `{j_phys}`{alias_sql} ON {l_col} = {r_col}"

    # WHERE
    where_conds = query_spec.get("where") or query_spec.get("conditions") or []
    where_sql = compiler.compile_where_group(where_conds, table)
    if where_sql:
        sql += f"\nWHERE {where_sql}"

    # GROUP BY
    group_by = query_spec.get("group_by", [])
    if group_by:
        gb_cols = group_by if isinstance(group_by, list) else [group_by]
        gb_clean = []
        for g_col in gb_cols:
            c = str(g_col).strip()
            if c in valid_cols:
                gb_clean.append(f"`{physical_table}`.`{c}`")
        if gb_clean:
            sql += f"\nGROUP BY {', '.join(gb_clean)}"

    # HAVING
    having = query_spec.get("having", [])
    if having:
        # HAVING can accept conditions over aggregate expressions
        having_parts = []
        if isinstance(having, list):
            for h in having:
                h_expr = h.get("aggregate") or h.get("column")
                h_op = h.get("operator", ">").upper()
                h_val = h.get("value")
                if h_expr and h_op in ALLOWED_OPERATORS:
                    p_ref = compiler.next_param(h_val)
                    having_parts.append(f"{h_expr} {h_op} {p_ref}")
        if having_parts:
            sql += f"\nHAVING {' AND '.join(having_parts)}"

    # ORDER BY
    order_by = query_spec.get("order_by")
    if order_by:
        if isinstance(order_by, list):
            ob_parts = []
            for ob in order_by:
                o_col = ob.get("column", "").strip()
                direction = ob.get("direction", "ASC").upper()
                if direction not in ALLOWED_DIRECTIONS:
                    direction = "ASC"
                if o_col in valid_cols:
                    ob_parts.append(f"`{physical_table}`.`{o_col}` {direction}")
            if ob_parts:
                sql += f"\nORDER BY {', '.join(ob_parts)}"
        elif isinstance(order_by, dict) and order_by.get("column"):
            o_col = order_by.get("column", "").strip()
            direction = order_by.get("direction", "ASC").upper()
            if direction not in ALLOWED_DIRECTIONS:
                direction = "ASC"
            if o_col in valid_cols:
                sql += f"\nORDER BY `{physical_table}`.`{o_col}` {direction}"

    # LIMIT & OFFSET
    limit = query_spec.get("limit")
    limit_val = 100
    if limit is not None:
        try:
            parsed = int(limit)
            if 1 <= parsed <= 1000:
                limit_val = parsed
        except (ValueError, TypeError):
            pass
    sql += f"\nLIMIT {limit_val}"

    offset = query_spec.get("offset")
    if offset is not None:
        try:
            off_val = int(offset)
            if off_val > 0:
                sql += f" OFFSET {off_val}"
        except (ValueError, TypeError):
            pass

    return sql, compiler.params
