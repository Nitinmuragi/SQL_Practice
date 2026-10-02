from functools import wraps
from datetime import datetime, timedelta
import jwt
from flask import request, jsonify, g, current_app
from app.extensions import db
from app.models.user import User

def generate_token(user_id: int) -> str:
    """Generate JWT token valid for Config.JWT_EXPIRATION_HOURS."""
    expiration_hours = current_app.config.get('JWT_EXPIRATION_HOURS', 24)
    payload = {
        'sub': str(user_id),
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=expiration_hours)
    }
    secret_key = current_app.config['SECRET_KEY']
    return jwt.encode(payload, secret_key, algorithm='HS256')


def decode_token(token: str) -> dict:
    """Decode and verify JWT token."""
    secret_key = current_app.config['SECRET_KEY']
    return jwt.decode(token, secret_key, algorithms=['HS256'])


def token_required(f):
    """Decorator to require valid JWT token for protected routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({
                'success': False,
                'message': 'Authentication token is missing'
            }), 401

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({
                'success': False,
                'message': 'Invalid Authorization header format. Expected "Bearer <token>"'
            }), 401

        token = parts[1]
        try:
            payload = decode_token(token)
            sub = payload.get('sub')
            user_id = int(sub) if sub is not None else None
            user = db.session.get(User, user_id) if user_id else None
            if not user:
                return jsonify({
                    'success': False,
                    'message': 'User associated with token not found'
                }), 401
            g.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({
                'success': False,
                'message': 'Token has expired. Please log in again.'
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                'success': False,
                'message': 'Invalid authentication token'
            }), 401
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Authentication error: {str(e)}'
            }), 401

        return f(*args, **kwargs)

    return decorated


def token_optional(f):
    """Decorator to optionally decode JWT token if provided; allows guest access if absent or invalid."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]
                try:
                    payload = decode_token(token)
                    sub = payload.get('sub')
                    user_id = int(sub) if sub is not None else None
                    user = db.session.get(User, user_id) if user_id else None
                    if user:
                        g.current_user = user
                except Exception:
                    pass
        return f(*args, **kwargs)

    return decorated
