"use client"

// ============================================================================
//  Documents — shared types, constants & helpers
// ----------------------------------------------------------------------------
//  Single source of truth for all 8 documents section components
//  (Dashboard, Employee Documents, HR Documents, Document Library,
//   Document Requests, Generated Documents, Settings, Logs).
//
//  Color system: violet/purple primary on slate base (matches module shell).
//  Status palettes: emerald=success/verified, amber=pending/warning,
//  rose=rejected/expired, sky=sent/info, violet=generated, slate=draft.
// ============================================================================

// ---------- Entities ----------
export interface Entity {
  id: string
  name: string
  code: string
  country: string
  state: string
  currency: string
}

export const ENTITIES: Entity[] = [
  { id: "ent-1", name: "ACME India Pvt Ltd", code: "IND", country: "India", state: "Maharashtra", currency: "INR" },
  { id: "ent-2", name: "ACME UAE FZE", code: "UAE", country: "UAE", state: "Dubai", currency: "AED" },
  { id: "ent-3", name: "ACME US Inc", code: "US", country: "USA", state: "California", currency: "USD" },
  { id: "ent-4", name: "ACME Singapore Pte Ltd", code: "SGP", country: "Singapore", state: "Singapore", currency: "SGD" },
]

// ---------- Currency symbol map (no ui.tsx import to avoid circular deps) ----------
export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  AED: "AED ",
  SGD: "S$",
  EUR: "€",
  GBP: "£",
}

// ============================================================================
//  Type System
// ============================================================================

export type DocumentStatus =
  | "Pending Upload" | "Uploaded" | "Pending Verification" | "Verified"
  | "Rejected" | "Correction Required" | "Expired" | "Expiring Soon"
  | "Archived" | "Published" | "Unpublished" | "Draft"
  | "Submitted" | "Pending HR Approval" | "Approved"
  | "Generated" | "Sent to Employee" | "Closed" | "Active" | "Inactive"

export type EmployeeDocumentCategory =
  | "Identity" | "Address" | "Education" | "Experience" | "Bank"
  | "Statutory" | "Employment Letters" | "Payroll" | "Exit"
  | "Compliance" | "Custom"

export type HRDocumentCategory =
  | "HR Policy" | "Leave Policy" | "Attendance Policy" | "Payroll Policy"
  | "Travel Policy" | "Expense Policy" | "IT Policy" | "Asset Policy"
  | "POSH Policy" | "Code of Conduct" | "Employee Handbook"
  | "Training Material" | "Compliance Document" | "Company Circular" | "Custom Policy"

export type TemplateCategory =
  | "Offer Letter" | "Appointment Letter" | "Confirmation Letter"
  | "Increment Letter" | "Promotion Letter" | "Transfer Letter"
  | "Internship Letter" | "Contract Letter" | "Warning Letter"
  | "Resignation Acceptance Letter" | "Relieving Letter"
  | "Experience Letter" | "Termination Letter" | "FnF Settlement Letter"
  | "No Dues Certificate" | "Salary Certificate" | "Employment Certificate"
  | "Address Proof Letter" | "Visa / Embassy Letter" | "Custom Document"

export type DocumentCategory = EmployeeDocumentCategory | HRDocumentCategory | TemplateCategory

export type SourceModule =
  | "Manual" | "Employee Request" | "Onboarding" | "Offboarding"
  | "Payroll" | "Core HR" | "Bulk Generation"

export type VisibilityRule =
  | "All Employees" | "Selected Entity" | "Selected Branch" | "Selected Location"
  | "Selected Department" | "Selected Grade" | "Selected Employee Type"
  | "Specific Employees" | "Specific Roles"

export type ApproverType =
  | "HR Owner" | "Reporting Manager" | "Department Head" | "Entity Admin"
  | "Document Admin" | "Specific Employee" | "Role-Based Approver"

// ---------- Employee Documents ----------
export interface EmployeeDoc {
  id: string
  employeeCode: string
  employeeName: string
  entityId: string
  entityName: string
  department: string
  designation: string
  documentName: string
  category: EmployeeDocumentCategory
  documentType: string
  uploadedDate: string | null
  uploadedBy: string | null
  verifiedBy: string | null
  verifiedDate: string | null
  expiryDate: string | null
  status: DocumentStatus
  fileSize: string
  version: number
  remarks?: string
}

