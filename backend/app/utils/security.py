import re

BLOCKED_SQL_KEYWORDS = [
    r'\bDROP\b',
    r'\bTRUNCATE\b',
    r'\bALTER\b',
    r'\bGRANT\b',
    r'\bREVOKE\b',
    r'\bCREATE\s+DATABASE\b',
    r'\bDROP\s+DATABASE\b',
    r'\bCREATE\s+USER\b',
    r'\bDROP\s+USER\b',
    r'\bINTO\s+OUTFILE\b',
    r'\bINTO\s+DUMPFILE\b',
    r'\bLOAD_FILE\b',
    r'\bINFORMATION_SCHEMA\b',
    r'\bPERFORMANCE_SCHEMA\b',
    r'\bMYSQL\b',
    r'\bSYS\b'
]

PROTECTED_SYSTEM_TABLES = {'users', 'datasets', 'dataset_tables', 'query_history'}

def sanitize_identifier(identifier: str) -> str:
    """Sanitize identifier by replacing non-alphanumeric chars with underscore."""
    if not identifier:
        return 'table'
    # Keep only letters, digits, and underscores
    sanitized = re.sub(r'[^a-zA-Z0-9_]', '_', identifier.strip())
    # Ensure it doesn't start with a number
    if sanitized and sanitized[0].isdigit():
        sanitized = f"t_{sanitized}"
    # Collapse multiple underscores
    sanitized = re.sub(r'_+', '_', sanitized)
    return sanitized.strip('_').lower() or 'col'


def validate_identifier(identifier: str) -> bool:
    """Validate that identifier consists only of letters, numbers, and underscores."""
    if not identifier:
        return False
    return bool(re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', identifier))


def strip_sql_comments(sql: str) -> str:
    """
    Safely strip single-line (-- and #) and block (/* ... */) comments from SQL,
    while strictly preserving quoted string literals ('...', "...", `...`).
    Gracefully handles multi-dash comments without spaces (e.g. ----comment or --comment)
    which commonly trigger MySQL 1064 syntax errors.
    """
    if not sql:
        return ""

    result = []
    i = 0
    n = len(sql)
    state = 'NORMAL'  # 'NORMAL', 'SINGLE_QUOTE', 'DOUBLE_QUOTE', 'BACKTICK'

    while i < n:
        ch = sql[i]
        next_ch = sql[i + 1] if i + 1 < n else ''

        if state == 'NORMAL':
            if ch == "'":
                state = 'SINGLE_QUOTE'
                result.append(ch)
                i += 1
            elif ch == '"':
                state = 'DOUBLE_QUOTE'
                result.append(ch)
                i += 1
            elif ch == '`':
                state = 'BACKTICK'
                result.append(ch)
                i += 1
            elif ch == '-' and next_ch == '-':
                # Line comment: consume all dashes and remainder of line
                i += 2
                while i < n and sql[i] != '\n':
                    i += 1
                result.append('\n')
            elif ch == '#':
                # MySQL hash line comment
                i += 1
                while i < n and sql[i] != '\n':
                    i += 1
                result.append('\n')
            elif ch == '/' and next_ch == '*':
                # Block comment: consume until */
                i += 2
                while i < n:
                    if sql[i] == '*' and i + 1 < n and sql[i + 1] == '/':
                        i += 2
                        break
                    i += 1
                result.append(' ')
            else:
                result.append(ch)
                i += 1
        elif state == 'SINGLE_QUOTE':
            result.append(ch)
            if ch == "'":
                if next_ch == "'":
                    result.append(next_ch)
                    i += 2
                    continue
                state = 'NORMAL'
            elif ch == '\\':
                if next_ch:
                    result.append(next_ch)
                    i += 2
                    continue
            i += 1
        elif state == 'DOUBLE_QUOTE':
            result.append(ch)
            if ch == '"':
                if next_ch == '"':
                    result.append(next_ch)
                    i += 2
                    continue
                state = 'NORMAL'
            elif ch == '\\':
                if next_ch:
                    result.append(next_ch)
                    i += 2
                    continue
            i += 1
        elif state == 'BACKTICK':
            result.append(ch)
            if ch == '`':
                state = 'NORMAL'
            i += 1

    return ''.join(result)


def check_destructive_sql(sql_text: str) -> tuple[bool, str]:
    """
    Check if SQL contains blocked keywords or attempts to access system tables.
    Strips comments first to prevent false-positive triggers on keywords in comments.
    Returns (is_safe, error_message).
    """
    clean_sql = strip_sql_comments(sql_text)
    sql_upper = clean_sql.upper()

    for kw in BLOCKED_SQL_KEYWORDS:
        if re.search(kw, sql_upper, re.IGNORECASE):
            clean_kw = kw.replace(r'\b', '').replace(r'\s+', ' ')
            return False, f"Destructive or administrative statement '{clean_kw}' is forbidden."

    # Check for direct references to protected internal tables
    for sys_tab in PROTECTED_SYSTEM_TABLES:
        pattern = rf'\b{sys_tab}\b'
        if re.search(pattern, clean_sql, re.IGNORECASE):
            return False, f"Access to system table '{sys_tab}' is strictly prohibited."

    return True, ""


def mask_sensitive_error(error_msg: str) -> str:
    """
    Clean up error messages to prevent leaking connection details, paths, or passwords.
    """
    # Remove MySQL credentials or host info if present
    cleaned = re.sub(r'mysql\+pymysql://[^@]+@[^/]+/', 'mysql://***:***@localhost/', error_msg)
    cleaned = re.sub(r'password=[^, \)]+', 'password=***', cleaned)
    # Mask internal Windows file paths
    cleaned = re.sub(r'[A-Za-z]:\\[^ \r\n\t:]+', '[internal path]', cleaned)
    return cleaned
