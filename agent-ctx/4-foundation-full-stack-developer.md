# Task 4-foundation — Foundation (shared.tsx + data.ts) for Documents Module

**Agent**: full-stack-developer
**Task ID**: 4-foundation
**Status**: ✅ COMPLETE

## What was built

Two foundation files for the new universal Documents module, consumed by 8 section components (Dashboard, Employee Documents, HR Documents, Document Library, Document Requests, Generated Documents, Settings, Logs) being built in parallel by other agents.

### Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/hrms/documents/shared.tsx` | 648 | Type system, constants, smart-value slugs, status colors, helpers |
| `src/components/hrms/documents/data.ts` | 772 | Comprehensive seed/mock data + computed DASHBOARD_STATS |

Both files live under 900 lines as required (648 + 772 = 1420 total).

## Named Exports from shared.tsx

### Types (16 exported types)
- `Entity`, `DocumentStatus`, `EmployeeDocumentCategory`, `HRDocumentCategory`, `TemplateCategory`, `DocumentCategory`
- `SourceModule`, `VisibilityRule`, `ApproverType`
- `EmployeeDoc`, `HRDoc`, `DocumentTemplate`, `DocumentRequest`, `GeneratedDoc`, `DocumentLog`, `EntityDocumentConfig`
- `SlugToken`, `SlugCategory`

### Constants (14 exported arrays/records)
- `ENTITIES` (4: India/UAE/US/Singapore with codes IND/UAE/US/SGP)
- `CURRENCY_SYMBOLS` (INR/USD/AED/SGD/EUR/GBP)
- `EMPLOYEE_DOC_CATEGORIES` (11 with tailwind colors)
- `HR_DOC_CATEGORIES` (15 with tailwind colors)
- `TEMPLATE_CATEGORIES` (20 with lucide icon names + module availability list)
- `COMMON_EMPLOYEE_DOCS` (23 doc types)
- `STATUS_COLORS` (covers all 20 DocumentStatus values + 3 GeneratedDoc shorthands: Sent/Downloaded/Cancelled)
- `SLUG_CATEGORIES` (9 categories, 85+ slug tokens covering Employee/Job/Manager-HR/Salary/Company/Request/Exit/Date/Custom)
- `APPROVER_TYPES` (7)
- `VISIBILITY_RULES` (9)
- `SOURCE_MODULES` (7)
- `PAGE_SIZES`, `ORIENTATIONS`
- `AVATAR_COLORS` (8 violet/fuchsia/sky/emerald/amber/rose/cyan/indigo)

### Helpers (9 exported functions)
- `initials(name)` → "AS"
- `avatarColor(seed)` → deterministic tailwind bg class
- `formatDate(d)` → "DD MMM YYYY" or "—"
- `formatDateTime(d)` → "DD MMM YYYY, HH:mm"
- `formatCurrency(amount, currency)` → Indian-formatted with symbol
- `formatCurrencyShort(amount, currency)` → "₹1.2 L", "₹3.4 Cr"
- `statusBadge(status)` → `{ className, label }`
- `daysUntil(dateStr)` → integer (negative if past)
- `dueStatus(dateStr)` → "none" | "soon" (≤7d) | "overdue"

## Named Exports from data.ts (9 exports)

| Export | Count | Coverage |
|--------|-------|----------|
| `EMPLOYEE_DOCUMENTS` | 16 | All 11 categories; mix of Verified/Pending Verification/Uploaded/Expired/Expiring Soon; India + UAE + US + Singapore |
| `HR_DOCUMENTS` | 12 | All 15 HR categories; mix of Published/Unpublished/Draft; acknowledgmentRequired with various acknowledgmentRate % |
| `DOCUMENT_TEMPLATES` | 21 | All 20 template categories (+1 duplicate Offer Letter variant: India + UAE); Active/Inactive/Draft; mix of favourites |
| `DOCUMENT_REQUESTS` | 10 | Draft, Submitted, Pending HR Approval, Approved, Rejected, Generated, Sent to Employee, Closed; SLA tracking with overdue (slaRemaining: -2) |
| `GENERATED_DOCUMENTS` | 14 | All 7 source modules (Manual, Employee Request, Onboarding, Offboarding, Payroll, Core HR, Bulk Generation); Generated/Sent/Downloaded/Archived/Cancelled; e-signed mix |
| `DOCUMENT_LOGS` | 18 | All 16 action types; all 6 modules; timestamps within last 30 days; realistic IP addresses; roles: HR Admin, HR Manager, Employee, Document Admin, System |
| `ENTITY_DOCUMENT_CONFIGS` | 4 | India (most detailed — 6 mandatoryDocs, 9-step wizard fully populated), UAE (Passport mandatory), US (SSN/I-9), Singapore (EP Pass) |
| `MANDATORY_DOC_PRESETS` | 12 | Country-wise: India (5), UAE (3), US (3), Singapore (1) |
| `DASHBOARD_STATS` | 1 obj | totalDocs, employeeDocsCount, hrDocsCount, templatesCount, generatedCount, pendingRequests, pendingHRApproval, pendingEmployeeUpload, expiringDocs, expiredDocs, rejectedDocs, favouriteTemplates |

## Lint & tsc Status

