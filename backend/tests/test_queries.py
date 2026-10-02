def setup_test_dataset(client, auth_headers):
    res = client.post('/api/datasets', headers=auth_headers, json={
        'name': 'Practice DB',
        'table_name': 'students',
        'columns': [
            {'name': 'name', 'type': 'VARCHAR'},
            {'name': 'marks', 'type': 'INT'},
            {'name': 'city', 'type': 'VARCHAR'}
        ],
        'rows': [
            {'name': 'Rahul', 'marks': 87, 'city': 'Pune'},
            {'name': 'Priya', 'marks': 92, 'city': 'Mumbai'},
            {'name': 'Amit', 'marks': 76, 'city': 'Kolhapur'}
        ]
    })
    return res.get_json()['data']['dataset']['id']


def test_query_select_all(client, auth_headers):
    ds_id = setup_test_dataset(client, auth_headers)
    res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'table': 'students',
            'columns': ['*']
        }
    })
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['success'] is True
    assert data['row_count'] == 3
    assert 'name' in data['columns']


def test_query_where_condition(client, auth_headers):
    ds_id = setup_test_dataset(client, auth_headers)
    res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'table': 'students',
            'columns': ['name', 'marks'],
            'conditions': [
                {'column': 'marks', 'operator': '>', 'value': 80}
            ]
        }
    })
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['success'] is True
    assert data['row_count'] == 2  # Rahul (87) and Priya (92)


def test_query_order_by_limit(client, auth_headers):
    ds_id = setup_test_dataset(client, auth_headers)
    res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'table': 'students',
            'columns': ['name', 'marks'],
            'order_by': {'column': 'marks', 'direction': 'DESC'},
            'limit': 1
        }
    })
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['row_count'] == 1
    assert data['rows'][0]['name'] == 'Priya'


def test_query_invalid_column(client, auth_headers):
    ds_id = setup_test_dataset(client, auth_headers)
    res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'table': 'students',
            'columns': ['non_existent_column']
        }
    })
    assert res.status_code == 400
    assert res.get_json()['success'] is False


def test_query_unauthorized_dataset(client, other_user_headers):
    # Try executing query on non-owned dataset ID
    res = client.post('/api/query/execute', headers=other_user_headers, json={
        'dataset_id': 99999,
        'query_spec': {
            'table': 'students',
            'columns': ['*']
        }
    })
    assert res.status_code == 400 or res.status_code == 404
    assert res.get_json()['success'] is False


def test_destructive_query_rejected(client, auth_headers):
    ds_id = setup_test_dataset(client, auth_headers)
    res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'raw_sql': 'DROP TABLE students;'
    })
    assert res.status_code == 400
    assert res.get_json()['success'] is False


def test_dml_insert_update_delete(client, auth_headers):
    ds_id = setup_test_dataset(client, auth_headers)

    # 1. INSERT
    res_insert = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'operation': 'INSERT',
            'table': 'students',
            'insert_data': {
                'name': 'Ananya',
                'marks': 95,
                'city': 'Delhi'
            }
        }
    })
    assert res_insert.status_code == 200
    data_insert = res_insert.get_json()['data']
    assert data_insert['success'] is True
    assert data_insert['affected_rows'] == 1

    # Verify via SELECT
    res_select = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'operation': 'SELECT',
            'table': 'students',
            'columns': ['*']
        }
    })
    assert res_select.get_json()['data']['row_count'] == 4

    # 2. UPDATE
    res_update = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'operation': 'UPDATE',
            'table': 'students',
            'update_data': {
                'marks': 99
            },
            'conditions': [
                {'column': 'name', 'operator': '=', 'value': 'Ananya'}
            ]
        }
    })
    assert res_update.status_code == 200
    assert res_update.get_json()['data']['affected_rows'] == 1

    # Verify update
    res_verify = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'table': 'students',
            'columns': ['marks'],
            'conditions': [{'column': 'name', 'operator': '=', 'value': 'Ananya'}]
        }
    })
    assert res_verify.get_json()['data']['rows'][0]['marks'] == 99

    # 3. DELETE
    res_delete = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'operation': 'DELETE',
            'table': 'students',
            'conditions': [
                {'column': 'name', 'operator': '=', 'value': 'Ananya'}
            ]
        }
    })
    assert res_delete.status_code == 200
    assert res_delete.get_json()['data']['affected_rows'] == 1

    # Verify count is back to 3
    res_count = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'table': 'students',
            'columns': ['*']
        }
    })
    assert res_count.get_json()['data']['row_count'] == 3


def test_query_between_and_in(client, auth_headers):
    ds_id = setup_test_dataset(client, auth_headers)

    # BETWEEN
    res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'table': 'students',
            'columns': ['name', 'marks'],
            'conditions': [
                {'column': 'marks', 'operator': 'BETWEEN', 'value': [80, 90]}
            ]
        }
    })
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['row_count'] == 1
    assert data['rows'][0]['name'] == 'Rahul'

    # IN
    res_in = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'table': 'students',
            'columns': ['name'],
            'conditions': [
                {'column': 'city', 'operator': 'IN', 'value': ['Mumbai', 'Kolhapur']}
            ]
        }
    })
    assert res_in.status_code == 200
    assert res_in.get_json()['data']['row_count'] == 2


