import re
import time
from datetime import datetime
from sqlalchemy import text, inspect
from app.extensions import db
from app.models.challenge import Challenge, UserChallengeProgress
from app.utils.security import check_destructive_sql, strip_sql_comments

# Pre-seeded Challenge Datasets Schema and Records (MySQL)
SEED_CHALLENGES_SQL = """
-- 1. E-Commerce Tables
CREATE TABLE IF NOT EXISTS ch_customers (
    customer_id INT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    city VARCHAR(50),
    country VARCHAR(50),
    credit_limit DECIMAL(10,2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ch_orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    order_date DATE,
    total_amount DECIMAL(10,2),
    order_status VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ch_products (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    price DECIMAL(10,2),
    stock_quantity INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. HR & Employee Tables
CREATE TABLE IF NOT EXISTS ch_departments (
    dept_id INT PRIMARY KEY,
    dept_name VARCHAR(50) NOT NULL,
    location VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ch_employees (
    emp_id INT PRIMARY KEY,
    emp_name VARCHAR(100) NOT NULL,
    dept_id INT,
    job_title VARCHAR(50),
    salary DECIMAL(10,2),
    hire_date DATE,
    manager_id INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Populate E-Commerce Customers
INSERT IGNORE INTO ch_customers (customer_id, full_name, email, city, country, credit_limit) VALUES
(1, 'Alice Johnson', 'alice@example.com', 'Berlin', 'Germany', 7500.00),
(2, 'Bob Smith', 'bob@example.com', 'London', 'UK', 4200.00),
(3, 'Charlie Brown', NULL, 'New York', 'USA', 12000.00),
(4, 'Diana Prince', 'diana@example.com', 'Paris', 'France', 8900.00),
(5, 'Evan Wright', 'evan@example.com', 'Berlin', 'Germany', 3100.00),
(6, 'Fiona Gallagher', NULL, 'Chicago', 'USA', 6500.00),
(7, 'George Clark', 'george@example.com', 'London', 'UK', 15000.00);

-- Populate E-Commerce Orders
INSERT IGNORE INTO ch_orders (order_id, customer_id, order_date, total_amount, order_status) VALUES
(101, 1, '2023-01-15', 350.00, 'Completed'),
(102, 1, '2023-02-20', 1200.00, 'Completed'),
(103, 2, '2023-01-18', 450.00, 'Completed'),
(104, 3, '2023-03-05', 2100.00, 'Completed'),
(105, 4, '2023-02-12', 80.00, 'Refunded'),
(106, 1, '2023-03-10', 950.00, 'Completed'),
(107, 7, '2023-03-25', 3400.00, 'Completed');

-- Populate E-Commerce Products
INSERT IGNORE INTO ch_products (product_id, product_name, category, price, stock_quantity) VALUES
(1, 'MacBook Pro 16', 'Electronics', 2499.00, 15),
(2, 'Wireless Noise-Canceling Headphones', 'Electronics', 299.99, 45),
(3, 'Ergonomic Desk Chair', 'Furniture', 450.00, 20),
(4, 'Standing Desk Converter', 'Furniture', 199.50, 8),
(5, 'USB-C Multiport Hub', 'Electronics', 49.99, 120),
(6, 'Mechanical Keyboard', 'Electronics', 129.00, 60),
(7, 'Leather Notebook Planner', 'Stationery', 24.50, 0);

-- Populate Departments
INSERT IGNORE INTO ch_departments (dept_id, dept_name, location) VALUES
(10, 'Engineering', 'San Francisco'),
(20, 'Sales & Marketing', 'New York'),
(30, 'Product & Design', 'San Francisco'),
(40, 'Human Resources', 'Chicago');

-- Populate Employees
INSERT IGNORE INTO ch_employees (emp_id, emp_name, dept_id, job_title, salary, hire_date, manager_id) VALUES
(1001, 'Sophia Chen', 10, 'VP Engineering', 185000.00, '2019-03-01', NULL),
(1002, 'Marcus Miller', 10, 'Lead Software Engineer', 145000.00, '2020-06-15', 1001),
(1003, 'Aisha Khan', 10, 'Senior Backend Dev', 135000.00, '2021-01-10', 1002),
(1004, 'David Rossi', 20, 'Sales Director', 160000.00, '2019-08-20', NULL),
(1005, 'Emma Watson', 20, 'Account Executive', 92000.00, '2021-04-12', 1004),
(1006, 'Lucas Silva', 20, 'Sales Representative', 88000.00, '2022-02-01', 1004),
(1007, 'Elena Rostova', 30, 'Head of Design', 140000.00, '2020-11-01', NULL),
(1008, 'James Wilson', 30, 'Product Designer', 98000.00, '2021-09-15', 1007),
(1009, 'Priya Patel', 40, 'HR Coordinator', 72000.00, '2022-05-10', NULL);
"""

