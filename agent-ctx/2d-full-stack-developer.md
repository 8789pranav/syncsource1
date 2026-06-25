# Task 2d — Offboarding Kanban Board

**Agent:** full-stack-developer
**Task:** Build `src/components/hrms/offboarding/sections/kanban.tsx` for the Offboarding module

## Work Log

- Read `/home/z/my-project/worklog.md` and `/tmp/offboarding-spec.txt` (lines 542-736: Kanban Board + Kanban Board Configuration).
- Read `/home/z/my-project/src/components/hrms/offboarding/shared.tsx` to understand types (`ExitCase`, `ExitStage`, `DEFAULT_EXIT_STAGES`, `EXIT_TYPE_COLORS`, `STATUS_COLORS`, `RISK_COLORS`, `AVATAR_COLORS`) and helpers (`initials`, `formatDate`, `daysBetween`).
- Read `/home/z/my-project/src/components/hrms/offboarding/data.ts` for `EXIT_CASES` (8 cases), `KANBAN_BOARDS` (4 boards), plus cross-reference data (`CLEARANCE_TASKS`, `ASSET_RECOVERY`, `IT_ACCESS`) used to compute per-card derived counts.
- Read `/home/z/my-project/src/components/hrms/onboarding/sections/kanban.tsx` for visual pattern reference (HTML5 drag-and-drop, colored stage columns, drop-zone feedback, framer-motion card transitions).
- Verified the offboarding module (`src/components/hrms/modules/offboarding.tsx`) imports `KanbanSection` from `@/components/hrms/offboarding/sections/kanban` via dynamic import — created the `sections/` directory to satisfy this path.
- Built `kanban.tsx` (995 lines) with the following structure:
  - **Helpers**: `hexToRgba`, `lwdOf`, `isLwdToday`, `isLwdThisWeek`, `daysRemainingToLwd`, `clearanceProgress` (computed from `CLEARANCE_TASKS`), `assetPendingCount`, `itPendingCount`, `pendingWith` (derived from current stage).
  - **Badge builder** (`buildBadges`): emits applicable card badges per spec — `LWD Today`, `LWD This Week`, `Clearance Overdue`, `Asset Pending`, `IT Pending`, `FnF Pending`, `Legal Hold`, `High Risk`, `Notice Shortfall`, `Letter Pending`.
  - **`KanbanSection`** (named export): board `Select` dropdown (uses `KANBAN_BOARDS`), board summary header (name, code, scope, entity/exit-type, stages count), "Configure Board" button, search input, stat strip (total / active / on hold / exited / high risk / LWD today), horizontally scrollable 14-column board.
  - **`KanbanColumn`** (`React.memo`): colored top border (`stage.color`), sticky header with stage name + code + count badge, meta row showing SLA days + Initial/Final/Mandatory/Auto badges, drop zone with dashed outline matching stage color on drag-over, scrollable card list with framer-motion enter/exit.
  - **`ExitCaseCard`** (`React.memo`): draggable; left-border tinted by risk color; avatar with initials; employee name + code + exitCaseId; legal-hold scale icon + confidential lock icon; entity line; dept · designation line; exit-type colored pill + truncated reason; 2-col LWD + Days Remaining grid (highlighted rose when LWD today, amber when this week); clearance progress bar (completed/total/percent); 4 mini status badges (asset, IT, FnF, letter) with optional rose count badge; spec-defined card badges row; separator; footer with risk flag pill + notice shortfall + "Pending: …".
  - **Card actions dropdown**: 14 menu items — View Exit Case, Move Stage (sub-menu listing all 14 stages with current-stage checkmark + disabled), Approve/Reject Resignation, Change LWD, Start Clearance, Assign Task, Send Reminder, Initiate FnF, Generate Letter, Mark Exited, Cancel Exit (rose tinted), View Timeline. Each fires a `toast.success` with the action + employee name + case ID.
  - **Drag & drop**: HTML5 `onDragStart`/`onDragOver`/`onDrop` on column drop-zones; on drop, updates local `stageOverrides` map (caseId → stageId) and toasts `Moved <employee> to <stage>` — purely client-side as per spec (no API).
  - **`BoardConfigDialog`** (spec #8 — read-only): max-w-4xl dialog with board summary grid (code, scope, entity/exit-type, workflow, stages count, default, status, version, created by, updated at), then a stages table showing all 14 stages with Stage Name + Code + Color swatch + hex, SLA days, Initial/Final/Mandatory/Manual Move/Allow Skip columns (CheckCircle/X marks). Dialog footer has "Close" + "Edit Board" button (non-functional — `toast.info` on click).
- Compact helpers (`StatusMiniBadge`, `Field`, `BoolCell`) reused across the card and dialog to keep file ≤ 1000 lines (final: 995 lines).
- Rose theme accents throughout: rose primary on board icon, board header text color, default board pill, Cancel Exit menu item, high-risk states, LWD-today highlight, count badges, drag-over ring.
- Ran `bun run lint` — 0 errors in my file (the 1 remaining warning is in `dynamic-form.tsx`, not mine).
- Ran `bunx tsc --noEmit` — 0 TS errors in my file. All reported TS errors are in other agents' WIP files (missing `sections/fnf`, `sections/workflows`, etc., and a type mismatch in `exit-cases.tsx`).
- Verified dev.log shows no compile errors for my file — all reported module-not-found errors are for other section files (`workflows`, `settings`, `alumni`, `logs`, `checklists`, `exit-interviews`, `documents`, `emails`, `fnf`) that are owned by other agents.

## Stage Summary

- **File created (1):** `src/components/hrms/offboarding/sections/kanban.tsx` (995 lines, ≤ 1000 limit).
- **Named export:** `KanbanSection` — already wired into `src/components/hrms/modules/offboarding.tsx` via dynamic import on the "Kanban Board" tab.
- **Spec coverage:**
  - Spec #7 (Kanban Board): board selector with summary, 14-stage column layout, full card field set (employee name/code/avatar/entity/dept/designation/exit type/reason/LWD/days remaining/clearance %/asset pending/IT pending/FnF status/letter status/risk flag/legal hold/pending with), all 10 card badges, all 14 card actions via dropdown + Move Stage sub-menu, HTML5 drag-and-drop with toast feedback.
  - Spec #8 (Board Configuration): read-only stage config dialog listing all stages with Name, Code, Color, SLA Days, Is Initial/Final/Mandatory, Allow Manual Move, Allow Skip; non-functional "Edit Board" button toasts on click.
- **Visual polish:** colored stage headers with top stripe, sticky column header, hover-shadowed cards with rose drag-over ring, framer-motion card enter/exit, animated drop-zone with stage-colored dashed outline, rose-themed accent palette, horizontally scrollable board with all 14 stages visible.
- **Lint/tsc:** clean for my file. Dev server log shows no kanban-related errors.
