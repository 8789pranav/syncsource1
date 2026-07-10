import requests, json, sys, time

BASE = 'http://127.0.0.1:8000/api'
TS = str(int(time.time()))

# Login
resp = requests.post(f'{BASE}/auth/login', json={'email': 'admin@nexushr.com', 'password': 'admin123456'})
print('LOGIN:', resp.status_code)
token = resp.json().get('access_token') or resp.json().get('token')
if not token:
    print('RESPONSE:', json.dumps(resp.json(), indent=2)[:500])
    sys.exit(1)
print('TOKEN:', token[:20] + '...')
print()

H = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

passed = 0
failed = 0
failures = []

def test(name, method, path, body=None, params=None):
    global passed, failed
    url = f'{BASE}{path}'
    try:
        if method == 'GET':
            r = requests.get(url, headers=H, params=params, timeout=10)
        elif method == 'POST':
            r = requests.post(url, headers=H, json=body, timeout=10)
        elif method == 'PATCH':
            r = requests.patch(url, headers=H, json=body, timeout=10)
        elif method == 'DELETE':
            r = requests.delete(url, headers=H, timeout=10)
        ok = r.status_code < 400
        status = 'PASS' if ok else 'FAIL'
        if ok:
            passed += 1
        else:
            failed += 1
            failures.append(f'[FAIL] {name}: {method} {path} -> {r.status_code}')
        data = r.json() if r.headers.get('content-type', '').startswith('application/json') else {}
        print(f'[{status}] {method} {path} -> {r.status_code}')
        if not ok:
            print(f'   Response: {json.dumps(data)[:300]}')
        return data
    except Exception as e:
        failed += 1
        failures.append(f'[FAIL] {name}: {method} {path} -> {e}')
        print(f'[FAIL] {name}: {method} {path} -> {e}')
        return None

# ============================================================
# 1. Dashboard
# ============================================================
test('ob_dashboard', 'GET', '/onboarding-dashboard')

# ============================================================
# 2. Settings (single object GET + PATCH)
# ============================================================
settings_data = test('ob_settings_get', 'GET', '/onboarding-settings')
test('ob_settings_patch', 'PATCH', '/onboarding-settings', {
    'settings': {'general': {'autoCreateEmployee': True, 'requireJoiningDate': False}}
})
settings_data2 = test('ob_settings_get2', 'GET', '/onboarding-settings')

# ============================================================
# 3. Workflows (list, create, get detail, update, delete)
# ============================================================
wf_list = test('ob_wf_list', 'GET', '/onboarding-workflows')
wf_data = test('ob_wf_create', 'POST', '/onboarding-workflows', {
    'name': f'Test Workflow {TS}', 'code': f'WF-{TS}',
    'description': 'Test onboarding workflow',
    'category': 'General', 'status': 'Active',
    'icon': 'KanbanSquare', 'color': '#10b981',
    'cardColorBy': 'stage', 'showSla': True, 'showOwner': True,
    'showTaskCount': True, 'allowBackward': False,
})
wf_id = wf_data.get('id') if isinstance(wf_data, dict) else None
print(f'>>> Using workflow_id: {wf_id}')
print()

if wf_id:
    # Get detail with stages
    test('ob_wf_detail', 'GET', f'/onboarding-workflows/{wf_id}')
    # Update
    test('ob_wf_update', 'PATCH', f'/onboarding-workflows/{wf_id}', {'description': 'Updated description'})
    # Filter by status
    test('ob_wf_filter_status', 'GET', '/onboarding-workflows', params={'status': 'Active'})
    # Filter by category
    test('ob_wf_filter_cat', 'GET', '/onboarding-workflows', params={'category': 'General'})

