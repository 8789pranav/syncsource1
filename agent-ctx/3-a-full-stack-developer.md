# Task 3-a — Salary sections (11 files)

## Summary
Built 11 Salary section files for the Payroll module under `src/components/hrms/payroll/sections/`. Each exports BOTH a named export and a default export matching the expected names in `src/components/hrms/modules/payroll.tsx`.

## Files Created
1. `salary-dashboard.tsx` (559 lines) → `SalaryDashboardSection`
2. `payroll-run.tsx` (659 lines) → `PayrollRunSection`
3. `payroll-inputs.tsx` (473 lines) → `PayrollInputsSection`
4. `pay-groups.tsx` (462 lines) → `PayGroupsSection`
5. `payroll-components.tsx` (445 lines) → `PayrollComponentsSection`
6. `salary-structure.tsx` (530 lines) → `SalaryStructureSection`
7. `employee-salary.tsx` (539 lines) → `EmployeeSalarySection`
8. `salary-revision.tsx` (400 lines) → `SalaryRevisionSection`
9. `payslips.tsx` (458 lines) → `PayslipsSection`
10. `bank-payment.tsx` (376 lines) → `BankPaymentSection`
11. `salary-reports.tsx` (294 lines) → `SalaryReportsSection`

**Total: ~5,195 lines across 11 files** (all under the 900-line limit per file).

## Pre-existing fix applied
Added `approvedBy?` field to `BankPayment` interface in `shared.tsx` to fix the pre-existing TypeScript error in `data.ts` (records had `approvedBy` on bank payments but interface didn't declare it).

## Patterns used
- **Theme**: teal/cyan gradient (`from-teal-500 to-cyan-500`) for primary accent on icon tiles, buttons, and active states — matches the Salary menu color.
- **shadcn/ui only**: Card, Button, Input, Label, Textarea, Select, Table, Dialog, Sheet, Tabs, Badge, Switch, Checkbox, Separator, ScrollArea, DropdownMenu.
- **framer-motion**: staggered grid containers + items for stat-card rows and report cards.
- **recharts**: PieChart (donut), BarChart (vertical & horizontal), AreaChart — used in salary-dashboard.
- **sonner toast**: every action fires a toast.
- **Tables**: sticky header, `max-h-[640px]` ScrollArea, horizontal scroll for wide tables, hover tint, dropdown row actions.
- **Dialogs**: `sm:max-w-2xl` to `sm:max-w-5xl` (structure editor), ScrollArea body, sticky footer.
- **Stats cards**: gradient bg + icon tile + large tabular-nums value + sub-label.
- **Helpers from `../shared`**: `formatCurrency`, `formatCurrencyShort`, `formatDate`, `formatDateTime`, `initials`, `avatarColor`, `STATUS_COLORS`, `COMPONENT_TYPE_COLORS`, `formatPercent`, `formatNumber`.
- **Data from `../data`**: `PAY_GROUPS`, `PAYROLL_RUNS`, `PAYSLIPS`, `PAYROLL_INPUTS`, `BANK_PAYMENTS`, `EMPLOYEE_SALARIES`, `SALARY_REVISIONS`, `SALARY_COMPONENTS`, `SALARY_STRUCTURES`, `ARREAR_CASES`, `CHALLANS`.

## Key features per file
- **salary-dashboard**: 8 stat cards, 4 quick actions, donut (run status), bar (6-mo net payout trend), horizontal bar (entity payout), area chart (arrear trend), recent runs table (5 rows, dropdown actions), upcoming pay dates (6 with countdown), footer banner.
- **payroll-run**: 6 stat cards, 5-filter bar, full table (11 cols), 4-step "Start Payroll Run" wizard (Select → Review Inputs → Preview → Confirm), run detail dialog with 3 tabs (employees/sortable, summary, timeline).
- **payroll-inputs**: 5 stat cards, 6-filter bar, inputs table (11 cols), Add Input dialog (employee picker, type select, amount, pay group, month), bulk select + approve/reject actions, dropdown row actions.
- **pay-groups**: 4 stat cards, filter bar, table, Add Pay Group dialog, detail Sheet (3 tabs: overview / linked runs / linked structures).
- **payroll-components**: 6 stat cards, type-filter pills with counts + search, table (10 cols), Add/Edit Component dialog with formula textarea, calc-type-aware fields, taxable/statutory/active/payslip switches.
- **salary-structure**: 4 stat cards, filter bar, table, large Structure editor dialog (5xl) with split layout — details left (2/5) + components right (3/5) with add/remove/reorder, per-component calc type/value/percentage/formula, mandatory toggle, CTC range preview.
- **employee-salary**: 5 stat cards, 6-filter bar, table (13 cols), Salary detail dialog with breakdown (CTC summary + earnings/deductions cards), Assign Salary dialog with employee picker + auto-calc preview.
- **salary-revision**: 6 stat cards, 4-filter bar, table (13 cols), Initiate Revision dialog with employee picker (auto-fills current CTC), revision type, revised CTC, auto-computed hike %, effective date, reason, arrear toggle.
- **payslips**: 5 stat cards, 5-filter bar, table (12 cols), bulk-select with publish action, formatted payslip preview dialog (company header, employee details, earnings table with YTD, deductions table with YTD, net pay banner).
- **bank-payment**: 7 stat cards, 4-filter bar, table (11 cols), Generate Bank File dialog with payroll run picker, bank account, format, live preview.
- **salary-reports**: global filter bar (from/to/entity/pay-group/category), 10-card report catalog (icon, title, description, Generate + Schedule buttons), recent reports table (8 rows, dropdown actions).

## Validation
- `bunx tsc --noEmit --skipLibCheck` — **zero type errors** in any of the 11 salary section files.
- `bun run lint` — **zero lint errors** in any of my files. (The 1 error + 1 warning remaining are in `dynamic-form.tsx` and `entity-configuration.tsx`, owned by other agents.)
- dev.log — no compile errors related to any of my Salary section files. (Remaining "Module not found" errors in dev.log are for sibling agents' files: `compliance-reports`, `fnf-letters`, `fnf-reports`, `settings-import-export`, `settings-audit-security`, `tds-records` — not my responsibility.)
