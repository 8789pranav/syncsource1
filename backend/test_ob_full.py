import requests, json, time

BASE = 'http://127.0.0.1:8000/api'
TS = str(int(time.time()))

r = requests.post(f'{BASE}/auth/login', json={'email': 'admin@nexhubr.com', 'password': 'admin123456'})
if r.status_code >= 400:
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

# 1. Create workflow WITH preset stages
wf = test('wf_create_with_stages', 'POST', '/onboarding-workflows', {
    'name': f'Full Test WF {TS}', 'code': f'WF-{TS}',
    'category': 'General', 'status': 'Active',
    'icon': 'KanbanSquare', 'color': '#10b981',
    'stages': [
        {'name': 'Stage A', 'code': 'SA', 'color': '#22c55e', 'stageType': 'start', 'category': 'intake', 'slaDays': 1, 'isMilestone': False, 'isRequired': True},
        {'name': 'Stage B', 'code': 'SB', 'color': '#0ea5e9', 'stageType': 'standard', 'category': 'process', 'slaDays': 3, 'isMilestone': False, 'isRequired': True},
        {'name': 'Stage C', 'code': 'SC', 'color': '#10b981', 'stageType': 'end', 'category': 'completion', 'slaDays': 1, 'isMilestone': True, 'isRequired': True},
    ],
})
wf_id = wf.get('id') if wf else None

# 2. Verify stages were created
wf_detail = test('wf_detail_check_stages', 'GET', f'/onboarding-workflows/{wf_id}')
if wf_detail:
    stages = wf_detail.get('stages', [])
    print(f'   Stages created: {len(stages)} -> {[s["name"] for s in stages]}')
    s1_id = stages[0]['id'] if len(stages) > 0 else None
    s2_id = stages[1]['id'] if len(stages) > 1 else None
else:
    s1_id = s2_id = None

# 3. Stage task template - POST
task1 = test('stage_task_create', 'POST', f'/onboarding-workflows/{wf_id}/stages/{s1_id}/tasks', {
    'title': 'Setup Email Account',
    'daysFromStage': 0,
    'priority': 'High',
    'isBlocking': True,
    'category': 'IT Setup',
    'order': 0,
})
task1_id = task1.get('id') if task1 else None

# 4. Stage task template - POST another
task2 = test('stage_task_create_2', 'POST', f'/onboarding-workflows/{wf_id}/stages/{s1_id}/tasks', {
    'title': 'Sign Offer Letter',
    'daysFromStage': 1,
    'priority': 'Medium',
    'isBlocking': False,
    'category': 'Documentation',
    'order': 1,
})
task2_id = task2.get('id') if task2 else None

# 5. Stage task template - GET (list)
tasks_list = test('stage_task_list', 'GET', f'/onboarding-workflows/{wf_id}/stages/{s1_id}/tasks')
if tasks_list:
    print(f'   Task templates: {len(tasks_list.get("items", []))}')

# 6. Stage task template - DELETE
if task1_id:
    test('stage_task_delete', 'DELETE', f'/onboarding-workflows/{wf_id}/stages/{s1_id}/tasks/{task1_id}')

# 7. Stage reorder
if s1_id and s2_id:
    test('stage_reorder', 'PATCH', f'/onboarding-workflows/{wf_id}/stages', {
        'orderedIds': [s2_id, s1_id],
    })

# 8. Create candidate
cand = test('cand_create', 'POST', '/onboarding-candidates', {
    'candidateName': f'Test Candidate {TS}',
    'email': f'test.{TS}@example.com',
    'status': 'Active',
    'workflowId': wf_id,
    'priority': 'High',
})
cand_id = cand.get('id') if cand else None

# 9. Move candidate via PATCH (kanban frontend)
move_res = test('cand_move_patch', 'PATCH', f'/onboarding-candidates/{cand_id}/move', {
    'targetStageId': s2_id,
})
if move_res:
    print(f'   currentStage: {move_res.get("currentStage")}')

