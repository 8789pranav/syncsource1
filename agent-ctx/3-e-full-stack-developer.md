# Task ID: 3-e — Payroll Settings (17 files, incl. flagship Entity Configuration wizard)

## Status: COMPLETED

## Files created (all in `src/components/hrms/payroll/sections/`)
1. `settings-general.tsx` — `GeneralSettingsSection` (340 lines)
2. `entity-configuration.tsx` — `EntityConfigurationSection` FLAGSHIP 9-step wizard (~1785 lines)
3. `settings-pay-group.tsx` — `PayGroupSettingsSection` (286 lines)
4. `settings-component.tsx` — `ComponentSettingsSection` (310 lines)
5. `settings-structure.tsx` — `StructureSettingsSection` (295 lines)
6. `settings-calendar.tsx` — `CalendarSettingsSection` (269 lines)
7. `settings-integration.tsx` — `IntegrationSettingsSection` (211 lines)
8. `settings-compliance.tsx` — `ComplianceSettingsSection` (215 lines)
9. `settings-tax.tsx` — `TaxSettingsSection` (193 lines)
10. `settings-arrear.tsx` — `ArrearSettingsSection` (201 lines)
11. `settings-fnf.tsx` — `FnFSettingsSection` (210 lines)
12. `settings-payslip.tsx` — `PayslipSettingsSection` (260 lines)
13. `settings-bank.tsx` — `BankSettingsSection` (280 lines)
14. `settings-approval.tsx` — `ApprovalSettingsSection` (199 lines)
15. `settings-email.tsx` — `EmailSettingsSection` (186 lines)
16. `settings-import-export.tsx` — `ImportExportSettingsSection` (245 lines)
17. `settings-audit-security.tsx` — `AuditSecuritySettingsSection` (299 lines)

## Flagship Entity Configuration Wizard — Key Features
- List page: 15-column table with sticky header, 5 stat tiles, 4 filters, row actions dropdown (10 actions).
- 9-Step Wizard Dialog: `max-w-6xl` + `h-[90vh]`, ScrollArea body, sticky footer.
- Clickable horizontal StepIndicator: done=teal check icon, current=teal solid, future=slate outline, progress bar with %.
- Steps 1-9 each have dedicated panel components with full form state.
- Use Tenant Default toggle in Step 1 disables steps 3-8 with notice card.
- Validation: missing config + conflict warnings computed via useMemo.
- Save Draft vs Publish in Step 9.
- View + History dialogs.

## Quality
- Lint: 0 errors in my files. 1 unrelated warning in dynamic-form.tsx (different agent).
- tsc: 0 errors in my files after fixing effectiveTo optional type issue.
- React Compiler: fixed set-state-in-effect lint error by removing useEffect + using parent `key` prop to remount wizard per open.

## Color System
- Slate gradient (`from-slate-500 to-slate-600`) — Settings menu color
- Teal accents inside Entity Configuration wizard (step indicators, tenant-default toggles, fallback flow terminal node)
