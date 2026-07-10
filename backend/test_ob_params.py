import requests, json

BASE = 'http://127.0.0.1:8000/api'
r = requests.post(f'{BASE}/auth/login', json={'email': 'admin@nexushr.com', 'password': 'admin123456'})
token = r.json().get('access_token') or r.json().get('token')
H = {'Authorization': f'Bearer {token}'}

tests = [
    ('logs_logType', 'GET', '/onboarding-logs?logType=Stage+Movement&pageSize=1'),
    ('logs_status', 'GET', '/onboarding-logs?status=Success&page=1&pageSize=5'),
    ('logs_from', 'GET', '/onboarding-logs?from=2026-07-01T00:00:00&pageSize=10'),
    ('logs_combined', 'GET', '/onboarding-logs?logType=Candidate+Activity&status=Success&page=1&pageSize=10'),
    ('logs_search', 'GET', '/onboarding-logs?q=Candidate&pageSize=5'),
    ('cand_workflowId', 'GET', '/onboarding-candidates?workflowId=test123'),
    ('cand_status_camel', 'GET', '/onboarding-candidates?status=Active'),
    ('docs_filter_camel', 'GET', '/onboarding-documents?documentType=Offer+Letter'),
    ('emails_filter_camel', 'GET', '/onboarding-emails?eventType=Candidate+Invite'),
    ('checklists_filter_camel', 'GET', '/onboarding-checklists?category=General'),
]

passed = 0
failed = 0
for name, method, path in tests:
    r = requests.request(method, f'{BASE}{path}', headers=H)
    ok = r.status_code < 400
    data = r.json() if r.headers.get('content-type', '').startswith('application/json') else {}
    status = 'PASS' if ok else 'FAIL'
    if ok:
        passed += 1
    else:
        failed += 1
    print(f'[{status}] {name}: {method} {path} -> {r.status_code}')
    if not ok:
        print(f'   {json.dumps(data)[:200]}')

print(f'\nFrontend param compat: {passed} passed, {failed} failed')
