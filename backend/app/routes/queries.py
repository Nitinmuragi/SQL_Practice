from flask import Blueprint, request, jsonify, g
from app.middleware.auth import token_required
from app.services.query_service import QueryService

queries_bp = Blueprint('queries', __name__, url_prefix='/api/query')

@queries_bp.route('/execute', methods=['POST'])
@token_required
def execute_query():
    data = request.get_json() or {}
    dataset_id = data.get('dataset_id')

    if not dataset_id:
        return jsonify({'success': False, 'message': 'dataset_id is required.'}), 400

    try:
        res = QueryService.execute_query(
            user_id=g.current_user.id,
            dataset_id=int(dataset_id),
            query_data=data
        )
        if res.get('success'):
            return jsonify({
                'success': True,
                'message': 'Query executed successfully.',
                'data': res
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Query execution failed.',
                'error': res.get('error'),
                'data': res
            }), 400
    except ValueError as ve:
        return jsonify({'success': False, 'message': str(ve), 'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': 'Execution error', 'error': str(e)}), 500


@queries_bp.route('/history', methods=['GET'])
@token_required
def get_query_history():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    history_data = QueryService.get_user_history(g.current_user.id, page=page, per_page=per_page)
    return jsonify({
        'success': True,
        'data': history_data
    }), 200


@queries_bp.route('/history/<int:history_id>', methods=['GET'])
@token_required
def get_history_item(history_id: int):
    item = QueryService.get_history_detail(g.current_user.id, history_id)
    if not item:
        return jsonify({'success': False, 'message': 'History record not found.'}), 404

    return jsonify({
        'success': True,
        'data': item
    }), 200


@queries_bp.route('/explain', methods=['POST'])
@token_required
def explain_query():
    body = request.get_json() or {}
    sql = body.get('sql') or body.get('query')
    if not sql:
        return jsonify({'success': False, 'message': 'SQL query string is required.'}), 400

    res = QueryService.explain_query(sql)
    return jsonify(res), 200

