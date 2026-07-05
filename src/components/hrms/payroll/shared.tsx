"use client"

// ============================================================================
//  Payroll — shared types, constants & helpers
// ----------------------------------------------------------------------------
//  Single source of truth for all payroll section components (Salary,
//  Compliance, Arrear, Full & Final, Settings).
//
//  Color system: teal/cyan primary on slate base (matches app theme).
//  Status palettes: emerald=success, amber=warning/pending, rose=danger,
//  cyan=info, violet=highlight, slate=neutral.
// ============================================================================

import { toast } from "sonner"

// ---------- Entities ----------
export interface Entity {
  id: string
  name: string
  code: string
  country: string
  state?: string
  currency: string
  status: "Active" | "Inactive"
}

export const ENTITIES: Entity[] = [
  { id: "ent-1", name: "ACME India Pvt Ltd", code: "ACME_IND", country: "India", state: "Karnataka", currency: "INR", status: "Active" },
  { id: "ent-2", name: "ACME UAE LLC", code: "ACME_UAE", country: "United Arab Emirates", state: "Dubai", currency: "AED", status: "Active" },
  { id: "ent-3", name: "ACME US Inc", code: "ACME_US", country: "United States", state: "California", currency: "USD", status: "Active" },
  { id: "ent-4", name: "ACME Singapore Pte Ltd", code: "ACME_SG", country: "Singapore", state: "Singapore", currency: "SGD", status: "Active" },
]

// ---------- Departments ----------
export const DEPARTMENTS = [
  "Engineering", "Product", "Design", "Sales", "Marketing", "Finance",
  "Human Resources", "Operations", "Customer Success", "Legal", "IT",
  "Administration", "Quality Assurance", "Research & Development",
] as const

// ---------- Employee Types ----------
export const EMPLOYEE_TYPES = [
  "Full-Time", "Part-Time", "Contract", "Intern", "Consultant", "Daily Wage",
] as const

// ---------- Grades ----------
export const GRADES = ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "M1", "M2", "M3", "E1", "E2"] as const

// ---------- Currencies ----------
export const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
] as const

// ---------- Payroll Frequencies ----------
export const PAYROLL_FREQUENCIES = [
  "Monthly", "Weekly", "Bi-Weekly", "Semi-Monthly", "Daily Wage", "Contract Pay",
] as const

// ---------- Bank File Formats ----------
export const BANK_FILE_FORMATS = [
  "HDFC Format", "ICICI Format", "SBI Format", "Axis Format",
  "Custom CSV", "Custom Excel", "UAE WPS / SIF", "RTGS / NEFT",
] as const

// ---------- Approval Types ----------
export const APPROVAL_TYPES = [
  "Single Level", "Multi Level", "Sequential Approval",
  "Parallel Approval", "Role-Based Approval", "Employee-Specific Approval",
] as const

// ---------- Pay Group ----------
export interface PayGroup {
  id: string
  name: string
  code: string
  description: string
  entity: string
  frequency: string
  payrollMonth: string
  payDate: string
  currency: string
  status: "Active" | "Inactive"
  employeeCount: number
  isDefault: boolean
  createdAt: string
}

// ---------- Salary Component ----------
export type ComponentType = "Earning" | "Deduction" | "Reimbursement" | "Employer Contribution" | "Statutory" | "Informational"
export type CalcType = "Fixed" | "Percentage" | "Formula" | "Slab" | "Manual"

export interface SalaryComponent {
  id: string
  name: string
  code: string
  type: ComponentType
  calcType: CalcType
  value?: number
  percentageOf?: string
  formula?: string
  taxable: boolean
  statutory: boolean
  isActive: boolean
  payslipDisplay: boolean
  description: string
  priority: number
}

// ---------- Salary Structure ----------
export interface SalaryStructureComponent {
  componentCode: string
  componentName: string
  calcType: CalcType
  value?: number
  percentageOf?: string
  formula?: string
  isMandatory: boolean
}

export interface SalaryStructure {
  id: string
  name: string
  code: string
  description: string
  entity: string
  employeeType: string
  grade?: string
  components: SalaryStructureComponent[]
  ctcFormula: string
  monthlyCtcMin: number
  monthlyCtcMax: number
  isDefault: boolean
  status: "Draft" | "Active" | "Inactive"
  version: number
  effectiveFrom: string
  createdAt: string
  updatedAt: string
}

// ---------- Employee Salary ----------
export interface EmployeeSalary {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  department: string
  designation: string
  grade: string
  employeeType: string
  payGroupId: string
  payGroupName: string
  salaryStructureId: string
  salaryStructureName: string
  ctcAnnual: number
  ctcMonthly: number
  basicMonthly: number
  hraMonthly: number
  specialAllowanceMonthly: number
  totalEarningsMonthly: number
  totalDeductionsMonthly: number
  netPayMonthly: number
  effectiveFrom: string
  status: "Active" | "On Hold" | "Inactive"
  lastRevisionDate: string
}

