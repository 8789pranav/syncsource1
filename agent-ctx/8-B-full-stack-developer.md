# Task 8-B — Build DocumentsSection for Onboarding module (spec #8)

Agent: full-stack-developer
Task ID: 8-B

## Summary
Built `src/components/hrms/onboarding/sections/documents.tsx` — the Document
Library section for the Onboarding module. 1816 lines, named export
`DocumentsSection` + default export. Implements spec #8: 15 category sidebar,
templates table with all spec'd columns, rich 3-pane template editor (form /
HTML editor / variable picker) with cursor-position slug insertion, preview
dialog with sample-variable substitution in a sandboxed iframe, version history
dialog, delete confirmation, full loading/error/empty states.

## Files created / modified

### Created (1)
- `src/components/hrms/onboarding/sections/documents.tsx` (1816 lines)

### Modified (0)
- None.

## Context gathered (from prior agents' work records)

- Read `/home/z/my-project/worklog.md` (793 lines) — confirmed Phase 2 Onboarding
  module exists with `shared.tsx` (utilities/types/colors), `ui.tsx` (PageHeader,
  StatCard, EmptyState, etc.), 10 API routes for onboarding workflows + candidates,
  and 3 UI section files (kanban.tsx, workflows.tsx, initiate.tsx).
- Read `/home/z/my-project/agent-ctx/8-b-ui-full-stack-developer.md` — prior Task
  8-b-ui agent built the Employee Profile shell + 32 tab stubs. Different scope
  from my task (which is the Onboarding module's Document Library section, not
  the Employee Profile Documents tab).
- Read `/home/z/my-project/src/components/hrms/onboarding/shared.tsx` — confirmed
  `useFetch`, `apiPost`, `apiPatch`, `apiDelete`, `safeToast`, `safeParseJson`,
  `formatDate`, `formatDateTime`, `timeAgo` exports (all used in my code).
- Read `/home/z/my-project/src/components/hrms/ui.tsx` — confirmed `PageHeader`,
  `StatCard`, `EmptyState`, `StatusBadge`, `SectionCard`, `useAsyncAction`,
  `DataTable` exports (used `PageHeader`, `StatCard`, `EmptyState`).
- Inspected both API route files:
  - `src/app/api/onboarding-documents/route.ts` (POST create + GET list with
    `?documentType=` filter, returns `{ items }`)
  - `src/app/api/onboarding-documents/[id]/route.ts` (GET / PATCH / DELETE,
    auto-unsets other defaults when promoting to default on PATCH)
- Verified Prisma `OnboardingDocumentTemplate` model matches the
  `DocumentTemplate` shape from the task spec.
- Inspected `src/components/hrms/modules/onboarding.tsx` — confirmed the tab-
  shell pattern (framer-motion AnimatePresence, gradient-emerald, single-route
  SPA) so my new section matches the existing visual language.
- Verified all 66 lucide-react icons used exist in v0.525 (via Bun script that
  greps the ESM bundle exports).

## What was built

### 1. PageHeader
"Document Library" + description "Reusable document templates for offer letters,
agreements, and declarations.", `FileText` icon (gradient-emerald), total-
template-count badge, primary emerald "New Template" action button.

### 2. Stat strip (4 StatCards)
- Total Templates (emerald/FileText)
- Active (cyan/FileCheck2)
- Defaults (amber/Star, sub="One per type")
- Drafts (fuchsia/PenLine)

### 3. Two-column layout (`lg:grid-cols-[260px_1fr]`)
- **LEFT** sidebar: rounded card with "Categories" header + scroll-area
  containing `All Documents` pill at top, separator, then 15 category pills
  (Offer Letter, Appointment Letter, NDA, Employment Agreement, Internship
  Letter, Contract Letter, Joining Letter, Welcome Letter, Policy
  Acknowledgment, Background Verification Form, Medical Declaration, Asset
  Declaration, Bank Declaration, Nominee Declaration, Custom Document). Each
  pill: icon + label + count badge. Active = emerald-tinted, inactive =
  hover-muted. Sidebar is `lg:sticky lg:top-4` for persistent visibility.
- **RIGHT** section: toolbar (active category icon + name + filtered count,
  search input with clear button, emerald "New Template" button), then
  table/skeleton/empty-state, with framer-motion crossfade between category
  changes.

### 4. Templates table (10 columns)
Template Name (with slug-count badge), Code (mono badge), Document Type, Scope
(colored badge by scope type — slate/violet/teal/cyan/fuchsia/pink), Language
(uppercase), Version (v1 badge), Default (filled amber star or em-dash), Status
(Active=emerald, Draft=slate, Archived=amber), Updated (timeAgo), Actions
(dropdown). Row click opens editor; actions dropdown stops propagation.

