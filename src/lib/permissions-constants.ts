// =====================================================================
// Roles & Permissions — central constants & catalog
// =====================================================================
// Single source of truth for module list, action catalog, sensitive
// fields, role types, scope options and risk levels. Used by every
// section of the Roles & Permissions module so the UI and the engine
// always agree.

export interface ModuleDef {
  id: string;
  label: string;
  group: string;
  icon?: string;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  description: string;
  pages?: { id: string; label: string }[];
}

// ---------------------------------------------------------------
// HRMS module catalog (kept in sync with shell sidebar)
// ---------------------------------------------------------------
export const MODULES: ModuleDef[] = [
  { id: "dashboard", label: "Dashboard", group: "Overview", riskLevel: "Low", description: "Analytics & reports overview" },
  { id: "organization", label: "Organization", group: "Config", riskLevel: "Medium", description: "Entities, branches, departments, designations, grades" },
  { id: "employees", label: "Employee Master", group: "People", riskLevel: "High", description: "Employee records & sensitive personal data", pages: [
    { id: "employee-list", label: "Employee List" },
    { id: "create-employee", label: "Create Employee" },
    { id: "import-employee", label: "Import Employee" },
    { id: "bulk-update", label: "Bulk Update" },
    { id: "employee-profile", label: "Employee Profile" },
  ]},
  { id: "onboarding", label: "Onboarding", group: "People", riskLevel: "Medium", description: "Candidate pipelines & offer letters" },
  { id: "offboarding", label: "Offboarding", group: "People", riskLevel: "High", description: "Exit management & FnF" },
  { id: "leave", label: "Leave", group: "Time", riskLevel: "Low", description: "Leave types, rules, applications & approvals" },
  { id: "shift", label: "Shifts", group: "Time", riskLevel: "Low", description: "Shift master & assignments" },
  { id: "roster", label: "Roster", group: "Time", riskLevel: "Low", description: "Roster planning" },
  { id: "attendance", label: "Attendance", group: "Time", riskLevel: "Low", description: "Daily attendance, regularization & overtime" },
  { id: "holiday", label: "Holidays", group: "Time", riskLevel: "Low", description: "Holiday calendar" },
  { id: "payroll", label: "Payroll", group: "Finance", riskLevel: "Critical", description: "Salary, payroll runs, payslips, components" },
  { id: "documents", label: "Documents", group: "Documents", riskLevel: "Medium", description: "Employee & HR documents, templates & letters" },
  { id: "asset", label: "Assets", group: "Config", riskLevel: "Low", description: "Asset master & assignment" },
  { id: "announcements", label: "Announcements", group: "People", riskLevel: "Low", description: "Company announcements" },
  { id: "forms", label: "Form Builder", group: "System", riskLevel: "Medium", description: "Dynamic form schemas" },
  { id: "workflows", label: "Workflows", group: "System", riskLevel: "Medium", description: "Approval workflows" },
  { id: "roles-permissions", label: "Roles & Permissions", group: "Access", riskLevel: "Critical", description: "Enterprise access control" },
  { id: "audit", label: "Audit Log", group: "System", riskLevel: "Medium", description: "Activity history" },
  { id: "settings", label: "Settings", group: "System", riskLevel: "High", description: "Tenant configuration" },
]

export const MODULE_MAP: Record<string, ModuleDef> = Object.fromEntries(MODULES.map(m => [m.id, m]))

// ---------------------------------------------------------------
// Access levels
// ---------------------------------------------------------------
export const ACCESS_LEVELS = [
  { value: "NoAccess", label: "No Access", color: "bg-slate-400", short: "—" },
  { value: "View", label: "View Only", color: "bg-sky-500", short: "V" },
  { value: "Manage", label: "Manage", color: "bg-emerald-500", short: "M" },
  { value: "FullAccess", label: "Full Access", color: "bg-violet-500", short: "F" },
  { value: "Custom", label: "Custom", color: "bg-amber-500", short: "C" },
] as const
export type AccessLevel = typeof ACCESS_LEVELS[number]["value"]
export const ACCESS_LEVEL_MAP: Record<string, { label: string; color: string; short: string }> =
  Object.fromEntries(ACCESS_LEVELS.map(a => [a.value, { label: a.label, color: a.color, short: a.short }]))