# 10. Add note via POST with { body, stageId }
test('cand_note', 'POST', f'/onboarding-candidates/{cand_id}/notes', {
    'body': 'Test note from kanban',
    'stageId': s2_id,
})

# 11. Candidate status change
test('cand_status_onhold', 'PATCH', f'/onboarding-candidates/{cand_id}', {'status': 'OnHold'})
test('cand_status_completed', 'PATCH', f'/onboarding-candidates/{cand_id}', {'status': 'Completed'})

# 12. Verify candidate detail has nested data
cand_detail = test('cand_detail', 'GET', f'/onboarding-candidates/{cand_id}')
if cand_detail:
    print(f'   status={cand_detail.get("status")}, workflow={cand_detail.get("workflow") is not None}, currentStage={cand_detail.get("currentStage") is not None}, notes={len(cand_detail.get("notes", []))}')

# 13. Create checklist
cl = test('checklist_create', 'POST', '/onboarding-checklists', {
    'name': f'Test Checklist {TS}', 'code': f'CL-{TS}',
    'category': 'General', 'status': 'Active',
})
cl_id = cl.get('id') if cl else None

# 14. Create checklist tasks
ct1 = test('cl_task_create_1', 'POST', f'/onboarding-checklists/{cl_id}/tasks', {
    'title': 'Task A', 'name': 'Task A', 'priority': 'Medium', 'order': 0,
})
ct2 = test('cl_task_create_2', 'POST', f'/onboarding-checklists/{cl_id}/tasks', {
    'title': 'Task B', 'name': 'Task B', 'priority': 'High', 'order': 1,
})
ct1_id = ct1.get('id') if ct1 else None
ct2_id = ct2.get('id') if ct2 else None

# 15. Checklist task reorder
if ct1_id and ct2_id:
    test('cl_task_reorder', 'PATCH', f'/onboarding-checklists/{cl_id}/tasks', {
        'orderedIds': [ct2_id, ct1_id],
    })

# 16. Verify reorder
cl_tasks = test('cl_tasks_after_reorder', 'GET', f'/onboarding-checklists/{cl_id}/tasks')
if cl_tasks:
    items = cl_tasks.get('items', [])
    print(f'   Task order: {[(t["title"], t["order"]) for t in items]}')

# 17. Logs - verify metadata field
logs = test('logs_with_metadata', 'GET', '/onboarding-logs?pageSize=2')
if logs:
    items = logs.get('items', [])
    if items:
        has_meta = 'metadata' in items[0]
        print(f'   First log has metadata key: {has_meta}, value: {str(items[0].get("metadata"))[:50]}')
    print(f'   Response keys: pageSize={logs.get("pageSize")}, totalPages={logs.get("totalPages")}')

# 18. Dashboard
dash = test('dashboard', 'GET', '/onboarding-dashboard')
if dash and dash.get('cards'):
    print(f'   Cards: total={dash["cards"]["totalCandidates"]}, completed={dash["cards"]["completedOnboarding"]}')

# 19. Workflow list pageSize
wf_list = test('wf_list_pageSize', 'GET', '/onboarding-workflows?pageSize=5')
if wf_list:
    print(f'   Response keys: pageSize={wf_list.get("pageSize")}, total={wf_list.get("total")}')

# 20. Candidate list pageSize
cand_list = test('cand_list_pageSize', 'GET', '/onboarding-candidates?pageSize=3')
if cand_list:
    print(f'   Response keys: pageSize={cand_list.get("pageSize")}, total={cand_list.get("total")}')

# Cleanup
print()
print('=== CLEANUP ===')
if cand_id: test('cleanup_cand', 'DELETE', f'/onboarding-candidates/{cand_id}')
if cl_id: test('cleanup_cl', 'DELETE', f'/onboarding-checklists/{cl_id}')
if wf_id: test('cleanup_wf', 'DELETE', f'/onboarding-workflows/{wf_id}')

print()
print(f'Full frontend-compat tests: {passed} passed, {failed} failed')
