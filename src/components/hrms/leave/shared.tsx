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
  displayName?: string
  department?: { id: string; name: string } | null
  designation?: { id: string; name: string } | null
  reportingManagerId?: string | null
}

export interface LeaveTypeLite {
  id: string
  code: string
  name: string
  color: string
  category?: string
  isPaid?: boolean
  paidType?: string
  leaveUnit?: string
  carryForward?: boolean
  encashment?: boolean
  yearlyAccrual?: number
  status?: string
  [key: string]: unknown
}

export interface LeaveApplication {
  id: string
  tenantId?: string
  employeeId: string
  employee?: EmployeeLite
  leaveTypeId: string
  leaveType?: LeaveTypeLite
  leavePolicyItemId?: string | null
  fromDate: string | Date
  toDate: string | Date
  days: number
  halfDay: boolean
  halfDayType?: string | null
  hours?: number | null
  reason?: string | null
  attachmentUrl?: string | null
  status: string
  appliedAt: string | Date
  decisionAt?: string | Date | null
  decisionBy?: string | null
  decisionComment?: string | null
  currentApproverId?: string | null
  approvedFromDate?: string | Date | null
  approvedToDate?: string | Date | null
  approvedDays?: number | null
  days_log?: Array<{
    id: string
    date: string | Date
    dayType: string
    hours?: number | null
    isHoliday: boolean
    isWeeklyOff: boolean
    counted: boolean
  }>
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

export interface LeavePolicy {
  id: string
  name: string
  code: string
  description?: string | null
  country?: string
  leaveYearType?: string
  calendarStartMonth?: number
  effectiveFrom?: string | Date | null
  effectiveTo?: string | Date | null
  version?: number
  isDefault?: boolean
  priority?: number
  status?: string
  settingsJson?: string | null
  items?: Array<LeavePolicyItem>
  applicabilities?: Array<LeaveRuleApplicability>
}

export interface LeavePolicyItem {
  id: string
  leaveTypeId: string
  leaveType?: LeaveTypeLite
  displayName?: string | null
  isActive?: boolean
  entitlementType?: string
  totalEntitlement?: number
  entitlementUnit?: string
  accrualFrequency?: string
  accrualAmount?: number
  carryForward?: boolean
  maxCarryForward?: number | null
  encashment?: boolean
  [key: string]: unknown
}

export interface LeaveRuleApplicability {
  id: string
  applyTo: string
  entityIds?: string | null
  locationIds?: string | null
  departmentIds?: string | null
  designationIds?: string | null
  gradeIds?: string | null
  employeeIds?: string | null
  excludeEmployeeIds?: string | null
  gender?: string
}

export interface LeaveBalance {
  id?: string
  employeeId: string
  employee?: EmployeeLite
  leaveTypeId: string
  leaveType?: LeaveTypeLite
  year: number
  opening: number
  accrued: number
  granted: number
  adjusted: number
  carryForward: number
  used: number
  pending: number
  encashed: number
  lapsed: number
  expired: number
  available?: number
}

export interface LeaveLedgerEntry {
  id: string
  employeeId: string
  employee?: EmployeeLite
  leaveTypeId: string
  leaveType?: LeaveTypeLite
  transactionDate: string | Date
  transactionType: string
  credit: number
  debit: number
  balanceAfter: number
  referenceType?: string | null
  referenceId?: string | null
  remarks?: string | null
  createdBy?: string | null
  createdAt: string | Date
}

export interface LeaveAdjustment {
  id: string
  employeeId: string
  employee?: EmployeeLite
  leaveTypeId: string
  leaveType?: LeaveTypeLite
  adjustmentType: string
  amount: number
  effectiveDate: string | Date
  reason?: string | null
  remarks?: string | null
  createdBy?: string | null
  createdAt: string | Date
}

export interface CompOffCredit {
  id: string
  employeeId: string
  employee?: EmployeeLite
  source: string
  sourceDate: string | Date
  earnedDate: string | Date
  hours: number
  days: number
  expiryDate?: string | Date | null
  status: string
  approvedBy?: string | null
  remarks?: string | null
  createdAt: string | Date
}

export interface LeaveEncashmentRequest {
  id: string
  employeeId: string
  employee?: EmployeeLite
  leaveTypeId: string
  leaveType?: LeaveTypeLite
  days: number
  amount?: number | null
  formula?: string | null
  status: string
  requestedAt: string | Date
  decisionAt?: string | Date | null
  decisionBy?: string | null
  decisionComment?: string | null
  payrollComponent?: string | null
}

export interface LeaveCarryForwardLog {
  id: string
  employeeId: string
  employee?: EmployeeLite
  leaveTypeId: string
  leaveType?: LeaveTypeLite
  fromYear: number
  toYear: number
  carriedForward: number
  lapsed: number
  encashed: number
  processedAt: string | Date
  processedBy?: string | null
}

export interface WeeklyOffCalendar {
  id: string
  name: string
  code: string
  entityIds?: string | null
  locationIds?: string | null
  weekOffType: string
  fixedDays: string
  configJson?: string | null
  effectiveFrom?: string | Date | null
  effectiveTo?: string | Date | null
  status: string
  createdAt: string | Date
  updatedAt: string | Date
}

export interface Holiday {
  id: string
  name: string
  date: string | Date
  type: string
  description?: string | null
  country: string
  state?: string | null
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

// Send a JSON body and parse the response.
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
// Date helpers
// ============================================================

export function fmtDate(d?: string | Date | null): string {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

export function fmtDateTime(d?: string | Date | null): string {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy, hh:mm a") } catch { return "—" }
}

export function fmtMonth(d?: string | Date | null): string {
  if (!d) return "—"
  try { return format(new Date(d), "MMM yyyy") } catch { return "—" }
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

export function toBool(v: unknown, def = false): boolean {
  if (v === undefined || v === null || v === "") return def
  if (typeof v === "boolean") return v
  if (typeof v === "string") return v === "true" || v === "1" || v === "yes"
  return Boolean(v)
}

export function toNum(v: unknown, def = 0): number {
  if (v === undefined || v === null || v === "") return def
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

// ============================================================
// Status color map (emerald/teal/amber/coral/slate only)
// ============================================================

export const LEAVE_STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  PendingHR: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  Withdrawn: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  PartiallyApproved: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  AutoApproved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  Expired: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
}

export function LeaveStatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground/50 text-sm italic">—</span>
  const cls = LEAVE_STATUS_COLORS[status] || "bg-muted text-muted-foreground"
  return <Badge variant="secondary" className={cn("font-medium border-0", cls)}>{status}</Badge>
}

// ============================================================
// Skeleton grid
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
// Custom scrollbar utility class
// ============================================================

export const SCROLL_AREA = "max-h-96 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--muted-foreground)_transparent]"

// ============================================================
// A small useAsync hook for data fetching + manual refetch
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
// Section wrapper — provides consistent spacing & header
// ============================================================

export function SectionShell({
  title,
  description,
  actions,
  children,
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

// ============================================================
// Filter chips row
// ============================================================

export function FilterRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
    </div>
  )
}

// ============================================================
// CSV download helper
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
// Constants
// ============================================================

export const CHART_COLORS = ["#10b981", "#14b8a6", "#f59e0b", "#f43f5e", "#06b6d4", "#8b5cf6", "#84cc16"]

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
export const WEEKDAY_NUMS = ["0", "1", "2", "3", "4", "5", "6"]

export const LEAVE_TRANSACTION_TYPES = [
  "OpeningBalance", "Accrual", "ManualCredit", "ManualDebit",
  "LeaveApplied", "LeaveApproved", "LeaveCancelled", "LeaveRejected",
  "CarryForward", "Encashment", "Lapse", "PayrollAdjustment", "Migration",
]
