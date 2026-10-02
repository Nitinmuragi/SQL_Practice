from flask import Flask, jsonify
from app.config import Config
from app.extensions import db, cors

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"]
    )

    # Register Blueprints
    from app.routes.auth import auth_bp
    from app.routes.datasets import datasets_bp
    from app.routes.tables import tables_bp
    from app.routes.queries import queries_bp
    from app.routes.challenges import challenges_bp
    from app.routes.admin_challenges import admin_challenges_bp
    from app.routes.assessment import assessment_bp
    from app.routes.admin_assessments import admin_assessments_bp
    from app.routes.contests import contests_bp
    from app.routes.admin_contests import admin_contests_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(datasets_bp)
    app.register_blueprint(tables_bp)
    app.register_blueprint(queries_bp)
    app.register_blueprint(challenges_bp)
    app.register_blueprint(admin_challenges_bp)
    app.register_blueprint(assessment_bp)
    app.register_blueprint(admin_assessments_bp)
    app.register_blueprint(contests_bp)
    app.register_blueprint(admin_contests_bp)

    # Health check route
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'success': True,
            'message': 'SQL Practice Platform API is running.'
        }), 200

    # Centralized Error Handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'success': False, 'message': 'Bad Request', 'error': str(e)}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({'success': False, 'message': 'Unauthorized', 'error': str(e)}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({'success': False, 'message': 'Forbidden', 'error': str(e)}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'message': 'Resource not found', 'error': str(e)}), 404

    @app.errorhandler(409)
    def conflict(e):
        return jsonify({'success': False, 'message': 'Conflict', 'error': str(e)}), 409

    @app.errorhandler(413)
    def request_entity_too_large(e):
        return jsonify({'success': False, 'message': 'File too large. Maximum size is 16MB.'}), 413

    @app.errorhandler(500)
    def internal_server_error(e):
        return jsonify({'success': False, 'message': 'Internal Server Error. Please try again later.'}), 500

    with app.app_context():
        # Ensure database tables exist
        try:
            db.create_all()
        except Exception as e:
            app.logger.error(f"Error creating tables: {e}")

    return app
