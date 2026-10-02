from datetime import datetime
from app.extensions import db

class Challenge(db.Model):
    __tablename__ = 'challenges'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), nullable=False, unique=True, index=True)
    difficulty = db.Column(db.String(50), nullable=False, default='beginner', index=True)  # beginner, intermediate, advanced
    category = db.Column(db.String(100), nullable=False, default='General', index=True)
    description = db.Column(db.Text, nullable=False)
    business_context = db.Column(db.Text, nullable=True)
    dataset_name = db.Column(db.String(255), nullable=False)
    target_table = db.Column(db.String(255), nullable=False)
    starter_sql = db.Column(db.Text, nullable=True)
    solution_sql = db.Column(db.Text, nullable=False)
    hint_1 = db.Column(db.Text, nullable=True)
    hint_2 = db.Column(db.Text, nullable=True)
    hint_3 = db.Column(db.Text, nullable=True)
    xp_reward = db.Column(db.Integer, default=50)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to user progress
    user_progress = db.relationship('UserChallengeProgress', backref='challenge', cascade='all, delete-orphan', lazy=True)

    def to_dict(self, include_solution=False, user_id=None):
        data = {
            'id': self.id,
            'title': self.title,
            'slug': self.slug,
            'difficulty': self.difficulty,
            'category': self.category,
            'description': self.description,
            'business_context': self.business_context,
            'dataset_name': self.dataset_name,
            'target_table': self.target_table,
            'starter_sql': self.starter_sql or f"-- Write your SQL solution for: {self.title}\nSELECT * FROM `{self.target_table}` LIMIT 10;",
            'hint_1': self.hint_1,
            'hint_2': self.hint_2,
            'hint_3': self.hint_3,
            'xp_reward': self.xp_reward,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_solved': False,
            'attempts_count': 0
        }

        if user_id:
            for p in self.user_progress:
                if p.user_id == user_id:
                    data['is_solved'] = (p.status == 'solved')
                    data['attempts_count'] = p.attempts_count
                    data['submitted_sql'] = p.submitted_sql
                    break

        if include_solution:
            data['solution_sql'] = self.solution_sql

        return data


class UserChallengeProgress(db.Model):
    __tablename__ = 'user_challenge_progress'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    challenge_id = db.Column(db.Integer, db.ForeignKey('challenges.id', ondelete='CASCADE'), nullable=False, index=True)
    status = db.Column(db.String(50), nullable=False, default='started')  # 'started', 'solved'
    submitted_sql = db.Column(db.Text, nullable=True)
    attempts_count = db.Column(db.Integer, default=1)
    solved_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'challenge_id': self.challenge_id,
            'status': self.status,
            'submitted_sql': self.submitted_sql,
            'attempts_count': self.attempts_count,
            'solved_at': self.solved_at.isoformat() if self.solved_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