// ---------- Salary Revision ----------
export interface SalaryRevision {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  department: string
  designation: string
  revisionType: "Annual Hike" | "Promotion" | "Correction" | "Probation Confirmation" | "Market Correction"
  previousCtc: number
  revisedCtc: number
  hikePercent: number
  previousBasic: number
  revisedBasic: number
  effectiveFrom: string
  reason: string
  status: "Draft" | "Pending Approval" | "Approved" | "Rejected" | "Implemented"
  arrearGenerated: boolean
  approvedBy?: string
  approvedAt?: string
  createdAt: string
}

// ---------- Payroll Run ----------
export interface PayrollRunEmployee {
  employeeId: string
  employeeName: string
  employeeCode: string
  department: string
  grossEarnings: number
  totalDeductions: number
  netPay: number
  lopDays: number
  presentDays: number
  status: "Pending" | "Processed" | "Hold" | "Released"
}

export interface PayrollRun {
  id: string
  name: string
  code: string
  payGroupId: string
  payGroupName: string
  entity: string
  payrollMonth: string
  payDate: string
  status: "Draft" | "Processing" | "Processed" | "Approved" | "Paid" | "Cancelled"
  totalEmployees: number
  processedEmployees: number
  grossPayout: number
  totalDeductions: number
  netPayout: number
  lopDays: number
  arrearAmount: number
  bonusAmount: number
  reimbursementAmount: number
  startedAt?: string
  processedAt?: string
  approvedAt?: string
  paidAt?: string
  approvedBy?: string
  employees: PayrollRunEmployee[]
  createdAt: string
}

// ---------- Payslip ----------
export interface PayslipEarning {
  name: string
  amount: number
  ytd: number
}
export interface PayslipDeduction {
  name: string
  amount: number
  ytd: number
}
export interface Payslip {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  department: string
  designation: string
  payGroupId: string
  payrollRunId: string
  payrollRunName: string
  payrollMonth: string
  payDate: string
  pan: string
  bankAccount: string
  bankIfsc: string
  payDays: number
  lopDays: number
  presentDays: number
  earnings: PayslipEarning[]
  deductions: PayslipDeduction[]
  grossEarnings: number
  totalDeductions: number
  netPay: number
  ctcAnnual: number
  status: "Generated" | "Published" | "Held" | "Re-issued"
  publishedAt?: string
  generatedAt: string
}

// ---------- Payroll Input ----------
export type InputType = "Attendance" | "Leave" | "Overtime" | "Reimbursement" | "Loan" | "Bonus" | "Incentive" | "LOP Reversal" | "Arrear" | "Manual Adjustment"
export interface PayrollInput {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  department: string
  inputType: InputType
  amount: number
  description: string
  referenceId?: string
  payGroupId: string
  payrollMonth: string
  status: "Pending" | "Approved" | "Rejected" | "Locked"
  source: "Manual" | "Attendance" | "Leave" | "Expense" | "Loan" | "Arrear"
  approvedBy?: string
  createdAt: string
}

// ---------- Bank Payment ----------
export interface BankPayment {
  id: string
  payrollRunId: string
  payrollRunName: string
  entity: string
  payGroupId: string
  bankAccount: string
  bankName: string
  fileFormat: string
  totalAmount: number
  employeeCount: number
  status: "Pending" | "File Generated" | "Sent to Bank" | "Approved" | "Paid" | "Failed"
  generatedAt?: string
  sentAt?: string
  approvedAt?: string
  approvedBy?: string
  paidAt?: string
  fileReference?: string
  utrNumber?: string
  createdAt: string
}

// ---------- Compliance ----------
export interface ComplianceRule {
  id: string
  name: string
  code: string
  entity: string
  country: string
  pfApplicable: boolean
  esiApplicable: boolean
  ptApplicable: boolean
  lwfApplicable: boolean
  tdsApplicable: boolean
  gratuityApplicable: boolean
  bonusApplicable: boolean
  pfRate: number
  pensionRate: number
  esiRate: number
  esiWageCeiling: number
  ptAmount: number
  lwfRate: number
  status: "Active" | "Inactive"
  isDefault: boolean
}

export interface PFRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  uan: string
  employeeContribution: number
  employerContribution: number
  pensionContribution: number
  totalContribution: number
  payrollMonth: string
  wageCapped: boolean
  status: "Pending" | "Filed" | "Paid"
}

export interface ESIRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  esicNumber: string
  employeeContribution: number
  employerContribution: number
  totalContribution: number
  payrollMonth: string
  withinWageCeiling: boolean
  status: "Pending" | "Filed" | "Paid"
}

