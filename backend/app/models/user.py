from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    full_name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    mobile_number = db.Column(db.String(20), nullable=True)
    college_name = db.Column(db.String(255), nullable=True)
    degree_branch = db.Column(db.String(150), nullable=True)
    contest_xp = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    datasets = db.relationship('Dataset', backref='user', cascade='all, delete-orphan', lazy=True)
    query_history = db.relationship('QueryHistory', backref='user', cascade='all, delete-orphan', lazy=True)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'full_name': self.full_name,
            'email': self.email,
            'is_admin': bool(self.is_admin),
            'mobile_number': self.mobile_number,
            'college_name': self.college_name,
            'degree_branch': self.degree_branch,
            'contest_xp': self.contest_xp or 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
