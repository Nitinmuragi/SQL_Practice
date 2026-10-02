from flask import Blueprint, request, jsonify, g
from app.middleware.auth import token_required
from app.services.dataset_service import DatasetService
from app.services.excel_service import ExcelService

tables_bp = Blueprint('tables', __name__, url_prefix='/api/datasets')

@tables_bp.route('/<int:dataset_id>/tables', methods=['GET'])
@token_required
def get_dataset_tables(dataset_id: int):
    dataset = DatasetService.get_dataset(g.current_user.id, dataset_id)
    if not dataset:
        return jsonify({'success': False, 'message': 'Dataset not found.'}), 404

    tables_data = [t.to_dict() for t in dataset.tables]
    return jsonify({
        'success': True,
        'data': tables_data
    }), 200


@tables_bp.route('/<int:dataset_id>/eer', methods=['GET'])
@token_required
def get_dataset_eer(dataset_id: int):
    try:
        eer_data = DatasetService.get_dataset_eer(user_id=g.current_user.id, dataset_id=dataset_id)
        return jsonify({
            'success': True,
            'data': eer_data
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to generate EER diagram: {str(e)}'}), 500


@tables_bp.route('/eer', methods=['GET'])
@token_required
def get_generic_eer():
    dataset_name = request.args.get('dataset_name')
    target_table = request.args.get('target_table')
    dataset_id = request.args.get('dataset_id', type=int)
    try:
        eer_data = DatasetService.get_dataset_eer(
            user_id=g.current_user.id,
            dataset_id=dataset_id,
            dataset_name=dataset_name,
            target_table=target_table
        )
        return jsonify({
            'success': True,
            'data': eer_data
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to generate EER diagram: {str(e)}'}), 500


@tables_bp.route('/<int:dataset_id>/tables/<string:table_name>', methods=['GET'])
@token_required
def get_table_details(dataset_id: int, table_name: str):
    try:
        details = DatasetService.get_table_details(g.current_user.id, dataset_id, table_name)
        return jsonify({
            'success': True,
            'data': details
        }), 200
    except ValueError as ve:
        return jsonify({'success': False, 'message': str(ve)}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@tables_bp.route('/<int:dataset_id>/tables/<string:table_name>/rows', methods=['POST'])
@token_required
def add_table_row(dataset_id: int, table_name: str):
    row_data = request.get_json() or {}
    try:
        result = DatasetService.insert_row(g.current_user.id, dataset_id, table_name, row_data)
        return jsonify({
            'success': True,
            'message': 'Row added successfully.',
            'data': result
        }), 201
    except ValueError as ve:
        return jsonify({'success': False, 'message': str(ve)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@tables_bp.route('/<int:dataset_id>/tables', methods=['POST'])
@token_required
def create_table_in_dataset(dataset_id: int):
    data = request.get_json() or {}
    table_name = data.get('table_name')
    columns = data.get('columns', [])
    rows = data.get('rows', [])

    try:
        result = DatasetService.create_table_in_dataset(
            user_id=g.current_user.id,
            dataset_id=dataset_id,
            table_name=table_name,
            columns=columns,
            rows=rows
        )
        return jsonify({
            'success': True,
            'message': 'Table created successfully.',
            'data': result
        }), 201
    except ValueError as ve:
        return jsonify({'success': False, 'message': str(ve)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@tables_bp.route('/<int:dataset_id>/tables/upload', methods=['POST'])
@token_required
def upload_table_to_dataset(dataset_id: int):
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file uploaded.'}), 400

    file = request.files['file']
    if not file or not file.filename:
        return jsonify({'success': False, 'message': 'Empty file submission.'}), 400

    table_name = request.form.get('table_name') or file.filename.rsplit('.', 1)[0]

    try:
        result = ExcelService.import_table_to_dataset(
            user_id=g.current_user.id,
            dataset_id=dataset_id,
            table_name=table_name,
            file_obj=file,
            filename=file.filename
        )
        return jsonify({
            'success': True,
            'message': 'Table uploaded successfully.',
            'data': result
        }), 201
    except ValueError as ve:
        return jsonify({'success': False, 'message': str(ve)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

