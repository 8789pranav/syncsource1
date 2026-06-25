# Task 8-E — SettingsSection (Onboarding Settings + Entity Configuration)

## Summary
Built `src/components/hrms/onboarding/sections/settings.tsx` (1227 lines) implementing spec sections #13 + #14:
- 15 vertical-tab settings panel for the Onboarding module
- 14 form-based categories (driven by seeded OnboardingSetting rows)
- 1 special "Entity Configuration" tab rendering a DataTable + Add/Edit/Delete dialog

## API Contracts Verified
- `GET /api/onboarding-settings` → `{ settings: { [category]: { [key]: value } } }` ✓
- `PATCH /api/onboarding-settings` → bulk upsert ✓
- `GET /api/onboarding-entity-config` → `{ items: EntityConfig[] }` with hydrated `entity` field ✓
- `POST /api/onboarding-entity-config` → create ✓
- `PATCH /api/onboarding-entity-config/[id]` → update ✓
- `DELETE /api/onboarding-entity-config/[id]` → delete ✓
- `GET /api/entities` → `{ items: Entity[] }` (legalName, tradeName, code) ✓

## Implementation Notes
- Two-column responsive layout: `lg:grid-cols-[240px_1fr]` with sticky left tab bar.
- TABS array is built procedurally from `CATEGORIES` (in spec order: General, Candidate, Entity Configuration, Kanban, Workflow, Document, Template, Checklist, Email, Verification, Approval, Candidate Portal, Employee Conversion, Import/Export, Audit & Security).
- Each form tab tracks dirty state against `original` snapshot; sticky save bar with Discard + Save appears when dirty.
- Switches use shadcn `Switch` (emerald when on via `data-[state=checked]:bg-emerald-600`).
- Entity Configuration dialog: `fieldset[disabled]` greys out the 16 default fields when `useTenantDefault` is on, with an emerald hint banner.
- `safeParseJson` used to round-trip the JSON-encoded `defaultDocumentSet` / `defaultChecklistSet` / `defaultEmailGroup` arrays to/from comma-separated strings in the form.
- framer-motion `AnimatePresence` for both tab content and the sticky save bar.
- Loading: skeleton grid; errors: EmptyState with Retry.

## Verification
- `bunx tsc --noEmit --skipLibCheck` → 0 errors in settings.tsx
- `bunx eslint src/components/hrms/onboarding/sections/settings.tsx` → 0 errors / 0 warnings
- Dev server log shows `GET /api/onboarding-settings 200 in 218ms` (settings endpoint healthy)

## File
- `/home/z/my-project/src/components/hrms/onboarding/sections/settings.tsx` (1227 lines)
- Exports: `SettingsSection` (named), `default SettingsSection`
