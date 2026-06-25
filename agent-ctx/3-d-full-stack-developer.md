---
Task ID: 3-d
Agent: full-stack-developer
Task: Build 11 Full & Final section files for payroll module

Work Log:
- Read /home/z/my-project/worklog.md to understand prior HRMS work and styling conventions.
- Read /home/z/my-project/src/components/hrms/payroll/shared.tsx to understand types (FnFCase, FnFEntry), constants (ENTITIES, DEPARTMENTS, CURRENCIES, STATUS_COLORS), and helpers (initials, avatarColor, formatDate, formatDateTime, formatCurrency, formatCurrencyShort, formatNumber, formatPercent, timeAgo).
- Read /home/z/my-project/src/components/hrms/payroll/data.ts to understand FNF_CASES seed (6 cases with mixed statuses: Inputs Pending, Calculation In Progress, Pending Approval, Approved, Paid) and EMP_SEED employee list.
- Read /home/z/my-project/src/components/hrms/modules/payroll.tsx to verify exact named exports expected (FnFDashboardSection, FnFCasesSection, FnFInputsSection, FnFCalculationSection, LeaveEncashmentSection, NoticeRecoverySection, AssetLoanRecoverySection, FnFApprovalSection, FnFPaymentSection, FnFLettersSection, FnFReportsSection).
- Read /home/z/my-project/src/components/hrms/offboarding/sections/dashboard.tsx and fnf.tsx for visual pattern reference (rose-themed, stat cards, donut, timelines, dialog patterns).
- Read /home/z/my-project/src/components/hrms/ui.tsx for available shared components.
- Created 11 files in /home/z/my-project/src/components/hrms/payroll/sections/ with rose/pink accent family per spec.
- All files use "use client", TypeScript strict, shadcn/ui only, framer-motion + recharts, sonner toast, cn from @/lib/utils, helpers from ../shared, data from ../data.
- All files export BOTH named export AND default export with the exact name listed in the spec.

Files created:
1. fnf-dashboard.tsx (597 lines) — FnFDashboardSection
   - Header with rose icon box, refresh button, demo filter card.
   - 8 stat cards (Total Cases, Inputs Pending, Calculation In Progress, Pending Approval, Approved, Paid, Total Net Payable, Avg Settlement Time).
   - FnF status breakdown donut (recharts PieChart) + Monthly FnF payout trend bar chart (12 months).
   - Entity-wise FnF horizontal bars (animated widths) + Exit type distribution bars.
   - Recent FnF cases table (last 5, sticky header, avatar+name+code+net payable+status+timeAgo).
   - Upcoming settlement timeline (vertical timeline with LWD + status badges).

2. fnf-cases.tsx (679 lines) — FnFCasesSection
   - Filter bar (Entity, Department, Exit Type, Status, Search).
   - 7 stat cards (Total, Inputs Pending, In Progress, Pending Approval, Approved, Paid, Net Payable).
   - FnF cases table with employee avatar, entity/dept, exit case, exit type, LWD, DOJ, tenure, earnings (green), deductions (red), net payable (highlighted rose), status, actions (View/Edit/Calculate/Approve/Pay/Generate Letter via dropdown).
   - "Initiate FnF" dialog with employee picker, exit case reference, auto-fetched inputs preview (Pending Salary, Leave Encashment, Gratuity, Notice Recovery, Loan, Asset Recovery) and estimated net payable.
   - Case detail dialog (max-w-5xl) with employee header, status timeline (Created/Calculated/Approved/Paid), earnings/deductions breakdown (2-col with source badges), summary tiles (3 large tiles), payment info, action toolbar.

3. fnf-inputs.tsx (493 lines) — FnFInputsSection
   - Filter bar (Entity, Source Auto/Manual, Category Earning/Deduction, Status, Search).
   - 6 stat cards (Total Inputs, Auto-Fetched, Manual, Earnings, Deductions, Pending Fetch).
   - Inputs table (flattened from FNF_CASES earnings + deductions) with employee, case, input name, code, category badge (green/red), amount, source badge, description, actions (Edit/Refetch/Delete).
   - "Add Manual Input" dialog (case picker, category, name, code, amount, description).
   - "Auto-Fetch All" button (toast simulation).

