import re
import time
from flask import Blueprint, request, jsonify, g
from sqlalchemy import text, inspect
from app.extensions import db
from app.middleware.admin import admin_required
from app.models.challenge import Challenge, UserChallengeProgress
from app.utils.security import check_destructive_sql, mask_sensitive_error, strip_sql_comments

admin_challenges_bp = Blueprint('admin_challenges', __name__, url_prefix='/api/admin/challenges')


@admin_challenges_bp.route('', methods=['GET'])
@admin_required
def list_admin_challenges():
    """List all challenges with canonical solution and completion stats for administrators."""
    challenges = Challenge.query.order_by(Challenge.id.desc()).all()
    results = []

    for ch in challenges:
        data = ch.to_dict(include_solution=True)
        # Compute summary completion statistics
        total_attempts = UserChallengeProgress.query.filter_by(challenge_id=ch.id).count()
        solved_count = UserChallengeProgress.query.filter_by(challenge_id=ch.id, status='solved').count()
        data['total_students_engaged'] = total_attempts
        data['total_students_solved'] = solved_count
        data['completion_rate'] = round((solved_count / total_attempts * 100), 1) if total_attempts > 0 else 0.0
        results.append(data)

    return jsonify({
        'success': True,
        'data': results
    }), 200


@admin_challenges_bp.route('/tables', methods=['GET'])
@admin_required
def get_available_tables():
    """Return available tables in the database to help admins pick target tables."""
    try:
        inspector = inspect(db.engine)
        table_names = inspector.get_table_names()
        # Filter out internal platform system tables
        internal = {'users', 'datasets', 'dataset_tables', 'query_history', 'challenges', 'user_challenge_progress'}
        challenge_tables = [t for t in table_names if t not in internal]

        # Extract column schema for each table
        tables_meta = []
        for t in challenge_tables:
            cols = [c['name'] for c in inspector.get_columns(t) if c['name'] != '_row_id']
            tables_meta.append({
                'table_name': t,
                'columns': cols,
                'is_challenge_preset': t.startswith('ch_')
            })

        return jsonify({
            'success': True,
            'data': tables_meta
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_challenges_bp.route('/validate', methods=['POST'])
@admin_required
def validate_solution_sql():
    """
    Dry-run solution SQL against MySQL to verify that the query is syntactically
    correct, safe, and returns expected rows before saving.
    """
    body = request.get_json() or {}
    sql = (body.get('solution_sql') or '').strip()

    if not sql:
        return jsonify({'success': False, 'message': 'Solution SQL is required for validation.'}), 400

    # 1. Safety check
    is_safe, sec_err = check_destructive_sql(sql)
    if not is_safe:
        return jsonify({'success': False, 'message': sec_err, 'error': sec_err}), 400

    # 2. Test-run on database
    start_time = time.perf_counter()
    try:
        clean_sql = strip_sql_comments(sql).strip().rstrip(';').strip()
        result = db.session.execute(text(clean_sql))
        exec_ms = round((time.perf_counter() - start_time) * 1000, 2)

        if not result.returns_rows:
            return jsonify({
                'success': False,
                'message': 'Query did not return rows. Solution SQL for challenges must be a SELECT query.',
                'error': 'No rows returned.'
            }), 400

        columns = list(result.keys())
        raw_rows = [dict(r) for r in result.mappings()]
        preview_rows = raw_rows[:10]

        return jsonify({
            'success': True,
            'message': f'Validation successful! Query returned {len(raw_rows)} row(s).',
            'columns': columns,
            'rows': preview_rows,
            'total_rows': len(raw_rows),
            'execution_time_ms': exec_ms
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Query execution failed: {mask_sensitive_error(str(e))}',
            'error': mask_sensitive_error(str(e))
        }), 400


@admin_challenges_bp.route('', methods=['POST'])
@admin_required
def create_challenge():
    """Create a new dynamic SQL challenge via admin portal."""
    data = request.get_json() or {}

    title = (data.get('title') or '').strip()
    target_table = (data.get('target_table') or '').strip()
    solution_sql = (data.get('solution_sql') or '').strip()
    description = (data.get('description') or '').strip()

    if not title:
        return jsonify({'success': False, 'message': 'Challenge title is required.'}), 400
    if not target_table:
        return jsonify({'success': False, 'message': 'Target table is required.'}), 400
    if not solution_sql:
        return jsonify({'success': False, 'message': 'Canonical solution SQL is required.'}), 400
    if not description:
        return jsonify({'success': False, 'message': 'Challenge description is required.'}), 400

    # Validate safety
    is_safe, sec_err = check_destructive_sql(solution_sql)
    if not is_safe:
        return jsonify({'success': False, 'message': sec_err}), 400

    # Generate or sanitize slug
    slug = (data.get('slug') or '').strip()
    if not slug:
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')

    existing = Challenge.query.filter_by(slug=slug).first()
    if existing:
        slug = f"{slug}-{int(time.time())}"

    starter_sql = data.get('starter_sql') or f"-- Write your solution for {title}\nSELECT * FROM `{target_table}` LIMIT 10;"

    try:
        challenge = Challenge(
            title=title,
            slug=slug,
            difficulty=(data.get('difficulty') or 'beginner').lower(),
            category=data.get('category') or 'General',
            description=description,
            business_context=data.get('business_context') or '',
            dataset_name=data.get('dataset_name') or 'Custom Challenge DB',
            target_table=target_table,
            starter_sql=starter_sql,
            solution_sql=solution_sql,
            hint_1=data.get('hint_1') or None,
            hint_2=data.get('hint_2') or None,
            hint_3=data.get('hint_3') or None,
            xp_reward=int(data.get('xp_reward') or 50)
        )
        db.session.add(challenge)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f"Challenge '{title}' created successfully!",
            'data': challenge.to_dict(include_solution=True)
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to create challenge: {str(e)}'}), 500


@admin_challenges_bp.route('/<int:challenge_id>', methods=['PUT'])
@admin_required
def update_challenge(challenge_id: int):
    """Update an existing challenge."""
    challenge = db.session.get(Challenge, challenge_id)
    if not challenge:
        return jsonify({'success': False, 'message': 'Challenge not found.'}), 404

    data = request.get_json() or {}

    if 'solution_sql' in data:
        is_safe, sec_err = check_destructive_sql(data['solution_sql'])
        if not is_safe:
            return jsonify({'success': False, 'message': sec_err}), 400

    fields = [
        'title', 'difficulty', 'category', 'description', 'business_context',
        'dataset_name', 'target_table', 'starter_sql', 'solution_sql',
        'hint_1', 'hint_2', 'hint_3'
    ]

    for f in fields:
        if f in data:
            setattr(challenge, f, data[f])

    if 'xp_reward' in data:
        try:
            challenge.xp_reward = int(data['xp_reward'])
        except (ValueError, TypeError):
            pass

    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': f"Challenge '{challenge.title}' updated successfully.",
            'data': challenge.to_dict(include_solution=True)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to update challenge: {str(e)}'}), 500


@admin_challenges_bp.route('/<int:challenge_id>', methods=['DELETE'])
@admin_required
def delete_challenge(challenge_id: int):
    """Delete a challenge and its associated user records."""
    challenge = db.session.get(Challenge, challenge_id)
    if not challenge:
        return jsonify({'success': False, 'message': 'Challenge not found.'}), 404

    try:
        title = challenge.title
        db.session.delete(challenge)
        db.session.commit()
        return jsonify({
            'success': True,
            'message': f"Challenge '{title}' was deleted successfully."
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to delete challenge: {str(e)}'}), 500
