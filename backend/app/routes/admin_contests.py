from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.middleware.admin import admin_required
from app.models.contest import (
    Contest,
    ContestRegistration,
    ContestQuestion,
    ContestSubmission,
    ContestLeaderboard
)
from app.services.contest_service import ContestService

admin_contests_bp = Blueprint('admin_contests', __name__, url_prefix='/api/admin/contests')

def parse_iso_to_utc(iso_str):
    """Safely convert any ISO datetime string (naive or timezone-aware) to naive UTC datetime."""
    if not iso_str:
        return None
    s = str(iso_str).strip()
    if s.endswith('Z'):
        dt = datetime.fromisoformat(s[:-1] + '+00:00')
    else:
        dt = datetime.fromisoformat(s)
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt

def parse_and_validate_timeline(body, existing_contest=None):
    """
    Parse and validate the complete contest timeline:
    reg_start < reg_deadline <= lobby_open <= start_time < end_time <= results_publish
    """
    try:
        start_str = body.get('start_time')
        end_str = body.get('end_time')
        reg_deadline_str = body.get('registration_deadline')
        reg_start_str = body.get('registration_start_time')
        lobby_open_str = body.get('lobby_open_time')
        results_publish_str = body.get('results_publish_time')

        if not start_str or not end_str or not reg_deadline_str:
            return None, "Start time, end time, and registration cutoff are all required."

        start_time = parse_iso_to_utc(start_str)
        end_time = parse_iso_to_utc(end_str)
        reg_deadline = parse_iso_to_utc(reg_deadline_str)

        # Registration open time (default: now or created_at)
        if reg_start_str:
            reg_start = parse_iso_to_utc(reg_start_str)
        else:
            reg_start = existing_contest.registration_start_time if existing_contest and existing_contest.registration_start_time else datetime.utcnow()

        # Lobby / test link open time (default: 20 mins before start)
        if lobby_open_str:
            lobby_open = parse_iso_to_utc(lobby_open_str)
        else:
            lobby_open = start_time - timedelta(minutes=20)

        # Results & podium publish time (default: 5 mins after end)
        if results_publish_str:
            results_publish = parse_iso_to_utc(results_publish_str)
        else:
            results_publish = end_time + timedelta(minutes=5)

    except Exception as e:
        return None, f"Invalid date/time format: {e}"

    # Timeline Sequence Checks ("Follow the Check")
    if reg_start >= reg_deadline:
        return None, "Timeline Check Failed: Registration Open Time must be before Registration Cutoff Deadline."

    if reg_deadline > start_time:
        return None, "Timeline Check Failed: Registration Deadline must close on or before Exam Start Time."

    if lobby_open > start_time:
        return None, "Timeline Check Failed: Test Link / Waiting Lobby must open before or at Exam Start Time."

    if start_time >= end_time:
        return None, "Timeline Check Failed: Exam Start Time must be strictly before Exam End Time."

    if results_publish < end_time:
        return None, "Timeline Check Failed: Results & Podium Publish Time must be at or after Exam End Time."

    duration_minutes = int((end_time - start_time).total_seconds() // 60)
    if duration_minutes <= 0:
        return None, "Contest duration must be at least 1 minute."

    return {
        'registration_start_time': reg_start,
        'registration_deadline': reg_deadline,
        'lobby_open_time': lobby_open,
        'start_time': start_time,
        'end_time': end_time,
        'results_publish_time': results_publish,
        'duration_minutes': duration_minutes
    }, None

@admin_contests_bp.route('/available-datasets', methods=['GET'])
@admin_required
def get_available_datasets():
    """Return platform & custom datasets with their available tables for contest question design."""
    from app.models.dataset import Dataset

    builtin = [
        {
            'key': 'ch_ecommerce',
            'name': 'E-Commerce & Orders (Complex Multi-table)',
            'tables': ['ch_customers', 'ch_orders', 'ch_products'],
            'is_builtin': True
        },
        {
            'key': 'ch_hr',
            'name': 'HR & Payroll Analytics',
            'tables': ['ch_employees', 'ch_departments'],
            'is_builtin': True
        },
        {
            'key': 'library',
            'name': 'University Library Management',
            'tables': ['library_books', 'library_borrowings', 'library_members'],
            'is_builtin': True
        }
    ]

    custom = []
    try:
        user_datasets = Dataset.query.all()
        for d in user_datasets:
            table_names = [t.table_name for t in d.tables] if d.tables else []
            if table_names:
                custom.append({
                    'key': f"ds_{d.id}",
                    'name': f"Custom: {d.name}",
                    'tables': table_names,
                    'is_builtin': False
                })
    except Exception as e:
        print(f"[available-datasets] Warning: {e}")

    return jsonify({
        'success': True,
        'data': builtin + custom
    }), 200

@admin_contests_bp.route('', methods=['GET'])
@admin_required
def list_admin_contests():
    """List all contests with participant and submission metrics for admins."""
    ContestService.ensure_seeded()
    contests = Contest.query.order_by(Contest.start_time.desc()).all()
    results = []

    for c in contests:
        c_dict = c.to_dict(is_admin=True, include_questions=True)
        # Add admin metrics
        c_dict['attended_count'] = ContestRegistration.query.filter_by(contest_id=c.id, is_attended=True).count()
        c_dict['submissions_count'] = ContestSubmission.query.filter_by(contest_id=c.id).count()
        results.append(c_dict)

    return jsonify({
        'success': True,
        'data': results
    }), 200


@admin_contests_bp.route('', methods=['POST'])
@admin_required
def create_contest():
    """Create a new Weekly Sunday contest with scheduled questions & validated timeline."""
    body = request.get_json() or {}

    title = body.get('title', '').strip()
    if not title:
        return jsonify({'success': False, 'message': 'Contest title is required.'}), 400

    slug = body.get('slug') or title.lower().replace(' ', '-').replace('#', '').strip('-')
    base_slug = slug
    counter = 1
    while Contest.query.filter_by(slug=slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    timeline_data, err = parse_and_validate_timeline(body)
    if err:
        return jsonify({'success': False, 'message': err}), 400

    new_contest = Contest(
        title=title,
        slug=slug,
        description=body.get('description', ''),
        rules=body.get('rules', ''),
        banner_url=body.get('banner_url') or 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
        registration_start_time=timeline_data['registration_start_time'],
        registration_deadline=timeline_data['registration_deadline'],
        lobby_open_time=timeline_data['lobby_open_time'],
        start_time=timeline_data['start_time'],
        end_time=timeline_data['end_time'],
        results_publish_time=timeline_data['results_publish_time'],
        total_marks=int(body.get('total_marks', 100)),
        duration_minutes=timeline_data['duration_minutes'],
        status='upcoming',
        is_published=bool(body.get('is_published', True)),
        created_by=g.current_user.id
    )
    db.session.add(new_contest)
    db.session.flush()

    # Add questions if provided
    questions_data = body.get('questions', [])
    for idx, q_data in enumerate(questions_data):
        q_type = q_data.get('question_type', 'query')
        q = ContestQuestion(
            contest_id=new_contest.id,
            question_type=q_type,
            title=q_data.get('title', f"Question {idx + 1}"),
            description=q_data.get('description', ''),
            category=q_data.get('category', 'Technical SQL' if q_type == 'technical' else 'Query Problem'),
            difficulty=q_data.get('difficulty', 'intermediate'),
            dataset_name=q_data.get('dataset_name') if q_type == 'query' else None,
            target_table=q_data.get('target_table') if q_type == 'query' else None,
            starter_sql=q_data.get('starter_sql') if q_type == 'query' else None,
            solution_sql=q_data.get('solution_sql') if q_type == 'query' else None,
            option_a=q_data.get('option_a') if q_type == 'technical' else None,
            option_b=q_data.get('option_b') if q_type == 'technical' else None,
            option_c=q_data.get('option_c') if q_type == 'technical' else None,
            option_d=q_data.get('option_d') if q_type == 'technical' else None,
            correct_option=int(q_data.get('correct_option', 0)) if q_type == 'technical' and q_data.get('correct_option') is not None else None,
            explanation=q_data.get('explanation') if q_type == 'technical' else None,
            marks=int(q_data.get('marks', 5 if q_type == 'technical' else 25)),
            order_num=idx + 1
        )
        db.session.add(q)

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f"Contest '{new_contest.title}' created successfully!",
        'data': new_contest.to_dict(is_admin=True, include_questions=True)
    }), 201


