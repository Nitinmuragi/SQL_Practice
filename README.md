# SQL PRACTICE PLATFORM

## Complete Full-Stack Project Specification & CLI Build Instructions

> **IMPORTANT:** This README is the authoritative technical specification for this project.
>
> If you are a coding agent/CLI agent reading this file, do not only explain the project. **Build the project by creating and modifying the required files, installing dependencies, running tests, fixing errors, and verifying the application.**

---

## QUICKSTART & EXECUTION GUIDE

### 1. Requirements
* **Python**: 3.10+
* **Node.js**: v18+ (tested on v22)
* **MySQL Server**: 8.0+ running locally on port 3306

### 2. Environment Configuration
Configuration is loaded from `.env` in the root and `backend/.env`:
```env
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/sql_practice
SECRET_KEY=sql_practice_secret_key_super_secure_2026_jwt_token_auth
FRONTEND_URL=http://localhost:5173
FLASK_ENV=development
PORT=5000
```
*(Note: Replace `password` with your local MySQL root password. Special characters such as `@` are URL-encoded as `%40`.)*

### 3. Database Initialization
```powershell
# Create database and seed default students table
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

### 4. Running the Backend
```powershell
# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies (if not already installed)
pip install -r backend/requirements.txt

# Start Flask API server (running on http://localhost:5000)
cd backend
python run.py
```

### 5. Running the Frontend
```powershell
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173 with Vite proxy configured to :5000
```

### 6. Running Tests
```powershell
# Backend Unit Tests (16 tests covering Auth, Datasets, Queries, Isolation, Security)
cd backend
..\venv\Scripts\python.exe -m pytest -v

# Frontend Production Build Verification
cd frontend
npm run build
```

---

# 1. PROJECT OVERVIEW

Build a complete full-stack web application named:

**SQL Practice Platform**

The application is designed for students, beginners, learners, and developers who want to practice SQL queries using their own datasets.

The core concept is:

**Create/Upload Data → Explore Tables → Build SQL Visually → Generate SQL → Execute Query → View Results → Save Query History**

This is NOT primarily a SQL theory-learning website.

The application should focus on practical SQL query practice.

Users should be able to create their own dataset manually or upload Excel/CSV data, store that data in MySQL, and practice SQL queries on the resulting tables.

---

# 2. MAIN PRODUCT GOAL

A beginner should be able to use the application without needing to manually write a complete SQL query immediately.

For example:

The user uploads:

`students.xlsx`

Containing:

| id | name  | marks | city     |
| -- | ----- | ----: | -------- |
| 1  | Rahul |    87 | Pune     |
| 2  | Priya |    92 | Mumbai   |
| 3  | Amit  |    76 | Kolhapur |

The user then selects:

Table:

`students`

Columns:

`name`, `marks`

Condition:

`marks > 80`

The application generates:

```sql
SELECT name, marks
FROM students
WHERE marks > 80;
```

When the user clicks:

**Run Query**

the backend executes the query safely and returns:

| name  | marks |
| ----- | ----: |
| Rahul |    87 |
| Priya |    92 |

The generated SQL must also be visible to the user.

This is the core experience of the application.

---

# 3. REQUIRED TECHNOLOGY STACK

Use the following stack.

## Frontend

* React
* Vite
* JavaScript
* JSX
* Tailwind CSS
* React Router
* Axios

## Backend

* Python 3.10+
* Flask
* Flask-CORS
* SQLAlchemy
* PyMySQL
* python-dotenv
* Pandas
* OpenPyXL
* Werkzeug security utilities

## Database

* MySQL

Do not replace the stack unnecessarily.

---

# 4. ARCHITECTURE

Use this architecture:

```text
React + Tailwind CSS
        |
        | REST API / JSON
        |
        v
Python + Flask
        |
        |
        v
SQLAlchemy / PyMySQL
        |
        v
