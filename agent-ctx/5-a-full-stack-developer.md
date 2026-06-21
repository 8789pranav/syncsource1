# Task ID 5-a — Backend Foundation + Dashboard + Settings

## Files owned/created (in /home/z/my-project)
1. `src/app/api/seed/route.ts` — comprehensive seed endpoint (GET + POST)
2. `src/app/api/dashboard/route.ts` — dashboard analytics aggregator (GET)
3. `src/components/hrms/modules/dashboard.tsx` — analytics dashboard UI
4. `src/components/hrms/modules/settings.tsx` — tabbed settings UI

## API endpoints
- `GET /api/seed` — wipes & re-seeds the default tenant (ACME) with comprehensive demo data. Idempotent. Returns `{ ok: true, counts: {…} }`.
- `POST /api/seed` — same as GET.
- `GET /api/dashboard` — returns aggregated stats, headcount breakdowns (dept, location, gender), joinings/exits (6mo), leave trend (6mo), attendance trend (7d), asset status, recent joiners, upcoming holidays, pending requests.

## Verification
- `bun run lint` — clean for my 4 files (errors in dev.log are in other subagents' files: forms.tsx, audit/forms/workflows API routes).
- `curl /api/seed` → 200 OK with full counts object.
- `curl /api/dashboard` → 200 OK with full analytics payload.
- `curl /` → 200 OK (dashboard compiles and renders via dynamic import).
- No compile errors in dev.log for any of my files.

## Key implementation decisions
- Seed is idempotent via deleteMany on every table in dependency order, then re-create. Tenant itself is preserved (ensureTenant handles creation).
- Dashboard computes everything from real DB rows; gracefully returns zeros/empty arrays when tables are empty.
- Dashboard UI uses recharts directly (not shadcn chart wrapper) for fine control over styling. Uses emerald/teal/amber/fuchsia/coral palette via `CHART_COLORS` array.
- Charts use `color-mix(in oklch, var(--border) 70%, transparent)` for grid lines (since the theme uses oklch, not hsl, variables).
- Framer-motion staggered animations on stat cards.
- Settings tabbed page (General / Modules / Appearance / Security) — all decorative (no real backend writes), but theme toggle is wired to next-themes.
- Settings General tab is pre-filled with ACME defaults; Save button toasts success.

## Known downstream issues (NOT mine)
- `src/app/api/asset-requests/route.ts` returns 500 (uses `include: { assignedTo: … }` which doesn't exist on Asset model — should be `assignedToId`).
- `src/components/hrms/modules/forms.tsx` fails to compile (duplicate `Percent` import from lucide-react).
- `src/app/api/{audit,forms,workflows}/route.ts` lint errors (assigning to `module`).
- These are owned by Task 6-c and Task 3 — flagged for follow-up.

## Seed data summary
2 entities, 3 branches, 6 departments, 3 grades, 6 designations, 3 locations, 12 employees (7 male / 5 female, 11 Active / 1 On Notice, manager hierarchy wired), 5 leave types, 1 leave policy (5 items), 3 leave applications (1 each: Approved/Pending/Rejected), 3 shifts (incl. 1 night shift), 2 rosters (1 Published + 1 Draft, 5 roster entries), 8 holidays, 5 attendance records (for EMP-1, last 5 weekdays), 3 asset categories, 6 assets (2 Assigned + 4 In Stock, 2 asset assignments), 2 asset requests (1 Pending + 1 Approved), 2 announcements (1 Normal + 1 High priority), 3 audit logs, 2 form schemas (default employee clone + custom "IT Asset Request"), 2 workflows (Leave Approval 2-Level with 2 sequential steps + Asset Request Approval with 1 step).
