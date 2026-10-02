from flask import Blueprint, request, jsonify, g
from app.middleware.auth import token_required
from app.services.challenge_service import ChallengeService

challenges_bp = Blueprint('challenges', __name__, url_prefix='/api/challenges')

@challenges_bp.route('', methods=['GET'])
@token_required
def list_challenges():
    difficulty = request.args.get('difficulty')
    category = request.args.get('category')
    data = ChallengeService.list_challenges(
        user_id=g.current_user.id,
        difficulty=difficulty,
        category=category
    )
    return jsonify({
        'success': True,
        'data': data
    }), 200


@challenges_bp.route('/<int:challenge_id>', methods=['GET'])
@token_required
def get_challenge(challenge_id: int):
    challenge = ChallengeService.get_challenge_detail(challenge_id, user_id=g.current_user.id)
    if not challenge:
        return jsonify({
            'success': False,
            'message': 'Challenge not found.'
        }), 404
    return jsonify({
        'success': True,
        'data': challenge
    }), 200


@challenges_bp.route('/<int:challenge_id>/submit', methods=['POST'])
@token_required
def submit_challenge(challenge_id: int):
    body = request.get_json() or {}
    sql = body.get('sql')
    if not sql:
        return jsonify({
            'success': False,
            'message': 'SQL query is required.'
        }), 400

    result = ChallengeService.submit_solution(
        user_id=g.current_user.id,
        challenge_id=challenge_id,
        user_sql=sql
    )
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code


@challenges_bp.route('/stats', methods=['GET'])
@token_required
def get_learning_stats():
    stats = ChallengeService.get_user_learning_stats(g.current_user.id)
    return jsonify({
        'success': True,
        'data': stats
    }), 200


@challenges_bp.route('/tracks', methods=['GET'])
@token_required
def get_learning_tracks():
    tracks = ChallengeService.get_learning_tracks(g.current_user.id)
    return jsonify({
        'success': True,
        'data': tracks
    }), 200


@challenges_bp.route('/daily', methods=['GET'])
@token_required
def get_daily_challenge():
    daily_data = ChallengeService.get_daily_challenge(g.current_user.id)
    return jsonify({
        'success': True,
        'data': daily_data
    }), 200

