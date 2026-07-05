'use client'

import * as React from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ============================================================
// Types — mirror the API contract / Prisma models
// ============================================================

export interface EmployeeLite {
  id: string
  employeeCode?: string
  firstName?: string
  middleName?: string
  lastName?: string
  displayName?: string | null
  department?: { id: string; name: string } | null
  designation?: { id: string; name: string } | null
  location?: { id: string; name: string } | null
  entity?: { id: string; legalName: string; tradeName?: string | null } | null
  reportingManagerId?: string | null
}

export interface ShiftLite {
  id: string
  code: string
  name: string
  startTime: string
  endTime: string
  breakStart?: string | null
  breakEnd?: string | null
  workingHours: number
  graceMinutes: number
  graceOutMinutes?: number
  halfDayHours: number
  fullDayHours: number
  isNightShift: boolean
  isFlexible: boolean
  isCrossDay?: boolean
  autoPunchOut: boolean
  overtimeEligible: boolean
  bufferBefore?: number
  bufferAfter?: number
  earlyClockInAllowed?: boolean
  lateClockOutAllowed?: boolean
  allowBreak?: boolean
  paidBreak?: boolean
  autoAssign?: boolean
  color: string
  status: string
}

export interface AttendanceRecord {
  id: string
  tenantId?: string
  employeeId: string
  employee?: EmployeeLite
  date: string | Date
  clockIn?: string | Date | null
  clockOut?: string | Date | null
  firstIn?: string | Date | null
  lastOut?: string | Date | null
  status: string
  workHours: number
  breakHours?: number
  effectiveHours?: number
  overtimeHours: number
  isLate: boolean
  isEarlyGoing: boolean
  lateBy?: number
  earlyBy?: number
  remarks?: string | null
  source: string
  shiftId?: string | null
  shift?: ShiftLite | null
  regularizationStatus?: string | null
  approvalStatus?: string | null
  isLocked?: boolean
  isPayrollLocked?: boolean
  geoLat?: number | null
  geoLng?: number | null
  geoAddress?: string | null
}

export interface AttendanceRequest {
  id: string
  employeeId: string
  employee?: EmployeeLite
  requestType: string
  attendanceDate: string | Date
  fromDate?: string | Date | null
  toDate?: string | Date | null
  fromTime?: string | null
  toTime?: string | null
  duration?: number
  currentStatus?: string | null
  requestedStatus?: string | null
  currentFirstIn?: string | Date | null
  currentLastOut?: string | Date | null
  requestedFirstIn?: string | Date | null
  requestedLastOut?: string | Date | null
  reason?: string | null
  attachmentUrl?: string | null
  attachmentName?: string | null
  workLocation?: string | null
  clientSiteName?: string | null
  purpose?: string | null
  permissionType?: string | null
  status: string
  appliedAt: string | Date
  decisionAt?: string | Date | null
  decisionBy?: string | null
  decisionComment?: string | null
  currentApproverId?: string | null
  approvals?: Array<{
    id: string
    stepOrder: number
    approverType: string
    approverId?: string | null
    approverName?: string | null
    action: string
    comment?: string | null
    actedAt?: string | Date | null
  }>
}

export interface AttendanceRawLog {
  id: string
  employeeId?: string | null
  employee?: EmployeeLite | null
  deviceEmpId?: string | null
  deviceName?: string | null
  punchTime: string | Date
  punchType: string
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  source: string
  syncStatus: string
  errorMessage?: string | null
  processedStatus: string
  attendanceId?: string | null
  createdAt: string | Date
}

export interface AttendanceOvertime {
  id: string
  employeeId: string
  employee?: EmployeeLite
  date: string | Date
  shiftHours: number
  actualHours: number
  overtimeHours: number
  overtimeType: string
  status: string
  approvedBy?: string | null
  approvedAt?: string | Date | null
  payrollStatus?: string | null
  remarks?: string | null
}

