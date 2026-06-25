# Task 3-c — Arrear Sections (full-stack-developer)

## Scope
Build 9 Arrear section files for the Payroll module's Arrear menu, all under
`/home/z/my-project/src/components/hrms/payroll/sections/`.

## Files Created (all `"use client"`, TypeScript strict, <910 lines each)
| File | Export | Lines |
|------|--------|-------|
| arrear-dashboard.tsx | `ArrearDashboardSection` | 601 |
| arrear-inputs.tsx | `ArrearInputsSection` | 644 |
| arrear-calculation.tsx | `ArrearCalculationSection` | 905 |
| salary-revision-arrear.tsx | `SalaryRevisionArrearSection` | 624 |
| lop-reversal-arrear.tsx | `LopReversalArrearSection` | 532 |
| manual-arrear.tsx | `ManualArrearSection` | 621 |
| arrear-approval.tsx | `ArrearApprovalSection` | 705 |
| arrear-payment.tsx | `ArrearPaymentSection` | 578 |
| arrear-reports.tsx | `ArrearReportsSection` | 492 |

Each file exports both a named export AND a default export with the exact name
expected by `src/components/hrms/modules/payroll.tsx`.

## Design System
- Amber/orange gradient family (`from-amber-500 to-orange-500`, `bg-amber-50`,
  `text-amber-700`) — the Arrear menu color.
- shadcn/ui (New York) only.
- `cn` from `@/lib/utils`, `toast` from `sonner`, `framer-motion`, `recharts`.
- Helpers from `../shared`: formatCurrency, formatCurrencyShort, formatDate,
  formatDateTime, initials, avatarColor, STATUS_COLORS.
- Data from `../data`: ARREAR_CASES, PAYROLL_INPUTS, SALARY_REVISIONS,
  EMPLOYEE_SALARIES, PAY_GROUPS.

## Key Features
- Stats rows with gradient-tinted cards (amber/orange/emerald/rose/teal).
- Sticky-header tables (`max-h-[640px]` ScrollArea, hover row tint).
- Dialogs `sm:max-w-2xl` or larger, ScrollArea body, sticky footer.
- Dashboard: donut + bar + horizontal bar + status bars + recent table + payout summary.
- Inputs: 12-col table + Add Arrear Input dialog (filtered to LOP Reversal / Arrear / Attendance / Manual Adjustment).
- Calculation: per-component × per-month input grid, auto-totals, breakdown detail dialog.
- Salary Revision: Generate from Revision dialog picks approved revision, auto-computes monthly delta + breakdown.
- LOP Reversal: auto-calc amount = (monthly CTC / 30) × days reversed.
- Manual: negative toggle for recovery; green/red amount coloring.
- Approval: workflow viz (Manager → Finance → HR Head), SLA badges, bulk approve with comments.
- Payment: bank file batch processing, mark paid, voucher download, UTR generation.
- Reports: 9-card catalog with Generate + Schedule actions + recent reports table.

## Validation
- `bunx eslint` on all 9 files: 0 errors, 0 warnings.
- `bunx tsc --noEmit --skipLibCheck`: 0 errors in arrear files.
- Remaining project-wide errors are from sibling tasks 3-a/3-b files (not in scope).

## Worklog
Appended to `/home/z/my-project/worklog.md` under Task ID 3-c.