@admin_contests_bp.route('/<int:contest_id>', methods=['PUT'])
@admin_required
def update_contest(contest_id: int):
    """Update contest details, timeline schedule, rules, or questions."""
    contest = Contest.query.get(contest_id)
    if not contest:
        return jsonify({'success': False, 'message': 'Contest not found.'}), 404

    body = request.get_json() or {}
    if 'title' in body:
        contest.title = body['title'].strip()
    if 'description' in body:
        contest.description = body['description']
    if 'rules' in body:
        contest.rules = body['rules']
    if 'banner_url' in body:
        contest.banner_url = body['banner_url']
    if 'total_marks' in body:
        contest.total_marks = int(body['total_marks'])
    if 'is_published' in body:
        contest.is_published = bool(body['is_published'])
    if 'status' in body:
        contest.status = body['status']

    # Update timings if provided
    if any(k in body for k in ['start_time', 'end_time', 'registration_deadline', 'registration_start_time', 'lobby_open_time', 'results_publish_time']):
        # Merge existing with body
        merged_body = {
            'start_time': body.get('start_time', contest.start_time.isoformat() if contest.start_time else None),
            'end_time': body.get('end_time', contest.end_time.isoformat() if contest.end_time else None),
            'registration_deadline': body.get('registration_deadline', contest.registration_deadline.isoformat() if contest.registration_deadline else None),
            'registration_start_time': body.get('registration_start_time', contest.registration_start_time.isoformat() if contest.registration_start_time else None),
            'lobby_open_time': body.get('lobby_open_time', contest.lobby_open_time.isoformat() if contest.lobby_open_time else None),
            'results_publish_time': body.get('results_publish_time', contest.results_publish_time.isoformat() if contest.results_publish_time else None),
        }
        timeline_data, err = parse_and_validate_timeline(merged_body, existing_contest=contest)
        if err:
            return jsonify({'success': False, 'message': err}), 400

        contest.registration_start_time = timeline_data['registration_start_time']
        contest.registration_deadline = timeline_data['registration_deadline']
        contest.lobby_open_time = timeline_data['lobby_open_time']
        contest.start_time = timeline_data['start_time']
        contest.end_time = timeline_data['end_time']
        contest.results_publish_time = timeline_data['results_publish_time']
        contest.duration_minutes = timeline_data['duration_minutes']

    # Questions update if provided
    if 'questions' in body:
        ContestQuestion.query.filter_by(contest_id=contest.id).delete()
        for idx, q_data in enumerate(body['questions']):
            q_type = q_data.get('question_type', 'query')
            q = ContestQuestion(
                contest_id=contest.id,
                question_type=q_type,
                title=q_data.get('title', f"Question {idx + 1}"),
                description=q_data.get('description', ''),
                category=q_data.get('category', 'Technical SQL' if q_type == 'technical' else 'Query Problem'),
                difficulty=q_data.get('difficulty', 'intermediate'),
                dataset_name=q_data.get('dataset_name') if q_type == 'query' else None,
                target_table=q_data.get('target_table') if q_type == 'query' else None,
                starter_sql=q_data.get('starter_sql') if q_type == 'query' else None,
                solution_sql=q_data.get('solution_sql') if q_type == 'query' else None,
                option_a=q_data.get('option_a') if q_type == 'technical' else None,
                option_b=q_data.get('option_b') if q_type == 'technical' else None,
                option_c=q_data.get('option_c') if q_type == 'technical' else None,
                option_d=q_data.get('option_d') if q_type == 'technical' else None,
                correct_option=int(q_data.get('correct_option', 0)) if q_type == 'technical' and q_data.get('correct_option') is not None else None,
                explanation=q_data.get('explanation') if q_type == 'technical' else None,
                marks=int(q_data.get('marks', 5 if q_type == 'technical' else 25)),
                order_num=idx + 1
            )
            db.session.add(q)

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f"Contest '{contest.title}' updated successfully!",
        'data': contest.to_dict(is_admin=True, include_questions=True)
    }), 200