DEFAULT_CHALLENGES = [
    # --- BEGINNER CHALLENGES ---
    {
        'title': 'High-Value Customers in Germany',
        'slug': 'high-value-customers-germany',
        'difficulty': 'beginner',
        'category': 'Filtering & Sorting',
        'description': 'The marketing team wants to launch an exclusive campaign in Germany. Retrieve the `full_name`, `city`, and `credit_limit` of all customers living in **Germany** whose `credit_limit` is greater than **5000.00**, ordered by `credit_limit` in descending order.',
        'business_context': 'Targeting high-credit international clients allows higher conversion rates for premium luxury products.',
        'dataset_name': 'E-Commerce Global',
        'target_table': 'ch_customers',
        'starter_sql': "SELECT full_name, city, credit_limit\nFROM ch_customers\nWHERE ...;",
        'solution_sql': "SELECT full_name, city, credit_limit FROM ch_customers WHERE country = 'Germany' AND credit_limit > 5000 ORDER BY credit_limit DESC;",
        'hint_1': "Use the WHERE clause with both conditions combined using the AND operator.",
        'hint_2': "Filter for `country = 'Germany'` and `credit_limit > 5000`.",
        'hint_3': "SELECT full_name, city, credit_limit FROM ch_customers WHERE country = 'Germany' AND credit_limit > 5000 ORDER BY credit_limit DESC;",
        'xp_reward': 40
    },
    {
        'title': 'Top 3 Most Expensive Products',
        'slug': 'top-3-expensive-products',
        'difficulty': 'beginner',
        'category': 'Filtering & Sorting',
        'description': 'Find the top 3 most expensive products in inventory. Output `product_name`, `category`, and `price`, ordered from highest price to lowest price.',
        'business_context': 'Merchandising managers regularly audit premium flagship items to adjust retail margin strategies.',
        'dataset_name': 'E-Commerce Global',
        'target_table': 'ch_products',
        'starter_sql': "SELECT product_name, category, price\nFROM ch_products\nORDER BY ... LIMIT ...;",
        'solution_sql': "SELECT product_name, category, price FROM ch_products ORDER BY price DESC LIMIT 3;",
        'hint_1': "Use `ORDER BY price DESC` to sort highest first, followed by `LIMIT 3`.",
        'hint_2': "The query requires ordering by `price` descending and restricting to 3 rows.",
        'hint_3': "SELECT product_name, category, price FROM ch_products ORDER BY price DESC LIMIT 3;",
        'xp_reward': 40
    },
    {
        'title': 'Customers Missing Email Addresses',
        'slug': 'customers-missing-email',
        'difficulty': 'beginner',
        'category': 'Data Quality & NULLs',
        'description': 'The CRM system requires all accounts to have valid contact information. Find all customers who do not have an email address on file. Return `customer_id`, `full_name`, and `city`.',
        'business_context': 'Missing contact data hurts deliverability and blocks account security verifications.',
        'dataset_name': 'E-Commerce Global',
        'target_table': 'ch_customers',
        'starter_sql': "SELECT customer_id, full_name, city\nFROM ch_customers\nWHERE ...;",
        'solution_sql': "SELECT customer_id, full_name, city FROM ch_customers WHERE email IS NULL;",
        'hint_1': "Remember that in SQL, NULL values cannot be checked with `= NULL`. What operator checks for missing values?",
        'hint_2': "Use the `IS NULL` operator on the `email` column.",
        'hint_3': "SELECT customer_id, full_name, city FROM ch_customers WHERE email IS NULL;",
        'xp_reward': 40
    },

    # --- INTERMEDIATE CHALLENGES ---
    {
        'title': 'Department Salary & Headcount Summary',
        'slug': 'department-salary-summary',
        'difficulty': 'intermediate',
        'category': 'Aggregations & Grouping',
        'description': 'Calculate the total headcount, total salary expenditure, and average salary for each department. Output `dept_id`, `COUNT(*) AS employee_count`, `SUM(salary) AS total_payroll`, and `ROUND(AVG(salary), 2) AS avg_salary`. Order the results by `avg_salary` in descending order.',
        'business_context': 'Financial planning requires visibility into departmental payroll distribution to budget annual merit increases.',
        'dataset_name': 'Company HR',
        'target_table': 'ch_employees',
        'starter_sql': "SELECT dept_id, COUNT(*) AS employee_count, SUM(salary) AS total_payroll, ROUND(AVG(salary), 2) AS avg_salary\nFROM ch_employees\nGROUP BY ...\nORDER BY ...;",
        'solution_sql': "SELECT dept_id, COUNT(*) AS employee_count, SUM(salary) AS total_payroll, ROUND(AVG(salary), 2) AS avg_salary FROM ch_employees GROUP BY dept_id ORDER BY avg_salary DESC;",
        'hint_1': "You need to aggregate rows by `dept_id` using the GROUP BY clause.",
        'hint_2': "Use `COUNT(*) AS employee_count`, `SUM(salary) AS total_payroll`, and `ROUND(AVG(salary), 2) AS avg_salary` with `GROUP BY dept_id`.",
        'hint_3': "SELECT dept_id, COUNT(*) AS employee_count, SUM(salary) AS total_payroll, ROUND(AVG(salary), 2) AS avg_salary FROM ch_employees GROUP BY dept_id ORDER BY avg_salary DESC;",
        'xp_reward': 70
    },
    {
        'title': 'Customer Total Spend (INNER JOIN)',
        'slug': 'customer-total-spend',
        'difficulty': 'intermediate',
        'category': 'Joins & Relationships',
        'description': 'Join `ch_customers` and `ch_orders` to find the total revenue generated from each customer who has completed orders. Output `full_name`, `country`, and `SUM(total_amount) AS total_spent`. Group by customer and order by `total_spent` descending.',
        'business_context': 'Identifying top spenders enables the VIP rewards program to offer tailored tier benefits.',
        'dataset_name': 'E-Commerce Global',
        'target_table': 'ch_customers',
        'starter_sql': "SELECT c.full_name, c.country, SUM(o.total_amount) AS total_spent\nFROM ch_customers c\nINNER JOIN ch_orders o ON c.customer_id = o.customer_id\nWHERE o.order_status = 'Completed'\nGROUP BY ...\nORDER BY ...;",
        'solution_sql': "SELECT c.full_name, c.country, SUM(o.total_amount) AS total_spent FROM ch_customers c INNER JOIN ch_orders o ON c.customer_id = o.customer_id WHERE o.order_status = 'Completed' GROUP BY c.customer_id, c.full_name, c.country ORDER BY total_spent DESC;",
        'hint_1': "Join on `c.customer_id = o.customer_id` and filter for `order_status = 'Completed'`.",
        'hint_2': "Remember to group by `c.customer_id, c.full_name, c.country` so MySQL groups each unique customer.",
        'hint_3': "SELECT c.full_name, c.country, SUM(o.total_amount) AS total_spent FROM ch_customers c INNER JOIN ch_orders o ON c.customer_id = o.customer_id WHERE o.order_status = 'Completed' GROUP BY c.customer_id, c.full_name, c.country ORDER BY total_spent DESC;",
        'xp_reward': 75
    },
    {
        'title': 'High-Headcount Departments (HAVING)',
        'slug': 'high-headcount-departments',
        'difficulty': 'intermediate',
        'category': 'Aggregations & Grouping',
        'description': 'Find all departments that have **at least 3 employees**. Return `dept_id` and `COUNT(*) AS team_size`, ordered by `team_size` descending.',
        'business_context': 'Teams exceeding certain headcount thresholds need dedicated agile project managers.',
        'dataset_name': 'Company HR',
        'target_table': 'ch_employees',
        'starter_sql': "SELECT dept_id, COUNT(*) AS team_size\nFROM ch_employees\nGROUP BY dept_id\nHAVING ...;",
        'solution_sql': "SELECT dept_id, COUNT(*) AS team_size FROM ch_employees GROUP BY dept_id HAVING COUNT(*) >= 3 ORDER BY team_size DESC;",
        'hint_1': "Use HAVING instead of WHERE because you are filtering on the aggregate result `COUNT(*)`.",
        'hint_2': "Add `HAVING COUNT(*) >= 3` after `GROUP BY dept_id`.",
        'hint_3': "SELECT dept_id, COUNT(*) AS team_size FROM ch_employees GROUP BY dept_id HAVING COUNT(*) >= 3 ORDER BY team_size DESC;",
        'xp_reward': 70
    },
    {
        'title': 'Employee Hierarchy & Managers (Self-Join)',
        'slug': 'employee-managers-hierarchy',
        'difficulty': 'intermediate',
        'category': 'Joins & Relationships',
        'description': 'Identify organizational reporting lines by pairing each employee with their direct manager. Output `e.emp_name AS employee_name`, `e.job_title`, and `m.emp_name AS manager_name`. Exclude staff who have no manager (e.g. executive leadership). Order by `manager_name` ASC, then `employee_name` ASC.',
        'business_context': 'Hierarchical self-joins are essential for org-chart modeling, approval workflows, and access control.',
        'dataset_name': 'Company HR',
        'target_table': 'ch_employees',
        'starter_sql': "SELECT e.emp_name AS employee_name, e.job_title, m.emp_name AS manager_name\nFROM ch_employees e\nINNER JOIN ch_employees m ON ...\nORDER BY ...;",
        'solution_sql': "SELECT e.emp_name AS employee_name, e.job_title, m.emp_name AS manager_name FROM ch_employees e INNER JOIN ch_employees m ON e.manager_id = m.emp_id ORDER BY manager_name ASC, employee_name ASC;",
        'hint_1': "Join `ch_employees` with itself using two aliases: `e` for employee and `m` for manager.",
        'hint_2': "Join condition is `e.manager_id = m.emp_id`.",
        'hint_3': "SELECT e.emp_name AS employee_name, e.job_title, m.emp_name AS manager_name FROM ch_employees e INNER JOIN ch_employees m ON e.manager_id = m.emp_id ORDER BY manager_name ASC, employee_name ASC;",
        'xp_reward': 80
    },

    # --- ADVANCED CHALLENGES ---
    {
        'title': 'Second Highest Salary in Company',
        'slug': 'second-highest-salary',
        'difficulty': 'advanced',
        'category': 'Subqueries & Windows',
        'description': 'A classic technical interview question! Find the **second highest distinct salary** paid to an employee in the entire company. Return a single column named `second_highest_salary`.',
        'business_context': 'Compensation benchmarking teams frequently identify percentile pay brackets without outliers.',
        'dataset_name': 'Company HR',
        'target_table': 'ch_employees',
        'starter_sql': "-- Find the second highest salary using DENSE_RANK() or Subqueries\nSELECT DISTINCT salary AS second_highest_salary\nFROM ch_employees\nORDER BY ... LIMIT ... OFFSET ...;",
        'solution_sql': "SELECT DISTINCT salary AS second_highest_salary FROM ch_employees ORDER BY salary DESC LIMIT 1 OFFSET 1;",
        'hint_1': "One fast way: select `DISTINCT salary`, sort in descending order, and use `LIMIT 1 OFFSET 1`.",
        'hint_2': "Another way is `SELECT MAX(salary) AS second_highest_salary FROM ch_employees WHERE salary < (SELECT MAX(salary) FROM ch_employees)`.",
        'hint_3': "SELECT DISTINCT salary AS second_highest_salary FROM ch_employees ORDER BY salary DESC LIMIT 1 OFFSET 1;",
        'xp_reward': 100
    },
    {
        'title': 'Top Earners Per Department (Window DENSE_RANK)',
        'slug': 'top-earners-per-department',
        'difficulty': 'advanced',
        'category': 'Window Functions',
        'description': 'Using the modern SQL Window function `DENSE_RANK()`, rank employees by salary within each department. Return `emp_name`, `dept_id`, `salary`, and `dept_salary_rank` for employees with rank 1 (the highest earner in each department).',
        'business_context': 'Identifying top performers by department is critical for equity refresh planning.',
        'dataset_name': 'Company HR',
        'target_table': 'ch_employees',
        'starter_sql': "WITH RankedEmployees AS (\n    SELECT emp_name, dept_id, salary,\n           DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS dept_salary_rank\n    FROM ch_employees\n)\nSELECT emp_name, dept_id, salary, dept_salary_rank\nFROM RankedEmployees\nWHERE dept_salary_rank = 1\nORDER BY dept_id ASC;",
        'solution_sql': "WITH RankedEmployees AS (SELECT emp_name, dept_id, salary, DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS dept_salary_rank FROM ch_employees) SELECT emp_name, dept_id, salary, dept_salary_rank FROM RankedEmployees WHERE dept_salary_rank = 1 ORDER BY dept_id ASC;",
        'hint_1': "Use a Common Table Expression (CTE) with `WITH RankedEmployees AS (...)` containing `DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC)`.",
        'hint_2': "In the outer query, filter for `WHERE dept_salary_rank = 1`.",
        'hint_3': "WITH RankedEmployees AS (SELECT emp_name, dept_id, salary, DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS dept_salary_rank FROM ch_employees) SELECT emp_name, dept_id, salary, dept_salary_rank FROM RankedEmployees WHERE dept_salary_rank = 1 ORDER BY dept_id ASC;",
        'xp_reward': 120
    }
]