export interface PTRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  state: string
  amount: number
  payrollMonth: string
  slab: string
  status: "Pending" | "Filed" | "Paid"
}

export interface LWFRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  state: string
  employeeContribution: number
  employerContribution: number
  payrollMonth: string
  status: "Pending" | "Filed" | "Paid"
}

export interface TDSRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  pan: string
  regime: "Old" | "New"
  grossIncome: number
  totalDeductions: number
  taxableIncome: number
  taxLiability: number
  tdsDeducted: number
  payrollMonth: string
  ytdTds: number
  status: "Pending" | "Filed" | "Paid"
}

export interface InvestmentDeclaration {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  financialYear: string
  regime: "Old" | "New"
  section80C: number
  section80D: number
  section80CCD: number
  section24: number
  section80E: number
  section80G: number
  otherDeductions: number
  totalDeclared: number
  totalProofSubmitted: number
  status: "Draft" | "Submitted" | "Verified" | "Approved" | "Rejected"
  submittedAt?: string
  verifiedBy?: string
}

export interface Form16 {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  pan: string
  financialYear: string
  grossSalary: number
  totalTds: number
  partA: boolean
  partB: boolean
  status: "Pending" | "Generated" | "Issued" | "Downloaded"
  generatedAt?: string
  issuedAt?: string
}

export interface Challan {
  id: string
  challanType: "PF" | "ESI" | "PT" | "LWF" | "TDS"
  entity: string
  payrollMonth: string
  dueDate: string
  amount: number
  employeeCount: number
  status: "Pending" | "Generated" | "Paid" | "Overdue"
  challanNumber?: string
  paidAt?: string
  referenceNumber?: string
}

// ---------- Arrears ----------
export type ArrearType = "Salary Revision" | "LOP Reversal" | "Attendance Correction" | "Bonus" | "Incentive" | "Manual" | "Component Change" | "Structure Change"
export interface ArrearCase {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  department: string
  arrearType: ArrearType
  effectiveFrom: string
  effectiveTo: string
  monthsAffected: number
  arrearAmount: number
  recoveryAmount: number
  netArrear: number
  description: string
  referenceId?: string
  status: "Draft" | "Pending Approval" | "Approved" | "Rejected" | "Paid" | "Cancelled"
  payoutMonth: string
  showSeparately: boolean
  approvedBy?: string
  approvedAt?: string
  paidAt?: string
  createdAt: string
}

// ---------- Full & Final ----------
export interface FnFCase {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  department: string
  designation: string
  exitCaseId: string
  exitType: string
  lwd: string
  doj: string
  tenureYears: number
  status: "Draft" | "Inputs Pending" | "Calculation In Progress" | "Pending Approval" | "Approved" | "Paid" | "Cancelled"
  earnings: FnFEntry[]
  deductions: FnFEntry[]
  totalEarnings: number
  totalDeductions: number
  netPayable: number
  calculatedAt?: string
  approvedBy?: string
  approvedAt?: string
  paidAt?: string
  paymentMode?: string
  utrNumber?: string
  createdAt: string
}

export interface FnFEntry {
  name: string
  code: string
  amount: number
  source: "Auto" | "Manual"
  category: "Earning" | "Deduction"
  description?: string
}

