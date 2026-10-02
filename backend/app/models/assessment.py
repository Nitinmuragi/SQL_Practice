from datetime import datetime
from app.extensions import db

class Assessment(db.Model):
    __tablename__ = 'assessments'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    level = db.Column(db.String(50), nullable=False, default='intermediate', index=True)  # beginner, intermediate, advanced
    description = db.Column(db.Text, nullable=True)
    passing_score = db.Column(db.Integer, default=80, nullable=False)
    time_limit_minutes = db.Column(db.Integer, default=15, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    questions = db.relationship('AssessmentQuestion', backref='assessment', cascade='all, delete-orphan', lazy=True, order_by='AssessmentQuestion.order_num')
    attempts = db.relationship('AssessmentAttempt', backref='assessment', cascade='all, delete-orphan', lazy=True)

    def to_dict(self, include_questions=False, include_answers=False, user_id=None):
        data = {
            'id': self.id,
            'title': self.title,
            'level': self.level,
            'description': self.description,
            'passing_score': self.passing_score,
            'time_limit_minutes': self.time_limit_minutes,
            'is_active': self.is_active,
            'questions_count': len(self.questions),
            'total_attempts': len(self.attempts),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'user_passed': False,
            'user_best_score': 0
        }

        if user_id:
            user_attempts = [a for a in self.attempts if a.user_id == user_id]
            if user_attempts:
                data['user_best_score'] = max(a.score_percent for a in user_attempts)
                data['user_passed'] = any(a.passed for a in user_attempts)

        if include_questions:
            data['questions'] = [q.to_dict(include_answer=include_answers) for q in self.questions]

        return data


class AssessmentQuestion(db.Model):
    __tablename__ = 'assessment_questions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id', ondelete='CASCADE'), nullable=False, index=True)
    question_text = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False, default='General SQL')
    option_a = db.Column(db.Text, nullable=False)
    option_b = db.Column(db.Text, nullable=False)
    option_c = db.Column(db.Text, nullable=False)
    option_d = db.Column(db.Text, nullable=False)
    correct_option = db.Column(db.Integer, nullable=False, default=0)  # 0=A, 1=B, 2=C, 3=D
    explanation = db.Column(db.Text, nullable=True)
    order_num = db.Column(db.Integer, default=1)

    def to_dict(self, include_answer=False):
        data = {
            'id': self.id,
            'assessment_id': self.assessment_id,
            'question': self.question_text,
            'category': self.category,
            'options': [self.option_a, self.option_b, self.option_c, self.option_d],
            'order_num': self.order_num
        }
        if include_answer:
            data['correct_index'] = self.correct_option
            data['explanation'] = self.explanation
        return data


class AssessmentAttempt(db.Model):
    __tablename__ = 'assessment_attempts'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id', ondelete='CASCADE'), nullable=False, index=True)
    score_percent = db.Column(db.Integer, nullable=False, default=0)
    passed = db.Column(db.Boolean, default=False, nullable=False)
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'assessment_id': self.assessment_id,
            'score_percent': self.score_percent,
            'passed': self.passed,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