// ---------------------------------------------------------------
// Actions
// ---------------------------------------------------------------
export const ACTIONS = [
  { value: "view", label: "View", riskLevel: "Low" },
  { value: "create", label: "Create", riskLevel: "Medium" },
  { value: "edit", label: "Edit", riskLevel: "Medium" },
  { value: "delete", label: "Delete", riskLevel: "Critical" },
  { value: "approve", label: "Approve", riskLevel: "High" },
  { value: "reject", label: "Reject", riskLevel: "High" },
  { value: "sendBack", label: "Send Back", riskLevel: "Medium" },
  { value: "import", label: "Import", riskLevel: "Medium" },
  { value: "export", label: "Export", riskLevel: "High" },
  { value: "download", label: "Download", riskLevel: "Medium" },
  { value: "upload", label: "Upload", riskLevel: "Medium" },
  { value: "print", label: "Print", riskLevel: "Low" },
  { value: "email", label: "Email", riskLevel: "Low" },
  { value: "publish", label: "Publish", riskLevel: "High" },
  { value: "unpublish", label: "Unpublish", riskLevel: "Medium" },
  { value: "archive", label: "Archive", riskLevel: "Medium" },
  { value: "restore", label: "Restore", riskLevel: "Medium" },
  { value: "bulkUpdate", label: "Bulk Update", riskLevel: "High" },
  { value: "bulkDelete", label: "Bulk Delete", riskLevel: "Critical" },
  { value: "assign", label: "Assign", riskLevel: "Medium" },
  { value: "reassign", label: "Reassign", riskLevel: "Medium" },
  { value: "lock", label: "Lock", riskLevel: "High" },
  { value: "unlock", label: "Unlock", riskLevel: "High" },
  { value: "override", label: "Override", riskLevel: "Critical" },
] as const
export type Action = typeof ACTIONS[number]["value"]

// ---------------------------------------------------------------
// Field access levels
// ---------------------------------------------------------------
export const FIELD_ACCESS = [
  { value: "Hidden", label: "Hidden", color: "bg-slate-500" },
  { value: "View", label: "View", color: "bg-sky-500" },
  { value: "Edit", label: "Edit", color: "bg-emerald-500" },
  { value: "Required", label: "Required", color: "bg-rose-500" },
  { value: "Masked", label: "Masked", color: "bg-amber-500" },
  { value: "ViewOnlyOwn", label: "View Own Only", color: "bg-violet-500" },
] as const
export type FieldAccess = typeof FIELD_ACCESS[number]["value"]
export const FIELD_ACCESS_MAP: Record<string, { label: string; color: string }> =
  Object.fromEntries(FIELD_ACCESS.map(f => [f.value, { label: f.label, color: f.color }]))

// ---------------------------------------------------------------
// Sensitive fields (HR data)
// ---------------------------------------------------------------
export const SENSITIVE_FIELDS = [
  { field: "salary", label: "Salary / CTC", module: "employees", riskLevel: "Critical" },
  { field: "bankAccount", label: "Bank Account Number", module: "employees", riskLevel: "High" },
  { field: "ifsc", label: "IFSC Code", module: "employees", riskLevel: "High" },
  { field: "panNumber", label: "PAN Number", module: "employees", riskLevel: "High" },
  { field: "aadhaarNumber", label: "Aadhaar Number", module: "employees", riskLevel: "Critical" },
  { field: "passport", label: "Passport", module: "employees", riskLevel: "High" },
  { field: "uan", label: "UAN", module: "employees", riskLevel: "High" },
  { field: "esiNumber", label: "ESI Number", module: "employees", riskLevel: "High" },
  { field: "medicalDetails", label: "Medical Details", module: "employees", riskLevel: "High" },
  { field: "disciplinaryNotes", label: "Disciplinary Notes", module: "employees", riskLevel: "High" },
  { field: "offerLetter", label: "Offer Letter", module: "onboarding", riskLevel: "Medium" },
  { field: "payslip", label: "Payslip", module: "payroll", riskLevel: "Critical" },
  { field: "form16", label: "Form 16", module: "payroll", riskLevel: "Critical" },
  { field: "performanceRating", label: "Performance Rating", module: "employees", riskLevel: "High" },
  { field: "exitReason", label: "Exit Reason", module: "offboarding", riskLevel: "Medium" },
  { field: "fnfAmount", label: "FnF Amount", module: "offboarding", riskLevel: "Critical" },
] as const