# ============================================================
# 4. Stages (create under workflow, list, update, delete)
# ============================================================
stage_id = None
if wf_id:
    stage_data = test('ob_stage_create', 'POST', f'/onboarding-workflows/{wf_id}/stages', {
        'name': 'Application Received', 'code': 'APP_RECV',
        'order': 0, 'color': '#22c55e', 'icon': 'FileText',
        'stageType': 'start', 'category': 'intake',
        'slaDays': 1, 'isMilestone': False, 'isRequired': True,
    })
    stage_id = stage_data.get('id') if isinstance(stage_data, dict) else None

    stage2 = test('ob_stage_create2', 'POST', f'/onboarding-workflows/{wf_id}/stages', {
        'name': 'Document Verification', 'code': 'DOC_VERIFY',
        'order': 1, 'color': '#0ea5e9', 'icon': 'ShieldCheck',
        'stageType': 'standard', 'category': 'process',
        'slaDays': 3, 'isMilestone': False, 'isRequired': True,
    })
    stage2_id = stage2.get('id') if isinstance(stage2, dict) else None

    if stage_id:
        test('ob_stage_update', 'PATCH', f'/onboarding-workflows/{wf_id}/stages/{stage_id}', {'slaDays': 2})

# ============================================================
# 5. Candidates (list, create, get detail, update, move, notes)
# ============================================================
cand_list = test('ob_cand_list', 'GET', '/onboarding-candidates')
cand_data = test('ob_cand_create', 'POST', '/onboarding-candidates', {
    'candidateName': f'John Doe {TS}',
    'email': f'john.{TS}@test.com',
    'phone': '5551234567',
    'employeeCode': f'EMP-{TS}',
    'designation': 'Software Engineer',
    'department': 'Engineering',
    'grade': 'L3',
    'employmentType': 'Full-time',
    'joinDate': '2026-07-15',
    'reportTo': 'Jane Smith',
    'priority': 'High',
    'avatarColor': '#10b981',
    'tags': json.dumps(['new', 'lateral']),
    'status': 'Active',
    'workflowId': wf_id,
})
cand_id = cand_data.get('id') if isinstance(cand_data, dict) else None
print(f'>>> Using candidate_id: {cand_id}')
print()

if cand_id:
    # Get detail with nested data
    test('ob_cand_detail', 'GET', f'/onboarding-candidates/{cand_id}')
    # Update
    test('ob_cand_update', 'PATCH', f'/onboarding-candidates/{cand_id}', {'priority': 'Critical'})
    # Filter by status
    test('ob_cand_filter_status', 'GET', '/onboarding-candidates', params={'status': 'Active'})
    # Filter by workflow
    test('ob_cand_filter_wf', 'GET', '/onboarding-candidates', params={'workflow_id': wf_id})
    # Move candidate
    if stage2_id:
        test('ob_cand_move', 'POST', f'/onboarding-candidates/{cand_id}/move', {'stageId': stage2_id})
    # Add note
    test('ob_cand_note', 'POST', f'/onboarding-candidates/{cand_id}/notes', {'note': 'Test note for candidate'})

# ============================================================
# 6. Document Templates
# ============================================================
test('ob_docs_list', 'GET', '/onboarding-documents')
doc_data = test('ob_doc_create', 'POST', '/onboarding-documents', {
    'name': f'Test Offer Letter {TS}', 'code': f'OL-{TS}',
    'documentType': 'Offer Letter', 'scopeType': 'tenant',
    'language': 'en', 'version': 1, 'isDefault': False, 'status': 'Draft',
    'bodyHtml': '<p>Dear {{candidateName}},</p><p>Welcome to the team!</p>',
})
doc_id = doc_data.get('id') if isinstance(doc_data, dict) else None
if doc_id:
    test('ob_doc_update', 'PATCH', f'/onboarding-documents/{doc_id}', {'status': 'Active', 'isDefault': True})
test('ob_docs_filter_type', 'GET', '/onboarding-documents', params={'document_type': 'Offer Letter'})
test('ob_docs_filter_status', 'GET', '/onboarding-documents', params={'status': 'Active'})

# ============================================================
# 7. Email Templates
# ============================================================
test('ob_emails_list', 'GET', '/onboarding-emails')
email_data = test('ob_email_create', 'POST', '/onboarding-emails', {
    'name': f'Test Invite Email {TS}', 'code': f'EM-{TS}',
    'eventType': 'Candidate Invite', 'scopeType': 'tenant',
    'language': 'en', 'subject': 'Welcome to {{companyName}}',
    'bodyHtml': '<p>Hi {{candidateName}},</p><p>Please complete your onboarding.</p>',
    'isDefault': False, 'status': 'Draft', 'version': 1,
    'fromEmail': 'hr@nexushr.com', 'replyToEmail': 'hr@nexushr.com',
})
email_id = email_data.get('id') if isinstance(email_data, dict) else None
if email_id:
    test('ob_email_update', 'PATCH', f'/onboarding-emails/{email_id}', {'status': 'Active'})
