from datetime import datetime
from app.extensions import db

class Dataset(db.Model):
    __tablename__ = 'datasets'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    source_type = db.Column(db.String(50), nullable=False, default='manual')  # 'excel', 'csv', 'manual'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tables = db.relationship('DatasetTable', backref='dataset', cascade='all, delete-orphan', lazy=True)
    queries = db.relationship('QueryHistory', backref='dataset', lazy=True)

    def to_dict(self, include_tables=False):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'source_type': self.source_type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'table_count': len(self.tables) if self.tables else 0
        }
        if include_tables:
            data['tables'] = [t.to_dict() for t in self.tables]
        return data


class DatasetTable(db.Model):
    __tablename__ = 'dataset_tables'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id', ondelete='CASCADE'), nullable=False, index=True)
    table_name = db.Column(db.String(255), nullable=False)
    physical_table_name = db.Column(db.String(255), nullable=False)
    row_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'dataset_id': self.dataset_id,
            'table_name': self.table_name,
            'physical_table_name': self.physical_table_name,
            'row_count': self.row_count,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