MySQL
```

Frontend and backend must be separate applications.

---

# 5. REQUIRED PROJECT STRUCTURE

Create:

```text
sql-practice-platform/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── ...
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── extensions.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── dataset.py
│   │   │   └── query_history.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── datasets.py
│   │   │   ├── tables.py
│   │   │   └── queries.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── dataset_service.py
│   │   │   ├── excel_service.py
│   │   │   └── query_service.py
│   │   ├── utils/
│   │   │   ├── validators.py
│   │   │   ├── query_builder.py
│   │   │   └── security.py
│   │   └── middleware/
│   │       └── auth.py
│   │
│   ├── uploads/
│   ├── tests/
│   ├── requirements.txt
│   └── run.py
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── .env.example
├── .gitignore
├── README.md
└── docker-compose.yml
```

If additional files are required, create them.

Do not put all backend logic into one `app.py`.

Do not put the entire frontend into one React component.

---

# 6. USER FLOW

Implement this complete flow:

```text
Landing Page
     |
     v
Register
     |
     v
Login
     |
     v
Dashboard
     |
     v
SQL Practice
     |
     +----------------------+
     |                      |
     v                      v
Upload Dataset        Create Dataset
     |                      |
     +----------+-----------+
                |
                v
        Database Explorer
                |
                v
          Select Table
                |
                v
         Select Columns
                |
                v
         Add Conditions
                |
                v
          Generate SQL
                |
                v
           Run Query
                |
                v
         Query Results
                |
                v
          Query History
```

---

# 7. LANDING PAGE

Create a modern SaaS/developer-tool style landing page.

Headline:

**Practice SQL. Build Queries. Understand Databases.**

Subheadline:

**Create or upload your own dataset and practice SQL queries through an interactive visual query builder.**

Buttons:

* Start Practicing
* Login

Sections:

1. Hero
2. How It Works
3. Upload Your Data
4. Visual Query Builder
5. Execute Queries
6. Query History
7. Call to Action
8. Footer

Design:

* Professional
* Modern
* Clean
* Responsive
* Good typography
* Subtle animations
* Proper spacing
* Light/dark theme

Avoid:

* Excessive gradients
* Childish design
* Too many animations
* Huge empty areas
* Unnecessary decorative elements

---

# 8. AUTHENTICATION

Implement:

## Register

Fields:

* Full name
* Email
* Password
* Confirm password

Validate:

* Required fields
* Valid email
* Password length
* Password confirmation
* Duplicate email

Hash password securely.

Never store plain-text passwords.

---

## Login

Fields:

* Email
* Password

Authenticate against MySQL.

After login:

Redirect to:

`/dashboard`

---

## Authentication method

Use a secure authentication mechanism.

A token-based system such as JWT may be used if implemented correctly.

Store only the necessary authentication information on the frontend.

Protect all private API routes.

---

# 9. DATABASE SCHEMA

Create MySQL tables.

## users

```text
id
full_name
email
password_hash
created_at
updated_at
```

---

## datasets

```text
id
user_id
name
source_type
created_at
updated_at
```

`source_type` examples:

```text
excel
csv
manual
```

---

## dataset_tables

```text
id
dataset_id
table_name
created_at
```

---

## query_history

```text
id
user_id
dataset_id
query_text
status
error_message
execution_time
created_at
```

Use foreign keys.

Use indexes where useful.

---

# 10. USER DATA ISOLATION

This is mandatory.

User A must never be able to access User B's datasets.

Every dataset must have a `user_id`.

Every protected API endpoint must verify ownership.

Never trust a dataset ID received from the frontend.

Example:

If:

```text
GET /api/datasets/10
```

is requested, verify that dataset 10 belongs to the authenticated user.

---

# 11. DASHBOARD

Create a professional dashboard.

Sidebar:

```text
Dashboard
SQL Practice
My Databases
Query History
Profile
Settings
Logout
```

Dashboard cards:

```text
Total Databases
Total Tables
Queries Executed
Recent Activity
```

Show:

* Recent datasets
* Recent queries
* Quick Start button
* Create Dataset button
* Upload Dataset button

---

# 12. DATASET CREATION

There are two primary options.

## OPTION A — UPLOAD EXCEL/CSV

Support:

```text
.xlsx
.xls
.csv
```

Use Pandas.

Workflow:

```text
Select file
     ↓
