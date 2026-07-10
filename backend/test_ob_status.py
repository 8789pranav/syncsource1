import requests, json, time

BASE = 'http://127.0.0.1:8000/api'
TS = str(int(time.time()))

r = requests.post(f'{BASE}/auth/login', json={'email': 'admin@nexushr.com', 'password': 'admin123456'})
token = r.json().get('access_token') or r.json().get('token')
H = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

passed = 0
failed = 0

def test(name, method, path, body=None):
    global passed, failed
    url = f'{BASE}{path}'
    try:
        if method == 'GET':
            r = requests.get(url, headers=H, timeout=10)
        elif method == 'POST':
            r = requests.post(url, headers=H, json=body, timeout=10)
        elif method == 'PATCH':
            r = requests.patch(url, headers=H, json=body, timeout=10)
        elif method == 'DELETE':
            r = requests.delete(url, headers=H, timeout=10)
        ok = r.status_code < 400
        if ok: passed += 1
        else: failed += 1
        data = r.json() if r.headers.get('content-type','').startswith('application/json') else {}
        status = 'PASS' if ok else 'FAIL'
        print(f'[{status}] {name}: {method} {path} -> {r.status_code}')
        if not ok:
            print(f'   Response: {json.dumps(data)[:300]}')
        return data
    except Exception as e:
        failed += 1
        print(f'[FAIL] {name}: {method} {path} -> {e}')
        return None

# 1. Create workflow
wf = test('wf_create', 'POST', '/onboarding-workflows', {
    'name': f'Status Test WF {TS}', 'code': f'WF-{TS}',
    'category': 'General', 'status': 'Active',
    'icon': 'KanbanSquare', 'color': '#10b981',
})
wf_id = wf.get('id') if wf else None

# 2. Create stages
s1 = test('stage_create_1', 'POST', f'/onboarding-workflows/{wf_id}/stages', {
    'name': 'Stage A', 'code': 'SA', 'order': 0, 'color': '#22c55e',
    'stageType': 'start', 'category': 'intake',
})
s2 = test('stage_create_2', 'POST', f'/onboarding-workflows/{wf_id}/stages', {
    'name': 'Stage B', 'code': 'SB', 'order': 1, 'color': '#0ea5e9',
    'stageType': 'standard', 'category': 'process',
})
s1_id = s1.get('id') if s1 else None
s2_id = s2.get('id') if s2 else None

# 3. Create candidate
cand = test('cand_create', 'POST', '/onboarding-candidates', {
    'candidateName': f'Test Candidate {TS}',
    'email': f'test.{TS}@example.com',
    'status': 'Active',
    'workflowId': wf_id,
    'priority': 'High',
})
cand_id = cand.get('id') if cand else None

# 4. Move candidate via PATCH (as kanban frontend do)
move_res = test('cand_move_patch', 'PATCH', f'/onboarding-candidates/{cand_id}/move', {
    'targetStageId': s2_id,
})
if move_res:
    cs = move_res.get('currentStage')
    print(f'   currentStage in response: {cs}')

# 5. Move candidate via POST (backward compat)
move_res2 = test('cand_move_post', 'POST', f'/onboarding-candidates/{cand_id}/move', {
    'stageId': s1_id,
})

# 6. Add note via POST with { body, stageId } (as kanban frontend does)
note_res = test('cand_note_post_body', 'POST', f'/onboarding-candidates/{cand_id}/notes', {
    'body': 'This is a test note',
    'stageId': s2_id,
})

# 7. Add note via POST with { note } (old format)
note_res2 = test('cand_note_post_note', 'POST', f'/onboarding-candidates/{cand_id}/notes', {
    'note': 'Another note',
})

# 8. Stage reorder via PATCH with { orderedIds } (as workflows frontend does)
if s1_id and s2_id:
    test('stage_reorder', 'PATCH', f'/onboarding-workflows/{wf_id}/stages', {
        'orderedIds': [s2_id, s1_id],  # reverse order
    })

# 9. Verify reorder worked
wf_detail = test('wf_detail_after_reorder', 'GET', f'/onboarding-workflows/{wf_id}')
if wf_detail and wf_detail.get('stages'):
    stages = wf_detail['stages']
    print(f'   Stage order after reorder: {[(s["name"], s["order"]) for s in stages]}')

# 10. Change candidate status via PATCH
test('cand_status_change', 'PATCH', f'/onboarding-candidates/{cand_id}', {'status': 'OnHold'})
test('cand_status_complete', 'PATCH', f'/onboarding-candidates/{cand_id}', {'status': 'Completed'})

# 11. Verify status in detail
cand_detail = test('cand_detail_status', 'GET', f'/onboarding-candidates/{cand_id}')
if cand_detail:
    print(f'   Final status: {cand_detail.get("status")}')

# 12. Dashboard status counts
dash = test('dashboard', 'GET', '/onboarding-dashboard')
if dash and dash.get('cards'):
    c = dash['cards']
    print(f'   Dashboard: total={c["totalCandidates"]}, active={c["onboardingInitiated"]}, completed={c["completedOnboarding"]}')

# Cleanup
print()
print('=== CLEANUP ===')
if cand_id: test('cleanup_cand', 'DELETE', f'/onboarding-candidates/{cand_id}')
if wf_id: test('cleanup_wf', 'DELETE', f'/onboarding-workflows/{wf_id}')

print()
print(f'Status tests: {passed} passed, {failed} failed')
