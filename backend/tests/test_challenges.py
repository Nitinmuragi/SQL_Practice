import pytest

def test_list_challenges(client, auth_headers):
    res = client.get('/api/challenges', headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()['data']
    assert len(data) >= 8
    # Verify difficulty tags present
    difficulties = {c['difficulty'] for c in data}
    assert 'beginner' in difficulties
    assert 'intermediate' in difficulties
    assert 'advanced' in difficulties


def test_get_challenge_detail(client, auth_headers):
    # Fetch first challenge
    list_res = client.get('/api/challenges', headers=auth_headers)
    ch_id = list_res.get_json()['data'][0]['id']

    res = client.get(f'/api/challenges/{ch_id}', headers=auth_headers)
    assert res.status_code == 200
    ch = res.get_json()['data']
    assert ch['id'] == ch_id
    assert 'description' in ch
    assert 'sample_columns' in ch
    assert 'hint_1' in ch


def test_submit_challenge_solution(client, auth_headers):
    # Challenge 1: High-Value Customers in Germany
    # Slug: high-value-customers-germany
    list_res = client.get('/api/challenges?difficulty=beginner', headers=auth_headers)
    ch = next(c for c in list_res.get_json()['data'] if c['slug'] == 'high-value-customers-germany')

    # 1. Correct query
    correct_sql = "SELECT full_name, city, credit_limit FROM ch_customers WHERE country = 'Germany' AND credit_limit > 5000 ORDER BY credit_limit DESC"
    res_correct = client.post(f'/api/challenges/{ch["id"]}/submit', headers=auth_headers, json={'sql': correct_sql})
    assert res_correct.status_code == 200
    data_correct = res_correct.get_json()
    print("DEBUG DATA CORRECT:", data_correct)
    assert data_correct['passed'] is True
    assert data_correct['xp_reward'] > 0

    # 2. Incorrect query (wrong filter)
    wrong_sql = "SELECT full_name, city, credit_limit FROM ch_customers WHERE country = 'UK'"
    res_wrong = client.post(f'/api/challenges/{ch["id"]}/submit', headers=auth_headers, json={'sql': wrong_sql})
    assert res_wrong.status_code == 200
    data_wrong = res_wrong.get_json()
    assert data_wrong['passed'] is False
    assert data_wrong['diff_reason'] is not None


def test_query_explain(client, auth_headers):
    query_to_explain = "SELECT c.name, COUNT(o.id) AS total_orders FROM customers c INNER JOIN orders o ON c.id = o.customer_id WHERE o.status = 'Completed' GROUP BY c.name HAVING COUNT(o.id) > 2 ORDER BY total_orders DESC LIMIT 5"
    res = client.post('/api/query/explain', headers=auth_headers, json={'sql': query_to_explain})
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert len(data['execution_steps']) == 8
    # Step 1 should be FROM & JOIN, Step 2 WHERE, Step 3 GROUP BY, etc.
    assert data['execution_steps'][0]['clause'] == 'FROM & JOIN'
    assert data['execution_steps'][1]['clause'] == 'WHERE'
    assert data['execution_steps'][2]['clause'] == 'GROUP BY'
    assert data['execution_steps'][3]['clause'] == 'HAVING'
    assert data['execution_steps'][4]['clause'] == 'SELECT & WINDOW FUNCTIONS'
    assert data['execution_steps'][6]['clause'] == 'ORDER BY'
    assert data['execution_steps'][7]['clause'] == 'LIMIT & OFFSET'