LEARNING_TRACKS = [
    {
        'id': 'foundations',
        'title': 'SQL Querying Foundations',
        'difficulty': 'Beginner',
        'icon': 'BookOpen',
        'description': 'Master the bedrock of relational queries: SELECT projection, WHERE filtering, logical operators, and ORDER BY sorting.',
        'challenge_slugs': ['high-value-customers-germany', 'top-3-expensive-products', 'customers-missing-email'],
        'estimated_time': '30 mins',
        'color': 'blue'
    },
    {
        'id': 'aggregations',
        'title': 'Data Aggregations & Business Metrics',
        'difficulty': 'Intermediate',
        'icon': 'BarChart2',
        'description': 'Summarize data and extract key business metrics using COUNT, SUM, AVG, GROUP BY, and aggregate HAVING filtering.',
        'challenge_slugs': ['department-salary-summary', 'high-headcount-departments'],
        'estimated_time': '40 mins',
        'color': 'emerald'
    },
    {
        'id': 'joins',
        'title': 'Relational Joins & Data Relationships',
        'difficulty': 'Intermediate',
        'icon': 'GitMerge',
        'description': 'Master relational modeling, INNER JOINs, and hierarchical self-joins across normalized database tables.',
        'challenge_slugs': ['customer-total-spend', 'employee-managers-hierarchy'],
        'estimated_time': '45 mins',
        'color': 'indigo'
    },
    {
        'id': 'advanced-analytics',
        'title': 'Advanced Analytical SQL & Windows',
        'difficulty': 'Advanced',
        'icon': 'Zap',
        'description': 'Tackle senior technical interview challenges using CTEs, subqueries, and modern window functions like DENSE_RANK.',
        'challenge_slugs': ['second-highest-salary', 'top-earners-per-department'],
        'estimated_time': '60 mins',
        'color': 'purple'
    }
]


