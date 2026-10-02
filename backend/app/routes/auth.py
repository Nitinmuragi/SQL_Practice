from flask import Blueprint, request, jsonify, g
from app.services.auth_service import AuthService
from app.middleware.auth import token_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    full_name = data.get('full_name', '')
    email = data.get('email', '')
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')

    res, status_code = AuthService.register_user(full_name, email, password, confirm_password)
    return jsonify(res), status_code


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '')
    password = data.get('password', '')

    res, status_code = AuthService.login_user(email, password)
    return jsonify(res), status_code


@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    # Stateless JWT: client discards token
    return jsonify({
        'success': True,
        'message': 'Logged out successfully.'
    }), 200


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user():
    return jsonify({
        'success': True,
        'data': {
            'user': g.current_user.to_dict()
        }
    }), 200


@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    data = request.get_json() or {}
    full_name = data.get('full_name', '')
    res, status_code = AuthService.update_profile(g.current_user, full_name)
    return jsonify(res), status_code


@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password():
    data = request.get_json() or {}
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    confirm_new_password = data.get('confirm_new_password', '')

    res, status_code = AuthService.change_password(
        g.current_user,
        current_password,
        new_password,
        confirm_new_password
    )
    return jsonify(res), status_code

