def test_register_success(client):
    res = client.post('/api/auth/register', json={
        'full_name': 'Jane Doe',
        'email': 'jane@example.com',
        'password': 'Password123!',
        'confirm_password': 'Password123!'
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert 'token' in data['data']
    assert data['data']['user']['email'] == 'jane@example.com'


def test_register_duplicate(client):
    client.post('/api/auth/register', json={
        'full_name': 'Jane Doe',
        'email': 'duplicate@example.com',
        'password': 'Password123!',
        'confirm_password': 'Password123!'
    })
    res = client.post('/api/auth/register', json={
        'full_name': 'Jane Doe',
        'email': 'duplicate@example.com',
        'password': 'Password123!',
        'confirm_password': 'Password123!'
    })
    assert res.status_code == 409
    assert res.get_json()['success'] is False


def test_login_success(client):
    client.post('/api/auth/register', json={
        'full_name': 'John Doe',
        'email': 'john@example.com',
        'password': 'Password123!',
        'confirm_password': 'Password123!'
    })
    res = client.post('/api/auth/login', json={
        'email': 'john@example.com',
        'password': 'Password123!'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert 'token' in data['data']


def test_login_invalid_password(client):
    client.post('/api/auth/register', json={
        'full_name': 'John Doe',
        'email': 'john_wrong@example.com',
        'password': 'Password123!',
        'confirm_password': 'Password123!'
    })
    res = client.post('/api/auth/login', json={
        'email': 'john_wrong@example.com',
        'password': 'WrongPassword123!'
    })
    assert res.status_code == 401
    assert res.get_json()['success'] is False


def test_protected_me_endpoint(client, auth_headers):
    # Without token
    res_no_auth = client.get('/api/auth/me')
    assert res_no_auth.status_code == 401

    # With valid token
    res = client.get('/api/auth/me', headers=auth_headers)
    assert res.status_code == 200
    assert res.get_json()['data']['user']['email'] == 'test@example.com'
