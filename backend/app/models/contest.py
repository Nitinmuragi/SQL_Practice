from datetime import datetime, timedelta
from app.extensions import db

class Contest(db.Model):
    __tablename__ = 'contests'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), nullable=False, unique=True, index=True)
    description = db.Column(db.Text, nullable=True)
    rules = db.Column(db.Text, nullable=True)
    banner_url = db.Column(db.String(500), nullable=True)
    
    # Timing & Complete Schedule Milestones
    registration_start_time = db.Column(db.DateTime, nullable=True, index=True) # When registration opens
    registration_deadline = db.Column(db.DateTime, nullable=False, index=True)   # When registration closes
    lobby_open_time = db.Column(db.DateTime, nullable=True, index=True)         # When test link/lobby opens
    start_time = db.Column(db.DateTime, nullable=False, index=True)              # When exam begins
    end_time = db.Column(db.DateTime, nullable=False, index=True)                # When exam ends
    results_publish_time = db.Column(db.DateTime, nullable=True, index=True)    # When podium/results announce
    
    total_marks = db.Column(db.Integer, default=100, nullable=False)
    duration_minutes = db.Column(db.Integer, default=120, nullable=False)
    status = db.Column(db.String(50), default='upcoming', nullable=False) # upcoming, active, evaluating, completed
    is_published = db.Column(db.Boolean, default=True, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    questions = db.relationship('ContestQuestion', backref='contest', cascade='all, delete-orphan', lazy=True, order_by='ContestQuestion.order_num')
    registrations = db.relationship('ContestRegistration', backref='contest', cascade='all, delete-orphan', lazy=True)
    submissions = db.relationship('ContestSubmission', backref='contest', cascade='all, delete-orphan', lazy=True)
    leaderboard = db.relationship('ContestLeaderboard', backref='contest', cascade='all, delete-orphan', lazy=True, order_by='ContestLeaderboard.rank')

    def compute_dynamic_status(self):
        """Helper to sync status based on current time and timeline milestones."""
        now = datetime.utcnow()
        if self.status == 'completed':
            return 'completed'

        res_time = self.results_publish_time or (self.end_time + timedelta(minutes=5) if self.end_time else None)
        if res_time and now >= res_time:
            return 'completed'

        if self.start_time and now < self.start_time:
            lobby_time = self.lobby_open_time or (self.start_time - timedelta(minutes=20))
            if now >= lobby_time:
                return 'lobby_open'
            return 'upcoming'
        elif self.start_time and self.end_time and (self.start_time <= now <= self.end_time):
            return 'active'
        elif self.end_time and now > self.end_time:
            return 'evaluating' if self.status != 'completed' else 'completed'
        return self.status

    def to_dict(self, user_id=None, include_questions=False, is_admin=False):
        status = self.compute_dynamic_status()
        now = datetime.utcnow()

        def to_utc_iso(dt):
            if not dt:
                return None
            iso = dt.isoformat()
            return iso if (iso.endswith('Z') or '+' in iso) else f"{iso}Z"

        reg_start = self.registration_start_time or self.created_at
        is_reg_open = (now >= reg_start) and (now <= self.registration_deadline) if self.registration_deadline else False
        is_reg_closed = (now > self.registration_deadline) if self.registration_deadline else False
        is_reg_upcoming = (now < reg_start) if reg_start else False

        lobby_time = self.lobby_open_time or (self.start_time - timedelta(minutes=20) if self.start_time else None)
        is_test_link_open = (now >= lobby_time) if lobby_time else False

        res_time = self.results_publish_time or (self.end_time + timedelta(minutes=5) if self.end_time else None)
        is_results_live = (now >= res_time) if res_time else False

        data = {
            'id': self.id,
            'title': self.title,
            'slug': self.slug,
            'description': self.description,
            'rules': self.rules,
            'banner_url': self.banner_url,
            'registration_start_time': to_utc_iso(self.registration_start_time) or to_utc_iso(self.created_at),
            'registration_deadline': to_utc_iso(self.registration_deadline),
            'lobby_open_time': to_utc_iso(lobby_time),
            'start_time': to_utc_iso(self.start_time),
            'end_time': to_utc_iso(self.end_time),
            'results_publish_time': to_utc_iso(res_time),
            'total_marks': self.total_marks,
            'duration_minutes': self.duration_minutes,
            'status': status,
            'is_published': self.is_published,
            'questions_count': len(self.questions),
            'registrations_count': len(self.registrations),
            'created_at': to_utc_iso(self.created_at),
            'is_registered': False,
            'registration_info': None,
            'is_registration_open': is_reg_open,
            'is_registration_closed': is_reg_closed,
            'is_registration_upcoming': is_reg_upcoming,
            'is_test_link_open': is_test_link_open,
            'is_results_live': is_results_live,
            'timeline': {
                'registration_start': to_utc_iso(self.registration_start_time) or to_utc_iso(self.created_at),
                'registration_deadline': to_utc_iso(self.registration_deadline),
                'lobby_open': to_utc_iso(lobby_time),
                'exam_start': to_utc_iso(self.start_time),
                'exam_end': to_utc_iso(self.end_time),
                'results_publish': to_utc_iso(res_time),
            }
        }

        if user_id:
            user_reg = next((r for r in self.registrations if r.user_id == user_id), None)
            if user_reg:
                data['is_registered'] = True
                data['registration_info'] = user_reg.to_dict()

        if include_questions:
            data['questions'] = [q.to_dict(include_solution=is_admin) for q in self.questions]

        return data


class ContestRegistration(db.Model):
    __tablename__ = 'contest_registrations'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    contest_id = db.Column(db.Integer, db.ForeignKey('contests.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    full_name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    mobile_number = db.Column(db.String(20), nullable=False)
    college_name = db.Column(db.String(255), nullable=False)
    degree_branch = db.Column(db.String(150), nullable=True)
    email_notification_opt_in = db.Column(db.Boolean, default=True, nullable=False)
    reminder_email_sent = db.Column(db.Boolean, default=False, nullable=False)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_attended = db.Column(db.Boolean, default=False, nullable=False)
    is_completed = db.Column(db.Boolean, default=False, nullable=False)

    # Link to user
    user = db.relationship('User', backref=db.backref('contest_registrations', cascade='all, delete-orphan', lazy=True))

    __table_args__ = (
        db.UniqueConstraint('contest_id', 'user_id', name='uq_contest_user_reg'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'contest_id': self.contest_id,
            'user_id': self.user_id,
            'full_name': self.full_name,
            'email': self.email,
            'mobile_number': self.mobile_number,
            'college_name': self.college_name,
            'degree_branch': self.degree_branch,
            'email_notification_opt_in': self.email_notification_opt_in,
            'reminder_email_sent': self.reminder_email_sent,
            'registered_at': self.registered_at.isoformat() if self.registered_at else None,
            'is_attended': self.is_attended,
            'is_completed': self.is_completed
        }


class ContestQuestion(db.Model):
    __tablename__ = 'contest_questions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    contest_id = db.Column(db.Integer, db.ForeignKey('contests.id', ondelete='CASCADE'), nullable=False, index=True)
    question_type = db.Column(db.String(20), default='query', nullable=False)  # 'technical' | 'query'
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=True)
    difficulty = db.Column(db.String(50), default='intermediate', nullable=False)
    dataset_name = db.Column(db.String(255), nullable=True)
    target_table = db.Column(db.String(255), nullable=True)
    starter_sql = db.Column(db.Text, nullable=True)
    solution_sql = db.Column(db.Text, nullable=True)
    option_a = db.Column(db.Text, nullable=True)
    option_b = db.Column(db.Text, nullable=True)
    option_c = db.Column(db.Text, nullable=True)
    option_d = db.Column(db.Text, nullable=True)
    correct_option = db.Column(db.Integer, nullable=True)  # 0=A, 1=B, 2=C, 3=D
    explanation = db.Column(db.Text, nullable=True)
    marks = db.Column(db.Integer, default=25, nullable=False)
    order_num = db.Column(db.Integer, default=1, nullable=False)

    def to_dict(self, include_solution=False):
        q_type = self.question_type or 'query'
        data = {
            'id': self.id,
            'contest_id': self.contest_id,
            'question_type': q_type,
            'title': self.title,
            'description': self.description,
            'category': self.category or ('Technical SQL' if q_type == 'technical' else 'Query Problem'),
            'difficulty': self.difficulty,
            'marks': self.marks,
            'order_num': self.order_num
        }
        if q_type == 'technical':
            data['options'] = [
                self.option_a or '',
                self.option_b or '',
                self.option_c or '',
                self.option_d or ''
            ]
            data['option_a'] = self.option_a or ''
            data['option_b'] = self.option_b or ''
            data['option_c'] = self.option_c or ''
            data['option_d'] = self.option_d or ''
            if include_solution:
                data['correct_option'] = self.correct_option
                data['explanation'] = self.explanation
        else:
            data['dataset_name'] = self.dataset_name
            data['target_table'] = self.target_table
            data['starter_sql'] = self.starter_sql or (f"-- Write your query for {self.title}\nSELECT * FROM `{self.target_table}` LIMIT 10;" if self.target_table else "")
            if include_solution:
                data['solution_sql'] = self.solution_sql
        return data


class ContestSubmission(db.Model):
    __tablename__ = 'contest_submissions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    contest_id = db.Column(db.Integer, db.ForeignKey('contests.id', ondelete='CASCADE'), nullable=False, index=True)
    question_id = db.Column(db.Integer, db.ForeignKey('contest_questions.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    submitted_sql = db.Column(db.Text, nullable=True)
    selected_option = db.Column(db.Integer, nullable=True)
    is_correct = db.Column(db.Boolean, default=False, nullable=False)
    marks_awarded = db.Column(db.Integer, default=0, nullable=False)
    execution_time_ms = db.Column(db.Float, default=0.0)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    question = db.relationship('ContestQuestion', backref='submissions')
    user = db.relationship('User', backref='contest_submissions')

    def to_dict(self):
        return {
            'id': self.id,
            'contest_id': self.contest_id,
            'question_id': self.question_id,
            'user_id': self.user_id,
            'submitted_sql': self.submitted_sql,
            'selected_option': self.selected_option,
            'is_correct': self.is_correct,
            'marks_awarded': self.marks_awarded,
            'execution_time_ms': self.execution_time_ms,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None
        }


class ContestLeaderboard(db.Model):
    __tablename__ = 'contest_leaderboard'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    contest_id = db.Column(db.Integer, db.ForeignKey('contests.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    registration_id = db.Column(db.Integer, db.ForeignKey('contest_registrations.id', ondelete='CASCADE'), nullable=False)
    total_marks = db.Column(db.Integer, default=0, nullable=False)
    total_time_seconds = db.Column(db.Integer, default=0, nullable=False) # Total duration in seconds from start to completion
    last_submission_time = db.Column(db.DateTime, nullable=True)
    rank = db.Column(db.Integer, nullable=False, index=True)
    xp_awarded = db.Column(db.Integer, default=0, nullable=False) # 150 for rank 1, 100 for rank 2, 75 for rank 3
    certificate_id = db.Column(db.Integer, db.ForeignKey('certificates.id', ondelete='SET NULL'), nullable=True)
    is_ranker = db.Column(db.Boolean, default=False, nullable=False) # True only for Top 3
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='contest_rankings')
    registration = db.relationship('ContestRegistration')
    certificate = db.relationship('Certificate', backref='contest_leaderboard_entry')

    __table_args__ = (
        db.UniqueConstraint('contest_id', 'rank', name='uq_contest_rank_pos'),
        db.UniqueConstraint('contest_id', 'user_id', name='uq_contest_user_board'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'contest_id': self.contest_id,
            'user_id': self.user_id,
            'user_name': self.registration.full_name if self.registration else (self.user.full_name if self.user else 'Contestant'),
            'college_name': self.registration.college_name if self.registration else (self.user.college_name if self.user else 'College/University'),
            'total_marks': self.total_marks,
            'total_time_seconds': self.total_time_seconds,
            'time_formatted': f"{self.total_time_seconds // 60}m {self.total_time_seconds % 60}s",
            'last_submission_time': self.last_submission_time.isoformat() if self.last_submission_time else None,
            'rank': self.rank,
            'xp_awarded': self.xp_awarded,
            'is_ranker': self.is_ranker,
            'certificate_id': self.certificate_id,
            'certificate_code': self.certificate.certificate_code if self.certificate else None,
            'calculated_at': self.calculated_at.isoformat() if self.calculated_at else None
        }
