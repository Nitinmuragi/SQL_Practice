from flask import Blueprint, request, jsonify, g
from app.middleware.auth import token_required
from app.services.dataset_service import DatasetService
from app.services.excel_service import ExcelService

datasets_bp = Blueprint('datasets', __name__, url_prefix='/api')

@datasets_bp.route('/datasets', methods=['GET'])
@token_required
def get_datasets():
    datasets = DatasetService.get_user_datasets(g.current_user.id)
    return jsonify({
        'success': True,
        'data': datasets
    }), 200


@datasets_bp.route('/datasets', methods=['POST'])
@token_required
def create_manual_dataset():
    data = request.get_json() or {}
    name = data.get('name')
    table_name = data.get('table_name')
    columns = data.get('columns', [])
    rows = data.get('rows', [])

    try:
        result = DatasetService.create_manual_dataset(
            user_id=g.current_user.id,
            dataset_name=name,
            table_name=table_name,
            columns=columns,
            rows=rows
        )
        return jsonify({
            'success': True,
            'message': 'Dataset and table created successfully.',
            'data': result
        }), 201
    except ValueError as ve:
        return jsonify({'success': False, 'message': str(ve)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@datasets_bp.route('/datasets/preview-upload', methods=['POST'])
@token_required
def preview_upload():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file uploaded.'}), 400

    file = request.files['file']
    if not file or not file.filename:
        return jsonify({'success': False, 'message': 'Empty file submission.'}), 400

    try:
        preview_data = ExcelService.preview_uploaded_file(file, file.filename)
        return jsonify({
            'success': True,
            'data': preview_data
        }), 200
    except ValueError as ve:
        return jsonify({'success': False, 'message': str(ve)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f'File parsing error: {str(e)}'}), 500


@datasets_bp.route('/datasets/upload', methods=['POST'])
@token_required
def upload_dataset():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file uploaded.'}), 400

    file = request.files['file']
    if not file or not file.filename:
        return jsonify({'success': False, 'message': 'Empty file submission.'}), 400

    dataset_name = request.form.get('name') or file.filename.rsplit('.', 1)[0]
    table_name = request.form.get('table_name') or dataset_name

    try:
        result = ExcelService.import_to_mysql(
            user_id=g.current_user.id,
            dataset_name=dataset_name,
            table_name=table_name,
            file_obj=file,
            filename=file.filename
        )
        return jsonify({
            'success': True,
            'message': 'File uploaded and imported to MySQL successfully.',
            'data': result
        }), 201
    except ValueError as ve:
        return jsonify({'success': False, 'message': str(ve)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f'Import failed: {str(e)}'}), 500


@datasets_bp.route('/datasets/<int:dataset_id>', methods=['GET'])
@token_required
def get_dataset(dataset_id: int):
    dataset = DatasetService.get_dataset(g.current_user.id, dataset_id)
    if not dataset:
        return jsonify({'success': False, 'message': 'Dataset not found.'}), 404

    return jsonify({
        'success': True,
        'data': dataset.to_dict(include_tables=True)
    }), 200


@datasets_bp.route('/datasets/<int:dataset_id>', methods=['DELETE'])
@token_required
def delete_dataset(dataset_id: int):
    success = DatasetService.delete_dataset(g.current_user.id, dataset_id)
    if not success:
        return jsonify({'success': False, 'message': 'Dataset not found or cannot be deleted.'}), 404

    return jsonify({
        'success': True,
        'message': 'Dataset deleted successfully.'
    }), 200


@datasets_bp.route('/dashboard/stats', methods=['GET'])
@token_required
def get_dashboard_stats():
    stats = DatasetService.get_dashboard_stats(g.current_user.id)
    return jsonify({
        'success': True,
        'data': stats
    }), 200


@datasets_bp.route('/datasets/load-sample', methods=['POST'])
@token_required
def load_sample_dataset():
    data = request.get_json() or {}
    sample_key = data.get('sample_key', 'ecommerce')

    try:
        result = DatasetService.load_sample_dataset(g.current_user.id, sample_key)
        return jsonify({
            'success': True,
            'message': f"Sample dataset '{result['dataset']['name']}' loaded successfully with {result['tables_created']} table(s).",
            'data': result
        }), 201
    except ValueError as ve:
        return jsonify({'success': False, 'message': str(ve)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