// ---------- HR Documents ----------
export interface HRDoc {
  id: string
  documentName: string
  category: HRDocumentCategory
  entityId: string
  entityName: string
  department: string | null
  visibleTo: VisibilityRule
  uploadedDate: string
  uploadedBy: string
  version: string
  acknowledgmentRequired: boolean
  acknowledgmentDueDate?: string
  acknowledgmentRate: number
  status: "Published" | "Unpublished" | "Draft"
  fileSize: string
  description?: string
}

// ---------- Document Templates ----------
export interface DocumentTemplate {
  id: string
  name: string
  code: string
  category: TemplateCategory
  entityId: string
  entityName: string
  createdDate: string
  createdBy: string
  updatedBy: string
  version: string
  isFavourite: boolean
  status: "Active" | "Inactive" | "Draft"
  availableForRequest: boolean
  availableForHR: boolean
  availableForOnboarding: boolean
  availableForOffboarding: boolean
  availableForPayroll: boolean
  approvalRequired: boolean
  eSignRequired: boolean
  acknowledgmentRequired: boolean
  allowDownload: boolean
  allowEmail: boolean
  allowPrint: boolean
  description?: string
  headerTemplate?: string
  footerTemplate?: string
  bodyTemplate?: string
  pageSize: "A4" | "Letter" | "Legal" | "Custom"
  orientation: "Portrait" | "Landscape"
}

// ---------- Document Requests ----------
export interface DocumentRequest {
  id: string
  requestId: string
  employeeCode: string
  employeeName: string
  documentType: string
  entityId: string
  entityName: string
  reason: string
  addressedTo?: string
  purpose?: string
  requestedDate: string
  pendingWith: string
  status: DocumentStatus
  attachment?: boolean
  slaDays: number
  slaRemaining: number
}

// ---------- Generated Documents ----------
export interface GeneratedDoc {
  id: string
  generatedId: string
  documentName: string
  templateName: string
  employeeCode: string
  employeeName: string
  entityId: string
  entityName: string
  generatedDate: string
  generatedBy: string
  sourceModule: SourceModule
  status: "Generated" | "Sent" | "Downloaded" | "Archived" | "Cancelled"
  fileSize: string
  eSigned: boolean
}

// ---------- Document Logs ----------
export interface DocumentLog {
  id: string
  timestamp: string
  action: "Create" | "Upload" | "Download" | "Preview" | "Send" | "Delete"
    | "Verify" | "Reject" | "Approve" | "Generate" | "Publish" | "Archive"
    | "E-Sign" | "Version Change" | "Clone" | "Email"
  module: "Employee Documents" | "HR Documents" | "Document Library"
    | "Document Requests" | "Generated Documents" | "Settings"
  documentName: string
  documentId: string
  performedBy: string
  performedByRole: string
  entityId: string
  entityName: string
  details: string
  ipAddress: string
}

// ---------- Entity Document Config (9-step Settings wizard) ----------
export interface EntityDocumentConfig {
  id: string
  entityId: string
  entityName: string
  country: string
  state: string
  defaultHeader: string
  defaultFooter: string
  defaultTemplateGroup: string
  defaultApprovalWorkflow: string
  defaultEmailTemplateGroup: string
  documentRequestEnabled: boolean
  eSignEnabled: boolean
  useTenantDefault: boolean
  status: "Active" | "Inactive"
  effectiveFrom: string
  effectiveTo: string | null
  version: number
  // Step 2 template defaults
  defaultOfferLetter?: string
  defaultAppointmentLetter?: string
  defaultIncrementLetter?: string
  defaultPromotionLetter?: string
  defaultTransferLetter?: string
  defaultRelievingLetter?: string
  defaultExperienceLetter?: string
  defaultFnFLetter?: string
  defaultSalaryCertificate?: string
  defaultWatermark?: string
  defaultSignature?: string
  // Step 3 employee doc rules
  enableEmployeeDocs: boolean
  mandatoryDocs: {
    docType: string
    mandatory: boolean
    appliesTo: string
    verificationRequired: boolean
    expiryRequired: boolean
  }[]
  allowedFileTypes: string
  maxFileSize: string
  // Step 4 HR doc rules
  enableHRDocs: boolean
  publishApprovalRequired: boolean
  defaultAcknowledgment: boolean
  // Step 5 request rules
  enableDocumentRequest: boolean
  requestApprovalRequired: boolean
  defaultApprover: string
  slaDays: number
  autoGenerateAfterApproval: boolean
  // Step 6 approval & e-sign
  approvalRequiredForPublish: boolean
  approvalRequiredForGeneration: boolean
  approvalRequiredForRequest: boolean
  eSignProvider: string
  signatory: string
  // Step 7 email
  emailTemplateGroup: string
  // Step 8 storage & security
  storageLocation: string
  folderStructure: string
  fileNamingRule: string
  encryptionRequired: boolean
  retentionPeriod: string
}

