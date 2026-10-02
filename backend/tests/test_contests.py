import pytest
from datetime import datetime, timedelta
from app.extensions import db
from app.models.user import User
from app.models.contest import (
    Contest,
    ContestRegistration,
    ContestQuestion,
    ContestSubmission,
    ContestLeaderboard
)
from app.models.certificate import Certificate
from app.services.contest_service import ContestService
from app.services.challenge_service import ChallengeService, LEVEL_XP_THRESHOLDS
from app.services.assessment_service import AssessmentService

def test_contest_seeding_and_listing(app):
    with app.app_context():
        ContestService.ensure_seeded()
        res = ContestService.list_contests()
        assert 'upcoming' in res
        assert 'completed' in res
        assert len(res['upcoming']) + len(res['completed']) >= 2

def test_contest_registration_flow_and_repeat_user(app):
    with app.app_context():
        user = User(
            full_name="Test Student",
            email="contest_student@example.com"
        )
        user.set_password("SecurePass123!")
        db.session.add(user)
        db.session.commit()

        # Create upcoming contest
        now = datetime.utcnow()
        contest = Contest(
            title="Weekly Sunday Test Edition",
            slug=f"weekly-sunday-test-{now.timestamp()}",
            start_time=now + timedelta(days=2),
            end_time=now + timedelta(days=2, hours=2),
            registration_deadline=now + timedelta(days=1),
            total_marks=100,
            duration_minutes=120,
            status='upcoming',
            is_published=True
        )
        db.session.add(contest)
        db.session.commit()

        # 1. Register for contest
        reg_res = ContestService.register_user(contest.id, user.id, {
            'mobile_number': '9876543210',
            'college_name': 'IIT Delhi',
            'degree_branch': 'Computer Science',
            'email_notification_opt_in': True
        })
        assert reg_res['success'] is True
        assert 'Registration confirmed' in reg_res['message']

        # 2. Verify User model profile was saved
        db.session.refresh(user)
        assert user.mobile_number == '9876543210'
        assert user.college_name == 'IIT Delhi'

        # 3. Test pre-fill data for repeat user
        profile_data = ContestService.get_user_profile_for_registration(user.id)
        assert profile_data['has_previous_profile'] is True
        assert profile_data['mobile_number'] == '9876543210'
        assert profile_data['college_name'] == 'IIT Delhi'

