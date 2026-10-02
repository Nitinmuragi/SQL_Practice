from flask import Blueprint, request, jsonify, g
from app.middleware.auth import token_required, token_optional
from app.services.contest_service import ContestService

contests_bp = Blueprint('contests', __name__, url_prefix='/api/contests')

@contests_bp.route('', methods=['GET'])
@token_optional
def list_contests():
    """List upcoming, active, and past contests."""
    user_id = getattr(g, 'current_user', None).id if hasattr(g, 'current_user') and g.current_user else None
    data = ContestService.list_contests(user_id=user_id)
    return jsonify({
        'success': True,
        'data': data
    }), 200


@contests_bp.route('/profile-data', methods=['GET'])
@token_required
def get_user_profile():
    """Get pre-filled user details for contest registration."""
    data = ContestService.get_user_profile_for_registration(g.current_user.id)
    return jsonify({
        'success': True,
        'data': data
    }), 200


@contests_bp.route('/<int:contest_id>', methods=['GET'])
@token_optional
def get_contest(contest_id: int):
    """Get contest details and user registration state."""
    user_id = getattr(g, 'current_user', None).id if hasattr(g, 'current_user') and g.current_user else None
    contest = ContestService.get_contest_detail(contest_id, user_id=user_id)
    if not contest:
        return jsonify({
            'success': False,
            'message': 'Contest not found.'
        }), 404

    return jsonify({
        'success': True,
        'data': contest
    }), 200


@contests_bp.route('/<int:contest_id>/register', methods=['POST'])
@token_required
def register_contest(contest_id: int):
    """Register for a contest with full validation & email confirmation."""
    body = request.get_json() or {}
    res = ContestService.register_user(contest_id, g.current_user.id, body)
    status_code = 200 if res.get('success') else 400
    return jsonify(res), status_code


@contests_bp.route('/<int:contest_id>/room', methods=['GET'])
@token_required
def get_contest_room(contest_id: int):
    """Enter live exam room."""
    res = ContestService.get_contest_exam_room(contest_id, g.current_user.id)
    status_code = 200 if res.get('success') else 400
    return jsonify(res), status_code


@contests_bp.route('/<int:contest_id>/submit', methods=['POST'])
@token_required
def submit_contest_solution(contest_id: int):
    """Submit SQL query for contest question with millisecond accuracy."""
    body = request.get_json() or {}
    question_id = body.get('question_id')
    user_sql = body.get('sql', '')
    selected_option = body.get('selected_option')

    if not question_id:
        return jsonify({
            'success': False,
            'message': 'question_id is required.'
        }), 400

    res = ContestService.submit_contest_solution(contest_id, question_id, g.current_user.id, user_sql=user_sql, selected_option=selected_option)
    status_code = 200 if res.get('success') else 400
    return jsonify(res), status_code


@contests_bp.route('/<int:contest_id>/run', methods=['POST'])
@token_required
def run_contest_query(contest_id: int):
    """Test run candidate SQL query without recording an official submission."""
    body = request.get_json() or {}
    question_id = body.get('question_id')
    user_sql = body.get('sql', '')

    if not question_id:
        return jsonify({
            'success': False,
            'message': 'question_id is required.'
        }), 400

    res = ContestService.run_test_query(contest_id, question_id, g.current_user.id, user_sql=user_sql)
    status_code = 200 if res.get('success') else 400
    return jsonify(res), status_code


@contests_bp.route('/<int:contest_id>/finish', methods=['POST'])
@token_required
def finish_contest(contest_id: int):
    """Mark participant exam attempt as completed/submitted."""
    res = ContestService.finish_contest_attempt(contest_id, g.current_user.id)
    status_code = 200 if res.get('success') else 400
    return jsonify(res), status_code


@contests_bp.route('/<int:contest_id>/questions/<int:question_id>/eer', methods=['GET'])
@token_required
def get_contest_question_eer(contest_id: int, question_id: int):
    """Fetch EER diagram metadata for a contest question."""
    from app.models.contest import ContestQuestion
    from app.services.dataset_service import DatasetService
    q = ContestQuestion.query.filter_by(id=question_id, contest_id=contest_id).first()
    if not q:
        return jsonify({'success': False, 'message': 'Question not found'}), 404
    try:
        eer = DatasetService.get_dataset_eer(
            user_id=g.current_user.id,
            dataset_name=q.dataset_name,
            target_table=q.target_table
        )
        return jsonify({'success': True, 'data': eer}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@contests_bp.route('/<int:contest_id>/leaderboard', methods=['GET'])
@token_optional
def get_leaderboard(contest_id: int):
    """Get final contest rankings, top 3 podium, and celebrate view."""
    user_id = getattr(g, 'current_user', None).id if hasattr(g, 'current_user') and g.current_user else None
    res = ContestService.get_contest_leaderboard(contest_id, user_id=user_id)
    status_code = 200 if res.get('success') else 404
    return jsonify(res), status_code


@contests_bp.route('/<int:contest_id>/my-certificate', methods=['GET'])
@token_required
def get_my_certificate(contest_id: int):
    """Download or view exclusive top 3 ranker certificate."""
    target_user_id = g.current_user.id
    req_user_id = request.args.get('user_id', type=int)
    if req_user_id and getattr(g.current_user, 'is_admin', False):
        target_user_id = req_user_id
    res = ContestService.get_my_contest_certificate(contest_id, target_user_id)
    status_code = 200 if res.get('success') else 403
    return jsonify(res), status_code
