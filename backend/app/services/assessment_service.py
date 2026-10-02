import uuid
from datetime import datetime
from app.extensions import db
from app.models.assessment import Assessment, AssessmentQuestion, AssessmentAttempt
from app.models.certificate import Certificate
from app.models.user import User

DEFAULT_ASSESSMENTS_SEED = [
    {
        'title': 'Beginner SQL Certification: Querying & Filtering Essentials',
        'level': 'beginner',
        'description': 'Validates core competencies in basic SQL SELECT projection, WHERE filtering, comparison operators, boolean logic (AND/OR/NOT), and three-valued NULL semantics.',
        'passing_score': 80,
        'time_limit_minutes': 15,
        'questions': [
            {
                'category': 'Logical Precedence',
                'question_text': 'You need to find active customers who placed an order in 2023 OR have a credit limit above $10,000. Which clause correctly prevents operator precedence bugs?',
                'option_a': 'WHERE is_active = 1 AND order_year = 2023 OR credit_limit > 10000',
                'option_b': 'WHERE is_active = 1 AND (order_year = 2023 OR credit_limit > 10000)',
                'option_c': 'WHERE (is_active = 1 AND order_year = 2023) AND credit_limit > 10000',
                'option_d': 'WHERE is_active = 1 OR order_year = 2023 AND credit_limit > 10000',
                'correct_option': 1,
                'explanation': 'In standard SQL, AND has higher precedence than OR. Explicit parentheses around the OR condition ensure the active customer check applies across both possibilities.'
            },
            {
                'category': 'Data Quality & NULLs',
                'question_text': 'Why does the expression WHERE email = NULL fail to find records with missing email addresses?',
                'option_a': 'NULL signifies unknown in SQL three-valued logic; comparisons with = evaluate to UNKNOWN (falsy). You must use IS NULL.',
                'option_b': 'In MySQL, NULL is converted to empty string, so = "" must be used.',
                'option_c': 'The equality operator only works on numeric primary keys.',
                'option_d': 'NULL values cannot be queried in relational databases.',
                'correct_option': 0,
                'explanation': 'In ANSI SQL three-valued logic (TRUE, FALSE, UNKNOWN), any equality check with NULL returns UNKNOWN. The dedicated IS NULL operator is required to test for missing values.'
            },
            {
                'category': 'Sorting & Pagination',
                'question_text': 'Which clause correctly retrieves the 5 most expensive products after skipping the top 10 most expensive products?',
                'option_a': 'ORDER BY price DESC LIMIT 5 OFFSET 10',
                'option_b': 'ORDER BY price ASC LIMIT 10, 5',
                'option_c': 'ORDER BY price DESC SKIP 10 TAKE 5',
                'option_d': 'LIMIT 5 OFFSET 10 ORDER BY price DESC',
                'correct_option': 0,
                'explanation': 'ORDER BY price DESC sorts from highest to lowest price. LIMIT 5 OFFSET 10 skips the top 10 records and retrieves the next 5.'
            },
            {
                'category': 'Pattern Matching',
                'question_text': 'Which LIKE expression matches any string that starts with "Data" and ends with "Platform"?',
                'option_a': 'LIKE "Data_Platform"',
                'option_b': 'LIKE "Data%Platform"',
                'option_c': 'LIKE "%DataPlatform%"',
                'option_d': 'LIKE "Data*Platform"',
                'correct_option': 1,
                'explanation': 'The % wildcard matches zero or more characters, so "Data%Platform" matches any text beginning with "Data" and concluding with "Platform".'
            },
            {
                'category': 'Deduplication',
                'question_text': 'How does SELECT DISTINCT country, city differ from SELECT country, city?',
                'option_a': 'It only returns distinct country values, ignoring city duplicates.',
                'option_b': 'It returns unique pairs of (country, city) combinations.',
                'option_c': 'It sorts the results automatically by country and city in ascending order.',
                'option_d': 'It requires an aggregate function to be included in the SELECT list.',
                'correct_option': 1,
                'explanation': 'DISTINCT applies across all columns specified in the SELECT list, returning only unique combinations of (country, city).'
            }
        ]
    },
    {
        'title': 'Intermediate SQL Certification: Aggregations & Relational Joins',
        'level': 'intermediate',
        'description': 'Validates intermediate mastery of multi-table relational modeling, INNER/LEFT/RIGHT JOINs, GROUP BY grouping, and HAVING aggregate filters.',
        'passing_score': 80,
        'time_limit_minutes': 20,
        'questions': [
            {
                'category': 'Aggregations & Grouping',
                'question_text': 'What is the primary difference between the WHERE clause and the HAVING clause in SQL?',
                'option_a': 'WHERE filters rows before aggregation; HAVING filters grouped summary rows after aggregation.',
                'option_b': 'HAVING can only filter strings, while WHERE can only filter numeric values.',
                'option_c': 'WHERE and HAVING are completely identical and interchangeable in SQL standards.',
                'option_d': 'HAVING is evaluated before the FROM table join phase.',
                'correct_option': 0,
                'explanation': 'WHERE filters individual source rows before any GROUP BY operations take place. HAVING filters aggregate metrics (such as COUNT(*), SUM()) after grouping.'
            },
            {
                'category': 'Relational Joins',
                'question_text': 'You need to query all customers and their orders, ensuring customers who have never placed an order are still included in the result. Which join should you use?',
                'option_a': 'INNER JOIN',
                'option_b': 'LEFT OUTER JOIN',
                'option_c': 'CROSS JOIN',
                'option_d': 'NATURAL JOIN with strict match',
                'correct_option': 1,
                'explanation': 'LEFT JOIN returns all records from the left table (customers), paired with matching records from the right table (orders) or NULL if no match exists.'
            },
            {
                'category': 'Hierarchical Modeling',
                'question_text': 'Which type of join is best suited for querying hierarchical employee-manager relationships stored within a single employees table?',
                'option_a': 'Self-Join (joining the table to an aliased instance of itself)',
                'option_b': 'Full Outer Join with a Cartesian product',
                'option_c': 'Union of two separate SELECT statements',
                'option_d': 'Group Concatenation without joining',
                'correct_option': 0,
                'explanation': 'A Self-Join pairs an employee row with their corresponding manager row from the same table using aliases like `e` and `m` on `e.manager_id = m.emp_id`.'
            },
            {
                'category': 'COUNT Behavior with NULLs',
                'question_text': 'In a table with 10 rows where 3 rows have a NULL bonus, what are the results of COUNT(*) and COUNT(bonus)?',
                'option_a': 'COUNT(*) = 10, COUNT(bonus) = 10',
                'option_b': 'COUNT(*) = 10, COUNT(bonus) = 7',
                'option_c': 'COUNT(*) = 7, COUNT(bonus) = 7',
                'option_d': 'COUNT(*) = 7, COUNT(bonus) = 3',
                'correct_option': 1,
                'explanation': 'COUNT(*) counts all rows regardless of column values. COUNT(column_name) counts only non-NULL occurrences.'
            },
            {
                'category': 'Conditional Aggregation',
                'question_text': 'How can you calculate the count of orders with status "Delivered" inside a single summary query across all statuses?',
                'option_a': 'SUM(CASE WHEN order_status = "Delivered" THEN 1 ELSE 0 END)',
                'option_b': 'COUNT(WHERE order_status = "Delivered")',
                'option_c': 'SELECT Delivered FROM orders',
                'option_d': 'GROUP BY order_status HAVING status = "Delivered"',
                'correct_option': 0,
                'explanation': 'Conditional aggregation using SUM(CASE WHEN ... THEN 1 ELSE 0 END) or COUNT(CASE WHEN ... THEN 1 END) enables counting subsets in a single query.'
            }
        ]
    },
    {
        'title': 'Advanced SQL Certification: Window Functions, CTEs & Analytics',
        'level': 'advanced',
        'description': 'Validates senior analytical SQL capabilities: Window Functions (RANK, DENSE_RANK, ROW_NUMBER, LAG/LEAD), recursive and non-recursive Common Table Expressions (CTEs), and query optimization.',
        'passing_score': 80,
        'time_limit_minutes': 25,
        'questions': [
            {
                'category': 'Window Functions vs GROUP BY',
                'question_text': 'What is the main architectural distinction between an aggregate query using GROUP BY vs a Window function using OVER (PARTITION BY)?',
                'option_a': 'Window functions collapse rows into a single summary row, while GROUP BY preserves all rows.',
                'option_b': 'Window functions retain each individual row in the output while computing calculations across the partition, whereas GROUP BY collapses rows.',
                'option_c': 'Window functions only work in SQLite and cannot be used in MySQL or PostgreSQL.',
                'option_d': 'GROUP BY can use DENSE_RANK() but Window functions cannot.',
                'correct_option': 1,
                'explanation': 'Window functions compute aggregate and ranking values over a partition of rows while preserving each individual row in the output, unlike GROUP BY which collapses groups.'
            },
            {
                'category': 'Ranking Semantics',
                'question_text': 'If salaries are 100k, 90k, 90k, 80k, what ranks are assigned by RANK() vs DENSE_RANK()?',
                'option_a': 'RANK gives 1, 2, 2, 4; DENSE_RANK gives 1, 2, 2, 3',
                'option_b': 'RANK gives 1, 2, 3, 4; DENSE_RANK gives 1, 2, 2, 3',
                'option_c': 'RANK gives 1, 2, 2, 3; DENSE_RANK gives 1, 2, 2, 4',
                'option_d': 'Both assign 1, 2, 3, 4 with no ties allowed',
                'correct_option': 0,
                'explanation': 'RANK() leaves gaps following ties (1, 2, 2, 4), whereas DENSE_RANK() does not skip rank numbers following ties (1, 2, 2, 3).'
            },
            {
                'category': 'Time-Series & Offsets',
                'question_text': 'Which window function allows comparing today\'s daily revenue directly with yesterday\'s daily revenue within the same row?',
                'option_a': 'LEAD(daily_revenue, 1) OVER (ORDER BY date_col)',
                'option_b': 'LAG(daily_revenue, 1) OVER (ORDER BY date_col)',
                'option_c': 'FIRST_VALUE(daily_revenue) OVER (ORDER BY date_col)',
                'option_d': 'NTH_VALUE(daily_revenue, 2) OVER (ORDER BY date_col)',
                'correct_option': 1,
                'explanation': 'LAG() accesses data from a preceding row at a specified physical offset prior to the current row, making it ideal for day-over-day deltas.'
            },
            {
                'category': 'Common Table Expressions',
                'question_text': 'What is the primary operational benefit of using Common Table Expressions (WITH clause) over deeply nested inline subqueries?',
                'option_a': 'CTEs improve code readability, reusability within the same query, and support recursive hierarchy traversal.',
                'option_b': 'CTEs permanently store data into physical disk tables.',
                'option_c': 'CTEs bypass database transaction isolation levels.',
                'option_d': 'CTEs disable table indexing for higher throughput.',
                'correct_option': 0,
                'explanation': 'CTEs define temporary named result sets that enhance readability, can be referenced multiple times in the query, and support recursive traversal.'
            },
            {
                'category': 'Correlated Subqueries',
                'question_text': 'Why can a correlated subquery in the WHERE clause cause severe performance bottlenecks on large tables?',
                'option_a': 'Because it executes once for every candidate row evaluated in the outer query (O(N*M) complexity).',
                'option_b': 'Because correlated subqueries can only run on read-only replicas.',
                'option_c': 'Because correlated subqueries force MySQL to restart.',
                'option_d': 'Because SQL standards forbid correlated subqueries with indexes.',
                'correct_option': 0,
                'explanation': 'A correlated subquery references columns from the outer query, meaning the inner query must be re-evaluated row-by-row for each outer candidate row unless optimized by the query planner.'
            }
        ]
    }
]