def test_contest_leaderboard_xp_and_certificates(app):
    with app.app_context():
        # Create users
        u1 = User(full_name="Winner One", email="w1@example.com")
        u1.set_password("Pass123!")
        u2 = User(full_name="Runner Two", email="w2@example.com")
        u2.set_password("Pass123!")
        u3 = User(full_name="Runner Three", email="w3@example.com")
        u3.set_password("Pass123!")
        db.session.add_all([u1, u2, u3])
        db.session.commit()

        now = datetime.utcnow()
        contest = Contest(
            title="Sunday Final Championship",
            slug=f"sunday-final-{now.timestamp()}",
            start_time=now - timedelta(hours=2),
            end_time=now,
            registration_deadline=now - timedelta(hours=3),
            total_marks=100,
            duration_minutes=120,
            status='active',
            is_published=True
        )
        db.session.add(contest)
        db.session.flush()

        # Add questions
        q1 = ContestQuestion(
            contest_id=contest.id,
            title="Q1",
            description="desc",
            dataset_name="ch_ecommerce",
            target_table="ch_customers",
            solution_sql="SELECT 1;",
            marks=50,
            order_num=1
        )
        q2 = ContestQuestion(
            contest_id=contest.id,
            title="Q2",
            description="desc",
            dataset_name="ch_ecommerce",
            target_table="ch_customers",
            solution_sql="SELECT 2;",
            marks=50,
            order_num=2
        )
        db.session.add_all([q1, q2])
        db.session.flush()

        # Registrations
        r1 = ContestRegistration(contest_id=contest.id, user_id=u1.id, full_name=u1.full_name, email=u1.email, mobile_number="111", college_name="College A")
        r2 = ContestRegistration(contest_id=contest.id, user_id=u2.id, full_name=u2.full_name, email=u2.email, mobile_number="222", college_name="College B")
        r3 = ContestRegistration(contest_id=contest.id, user_id=u3.id, full_name=u3.full_name, email=u3.email, mobile_number="333", college_name="College C")
        db.session.add_all([r1, r2, r3])
        db.session.flush()

        # Submissions
        # u1 gets 100 marks at 10m
        s1 = ContestSubmission(contest_id=contest.id, question_id=q1.id, user_id=u1.id, submitted_sql="SELECT 1", is_correct=True, marks_awarded=50, submitted_at=contest.start_time + timedelta(minutes=10))
        s2 = ContestSubmission(contest_id=contest.id, question_id=q2.id, user_id=u1.id, submitted_sql="SELECT 2", is_correct=True, marks_awarded=50, submitted_at=contest.start_time + timedelta(minutes=15))
        # u2 gets 100 marks at 25m
        s3 = ContestSubmission(contest_id=contest.id, question_id=q1.id, user_id=u2.id, submitted_sql="SELECT 1", is_correct=True, marks_awarded=50, submitted_at=contest.start_time + timedelta(minutes=20))
        s4 = ContestSubmission(contest_id=contest.id, question_id=q2.id, user_id=u2.id, submitted_sql="SELECT 2", is_correct=True, marks_awarded=50, submitted_at=contest.start_time + timedelta(minutes=25))
        # u3 gets 50 marks
        s5 = ContestSubmission(contest_id=contest.id, question_id=q1.id, user_id=u3.id, submitted_sql="SELECT 1", is_correct=True, marks_awarded=50, submitted_at=contest.start_time + timedelta(minutes=30))
        db.session.add_all([s1, s2, s3, s4, s5])
        db.session.commit()

        # Finalize Leaderboard
        res = ContestService.finalize_contest_leaderboard(contest.id)
        assert res['success'] is True

        # Check XP Distribution: 150 for 1st, 100 for 2nd, 75 for 3rd
        db.session.refresh(u1)
        db.session.refresh(u2)
        db.session.refresh(u3)
        assert u1.contest_xp == 150
        assert u2.contest_xp == 100
        assert u3.contest_xp == 75

        # Check Certificates Generated Exclusively for Top 3
        certs_u1 = Certificate.query.filter_by(user_id=u1.id, contest_id=contest.id).all()
        assert len(certs_u1) == 1
        assert certs_u1[0].contest_rank == 1
        assert certs_u1[0].certificate_type == 'contest_ranker'

        certs_u2 = Certificate.query.filter_by(user_id=u2.id, contest_id=contest.id).all()
        assert len(certs_u2) == 1
        assert certs_u2[0].contest_rank == 2

        certs_u3 = Certificate.query.filter_by(user_id=u3.id, contest_id=contest.id).all()
        assert len(certs_u3) == 1
        assert certs_u3[0].contest_rank == 3

def test_xp_tier_level_gating(app):
    with app.app_context():
        user = User(full_name="XP Learner", email="xplearner@example.com")
        user.set_password("Pass123!")
        user.contest_xp = 0
        db.session.add(user)
        db.session.commit()

        # 1. Total XP should be 0 initially
        xp = ChallengeService.get_user_total_xp(user.id)
        assert xp == 0

        # Beginner is free (0 XP)
        challenges = ChallengeService.list_challenges(user_id=user.id)
        beginner_ch = next((c for c in challenges if c['difficulty'] == 'beginner'), None)
        if beginner_ch:
            assert beginner_ch['is_locked'] is False
            assert beginner_ch['required_xp'] == 0

        # Intermediate requires 500 XP
        intermediate_ch = next((c for c in challenges if c['difficulty'] == 'intermediate'), None)
        if intermediate_ch:
            assert intermediate_ch['is_locked'] is True
            assert intermediate_ch['required_xp'] == 500

        # Advanced requires 1000 XP
        advanced_ch = next((c for c in challenges if c['difficulty'] == 'advanced'), None)
        if advanced_ch:
            assert advanced_ch['is_locked'] is True
            assert advanced_ch['required_xp'] == 1000

        # 2. Award 600 XP (via contest win or profile)
        user.contest_xp = 600
        db.session.commit()

        # Intermediate should now be UNLOCKED
        challenges_updated = ChallengeService.list_challenges(user_id=user.id)
        inter_updated = next((c for c in challenges_updated if c['difficulty'] == 'intermediate'), None)
        if inter_updated:
            assert inter_updated['is_locked'] is False

        # Advanced should still be LOCKED (< 1000 XP)
        adv_updated = next((c for c in challenges_updated if c['difficulty'] == 'advanced'), None)
        if adv_updated:
            assert adv_updated['is_locked'] is True

        # 3. Award 1100 XP
        user.contest_xp = 1100
        db.session.commit()

        challenges_final = ChallengeService.list_challenges(user_id=user.id)
        adv_final = next((c for c in challenges_final if c['difficulty'] == 'advanced'), None)
        if adv_final:
            assert adv_final['is_locked'] is False