export interface AttendanceLock {
  id: string
  lockType: string
  fromDate: string | Date
  toDate: string | Date
  scope: string
  scopeId?: string | null
  lockedBy?: string | null
  lockedAt: string | Date
  unlockApprovalRequired: boolean
  reason?: string | null
}

export interface AttendanceBulkUpdate {
  id: string
  requestedBy?: string | null
  actionType: string
  fromDate: string | Date
  toDate: string | Date
  employeeIds?: string | null
  filtersJson?: string | null
  newStatus?: string | null
  newInTime?: string | null
  newOutTime?: string | null
  reason?: string | null
  status: string
  approvedBy?: string | null
  affectedCount: number
  processedAt?: string | Date | null
  createdAt: string | Date
}

export interface AttendanceRule {
  id: string
  name: string
  code: string
  description?: string | null
  country?: string
  effectiveFrom?: string | Date | null
  effectiveTo?: string | Date | null
  isDefault?: boolean
  priority?: number
  status?: string
  settingsJson?: string | null
  applicabilities?: Array<{
    id: string
    applyTo: string
    departmentIds?: string | null
    locationIds?: string | null
    gender?: string
  }>
}

// ============================================================
// fetchJson — robust wrapper that never crashes
// ============================================================

export async function fetchJson<T = any>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  let data: any = null
  try { data = await res.json() } catch { /* empty */ }
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return (data?.items !== undefined ? data.items : data) as T
}

export async function sendJson<T = any>(
  url: string,
  body: unknown,
  method: "POST" | "PATCH" | "PUT" | "DELETE" = "POST",
): Promise<T> {
  return fetchJson<T>(url, {
    method,
    body: JSON.stringify(body),
  })
}

// ============================================================
// Date / time helpers
// ============================================================

export function fmtDate(d?: string | Date | null): string {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

export function fmtDateTime(d?: string | Date | null): string {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy, hh:mm a") } catch { return "—" }
}

export function fmtTime(d?: string | Date | null): string {
  if (!d) return "—"
  try { return format(new Date(d), "hh:mm a") } catch { return "—" }
}

export function fmtTimeStr(t?: string | null): string {
  if (!t) return "—"
  // t is "HH:mm" format
  try {
    const [h, m] = t.split(":").map(Number)
    const d = new Date(); d.setHours(h, m, 0, 0)
    return format(d, "hh:mm a")
  } catch { return t }
}

export function empName(e?: EmployeeLite | null): string {
  if (!e) return "—"
  return (
    e.displayName ||
    [e.firstName, e.lastName].filter(Boolean).join(" ") ||
    e.employeeCode ||
    "—"
  )
}

export function empInitials(e?: EmployeeLite | null): string {
  const n = empName(e)
  if (!n || n === "—") return "?"
  return n.slice(0, 2).toUpperCase()
}

export function toNum(v: unknown, def = 0): number {
  if (v === undefined || v === null || v === "") return def
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

export function toBool(v: unknown, def = false): boolean {
  if (v === undefined || v === null || v === "") return def
  if (typeof v === "boolean") return v
  if (typeof v === "string") return v === "true" || v === "1" || v === "yes"
  return Boolean(v)
}

// ============================================================
// Status colors
// ============================================================

export const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  Present: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Absent: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  "Half Day": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  HalfDay: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Late: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  EarlyGoing: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  MissingInPunch: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400",
  MissingOutPunch: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400",
  MissingPunch: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400",
  WeeklyOff: "bg-slate-200 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  Holiday: "bg-slate-200 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400",
  Leave: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  WFH: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  OnDuty: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  OD: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  Permission: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  CompOff: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  LWP: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  NotYetPunched: "bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400",
  AttendanceLocked: "bg-slate-200 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400",
  PayrollLocked: "bg-slate-300 text-slate-700 dark:bg-slate-500/25 dark:text-slate-300",
}

export function AttendanceStatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground/50 text-sm italic">—</span>
  const cls = ATTENDANCE_STATUS_COLORS[status] || "bg-muted text-muted-foreground"
  return <Badge variant="secondary" className={cn("font-medium border-0", cls)}>{status}</Badge>
}

