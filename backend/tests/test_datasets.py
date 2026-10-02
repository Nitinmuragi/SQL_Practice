import io

def test_create_manual_dataset(client, auth_headers):
    res = client.post('/api/datasets', headers=auth_headers, json={
        'name': 'Student Scores',
        'table_name': 'scores',
        'columns': [
            {'name': 'student_name', 'type': 'VARCHAR', 'nullable': False},
            {'name': 'score', 'type': 'INT', 'nullable': True}
        ],
        'rows': [
            {'student_name': 'Alice', 'score': 95},
            {'student_name': 'Bob', 'score': 82}
        ]
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert data['data']['dataset']['name'] == 'Student Scores'
    assert data['data']['row_count'] == 2


def test_list_datasets(client, auth_headers):
    res = client.get('/api/datasets', headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.get_json()['data'], list)


def test_dataset_user_isolation(client, auth_headers, other_user_headers):
    # User 1 creates dataset
    res = client.post('/api/datasets', headers=auth_headers, json={
        'name': 'User 1 Private Data',
        'table_name': 'private_info',
        'columns': [{'name': 'secret', 'type': 'VARCHAR'}]
    })
    ds_id = res.get_json()['data']['dataset']['id']

    # User 2 attempts to get User 1's dataset
    res_unauth = client.get(f'/api/datasets/{ds_id}', headers=other_user_headers)
    assert res_unauth.status_code == 404

    # User 2 attempts to delete User 1's dataset
    res_del = client.delete(f'/api/datasets/{ds_id}', headers=other_user_headers)
    assert res_del.status_code == 404


def test_upload_csv_dataset(client, auth_headers):
    csv_content = b"name,age,city\nAnanya,24,Delhi\nVikram,29,Bangalore\n"
    data = {
        'name': 'Uploaded Employees',
        'file': (io.BytesIO(csv_content), 'employees.csv')
    }
    res = client.post('/api/datasets/upload', headers=auth_headers, data=data, content_type='multipart/form-data')
    assert res.status_code == 201
    assert res.get_json()['success'] is True


def test_upload_invalid_file(client, auth_headers):
    data = {
        'file': (io.BytesIO(b"bad content"), 'test.exe')
    }
    res = client.post('/api/datasets/upload', headers=auth_headers, data=data, content_type='multipart/form-data')
    assert res.status_code == 400


def test_add_table_to_existing_dataset(client, auth_headers):
    # 1. Create dataset with primary table 'students'
    res = client.post('/api/datasets', headers=auth_headers, json={
        'name': 'University System',
        'table_name': 'students',
        'columns': [
            {'name': 'id', 'type': 'INT', 'nullable': False},
            {'name': 'name', 'type': 'VARCHAR', 'nullable': False}
        ],
        'rows': [
            {'id': 1, 'name': 'John'},
            {'id': 2, 'name': 'Jane'}
        ]
    })
    assert res.status_code == 201
    dataset_id = res.get_json()['data']['dataset']['id']

    # 2. Add second table 'courses' to same dataset
    res2 = client.post(f'/api/datasets/{dataset_id}/tables', headers=auth_headers, json={
        'table_name': 'courses',
        'columns': [
            {'name': 'course_id', 'type': 'INT', 'nullable': False},
            {'name': 'student_id', 'type': 'INT', 'nullable': False},
            {'name': 'title', 'type': 'VARCHAR', 'nullable': False}
        ],
        'rows': [
            {'course_id': 101, 'student_id': 1, 'title': 'Computer Science'},
            {'course_id': 102, 'student_id': 2, 'title': 'Data Structures'}
        ]
    })
    assert res2.status_code == 201
    data2 = res2.get_json()
    assert data2['success'] is True
    assert data2['data']['table']['table_name'] == 'courses'
    assert len(data2['data']['dataset']['tables']) == 2

    # 3. Upload CSV as 3rd table 'grades' to same dataset
    csv_content = b"student_id,grade\n1,A\n2,B+\n"
    res3 = client.post(f'/api/datasets/{dataset_id}/tables/upload', headers=auth_headers, data={
        'table_name': 'grades',
        'file': (io.BytesIO(csv_content), 'grades.csv')
    }, content_type='multipart/form-data')
    assert res3.status_code == 201
    data3 = res3.get_json()
    assert data3['success'] is True
    assert data3['data']['table']['table_name'] == 'grades'
    assert len(data3['data']['dataset']['tables']) == 3

    # 4. Verify query with JOIN between students and courses
    join_query_res = client.post('/api/query/execute', headers=auth_headers, json={
        'dataset_id': dataset_id,
        'sql': 'SELECT students.name, courses.title FROM students INNER JOIN courses ON students.id = courses.student_id'
    })
    assert join_query_res.status_code == 200
    join_data = join_query_res.get_json()
    assert join_data['success'] is True
    assert len(join_data['data']['rows']) == 2


def test_load_sample_dataset(client, auth_headers):
    """Verify 1-click loading of multi-table sample datasets."""
    res = client.post('/api/datasets/load-sample', headers=auth_headers, json={
        'sample_key': 'ecommerce'
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert data['data']['tables_created'] == 3
    dataset = data['data']['dataset']
    assert dataset['name'] == 'E-Commerce Global Store'
    assert len(dataset['tables']) == 3


