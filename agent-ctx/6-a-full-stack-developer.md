# Task 6-a — Organization + Employees (API + UI)

**Agent**: full-stack-developer
**Status**: ✅ Complete

## What I built

### APIs (15 files)
| Resource | Files | Endpoints |
|---|---|---|
| Entities | `route.ts`, `[id]/route.ts` | `GET`, `POST` / `GET`, `PATCH`, `DELETE` |
| Branches | `route.ts`, `[id]/route.ts` | `GET`, `POST` / `GET`, `PATCH`, `DELETE` |
| Departments | `route.ts`, `[id]/route.ts` | `GET` (with parent/children/head/entity/_count), `POST` / `GET`, `PATCH`, `DELETE` |
| Designations | `route.ts`, `[id]/route.ts` | `GET` (with grade/_count), `POST` / `GET`, `PATCH`, `DELETE` |
| Grades | `route.ts`, `[id]/route.ts` | `GET` (ordered by hierarchyLevel), `POST` / `GET`, `PATCH`, `DELETE` |
| Locations | `route.ts`, `[id]/route.ts` | `GET`, `POST` / `GET`, `PATCH`, `DELETE` |
| Employees | `route.ts`, `[id]/route.ts`, `picker/route.ts` | `GET` (search+filters), `POST` / `GET` (all relations), `PATCH`, `DELETE` / `GET` picker |

All endpoints follow the shared contract:
- `ensureTenant()` first; always filter by `tenantId`
- LIST → `{items:[...]}` via `listResponse`
- CREATE → `created` (201)
- UPDATE → `ok` (200), **selective update** (only fields present in body)
- DELETE → `{ok:true}` (200)
- Non-model employee fields → `customData` JSON string
- Date strings → `DateTime`; empty strings → `null`

### UI (2 files)
- **`organization.tsx`** — `OrganizationModule`: 6-tab page (Entities | Branches | Departments | Designations | Grades | Locations). Each tab uses a reusable `<ResourcePanel>` (PageHeader w/ count badge, ListToolbar, DataTable w/ Edit/Delete actions, DynamicForm Dialog max-w-2xl, AlertDialog confirm). Branches & Locations use inline `FormSchema` (no defaults exist).
- **`employees.tsx`** — `EmployeesModule`: PageHeader w/ count badge, ListToolbar w/ debounced search + Department & Status filter Selects + Add button, DataTable w/ avatar+name+code, designation, department, entity, location, StatusBadge, joining date, view/edit/delete actions. Row click → profile `Sheet` (side=right, sm:max-w-xl) with gradient header (avatar w/ initials, contact quick-row), Tabs (Overview / Timeline / Documents / Leave Balance) inside ScrollArea, SheetFooter with Edit & Delete. Overview uses `FieldValue` from dynamic-form in a 2-col definition-list grid (Basic / Employment / Bank & Compensation / Statutory / Address). Add/Edit → Dialog (max-w-3xl) with `employeeFormSchema`.

## Quality checks
- ✅ `bun run lint` — zero errors in any of my files (3 errors in other agents' files: audit/forms/workflows route.ts)
- ✅ `bunx tsc --noEmit --skipLibCheck` — zero errors in my files (fixed one initial error: `reportingManager.lastName` was `string` but Prisma returns `string | null`)
- ✅ All 8 list endpoints return 200 with valid `{items:[...]}`
- ✅ Employee filters work: `?q=Aarav` → 1 result, `?status=Active` → 11, `?limit=3` → 3
- ✅ Full CRUD roundtrip verified for both entities and employees (POST 201 → PATCH 200 selective → DELETE 200)
- ✅ Duplicate-code validation returns 409 with proper error message
- ✅ `customData` JSON storage works for extra form fields
- ✅ Both UI modules import cleanly via Bun runtime (`{OrganizationModule}`, `{EmployeesModule}`)
- ✅ No compile errors in dev.log for my files

## Decisions
1. Added `[id]/route.ts` files for branches/departments/designations/grades/locations (required by UI Edit/Delete and mandated by worklog API conventions). Per worklog wildcard ownership map (`src/app/api/{entities,branches,...}/**`), these directories are mine.
2. **Selective PATCH** (`if (key in body)`) to preserve hidden/conditional form fields (e.g. `probationEndDate` when `probationStatus` changes to "Confirmed").
3. Stashed non-model employee form fields into `customData` JSON string per task spec.
4. Created inline `branchFormSchema` and `locationFormSchema` since no defaults exist.
5. Employee picker defaults to Active status (limit 200), supports `?status=all` to override.

## Known limitations (NOT bugs)
- Dynamic-form picker fallback for `/api/entities` shows entity `code` (e.g. "ET") since entities have no `name` field. Form engine handles via `label || name || code || id`. Did not add `/api/entities/picker` because form schema explicitly uses `/api/entities`.
- `Employee.reportingManagerId` is a plain self-FK string (no Prisma relation) — resolved via separate `db.employee.findFirst`. Per schema, which I cannot modify.

## Notes for downstream agents
- Organization & Employee modules are fully functional. The form pickers for entity/branch/department/designation/grade/location/employee endpoints will work via the dynamic form's `endpoint` field.
- The employee picker is at `/api/employees/picker` (NOT `/api/employees`) — use this for any "select employee" form field.
- All employee API responses include nested `entity`, `branch`, `department`, `designation`, `grade`, `location` (selected fields only) for direct UI rendering without extra fetches.
- The employee detail (`GET /api/employees/:id`) also includes a top-level `reportingManager` object (resolved separately) with `{id, firstName, lastName, employeeCode}`.