def test_hybrid_contest_mcq_and_query_with_table_preview(app):
    """Verify hybrid contest support: Technical MCQs, Query problems, and live 5-row table preview."""
    with app.app_context():
        ChallengeService.ensure_seeded()
        now = datetime.utcnow()
        user = User(email="hybrid_contestant@example.com", full_name="Hybrid User", password_hash="hash")
        db.session.add(user)
        db.session.flush()

        contest = Contest(
            title="Hybrid Championship Edition",
            slug="hybrid-championship-edition",
            description="Testing hybrid questions",
            rules="Strict rules",
            registration_start_time=now - timedelta(days=2),
            registration_deadline=now - timedelta(hours=1),
            lobby_open_time=now - timedelta(minutes=20),
            start_time=now - timedelta(minutes=10),
            end_time=now + timedelta(hours=1),
            results_publish_time=now + timedelta(hours=1, minutes=5),
            total_marks=50,
            duration_minutes=70,
            status='active',
            created_by=user.id
        )
        db.session.add(contest)
        db.session.flush()

        # 1 Technical MCQ (10 Marks)
        q_tech = ContestQuestion(
            contest_id=contest.id,
            question_type='technical',
            title="SQL Primary Key Concept",
            description="Which constraint is enforced by PRIMARY KEY?",
            category="SQL Architecture",
            option_a="FOREIGN KEY",
            option_b="UNIQUE and NOT NULL",
            option_c="CHECK only",
            option_d="DEFAULT only",
            correct_option=1, # B
            explanation="PRIMARY KEY enforces UNIQUE and NOT NULL constraints.",
            marks=10,
            order_num=1
        )
        # 1 Coding Query Problem (40 Marks)
        q_query = ContestQuestion(
            contest_id=contest.id,
            question_type='query',
            title="Department Employee Count",
            description="Count employees in each department.",
            difficulty="intermediate",
            dataset_name="ch_hr",
            target_table="ch_employees",
            starter_sql="SELECT * FROM ch_employees LIMIT 5;",
            solution_sql="SELECT dept_id, COUNT(*) AS cnt FROM ch_employees GROUP BY dept_id ORDER BY dept_id ASC;",
            marks=40,
            order_num=2
        )
        db.session.add_all([q_tech, q_query])
        db.session.flush()

        # Register User
        reg = ContestRegistration(
            contest_id=contest.id,
            user_id=user.id,
            full_name="Hybrid Contestant",
            email=user.email,
            mobile_number="9876543210",
            college_name="Engineering Institute"
        )
        db.session.add(reg)
        db.session.commit()

        # 1. Fetch Exam Room
        exam_room = ContestService.get_contest_exam_room(contest.id, user.id)
        assert exam_room['success'] is True
        assert len(exam_room['questions']) == 2

        # Check technical question in exam room
        q1_data = next(q for q in exam_room['questions'] if q['id'] == q_tech.id)
        assert q1_data['question_type'] == 'technical'
        assert len(q1_data['options']) == 4
        assert q1_data['options'][1] == "UNIQUE and NOT NULL"
        # Solution must be hidden during exam
        assert 'correct_option' not in q1_data

        # Check query question in exam room (must have schema and sample_rows)
        q2_data = next(q for q in exam_room['questions'] if q['id'] == q_query.id)
        assert q2_data['question_type'] == 'query'
        assert q2_data['target_table'] == 'ch_employees'
        assert 'schema' in q2_data and len(q2_data['schema']) > 0
        assert any(c['column_name'] == 'salary' for c in q2_data['schema'])
        # Must return sample rows (at least 5 rows)
        assert 'sample_rows' in q2_data and len(q2_data['sample_rows']) >= 5

        # 2. Submit Technical MCQ (Correct choice: 1)
        res_tech = ContestService.submit_contest_solution(
            contest_id=contest.id,
            question_id=q_tech.id,
            user_id=user.id,
            user_sql="",
            selected_option=1
        )
        assert res_tech['success'] is True
        assert res_tech['passed'] is True
        assert res_tech['marks_awarded'] == 10

        # 3. Submit Query Solution
        res_query = ContestService.submit_contest_solution(
            contest_id=contest.id,
            question_id=q_query.id,
            user_id=user.id,
            user_sql="SELECT dept_id, COUNT(*) AS cnt FROM ch_employees GROUP BY dept_id ORDER BY dept_id ASC;"
        )
        assert res_query['success'] is True
        assert res_query['passed'] is True
        assert res_query['marks_awarded'] == 40

        # Check updated exam room
        updated_room = ContestService.get_contest_exam_room(contest.id, user.id)
        assert updated_room['earned_marks'] == 50
        assert set(updated_room['solved_question_ids']) == {q_tech.id, q_query.id}