LEVEL_XP_THRESHOLDS = {
    'beginner': 0,
    'intermediate': 500,
    'advanced': 1000
}


class ChallengeService:
    @staticmethod
    def get_user_total_xp(user_id: int) -> int:
        """Calculate total user XP from solved challenges + contest awards."""
        if not user_id:
            return 0
        from app.models.user import User
        user = User.query.get(user_id)
        contest_xp = (user.contest_xp or 0) if user else 0

        solved_progress = UserChallengeProgress.query.filter_by(user_id=user_id, status='solved').all()
        solved_ids = {p.challenge_id for p in solved_progress}
        solved_challenges = Challenge.query.filter(Challenge.id.in_(solved_ids)).all() if solved_ids else []
        challenge_xp = sum(c.xp_reward for c in solved_challenges)

        return challenge_xp + contest_xp

    @staticmethod
    def ensure_seeded():
        """Ensure challenge schema and default challenges are seeded in MySQL."""
        try:
            is_sqlite = db.engine.dialect.name == 'sqlite'
            statements = [s.strip() for s in SEED_CHALLENGES_SQL.split(";") if s.strip()]
            for stmt in statements:
                if is_sqlite:
                    stmt = re.sub(r'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4', '', stmt, flags=re.IGNORECASE)
                    stmt = re.sub(r'\bINSERT IGNORE\b', 'INSERT OR IGNORE', stmt, flags=re.IGNORECASE)
                try:
                    db.session.execute(text(stmt))
                except Exception as ex:
                    # Ignore harmless warnings
                    pass
            db.session.commit()

            # 2. Ensure Challenge rows exist in DB
            db.create_all()
            for ch_data in DEFAULT_CHALLENGES:
                existing = Challenge.query.filter_by(slug=ch_data['slug']).first()
                if not existing:
                    new_ch = Challenge(**ch_data)
                    db.session.add(new_ch)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"[ChallengeService] Warning during seeding: {e}")

    @staticmethod
    def list_challenges(user_id=None, difficulty=None, category=None):
        """List all challenges with user completion status and XP tier lock info."""
        ChallengeService.ensure_seeded()
        query = Challenge.query

        if difficulty and difficulty.lower() != 'all':
            query = query.filter(Challenge.difficulty == difficulty.lower())

        if category and category.lower() != 'all':
            query = query.filter(Challenge.category == category)

        challenges = query.order_by(Challenge.id.asc()).all()
        user_xp = ChallengeService.get_user_total_xp(user_id) if user_id else 0

        items = []
        for c in challenges:
            c_dict = c.to_dict(user_id=user_id)
            diff = (c.difficulty or 'beginner').lower()
            required_xp = LEVEL_XP_THRESHOLDS.get(diff, 0)
            c_dict['required_xp'] = required_xp
            c_dict['is_locked'] = bool(user_xp < required_xp)
            c_dict['user_xp'] = user_xp
            items.append(c_dict)

        return items

    @staticmethod
    def get_challenge_detail(challenge_id, user_id=None):
        """Get full details for a challenge including sample preview rows and XP status."""
        ChallengeService.ensure_seeded()
        challenge = Challenge.query.get(challenge_id)
        if not challenge:
            challenge = Challenge.query.filter_by(slug=str(challenge_id)).first()
        if not challenge:
            return None

        data = challenge.to_dict(include_solution=False, user_id=user_id)
        user_xp = ChallengeService.get_user_total_xp(user_id) if user_id else 0
        diff = (challenge.difficulty or 'beginner').lower()
        required_xp = LEVEL_XP_THRESHOLDS.get(diff, 0)
        data['required_xp'] = required_xp
        data['is_locked'] = bool(user_xp < required_xp)
        data['user_xp'] = user_xp

        # Fetch sample rows from target table for in-browser inspection
        try:
            preview_stmt = text(f"SELECT * FROM `{challenge.target_table}` LIMIT 5")
            preview_res = db.session.execute(preview_stmt)
            data['sample_columns'] = list(preview_res.keys())
            data['sample_rows'] = [dict(r) for r in preview_res.mappings()]
        except Exception:
            data['sample_columns'] = []
            data['sample_rows'] = []

        return data

    @staticmethod
    def submit_solution(user_id: int, challenge_id: int, user_sql: str):
        """
        Execute user SQL, execute canonical solution SQL, compare result matrices,
        and record user progress.
        """
        ChallengeService.ensure_seeded()
        challenge = Challenge.query.get(challenge_id)
        if not challenge:
            return {'success': False, 'message': 'Challenge not found.'}

        clean_sql = (user_sql or '').strip()
        if not clean_sql:
            return {'success': False, 'message': 'SQL query cannot be empty.'}

        # XP Level Gating Check
        user_xp = ChallengeService.get_user_total_xp(user_id) if user_id else 0
        diff = (challenge.difficulty or 'beginner').lower()
        required_xp = LEVEL_XP_THRESHOLDS.get(diff, 0)
        if user_xp < required_xp:
            return {
                'success': False,
                'passed': False,
                'is_locked': True,
                'required_xp': required_xp,
                'user_xp': user_xp,
                'message': f"Level Locked: {challenge.difficulty.capitalize()} level requires {required_xp} XP to unlock. Your current XP is {user_xp}. Earn more XP in Beginner challenges or Sunday Contests!"
            }

        # 1. Safety check
        is_safe, sec_err = check_destructive_sql(clean_sql)
        if not is_safe:
            return {'success': False, 'message': sec_err, 'error': sec_err}

        # Strip SQL comments for engine execution to prevent syntax errors
        exec_user_sql = strip_sql_comments(clean_sql).strip().rstrip(';').strip()
        if not exec_user_sql:
            return {'success': False, 'message': 'Query contains only comments or whitespace.', 'error': 'No executable statement.'}

        # 2. Execute user query
        start_time = time.perf_counter()
        try:
            user_res = db.session.execute(text(exec_user_sql))
            exec_ms = round((time.perf_counter() - start_time) * 1000, 2)
            if not user_res.returns_rows:
                return {
                    'success': True,
                    'passed': False,
                    'error': 'Query did not return any rows. Solutions must be SELECT queries.',
                    'execution_time_ms': exec_ms
                }
            user_cols = [c.lower() for c in list(user_res.keys())]
            user_rows = [dict(r) for r in user_res.mappings()]
        except Exception as e:
            return {
                'success': True,
                'passed': False,
                'error': str(e),
                'execution_time_ms': 0
            }

        # 3. Execute canonical solution query
        try:
            sol_res = db.session.execute(text(challenge.solution_sql))
            expected_cols = [c.lower() for c in list(sol_res.keys())]
            expected_rows = [dict(r) for r in sol_res.mappings()]
        except Exception as e:
            return {'success': False, 'message': f'Server error running benchmark: {e}'}

        # 4. Compare Outputs
        passed = True
        diff_reason = None

        if len(user_rows) != len(expected_rows):
            passed = False
            diff_reason = f"Row count mismatch: Expected {len(expected_rows)} rows, but your query returned {len(user_rows)} rows."
        elif len(user_cols) != len(expected_cols):
            passed = False
            diff_reason = f"Column count mismatch: Expected {len(expected_cols)} columns, but got {len(user_cols)} columns."
        else:
            # Check row-by-row values
            def normalize_val(v):
                if v is None:
                    return 'NULL'
                try:
                    fv = float(v)
                    return f"{fv:.2f}".rstrip('0').rstrip('.') if '.' in f"{fv:.2f}" else str(int(fv))
                except (ValueError, TypeError):
                    return str(v).strip()

            norm_user = [[normalize_val(v) for v in r.values()] for r in user_rows]
            norm_expected = [[normalize_val(v) for v in r.values()] for r in expected_rows]

            # If user query does not contain ORDER BY, sort rows for comparison
            if 'order by' not in clean_sql.lower() and 'order by' not in challenge.solution_sql.lower():
                try:
                    norm_user = sorted(norm_user, key=lambda x: str(x))
                    norm_expected = sorted(norm_expected, key=lambda x: str(x))
                except Exception:
                    pass

            for idx, (u_row, e_row) in enumerate(zip(norm_user, norm_expected)):
                if u_row != e_row:
                    passed = False
                    diff_reason = f"Row {idx + 1} values do not match expected output."
                    break

        # 5. Record User Progress
        progress = UserChallengeProgress.query.filter_by(user_id=user_id, challenge_id=challenge.id).first()
        if not progress:
            progress = UserChallengeProgress(
                user_id=user_id,
                challenge_id=challenge.id,
                status='solved' if passed else 'started',
                submitted_sql=clean_sql,
                attempts_count=1,
                solved_at=datetime.utcnow() if passed else None
            )
            db.session.add(progress)
        else:
            progress.attempts_count += 1
            progress.submitted_sql = clean_sql
            if passed:
                progress.status = 'solved'
                if not progress.solved_at:
                    progress.solved_at = datetime.utcnow()
        db.session.commit()

        return {
            'success': True,
            'passed': passed,
            'diff_reason': diff_reason,
            'user_columns': user_cols,
            'user_rows': user_rows[:50],  # cap preview
            'user_row_count': len(user_rows),
            'expected_columns': expected_cols,
            'expected_rows': expected_rows[:50],
            'expected_row_count': len(expected_rows),
            'execution_time_ms': exec_ms,
            'xp_reward': challenge.xp_reward if passed else 0,
            'message': '🎉 Excellent! All test cases passed!' if passed else 'Incorrect output. Review the diff below and try again!'
        }

    @staticmethod
    def _calculate_streak(user_id: int) -> int:
        if not user_id:
            return 0
        today = datetime.utcnow().date()
        all_solved = UserChallengeProgress.query.filter(
            UserChallengeProgress.user_id == user_id,
            UserChallengeProgress.status == 'solved',
            UserChallengeProgress.solved_at.isnot(None)
        ).all()
        if not all_solved:
            return 0

        solved_dates = sorted({p.solved_at.date() for p in all_solved}, reverse=True)
        if not solved_dates:
            return 0

        latest_date = solved_dates[0]
        days_diff = (today - latest_date).days
        if days_diff > 1:
            return 0  # Inactive for more than 1 day

        streak = 1
        cur = latest_date
        for next_date in solved_dates[1:]:
            diff = (cur - next_date).days
            if diff == 1:
                streak += 1
                cur = next_date
            elif diff == 0:
                continue
            else:
                break
        return streak

    @staticmethod
    def get_user_learning_stats(user_id: int):
        """Aggregate user learning progress for Dashboard & Profile."""
        ChallengeService.ensure_seeded()
        total_challenges = Challenge.query.count()
        solved_progress = UserChallengeProgress.query.filter_by(user_id=user_id, status='solved').all()
        solved_ids = {p.challenge_id for p in solved_progress}
        solved_challenges = Challenge.query.filter(Challenge.id.in_(solved_ids)).all() if solved_ids else []
        solved_count = len(solved_challenges)

        # Total XP (including challenges and contest rewards)
        total_xp = ChallengeService.get_user_total_xp(user_id)

        # Real streak
        streak_days = ChallengeService._calculate_streak(user_id)

        # Category Breakdown
        categories = ['Filtering & Sorting', 'Aggregations & Grouping', 'Joins & Relationships', 'Subqueries & Windows', 'Window Functions']
        cat_stats = []
        for cat in categories:
            total_in_cat = Challenge.query.filter(Challenge.category == cat).count()
            if total_in_cat > 0:
                solved_in_cat = sum(1 for c in solved_challenges if c.category == cat)
                cat_stats.append({
                    'category': cat,
                    'solved': solved_in_cat,
                    'total': total_in_cat,
                    'percentage': round((solved_in_cat / total_in_cat) * 100)
                })

        return {
            'total_challenges': total_challenges,
            'solved_challenges': solved_count,
            'total_xp': total_xp,
            'streak_days': max(streak_days, 1 if solved_count > 0 else 0),
            'category_breakdown': cat_stats,
            'levels_status': {
                'beginner': {
                    'unlocked': True,
                    'required_xp': 0,
                    'label': 'Beginner (Free for All)'
                },
                'intermediate': {
                    'unlocked': total_xp >= 500,
                    'required_xp': 500,
                    'progress_pct': min(100, round((total_xp / 500) * 100)),
                    'label': 'Intermediate (500 XP)'
                },
                'advanced': {
                    'unlocked': total_xp >= 1000,
                    'required_xp': 1000,
                    'progress_pct': min(100, round((total_xp / 1000) * 100)),
                    'label': 'Advanced (1000 XP)'
                }
            }
        }

    @staticmethod
    def get_learning_tracks(user_id=None):
        """Return curated learning tracks with user completion metrics and XP tier info."""
        ChallengeService.ensure_seeded()
        user_xp = ChallengeService.get_user_total_xp(user_id) if user_id else 0
        all_challenges = {}
        for c in Challenge.query.all():
            c_dict = c.to_dict(user_id=user_id)
            diff = (c.difficulty or 'beginner').lower()
            req_xp = LEVEL_XP_THRESHOLDS.get(diff, 0)
            c_dict['required_xp'] = req_xp
            c_dict['is_locked'] = bool(user_xp < req_xp)
            c_dict['user_xp'] = user_xp
            all_challenges[c.slug] = c_dict

        result_tracks = []
        for track in LEARNING_TRACKS:
            track_challenges = [all_challenges[slug] for slug in track['challenge_slugs'] if slug in all_challenges]
            total = len(track_challenges)
            solved = sum(1 for c in track_challenges if c.get('is_solved'))
            percent = round((solved / total) * 100) if total > 0 else 0

            result_tracks.append({
                'id': track['id'],
                'title': track['title'],
                'difficulty': track['difficulty'],
                'icon': track['icon'],
                'description': track['description'],
                'estimated_time': track['estimated_time'],
                'color': track['color'],
                'total_challenges': total,
                'solved_challenges': solved,
                'progress_percent': percent,
                'is_completed': (total > 0 and solved == total),
                'challenges': track_challenges
            })
        return result_tracks

    @staticmethod
    def get_daily_challenge(user_id=None):
        """Fetch today's deterministically scheduled challenge and user daily streak."""
        ChallengeService.ensure_seeded()
        challenges = Challenge.query.order_by(Challenge.id.asc()).all()
        if not challenges:
            return None

        today = datetime.utcnow().date()
        today_str = today.strftime('%Y-%m-%d')
        day_index = today.timetuple().tm_yday % len(challenges)
        daily_challenge = challenges[day_index]

        is_solved_today = False
        if user_id:
            today_start = datetime.combine(today, datetime.min.time())
            solved_today_prog = UserChallengeProgress.query.filter(
                UserChallengeProgress.user_id == user_id,
                UserChallengeProgress.challenge_id == daily_challenge.id,
                UserChallengeProgress.status == 'solved',
                UserChallengeProgress.solved_at >= today_start
            ).first()
            if solved_today_prog:
                is_solved_today = True

        streak_days = ChallengeService._calculate_streak(user_id) if user_id else 0

        data = daily_challenge.to_dict(user_id=user_id)
        return {
            'challenge': data,
            'is_solved_today': is_solved_today,
            'streak_days': max(streak_days, 1 if is_solved_today else 0),
            'bonus_xp': 50,
            'date': today_str
        }

