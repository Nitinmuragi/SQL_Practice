import re

ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}

ALLOWED_OPERATORS = {
    '=', '!=', '<>', '>', '<', '>=', '<=',
    'LIKE', 'NOT LIKE', 'IN', 'NOT IN',
    'BETWEEN', 'NOT BETWEEN',
    'IS NULL', 'IS NOT NULL',
    'EXISTS', 'NOT EXISTS'
}

ALLOWED_JOIN_TYPES = {
    'INNER JOIN',
    'LEFT JOIN',
    'RIGHT JOIN',
    'CROSS JOIN',
    'SELF JOIN'
}

ALLOWED_DIRECTIONS = {'ASC', 'DESC'}

ALLOWED_AGGREGATES = {'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'}

ALLOWED_FUNCTIONS = {'IFNULL', 'COALESCE', 'IF', 'NULLIF', 'CASE'}

ALLOWED_OPERATIONS = {'SELECT', 'INSERT', 'UPDATE', 'DELETE'}

def validate_email(email: str) -> bool:
    """Validate email address format."""
    if not email or len(email) > 255:
        return False
    email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return bool(re.match(email_regex, email))


def validate_password(password: str) -> tuple[bool, str]:
    """Validate password criteria."""
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters long."
    if len(password) > 128:
        return False, "Password must not exceed 128 characters."
    return True, ""


def allowed_file(filename: str) -> bool:
    """Check if uploaded file extension is permitted."""
    if not filename or '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS
