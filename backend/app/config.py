import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root or backend directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / '.env')
load_dotenv(Path(__file__).resolve().parent.parent / '.env')

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-dev-secret-key-change-in-prod-2026')
    
    # Database URL
    db_url = os.getenv('DATABASE_URL', 'mysql+pymysql://root:Nitin%407517@localhost:3306/sql_practice')
    if db_url.startswith('mysql://'):
        db_url = db_url.replace('mysql://', 'mysql+pymysql://', 1)
    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Upload settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB
    UPLOAD_FOLDER = str(Path(__file__).resolve().parent.parent / 'uploads')
    
    # JWT & Security
    JWT_EXPIRATION_HOURS = 24
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

    # SMTP Email Settings
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'SQL Practice Platform <noreply@sqlpractice.com>')

class TestConfig(Config):
    TESTING = True
    # For testing, we can use an in-memory SQLite database or test database
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
