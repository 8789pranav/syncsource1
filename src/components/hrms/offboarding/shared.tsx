"use client"

// ============================================================================
//  Offboarding — shared types, constants & helpers
// ----------------------------------------------------------------------------
//  Mirrors the onboarding module's shared.tsx pattern. All section components
//  import their types and seed data from here.
// ============================================================================

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"

// ---------- Exit Types & Categories ----------
export const EXIT_TYPES = [
  "Voluntary Resignation",
  "Involuntary Termination",
  "Retirement",
  "End of Contract",
  "Absconding",
  "Layoff",
  "Death",
  "Mutual Separation",
  "Internship End",
  "Probation Failure",
  "Transfer to Another Entity",
] as const

export const EXIT_CATEGORIES = [
  "Voluntary",
  "Involuntary",
  "Retirement",
  "Contract End",
  "Absconding",
  "Layoff",
  "Death",
  "Mutual",
] as const

export const EXIT_REASONS = [
  "Better Opportunity",
  "Career Growth",
  "Compensation",
  "Work Life Balance",
  "Relocation",
  "Health Reasons",
  "Family Reasons",
  "Higher Studies",
  "Personal Reasons",
  "Management Issues",
  "Work Culture",
  "Performance",
  "Misconduct",
  "Policy Violation",
  "Redundancy",
  "Restructuring",
  "End of Contract Term",
  "Retirement Age",
  "Medical Grounds",
  "Absconding",
] as const

// ---------- Kanban Stages ----------
export interface ExitStage {
  id: string
  name: string
  code: string
  order: number
  color: string
  icon: string
  description?: string
  isInitial?: boolean
  isFinal?: boolean
  isMandatory?: boolean
  slaDays?: number | null
  allowManualMove?: boolean
  allowSkip?: boolean
}

export const DEFAULT_EXIT_STAGES: ExitStage[] = [
  { id: "s1", name: "Draft", code: "DRAFT", order: 0, color: "#94a3b8", icon: "FileEdit", description: "Exit request drafted, not yet submitted", isInitial: true, allowManualMove: true },
  { id: "s2", name: "Resignation Submitted", code: "RES_SUB", order: 1, color: "#0ea5e9", icon: "Send", description: "Resignation formally submitted by employee or HR", isMandatory: true, slaDays: 1, allowManualMove: true },
  { id: "s3", name: "Manager Review", code: "MGR_REV", order: 2, color: "#8b5cf6", icon: "UserCheck", description: "Reporting manager reviews and recommends LWD", isMandatory: true, slaDays: 3, allowManualMove: true },
  { id: "s4", name: "HR Review", code: "HR_REV", order: 3, color: "#a855f7", icon: "ShieldCheck", description: "HR finalizes LWD, notice period and workflow", isMandatory: true, slaDays: 2, allowManualMove: true },
  { id: "s5", name: "Notice Period", code: "NOTICE", order: 4, color: "#f59e0b", icon: "Clock", description: "Employee serving notice period", slaDays: 60, allowManualMove: true },
  { id: "s6", name: "Clearance In Progress", code: "CLEAR", order: 5, color: "#06b6d4", icon: "ClipboardCheck", description: "Department-wise clearance tasks in progress", isMandatory: true, slaDays: 7, allowManualMove: true },
  { id: "s7", name: "Asset Recovery", code: "ASSET", order: 6, color: "#f97316", icon: "Package", description: "Company assets being recovered", slaDays: 3, allowManualMove: true },
  { id: "s8", name: "IT Access Revocation", code: "IT_REV", order: 7, color: "#ec4899", icon: "Lock", description: "IT access and logins being revoked", slaDays: 1, allowManualMove: true },
  { id: "s9", name: "FnF Settlement", code: "FNF", order: 8, color: "#84cc16", icon: "Wallet", description: "Full & Final settlement calculation and approval", isMandatory: true, slaDays: 5, allowManualMove: true },
  { id: "s10", name: "Exit Letters", code: "LETTERS", order: 9, color: "#14b8a6", icon: "FileText", description: "Relieving & experience letters generated", slaDays: 2, allowManualMove: true },
  { id: "s11", name: "Exited", code: "EXITED", order: 10, color: "#10b981", icon: "CheckCircle2", description: "Employee officially marked as exited", isFinal: true, isMandatory: true },
  { id: "s12", name: "Alumni", code: "ALUMNI", order: 11, color: "#6366f1", icon: "Users", description: "Alumni profile created, ex-employee record" },
  { id: "s13", name: "On Hold", code: "HOLD", order: 12, color: "#ef4444", icon: "Pause", description: "Exit case temporarily on hold", allowManualMove: true },
  { id: "s14", name: "Withdrawn / Cancelled", code: "CANCEL", order: 13, color: "#64748b", icon: "XCircle", description: "Resignation withdrawn or exit cancelled" },
]

