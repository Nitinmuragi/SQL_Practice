from functools import wraps
from flask import jsonify, g
from app.middleware.auth import token_required

def admin_required(f):
    """
    Decorator to require that the authenticated user has administrator privileges.
    Must be used in conjunction with or after authentication.
    """
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if not getattr(g.current_user, 'is_admin', False):
            return jsonify({
                'success': False,
                'message': 'Access denied. Administrator privileges required.'
            }), 403
        return f(*args, **kwargs)
    return decorated
