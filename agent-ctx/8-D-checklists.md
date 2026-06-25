# Task 8-D — Build ChecklistsSection for Onboarding module (spec #10)

Agent: full-stack-developer
Task ID: 8-D
Created: 2025-06-25

## Summary

Built `ChecklistsSection` — the spec #10 "Checklists" section for the Onboarding
module. Reusable task groups assigned per onboarding stage. Each checklist
defines who does what, by when. 9 categories, 12 owner types, 6 due-date rules,
drag-reorderable tasks.

## Files

### Created
- `src/components/hrms/onboarding/sections/checklists.tsx` — 2078 lines.
  Named export `ChecklistsSection` (also default export).

### Not modified
- No other files modified. The section is **not yet wired into the Onboarding
  module shell** — the parent orchestrator is expected to add a tab in
  `src/components/hrms/modules/onboarding.tsx` that renders `<ChecklistsSection />`.
  The 4 sibling sections (8-A/B/C + this 8-D) are being built in parallel.

## Data contract

Mirrors the Prisma models `OnboardingChecklist` + `OnboardingChecklistTask`
and the existing 4 API routes under `/api/onboarding-checklists/*`:

- `GET    /api/onboarding-checklists?category=...`         → `{ items: Checklist[] }` (each item has `_count.tasks`)
- `POST   /api/onboarding-checklists`                       → create (optional initial `tasks[]`)
- `GET    /api/onboarding-checklists/[id]`                  → full checklist with `tasks[]` array (ordered by `order`)
- `PATCH  /api/onboarding-checklists/[id]`                  → update meta (name, description, category, scope, isDefault, status, version)
- `DELETE /api/onboarding-checklists/[id]`                  → delete (cascades to tasks)
- `POST   /api/onboarding-checklists/[id]/tasks`            → add task
- `PATCH  /api/onboarding-checklists/[id]/tasks`            → bulk reorder `{ orderedIds: [] }`
- `PATCH  /api/onboarding-checklists/[id]/tasks/[taskId]`   → update task
- `DELETE /api/onboarding-checklists/[id]/tasks/[taskId]`   → delete task

## Color system (enforced)

All colors come from a single `COLOR_BADGE` / `COLOR_DOT` / `COLOR_SOFT_BG`
record keyed by 11 allowed names: **emerald, teal, cyan, amber, violet, rose,
slate, lime, orange, fuchsia, pink**. NO indigo, NO blue (verified by grep).

- Category colors: Candidate=emerald, HR=teal, Manager=cyan, IT=amber, Admin=slate, Payroll=lime, Finance=orange, Training=violet, Compliance=rose.
- Owner-type colors: Candidate=emerald, HR Owner=teal, Recruiter=cyan, Reporting Manager=amber, Department Head=violet, IT Admin=rose, Admin Team=slate, Payroll Admin=lime, Finance Admin=orange, Training Owner=fuchsia, Specific Employee=pink, Role-Based Owner=slate.
- Priority colors: Low=slate, Medium=cyan, High=amber, Critical=rose.
- Flag chips: Mandatory=emerald, Blocking=rose, Attachment=amber, Comment=cyan, Approval=violet.

## Component structure

```
ChecklistsSection (exported)
├── PageHeader (title="Checklists", icon=ListChecks, gradient-emerald)
├── [Detail view when a checklist is open]
│   └── ChecklistDetailView
│       ├── Top bar (Back, Edit, Delete)
│       ├── Header card (category icon, inline-editable name, badges, Set Default)
│       ├── Meta row (Scope, Version, Created, Updated)
│       └── Tasks section
│           ├── Header + "Add Task" toggle
│           ├── [Inline TaskForm for add or edit]
│           └── TaskCard[] (HTML5 drag-reorderable)
└── [List view]
    ├── LEFT: CategorySidebar (9 categories + "All Checklists", counts, emerald active)
    └── RIGHT: Toolbar (search + count + New Checklist) + ChecklistCard[] grid
├── ChecklistFormDialog (Create / Edit) — name, code (auto-suggest), description,
│       category, scopeType, isDefault, status, version
└── AlertDialog (delete checklist + delete task)
```

Helpers: `InlineEditableText` (click-to-edit, Enter to save, Esc to cancel —
uses React's "adjust state during render" pattern to avoid
`react-hooks/set-state-in-effect` lint), `ColorBadge`, `FlagChip`, `FlagSwitch`,
`MetaItem`, `toCode`, `categoryMeta`, `ownerTypeMeta`, `dueDateRuleMeta`,
`dueDateRuleLabel`.

## Verification

- `bunx tsc --noEmit --skipLibCheck` — 0 errors related to `sections/checklists.tsx`
- `bunx eslint src/components/hrms/onboarding/sections/checklists.tsx` — exit 0, no warnings/errors
- Did NOT run `bun run build` per instructions.

## Notes for parent orchestrator

1. To surface the section, add a tab to `src/components/hrms/modules/onboarding.tsx`:
   ```tsx
   import { ChecklistsSection } from "@/components/hrms/onboarding/sections/checklists"
   // ...
   { id: "checklists", label: "Checklists", icon: ListChecks, description: "Reusable task groups per onboarding stage" }
   // ...
   {tab === "checklists" && <ChecklistsSection />}
   ```
2. The component fetches its own data — no props required.
3. The component is dark-mode aware and fully responsive (mobile-first, breakpoints at sm/md/lg/xl).