@admin_contests_bp.route('/<int:contest_id>', methods=['DELETE'])
@admin_required
def delete_contest(contest_id: int):
    """Delete a contest and associated records."""
    contest = Contest.query.get(contest_id)
    if not contest:
        return jsonify({'success': False, 'message': 'Contest not found.'}), 404

    db.session.delete(contest)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f"Contest '{contest.title}' deleted successfully."
    }), 200


@admin_contests_bp.route('/<int:contest_id>/registrations', methods=['GET'])
@admin_required
def list_contest_registrations(contest_id: int):
    """List registered contestants for a contest with college & mobile details."""
    contest = Contest.query.get(contest_id)
    if not contest:
        return jsonify({'success': False, 'message': 'Contest not found.'}), 404

    regs = ContestRegistration.query.filter_by(contest_id=contest.id).order_by(ContestRegistration.registered_at.desc()).all()
    return jsonify({
        'success': True,
        'contest_title': contest.title,
        'total': len(regs),
        'data': [r.to_dict() for r in regs]
    }), 200


@admin_contests_bp.route('/<int:contest_id>/finalize', methods=['POST'])
@admin_required
def finalize_contest(contest_id: int):
    """Finalize ranks, distribute 150/100/75 XP to top 3, and issue ranker certificates."""
    res = ContestService.finalize_contest_leaderboard(contest_id)
    status_code = 200 if res.get('success') else 400
    return jsonify(res), status_code


@admin_contests_bp.route('/<int:contest_id>/send-reminders', methods=['POST'])
@admin_required
def send_contest_reminders(contest_id: int):
    """Manually trigger 20-minute pre-contest reminder email notifications."""
    res = ContestService.trigger_pre_contest_reminders(contest_id)
    status_code = 200 if res.get('success') else 400
    return jsonify(res), status_code