// ---------- Exit Case (main entity) ----------
export interface ExitCase {
  id: string
  exitCaseId: string
  employeeCode: string
  employeeName: string
  avatarColor: string
  entity: string
  branch?: string
  location?: string
  department: string
  designation: string
  grade?: string
  employmentType: string
  reportingManager: string
  hrOwner: string
  exitType: string
  exitCategory: string
  exitReason: string
  subReason?: string
  resignationDate: string
  noticeStartDate?: string
  requestedLwd?: string
  approvedLwd?: string
  actualLwd?: string
  workflowId: string
  workflowName: string
  currentStageId: string
  clearanceStatus: ClearanceStatus
  assetStatus: AssetStatus
  itAccessStatus: ITAccessStatus
  fnfStatus: FnFStatus
  letterStatus: LetterStatus
  exitStatus: ExitStatus
  riskFlag?: "low" | "medium" | "high"
  legalHold?: boolean
  regrettable?: boolean
  eligibleRehire?: boolean
  confidential?: boolean
  noticeShortfallDays?: number
  enteredStageAt: string
  createdAt: string
  updatedAt: string
}

export type ClearanceStatus = "Not Started" | "Pending" | "In Progress" | "Completed" | "Overdue" | "Waived"
export type AssetStatus = "Not Started" | "Pending" | "Partial" | "Completed" | "Damaged" | "Lost"
export type ITAccessStatus = "Not Started" | "Pending" | "Scheduled" | "Revoked" | "Partial"
export type FnFStatus = "Not Started" | "Draft" | "Inputs Pending" | "Calculated" | "Under Review" | "Approved" | "Paid" | "Closed" | "On Hold"
export type LetterStatus = "Not Started" | "Pending" | "Generated" | "Issued" | "Not Required"
export type ExitStatus = "Draft" | "Active" | "On Hold" | "Exited" | "Withdrawn" | "Cancelled"

// ---------- Workflows ----------
export interface ExitWorkflow {
  id: string
  name: string
  code: string
  description?: string
  version: number
  status: "Draft" | "Active" | "Published" | "Archived"
  scopeType: ScopeType
  entity?: string
  department?: string
  employmentType?: string
  exitType?: string
  kanbanBoardId: string
  kanbanBoardName: string
  clearanceChecklistId?: string
  emailGroupId?: string
  fnfRuleId?: string
  isDefault: boolean
  priority: number
  stages: ExitStage[]
  steps: WorkflowStep[]
  createdAt: string
  updatedAt: string
}

export type ScopeType = "Tenant Default" | "Entity" | "Branch" | "Location" | "Department" | "Grade" | "Employee Type" | "Work Mode" | "Exit Type" | "Specific Employee"

export interface WorkflowStep {
  id: string
  title: string
  description: string
  icon: string
  status: "complete" | "incomplete"
}

// ---------- Clearance ----------
export interface ClearanceTask {
  id: string
  exitCaseId: string
  taskName: string
  taskCode: string
  department: ClearanceDepartment
  ownerType: string
  owner: string
  dueDate?: string
  slaDays: number
  mandatory: boolean
  blocking: boolean
  requiresComment: boolean
  requiresAttachment: boolean
  requiresApproval: boolean
  financialImpact: boolean
  recoveryAmount?: number
  waiverAllowed: boolean
  stageMapping?: string
  status: ClearanceTaskStatus
  comment?: string
  completedAt?: string
  completedBy?: string
}

