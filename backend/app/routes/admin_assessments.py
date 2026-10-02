from flask import Blueprint, request, jsonify, g
from app.middleware.admin import admin_required
from app.services.assessment_service import AssessmentService
from app.models.assessment import Assessment

admin_assessments_bp = Blueprint('admin_assessments', __name__, url_prefix='/api/admin/assessments')

@admin_assessments_bp.route('', methods=['GET'])
@admin_required
def list_admin_assessments():
    """List all assessments with question counts and pass stats."""
    level = request.args.get('level')
    AssessmentService.ensure_seeded()
    assessments = Assessment.query
    if level and level.lower() != 'all':
        assessments = assessments.filter(Assessment.level == level.lower())
    
    results = [a.to_dict(include_questions=True, include_answers=True) for a in assessments.order_by(Assessment.id.desc()).all()]
    return jsonify({
        'success': True,
        'data': results
    }), 200


@admin_assessments_bp.route('/<int:assessment_id>', methods=['GET'])
@admin_required
def get_admin_assessment(assessment_id: int):
    """Get single assessment with complete question details and answers."""
    data = AssessmentService.get_assessment_detail(assessment_id, is_admin=True)
    if not data:
        return jsonify({'success': False, 'message': 'Assessment not found.'}), 404
    return jsonify({
        'success': True,
        'data': data
    }), 200


@admin_assessments_bp.route('', methods=['POST'])
@admin_required
def create_assessment():
    """Create a new level-wise assessment package with questions."""
    body = request.get_json() or {}
    result = AssessmentService.admin_create_assessment(body, user_id=g.current_user.id)
    status_code = 201 if result.get('success') else 400
    return jsonify(result), status_code


@admin_assessments_bp.route('/<int:assessment_id>', methods=['PUT'])
@admin_required
def update_assessment(assessment_id: int):
    """Update assessment metadata and questions."""
    body = request.get_json() or {}
    result = AssessmentService.admin_update_assessment(assessment_id, body)
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code


@admin_assessments_bp.route('/<int:assessment_id>', methods=['DELETE'])
@admin_required
def delete_assessment(assessment_id: int):
    """Delete an assessment and its questions."""
    result = AssessmentService.admin_delete_assessment(assessment_id)
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code
