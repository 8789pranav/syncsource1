# Task 8-A — Onboarding Dashboard Section

**Agent:** full-stack-developer (Dashboard section)
**Task ID:** 8-A
**Spec:** Onboarding module, section #3 (Dashboard — tracking & summary only)
**File delivered:** `src/components/hrms/onboarding/sections/dashboard.tsx` (709 lines)

## What was built
A single React section component `DashboardSection` (named + default export) that
renders the Onboarding Dashboard per spec #3. Consumes `GET /api/onboarding-dashboard`
(via the shared `useFetch` hook) — the route already existed from a prior agent.

## Sections rendered (top to bottom)
1. **PageHeader** — "Onboarding Dashboard" + spec description, `gradient-emerald`
   LayoutDashboard icon, Refresh button action.
2. **14 stat cards** — responsive grid (`grid-cols-2 md:grid-cols-4 xl:grid-cols-5`),
   framer-motion stagger. Per-card accent from the allowed palette only:
   - Total Candidates (emerald, Users)
   - Added Today (cyan, UserPlus)
   - Onboarding Initiated (teal, PlayCircle)
   - Invite Sent (cyan, Send)
   - SLA Breached (rose, AlertTriangle) ← spec accent
   - Overdue Tasks (amber, ClipboardList) ← spec accent
   - Completed Onboarding (emerald, CheckCircle2) ← spec accent
   - Dropped Candidates (slate, UserMinus) ← spec accent
   - Joining Today (teal, CalendarDays)
   - Joining This Week (emerald, CalendarRange)
   - Active Workflows (violet, Workflow)
   - Documents (orange, FileText)
   - Checklists (fuchsia, ListChecks)
   - Emails (pink, Mail)
3. **Row lg:grid-cols-3** — Pipeline by Stage (col-span-2, custom animated CSS bars
   colored by stage.color) + Candidates by Priority donut (recharts PieChart,
   4 slices Low=slate / Medium=cyan / High=amber / Critical=rose, center total,
   2-col legend).
4. **7-Day Candidate Trend** — full-width recharts AreaChart with emerald
   linear-gradient fill, monotone line, custom ChartTooltip.
5. **Row lg:grid-cols-2** — SLA Breaches (rose-tinted list, uses shared
   `slaStatus(enteredAt, slaDays)` for the overdue label, EmptyState
   "No SLA breaches 🎉" when empty) + Recent Activity (vertical timeline with
   per-logType lucide icon mapping for all 11 OnboardingLog.logType values,
   action text, performedByName + role, timeAgo, status pill Success/Warning/Failed).
6. **Workflow Distribution** — full-width custom animated CSS bars colored by
   workflow.color, sorted by count desc.

## States handled
- **Loading:** full `DashboardSkeleton` mirroring every section (header + 14
  stat-card skeletons in the 2/4/5 grid + stage bars + donut circle + area chart
  + two list skeletons + workflow bars).
- **Error:** `EmptyState` (AlertTriangle) with a Retry button wired to
  `useFetch.reload`.
- **Empty subsections:** each chart/list has its own `EmptyState`.

## Design decisions / notes for downstream agents
- Built a local `DashboardStatCard` that mirrors the `StatCard` primitive's design
  exactly (same card structure, same gradient + ring + icon-tile layout) but
  supports the full 11-color allowed-palette accent union. The shared
  `StatCard.accent` type only allows `emerald | amber | fuchsia | coral | cyan`,
  which can't honor the spec's explicit "slate accent" for Dropped Candidates
  or the broader palette. If you later extend `StatCard.accent` in
  `src/components/hrms/ui.tsx`, this local card can be swapped back to the
  primitive trivially.
- The 7-day trend relies on `data.trend7d` always having 7 entries (the API
  fills zeros for empty days) — no client-side gap-filling needed.
- The priority donut merges `data.priorityDistribution` with a fixed 4-priority
  default array so all slices (even zero-count) render with their canonical color.
- Recent Activity icon map covers every `OnboardingLog.logType` value from the
  Prisma schema (Candidate Activity / Workflow / Stage Movement / Document /
  Email / Checklist / Approval / Verification / Employee Conversion / System /
  Error), with `Activity` as the fallback.
- SLA Breaches use the shared `slaStatus` helper so the "Nd overdue" / "Due today"
  label logic is consistent with the rest of the onboarding module.

## Verification
- `bunx tsc --noEmit --skipLibCheck` → no errors for the file (one initial
  error fixed: `CalendarDay` → `CalendarDays` in lucide-react).
- `bunx eslint src/components/hrms/onboarding/sections/dashboard.tsx` → clean
  (no warnings, no errors).
- Dev server log confirms Next.js 16.1.3 Turbopack running on :3000 and the
  onboarding-* API routes returning 200. The `/api/onboarding-dashboard` route
  already exists and serves the exact contract this component consumes.

## Integration step (for the shell-integration agent)
Import in `src/components/hrms/modules/onboarding.tsx`:
```ts
import { DashboardSection } from "@/components/hrms/onboarding/sections/dashboard"
```
Add a tab entry `{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard,
description: "Real-time tracking of candidate onboarding pipeline, SLAs, and activity." }`
and render `<DashboardSection />` for that tab. No props needed — the component
self-fetches via `useFetch("/api/onboarding-dashboard")`.

## No outstanding issues
File is ready. tsc + eslint clean. Strictly uses the allowed color palette
(NO indigo, NO blue). Dark-mode aware throughout. Fully responsive (mobile-first
2-col → 4-col → 5-col for stats; stacked → 3-col / 2-col rows for charts/lists).
