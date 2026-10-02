import re
import time
import uuid
from datetime import datetime, timedelta
from sqlalchemy import text, inspect
from app.extensions import db
from app.models.contest import (
    Contest,
    ContestRegistration,
    ContestQuestion,
    ContestSubmission,
    ContestLeaderboard
)
from app.models.certificate import Certificate
from app.models.user import User
from app.services.email_service import EmailService
from app.utils.security import check_destructive_sql, strip_sql_comments

# Helper function to normalize SQL dataset comparisons
def normalize_val(val):
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return round(float(val), 4)
    return str(val).strip()

class ContestService:
    @staticmethod
    def ensure_seeded():
        """Seed default weekly Sunday contest and questions if none exist."""
        try:
            db.create_all()
            from app.services.challenge_service import ChallengeService
            ChallengeService.ensure_seeded()

            if Contest.query.count() == 0:
                now = datetime.utcnow()
                # Compute next upcoming Sunday at 10:00 AM UTC
                days_ahead = (6 - now.weekday()) % 7  # 6 is Sunday
                if days_ahead == 0 and now.hour >= 12:
                    days_ahead = 7
                
                next_sunday = (now + timedelta(days=days_ahead)).replace(hour=10, minute=0, second=0, microsecond=0)
                sunday_end = next_sunday + timedelta(hours=2)
                saturday_deadline = (next_sunday - timedelta(days=1)).replace(hour=23, minute=59, second=59, microsecond=0)

                reg_start = now - timedelta(days=2)
                lobby_time = next_sunday - timedelta(minutes=20)
                results_time = sunday_end + timedelta(minutes=5)

                # Seed 1: Upcoming Weekly Sunday Contest
                upcoming_contest = Contest(
                    title="Sunday National SQL Championship - Edition #1",
                    slug="sunday-national-sql-championship-ed1",
                    description="The premier weekly SQL contest on our platform! Test your analytical database engineering skills in real-time under competitive exam conditions. Top 3 performers receive prestigious certificates and exclusive platform XP!",
                    rules="1. Each problem requires a valid SQL query against the provided schema.\n2. Ranking is determined by Total Marks, with ties broken by fastest submission timestamp (down to the second).\n3. Top 3 Rankers earn exclusive Gold, Silver, and Bronze Certificates plus +150 XP, +100 XP, and +75 XP.\n4. Registration strictly closes on Saturday at 11:59 PM.\n5. Academic integrity: all queries must be written independently.",
                    banner_url="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
                    registration_start_time=reg_start,
                    registration_deadline=saturday_deadline,
                    lobby_open_time=lobby_time,
                    start_time=next_sunday,
                    end_time=sunday_end,
                    results_publish_time=results_time,
                    total_marks=100,
                    duration_minutes=120,
                    status='upcoming',
                    is_published=True
                )
                db.session.add(upcoming_contest)
                db.session.flush()

                # Add 3 Contest Questions for Edition #1
                q1 = ContestQuestion(
                    contest_id=upcoming_contest.id,
                    title="High-Value Customers in Germany",
                    description="Identify all customers located in 'Germany' with a credit limit strictly greater than $5,000. Output their `full_name`, `city`, and `credit_limit`, ordered by `credit_limit` descending.",
                    difficulty="beginner",
                    dataset_name="ch_ecommerce",
                    target_table="ch_customers",
                    starter_sql="-- Problem 1: High-Value Customers in Germany\nSELECT full_name, city, credit_limit\nFROM ch_customers\nWHERE country = 'Germany'\nORDER BY credit_limit DESC;",
                    solution_sql="SELECT full_name, city, credit_limit FROM ch_customers WHERE country = 'Germany' AND credit_limit > 5000.00 ORDER BY credit_limit DESC;",
                    marks=25,
                    order_num=1
                )
                q2 = ContestQuestion(
                    contest_id=upcoming_contest.id,
                    title="Department Headcount and Salary Analytics",
                    description="Calculate the total headcount, total salary expenditure, and average salary for each department. Output `dept_id`, `COUNT(*) AS employee_count`, `SUM(salary) AS total_payroll`, and `ROUND(AVG(salary), 2) AS avg_salary`. Order results by `avg_salary` in descending order.",
                    difficulty="intermediate",
                    dataset_name="ch_hr",
                    target_table="ch_employees",
                    starter_sql="-- Problem 2: Department Headcount and Salary Analytics\nSELECT dept_id, COUNT(*) AS employee_count, SUM(salary) AS total_payroll, ROUND(AVG(salary), 2) AS avg_salary\nFROM ch_employees\nGROUP BY dept_id\nORDER BY avg_salary DESC;",
                    solution_sql="SELECT dept_id, COUNT(*) AS employee_count, SUM(salary) AS total_payroll, ROUND(AVG(salary), 2) AS avg_salary FROM ch_employees GROUP BY dept_id ORDER BY avg_salary DESC;",
                    marks=35,
                    order_num=2
                )
                q3 = ContestQuestion(
                    contest_id=upcoming_contest.id,
                    title="Top Earner per Department (Window Function)",
                    description="Find the highest-paid employee in each department using window functions (`DENSE_RANK()`). Output `full_name`, `dept_id`, `salary`, and `job_title`. Order by `dept_id` ascending, then `salary` descending.",
                    difficulty="advanced",
                    dataset_name="ch_hr",
                    target_table="ch_employees",
                    starter_sql="-- Problem 3: Top Earner per Department\nWITH Ranked AS (\n    SELECT full_name, dept_id, salary, job_title,\n           DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) as rnk\n    FROM ch_employees\n)\nSELECT full_name, dept_id, salary, job_title\nFROM Ranked\nWHERE rnk = 1\nORDER BY dept_id ASC, salary DESC;",
                    solution_sql="WITH RankedEmployees AS (\n    SELECT full_name, dept_id, salary, job_title,\n           DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS sal_rank\n    FROM ch_employees\n)\nSELECT full_name, dept_id, salary, job_title\nFROM RankedEmployees\nWHERE sal_rank = 1\nORDER BY dept_id ASC, salary DESC;",
                    marks=40,
                    order_num=3
                )
                db.session.add_all([q1, q2, q3])

                # Seed 2: Past Weekly Sunday Contest with Leaderboard & Celebration Podium
                past_sunday = next_sunday - timedelta(days=7)
                past_contest = Contest(
                    title="Sunday National SQL Championship - Edition #0 (Inaugural)",
                    slug="sunday-national-sql-championship-ed0",
                    description="The inaugural edition of our weekly Sunday competitive SQL challenge. Congratulations to our Top 3 Rankers!",
                    rules="1. Standard platform contest rules.\n2. Top 3 Rankers awarded Gold, Silver, and Bronze Certificates + XP.",
                    banner_url="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
                    start_time=past_sunday,
                    end_time=past_sunday + timedelta(hours=2),
                    registration_deadline=past_sunday - timedelta(days=1),
                    total_marks=100,
                    duration_minutes=120,
                    status='completed',
                    is_published=True
                )
                db.session.add(past_contest)
                db.session.flush()

                # Add questions for past contest
                pq1 = ContestQuestion(
                    contest_id=past_contest.id,
                    title="Customer Spend Aggregation",
                    description="Calculate total spend per customer.",
                    difficulty="intermediate",
                    dataset_name="ch_ecommerce",
                    target_table="ch_orders",
                    starter_sql="SELECT customer_id, SUM(total_amount) FROM ch_orders GROUP BY customer_id;",
                    solution_sql="SELECT customer_id, SUM(total_amount) FROM ch_orders GROUP BY customer_id;",
                    marks=50,
                    order_num=1
                )
                pq2 = ContestQuestion(
                    contest_id=past_contest.id,
                    title="Employee Hierarchy & Managers",
                    description="Self join employees and managers.",
                    difficulty="advanced",
                    dataset_name="ch_hr",
                    target_table="ch_employees",
                    starter_sql="SELECT * FROM ch_employees;",
                    solution_sql="SELECT e.full_name, m.full_name AS manager_name FROM ch_employees e JOIN ch_employees m ON e.manager_id = m.emp_id;",
                    marks=50,
                    order_num=2
                )
                db.session.add_all([pq1, pq2])
                db.session.flush()

                # Seed sample top 3 contestants for past contest if users exist or dummy
                admin_user = User.query.filter_by(is_admin=True).first() or User.query.first()
                if admin_user:
                    # Registration for admin
                    reg1 = ContestRegistration(
                        contest_id=past_contest.id,
                        user_id=admin_user.id,
                        full_name=admin_user.full_name or "Aarav Sharma",
                        email=admin_user.email,
                        mobile_number=admin_user.mobile_number or "9876543210",
                        college_name=admin_user.college_name or "Indian Institute of Technology, Bombay",
                        degree_branch="B.Tech Computer Science",
                        email_notification_opt_in=True,
                        reminder_email_sent=True,
                        is_attended=True
                    )
                    db.session.add(reg1)
                    db.session.flush()

                    # Issue Rank 1 Certificate
                    c1_code = f"CERT-CONTEST-{uuid.uuid4().hex[:8].upper()}"
                    cert1 = Certificate(
                        user_id=admin_user.id,
                        contest_id=past_contest.id,
                        certificate_code=c1_code,
                        track_name=f"National SQL Championship - {past_contest.title}",
                        level="Champion (Rank 1)",
                        certificate_type="contest_ranker",
                        contest_rank=1,
                        college_name=reg1.college_name,
                        score_percent=100,
                        passed=True,
                        issued_at=past_sunday + timedelta(hours=2, minutes=5)
                    )
                    db.session.add(cert1)
                    db.session.flush()

                    # Add to leaderboard
                    lb1 = ContestLeaderboard(
                        contest_id=past_contest.id,
                        user_id=admin_user.id,
                        registration_id=reg1.id,
                        total_marks=100,
                        total_time_seconds=2742, # 45m 42s
                        last_submission_time=past_sunday + timedelta(minutes=45, seconds=42),
                        rank=1,
                        xp_awarded=150,
                        certificate_id=cert1.id,
                        is_ranker=True
                    )
                    db.session.add(lb1)

                db.session.commit()
                print("[ContestService] Initial seed complete.")
        except Exception as e:
            db.session.rollback()
            print(f"[ContestService] Seed warning: {e}")

    @staticmethod
    def list_contests(user_id=None):
        """List upcoming, active, and past contests."""
        ContestService.ensure_seeded()
        contests = Contest.query.filter_by(is_published=True).order_by(Contest.start_time.asc()).all()

        upcoming = []
        active = []
        completed = []

        for c in contests:
            c_dict = c.to_dict(user_id=user_id)
            dyn_status = c_dict['status']
            if dyn_status == 'active':
                active.append(c_dict)
            elif dyn_status == 'upcoming':
                upcoming.append(c_dict)
            else:
                completed.append(c_dict)

        # Sort completed newest first
        completed.sort(key=lambda x: x['start_time'] or '', reverse=True)

        return {
            'upcoming': upcoming,
            'active': active,
            'completed': completed,
            'server_time': datetime.utcnow().isoformat()
        }

    @staticmethod
    def get_contest_detail(contest_id_or_slug, user_id=None, is_admin=False):
        """Get single contest metadata, rules, and user registration state."""
        ContestService.ensure_seeded()
        contest = None
        if str(contest_id_or_slug).isdigit():
            contest = Contest.query.get(int(contest_id_or_slug))
        if not contest:
            contest = Contest.query.filter_by(slug=str(contest_id_or_slug)).first()
        if not contest:
            return None

        data = contest.to_dict(user_id=user_id, include_questions=is_admin, is_admin=is_admin)
        data['server_time'] = datetime.utcnow().isoformat()
        return data

    @staticmethod
    def get_user_profile_for_registration(user_id: int):
        """Retrieve pre-fill data for registration: full_name, email, mobile, college."""
        if not user_id:
            return None
        user = User.query.get(user_id)
        if not user:
            return None

        # Check last registration if available to populate college/mobile if not on user model
        last_reg = ContestRegistration.query.filter_by(user_id=user_id).order_by(ContestRegistration.id.desc()).first()

        mobile = user.mobile_number or (last_reg.mobile_number if last_reg else '')
        college = user.college_name or (last_reg.college_name if last_reg else '')
        degree = user.degree_branch or (last_reg.degree_branch if last_reg else '')

        has_previous_profile = bool(mobile and college)

        return {
            'full_name': user.full_name,
            'email': user.email,
            'mobile_number': mobile,
            'college_name': college,
            'degree_branch': degree,
            'has_previous_profile': has_previous_profile
        }

    @staticmethod
    def register_user(contest_id: int, user_id: int, reg_data: dict):
        """
        Register a user for an upcoming contest.
        Validates the Saturday 23:59:59 deadline, saves details to profile,
        and sends registration confirmation email.
        """
        ContestService.ensure_seeded()
        contest = Contest.query.get(contest_id)
        if not contest:
            return {'success': False, 'message': 'Contest not found.'}

        user = User.query.get(user_id)
        if not user:
            return {'success': False, 'message': 'User not found.'}

        # 1. Registration Window & Deadline Validation
        now = datetime.utcnow()
        if contest.registration_start_time and now < contest.registration_start_time:
            return {
                'success': False,
                'message': f"Registration has not opened yet. It opens on {contest.registration_start_time.strftime('%A, %B %d, %Y at %I:%M %p UTC')}."
            }

        if contest.registration_deadline and now > contest.registration_deadline:
            return {
                'success': False,
                'message': f"Registration closed on {contest.registration_deadline.strftime('%A, %B %d, %Y at %I:%M %p UTC')}. Registrations are not accepted after the deadline."
            }

        # 2. Check if already registered
        existing = ContestRegistration.query.filter_by(contest_id=contest.id, user_id=user.id).first()
        if existing:
            return {
                'success': True,
                'message': 'You are already registered for this contest!',
                'registration': existing.to_dict()
            }

        # 3. Extract & Validate Fields
        full_name = (reg_data.get('full_name') or user.full_name or '').strip()
        email = (reg_data.get('email') or user.email or '').strip()
        mobile_number = (reg_data.get('mobile_number') or user.mobile_number or '').strip()
        college_name = (reg_data.get('college_name') or user.college_name or '').strip()
        degree_branch = (reg_data.get('degree_branch') or user.degree_branch or '').strip()
        email_opt_in = bool(reg_data.get('email_notification_opt_in', True))

        if not mobile_number:
            return {'success': False, 'message': 'Mobile number is required for contest registration and certificate issuance.'}
        if not college_name:
            return {'success': False, 'message': 'College or Organization name is required for certificate issuance.'}

        # Update User model with permanent profile details for 1-Click Direct Join next time
        user.mobile_number = mobile_number
        user.college_name = college_name
        if degree_branch:
            user.degree_branch = degree_branch

        new_reg = ContestRegistration(
            contest_id=contest.id,
            user_id=user.id,
            full_name=full_name,
            email=email,
            mobile_number=mobile_number,
            college_name=college_name,
            degree_branch=degree_branch,
            email_notification_opt_in=email_opt_in
        )
        db.session.add(new_reg)
        db.session.commit()

        # Send confirmation email
        ContestService._send_registration_confirmation_email(new_reg, contest)

        return {
            'success': True,
            'message': f"Registration confirmed for '{contest.title}'! A confirmation email with contest rules and timing has been sent.",
            'registration': new_reg.to_dict()
        }

    @staticmethod
    def _send_registration_confirmation_email(registration: ContestRegistration, contest: Contest):
        """Send registration confirmation email via EmailService (SMTP with local outbox fallback)."""
        start_str = contest.start_time.strftime("%A, %B %d, %Y at %I:%M %p UTC") if contest.start_time else "Sunday 10:00 AM UTC"
        end_str = contest.end_time.strftime("%I:%M %p UTC") if contest.end_time else "12:00 PM UTC"

        print(f"\n================ [EMAIL NOTIFICATION] ================")
        print(f"TO: {registration.email} ({registration.full_name})")
        print(f"SUBJECT: Registration Confirmed: {contest.title}")
        print(f"Schedule: {start_str} to {end_str}")
        print(f"======================================================\n")

        try:
            EmailService.send_contest_registration_confirmation(registration, contest)
        except Exception as e:
            print(f"[CONTEST SERVICE] Error invoking EmailService: {e}")

    @staticmethod
    def trigger_pre_contest_reminders(contest_id: int):
        """Send 20-minute reminder email to registered users via EmailService."""
        contest = Contest.query.get(contest_id)
        if not contest:
            return {'success': False, 'message': 'Contest not found.'}

        regs = ContestRegistration.query.filter_by(
            contest_id=contest.id,
            email_notification_opt_in=True,
            reminder_email_sent=False
        ).all()

        sent_count = 0
        for r in regs:
            try:
                EmailService.send_contest_20min_reminder(r, contest)
            except Exception as e:
                print(f"[REMINDER ERROR] Failed to send reminder to {r.email}: {e}")
            r.reminder_email_sent = True
            sent_count += 1

        db.session.commit()
        return {
            'success': True,
            'message': f"Sent 20-minute reminder notifications to {sent_count} registered participants.",
            'sent_count': sent_count
        }

    @staticmethod
    def get_contest_exam_room(contest_id: int, user_id: int):
        """
        Enter live contest exam room.
        Verifies registration and contest active/evaluating status.
        """
        ContestService.ensure_seeded()
        contest = Contest.query.get(contest_id)
        if not contest:
            return {'success': False, 'message': 'Contest not found.'}

        user = db.session.get(User, user_id) if user_id else None
        reg = ContestRegistration.query.filter_by(contest_id=contest.id, user_id=user_id).first()
        if not reg:
            if user and user.is_admin:
                # Auto-enroll admin so they can inspect/test the exam arena
                reg = ContestRegistration(
                    contest_id=contest.id,
                    user_id=user.id,
                    full_name=user.full_name or 'System Administrator',
                    email=user.email,
                    mobile_number=user.mobile_number or '9999999999',
                    college_name=user.college_name or 'Platform Administration',
                    degree_branch=user.degree_branch or 'Staff',
                    email_notification_opt_in=False,
                    is_attended=True
                )
                db.session.add(reg)
                db.session.commit()
            else:
                return {'success': False, 'message': 'You must register for this contest before entering the exam arena.'}

        # Mark attended
        reg.is_attended = True
        db.session.commit()

        # Check timing milestones
        now = datetime.utcnow()
        lobby_time = contest.lobby_open_time or (contest.start_time - timedelta(minutes=20) if contest.start_time else now)
        results_time = contest.results_publish_time or (contest.end_time + timedelta(minutes=5) if contest.end_time else now)

        # 1. Test Link / Waiting Room Not Open Yet
        if now < lobby_time:
            time_until_lobby = int((lobby_time - now).total_seconds())
            return {
                'success': True,
                'status': 'link_not_open',
                'contest': contest.to_dict(user_id=user_id),
                'seconds_until_lobby': time_until_lobby,
                'lobby_open_time': lobby_time.isoformat(),
                'rules': contest.rules,
                'message': f"The contest test link / waiting lobby will open on {lobby_time.strftime('%A, %B %d at %I:%M %p UTC')} (in {time_until_lobby // 3600}h {(time_until_lobby % 3600) // 60}m)."
            }

        # 2. Waiting Lobby Open (Pre-Exam Room with Rules Check)
        if now < contest.start_time:
            time_until_start = int((contest.start_time - now).total_seconds())
            return {
                'success': True,
                'status': 'waiting_lobby',
                'contest': contest.to_dict(user_id=user_id),
                'seconds_until_start': time_until_start,
                'rules': contest.rules,
                'message': f"The contest waiting lobby is open. The exam starts in {time_until_start // 60}m {time_until_start % 60}s. Please review and accept the contest rules."
            }

        # 3. Post-Exam Evaluation Buffer (Before Leaderboard/Podium is Published)
        if now > contest.end_time and now < results_time:
            time_until_results = int((results_time - now).total_seconds())
            return {
                'success': True,
                'status': 'evaluating',
                'contest': contest.to_dict(user_id=user_id),
                'seconds_until_results': time_until_results,
                'results_publish_time': results_time.isoformat(),
                'message': f"The exam has concluded! Submissions are under final evaluation. Official ranks, XP, and certificates will be revealed in {time_until_results // 60}m {time_until_results % 60}s."
            }

        # Contest is active or completed
        time_remaining = max(0, int((contest.end_time - now).total_seconds()))

        # Fetch questions with schema & sample_rows for query questions
        questions = []
        for q in contest.questions:
            q_dict = q.to_dict(include_solution=False)
            if (q.question_type or 'query') == 'query' and q.target_table:
                # 1. Fetch table schema (column names and types)
                schema_list = []
                try:
                    inspector = inspect(db.engine)
                    cols = inspector.get_columns(q.target_table)
                    schema_list = [
                        {
                            'name': c['name'],
                            'column_name': c['name'],
                            'type': str(c['type']),
                            'data_type': str(c['type']),
                            'nullable': c.get('nullable', True)
                        }
                        for c in cols
                    ]
                except Exception:
                    pass

                if not schema_list:
                    try:
                        col_stmt = text(f"SHOW COLUMNS FROM `{q.target_table}`")
                        col_res = db.session.execute(col_stmt)
                        schema_list = [
                            {
                                'name': r[0],
                                'column_name': r[0],
                                'type': str(r[1]),
                                'data_type': str(r[1]),
                                'nullable': str(r[2]) if len(r) > 2 else 'YES',
                                'key': str(r[3]) if len(r) > 3 else ''
                            }
                            for r in col_res
                        ]
                    except Exception:
                        schema_list = []

                q_dict['schema'] = schema_list

                # 2. Fetch at least 5 sample row values for candidate analysis
                try:
                    sample_stmt = text(f"SELECT * FROM `{q.target_table}` LIMIT 5")
                    sample_res = db.session.execute(sample_stmt)
                    q_dict['sample_columns'] = list(sample_res.keys())
                    q_dict['sample_rows'] = [dict(r) for r in sample_res.mappings()]
                except Exception as ex:
                    q_dict['sample_columns'] = []
                    q_dict['sample_rows'] = []
            questions.append(q_dict)

        # Fetch user's previous submissions for this contest
        submissions = ContestSubmission.query.filter_by(contest_id=contest.id, user_id=user_id).order_by(ContestSubmission.submitted_at.desc()).all()
        solved_question_ids = {s.question_id for s in submissions if s.is_correct}

        # Build user_answers map for quick UI state restore
        user_answers = {}
        for s in submissions:
            if s.question_id not in user_answers:
                user_answers[s.question_id] = {
                    'selected_option': s.selected_option,
                    'submitted_sql': s.submitted_sql,
                    'is_correct': s.is_correct,
                    'marks_awarded': s.marks_awarded,
                    'submitted_at': s.submitted_at.isoformat() if s.submitted_at else None
                }

        # Calculate current marks
        earned_marks = sum(q['marks'] for q in questions if q['id'] in solved_question_ids)

        return {
            'success': True,
            'status': 'active' if time_remaining > 0 else 'ended',
            'contest': contest.to_dict(user_id=user_id),
            'questions': questions,
            'time_remaining_seconds': time_remaining,
            'server_time': now.isoformat(),
            'solved_question_ids': list(solved_question_ids),
            'user_answers': user_answers,
            'earned_marks': earned_marks,
            'recent_submissions': [s.to_dict() for s in submissions[:15]],
            'is_attended': reg.is_attended if reg else False,
            'is_completed': reg.is_completed if reg else False
        }

    @staticmethod
    def submit_contest_solution(contest_id: int, question_id: int, user_id: int, user_sql: str = '', selected_option: int = None):
        """
        Submit a contest question solution (Coding Query or Technical MCQ).
        Records exact timestamp with second-level accuracy, verifies against solution,
        and saves submission score.
        """
        ContestService.ensure_seeded()
        contest = Contest.query.get(contest_id)
        question = ContestQuestion.query.filter_by(id=question_id, contest_id=contest_id).first()

        if not contest or not question:
            return {'success': False, 'message': 'Contest or Question not found.'}

        user = db.session.get(User, user_id) if user_id else None
        reg = ContestRegistration.query.filter_by(contest_id=contest.id, user_id=user_id).first()
        if not reg:
            if user and user.is_admin:
                reg = ContestRegistration(
                    contest_id=contest.id,
                    user_id=user.id,
                    full_name=user.full_name or 'System Administrator',
                    email=user.email,
                    mobile_number=user.mobile_number or '9999999999',
                    college_name=user.college_name or 'Platform Administration',
                    degree_branch=user.degree_branch or 'Staff',
                    email_notification_opt_in=False,
                    is_attended=True
                )
                db.session.add(reg)
                db.session.commit()
            else:
                return {'success': False, 'message': 'User is not registered for this contest.'}

        now = datetime.utcnow()
        if now < contest.start_time:
            return {'success': False, 'message': 'Contest has not started yet.'}
        if now > (contest.end_time + timedelta(seconds=30)): # 30s grace period for in-flight requests
            return {'success': False, 'message': 'Contest time has expired. Submissions are no longer accepted.'}

        q_type = question.question_type or 'query'

        # ============================================================
        # A. TECHNICAL MCQ QUESTION EVALUATION
        # ============================================================
        if q_type == 'technical':
            # Check if user already submitted and locked their answer for this question
            existing_sub = ContestSubmission.query.filter_by(
                contest_id=contest.id,
                question_id=question.id,
                user_id=user_id
            ).first()
            if existing_sub:
                return {
                    'success': False,
                    'message': 'Your answer for this question has already been submitted and locked.'
                }

            if selected_option is None:
                return {'success': False, 'message': 'Please select an option to submit.'}
            try:
                sel_opt = int(selected_option)
            except Exception:
                return {'success': False, 'message': 'Invalid option format.'}

            passed = (question.correct_option is not None and sel_opt == question.correct_option)
            marks_awarded = question.marks if passed else 0

            sub = ContestSubmission(
                contest_id=contest.id,
                question_id=question.id,
                user_id=user_id,
                submitted_sql=f"OPTION_{sel_opt}",
                selected_option=sel_opt,
                is_correct=passed,
                marks_awarded=marks_awarded,
                execution_time_ms=1.0,
                submitted_at=now
            )
            db.session.add(sub)
            db.session.commit()

            return {
                'success': True,
                'passed': passed,
                'question_type': 'technical',
                'marks_awarded': marks_awarded,
                'selected_option': sel_opt,
                'submitted_at': now.strftime('%I:%M:%S %p'),
                'message': f"Answer recorded! {'Correct (+%d Marks)' % marks_awarded if passed else 'Incorrect (0 Marks)'}"
            }

        # ============================================================
        # B. CODING QUERY QUESTION EVALUATION
        # ============================================================
        clean_sql = (user_sql or '').strip()
        if not clean_sql:
            return {'success': False, 'message': 'SQL query cannot be empty.'}

        # 1. Safety check
        is_safe, sec_err = check_destructive_sql(clean_sql)
        if not is_safe:
            return {'success': False, 'message': sec_err, 'error': sec_err}

        exec_user_sql = strip_sql_comments(clean_sql).strip().rstrip(';').strip()
        if not exec_user_sql:
            return {'success': False, 'message': 'Query contains no executable statements.'}

        # 2. Execute user query
        start_exec = time.perf_counter()
        try:
            user_res = db.session.execute(text(exec_user_sql))
            exec_ms = round((time.perf_counter() - start_exec) * 1000, 2)
            if not user_res.returns_rows:
                return {
                    'success': True,
                    'passed': False,
                    'error': 'Query did not return any rows. Query must be a SELECT statement.',
                    'execution_time_ms': exec_ms
                }
            user_cols = [c.lower() for c in list(user_res.keys())]
            user_rows = [dict(r) for r in user_res.mappings()]
        except Exception as e:
            return {
                'success': True,
                'passed': False,
                'error': f"SQL Syntax Error: {str(e)}",
                'execution_time_ms': 0.0
            }

        # 3. Execute canonical solution
        try:
            sol_stmt = strip_sql_comments(question.solution_sql).strip().rstrip(';')
            sol_res = db.session.execute(text(sol_stmt))
            expected_cols = [c.lower() for c in list(sol_res.keys())]
            expected_rows = [dict(r) for r in sol_res.mappings()]
        except Exception as e:
            return {'success': False, 'message': f"Internal solution execution error: {e}"}

        # 4. Compare dataset matrices
        passed = True
        diff_reason = None

        if len(user_rows) != len(expected_rows):
            passed = False
            diff_reason = f"Row count mismatch: Expected {len(expected_rows)} rows, but your query returned {len(user_rows)} rows."
        elif len(user_cols) != len(expected_cols):
            passed = False
            diff_reason = f"Column count mismatch: Expected {len(expected_cols)} columns, but got {len(user_cols)} columns."
        else:
            norm_user = [[normalize_val(v) for v in r.values()] for r in user_rows]
            norm_expected = [[normalize_val(v) for v in r.values()] for r in expected_rows]

            has_order_by = 'order by' in question.solution_sql.lower()
            if not has_order_by:
                norm_user = sorted(norm_user, key=lambda x: str(x))
                norm_expected = sorted(norm_expected, key=lambda x: str(x))

            for idx, (u_row, e_row) in enumerate(zip(norm_user, norm_expected)):
                if u_row != e_row:
                    passed = False
                    diff_reason = f"Row {idx + 1} values do not match expected output."
                    break

        marks_awarded = question.marks if passed else 0

        # 5. Save submission with exact second-precision timestamp
        submission = ContestSubmission(
            contest_id=contest.id,
            question_id=question.id,
            user_id=user_id,
            submitted_sql=clean_sql,
            is_correct=passed,
            marks_awarded=marks_awarded,
            execution_time_ms=exec_ms,
            submitted_at=now
        )
        db.session.add(submission)
        db.session.commit()

        return {
            'success': True,
            'passed': passed,
            'marks_awarded': marks_awarded,
            'question_marks': question.marks,
            'execution_time_ms': exec_ms,
            'user_columns': user_cols,
            'user_rows': user_rows[:30],
            'user_row_count': len(user_rows),
            'diff_reason': diff_reason,
            'submitted_at': now.strftime("%Y-%m-%d %H:%M:%S")
        }

    @staticmethod
    def run_test_query(contest_id: int, question_id: int, user_id: int, user_sql: str = ''):
        """
        Execute candidate's manual SQL query to preview results in real time without grading,
        scoring, or recording an official submission.
        """
        ContestService.ensure_seeded()
        contest = Contest.query.get(contest_id)
        question = ContestQuestion.query.filter_by(id=question_id, contest_id=contest_id).first()

        if not contest or not question:
            return {'success': False, 'message': 'Contest or Question not found.'}

        clean_sql = (user_sql or '').strip()
        if not clean_sql:
            return {'success': False, 'message': 'SQL query cannot be empty.'}

        is_safe, sec_err = check_destructive_sql(clean_sql)
        if not is_safe:
            return {'success': False, 'message': sec_err, 'error': sec_err}

        exec_user_sql = strip_sql_comments(clean_sql).strip().rstrip(';').strip()
        if not exec_user_sql:
            return {'success': False, 'message': 'Query contains no executable statements.'}

        start_exec = time.perf_counter()
        try:
            user_res = db.session.execute(text(exec_user_sql))
            exec_ms = round((time.perf_counter() - start_exec) * 1000, 2)
            if not user_res.returns_rows:
                return {
                    'success': True,
                    'is_error': True,
                    'error': 'Query did not return any rows. Query must be a SELECT statement.',
                    'execution_time_ms': exec_ms
                }
            user_cols = list(user_res.keys())
            user_rows = [dict(r) for r in user_res.mappings()]

            serialized_rows = []
            for r in user_rows[:50]:  # Limit preview to 50 rows
                serialized_row = {}
                for k, v in r.items():
                    if hasattr(v, 'isoformat'):
                        serialized_row[k] = v.isoformat()
                    elif hasattr(v, '__float__'):
                        serialized_row[k] = float(v)
                    else:
                        serialized_row[k] = v
                serialized_rows.append(serialized_row)

            return {
                'success': True,
                'is_error': False,
                'columns': user_cols,
                'rows': serialized_rows,
                'row_count': len(user_rows),
                'execution_time_ms': exec_ms
            }
        except Exception as e:
            return {
                'success': True,
                'is_error': True,
                'error': f"SQL Syntax Error: {str(e)}",
                'execution_time_ms': 0.0
            }

    @staticmethod
    def finish_contest_attempt(contest_id: int, user_id: int):
        """
        Record that user has completed / submitted their contest attempt.
        """
        contest = Contest.query.get(contest_id)
        if not contest:
            return {'success': False, 'message': 'Contest not found.'}

        reg = ContestRegistration.query.filter_by(contest_id=contest_id, user_id=user_id).first()
        if not reg:
            return {'success': False, 'message': 'User registration not found.'}

        reg.is_attended = True
        reg.is_completed = True
        db.session.commit()

        submissions = ContestSubmission.query.filter_by(contest_id=contest_id, user_id=user_id).all()
        solved_ids = {s.question_id for s in submissions if s.is_correct}

        questions = ContestQuestion.query.filter_by(contest_id=contest_id).all()
        earned_marks = sum(q.marks for q in questions if q.id in solved_ids)
        total_marks = sum(q.marks for q in questions) if questions else (contest.total_marks or 0)

        now = datetime.utcnow()
        return {
            'success': True,
            'message': 'Thank you! Your contest examination has been successfully submitted.',
            'contest_title': contest.title,
            'earned_marks': earned_marks,
            'total_marks': total_marks,
            'solved_questions': len(solved_ids),
            'total_questions': len(questions),
            'submitted_at': now.strftime("%Y-%m-%d %H:%M:%S")
        }

    @staticmethod
    def finalize_contest_leaderboard(contest_id: int):
        """
        Calculate final standings, break ties down to the exact second,
        assign ranks, celebrate top 3 rankers with XP and exclusive certificates.
        Rank 1: +150 XP
        Rank 2: +100 XP
        Rank 3: +75 XP
        """
        ContestService.ensure_seeded()
        contest = Contest.query.get(contest_id)
        if not contest:
            return {'success': False, 'message': 'Contest not found.'}

        registrations = ContestRegistration.query.filter_by(contest_id=contest.id).all()
        questions = ContestQuestion.query.filter_by(contest_id=contest.id).all()
        questions_dict = {q.id: q.marks for q in questions}

        candidate_scores = []

        for reg in registrations:
            subs = ContestSubmission.query.filter_by(contest_id=contest.id, user_id=reg.user_id).order_by(ContestSubmission.submitted_at.asc()).all()
            
            # Find max marks obtained per question
            best_marks_per_q = {}
            last_correct_time = contest.start_time

            for s in subs:
                if s.is_correct:
                    q_marks = questions_dict.get(s.question_id, 0)
                    best_marks_per_q[s.question_id] = q_marks
                    if s.submitted_at > last_correct_time:
                        last_correct_time = s.submitted_at

            total_marks = sum(best_marks_per_q.values())
            total_time_seconds = max(0, int((last_correct_time - contest.start_time).total_seconds()))

            candidate_scores.append({
                'user_id': reg.user_id,
                'registration_id': reg.id,
                'full_name': reg.full_name,
                'college_name': reg.college_name,
                'total_marks': total_marks,
                'total_time_seconds': total_time_seconds,
                'last_submission_time': last_correct_time if total_marks > 0 else None
            })

        # Tie-breaker sorting:
        # 1. Total Marks DESC (highest score first)
        # 2. Total Time Seconds ASC (fastest completion time first)
        # 3. Last Submission Time ASC
        candidate_scores.sort(
            key=lambda x: (-x['total_marks'], x['total_time_seconds'], x['last_submission_time'] or datetime.max)
        )

        # Clear existing leaderboard entries for clean recalculation
        ContestLeaderboard.query.filter_by(contest_id=contest.id).delete()
        db.session.flush()

        rank_pos = 1
        top_rankers = []

        for item in candidate_scores:
            is_ranker = (rank_pos <= 3 and item['total_marks'] > 0)
            xp_reward = 0
            cert_id = None

            if is_ranker:
                if rank_pos == 1:
                    xp_reward = 150
                    rank_label = "Champion (Rank 1)"
                elif rank_pos == 2:
                    xp_reward = 100
                    rank_label = "Runner Up (Rank 2)"
                else:
                    xp_reward = 75
                    rank_label = "Second Runner Up (Rank 3)"

                # Credit XP directly to user profile
                usr = User.query.get(item['user_id'])
                if usr:
                    usr.contest_xp = (usr.contest_xp or 0) + xp_reward

                # Generate Exclusive Ranker Certificate
                c_code = f"CERT-CONTEST-{uuid.uuid4().hex[:8].upper()}"
                cert = Certificate(
                    user_id=item['user_id'],
                    contest_id=contest.id,
                    certificate_code=c_code,
                    track_name=f"National SQL Championship - {contest.title}",
                    level=rank_label,
                    certificate_type="contest_ranker",
                    contest_rank=rank_pos,
                    college_name=item['college_name'],
                    score_percent=round((item['total_marks'] / contest.total_marks) * 100) if contest.total_marks else 100,
                    passed=True,
                    issued_at=datetime.utcnow()
                )
                db.session.add(cert)
                db.session.flush()
                cert_id = cert.id
                top_rankers.append({
                    'rank': rank_pos,
                    'name': item['full_name'],
                    'college': item['college_name'],
                    'xp': xp_reward,
                    'code': c_code
                })

            entry = ContestLeaderboard(
                contest_id=contest.id,
                user_id=item['user_id'],
                registration_id=item['registration_id'],
                total_marks=item['total_marks'],
                total_time_seconds=item['total_time_seconds'],
                last_submission_time=item['last_submission_time'],
                rank=rank_pos,
                xp_awarded=xp_reward,
                certificate_id=cert_id,
                is_ranker=is_ranker,
                calculated_at=datetime.utcnow()
            )
            db.session.add(entry)
            rank_pos += 1

        contest.status = 'completed'
        db.session.commit()

        return {
            'success': True,
            'message': f"Leaderboard calculated successfully for {contest.title}!",
            'total_participants': len(candidate_scores),
            'top_rankers': top_rankers
        }

    @staticmethod
    def get_contest_leaderboard(contest_id: int, user_id=None):
        """Fetch final standings, top 3 podium, and celebrate screen."""
        ContestService.ensure_seeded()
        contest = Contest.query.get(contest_id)
        if not contest:
            return {'success': False, 'message': 'Contest not found.'}

        entries = ContestLeaderboard.query.filter_by(contest_id=contest.id).order_by(ContestLeaderboard.rank.asc()).all()

        # If contest has ended but leaderboard not yet calculated, calculate dynamically!
        if len(entries) == 0 and datetime.utcnow() >= contest.end_time:
            ContestService.finalize_contest_leaderboard(contest.id)
            entries = ContestLeaderboard.query.filter_by(contest_id=contest.id).order_by(ContestLeaderboard.rank.asc()).all()

        board_data = [e.to_dict() for e in entries]

        # Top 3 Rankers
        top_3 = [e for e in board_data if e['rank'] <= 3 and e['is_ranker']]

        # User's own entry if logged in
        my_standing = next((e for e in board_data if e['user_id'] == user_id), None) if user_id else None

        return {
            'success': True,
            'contest': contest.to_dict(user_id=user_id),
            'top_3': top_3,
            'standings': board_data,
            'my_standing': my_standing,
            'has_results': len(board_data) > 0
        }

    @staticmethod
    def get_my_contest_certificate(contest_id: int, user_id: int):
        """
        Retrieve exclusive Rank 1, 2, or 3 certificate.
        Only top 3 rankers are granted this certificate.
        """
        ContestService.ensure_seeded()
        entry = ContestLeaderboard.query.filter_by(contest_id=contest_id, user_id=user_id, is_ranker=True).first()
        if not entry or not entry.certificate_id:
            return {
                'success': False,
                'message': 'Official rank certificates are exclusively awarded to Top 3 Rankers (Rank 1, 2, and 3).'
            }

        cert = Certificate.query.get(entry.certificate_id)
        if not cert:
            return {'success': False, 'message': 'Certificate record not found.'}

        return {
            'success': True,
            'certificate': cert.to_dict(),
            'rank': entry.rank,
            'xp_awarded': entry.xp_awarded
        }
