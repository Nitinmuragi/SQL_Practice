from app.services.challenge_service import ChallengeService

def test_admin_access_control(client, auth_headers, admin_headers):
    # 1. Regular student should get 403 Forbidden
    res_regular = client.get('/api/admin/challenges', headers=auth_headers)
    assert res_regular.status_code == 403
    assert res_regular.get_json()['success'] is False

    # 2. Administrator should get 200 OK
    res_admin = client.get('/api/admin/challenges', headers=admin_headers)
    assert res_admin.status_code == 200
    assert res_admin.get_json()['success'] is True


def test_admin_validate_solution_sql(client, admin_headers):
    ChallengeService.ensure_seeded()

    # Valid query
    res_valid = client.post('/api/admin/challenges/validate', headers=admin_headers, json={
        'solution_sql': 'SELECT customer_id, full_name FROM ch_customers WHERE city = "Berlin";',
        'target_table': 'ch_customers'
    })
    assert res_valid.status_code == 200
    data = res_valid.get_json()
    assert data['success'] is True
    assert 'customer_id' in data['columns']
    assert data['total_rows'] >= 1

    # Invalid query (syntax error)
    res_invalid = client.post('/api/admin/challenges/validate', headers=admin_headers, json={
        'solution_sql': 'SELECT * FORM non_existent_table;',
        'target_table': 'ch_customers'
    })
    assert res_invalid.status_code == 400
    assert res_invalid.get_json()['success'] is False


def test_dynamic_challenge_crud_and_learner_visibility(client, auth_headers, admin_headers):
    ChallengeService.ensure_seeded()

    # 1. Admin creates a dynamic challenge
    new_challenge_payload = {
        'title': 'Dynamic Berlin Customers Search',
        'difficulty': 'beginner',
        'category': 'Filtering & Sorting',
        'description': 'Find all customers who reside in Berlin.',
        'business_context': 'Targeted regional marketing.',
        'dataset_name': 'E-Commerce Global',
        'target_table': 'ch_customers',
        'starter_sql': 'SELECT * FROM ch_customers WHERE ...',
        'solution_sql': "SELECT * FROM ch_customers WHERE city = 'Berlin';",
        'hint_1': 'Filter by city column',
        'hint_2': "Use city = 'Berlin'",
        'hint_3': "SELECT * FROM ch_customers WHERE city = 'Berlin';",
        'xp_reward': 60
    }

    create_res = client.post('/api/admin/challenges', headers=admin_headers, json=new_challenge_payload)
    assert create_res.status_code == 201
    created_data = create_res.get_json()['data']
    created_id = created_data['id']
    assert created_data['title'] == 'Dynamic Berlin Customers Search'
    assert created_data['solution_sql'] == "SELECT * FROM ch_customers WHERE city = 'Berlin';"

    # 2. Verify challenge immediately appears in learner challenge list!
    learner_res = client.get('/api/challenges', headers=auth_headers)
    assert learner_res.status_code == 200
    learner_challenges = learner_res.get_json()['data']
    found = next((c for c in learner_challenges if c['id'] == created_id), None)
    assert found is not None
    assert found['title'] == 'Dynamic Berlin Customers Search'
    assert found['xp_reward'] == 60
    # Note: canonical solution must NOT be leaked to learner
    assert 'solution_sql' not in found

    # 3. Learner submits solution to this newly created dynamic challenge
    submit_res = client.post(f'/api/challenges/{created_id}/submit', headers=auth_headers, json={
        'sql': "SELECT * FROM ch_customers WHERE city = 'Berlin';"
    })
    assert submit_res.status_code == 200
    assert submit_res.get_json()['passed'] is True
    assert submit_res.get_json()['xp_reward'] == 60

    # 4. Admin updates challenge details
    update_res = client.put(f'/api/admin/challenges/{created_id}', headers=admin_headers, json={
        'title': 'Updated Berlin Search Title',
        'xp_reward': 75
    })
    assert update_res.status_code == 200
    assert update_res.get_json()['data']['title'] == 'Updated Berlin Search Title'
    assert update_res.get_json()['data']['xp_reward'] == 75

    # 5. Admin deletes the challenge
    delete_res = client.delete(f'/api/admin/challenges/{created_id}', headers=admin_headers)
    assert delete_res.status_code == 200

    # Verify learner no longer sees it
    learner_res_after = client.get('/api/challenges', headers=auth_headers)
    assert not any(c['id'] == created_id for c in learner_res_after.get_json()['data'])