// ============================================================================
//  Category Constants
// ============================================================================

export const EMPLOYEE_DOC_CATEGORIES: { value: EmployeeDocumentCategory; label: string; color: string }[] = [
  { value: "Identity", label: "Identity", color: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" },
  { value: "Address", label: "Address", color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400" },
  { value: "Education", label: "Education", color: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400" },
  { value: "Experience", label: "Experience", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400" },
  { value: "Bank", label: "Bank", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  { value: "Statutory", label: "Statutory", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
  { value: "Employment Letters", label: "Employment Letters", color: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400" },
  { value: "Payroll", label: "Payroll", color: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400" },
  { value: "Exit", label: "Exit", color: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400" },
  { value: "Compliance", label: "Compliance", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400" },
  { value: "Custom", label: "Custom", color: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400" },
]

export const HR_DOC_CATEGORIES: { value: HRDocumentCategory; label: string; color: string }[] = [
  { value: "HR Policy", label: "HR Policy", color: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" },
  { value: "Leave Policy", label: "Leave Policy", color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400" },
  { value: "Attendance Policy", label: "Attendance Policy", color: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400" },
  { value: "Payroll Policy", label: "Payroll Policy", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400" },
  { value: "Travel Policy", label: "Travel Policy", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  { value: "Expense Policy", label: "Expense Policy", color: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400" },
  { value: "IT Policy", label: "IT Policy", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
  { value: "Asset Policy", label: "Asset Policy", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400" },
  { value: "POSH Policy", label: "POSH Policy", color: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400" },
  { value: "Code of Conduct", label: "Code of Conduct", color: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400" },
  { value: "Employee Handbook", label: "Employee Handbook", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400" },
  { value: "Training Material", label: "Training Material", color: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400" },
  { value: "Compliance Document", label: "Compliance Document", color: "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-400" },
  { value: "Company Circular", label: "Company Circular", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400" },
  { value: "Custom Policy", label: "Custom Policy", color: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400" },
]

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string; icon: string; modules: string[] }[] = [
  { value: "Offer Letter", label: "Offer Letter", icon: "FileSignature", modules: ["Onboarding", "HR"] },
  { value: "Appointment Letter", label: "Appointment Letter", icon: "FileText", modules: ["Onboarding", "HR"] },
  { value: "Confirmation Letter", label: "Confirmation Letter", icon: "FileCheck2", modules: ["Core HR"] },
  { value: "Increment Letter", label: "Increment Letter", icon: "TrendingUp", modules: ["Payroll", "Core HR"] },
  { value: "Promotion Letter", label: "Promotion Letter", icon: "Award", modules: ["Core HR"] },
  { value: "Transfer Letter", label: "Transfer Letter", icon: "ArrowLeftRight", modules: ["Core HR"] },
  { value: "Internship Letter", label: "Internship Letter", icon: "GraduationCap", modules: ["Onboarding"] },
  { value: "Contract Letter", label: "Contract Letter", icon: "ScrollText", modules: ["Onboarding", "HR"] },
  { value: "Warning Letter", label: "Warning Letter", icon: "AlertTriangle", modules: ["Core HR"] },
  { value: "Resignation Acceptance Letter", label: "Resignation Acceptance", icon: "FileX2", modules: ["Offboarding"] },
  { value: "Relieving Letter", label: "Relieving Letter", icon: "FileCheck", modules: ["Offboarding"] },
  { value: "Experience Letter", label: "Experience Letter", icon: "BadgeCheck", modules: ["Offboarding", "Employee Request"] },
  { value: "Termination Letter", label: "Termination Letter", icon: "UserX", modules: ["Offboarding", "Core HR"] },
  { value: "FnF Settlement Letter", label: "FnF Settlement Letter", icon: "ReceiptText", modules: ["Offboarding", "Payroll"] },
  { value: "No Dues Certificate", label: "No Dues Certificate", icon: "ShieldCheck", modules: ["Offboarding", "Employee Request"] },
  { value: "Salary Certificate", label: "Salary Certificate", icon: "Banknote", modules: ["Employee Request", "Payroll"] },
  { value: "Employment Certificate", label: "Employment Certificate", icon: "BadgeCheck", modules: ["Employee Request"] },
  { value: "Address Proof Letter", label: "Address Proof Letter", icon: "MapPin", modules: ["Employee Request"] },
  { value: "Visa / Embassy Letter", label: "Visa / Embassy Letter", icon: "Plane", modules: ["Employee Request", "HR"] },
  { value: "Custom Document", label: "Custom Document", icon: "FilePlus2", modules: ["HR", "Employee Request"] },
]

export const COMMON_EMPLOYEE_DOCS: string[] = [
  "Profile Photo", "Resume", "Aadhaar Card", "PAN Card", "Passport",
  "Driving License", "Voter ID", "Bank Proof", "Cancelled Cheque",
  "Education Certificate", "Experience Letter", "Relieving Letter",
  "Previous Salary Slip", "Offer Letter", "Appointment Letter",
  "Confirmation Letter", "Increment Letter", "Promotion Letter",
  "Transfer Letter", "Payslip", "Form 16", "FnF Settlement Letter",
  "No Dues Certificate",
]

// ============================================================================
//  Status Color Palette
// ============================================================================

export const STATUS_COLORS: Record<string, string> = {
  // Upload lifecycle
  "Pending Upload": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Uploaded": "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "Pending Verification": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Verified": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Rejected": "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  "Correction Required": "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  "Expired": "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  "Expiring Soon": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Archived": "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  // HR docs
  "Published": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Unpublished": "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  "Draft": "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  // Requests
  "Submitted": "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "Pending HR Approval": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Approved": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  // Generated docs
  "Generated": "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  "Sent to Employee": "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  "Closed": "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  // Common
  "Active": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Inactive": "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  // Generated doc statuses (shorthand forms used in GeneratedDoc.status union)
  "Sent": "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  "Downloaded": "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "Cancelled": "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

// ============================================================================
//  Smart Value / Slug Categories
// ============================================================================

export interface SlugToken {
  token: string
  description: string
}
export interface SlugCategory {
  name: string
  icon: string
  slugs: SlugToken[]
}

export const SLUG_CATEGORIES: SlugCategory[] = [
  {
    name: "Employee Details",
    icon: "User",
    slugs: [
      { token: "{{EmployeeCode}}", description: "Unique employee code (e.g. EMP-001)" },
      { token: "{{EmployeeName}}", description: "Full legal name of the employee" },
      { token: "{{FirstName}}", description: "First name" },
      { token: "{{MiddleName}}", description: "Middle name" },
      { token: "{{LastName}}", description: "Last name" },
      { token: "{{PersonalEmail}}", description: "Personal email address" },
      { token: "{{OfficialEmail}}", description: "Official/company email address" },
      { token: "{{MobileNumber}}", description: "Mobile / contact number" },
      { token: "{{DateOfBirth}}", description: "Date of birth (formatted)" },
      { token: "{{Gender}}", description: "Gender" },
      { token: "{{MaritalStatus}}", description: "Marital status" },
      { token: "{{Nationality}}", description: "Nationality" },
      { token: "{{BloodGroup}}", description: "Blood group" },
      { token: "{{AadhaarNumber}}", description: "Aadhaar number (masked)" },
      { token: "{{PanNumber}}", description: "PAN number" },
      { token: "{{PassportNumber}}", description: "Passport number" },
      { token: "{{ProfilePic}}", description: "Profile picture URL (for header)" },
    ],
  },
  {
    name: "Job Details",
    icon: "Briefcase",
    slugs: [
      { token: "{{JoiningDate}}", description: "Date of joining" },
      { token: "{{ConfirmationDate}}", description: "Confirmation / probation end date" },
      { token: "{{ProbationPeriod}}", description: "Probation period (months)" },
      { token: "{{NoticeDays}}", description: "Notice period in days" },
      { token: "{{Department}}", description: "Department name" },
      { token: "{{Designation}}", description: "Designation / job title" },
      { token: "{{Grade}}", description: "Employee grade" },
      { token: "{{Band}}", description: "Salary band" },
      { token: "{{BusinessUnit}}", description: "Business unit" },
      { token: "{{CostCenter}}", description: "Cost center code" },
      { token: "{{Location}}", description: "Work location" },
      { token: "{{Branch}}", description: "Branch" },
      { token: "{{EntityName}}", description: "Legal entity name" },
      { token: "{{EmploymentType}}", description: "Full-Time / Part-Time / Contract" },
      { token: "{{EmployeeType}}", description: "Employee sub-type" },
      { token: "{{WorkMode}}", description: "Work mode — Onsite / Hybrid / Remote" },
    ],
  },
  {
    name: "Manager / HR",
    icon: "Users",
    slugs: [
      { token: "{{ReportingManager}}", description: "Reporting manager name" },
      { token: "{{ManagerCode}}", description: "Reporting manager employee code" },
      { token: "{{ManagerDesignation}}", description: "Manager's designation" },
      { token: "{{HROwner}}", description: "HR owner / SPOC name" },
      { token: "{{HREmail}}", description: "HR owner email" },
      { token: "{{DepartmentHead}}", description: "Department head name" },
      { token: "{{EntityAdmin}}", description: "Entity admin name" },
      { token: "{{HRHead}}", description: "HR head / CHRO name" },
    ],
  },
  {
    name: "Salary Details",
    icon: "Banknote",
    slugs: [
      { token: "{{CTCAnnual}}", description: "Annual CTC (formatted with currency)" },
      { token: "{{CTCMonthly}}", description: "Monthly CTC" },
      { token: "{{BasicMonthly}}", description: "Monthly basic salary" },
      { token: "{{HRAMonthly}}", description: "Monthly HRA" },
      { token: "{{GrossMonthly}}", description: "Monthly gross" },
      { token: "{{NetPayMonthly}}", description: "Monthly net / in-hand" },
      { token: "{{PreviousCTC}}", description: "Previous CTC (for increment letters)" },
      { token: "{{RevisedCTC}}", description: "Revised CTC (for increment letters)" },
      { token: "{{HikePercent}}", description: "Hike percentage" },
      { token: "{{IncrementAmount}}", description: "Absolute increment amount" },
      { token: "{{EffectiveDate}}", description: "Salary revision effective date" },
      { token: "{{PayrollFrequency}}", description: "Monthly / Bi-Weekly / etc." },
      { token: "{{Currency}}", description: "Currency code & symbol" },
    ],
  },
  {
    name: "Company Details",
    icon: "Building2",
    slugs: [
      { token: "{{CompanyName}}", description: "Legal company name" },
      { token: "{{CompanyCode}}", description: "Company code (IND / UAE / US / SGP)" },
      { token: "{{CompanyAddress}}", description: "Registered office address" },
      { token: "{{CompanyLogo}}", description: "Company logo URL (for header)" },
      { token: "{{CompanyWebsite}}", description: "Company website URL" },
      { token: "{{CompanyCIN}}", description: "Corporate identification number (India)" },
      { token: "{{CompanyTRN}}", description: "Tax registration number (UAE)" },
      { token: "{{CompanyEIN}}", description: "Employer identification number (US)" },
      { token: "{{CompanyUEN}}", description: "Unique entity number (Singapore)" },
    ],
  },
  {
    name: "Document Request",
    icon: "Inbox",
    slugs: [
      { token: "{{RequestID}}", description: "Document request ID" },
      { token: "{{RequestDate}}", description: "Date the request was raised" },
      { token: "{{DocumentType}}", description: "Requested document type" },
      { token: "{{Reason}}", description: "Reason for request" },
      { token: "{{Purpose}}", description: "Purpose — Bank / Visa / Reference etc." },
      { token: "{{AddressedTo}}", description: "Addressed-to party (Bank / Embassy / Landlord)" },
      { token: "{{SLADate}}", description: "SLA due date" },
    ],
  },
  {
    name: "Exit Details",
    icon: "DoorOpen",
    slugs: [
      { token: "{{ResignationDate}}", description: "Date of resignation" },
      { token: "{{LastWorkingDate}}", description: "Last working day (LWD)" },
      { token: "{{ExitType}}", description: "Voluntary / Involuntary / Absconding" },
      { token: "{{ExitReason}}", description: "Reason for exit" },
      { token: "{{NoticePeriodServed}}", description: "Notice period served (days)" },
      { token: "{{FnFAmount}}", description: "Full & Final settlement amount" },
      { token: "{{RelievingDate}}", description: "Relieving date" },
    ],
  },
  {
    name: "Date Values",
    icon: "Calendar",
    slugs: [
      { token: "{{CurrentDate}}", description: "Today's date (formatted)" },
      { token: "{{CurrentDateTime}}", description: "Current date & time" },
      { token: "{{CurrentMonth}}", description: "Current month name" },
      { token: "{{CurrentYear}}", description: "Current year" },
      { token: "{{FinancialYear}}", description: "Financial year (e.g. FY 2024-25)" },
      { token: "{{GeneratedDate}}", description: "Document generated date" },
    ],
  },
  {
    name: "Custom Fields",
    icon: "SlidersHorizontal",
    slugs: [
      { token: "{{CustomField.Employee.<FieldCode>}}", description: "Employee-level custom field" },
      { token: "{{CustomField.Candidate.<FieldCode>}}", description: "Candidate-level custom field" },
      { token: "{{CustomField.Organization.<FieldCode>}}", description: "Organization-level custom field" },
    ],
  },
]

// ============================================================================
//  Misc Constants
// ============================================================================

export const APPROVER_TYPES: ApproverType[] = [
  "HR Owner", "Reporting Manager", "Department Head", "Entity Admin",
  "Document Admin", "Specific Employee", "Role-Based Approver",
]

export const VISIBILITY_RULES: VisibilityRule[] = [
  "All Employees", "Selected Entity", "Selected Branch", "Selected Location",
  "Selected Department", "Selected Grade", "Selected Employee Type",
  "Specific Employees", "Specific Roles",
]

export const SOURCE_MODULES: SourceModule[] = [
  "Manual", "Employee Request", "Onboarding", "Offboarding",
  "Payroll", "Core HR", "Bulk Generation",
]

export const PAGE_SIZES = ["A4", "Letter", "Legal", "Custom"] as const
export const ORIENTATIONS = ["Portrait", "Landscape"] as const

export const AVATAR_COLORS = [
  "bg-violet-500", "bg-fuchsia-500", "bg-sky-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500",
]

// ============================================================================
//  Helpers
// ============================================================================

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function avatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function formatDate(d?: string | Date | null): string {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return "—"
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export function formatDateTime(d?: string | Date | null): string {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return "—"
  return dt.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export function formatCurrency(amount: number, currency = "INR"): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "—"
  const sym = CURRENCY_SYMBOLS[currency] || "₹"
  return sym + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)
}

export function formatCurrencyShort(amount: number, currency = "INR"): string {
  if (!amount) return "—"
  const sym = CURRENCY_SYMBOLS[currency] || "₹"
  if (amount >= 10000000) return `${sym}${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000) return `${sym}${(amount / 100000).toFixed(2)} L`
  if (amount >= 1000) return `${sym}${(amount / 1000).toFixed(1)}K`
  return sym + amount.toString()
}

export function statusBadge(status: string): { className: string; label: string } {
  const cls = STATUS_COLORS[status] || "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400"
  return { className: cls, label: status }
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  if (isNaN(target.getTime())) return NaN
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export function dueStatus(dateStr: string | null): "none" | "soon" | "overdue" {
  if (!dateStr) return "none"
  const d = daysUntil(dateStr)
  if (isNaN(d)) return "none"
  if (d < 0) return "overdue"
  if (d <= 7) return "soon"
  return "none"
}