Validate file
     ↓
Read file
     ↓
Preview data
     ↓
Enter dataset name
     ↓
Create dataset
     ↓
Create MySQL table
     ↓
Store metadata
     ↓
Open database explorer
```

Show preview:

* File name
* Number of rows
* Number of columns
* Column names
* First rows

---

# 13. FILE UPLOAD SECURITY

Validate:

* File extension
* MIME type where practical
* File size
* Empty files
* Missing column names
* Duplicate column names
* Invalid data

Set a reasonable upload size limit.

Never trust the original filename.

Never directly use uploaded filenames as SQL identifiers.

Sanitize and validate all table names.

---

# 14. MANUAL DATASET CREATION

Allow users to create tables manually.

Fields:

Dataset name

Table name

Columns:

```text
Column name
Data type
Nullable
```

Supported types:

```text
INT
VARCHAR
TEXT
FLOAT
DOUBLE
BOOLEAN
DATE
DATETIME
```

Buttons:

```text
+ Add Column
+ Add Row
Create Table
```

After table creation, allow the user to insert rows.

---

# 15. DATABASE EXPLORER

Create a database explorer UI.

Example:

```text
MY DATABASES

Student Database
    ├── students
    ├── courses
    └── exams
```

Selecting a table should display:

* Table name
* Number of rows
* Columns
* Data types
* Data preview

Example:

```text
students

id       INT
name     VARCHAR
marks    INT
city     VARCHAR
```

---

# 16. SQL PRACTICE WORKSPACE

This is the most important page.

Create a professional developer-tool workspace.

Desktop layout:

```text
---------------------------------------------------------
| Database Explorer | Query Builder                    |
|                   |                                  |
| students          | Table: [students ▼]              |
| courses           |                                  |
| exams             | Columns:                         |
|                   | [name] [marks] [+ Add]           |
|                   |                                  |
|                   | WHERE                            |
|                   | [marks ▼] [> ▼] [80]             |
|                   |                                  |
|                   | ORDER BY                         |
|                   | [marks ▼] [DESC ▼]               |
|                   |                                  |
|                   | [▶ Run Query]                    |
---------------------------------------------------------
| GENERATED SQL                                         |
| SELECT name, marks FROM students WHERE marks > 80;   |
---------------------------------------------------------
| RESULTS                                               |
| name             | marks                              |
| Rahul            | 87                                 |
| Priya            | 92                                 |
---------------------------------------------------------
```

On mobile:

Stack the sections vertically.

---

# 17. VISUAL QUERY BUILDER

Support these SQL operations.

## SELECT

Allow:

```text
*
specific columns
```

Example:

```sql
SELECT name, marks
```

---

## FROM

Allow selecting a table.

---

## WHERE

Allow conditions.

Operators:

```text
=
!=
>
<
>=
<=
LIKE
IN
IS NULL
IS NOT NULL
```

---

## AND / OR

Allow multiple conditions.

Example:

```text
marks > 80
AND
city = Pune
```

---

## ORDER BY

Support:

```text
ASC
DESC
```

---

## GROUP BY

Allow selecting grouping columns.

---

## HAVING

Allow basic conditions after grouping.

---

## LIMIT

Allow the user to set a result limit.

---

# 18. MULTIPLE TABLES

If the dataset contains multiple tables, show all available tables.

Support basic joins.

JOIN types:

```text
INNER JOIN
LEFT JOIN
RIGHT JOIN
```

Example:

```sql
SELECT students.name, courses.course_name
FROM students
INNER JOIN courses
ON students.course_id = courses.id;
```

Do not implement advanced SQL functionality unless required.

---

# 19. QUERY BUILDER INTERNAL FORMAT

Represent the query internally as structured data.

Example:

```json
{
  "table": "students",
  "columns": [
    "name",
    "marks"
  ],
  "conditions": [
    {
      "column": "marks",
      "operator": ">",
      "value": 80
    }
  ],
  "order_by": {
    "column": "marks",
    "direction": "DESC"
  },
  "limit": 100
}
```

Convert this structured representation into SQL.

---

# 20. SQL GENERATION

Generate SQL dynamically.

Example:

User selects:

```text
Table = students
Columns = name, marks
Condition = marks > 80
```

Generated SQL:

```sql
SELECT name, marks
FROM students
WHERE marks > 80;
```

Show this query clearly.

Provide:

```text
Copy SQL
```

button.

---

# 21. SAFE QUERY GENERATION

Never blindly concatenate untrusted values into SQL.

For:

* Table names
* Column names
* Operators

validate against the actual database schema and an allowlist.

For values, use parameterized queries wherever possible.

Example concept:

```text
SELECT name, marks
FROM students
WHERE marks > :value
```

with:

```text
value = 80
```

---

# 22. QUERY EXECUTION

When the user clicks:

**Run Query**

Frontend sends the structured query or safely generated query to Flask.

Backend must:

1. Authenticate user.
2. Validate dataset ownership.
3. Validate table.
4. Validate columns.
5. Validate operators.
6. Validate conditions.
7. Build safe SQL.
8. Execute query.
9. Limit result size.
10. Return result data.
11. Return column names.
12. Return execution time if available.
13. Store query history.

---

# 23. QUERY RESULTS

Display results dynamically.

Example:

```text
Query executed successfully.

