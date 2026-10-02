from flask import Blueprint, request, jsonify, g
from app.middleware.auth import token_required
from app.services.assessment_service import AssessmentService

assessment_bp = Blueprint('assessment', __name__, url_prefix='/api/assessment')

@assessment_bp.route('', methods=['GET'])
@token_required
def list_assessments():
    level = request.args.get('level')
    assessments = AssessmentService.list_assessments(level=level, user_id=g.current_user.id)
    return jsonify({
        'success': True,
        'data': assessments
    }), 200


@assessment_bp.route('/<int:assessment_id>', methods=['GET'])
@token_required
def get_assessment(assessment_id: int):
    assessment = AssessmentService.get_assessment_detail(assessment_id, user_id=g.current_user.id, is_admin=False)
    if not assessment:
        return jsonify({
            'success': False,
            'message': 'Assessment not found.'
        }), 404
    return jsonify({
        'success': True,
        'data': assessment
    }), 200


@assessment_bp.route('/<int:assessment_id>/submit', methods=['POST'])
@token_required
def submit_assessment_by_id(assessment_id: int):
    body = request.get_json() or {}
    answers = body.get('answers', {})
    if not answers:
        return jsonify({
            'success': False,
            'message': 'Answers are required.'
        }), 400

    result = AssessmentService.submit_assessment(g.current_user.id, assessment_id, answers)
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code


@assessment_bp.route('/my-certificates', methods=['GET'])
@token_required
def get_my_certificates():
    certs = AssessmentService.get_user_certificates(g.current_user.id)
    return jsonify({
        'success': True,
        'data': certs
    }), 200


# --- BACKWARD COMPATIBILITY ALIASES ---

@assessment_bp.route('/questions', methods=['GET'])
@token_required
def get_assessment_questions_legacy():
    # Return questions from first assessment
    assessments = AssessmentService.list_assessments(user_id=g.current_user.id)
    if not assessments:
        return jsonify({'success': True, 'data': []}), 200
    first_id = assessments[0]['id']
    detail = AssessmentService.get_assessment_detail(first_id, user_id=g.current_user.id, is_admin=False)
    return jsonify({
        'success': True,
        'data': detail.get('questions', [])
    }), 200


@assessment_bp.route('/submit', methods=['POST'])
@token_required
def submit_assessment_legacy():
    body = request.get_json() or {}
    answers = body.get('answers', {})
    assessments = AssessmentService.list_assessments(user_id=g.current_user.id)
    if not assessments:
        return jsonify({'success': False, 'message': 'No assessments available.'}), 400
    first_id = assessments[0]['id']
    result = AssessmentService.submit_assessment(g.current_user.id, first_id, answers)
    return jsonify(result), 200 if result.get('success') else 400


@assessment_bp.route('/my-certificate', methods=['GET'])
@token_required
def get_my_certificate_legacy():
    certs = AssessmentService.get_user_certificates(g.current_user.id)
    latest = certs[0] if certs else None
    return jsonify({
        'success': True,
        'data': latest
    }), 200