test('ob_emails_filter_event', 'GET', '/onboarding-emails', params={'event_type': 'Candidate Invite'})

# ============================================================
# 8. Checklists
# ============================================================
test('ob_checklists_list', 'GET', '/onboarding-checklists')
chk_data = test('ob_checklist_create', 'POST', '/onboarding-checklists', {
    'name': f'Test Checklist {TS}', 'code': f'CL-{TS}',
    'description': 'Test onboarding checklist',
    'category': 'General', 'scopeType': 'tenant',
    'isDefault': False, 'status': 'Active', 'version': 1,
})
chk_id = chk_data.get('id') if isinstance(chk_data, dict) else None
if chk_id:
    # Create task under checklist
    task_data = test('ob_task_create', 'POST', f'/onboarding-checklists/{chk_id}/tasks', {
        'name': 'Setup Email Account', 'title': 'Setup Email Account',
        'code': 'TASK-001', 'ownerType': 'assignee',
        'dueDateRule': 'start_date', 'dueDateOffset': 1,
        'priority': 'High', 'isMandatory': True, 'isBlocking': True,
        'requiresAttachment': False, 'requiresComment': False, 'requiresApproval': False,
        'order': 0,
    })
    test('ob_checklist_update', 'PATCH', f'/onboarding-checklists/{chk_id}', {'description': 'Updated checklist'})
test('ob_checklists_filter_cat', 'GET', '/onboarding-checklists', params={'category': 'General'})

# ============================================================
# 9. Logs
# ============================================================
test('ob_logs_list', 'GET', '/onboarding-logs')
test('ob_logs_filter_type', 'GET', '/onboarding-logs', params={'log_type': 'Stage Movement'})

# ============================================================
# 10. Entity Config
# ============================================================
test('ob_entity_config_list', 'GET', '/onboarding-entity-config')

# ============================================================
# 11. Dashboard again (should show real data now)
# ============================================================
dash2 = test('ob_dashboard2', 'GET', '/onboarding-dashboard')
if isinstance(dash2, dict) and dash2.get('cards'):
    c = dash2['cards']
    print(f'   Dashboard cards: total={c["totalCandidates"]}, active={c["onboardingInitiated"]}, docs={c["documentsCount"]}, checklists={c["checklistsCount"]}, emails={c["emailsCount"]}, stages={c["totalStages"]}, workflows={c["activeWorkflows"]}')
    if dash2.get('stageDistribution'):
        print(f'   Stage distribution: {len(dash2["stageDistribution"])} stages')
    if dash2.get('priorityDistribution'):
        print(f'   Priority distribution: {dash2["priorityDistribution"]}')
    if dash2.get('trend7d'):
        print(f'   7-day trend: {dash2["trend7d"]}')

# ============================================================
# CLEANUP - delete test data
# ============================================================
print()
print('=== CLEANUP ===')
if cand_id:
    test('cleanup_cand', 'DELETE', f'/onboarding-candidates/{cand_id}')
if doc_id:
    test('cleanup_doc', 'DELETE', f'/onboarding-documents/{doc_id}')
if email_id:
    test('cleanup_email', 'DELETE', f'/onboarding-emails/{email_id}')
if chk_id:
    test('cleanup_chk', 'DELETE', f'/onboarding-checklists/{chk_id}')
if wf_id:
    test('cleanup_wf', 'DELETE', f'/onboarding-workflows/{wf_id}')

# ============================================================
print()
print('=' * 60)
print('TEST SUMMARY')
print('=' * 60)
print(f'Total: {passed + failed} | Passed: {passed} | Failed: {failed}')
if failures:
    print()
    print('FAILED TESTS:')
    for f in failures:
        print(f'  {f}')
