# Task 2c — ResignationsSection (Offboarding > Resignation Requests)

## Summary
Built `src/components/hrms/offboarding/sections/resignations.tsx` (832 lines) implementing spec §6 (lines 469-541):
- 4 stat cards (Total / Pending Manager / Pending HR / Approved This Month)
- Filter bar (status select + department select + search input + Clear)
- 12-column resignation requests table with all spec columns
- Row actions dropdown: View Details, Manager Review, HR Review, Approve, Reject, Send Back, Withdraw, Initiate Exit, View Logs
- ReviewDialog (mode = `manager` | `hr`) showing employee resignation form + status flow stepper + Manager or HR review fields
- ViewDetailsDialog (read-only + stepper + review trail)
- LogsDialog (synthesised timeline)

## Imports verified
- From `../shared`: `initials`, `formatDate`, `formatDateTime`, `daysBetween`, `STATUS_COLORS`, `ResignationRequest`, `ResignationStatus`
- From `../data`: `RESIGNATION_REQUESTS` (6 seed rows), `EXIT_WORKFLOWS`, `EXIT_CHECKLISTS`
- shadcn/ui: `Button`, `Input`, `Textarea`, `Label`, `Badge`, `Card`/`CardContent`, `Switch`, `Separator`, `Table*`, `Select*`, `Dialog*`, `DropdownMenu*`, `Tooltip*`
- `cn` from `@/lib/utils`, `toast` from `sonner`

## Status flow stepper
5 stages: Submitted → Pending Manager Approval → Pending HR Approval → Approved → Exit Initiated.
- Completed steps rendered in emerald with check icon.
- Current step highlighted in rose (filled circle, shadow).
- Off-flow statuses (Draft, Rejected, Withdrawn, Cancelled) render a rose info banner instead.

## Manager Review fields
Manager Decision (Approved/Rejected/Pending) · Recommended LWD · Retention Discussion Done (Switch) · Discussion Summary (Textarea) · Regrettable Attrition (Switch) · Manager Remarks (Textarea) · Forward to HR / Reject buttons.

## HR Review fields
Final LWD · Notice Waiver (Switch) · Notice Buyout (Switch) · Notice Recovery (Switch) · Exit Workflow (Select from `EXIT_WORKFLOWS`) · Clearance Checklist (Select from `EXIT_CHECKLISTS`) · HR Remarks (Textarea) · Approve & Initiate / Reject / Send Back buttons.

## Action semantics
All actions operate on local in-memory state via `setRequests` and surface a `sonner` toast:
- `manager-approved` → status becomes "Pending HR Approval"
- `manager-rejected` → status becomes "Rejected"
- `hr-approve` → status becomes "Exit Initiated"
- `hr-reject` → status becomes "Rejected"
- `hr-send-back` → status becomes "Pending Manager Approval"
- `approve` / `reject` / `send-back` / `withdraw` / `initiate-exit` → direct status transitions

## Theme
Rose accents throughout: header icon tile (`bg-rose-500/10`), primary buttons (`bg-rose-600 hover:bg-rose-700`), regrettable badge, shortfall badge, status-flow current step, dashed-border hint footer. No indigo/blue.

## Verification
- `bunx eslint src/components/hrms/offboarding/sections/resignations.tsx` → 0 errors / 0 warnings.
- `bun run lint` project-wide → only pre-existing `dynamic-form.tsx` watch() warning (not my file).
- dev.log: `✓ Compiled in 440ms` / `467ms` after file creation; the pre-existing `Can't resolve '@/components/hrms/offboarding/sections/resignations'` errors are gone (only `workflows` remains, which belongs to a sibling task).

## File
- `/home/z/my-project/src/components/hrms/offboarding/sections/resignations.tsx` (832 lines)
- Exports: `ResignationsSection` (named), `default ResignationsSection`
- Matches the dynamic-import contract in `src/components/hrms/modules/offboarding.tsx:17`.