// ---------------------------------------------------------------
// Role types
// ---------------------------------------------------------------
export const ROLE_TYPES = [
  { value: "System", label: "System Role", color: "bg-violet-500", desc: "Built-in role, cannot be deleted" },
  { value: "Custom", label: "Custom Role", color: "bg-emerald-500", desc: "Created by admin" },
  { value: "Functional", label: "Functional Role", color: "bg-sky-500", desc: "Linked to a module/function" },
  { value: "Implicit", label: "Implicit Role", color: "bg-amber-500", desc: "Auto-assigned by org relationship" },
  { value: "Workflow", label: "Workflow / Approval Role", color: "bg-rose-500", desc: "Used only in workflows" },
  { value: "Temporary", label: "Temporary Role", color: "bg-cyan-500", desc: "Time-bound access" },
] as const
export const ROLE_TYPE_MAP: Record<string, { label: string; color: string; desc: string }> =
  Object.fromEntries(ROLE_TYPES.map(r => [r.value, { label: r.label, color: r.color, desc: r.desc }]))

// ---------------------------------------------------------------
// Data scope options
// ---------------------------------------------------------------
export const DATA_SCOPES = [
  { value: "Self", label: "Self Only" },
  { value: "DirectReports", label: "Direct Reports" },
  { value: "DirectIndirectReports", label: "Direct + Indirect Reports" },
  { value: "SameDepartment", label: "Same Department" },
  { value: "SameLocation", label: "Same Location" },
  { value: "SameEntity", label: "Same Entity" },
  { value: "SelectedEntity", label: "Selected Entity" },
  { value: "SelectedBranch", label: "Selected Branch" },
  { value: "SelectedLocation", label: "Selected Location" },
  { value: "SelectedDepartment", label: "Selected Department" },
  { value: "SelectedGrade", label: "Selected Grade" },
  { value: "SelectedEmployeeType", label: "Selected Employee Type" },
  { value: "CustomEmployeeGroup", label: "Custom Employee Group" },
  { value: "SpecificEmployees", label: "Specific Employees" },
  { value: "All", label: "All Employees" },
] as const