// ---------- Settings: Entity Configuration ----------
export interface EntityPayrollConfig {
  id: string
  entity: string
  country: string
  state?: string
  currency: string
  useTenantDefault: boolean
  overrideTenantDefault: boolean
  status: "Active" | "Inactive"
  priority: number
  version: number
  effectiveFrom: string
  effectiveTo?: string
  // Step 2: Payroll Calendar
  payrollFrequency: string
  payrollMonthStartDay: number
  payrollMonthEndDay: number
  payDate: string
  attendanceCutOff: string
  leaveCutOff: string
  reimbursementCutOff: string
  taxDeclarationCutOff: string
  loanDeductionCutOff: string
  arrearCutOff: string
  payrollLockDate: string
  payslipPublishDate: string
  // Step 3: Pay Group & Salary Defaults
  defaultPayGroup: string
  defaultSalaryStructure: string
  defaultComponentSet: string
  defaultEmployeeSalaryRule: string
  defaultSalaryRevisionRule: string
  defaultPayrollInputRule: string
  defaultLopRule: string
  defaultOvertimeRule: string
  defaultBonusRule: string
  defaultReimbursementRule: string
  // Step 4: Compliance & Tax
  complianceRule: string
  pfApplicable: boolean
  esiApplicable: boolean
  ptApplicable: boolean
  lwfApplicable: boolean
  tdsApplicable: boolean
  gratuityApplicable: boolean
  bonusApplicable: boolean
  minimumWageRule: string
  taxRegimeRule: string
  investmentDeclarationRule: string
  form16Template: string
  challanRule: string
  // Step 5: Payslip & Bank
  defaultPayslipTemplate: string
  showEmployerContribution: boolean
  showCtcComponents: boolean
  showYtd: boolean
  showLopDays: boolean
  showLeaveBalance: boolean
  hideZeroComponents: boolean
  defaultBankAccount: string
  bankFileFormat: string
  paymentApprovalRequired: boolean
  paymentMode: string
  // Step 6: Arrear & FnF
  defaultArrearRule: string
  autoArrearOnRevision: boolean
  autoArrearOnLopReversal: boolean
  autoArrearOnAttendance: boolean
  arrearApprovalRequired: boolean
  showArrearSeparately: boolean
  allowManualArrear: boolean
  allowNegativeArrear: boolean
  defaultArrearPayoutMonth: string
  defaultFnfRule: string
  autoFetchPayrollInputs: boolean
  autoFetchLeaveEncashment: boolean
  autoFetchNoticeRecovery: boolean
  autoFetchLoanRecovery: boolean
  autoFetchAssetRecovery: boolean
  autoFetchArrear: boolean
  fnfApprovalRequired: boolean
  allowFnfAfterExit: boolean
  generateFnfLetter: boolean
  fnfPaymentTracking: boolean
  // Step 7: Approval & Email
  payrollApprovalWorkflow: string
  salaryStructureApprovalWorkflow: string
  salaryRevisionApprovalWorkflow: string
  arrearApprovalWorkflow: string
  fnfApprovalWorkflow: string
  bankPaymentApprovalWorkflow: string
  emailTemplateGroup: string
  payrollFinalizedEmail: boolean
  payslipPublishedEmail: boolean
  salaryHoldEmail: boolean
  salaryReleaseEmail: boolean
  taxDeclarationReminder: boolean
  investmentProofReminder: boolean
  arrearApprovedEmail: boolean
  fnfPaymentEmail: boolean
  bankPaymentNotification: boolean
  // Step 8: Integration Rules
  fetchAttendanceAuto: boolean
  fetchLeaveAuto: boolean
  fetchOvertimeAuto: boolean
  fetchReimbursementAuto: boolean
  fetchLoanDeductionAuto: boolean
  fetchAssetRecoveryAuto: boolean
  fetchOffboardingFnfAuto: boolean
  fetchSalaryRevisionAuto: boolean
  fetchArrearAuto: boolean
  // Meta
  missingConfig: string[]
  conflictWarnings: string[]
  impactedEmployees: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

// ---------- Status Colors ----------
export const STATUS_COLORS: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Inactive: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Pending Approval": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Processing: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Processed: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Paid: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Generated: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Held: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Issued: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Filed: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Overdue: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Submitted: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Verified: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Implemented: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  "On Hold": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Locked: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  "File Generated": "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "Sent to Bank": "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Failed: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  "Inputs Pending": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Calculation In Progress": "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "Re-issued": "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  Downloaded: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
}

export const COMPONENT_TYPE_COLORS: Record<ComponentType, string> = {
  Earning: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Deduction: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Reimbursement: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "Employer Contribution": "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  Statutory: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Informational: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
}

export const AVATAR_COLORS = [
  "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-cyan-500",
  "bg-violet-500", "bg-pink-500", "bg-teal-500", "bg-orange-500",
]

// ---------- Helpers ----------
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

export function timeAgo(d?: string | Date | null): string {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return "—"
  const diff = Date.now() - dt.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return formatDate(dt)
}

export function formatCurrency(v?: number | null, currency = "INR"): string {
  if (v === undefined || v === null) return "—"
  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || "₹"
  return sym + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v)
}

export function formatCurrencyShort(v?: number | null, currency = "INR"): string {
  if (!v) return "—"
  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || "₹"
  if (v >= 10000000) return `${sym}${(v / 10000000).toFixed(2)} Cr`
  if (v >= 100000) return `${sym}${(v / 100000).toFixed(2)} L`
  if (v >= 1000) return `${sym}${(v / 1000).toFixed(1)}K`
  return sym + v.toString()
}

export function formatNumber(v?: number | null): string {
  if (v === undefined || v === null) return "—"
  return new Intl.NumberFormat("en-IN").format(v)
}

export function formatPercent(v?: number | null, digits = 1): string {
  if (v === undefined || v === null) return "—"
  return `${v.toFixed(digits)}%`
}

export function toastSuccess(msg: string) {
  toast.success(msg)
}
export function toastInfo(msg: string) {
  toast.info(msg)
}
export function toastError(msg: string) {
  toast.error(msg)
}