Rows returned: 2

+--------+-------+
| name   | marks |
+--------+-------+
| Rahul  | 87    |
| Priya  | 92    |
+--------+-------+
```

Support:

* Responsive table
* Horizontal scrolling
* Pagination where needed
* Result count
* Empty result state
* Execution time

---

# 24. QUERY ERRORS

Never expose Python tracebacks.

Example:

```text
Query Error

Unknown column 'mark' in field list.
```

Return safe user-facing errors.

Do not expose:

* Database credentials
* Environment variables
* Internal paths
* Stack traces
* Sensitive server information

---

# 25. QUERY HISTORY

Store every executed query.

Fields:

```text
user_id
dataset_id
query_text
status
error_message
execution_time
created_at
```

History page:

```text
Recent Queries

SELECT name, marks
FROM students
WHERE marks > 80;

Status: Success
Time: ...
```

Actions:

```text
View
Copy
Re-run
```

---

# 26. SQL RESTRICTIONS

The platform is for practicing queries against user datasets.

Do not allow users to modify system/application tables.

Block destructive or administrative statements such as:

```text
DROP
TRUNCATE
ALTER
CREATE DATABASE
DROP DATABASE
GRANT
REVOKE
```

Do not allow access to:

```text
users
datasets
query_history
```

through arbitrary SQL execution unless explicitly controlled by backend logic.

Prefer a structured query builder.

If raw SQL editing is implemented later, strictly validate the allowed query scope.

---

# 27. FRONTEND COMPONENTS

Create reusable components.

Examples:

```text
Navbar
Sidebar
Button
Input
Select
Modal
Toast
LoadingSpinner
ErrorMessage
EmptyState
UploadBox
DataPreview
DatabaseExplorer
TableExplorer
QueryBuilder
ConditionBuilder
ColumnSelector
SqlViewer
ResultTable
QueryHistory
```

Do not duplicate UI code unnecessarily.

---

# 28. UI DESIGN

The UI must feel like a professional modern developer/SaaS application.

Use:

* Tailwind CSS
* Responsive layout
* Consistent spacing
* Consistent border radius
* Professional typography
* Accessible contrast
* Clear buttons
* Good form states
* Hover states
* Focus states
* Loading states
* Error states
* Empty states

Do not overuse:

* gradients
* animations
* shadows
* colors

---

# 29. DARK MODE

Implement light and dark mode.

Theme toggle:

```text
☀ Light
🌙 Dark
```

Persist preference in localStorage.

Ensure dark mode works correctly for:

* Sidebar
* Tables
* Forms
* Query builder
* SQL code block
* Modals
* Alerts

---

# 30. RESPONSIVE DESIGN

Must support:

```text
Desktop
Laptop
Tablet
Mobile
```

Do not use a fixed desktop width.

The mobile UI should remain usable.

Query builder sections should stack vertically on small screens.

Tables should support horizontal scrolling.

---

# 31. API STRUCTURE

Implement REST APIs.

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Datasets

```text
GET    /api/datasets
POST   /api/datasets
GET    /api/datasets/<id>
DELETE /api/datasets/<id>
POST   /api/datasets/upload
```

## Tables

```text
GET /api/datasets/<id>/tables
GET /api/datasets/<id>/tables/<table_name>
```

## Queries

```text
POST /api/query/execute
GET  /api/query/history
GET  /api/query/history/<id>
```

Add additional endpoints if needed.

---

# 32. API RESPONSE FORMAT

Use consistent JSON.

Success:

```json
{
  "success": true,
  "message": "Query executed successfully",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Query execution failed",
  "error": "Human readable error"
}
```

Use correct HTTP status codes.

---

# 33. BACKEND ORGANIZATION

Routes:

Handle HTTP requests.

Services:

Handle business logic.

Models:

Handle database models.

Utilities:

Handle validation and helper logic.

Middleware:

Handle authentication.

Do not mix everything together.

---

# 34. ENVIRONMENT CONFIGURATION

Create:

```text
.env.example
```

Example:

```env
DATABASE_URL=mysql+pymysql://root:password@localhost/sql_practice
SECRET_KEY=change-this-secret
FRONTEND_URL=http://localhost:5173
FLASK_ENV=development
```

Never commit `.env`.

Add:

```text
.env
```

to `.gitignore`.

---

# 35. MYSQL SETUP

The application must use MySQL.

Database:

```text
sql_practice
```

Create schema through:

```text
database/schema.sql
```

Optional sample data:

```text
database/seed.sql
```

The README must explain how to create the database.

Example:

```sql
CREATE DATABASE sql_practice;
```

---

# 36. SAMPLE DATA

Create a seed dataset.

Table:

```text
students
```

Fields:

```text
id
name
age
course
marks
city
```

Sample rows:

```text
1 | Rahul | 21 | Computer Science | 87 | Pune
2 | Priya | 22 | AI | 92 | Mumbai
3 | Amit | 20 | Data Science | 76 | Kolhapur
4 | Sneha | 21 | Computer Science | 88 | Pune
5 | Rohan | 23 | AI | 69 | Sangli
```

Allow testing:

```sql
SELECT * FROM students;