// ---------------------------------------------------------------
// Risk levels
// ---------------------------------------------------------------
export const RISK_LEVELS = [
  { value: "Low", label: "Low", color: "text-emerald-600 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  { value: "Medium", label: "Medium", color: "text-amber-600 bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  { value: "High", label: "High", color: "text-orange-600 bg-orange-50 border-orange-200", dot: "bg-orange-500" },
  { value: "Critical", label: "Critical", color: "text-rose-600 bg-rose-50 border-rose-200", dot: "bg-rose-500" },
] as const
export const RISK_LEVEL_MAP: Record<string, { label: string; color: string; dot: string }> =
  Object.fromEntries(RISK_LEVELS.map(r => [r.value, { label: r.label, color: r.color, dot: r.dot }]))

// ---------------------------------------------------------------
// Approval modules & types
// ---------------------------------------------------------------
export const APPROVAL_MODULES = [
  { value: "leave", label: "Leave" },
  { value: "attendance", label: "Attendance" },
  { value: "onboarding", label: "Onboarding" },
  { value: "offboarding", label: "Offboarding" },
  { value: "payroll", label: "Payroll" },
  { value: "salaryRevision", label: "Salary Revision" },
  { value: "document", label: "Document" },
  { value: "expense", label: "Expense" },
  { value: "asset", label: "Asset" },
  { value: "helpdesk", label: "Helpdesk" },
] as const

export const APPROVAL_TYPES = [
  { value: "Approver", label: "Approver" },
  { value: "Verifier", label: "Verifier" },
  { value: "Owner", label: "Owner" },
  { value: "Reviewer", label: "Reviewer" },
] as const

export const APPROVER_TYPES = [
  { value: "Employee", label: "Specific Employee" },
  { value: "Role", label: "Role-based" },
  { value: "ReportingManager", label: "Reporting Manager" },
  { value: "DepartmentHead", label: "Department Head" },
  { value: "Position", label: "Position-based" },
] as const

// ---------------------------------------------------------------
// Delegation types
// ---------------------------------------------------------------
export const DELEGATION_TYPES = [
  { value: "ApprovalDelegation", label: "Approval Delegation" },
  { value: "TaskDelegation", label: "Task Delegation" },
  { value: "TemporaryRole", label: "Temporary Role Delegation" },
  { value: "ReadOnlyAccess", label: "Read-Only Access Delegation" },
] as const

// ---------------------------------------------------------------
// Access request types & statuses
// ---------------------------------------------------------------
export const ACCESS_REQUEST_TYPES = [
  { value: "NewRole", label: "Request New Role" },
  { value: "TemporaryAccess", label: "Request Temporary Access" },
  { value: "ModuleAccess", label: "Request Module Access" },
  { value: "ReportAccess", label: "Request Report Access" },
  { value: "DocumentAccess", label: "Request Document Access" },
  { value: "PayrollAccess", label: "Request Payroll Access" },
] as const

export const ACCESS_REQUEST_STATUSES = [
  { value: "Draft", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "Submitted", label: "Submitted", color: "bg-sky-100 text-sky-700" },
  { value: "PendingApproval", label: "Pending Approval", color: "bg-amber-100 text-amber-700" },
  { value: "Approved", label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  { value: "Rejected", label: "Rejected", color: "bg-rose-100 text-rose-700" },
  { value: "Expired", label: "Expired", color: "bg-slate-100 text-slate-500" },
  { value: "Revoked", label: "Revoked", color: "bg-rose-100 text-rose-700" },
] as const

// ---------------------------------------------------------------
// Audit log actions catalog
// ---------------------------------------------------------------
export const AUDIT_ACTIONS = [
  "RoleCreated", "RoleUpdated", "RoleDeleted", "RoleCloned",
  "PermissionChanged", "UserRoleAssigned", "UserRoleRemoved",
  "DataScopeChanged", "FieldPermissionChanged",
  "AccessRequestApproved", "AccessRequestRejected",
  "TemporaryAccessGranted", "TemporaryAccessExpired",
  "LoginAttempt", "PermissionDenied", "SensitiveDataViewed", "ExportPerformed",
  "DelegationCreated", "DelegationRevoked",
  "ApprovalRoleCreated", "ApprovalRoleUpdated",
  "SettingsUpdated",
] as const

// ---------------------------------------------------------------
// Status options (generic)
// ---------------------------------------------------------------
export const STATUS_OPTIONS = [
  { value: "Active", label: "Active", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "Inactive", label: "Inactive", color: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "Draft", label: "Draft", color: "bg-amber-100 text-amber-700 border-amber-200" },
] as const
export const STATUS_MAP: Record<string, { label: string; color: string }> =
  Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, { label: s.label, color: s.color }]))

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
export function parseJsonArray(v: string | null | undefined): string[] {
  if (!v) return []
  try { const r = JSON.parse(v); return Array.isArray(r) ? r : [] } catch { return [] }
}

export function maskValue(value: string | null | undefined, mode: "full" | "partial" = "partial"): string {
  if (!value) return "—"
  const s = String(value)
  if (mode === "full") return "•".repeat(Math.min(s.length, 12))
  if (s.length <= 4) return "XXXX"
  // Show last 4 chars (for bank/acct) or last 4 with prefix mask
  const last4 = s.slice(-4)
  if (s.length <= 8) return `XXXX-${last4}`
  // Aadhaar/PAN style
  if (s.length >= 10 && s.length <= 14) return `XXXX-XXXX-${last4}`
  return `${"X".repeat(Math.min(s.length - 4, 8))}${last4}`
}