export const REQUEST_STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  Submitted: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  PendingApproval: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  Withdrawn: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  AutoApproved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Escalated: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
}

export function RequestStatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground/50 text-sm italic">—</span>
  const cls = REQUEST_STATUS_COLORS[status] || "bg-muted text-muted-foreground"
  return <Badge variant="secondary" className={cn("font-medium border-0", cls)}>{status}</Badge>
}

// ============================================================
// Constants
// ============================================================

export const ATTENDANCE_STATUSES = [
  "Present", "Absent", "Half Day", "Late", "EarlyGoing",
  "MissingInPunch", "MissingOutPunch", "WeeklyOff", "Holiday",
  "Leave", "WFH", "OnDuty", "Permission", "CompOff", "LWP", "NotYetPunched",
]

export const ATTENDANCE_SOURCES = [
  "Web", "Mobile", "Biometric", "FaceRecognition", "QRCode",
  "GeoFence", "AdminEntry", "ExcelImport", "API", "Regularization",
]

export const REQUEST_TYPES = [
  "Regularization", "WFH", "OnDuty", "Permission", "PartialDay",
  "ShiftChange", "WeeklyOffChange", "Overtime", "Correction",
  "MissingPunch", "ClientVisit", "OfficialTravel", "Training",
]

export const REGULARIZATION_TYPES = [
  "MissingInPunch", "MissingOutPunch", "BothPunchMissing", "WrongPunchTime",
  "ForgotPunch", "BiometricDeviceIssue", "WorkFromHome", "OnDuty",
  "ClientVisit", "OfficialTravel", "Training", "PermissionShortLeave",
  "PartialDay", "LateComingJustification", "EarlyGoingJustification",
  "HalfDayCorrection", "AbsentToPresent", "AbsentToWFH", "AbsentToOnDuty",
]

export const BULK_ACTIONS = [
  "MarkPresent", "MarkAbsent", "MarkHalfDay", "MarkWeeklyOff", "MarkHoliday",
  "MarkWFH", "MarkOnDuty", "MarkLWP", "UpdatePunchTime", "AddMissingPunch",
  "CancelPenalty", "Regularize", "AssignShift", "ChangeWeeklyOff",
  "Lock", "Unlock", "Recalculate",
]

export const OVERTIME_TYPES = ["Weekday", "Weekend", "Holiday"]

export const CHART_COLORS = ["#10b981", "#14b8a6", "#f59e0b", "#f43f5e", "#06b6d4", "#8b5cf6", "#84cc16"]

// ============================================================
// Skeletons
// ============================================================

export function GridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
      ))}
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="p-3 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-full rounded bg-muted/50 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

// ============================================================
// useAsync hook
// ============================================================

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList = [],
): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tick, setTick] = React.useState(0)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fn()
      .then((d) => { if (alive) { setData(d); setError(null) } })
      .catch((e) => { if (alive) setError(e?.message || "Failed to load") })
      .finally(() => { if (alive) setLoading(false) })
  }, [...deps, tick])

  return { data, loading, error, reload: () => setTick((t) => t + 1) }
}

// ============================================================
// Toast helpers
// ============================================================

export function toastError(e: unknown, fallback = "Something went wrong") {
  const msg = e instanceof Error ? e.message : (e as any)?.message || fallback
  toast.error(msg)
}

export function toastSuccess(msg: string) {
  toast.success(msg)
}

// ============================================================
// CSV download
// ============================================================

export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) { toast.error("No data to export"); return }
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))))
  const escape = (v: any) => {
    const s = v == null ? "" : String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================================
// Section wrapper
// ============================================================

export function SectionShell({
  title, description, actions, children,
}: {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      {(title || actions) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

export const SCROLL_AREA = "max-h-96 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--muted-foreground)_transparent]"