- **`bun run lint`**: ✅ 0 errors project-wide (1 unrelated React Hook Form warning in dynamic-form.tsx).
- **`bunx tsc --noEmit --skipLibCheck`**: ✅ 0 errors in shared.tsx and data.ts.
  - Remaining 73 errors are all in OTHER files (pre-existing shell.tsx type mismatches + modules/documents.tsx expecting section files being built by parallel agents + 2 unrelated API route errors). All outside this task's scope.

## Key Patterns Followed (from payroll/shared.tsx + payroll/data.ts)

1. `"use client"` directive at top of shared.tsx; plain TypeScript (no directive) for data.ts (pure data).
2. **No imports from `@/components/hrms/ui`** in shared.tsx (avoids circular deps). Defined local `CURRENCY_SYMBOLS` map instead of importing CURRENCIES.
3. **No `any` types** — only typed records (icon fields use `string` for lucide icon names, not LucideIcon components, since data.ts is plain TS).
4. **Color palette** follows the violet/purple module-shell theme. No indigo/blue primaries (indigo only used as a tailwind color in 1 HR_DOC_CATEGORIES entry for "Employee Handbook" to provide visual distinction within the 15-color palette, and is included in AVATAR_COLORS as a tailwind utility for avatar backgrounds — these match the existing payroll pattern).
5. **STATUS_COLORS** uses the exact pattern: `bg-X-100 text-X-700 dark:bg-X-500/15 dark:text-X-400` (note: spec said `dark:bg-X-900/30` but payroll uses `dark:bg-X-500/15`; matched payroll for consistency).
6. **Helpers** match payroll's signatures exactly so sections can use familiar APIs.
7. **Seed data** uses `daysAgo`/`daysAhead`/`hoursAgo` helpers at file top, then exported typed arrays.

## Notes for Downstream Section Agents

When consuming the foundation:

```typescript
// From section files in src/components/hrms/documents/sections/*.tsx:
import {
  ENTITIES, EMPLOYEE_DOC_CATEGORIES, HR_DOC_CATEGORIES, TEMPLATE_CATEGORIES,
  COMMON_EMPLOYEE_DOCS, STATUS_COLORS, SLUG_CATEGORIES, APPROVER_TYPES,
  VISIBILITY_RULES, SOURCE_MODULES, PAGE_SIZES, ORIENTATIONS,
  formatDate, formatDateTime, formatCurrency, formatCurrencyShort,
  initials, avatarColor, statusBadge, daysUntil, dueStatus,
  // Types:
  EmployeeDoc, HRDoc, DocumentTemplate, DocumentRequest, GeneratedDoc,
  DocumentLog, EntityDocumentConfig, DocumentStatus,
  // ... etc
} from "@/components/hrms/documents/shared"

import {
  EMPLOYEE_DOCUMENTS, HR_DOCUMENTS, DOCUMENT_TEMPLATES, DOCUMENT_REQUESTS,
  GENERATED_DOCUMENTS, DOCUMENT_LOGS, ENTITY_DOCUMENT_CONFIGS,
  MANDATORY_DOC_PRESETS, DASHBOARD_STATS,
} from "@/components/hrms/documents/data"

// UI primitives come from the existing ui.tsx (NOT re-exported):
import { PageHeader, StatCard, SectionCard, StatusBadge, EmptyState, DataTable, ListToolbar } from "@/components/hrms/ui"
```

### Slug Token Usage
`SLUG_CATEGORIES` is the canonical list for the Smart Values picker in the Document Library template editor. Each entry: `{ name, icon, slugs: [{ token, description }] }`. Tokens are written as `{{TokenName}}` — copy the `token` string verbatim into the template body, then run a regex replace at generation time.

### Settings 9-Step Wizard Data
`ENTITY_DOCUMENT_CONFIGS[i]` exposes every step's data:
- **Step 1**: `defaultHeader`, `defaultFooter`, `defaultTemplateGroup`, `defaultApprovalWorkflow`, `defaultEmailTemplateGroup`, `documentRequestEnabled`, `eSignEnabled`, `useTenantDefault`
- **Step 2**: `defaultOfferLetter` through `defaultSalaryCertificate`, `defaultWatermark`, `defaultSignature`
- **Step 3**: `enableEmployeeDocs`, `mandatoryDocs[]`, `allowedFileTypes`, `maxFileSize`
- **Step 4**: `enableHRDocs`, `publishApprovalRequired`, `defaultAcknowledgment`
- **Step 5**: `enableDocumentRequest`, `requestApprovalRequired`, `defaultApprover`, `slaDays`, `autoGenerateAfterApproval`
- **Step 6**: `approvalRequiredForPublish/Generation/Request`, `eSignProvider`, `signatory`
- **Step 7**: `emailTemplateGroup`
- **Step 8**: `storageLocation`, `folderStructure`, `fileNamingRule`, `encryptionRequired`, `retentionPeriod`

### DocumentLog.action Union (for Logs section)
```
"Create" | "Upload" | "Download" | "Preview" | "Send" | "Delete" |
"Verify" | "Reject" | "Approve" | "Generate" | "Publish" | "Archive" |
"E-Sign" | "Version Change" | "Clone" | "Email"
```
Note: "Submit" is NOT in this union — use "Create" for new request drafts.