export type ClearanceDepartment = "Reporting Manager" | "HR" | "IT" | "Admin / Facilities" | "Finance" | "Payroll" | "Legal" | "Compliance" | "Security" | "Project Manager" | "Training / L&D" | "Asset Team" | "Travel Desk" | "Library / Store"
export type ClearanceTaskStatus = "Not Started" | "Pending" | "In Progress" | "Submitted" | "Approved" | "Rejected" | "Needs Correction" | "Completed" | "Overdue" | "Waived" | "Not Applicable"

// ---------- Asset Recovery ----------
export interface AssetRecoveryItem {
  id: string
  exitCaseId: string
  assetCode: string
  assetType: string
  serialNumber?: string
  assignedDate: string
  expectedReturnDate?: string
  actualReturnDate?: string
  returnStatus: "Pending" | "Returned" | "Damaged" | "Lost" | "Waived"
  conditionAtReturn?: string
  damage: boolean
  lost: boolean
  damageAmount?: number
  recoveryAmount?: number
  waiverApproved?: boolean
  remarks?: string
  pushToFnf: boolean
}

// ---------- IT Access ----------
export interface ITAccessItem {
  id: string
  exitCaseId: string
  systemName: string
  accessType: string
  ownerTeam: string
  revokeTiming: "Immediately" | "On LWD End of Day" | "After Clearance" | "Manual"
  revokeDate?: string
  revokeTime?: string
  dataBackupRequired: boolean
  dataTransferRequired: boolean
  newOwner?: string
  licenseDeactivationRequired: boolean
  revocationStatus: "Not Started" | "Pending" | "Scheduled" | "Revoked" | "Partial"
  verificationStatus?: "Pending" | "Verified"
  remarks?: string
}

// ---------- FnF ----------
export interface FnFEntry {
  id: string
  exitCaseId: string
  type: "earning" | "deduction"
  category: string
  description: string
  amount: number
  source: "auto" | "manual"
  status: "draft" | "confirmed"
}

export interface FnFRecord {
  exitCaseId: string
  status: FnFStatus
  totalEarnings: number
  totalDeductions: number
  netPayable: number
  calculatedAt?: string
  approvedBy?: string
  approvedAt?: string
  paidAt?: string
  entries: FnFEntry[]
}

// ---------- Documents & Emails ----------
export interface ExitDocumentTemplate {
  id: string
  name: string
  code: string
  documentType: string
  scopeType: ScopeType
  entity?: string
  language: string
  version: number
  status: "Draft" | "Active" | "Published"
  isDefault: boolean
  headerHtml?: string
  bodyHtml: string
  footerHtml?: string
  createdAt: string
  updatedAt: string
}

export interface ExitEmailTemplate {
  id: string
  name: string
  code: string
  eventType: string
  scopeType: ScopeType
  entity?: string
  language: string
  subject: string
  headerHtml?: string
  bodyHtml: string
  footerHtml?: string
  isDefault: boolean
  status: "Draft" | "Active"
  version: number
  recipients: string[]
  cc: string[]
  createdAt: string
  updatedAt: string
}

// ---------- Checklists ----------
export interface ExitChecklist {
  id: string
  name: string
  code: string
  category: string
  scopeType: ScopeType
  entity?: string
  exitType?: string
  status: "Draft" | "Active"
  isDefault: boolean
  version: number
  tasks: ExitChecklistTask[]
  createdAt: string
  updatedAt: string
}

export interface ExitChecklistTask {
  id: string
  name: string
  code: string
  description?: string
  ownerType: string
  owner?: string
  dueDateRule: string
  priority: "Low" | "Medium" | "High" | "Critical"
  mandatory: boolean
  blocking: boolean
  requiresAttachment: boolean
  requiresComment: boolean
  requiresApproval: boolean
  financialImpact: boolean
  recoveryAllowed: boolean
  stageMapping?: string
}

// ---------- Exit Interview ----------
export interface ExitInterviewForm {
  id: string
  name: string
  code: string
  category: string
  scopeType: ScopeType
  status: "Draft" | "Active"
  isDefault: boolean
  version: number
  anonymousAllowed: boolean
  mandatory: boolean
  visibleToManager: boolean
  visibleToHR: boolean
  requiresHRReview: boolean
  questions: ExitInterviewQuestion[]
  createdAt: string
  updatedAt: string
}

export interface ExitInterviewQuestion {
  id: string
  question: string
  type: "text" | "textarea" | "rating" | "select" | "radio" | "checkbox"
  options?: string[]
  required: boolean
}

