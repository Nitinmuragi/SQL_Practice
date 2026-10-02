from app.extensions import db
from app.models.user import User
from app.middleware.auth import generate_token
from app.utils.validators import validate_email, validate_password

class AuthService:
    @staticmethod
    def register_user(full_name: str, email: str, password: str, confirm_password: str) -> tuple[dict, int]:
        if not full_name or not full_name.strip():
            return {'success': False, 'message': 'Full name is required.'}, 400

        if not email or not validate_email(email.strip()):
            return {'success': False, 'message': 'A valid email address is required.'}, 400

        if password != confirm_password:
            return {'success': False, 'message': 'Passwords do not match.'}, 400

        is_valid_pw, pw_err = validate_password(password)
        if not is_valid_pw:
            return {'success': False, 'message': pw_err}, 400

        clean_email = email.strip().lower()
        existing = User.query.filter_by(email=clean_email).first()
        if existing:
            return {'success': False, 'message': 'An account with this email already exists.'}, 409

        user = User(
            full_name=full_name.strip(),
            email=clean_email
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        token = generate_token(user.id)
        return {
            'success': True,
            'message': 'Registration successful.',
            'data': {
                'token': token,
                'user': user.to_dict()
            }
        }, 201

    @staticmethod
    def login_user(email: str, password: str) -> tuple[dict, int]:
        if not email or not password:
            return {'success': False, 'message': 'Email and password are required.'}, 400

        clean_email = email.strip().lower()
        user = User.query.filter_by(email=clean_email).first()

        if not user or not user.check_password(password):
            return {'success': False, 'message': 'Invalid email or password.'}, 401

        token = generate_token(user.id)
        return {
            'success': True,
            'message': 'Login successful.',
            'data': {
                'token': token,
                'user': user.to_dict()
            }
        }, 200

    @staticmethod
    def update_profile(user: User, full_name: str) -> tuple[dict, int]:
        if not full_name or not full_name.strip():
            return {'success': False, 'message': 'Full name cannot be empty.'}, 400

        user.full_name = full_name.strip()
        db.session.commit()
        return {
            'success': True,
            'message': 'Profile updated successfully.',
            'data': {
                'user': user.to_dict()
            }
        }, 200

    @staticmethod
    def change_password(user: User, current_password: str, new_password: str, confirm_new_password: str) -> tuple[dict, int]:
        if not current_password or not new_password:
            return {'success': False, 'message': 'Current password and new password are required.'}, 400

        if not user.check_password(current_password):
            return {'success': False, 'message': 'Current password is incorrect.'}, 400

        if new_password != confirm_new_password:
            return {'success': False, 'message': 'New passwords do not match.'}, 400

        is_valid_pw, pw_err = validate_password(new_password)
        if not is_valid_pw:
            return {'success': False, 'message': pw_err}, 400

        user.set_password(new_password)
        db.session.commit()
        return {
            'success': True,
            'message': 'Password updated successfully.'
        }, 200