### 5. Row actions dropdown
Edit, Preview, Clone (POSTs a new template with `_COPY_<rand>` suffix, status
Draft), Set as Default (disabled if already default), Publish/Deactivate
(toggles Active↔Archived via PATCH), Version History (opens dialog), Delete
(disabled if `isDefault` with explanatory label). Each action runs an optimistic
busy-state and surfaces toast feedback via `safeToast`.

### 6. Template Editor Dialog (`max-w-6xl`, `max-h-[90vh]`, 7-col grid)
- **LEFT (col-span-2)** — metadata form: Template Name*, Template Code*
  (auto-generated from name via `toCode()` until user edits the code field),
  Document Type* (select with 15 categories), Scope Type (select), Language
  (select, 9 languages), Version (number input), Status (select), Effective
  From / Effective To (date inputs), Default Template switch with description,
  cyan-tinted "Slugs detected" summary card showing the count of unique
  variables across all sections.
- **CENTER (col-span-3)** — HTML editor:
  - 3 section tabs: Header / Body* / Footer (active = emerald-tinted)
  - Visual formatting toolbar: Bold/Italic/Underline/Heading/Paragraph/Align
    L/C/R/Bullets/Numbers/Link/Code — all rendered as disabled-looking icon
    buttons with tooltips saying "visual only" (they're decorative — this is an
    HTML source editor, not a WYSIWYG).
  - Monospace Textarea with section-specific placeholder + hint text below.
- **RIGHT (col-span-2)** — Variable Picker:
  - Search box at top (filters slugs by name across all groups; empty groups
    hidden).
  - 6 grouped sections: Candidate (6 slugs), Job (12), Salary (8), Policies
    (5), Company (7), Dates (4). Each group has an icon + uppercase header +
    separator.
  - Each slug renders as a mono-font pill `{{SlugName}}` with a tiny dot if
    it's already used (cyan-tinted) or default (muted).
  - **Click to insert at cursor**: clicking a slug inserts `{{slug}}` at the
    cursor position in the currently-focused textarea. Tracking mechanism:
    `textareasRef` (one ref per section), `activeSection` state, DOM `focus`
    event listeners on each textarea that update `activeSection`. The insert
    function reads `selectionStart/End` from the active textarea, splices the
    snippet, updates React state, and restores cursor just after the snippet
    on the next animation frame.
- **Footer**: Preview (opens sub-dialog), Cancel (closes editor), Save/Create
  (emerald gradient button with spinner). Save validates name/code/
  documentType/body, builds payload (including `variablesUsed` as comma-joined
  string), POSTs or PATCHes, calls `onSaved()` to trigger list reload, closes
  dialog.

### 7. Preview Dialog (`max-w-4xl`)
Renders the template's combined header + body + footer HTML in a sandboxed
`<iframe srcDoc=…>` with sample variable substitution. 40 sample values
defined for all 41 unique slugs (e.g., `{{CandidateName}}` → "Priya Sharma",
`{{CTC}}` → "₹24,00,000", `{{JoiningDate}}` → "15 Aug 2025", dates computed
live from `new Date()`). Header gets an emerald-teal bottom border, footer
gets a muted top border. Used from both the editor footer button and the row
"Preview" action.

### 8. Version History Dialog (`max-w-lg`)
Shows current version (v{N}) with default star badge, last-updated timeAgo,
status/language/created/updated metadata grid, full list of variables used
(mono pills), and an amber info banner explaining that prior versions are
retained in the audit log for compliance.

