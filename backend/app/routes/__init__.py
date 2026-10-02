from app.routes.auth import auth_bp
from app.routes.datasets import datasets_bp
from app.routes.tables import tables_bp
from app.routes.queries import queries_bp

__all__ = ['auth_bp', 'datasets_bp', 'tables_bp', 'queries_bp']