SELECT name, marks
FROM students
WHERE marks > 80;

SELECT *
FROM students
ORDER BY marks DESC;

SELECT *
FROM students
LIMIT 3;
```

---

# 37. FILE UPLOAD PROCESSING

Use:

```text
Pandas
OpenPyXL
```

Workflow:

```text
File
 ↓
Validation
 ↓
Pandas DataFrame
 ↓
Preview
 ↓
Column validation
 ↓
Table creation
 ↓
Insert data
 ↓
Metadata creation
```

Handle:

* empty datasets
* invalid headers
* duplicate headers
* unsupported values
* invalid types
* oversized files

---

# 38. DATA TYPE DETECTION

When importing Excel/CSV, detect basic types.

Examples:

```text
integer → INT
float → DOUBLE
boolean → BOOLEAN
date → DATE/DATETIME
text → VARCHAR/TEXT
```

If automatic detection is uncertain, safely fall back to a text-compatible type rather than corrupting the data.

---

# 39. SECURITY REQUIREMENTS

Implement:

* password hashing
* authentication
* authorization
* ownership checks
* SQL injection protection
* file validation
* upload size limits
* CORS restrictions
* environment variables
* safe error messages

Do not expose secrets.

Do not log passwords.

Do not return sensitive database details.

---

# 40. LOADING STATES

Implement loading states for:

```text
Login
Register
Upload
Dataset creation
Loading tables
Executing query
Loading history
Deleting dataset
```

Example:

```text
Executing Query...
```

Disable relevant buttons while an operation is in progress.

---

# 41. TOAST NOTIFICATIONS

Use professional toast notifications.

Examples:

```text
Dataset created successfully.
File uploaded successfully.
Query executed successfully.
Query copied.
Dataset deleted.
Invalid file.
Query failed.
```

---

# 42. EMPTY STATES

Create useful empty states.

Example:

```text
No datasets yet.