// ---------- Alumni ----------
export interface AlumniRecord {
  id: string
  employeeCode: string
  employeeName: string
  avatarColor: string
  entity: string
  department: string
  designation: string
  dateOfJoining: string
  lastWorkingDay: string
  exitType: string
  exitReason: string
  email: string
  phone?: string
  linkedin?: string
  eligibleRehire: boolean
  alumniSince: string
  status: "Alumni" | "Blacklisted" | "No-Rehire"
}

// ---------- Resignation Requests ----------
export interface ResignationRequest {
  id: string
  requestId: string
  employeeCode: string
  employeeName: string
  avatarColor: string
  department: string
  designation: string
  reportingManager: string
  resignationDate: string
  requestedLwd: string
  exitReason: string
  detailedReason?: string
  status: ResignationStatus
  managerDecision?: "Approved" | "Rejected" | "Pending"
  managerRecommendedLwd?: string
  managerRemarks?: string
  hrDecision?: "Approved" | "Rejected" | "Send Back" | "Pending"
  hrFinalLwd?: string
  hrRemarks?: string
  noticeShortfallDays?: number
  regrettable?: boolean
  createdAt: string
  updatedAt: string
}

export type ResignationStatus = "Draft" | "Submitted" | "Pending Manager Approval" | "Pending HR Approval" | "Approved" | "Rejected" | "Withdrawn" | "Cancelled" | "Exit Initiated"

// ---------- Logs ----------
export interface OffboardingLog {
  id: string
  timestamp: string
  exitCaseId?: string
  employeeName?: string
  employeeCode?: string
  entity?: string
  logType: string
  actionType: string
  oldValue?: string
  newValue?: string
  performedBy: string
  role: string
  ipAddress?: string
  status: "Success" | "Warning" | "Error" | "Info"
  remarks?: string
}

// ---------- Settings ----------
export interface OffboardingSettings {
  general: {
    enableModule: boolean
    allowEmployeeResignation: boolean
    allowManagerInitiatedExit: boolean
    allowHrInitiatedExit: boolean
    allowBulkExitInitiation: boolean
    allowResignationWithdrawal: boolean
    allowExitCancellation: boolean
    allowRehire: boolean
    defaultExitWorkflow: string
    defaultKanbanBoard: string
    defaultHrOwner: string
  }
  employeeExit: {
    exitIdAutoGenerate: boolean
    exitIdPrefix: string
    exitIdFormat: string
    duplicateCheck: boolean
    allowBackdated: boolean
    allowFutureDated: boolean
    allowLwdChange: boolean
    allowExitHold: boolean
    allowExitReopen: boolean
  }
  clearance: {
    enableClearance: boolean
    allowEntityWise: boolean
    allowDeptWise: boolean
    allowMandatoryTask: boolean
    allowBlockingTask: boolean
    allowTaskWaiver: boolean
    allowRecoveryAmount: boolean
    requireBeforeFnf: boolean
    requireBeforeExitClosure: boolean
  }
  fnf: {
    enableFnf: boolean
    allowEntityWise: boolean
    allowPayrollGroupWise: boolean
    autoFetchPayroll: boolean
    autoFetchLeaveEncashment: boolean
    autoFetchAssetRecovery: boolean
    autoFetchLoanRecovery: boolean
    allowManualEarnings: boolean
    allowManualDeductions: boolean
    fnfApprovalRequired: boolean
    fnfPaymentTracking: boolean
  }
  email: {
    enableNotifications: boolean
    enableEntityWise: boolean
    enableWorkflowWise: boolean
    enableStageWise: boolean
    enableReminders: boolean
    enableEscalations: boolean
    enableEmailLogs: boolean
    enableRetry: boolean
    defaultFromEmail: string
    defaultReplyTo: string
  }
  audit: {
    enableAuditLog: boolean
    trackExitDetails: boolean
    trackWorkflowChanges: boolean
    trackStageMovement: boolean
    trackClearance: boolean
    trackAssetRecovery: boolean
    trackItRevocation: boolean
    trackFnf: boolean
    trackLetterGeneration: boolean
    trackEmployeeStatus: boolean
    softDeleteOnly: boolean
    rbac: boolean
  }
}

