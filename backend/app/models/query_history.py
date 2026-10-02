from datetime import datetime
from app.extensions import db

class QueryHistory(db.Model):
    __tablename__ = 'query_history'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id', ondelete='SET NULL'), nullable=True)
    query_text = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), nullable=False)  # 'success', 'error'
    error_message = db.Column(db.Text, nullable=True)
    execution_time = db.Column(db.Float, nullable=True)  # in seconds / ms
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'dataset_id': self.dataset_id,
            'dataset_name': self.dataset.name if self.dataset else 'Unknown/Deleted Dataset',
            'query_text': self.query_text,
            'status': self.status,
            'error_message': self.error_message,
            'execution_time': self.execution_time,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
