# Task 2j — Offboarding Sections (Alumni, Settings)

**Agent**: full-stack-developer
**Task**: Build two section files for the Offboarding module — `alumni.tsx` (spec #19) and `settings.tsx` (spec #20, #21, #22).

## Work Log

- Read `/home/z/my-project/worklog.md` to understand architecture, conventions, and prior agent patterns (Next.js 16 + App Router, TypeScript strict, shadcn/ui New York, rose theme for offboarding, single-route SPA, dynamic-imported sections).
- Read `/home/z/my-project/src/components/hrms/offboarding/shared.tsx` (710 lines) — types (`AlumniRecord`, `OffboardingSettings`, `EntityConfiguration`, `ExitStage`), constants (`EXIT_TYPES`, `EXIT_TYPE_COLORS`, `STATUS_COLORS`, `AVATAR_COLORS`), helpers (`initials`, `formatDate`, `formatDateTime`).
- Read `/home/z/my-project/src/components/hrms/offboarding/data.ts` — `ALUMNI` (5 records), `OFFBOARDING_SETTINGS`, `ENTITY_CONFIGURATIONS` (4), `EXIT_WORKFLOWS`, `KANBAN_BOARDS`, `EXIT_CHECKLISTS`, `EXIT_INTERVIEW_FORMS`, `EXIT_EMAIL_TEMPLATES`, `EXIT_DOCUMENT_TEMPLATES`.
- Read spec sections 1778-1977 (Settings + Entity Configuration) and 2025-2058 (Employee/Manager Portal context for alumni) of `/tmp/offboarding-spec.txt`.
- Read `/home/z/my-project/src/components/hrms/onboarding/sections/settings.tsx` (1227 lines) for visual pattern reference — left sidebar tab list + right content area, switches + text/select fields, entity configuration table + dialog.
- Verified `src/components/hrms/modules/offboarding.tsx` shell expects named exports `AlumniSection` (line 28) and `SettingsSection` (line 30) from the respective section files.

### File 1 — `sections/alumni.tsx` (869 lines, under 900 ✓)
- `"use client"`, named export `AlumniSection` (+ default).
- **Page header** with rose-tinted Users icon, "Export" outline button (toasts info), "Add Alumni" rose CTA (toasts info).
- **Stats cards (4)** via `AlumniStatCard` (framer-motion entrance, gradient-bg, hover-shadow):
  1. Total Alumni (rose accent)
  2. Eligible for Rehire (emerald)
  3. No-Rehire / Blacklisted (amber)
  4. Added This Month (violet) — computed from `alumniSince` month/year.
- **Filter bar** (Card with 4-col responsive grid):
  - Exit Type select (`EXIT_TYPES` + "All")
  - Department select (derived unique from ALUMNI + "All")
  - Status select (`All | Alumni | Blacklisted | No-Rehire`)
  - Search input by name or employee code (with clear button)
  - "Showing X of Y alumni" count + "Clear filters" reset pill when filters active.
- **Alumni table** (sticky header, `max-h-[640px]` ScrollArea, horizontal scroll for all 15 columns):
  - Employee (avatar + name + code; clicking opens profile dialog)
  - Entity, Department (badge), Designation
  - Date of Joining, Last Working Day (rose-highlighted)
  - Exit Type (colored pill using `EXIT_TYPE_COLORS`)
  - Exit Reason (truncated)
  - Email (mailto link with Mail icon), Phone (Phone icon), LinkedIn (sky-tinted Linkedin icon button if present)
  - Eligible for Rehire (green Yes / red No badge)
  - Alumni Since, Status (rose/red/amber badge via `STATUS_BADGE_STYLES`)
  - Actions (dropdown menu)
- **Row actions** dropdown (`ROW_ACTIONS` array, 8 actions grouped, color-toned):
  View Profile, Edit Contact, Download Relieving Letter, Download Experience Letter, Mark Eligible for Rehire (success), Mark No-Rehire (danger), Add to Blacklist (danger), Remove from Alumni (danger).
  Each action mutates local state and toasts success. `mutate` callback updates the alumni record in place.
- **Alumni profile dialog** (`sm:max-w-3xl`, ScrollArea, sticky footer):
  - Header: large avatar (48px), name, code/designation/dept, status badge, rehire badge, "Alumni since" outline badge.
  - 2-col grid of `DetailCard`s: Employee Details (entity, dept, designation, DOJ, LWD), Exit Details (exit type badge, reason, exit case ID link with ExternalLink icon, alumni since, rehire badge).
  - Contact Information card: 2-col grid of `ContactItem`s (Email mailto, Phone tel:, LinkedIn external, Entity) — each tinted with rose hover.
  - Available Documents card: 2-col grid of `DocumentTile`s (Relieving Letter, Experience Letter) — pulled from `EXIT_DOCUMENT_TEMPLATES` by `documentType`, with download buttons that toast.
  - Exit Process Timeline: 10-event vertical timeline built dynamically from the alumni's LWD — Date of Joining, Resignation Submitted, Manager & HR Approval, Notice Period Served, Clearance Completed, Asset Recovery & IT Revocation, FnF Settled, Last Working Day, Relieving & Experience Letter, Alumni Profile Created. Each event has a colored dot (`TONE_STYLES` map for rose/amber/violet/cyan/teal/emerald/slate), icon, description, and formatted date.
  - Footer: "Toggle Rehire" (outlines), "Blacklist/Un-Blacklist" (rose-toned), "Edit Contact" (rose CTA).

### File 2 — `sections/settings.tsx` (818 lines, under 900 ✓)
- `"use client"`, named export `SettingsSection` (+ default).
- **Left sidebar tab list** (sticky on lg, horizontal scroll on mobile): 7 tabs built via `buildTabs()`:
  1. General Settings (SettingsIcon)
  2. Employee Exit Settings (UserMinus)
  3. **Entity Configuration** (Building2, "Spec #21" badge, inserted at index 2)
  4. Clearance Settings (ClipboardCheck)
  5. FnF Settings (Wallet)
  6. Email Settings (Mail)
  7. Audit & Security (Lock)
  Each tab button has rose active state (text-rose-700/300, rose-tinted shadow, ChevronRight indicator).
- **Right content area** with `AnimatePresence` + `motion.div` keyed on `activeTab` for slide transitions.
- **SettingsFormPanel** (used for the 6 normal tabs):
  - Card with header (icon tile, title, description, "Saved" green badge).
  - Field definitions in `CATEGORIES` array — each `FieldDef` is switch/text/select with optional description, options, `full` flag.
  - State: local `values` record initialized from `OFFBOARDING_SETTINGS[cat.key]` (via `useState` initializer — no useEffect).
  - Switches rendered in a 2-col grid via `SwitchRow` (label + description + rose-tinted Switch); text/select via `FieldRow` (Label + Input/Select with full-width span option).
  - On change: toast.success with field label + new value + category name.
- **EntityConfigurationPanel** (special 3rd tab, spec #21):
  - Card header with "Add Entity Configuration" rose CTA.
  - Table of `ENTITY_CONFIGURATIONS` (13 columns: Entity, Use Tenant Default, Default Workflow, Kanban Board, Clearance Checklist, FnF Rule, Email Group, Exit Interview Form, Letter Group, HR Owner, Notice Policy, Status, Actions/Edit). Tenant-default badge, status badge (emerald Active / slate Inactive), hover rose row tint.
  - Empty state row when no configs.
- **EntityConfigDialog** (spec #21 add/edit form, `sm:max-w-3xl`):
  - Header with Building2 icon, "Add" or "Edit" title (based on `isEdit`).
  - Top row: Entity / Company select (4 ENTITIES) + Use Tenant Default switch (rose-tinted) in a bordered box.
  - Conditional section (AnimatePresence height animation) when `useTenantDefault=false`: 12 selects in 2-col grid — Default Exit Workflow (EXIT_WORKFLOWS), Kanban Board (KANBAN_BOARDS), Clearance Checklist (EXIT_CHECKLISTS), Asset Recovery Rule, IT Revocation Rule, FnF Rule, Exit Interview Form (EXIT_INTERVIEW_FORMS), Email Group (built from EXIT_EMAIL_TEMPLATES), Approval Workflow, Letter Group (built from EXIT_DOCUMENT_TEMPLATES), HR Owner, Notice Policy.
  - Effective From / Effective To (date inputs) + Status (Active/Inactive select).
  - Footer: Cancel + Save (rose CTA). Save validates entity is selected, builds `EntityConfiguration` (clears entity-specific fields when `useTenantDefault=true`), updates local `configs` state, toasts success.
- **Reference data wiring**: `EMAIL_GROUPS` and `LETTER_GROUPS` arrays are built by combining static names with unique values from `EXIT_EMAIL_TEMPLATES[].name` and `EXIT_DOCUMENT_TEMPLATES[].documentType`, satisfying the task's instruction to import all listed data exports.

## Verification
- `bunx eslint src/components/hrms/offboarding/sections/alumni.tsx src/components/hrms/offboarding/sections/settings.tsx` — **0 errors, 0 warnings** in my files. (Project-wide `bun run lint` reports 2 pre-existing errors in another agent's `documents.tsx` + 1 pre-existing warning in `dynamic-form.tsx`; my files are clean.)
- `bunx tsc --noEmit --skipLibCheck` — **0 errors** in my files (filtered grep for `offboarding/sections/(alumni|settings)` returns no matches; the 223 other tsc errors are in pre-existing files outside this task's scope).
- Dev.log: latest "Module not found" errors for alumni (line 241601) and settings (line 241600) appeared only *before* my files were created; subsequent compiles do not raise them. The last 200 log lines show only module-not-found errors for *other* still-pending sibling sections (emails, workflows, fnf, checklists, exit-interviews) that other agents are building.
- Both files are under the 900-line limit (869 + 818 = 1687 total).
- Removed unused imports: `Separator`, `AVATAR_COLORS`, `STATUS_COLORS`, `ShieldCheck`, `AlertTriangle`, `Circle`, `CheckCircle`, `ArrowRight`, `Eye` (Eye is actually used — kept), `Trash2` (kept). Final imports match what's actually referenced.
- Removed a redundant `useEffect` (set-state-in-effect anti-pattern) in `SettingsFormPanel` — parent `motion.div` has `key={activeTab}` so the panel remounts on tab switch and the `useState` initializer re-runs naturally.

## Stage Summary

- Two new files created at:
  1. `/home/z/my-project/src/components/hrms/offboarding/sections/alumni.tsx` (869 lines) — exports `AlumniSection` (named + default), `"use client"`.
  2. `/home/z/my-project/src/components/hrms/offboarding/sections/settings.tsx` (818 lines) — exports `SettingsSection` (named + default), `"use client"`.
- Both files compile cleanly (0 TS errors, 0 ESLint errors).
- Both use the rose theme consistently (gradient headers, rose-500 accents, rose-tinted hovers/badges/CTAs) to match the rest of the offboarding module.
- Both import types from `../shared` and seed data from `../data`, and use `cn` from `@/lib/utils` and `toast` from `sonner`.
- Alumni section fully covers spec #19 requirements: 4 stat cards, filter bar (4 filters + search), 15-column table, 8 row actions, profile dialog with employee details, exit details, contact info, document downloads, and 10-event exit-process timeline.
- Settings section fully covers spec #20 (7 tabs), #22 (all General + Employee Exit + Clearance + FnF + Email + Audit fields), and #21 (Entity Configuration table + add/edit dialog with all 12 entity-specific selects + effective dates + status).
- The offboarding module shell (`modules/offboarding.tsx`) can now successfully lazy-load these two sections on the "Alumni" and "Settings" tabs; the remaining still-pending sibling sections (emails, workflows, fnf, checklists, exit-interviews, documents) are owned by other agents.
