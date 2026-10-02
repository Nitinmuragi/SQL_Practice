import pytest
from app import create_app
from app.config import Config
from app.extensions import db
from app.models.user import User

from sqlalchemy.pool import StaticPool

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite://'
    SQLALCHEMY_ENGINE_OPTIONS = {
        'poolclass': StaticPool,
        'connect_args': {'check_same_thread': False}
    }
    WTF_CSRF_ENABLED = False

@pytest.fixture
def app():
    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def auth_headers(client):
    # Register and login a test user
    client.post('/api/auth/register', json={
        'full_name': 'Test User',
        'email': 'test@example.com',
        'password': 'Password123!',
        'confirm_password': 'Password123!'
    })
    res = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'Password123!'
    })
    token = res.get_json()['data']['token']
    return {'Authorization': f'Bearer {token}'}

@pytest.fixture
def other_user_headers(client):
    client.post('/api/auth/register', json={
        'full_name': 'Other User',
        'email': 'other@example.com',
        'password': 'Password123!',
        'confirm_password': 'Password123!'
    })
    res = client.post('/api/auth/login', json={
        'email': 'other@example.com',
        'password': 'Password123!'
    })
    token = res.get_json()['data']['token']
    return {'Authorization': f'Bearer {token}'}

@pytest.fixture
def admin_headers(client, app):
    client.post('/api/auth/register', json={
        'full_name': 'Admin User',
        'email': 'admin@example.com',
        'password': 'Password123!',
        'confirm_password': 'Password123!'
    })
    # Elevate to admin
    with app.app_context():
        user = User.query.filter_by(email='admin@example.com').first()
        user.is_admin = True
        db.session.commit()

    res = client.post('/api/auth/login', json={
        'email': 'admin@example.com',
        'password': 'Password123!'
    })
    token = res.get_json()['data']['token']
    return {'Authorization': f'Bearer {token}'}