Upload an Excel file or create your first dataset
to start practicing SQL.

[ Upload Dataset ]
[ Create Dataset ]
```

---

# 43. ERROR HANDLING

Backend must have centralized error handling.

Handle:

```text
400
401
403
404
409
413
422
500
```

Frontend must show readable errors.

Never show raw stack traces.

---

# 44. PERFORMANCE

Do not send unlimited rows to the browser.

Use:

```text
LIMIT
pagination
server-side processing
result limits
```

Set a reasonable maximum number of returned rows.

Do not load extremely large datasets into the browser at once.

---

# 45. QUERY HISTORY LIMITS

Avoid unlimited history growth.

Implement pagination.

Sort newest first.

Allow users to view their own history only.

---

# 46. PROFILE PAGE

Create a simple profile page.

Display:

```text
Full Name
Email
Account Created
```

Allow updating name.

Do not allow changing email without appropriate validation.

---

# 47. SETTINGS PAGE

Include:

```text
Theme
Account settings
Logout
```

Keep it simple.

---

# 48. ACCESS CONTROL

Private pages:

```text
/dashboard
/sql-practice
/databases
/history
/profile
/settings
```

If unauthenticated:

Redirect to:

```text
/login
```

If authenticated:

Prevent unnecessary access to login/register pages.

---

# 49. FRONTEND ROUTES

Implement:

```text
/
 /login
 /register
 /dashboard
 /sql-practice
 /databases
 /databases/:id
 /history
 /profile
 /settings