4. fnf-calculation.tsx (581 lines) — FnFCalculationSection
   - Filter bar (Entity, Status, Search).
   - 6 stat cards (Total Calculations, Pending, Completed, Total Earnings, Total Deductions, Total Net Payable).
   - Calculations table (earnings green, deductions red, net payable highlighted, calculated at, status, actions View/Recalculate/Lock).
   - Calculation detail dialog with per-component breakdown (earnings list + deductions list with source badges), summary tiles (3 large), formula reference card (6 formula rules: Pending Salary, Leave Encashment, Gratuity India/UAE, Notice Recovery, TDS).
   - "Run Calculation" dialog with case picker, inputs preview, run calculation (with loading spinner), result display.

5. leave-encashment.tsx (516 lines) — LeaveEncashmentSection
   - Filter bar (Entity, Department, Status, Search).
   - 6 stat cards (Total Encashments, Pending, Approved, Total Leave Balance, Total Encashment Amount, Avg Days Encashed).
   - Leave encashment table (6 synthesized records from FNF_CASES) with employee, entity/dept, leave type, balance, encash days, per day rate, amount, status, actions.
   - "Calculate Encashment" dialog with employee picker (auto-fetch leave balance), leave type, encash days, per day rate (auto = Basic/26), amount auto-calc.
   - Leave encashment formula reference card (Monthly: Basic+DA/26, Daily: /30, Amount = Per Day Rate × Encash Days, tax note).

6. notice-recovery.tsx (530 lines) — NoticeRecoverySection
   - Filter bar (Entity, Department, Status, Search).
   - 6 stat cards (Total Recoveries, Pending, Approved, Notice Days Short, Recovery Amount, Avg Recovery).
   - Notice recovery table (5 synthesized records) with employee, entity/dept, notice period, served, shortfall (highlighted), per day rate, recovery amount, status, actions.
   - "Calculate Notice Recovery" dialog with employee picker, notice required, notice served (auto-calc shortfall), per day rate (auto = Basic/30), recovery amount auto-calc.
   - Notice period rules reference card: India by grade (G1-G4: 30d, G5-G8: 60d, M1-M3: 90d, E1-E2: 90d) + UAE by tenure (<6mo: 14d, 6mo-5yr: 30d, >5yr: 90d) + recovery formula.

7. asset-loan-recovery.tsx (470 lines) — AssetLoanRecoverySection
   - Filter bar (Entity, Recovery Type, Department, Status, Search).
   - 5 stat cards (Total Recoveries, Asset Recoveries, Loan Recoveries, Pending, Total Amount).
   - Tabs (All / Asset Recovery / Loan Recovery) with counts.
   - Recovery table (8 synthesized mixed records) with employee, entity/dept, type badge (pink Asset / amber Loan), description, reference ID, amount, status, actions.
   - "Add Recovery" dialog (employee picker, type Asset/Loan, description, reference ID, amount).

8. fnf-approval.tsx (570 lines) — FnFApprovalSection
   - Filter bar (Entity, Approver/Pending With, Status, Search).
   - 5 stat cards (Pending Approvals, Approved Today, Rejected Today, Total Pending Amount, Avg Approval Time).
   - Approval workflow visualization (HR Head → Finance Head → Payment, 3-step sequential).
   - Approval queue table (filtered FNF_CASES where status is "Pending Approval" or "Calculation In Progress") with employee, entity, exit case, net payable, submitted at, pending with, SLA bar (green/amber/red based on 3-day SLA), actions (View/Approve/Reject/Request Info).
   - Single action dialog (approve/reject/info with comment).
   - Bulk approve dialog with selected cases review, total amount, approval comment.

9. fnf-payment.tsx (488 lines) — FnFPaymentSection
   - Filter bar (Entity, Payment Mode, Status, Search).
   - 5 stat cards (Total Payments, Pending, Paid, Total Amount, Paid This Month).
   - Payment table (filtered FNF_CASES where status is "Approved" or "Paid") with employee, entity, FnF case, net payable, payment mode badge, UTR, paid at, status, actions (Mark Paid / Download Voucher / Email).
   - "Process Payments" dialog (batch pay with selected cases review, bank account picker, payment mode picker, loading spinner).

