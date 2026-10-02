import uuid
from datetime import datetime
from app.extensions import db

class Certificate(db.Model):
    __tablename__ = 'certificates'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id', ondelete='SET NULL'), nullable=True, index=True)
    contest_id = db.Column(db.Integer, db.ForeignKey('contests.id', ondelete='SET NULL'), nullable=True, index=True)
    certificate_code = db.Column(db.String(64), nullable=False, unique=True, index=True)
    track_name = db.Column(db.String(255), nullable=False, default='SQL Competency & Relational Querying')
    level = db.Column(db.String(50), nullable=False, default='intermediate')
    certificate_type = db.Column(db.String(50), nullable=False, default='assessment') # 'assessment' | 'contest_ranker'
    contest_rank = db.Column(db.Integer, nullable=True) # 1, 2, 3
    college_name = db.Column(db.String(255), nullable=True)
    score_percent = db.Column(db.Integer, nullable=False, default=100)
    passed = db.Column(db.Boolean, default=True, nullable=False)
    issued_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to user
    user = db.relationship('User', backref=db.backref('certificates', cascade='all, delete-orphan', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.full_name if self.user else 'SQL Practitioner',
            'assessment_id': self.assessment_id,
            'contest_id': self.contest_id,
            'certificate_code': self.certificate_code,
            'track_name': self.track_name,
            'level': self.level,
            'certificate_type': self.certificate_type,
            'rank': self.contest_rank,
            'contest_rank': self.contest_rank,
            'college_name': self.college_name or (self.user.college_name if self.user else None),
            'score_percent': self.score_percent,
            'passed': self.passed,
            'issued_at': self.issued_at.strftime('%B %d, %Y') if self.issued_at else None,
            'verification_url': f"https://sqlplatform.internal/verify/{self.certificate_code}"
        }