```

---

# 50. BACKEND TESTING

Create tests for:

## Authentication

* Register
* Duplicate registration
* Login
* Invalid password
* Protected endpoint

## Dataset

* Create dataset
* List datasets
* Ownership
* Delete dataset

## Upload

* Valid Excel
* Invalid file
* Empty file
* Duplicate columns

## Query

* SELECT
* WHERE
* ORDER BY
* LIMIT
* Invalid column
* Unauthorized dataset
* Destructive query rejection

---

# 51. FRONTEND BUILD

After implementation run:

```bash
npm install
npm run build
```

Fix all build errors.

---

# 52. BACKEND VERIFICATION

Create and activate virtual environment:

Windows:

```powershell
python -m venv venv
.\venv\Scripts\activate
```

Install:

```powershell
pip install -r requirements.txt
```

Run:

```powershell
python run.py
```

---

# 53. FRONTEND VERIFICATION

From frontend:

```powershell
npm install
npm run dev
```

Expected:

```text
http://localhost:5173
```

---

# 54. BACKEND VERIFICATION

Expected:

```text
http://localhost:5000
```

Verify:

```text
GET /api/auth/me
```

and other APIs.

---

# 55. TEST THE COMPLETE FLOW

The coding agent must test this sequence:

```text
1. Open landing page
2. Register
3. Login
4. Open dashboard
5. Create dataset
6. Open dataset
7. View table
8. Open SQL Practice
9. Select table
10. Select columns
11. Add WHERE condition
12. Generate SQL
13. Run query
14. Display results
15. Save query history
16. Open history
17. Copy query
18. Re-run query
19. Logout
20. Verify protected pages are inaccessible
```

Also test Excel upload.

---

# 56. DO NOT FAKE FUNCTIONALITY

This is extremely important.

Do NOT create:

```text
fake API responses
fake database results
fake login
fake query execution
fake buttons
fake history
```

All major functionality must connect to the actual backend/database.

---

# 57. DO NOT OVERENGINEER

Do not add unnecessary technologies.

Do not introduce:

```text
Docker
Redis
Celery
Kubernetes
microservices
GraphQL
```

unless there is an actual requirement.

The initial application should remain understandable and maintainable.

---

# 58. FUTURE FEATURES

Design the architecture so these can be added later:

```text
SQL challenges
Beginner / Intermediate / Advanced levels
Progress tracking
Achievements
Leaderboards
Saved queries
AI SQL explanation
SQL hints
Query optimization explanations
PostgreSQL support
SQLite support
Query sharing
Export results
CSV export
```

Do not implement these unless required for the MVP.

---

# 59. README DOCUMENTATION

After building the application, update this README with:

```text
Project overview
Features
Tech stack
Requirements
Installation
MySQL setup
Environment variables
Backend setup
Frontend setup
Running the application
Testing
API documentation
Troubleshooting
Future improvements
```

Keep the implementation specification in this file, but add actual setup instructions after implementation.

---

# 60. CODING STYLE

Use:

* meaningful names
* modular code
* reusable functions
* reusable React components
* clear API contracts
* proper exception handling
* type-aware validation
* comments only where useful

Avoid:

* huge functions
* duplicate code
* hard-coded credentials
* hard-coded user IDs
* hard-coded query results
* unnecessary global variables

---

# 61. CLI AGENT INSTRUCTIONS

If you are a coding CLI agent reading this README:

### First

Inspect the current directory.

Determine whether this is:

1. A new project
2. An existing partially implemented project

If files already exist:

* inspect them
* preserve useful work
* do not blindly overwrite them
* integrate the new functionality

### Then

Create or update the required project structure.

### Then

Implement functionality in phases.

### Then

Install dependencies.

### Then

Run tests/builds.

### Then

Fix errors.

### Then

Verify the complete application.

---

# 62. IMPLEMENTATION PHASES

Implement in this order.

## PHASE 1

Project setup

* React
* Vite
* Tailwind
* Flask
* MySQL
* Environment configuration

## PHASE 2

Authentication

* Register
* Login
* Logout
* Protected routes

## PHASE 3

Dashboard

* Sidebar
* Statistics
* Recent activity

## PHASE 4

Dataset management

* Create dataset
* Upload Excel
* Upload CSV
* Dataset listing

## PHASE 5

Database explorer

* Tables
* Columns
* Data preview

## PHASE 6

Query builder

* SELECT
* FROM
* WHERE
* AND/OR
* ORDER BY
* LIMIT

## PHASE 7

SQL generation

* Safe query generation
* SQL display
* Copy SQL

## PHASE 8

Query execution

* Flask API
* MySQL execution
* Result handling
* Error handling

## PHASE 9

Query history

* Save
* View
* Copy
* Re-run

## PHASE 10

UI polish

* Responsive design
* Dark mode
* Loading states
* Empty states
* Error states
* Toasts

## PHASE 11

Testing

* Backend tests
* Frontend build
* Complete flow testing
* Security testing

---

# 63. FINAL ACCEPTANCE CRITERIA

The application is complete only when the following works:

### Authentication

```text
Register → Login → Dashboard → Logout
```

### Dataset

```text
Upload Excel
        ↓
Preview
        ↓
Create Dataset
        ↓
MySQL
```

### Query Builder

```text
Select Table
        ↓
Select Columns
        ↓
Add Condition
        ↓
Generate SQL
        ↓
Run Query
```

### Results

```text
MySQL
  ↓
Flask
  ↓
React
  ↓
Results Table
```

### History

```text
Executed Query
      ↓
Saved
      ↓
Query History
      ↓
Copy / Re-run
```

### Security

```text
User A
   ↓
Only User A datasets

User B
   ↓
Only User B datasets
```
