import pytest
from app.models.user import User
from app.models.certificate import Certificate

def test_tracks_and_daily_challenge(client, auth_headers):
    # Test tracks
    res = client.get('/api/challenges/tracks', headers=auth_headers)
    assert res.status_code == 200
    tracks = res.json.get('data')
    assert isinstance(tracks, list)
    assert len(tracks) >= 4
    track_ids = [t['id'] for t in tracks]
    assert 'foundations' in track_ids
    assert 'aggregations' in track_ids
    assert 'joins' in track_ids
    assert 'advanced-analytics' in track_ids

    # Test daily challenge
    daily_res = client.get('/api/challenges/daily', headers=auth_headers)
    assert daily_res.status_code == 200
    daily_data = daily_res.json.get('data')
    assert 'challenge' in daily_data
    assert 'streak_days' in daily_data
    assert 'bonus_xp' in daily_data
    assert daily_data['bonus_xp'] == 50

def test_assessment_flow_and_certificate(client, auth_headers):
    # 1. Fetch assessments list
    list_res = client.get('/api/assessment', headers=auth_headers)
    assert list_res.status_code == 200
    assessments = list_res.json.get('data')
    assert len(assessments) >= 3

    # Check level filtering
    adv_res = client.get('/api/assessment?level=advanced', headers=auth_headers)
    assert adv_res.status_code == 200
    adv_assessments = adv_res.json.get('data')
    assert all(a['level'] == 'advanced' for a in adv_assessments)

    # 2. Fetch specific assessment detail (Beginner)
    beginner_assessments = [a for a in assessments if a['level'] == 'beginner']
    assert len(beginner_assessments) >= 1
    target_id = beginner_assessments[0]['id']
    detail_res = client.get(f'/api/assessment/{target_id}', headers=auth_headers)
    assert detail_res.status_code == 200
    detail = detail_res.json.get('data')
    questions = detail.get('questions', [])
    assert len(questions) == 5

    # 3. Submit answers to target assessment
    # Beginner answers: [1, 0, 0, 1, 1]
    answers = {
        str(questions[0]['id']): 1,
        str(questions[1]['id']): 0,
        str(questions[2]['id']): 0,
        str(questions[3]['id']): 1,
        str(questions[4]['id']): 1,
    }
    submit_res = client.post(f'/api/assessment/{target_id}/submit', headers=auth_headers, json={'answers': answers})
    assert submit_res.status_code == 200
    data = submit_res.json
    assert data['passed'] is True
    assert data['score_percent'] == 100
    assert data['certificate'] is not None
    assert 'certificate_code' in data['certificate']

    # 4. Check user certificates endpoint
    certs_res = client.get('/api/assessment/my-certificates', headers=auth_headers)
    assert certs_res.status_code == 200
    certs_data = certs_res.json.get('data')
    assert len(certs_data) >= 1
    assert certs_data[0]['score_percent'] == 100

def test_admin_assessment_crud(client, admin_headers):
    # 1. Admin list all assessments
    list_res = client.get('/api/admin/assessments', headers=admin_headers)
    assert list_res.status_code == 200
    data = list_res.json.get('data')
    assert len(data) >= 3

    # 2. Admin creates a new custom Advanced Assessment Set #2
    new_assessment = {
        'title': 'Advanced SQL Mastery: Set #2 (CTEs & Subqueries)',
        'level': 'advanced',
        'description': 'Admin generated assessment testing deep analytical subqueries.',
        'passing_score': 80,
        'time_limit_minutes': 30,
        'questions': [
            {
                'category': 'CTEs',
                'question_text': 'What keyword starts a Common Table Expression?',
                'option_a': 'WITH',
                'option_b': 'START',
                'option_c': 'BEGIN',
                'option_d': 'SET',
                'correct_option': 0,
                'explanation': 'A CTE begins with the WITH keyword.'
            },
            {
                'category': 'Window Functions',
                'question_text': 'Which clause defines the grouping inside OVER()?',
                'option_a': 'GROUP BY',
                'option_b': 'PARTITION BY',
                'option_c': 'SPLIT BY',
                'option_d': 'SEGMENT BY',
                'correct_option': 1,
                'explanation': 'PARTITION BY subdivides rows for window calculation.'
            }
        ]
    }
    create_res = client.post('/api/admin/assessments', headers=admin_headers, json=new_assessment)
    assert create_res.status_code == 201
    created = create_res.json.get('data')
    created_id = created['id']
    assert created['title'] == new_assessment['title']
    assert len(created['questions']) == 2

    # 3. Admin updates assessment
    update_res = client.put(f'/api/admin/assessments/{created_id}', headers=admin_headers, json={
        'title': 'Advanced SQL Mastery: Set #2 (Updated)',
        'passing_score': 85
    })
    assert update_res.status_code == 200
    updated = update_res.json.get('data')
    assert updated['title'] == 'Advanced SQL Mastery: Set #2 (Updated)'
    assert updated['passing_score'] == 85

    # 4. Admin deletes assessment
    del_res = client.delete(f'/api/admin/assessments/{created_id}', headers=admin_headers)
    assert del_res.status_code == 200
    assert del_res.json.get('success') is True

