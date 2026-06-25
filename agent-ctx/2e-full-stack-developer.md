# Task 2e — Offboarding Sections (Clearance, Asset Recovery, IT Access)

**Agent**: full-stack-developer
**Task**: Build three section files for the Offboarding module — clearance.tsx, asset-recovery.tsx, it-access.tsx — covering spec sections #10, #11, #12.

## Work Log
- Read `/home/z/my-project/worklog.md` to understand architecture (Next.js 16 + App Router, TypeScript strict, shadcn/ui New York, rose theme for offboarding, single-route SPA).
- Read `/home/z/my-project/src/components/hrms/offboarding/shared.tsx` (710 lines) — types, constants, helpers (initials, formatDate, formatCurrency, STATUS_COLORS, AVATAR_COLORS, EXIT_TYPE_COLORS).
- Read `/home/z/my-project/src/components/hrms/offboarding/data.ts` — EXIT_CASES (8), CLEARANCE_TASKS (13), ASSET_RECOVERY (10), IT_ACCESS (11) seed records.
- Read spec sections 787-1004 of `/tmp/offboarding-spec.txt` for clearance (#10), asset recovery (#11), IT access revocation (#12).
- Inspected `offboarding.tsx` shell: it lazy-loads sections via dynamic imports and expects named exports `ClearanceSection`, `AssetRecoverySection`, `ItAccessSection`.
- Inspected an existing onboarding section (`sections/checklists.tsx`) to mirror styling & import conventions.

### File 1 — `sections/clearance.tsx` (697 lines, under 700 ✓)
- `"use client"`, named export `ClearanceSection`.
- **Stats cards (4)**: Total Tasks, Pending, Completed, Overdue — each with tinted icon tiles, hover shadow.
- **Filter bar**: Exit Case (8 EXIT_CASES), Department (14 CLEARANCE_DEPARTMENTS), Status (all 11 ClearanceTaskStatus), Search. "Clear filters" pill appears when any filter is active.
- **Tasks table** (sticky header, `max-h-[640px]` ScrollArea): Task Name + Code, Department badge (14 colored departments), Owner Type + Owner, Exit Case (avatar + name + exitCaseId), Due Date, SLA Days, Flag badges (M/B/₹), Recovery Amount, Status (colored pill), Actions dropdown. Row click opens detail dialog.
- **Row actions** (12 actions in dropdown, grouped into PRIMARY and SECONDARY, rendered via `PRIMARY_ACTIONS` + `SECONDARY_ACTIONS` arrays of `{key,label,Icon}`): Start, Submit, Approve, Reject, Send Back, Mark Complete, Waive, Add Recovery, Add Comment, Upload Attachment, Reassign Owner, Send Reminder.
- **Task detail dialog** (`sm:max-w-3xl`, `max-h-[92vh]`, ScrollArea): all task fields grid (8 fields in 4-col), 4 FlagPills, exit-case info bar, existing comment block, attachment list with file upload `<input type="file">`, comment thread with avatars + Textarea + Add Comment button. Dialog footer renders 7 quick-action buttons (Start/Submit/Approve/Reject/Complete/Waive/Remind) via `FOOTER_ACTIONS` array.
- **Department-wise clearance summary**: 14 cards in responsive grid (1/2/3/4 cols), each showing department avatar (color-coded), task count, and 3-stat row (Done/Pending/Overdue) via shared `SummaryStat` component. Animated with framer-motion staggered entrance.
- Local state: `tasks` (mutable, edited on actions), `comments` (record keyed by task id), `attachments` (record keyed by task id), filters, `selectedTaskId`, `detailOpen`, `newComment`.
- All actions produce toast.success with the task name and exit-case label.

### File 2 — `sections/asset-recovery.tsx` (558 lines)
- `"use client"`, named export `AssetRecoverySection`.
- **Stats cards (4)**: Total Assets, Pending Return, Returned, Damaged/Lost.
- **Filter bar**: Exit Case, Asset Type (16 ASSET_TYPES), Return Status (5 statuses), Search by asset code/serial.
- **Asset recovery table**: Asset Code + Type (icon-by-type via `ASSET_TYPE_ICON` map with 16 type-to-icon mappings + colored tint), Serial Number, Exit Case (avatar+name), Assigned Date, Expected Return Date, Actual Return Date, Return Status badge, Condition, Damage (badge + amount) / Lost badge, Recovery Amount, Push to FnF badge, Actions dropdown.
- **Row actions** (8): Mark Returned, Mark Damaged, Mark Lost, Add Recovery Amount, Waive Recovery, Send Reminder, Generate Asset No-Dues, Push to FnF.
- **Asset summary by exit case**: Card per employee with assets — total badge, 3-stat row (Pending/Returned/Dmg-Lost), recovery total + FnF pushed count.
- `ASSET_TYPE_ICON` and `ASSET_TYPE_COLORS` maps provide per-type iconography and color theming (Laptop=purple, Desktop=sky, Mobile=emerald, etc.).

### File 3 — `sections/it-access.tsx` (625 lines)
- `"use client"`, named export `ItAccessSection`.
- **Important Rules panel** (highlighted, gradient-rose-to-orange background): 4 RuleCards covering all spec #12 rules — Termination/high-risk → immediate revoke (rose tone), Normal resignation → LWD EOD (amber tone), Garden leave → start date (sky tone), HRMS self-service → until FnF/letters (slate tone). Each card has icon, title, body.
- **Stats cards (4)**: Total Access Items, Pending Revocation, Revoked, Scheduled.
- **Filter bar**: Exit Case, System Name (22 SYSTEM_NAMES), Revoke Timing (4 timings), Revocation Status (5 statuses), Search.
- **IT access table**: System Name + Access Type (icon-by-system via `SYSTEM_ICON` map with 22 system-to-icon mappings), Owner Team badge, Exit Case (avatar+name), Revoke Timing badge (color-coded by timing), Revoke Date/Time, Data Backup Required (Yes/No pill), Data Transfer Required pill, New Owner, License Deactivation pill, Revocation Status badge, Verification Status badge, Actions dropdown.
- **Row actions** (5): Revoke Now, Schedule Revocation, Mark Verified, Send Reminder, Add Remarks (opens a dialog with Textarea).
- **Remarks dialog**: Textarea prefilled with existing remarks, save button calls `updateItem` to persist.

## Verification
- `bun run lint` — 0 errors in my 3 files. (One error in `kanban.tsx` — `Badge` is not defined — is another agent's file; one pre-existing warning in `dynamic-form.tsx`.)
- `bunx tsc --noEmit --skipLibCheck` — 0 errors in my 3 files. (Other agents' files have unrelated errors.)
- Dev log shows my 3 files load via dynamic import without errors.
- All 3 files are under the 700-line limit (697 / 558 / 625).

## Stage Summary
- Three section files created at:
  - `src/components/hrms/offboarding/sections/clearance.tsx` (697 lines)
  - `src/components/hrms/offboarding/sections/asset-recovery.tsx` (558 lines)
  - `src/components/hrms/offboarding/sections/it-access.tsx` (625 lines)
- All three export their named components matching the offboarding.tsx shell's dynamic-import expectations.
- Rose theme accents throughout (gradient-rose CTAs, rose-50 hover rows, rose-colored icons/badges), responsive grids (mobile → 1 col, sm → 2, lg → 3-4), card shadows + hover effects, framer-motion entrance animations on summary cards.
- Reused `cn` from `@/lib/utils`, `toast` from `sonner`, `initials`/`formatDate`/`formatCurrency`/`STATUS_COLORS`/`AVATAR_COLORS` from `../shared`, and seed data from `../data`.
- The offboarding module's "Clearance", "Asset Recovery", and "IT Access" tabs now render real, interactive UIs backed by in-memory seed data, with row actions that mutate local state and toast feedback.