class AssessmentService:
    @staticmethod
    def ensure_seeded():
        """Ensure assessment tables are created and default level-wise assessments exist."""
        try:
            db.create_all()

            # Ensure certificates table has assessment_id and level columns if table existed previously
            try:
                from sqlalchemy import text, inspect
                inspector = inspect(db.engine)
                existing_cols = [c['name'] for c in inspector.get_columns('certificates')]
                cols_added = False
                if 'assessment_id' not in existing_cols:
                    db.session.execute(text("ALTER TABLE certificates ADD COLUMN assessment_id INT NULL"))
                    cols_added = True
                if 'level' not in existing_cols:
                    db.session.execute(text("ALTER TABLE certificates ADD COLUMN level VARCHAR(50) NOT NULL DEFAULT 'intermediate'"))
                    cols_added = True
                if cols_added:
                    db.session.commit()
            except Exception as e_col:
                db.session.rollback()
                print(f"[AssessmentService] Certificate column migration notice: {e_col}")

            if Assessment.query.count() == 0:
                for a_data in DEFAULT_ASSESSMENTS_SEED:
                    assessment = Assessment(
                        title=a_data['title'],
                        level=a_data['level'],
                        description=a_data['description'],
                        passing_score=a_data['passing_score'],
                        time_limit_minutes=a_data['time_limit_minutes'],
                        is_active=True
                    )
                    db.session.add(assessment)
                    db.session.flush()

                    for idx, q_data in enumerate(a_data['questions']):
                        q = AssessmentQuestion(
                            assessment_id=assessment.id,
                            category=q_data['category'],
                            question_text=q_data['question_text'],
                            option_a=q_data['option_a'],
                            option_b=q_data['option_b'],
                            option_c=q_data['option_c'],
                            option_d=q_data['option_d'],
                            correct_option=q_data['correct_option'],
                            explanation=q_data['explanation'],
                            order_num=idx + 1
                        )
                        db.session.add(q)
                db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"[AssessmentService] Seed warning: {e}")

    @staticmethod
    def list_assessments(level=None, user_id=None, is_admin=False):
        """List active assessments filtered by level with XP lock info."""
        from app.services.challenge_service import ChallengeService
        AssessmentService.ensure_seeded()
        query = Assessment.query
        if not is_admin:
            query = query.filter(Assessment.is_active == True)

        if level and level.lower() != 'all':
            query = query.filter(Assessment.level == level.lower())

        assessments = query.order_by(Assessment.level.asc(), Assessment.id.asc()).all()
        user_xp = ChallengeService.get_user_total_xp(user_id) if user_id else 0
        LEVEL_XP = {'beginner': 0, 'intermediate': 500, 'advanced': 1000}

        items = []
        for a in assessments:
            a_dict = a.to_dict(include_questions=False, user_id=user_id)
            lvl = (a.level or 'beginner').lower()
            req_xp = LEVEL_XP.get(lvl, 0)
            a_dict['required_xp'] = req_xp
            a_dict['is_locked'] = bool(user_xp < req_xp)
            a_dict['user_xp'] = user_xp
            items.append(a_dict)
        return items

    @staticmethod
    def get_assessment_detail(assessment_id: int, user_id=None, is_admin=False):
        """Retrieve assessment details and questions with XP lock status."""
        from app.services.challenge_service import ChallengeService
        AssessmentService.ensure_seeded()
        assessment = Assessment.query.get(assessment_id)
        if not assessment:
            return None
        data = assessment.to_dict(include_questions=True, include_answers=is_admin, user_id=user_id)
        user_xp = ChallengeService.get_user_total_xp(user_id) if user_id else 0
        lvl = (assessment.level or 'beginner').lower()
        LEVEL_XP = {'beginner': 0, 'intermediate': 500, 'advanced': 1000}
        req_xp = LEVEL_XP.get(lvl, 0)
        data['required_xp'] = req_xp
        data['is_locked'] = bool(user_xp < req_xp)
        data['user_xp'] = user_xp
        return data

    @staticmethod
    def submit_assessment(user_id: int, assessment_id: int, answers: dict):
        """
        Evaluate user answers dict: { '1': 1, '2': 0, ... }
        Calculate score percentage, verify pass/fail, and generate level-specific certificate if passed.
        """
        from app.services.challenge_service import ChallengeService
        AssessmentService.ensure_seeded()
        user = User.query.get(user_id)
        assessment = Assessment.query.get(assessment_id)

        if not user or not assessment:
            return {'success': False, 'message': 'Assessment or User not found.'}

        # XP Level Gating Check
        user_xp = ChallengeService.get_user_total_xp(user_id) if user_id else 0
        lvl = (assessment.level or 'beginner').lower()
        LEVEL_XP = {'beginner': 0, 'intermediate': 500, 'advanced': 1000}
        req_xp = LEVEL_XP.get(lvl, 0)
        if user_xp < req_xp:
            return {
                'success': False,
                'message': f"Assessment Locked: {assessment.level.capitalize()} level requires {req_xp} XP to unlock. Your current XP is {user_xp}. Earn more XP in Beginner level challenges or Sunday Contests!",
                'is_locked': True,
                'required_xp': req_xp,
                'user_xp': user_xp
            }

        questions = assessment.questions
        total = len(questions)
        if total == 0:
            return {'success': False, 'message': 'This assessment has no questions configured.'}

        correct_count = 0
        details = []

        for q in questions:
            q_id_str = str(q.id)
            user_choice = answers.get(q_id_str)
            is_correct = (user_choice is not None and int(user_choice) == q.correct_option)
            if is_correct:
                correct_count += 1

            details.append({
                'id': q.id,
                'question': q.question_text,
                'category': q.category,
                'user_choice': user_choice,
                'correct_index': q.correct_option,
                'is_correct': is_correct,
                'explanation': q.explanation
            })

        score_percent = round((correct_count / total) * 100)
        passed = (score_percent >= assessment.passing_score)

        # Record attempt
        attempt = AssessmentAttempt(
            user_id=user_id,
            assessment_id=assessment.id,
            score_percent=score_percent,
            passed=passed
        )
        db.session.add(attempt)

        certificate_data = None
        if passed:
            # Check if user already holds a certificate for this assessment
            cert = Certificate.query.filter_by(user_id=user_id, assessment_id=assessment.id, passed=True).first()
            if not cert:
                code_suffix = uuid.uuid4().hex[:8].upper()
                cert_code = f"CERT-SQL-{code_suffix}"
                cert = Certificate(
                    user_id=user_id,
                    assessment_id=assessment.id,
                    certificate_code=cert_code,
                    track_name=assessment.title,
                    level=assessment.level,
                    score_percent=score_percent,
                    passed=True
                )
                db.session.add(cert)
            else:
                if score_percent > cert.score_percent:
                    cert.score_percent = score_percent

            db.session.commit()
            certificate_data = cert.to_dict()
        else:
            db.session.commit()

        return {
            'success': True,
            'passed': passed,
            'score_percent': score_percent,
            'correct_count': correct_count,
            'total_questions': total,
            'passing_score': assessment.passing_score,
            'details': details,
            'certificate': certificate_data
        }

    @staticmethod
    def get_user_certificates(user_id: int):
        """Retrieve all certificates earned by user."""
        certs = Certificate.query.filter_by(user_id=user_id, passed=True).order_by(Certificate.id.desc()).all()
        return [c.to_dict() for c in certs]

    # --- ADMIN CRUD METHODS ---

    @staticmethod
    def admin_create_assessment(data: dict, user_id: int):
        """Create new assessment package with questions."""
        AssessmentService.ensure_seeded()
        title = data.get('title', '').strip()
        level = data.get('level', 'intermediate').strip().lower()
        description = data.get('description', '').strip()
        passing_score = int(data.get('passing_score', 80))
        time_limit = int(data.get('time_limit_minutes', 15))
        questions_data = data.get('questions', [])

        if not title:
            return {'success': False, 'message': 'Assessment title is required.'}

        new_assessment = Assessment(
            title=title,
            level=level,
            description=description,
            passing_score=passing_score,
            time_limit_minutes=time_limit,
            is_active=True,
            created_by=user_id
        )
        db.session.add(new_assessment)
        db.session.flush()

        for idx, q in enumerate(questions_data):
            new_q = AssessmentQuestion(
                assessment_id=new_assessment.id,
                category=q.get('category', 'General SQL').strip(),
                question_text=q.get('question_text', '').strip(),
                option_a=q.get('option_a', '').strip(),
                option_b=q.get('option_b', '').strip(),
                option_c=q.get('option_c', '').strip(),
                option_d=q.get('option_d', '').strip(),
                correct_option=int(q.get('correct_option', 0)),
                explanation=q.get('explanation', '').strip(),
                order_num=idx + 1
            )
            db.session.add(new_q)

        db.session.commit()
        return {
            'success': True,
            'message': 'Assessment created successfully.',
            'data': new_assessment.to_dict(include_questions=True, include_answers=True)
        }

    @staticmethod
    def admin_update_assessment(assessment_id: int, data: dict):
        """Update existing assessment and its questions."""
        AssessmentService.ensure_seeded()
        assessment = Assessment.query.get(assessment_id)
        if not assessment:
            return {'success': False, 'message': 'Assessment not found.'}

        if 'title' in data:
            assessment.title = data['title'].strip()
        if 'level' in data:
            assessment.level = data['level'].strip().lower()
        if 'description' in data:
            assessment.description = data['description'].strip()
        if 'passing_score' in data:
            assessment.passing_score = int(data['passing_score'])
        if 'time_limit_minutes' in data:
            assessment.time_limit_minutes = int(data['time_limit_minutes'])
        if 'is_active' in data:
            assessment.is_active = bool(data['is_active'])

        # If questions array is supplied, replace or update questions
        if 'questions' in data:
            # Remove old questions and insert new ones cleanly
            AssessmentQuestion.query.filter_by(assessment_id=assessment.id).delete()
            for idx, q in enumerate(data['questions']):
                new_q = AssessmentQuestion(
                    assessment_id=assessment.id,
                    category=q.get('category', 'General SQL').strip(),
                    question_text=q.get('question_text', '').strip(),
                    option_a=q.get('option_a', '').strip(),
                    option_b=q.get('option_b', '').strip(),
                    option_c=q.get('option_c', '').strip(),
                    option_d=q.get('option_d', '').strip(),
                    correct_option=int(q.get('correct_option', 0)),
                    explanation=q.get('explanation', '').strip(),
                    order_num=idx + 1
                )
                db.session.add(new_q)

        db.session.commit()
        return {
            'success': True,
            'message': 'Assessment updated successfully.',
            'data': assessment.to_dict(include_questions=True, include_answers=True)
        }

    @staticmethod
    def admin_delete_assessment(assessment_id: int):
        """Delete an assessment and its questions."""
        AssessmentService.ensure_seeded()
        assessment = Assessment.query.get(assessment_id)
        if not assessment:
            return {'success': False, 'message': 'Assessment not found.'}

        title = assessment.title
        db.session.delete(assessment)
        db.session.commit()
        return {'success': True, 'message': f'Assessment "{title}" deleted successfully.'}