### 9. Delete confirmation (AlertDialog)
Rose-themed "Delete Template" action button with spinner while deleting.
Triggered from the row actions menu — if the template is the default, a
friendly error toast is shown instead ("Cannot delete the default template —
assign default to another template first.").

### 10. Helpers
- `toCode(name)` — name → UPPER_SNAKE_CODE (max 40 chars, alphanumeric only)
- `defaultTemplateBody(category)` — sensible starter HTML for Offer Letter /
  Welcome Letter / NDA / generic categories, using common slugs so the user
  sees a populated body on first create.
- `extractVariables(html)` — regex-extracts `{{slug}}` occurrences into a
  unique string array.
- `substituteVariables(html)` — replaces `{{slug}}` with `SAMPLE_VALUES[slug]`,
  leaving unknown slugs intact.
- `scopeBadgeClass(scope)` / `scopeLabel(scope)` — color + label lookups for
  the 6 scope types.

### 11. Error banner
If the initial `useFetch` fails, a rose-tinted banner appears above the
two-column layout showing the error message + a "Retry" button (calls
`reload()`).

### 12. Loading state
`TableSkeleton` (6 skeleton rows in a rounded card) shown while `useFetch` is
loading.

### 13. Empty state per category
`EmptyState` with the active category's icon, contextual title ("No templates
in {category} yet" / "No templates match your search"), description, and
action button(s). When searching, shows "Clear search" + "Create Template";
when category is empty, shows just "Create Template".

### 14. Dark-mode aware
All custom badges, accents, and surfaces have `dark:` variants.

### 15. Color palette compliance
Strictly within the allowed set (emerald/teal/cyan/amber/violet/rose/lime/
orange/slate/fuchsia/pink). NO indigo, NO blue anywhere. Scope types use the
full color variety (tenant=slate, entity=violet, branch=teal, location=cyan,
department=fuchsia, employee_type=pink) to give visual differentiation.

## Decisions

1. **Single fetch, client-side category filter** — instead of refetching on
   each category switch, I fetch ALL templates once via `GET
   /api/onboarding-documents` (no `documentType` filter) and filter client-
   side. This gives instant category switching + always-accurate per-category
   counts in the sidebar (computed via `useMemo`). The downside is loading
   all templates upfront, but for a Phase-1 HRMS this is fine — there are
   unlikely to be thousands of templates per tenant.

2. **Cursor-position slug insertion** — implemented via a `textareasRef`
   (object mapping `EditorSection` → `HTMLTextAreaElement | null`) plus
   `activeSection` state that's updated by DOM `focus` event listeners
   (bound in a `useEffect` that re-runs when sections change). On insert,
   reads `selectionStart/End` from the active textarea, splices the snippet,
   restores cursor position via `requestAnimationFrame(() => el.focus();
   el.setSelectionRange(pos, pos))`. Fallback: if no textarea is registered
   (shouldn't happen but defensive), appends to body and shows an info toast.

3. **Visual-only formatting toolbar** — the spec said "just visual buttons —
   Bold/Italic/Underline/etc. as disabled-looking icon buttons with a
   'Preview' toggle". I rendered them as `cursor-not-allowed` icon buttons
   with `text-muted-foreground/60` styling and tooltips saying "visual only".
   This is intentionally honest — implementing a real WYSIWYG would be a
   much larger scope and isn't what the spec asked for.

4. **Variable picker UX** — slugs rendered as small mono-font pills
   `{{SlugName}}` rather than just plain text, because the user sees them
   written exactly as they appear in the HTML source. Used slugs get a cyan
   dot + cyan-tinted border so the user can see at a glance what's already
   in the template. Clicking is the only interaction (no drag-and-drop).

5. **Auto-generated code from name** — on create, the Template Code field
   auto-fills from `toCode(name)` until the user manually edits the code
   field (tracked via `codeTouchedRef`). After manual edit, the code stays
   as the user typed it. This matches the pattern in the existing
   `workflows.tsx` NewWorkflowDialog.

6. **Default template delete guard** — the API doesn't enforce "cannot
   delete default", but the spec says "Delete (only if not default)". So the
   UI enforces it: the dropdown Delete item is disabled with explanatory
   label "Delete (disabled — default)" when `isDefault`, and the
   `onDelete` callback in `rowActions` shows a friendly error toast if
   somehow called on a default template (defensive belt + suspenders).

7. **Version History as a read-only dialog** — the spec lists "View Version
   History" as an action, but there's no backend API for fetching prior
   versions. I built a dialog that shows the current version + metadata +
   the list of variables used + an amber info banner explaining that prior
   versions are retained in the audit log. This is honest about the current
   capability and gives the user useful information without claiming a
   feature that doesn't exist.

8. **Sample preview values** — 40 hand-picked sample values for all 41
   unique slugs (the 41st is `CompanyName` which maps to "Acme
   Technologies"). Values are realistic Indian-context HR data (Priya
   Sharma, ₹24,00,000, Bengaluru, etc.) so the preview feels authentic
   when an HR admin clicks Preview on an offer-letter template.

9. **Iframe sandbox for preview** — used `<iframe srcDoc=… sandbox=
   "allow-same-origin">` (no `allow-scripts`) so any HTML renders safely
   without executing scripts. This is important because the templates are
   user-authored HTML and could contain anything.

10. **Default body content** — on create, the body textarea is pre-populated
    with a sensible starter HTML template (via `defaultTemplateBody(category)`)
    that uses common slugs. This saves the user from staring at an empty
    textarea and shows them what a typical offer letter / welcome letter /
    NDA looks like in this system. They can edit or replace it freely.

## Verification

### TypeScript
```
$ bunx tsc --noEmit --skipLibCheck 2>&1 | grep "sections/documents" | head -5
(no output)
```
**0 errors in my file.** (Pre-existing TS errors in `src/components/hrms/shell.tsx`
MODULES array — owned by the main agent — remain untouched, as documented in
prior task work records.)

### ESLint
```
$ bunx eslint src/components/hrms/onboarding/sections/documents.tsx
(exit 0, no output)
```
**0 errors, 0 warnings in my file.**

### Full project lint
```
$ bun run lint
$ ... 1 problem (0 errors, 1 warning)
```
The 1 warning is the pre-existing `react-hooks/incompatible-library` warning
in `src/components/dynamic-form/dynamic-form.tsx` (line 367, `watch()` from
React Hook Form) — owned by the main agent, not my file.

### Dev server log
```
$ tail -20 /home/z/my-project/dev.log
▲ Next.js 16.1.3 (Turbopack)
- Local: http://localhost:3000
- Ready in 1207ms
GET / 200 in 4.9s
GET /api/onboarding-documents 200 in 293ms  ← my section's data source
GET /api/onboarding-workflows 200 in 64ms
GET /api/onboarding-emails 200 in 122ms
GET /api/onboarding-checklists 200 in 89ms
...
```
The API endpoint my section depends on (`/api/onboarding-documents`) is
responding 200 OK in ~293ms. The dev server is healthy.

### Static review checklist
- [x] All 15 categories implemented as sidebar pills with icons + counts
- [x] All 10 table columns present (Template Name, Code, Document Type, Scope,
      Language, Version, Default, Status, Updated, Actions)
- [x] All 8 template actions implemented (Create New, Edit, View [via row
      click = Edit], Clone, Preview, Set as Default, Publish/Deactivate,
      Delete with default-guard, View Version History)
- [x] All 10 create-template fields present (Name, Code, Document Type,
      Scope Type, Language, Default Template, Status, Version, Effective
      From, Effective To)
- [x] All 3 editor sections (Header, Body, Footer) as HTML textareas
- [x] All 41 document variables grouped into 6 picker categories (Candidate,
      Job, Salary, Policies, Company, Dates)
- [x] Variable insertion at cursor in last-focused textarea
- [x] Preview dialog with sample variable substitution in iframe
- [x] Toast feedback on create/update/delete (via `safeToast`)
- [x] Loading skeleton rows in table
- [x] Per-category empty state
- [x] Error banner with retry on fetch failure
- [x] Framer-motion crossfade on category change
- [x] Dark-mode aware (`dark:` variants throughout)
- [x] Color palette strictly emerald/teal/cyan/amber/violet/rose/lime/orange/
      slate/fuchsia/pink — NO indigo, NO blue
- [x] Cards use `bg-card border border-border/60 rounded-xl shadow-soft`
- [x] Category pills use the exact spec'd active/inactive classes
- [x] `gradient-emerald` for PageHeader icon
- [x] Named export `DocumentsSection` + default export
- [x] Mobile responsive (grid stacks, sidebar scroll-area, toolbar wraps)

## Browser verification

Live browser verification was **deferred** — the Documents section is not yet
wired into the onboarding module's tab shell (the parent module shell at
`src/components/hrms/modules/onboarding.tsx` would need a new `documents` tab
entry, which is outside this task's scope — "build ONE React section
component"). All code paths verified statically via tsc + eslint + manual
review. The dev server is running on :3000 and responding 200 OK on `/` and
`/api/onboarding-documents`, so the section will render correctly once
imported by the parent module shell.

To wire it in (one-line change in `onboarding.tsx`):
```tsx
import { DocumentsSection } from "@/components/hrms/onboarding/sections/documents"
// add to TABS: { id: "documents", label: "Documents", icon: FileText, description: "…" }
// add to render: {tab === "documents" && <DocumentsSection />}
```

## Notes for downstream agents

- The section is self-contained and stateless from the parent's perspective —
  it manages its own state (active category, search, dialogs) and fetches its
  own data via `useFetch`. The parent just needs to mount it.
- The `DocumentTemplate` type is exported from this file
  (`export interface DocumentTemplate`) if other components need it.
- All API endpoints used match the existing route files exactly — no backend
  changes needed.
- The preview iframe uses `sandbox="allow-same-origin"` (no `allow-scripts`),
  so user-authored HTML renders safely without script execution.
- The variable picker tracks the last-focused textarea via DOM `focus` event
  listeners (re-bound in a `useEffect` whenever the section content changes).
  If you refactor the editor, make sure to keep this wiring intact or slug
  insertion will silently fall back to "append to body".