10. fnf-letters.tsx (618 lines) — FnFLettersSection
    - Filter bar (Entity, Letter Type, Status, Search).
    - 5 stat cards (Total Letters, Generated, Issued, Downloaded, Pending).
    - Letters table (8 synthesized records) with employee, entity, letter type badge (rose FnF Settlement / pink Relieving / emerald Experience / amber No Dues), FnF case, generated at, issued at, status, actions (Generate/Issue/Download/Email).
    - "Generate Letter" dialog (letter type, template picker, employee picker, employee preview card).
    - Letter preview dialog (formatted like a real letter): company letterhead (ACME logo, address, CIN/GST), date, employee details, subject line, body (varies per letter type — FnF settlement has summary table, Relieving/Experience/No Dues have appropriate text), signature blocks (HRBP + Finance Head), system-generated footer.
    - "Bulk Generate" action button.

11. fnf-reports.tsx (410 lines) — FnFReportsSection
    - Filter bar (Category, Entity, Date Range From/To, Search).
    - Report catalog grid (10 reports: FnF Summary, Entity-wise FnF, Department-wise FnF, Settlement Time Analysis, Leave Encashment Report, Notice Recovery Report, Asset/Loan Recovery Report, Gratuity Report, Tax Impact Report, Letter Issuance Report) — each card has icon, category badge, format badge, description, Generate + Schedule buttons.
    - Recent reports table (7 records) with report title, generated at, generated by, format, records, size, status (Ready/Scheduled/Processing), actions (Download/Email).
    - 4 summary stat cards at bottom (Total Reports, Ready to Download, Scheduled, Total FnF Cases).

Stage Summary:
- Files created (11 files, 5,952 total lines):
  • fnf-dashboard.tsx (597 lines)
  • fnf-cases.tsx (679 lines)
  • fnf-inputs.tsx (493 lines)
  • fnf-calculation.tsx (581 lines)
  • leave-encashment.tsx (516 lines)
  • notice-recovery.tsx (530 lines)
  • asset-loan-recovery.tsx (470 lines)
  • fnf-approval.tsx (570 lines)
  • fnf-payment.tsx (488 lines)
  • fnf-letters.tsx (618 lines)
  • fnf-reports.tsx (410 lines)

- Key features implemented:
  • All 11 sections use rose/pink gradient family (from-rose-500 to-pink-500, bg-rose-50, text-rose-700) as primary accent per spec.
  • Sticky header tables in ScrollArea with max-h-[640px], hover row tint (hover:bg-rose-500/5).
  • All dialogs use sm:max-w-2xl or larger, ScrollArea body, sticky footer.
  • Earnings = green badges (emerald), Deductions = red/rose badges, Net Payable = highlighted large rose tile.
  • Comprehensive stats rows on every section (5-8 cards each).
  • Filter bars with Select dropdowns + search + clear-filters UX.
  • framer-motion stagger animations on stat cards and donut/bars.
  • recharts donut + bar charts on dashboard.
  • Source badges (Auto = sky, Manual = rose) on inputs/calculations.
  • Working interactive state: cases can move status (Calculate → Pending Approval → Approved → Paid), letters can be generated/issued/downloaded, payments can be marked paid, approvals can be approved/rejected, recoveries & encashments can be added/approved.
  • Toast notifications for all actions via sonner.
  • Letter preview dialog mimics real corporate letter with letterhead, signature blocks.
  • Notice period rules card with India (by grade) + UAE (by tenure) reference.
  • Leave encashment formula card with monthly/daily rate + tax note.
  • Calculation formula reference card with 6 standard formulas.
  • Approval workflow visualization (HR Head → Finance Head → Payment).
  • SLA progress bar on approval queue (green/amber/red, 3-day SLA).
  • Bulk actions: bulk approve (FnF Approval), batch pay (FnF Payment), bulk generate (FnF Letters).
  • All files use named + default exports with exact names expected by payroll.tsx module.

- Lint/tsc status:
  • bun run lint: passes (only pre-existing warning in dynamic-form.tsx, not in my files).
  • bunx tsc --noEmit --skipLibCheck: zero errors in any of the 11 FnF files.
  • dev.log: no "Module not found" errors for any of the 11 FnF files (other agents' files such as settings-import-export, settings-audit-security, statutory-setup, tds-records still missing but those are not my responsibility).