export interface EntityConfiguration {
  id: string
  entity: string
  useTenantDefault: boolean
  defaultExitWorkflow?: string
  defaultKanbanBoard?: string
  defaultClearanceChecklist?: string
  defaultAssetRecoveryRule?: string
  defaultItRevocationRule?: string
  defaultFnfRule?: string
  defaultExitInterviewForm?: string
  defaultEmailGroup?: string
  defaultApprovalWorkflow?: string
  defaultLetterGroup?: string
  defaultHrOwner?: string
  defaultNoticePolicy?: string
  effectiveFrom?: string
  effectiveTo?: string
  status: "Active" | "Inactive"
}

// ---------- Color palette ----------
export const AVATAR_COLORS = ["#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#f97316", "#84cc16", "#06b6d4", "#a855f7"]

export const EXIT_TYPE_COLORS: Record<string, string> = {
  "Voluntary Resignation": "#0ea5e9",
  "Involuntary Termination": "#ef4444",
  "Retirement": "#8b5cf6",
  "End of Contract": "#f59e0b",
  "Absconding": "#ec4899",
  "Layoff": "#f97316",
  "Death": "#64748b",
  "Mutual Separation": "#14b8a6",
  "Internship End": "#84cc16",
  "Probation Failure": "#f43f5e",
  "Transfer to Another Entity": "#06b6d4",
}

export const STATUS_COLORS: Record<string, string> = {
  "Not Started": "#94a3b8",
  "Pending": "#f59e0b",
  "In Progress": "#0ea5e9",
  "Completed": "#10b981",
  "Approved": "#10b981",
  "Rejected": "#ef4444",
  "Overdue": "#ef4444",
  "Waived": "#64748b",
  "Active": "#10b981",
  "Draft": "#94a3b8",
  "Exited": "#6366f1",
  "On Hold": "#f59e0b",
  "Withdrawn": "#64748b",
  "Cancelled": "#64748b",
  "Published": "#10b981",
  "Archived": "#94a3b8",
  "Paid": "#10b981",
  "Closed": "#64748b",
  "Calculated": "#0ea5e9",
  "Under Review": "#f59e0b",
  "Generated": "#14b8a6",
  "Issued": "#10b981",
  "Revoked": "#10b981",
  "Scheduled": "#f59e0b",
  "Partial": "#f59e0b",
  "Damaged": "#ef4444",
  "Lost": "#ef4444",
  "Returned": "#10b981",
  "Submitted": "#0ea5e9",
  "Needs Correction": "#f59e0b",
  "Not Applicable": "#94a3b8",
}

export const RISK_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
}

// ---------- Fetch hook (reused pattern) ----------
export function useFetch<T>(url: string | null, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!url)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!url) return
    let active = true
    const doFetch = async () => {
      try {
        if (active) setLoading(true)
        const r = await fetch(url)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const json = await r.json()
        if (active) { setData(json); setError(null) }
      } catch (e: any) {
        if (active) setError(e.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    doFetch()
    return () => { active = false }
  }, [url, reloadKey, ...deps])

  return { data, loading, error, reload, setData }
}

// ---------- API helpers ----------
export async function apiPost(url: string, body: any) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const json = await r.json()
  if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`)
  return json
}

export async function apiPatch(url: string, body: any) {
  const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const json = await r.json()
  if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`)
  return json
}

export async function apiDelete(url: string) {
  const r = await fetch(url, { method: "DELETE" })
  const json = await r.json()
  if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`)
  return json
}

export function safeToast(promise: Promise<any>, successMsg?: string, errMsg?: string) {
  return promise
    .then((res) => { if (successMsg) toast.success(successMsg); return res })
    .catch((e) => { toast.error(errMsg || e.message || "Something went wrong"); throw e })
}

// ---------- Helpers ----------
export function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
}

export function daysBetween(from: string | Date, to: string | Date): number {
  const f = new Date(from).getTime()
  const t = new Date(to).getTime()
  return Math.round((t - f) / (1000 * 60 * 60 * 24))
}

export function formatDate(d?: string | Date | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export function formatDateTime(d?: string | Date | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function timeAgo(d: string | Date): string {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(d)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

export function formatCurrencyShort(amount: number): string {
  if (Math.abs(amount) >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
  if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(0)}K`
  return `₹${amount}`
}