def test_query_aggregates_group_by_having(client, auth_headers):
    ds_id = setup_test_dataset(client, auth_headers)
    res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'table': 'students',
            'columns': ['city'],
            'aggregates': [
                {'function': 'COUNT', 'column': '*', 'alias': 'total_students'},
                {'function': 'AVG', 'column': 'marks', 'alias': 'avg_marks'}
            ],
            'group_by': ['city'],
            'having': [
                {'column': 'AVG(marks)', 'operator': '>', 'value': 80}
            ]
        }
    })
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['success'] is True
    # Pune (87) and Mumbai (92) should match (> 80), Kolhapur (76) should not
    assert data['row_count'] == 2
    cities = {r['city'] for r in data['rows']}
    assert cities == {'Pune', 'Mumbai'}


def test_query_functions(client, auth_headers):
    ds_id = setup_test_dataset(client, auth_headers)
    res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'table': 'students',
            'columns': ['name'],
            'functions': [
                {
                    'type': 'IFNULL',
                    'column': 'city',
                    'fallback': 'Unknown',
                    'alias': 'clean_city'
                },
                {
                    'type': 'CASE',
                    'when_clauses': [
                        {'condition': {'column': 'marks', 'operator': '>=', 'value': 90}, 'then': 'A'},
                        {'condition': {'column': 'marks', 'operator': '>=', 'value': 80}, 'then': 'B'}
                    ],
                    'else_value': 'C',
                    'alias': 'grade'
                }
            ]
        }
    })
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['success'] is True
    assert 'clean_city' in data['columns']
    assert 'grade' in data['columns']
    row_priya = next(r for r in data['rows'] if r['name'] == 'Priya')
    assert row_priya['grade'] == 'A'
    row_rahul = next(r for r in data['rows'] if r['name'] == 'Rahul')
    assert row_rahul['grade'] == 'B'


def test_query_joins_builder_and_case_insensitivity(client, auth_headers):
    ds_id = setup_test_dataset(client, auth_headers)

    # Add second table 'courses'
    add_res = client.post(f'/api/datasets/{ds_id}/tables', headers=auth_headers, json={
        'table_name': 'courses',
        'columns': [
            {'name': 'course_id', 'type': 'INTEGER', 'nullable': False},
            {'name': 'course_name', 'type': 'VARCHAR(100)', 'nullable': False},
            {'name': 'student_name', 'type': 'VARCHAR(100)', 'nullable': True}
        ],
        'rows': [
            {'course_id': 101, 'course_name': 'Math', 'student_name': 'Rahul'},
            {'course_id': 102, 'course_name': 'Science', 'student_name': 'Priya'}
        ]
    })
    assert add_res.status_code == 201

    # 1. Test Query Builder with INNER JOIN and mixed case references (Students.name, courses.student_name)
    join_res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'table': 'Students',
            'columns': ['Students.name', 'courses.course_name'],
            'joins': [
                {
                    'type': 'INNER JOIN',
                    'table': 'courses',
                    'left_on': 'Students.name',
                    'right_on': 'courses.student_name'
                }
            ]
        }
    })
    assert join_res.status_code == 200
    join_data = join_res.get_json()['data']
    assert join_data['success'] is True
    assert join_data['row_count'] == 2

    # 2. Test SELF JOIN on students (e.g. comparing students)
    self_res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'table': 'students',
            'columns': ['name'],
            'joins': [
                {
                    'type': 'SELF JOIN',
                    'table': 'students',
                    'left_on': 'students.name',
                    'right_on': 'students.name'
                }
            ]
        }
    })
    assert self_res.status_code == 200
    self_data = self_res.get_json()['data']
    assert self_data['success'] is True
    assert self_data['row_count'] == 3


def test_raw_sql_with_backticks(client, auth_headers):
    ds_id = setup_test_dataset(client, auth_headers)
    res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'raw_sql': 'SELECT * FROM `students` LIMIT 20;'
    })
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['success'] is True
    assert data['row_count'] == 3


def test_raw_sql_sample_template_count(client, auth_headers):
    ds_id = setup_test_dataset(client, auth_headers)
    res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'raw_sql': 'SELECT COUNT(*) AS total_records FROM `students`;'
    })
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['success'] is True
    assert data['row_count'] == 1
    assert data['rows'][0]['total_records'] == 3


def test_raw_sql_inside_query_spec_fallback(client, auth_headers):
    ds_id = setup_test_dataset(client, auth_headers)
    res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'query_spec': {
            'raw_sql': 'SELECT name, marks FROM students WHERE marks > 80;'
        }
    })
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['success'] is True
    assert data['row_count'] == 2


def test_raw_sql_with_multi_dash_comment_after_semicolon(client, auth_headers):
    """Verify that queries with trailing multi-dash comments like '----comment' succeed."""
    ds_id = setup_test_dataset(client, auth_headers)
    res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'raw_sql': "SELECT * FROM `students` LIMIT 20;\n----comment"
    })
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['success'] is True
    assert data['row_count'] == 3


def test_raw_sql_with_header_and_inline_block_comments(client, auth_headers):
    """Verify that queries with leading comments, block comments, and hash comments execute safely."""
    ds_id = setup_test_dataset(client, auth_headers)
    res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': ds_id,
        'raw_sql': "-- Header comment\n/* block comment */ SELECT * FROM students WHERE marks >= 76; # hash comment"
    })
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['success'] is True
    assert data['row_count'] == 3




