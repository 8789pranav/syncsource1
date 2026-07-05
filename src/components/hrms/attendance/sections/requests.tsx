'use client'

import * as React from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Inbox, Check, X, Eye, Ban, Search, Download, Plus, Clock,
  CheckCircle2, XCircle, FileText,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Column, DataTable, EmptyState, StatCard,
} from "@/components/hrms/ui"
import {
  fetchJson, sendJson, useAsync, empName, empInitials, fmtDate, fmtDateTime,
  fmtTime, toNum, toastError, toastSuccess, downloadCSV,
  RequestStatusBadge, REQUEST_TYPES, AttendanceRequest, EmployeeLite,
} from "../shared"

const TYPE_OPTIONS = [
  { value: "all", label: "All Request Types" },
  ...REQUEST_TYPES.map((t) => ({ value: t, label: t.replace(/([A-Z])/g, " $1").trim() })),
]

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "PendingApproval", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "Withdrawn", label: "Withdrawn" },
]

const TYPE_COLORS: Record<string, string> = {
  Regularization: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  WFH: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  OnDuty: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  Permission: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  PartialDay: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  ShiftChange: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400",
  WeeklyOffChange: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  Overtime: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Correction: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  MissingPunch: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

function TypeBadge({ type }: { type?: string }) {
  if (!type) return <span className="text-muted-foreground/50 italic">—</span>
  const cls = TYPE_COLORS[type] || "bg-muted text-muted-foreground"
  return (
    <Badge variant="secondary" className={`font-medium border-0 ${cls}`}>
      {type.replace(/([A-Z])/g, " $1").trim()}
    </Badge>
  )
}

function calcDuration(req: AttendanceRequest): string {
  const d = toNum(req.duration, 0)
  if (d > 0) return `${d}h`
  if (req.fromTime && req.toTime) {
    try {
      const [fh, fm] = req.fromTime.split(":").map(Number)
      const [th, tm] = req.toTime.split(":").map(Number)
      const mins = th * 60 + tm - (fh * 60 + fm)
      if (mins > 0) {
        const h = Math.floor(mins / 60)
        const m = mins % 60
        return m ? `${h}h ${m}m` : `${h}h`
      }
    } catch { /* ignore */ }
  }
  if (req.fromDate && req.toDate) {
    try {
      const ms = new Date(req.toDate).getTime() - new Date(req.fromDate).getTime()
      const days = Math.round(ms / 86400000) + 1
      if (days > 0) return `${days}d`
    } catch { /* ignore */ }
  }
  return "—"
}

function pendingWith(req: AttendanceRequest): string {
  const aps = req.approvals || []
  const pending = aps.find((a) => a.action === "Pending")
  if (!pending) return req.status === "Approved" ? "Done" : "—"
  return pending.approverType?.replace(/([A-Z])/g, " $1").trim() || "Approver"
}

export function RequestsSection() {
  const [search, setSearch] = React.useState("")
  const [type, setType] = React.useState("all")
  const [status, setStatus] = React.useState("all")
  const [view, setView] = React.useState<AttendanceRequest | null>(null)
  const [decision, setDecision] = React.useState<{ req: AttendanceRequest; action: "approve" | "reject" } | null>(null)
  const [cancelReq, setCancelReq] = React.useState<AttendanceRequest | null>(null)
  const [comment, setComment] = React.useState("")
  const [approverName, setApproverName] = React.useState("HR Manager")
  const [submitting, setSubmitting] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)

  const qs = React.useMemo(() => {
    const p = new URLSearchParams()
    if (type !== "all") p.set("type", type)
    if (status !== "all") p.set("status", status)
    return p.toString()
  }, [type, status])

  const { data: requests, loading, error, reload } = useAsync<AttendanceRequest[]>(
    () => fetchJson(`/api/attendance-requests${qs ? `?${qs}` : ""}`),
    [qs],
  )

  const filtered = (requests || []).filter((r) => {
    if (!search) return true
    const n = empName(r.employee).toLowerCase()
    const code = (r.employee?.employeeCode || "").toLowerCase()
    const reason = (r.reason || "").toLowerCase()
    const q = search.toLowerCase()
    return n.includes(q) || code.includes(q) || reason.includes(q)
  })

  const stats = React.useMemo(() => {
    const all = requests || []
    return {
      total: all.length,
      pending: all.filter((r) => r.status === "PendingApproval").length,
      approved: all.filter((r) => r.status === "Approved").length,
      rejected: all.filter((r) => r.status === "Rejected").length,
    }
  }, [requests])

  async function submitDecision() {
    if (!decision) return
    if (decision.action === "reject" && !comment.trim()) {
      toast.error("Comment is required when rejecting")
      return
    }
    setSubmitting(true)
    try {
      await sendJson(`/api/attendance-requests/${decision.req.id}`, {
        action: decision.action,
        comment,
        approverName,
        approverType: "HR",
      }, "PATCH")
      toastSuccess(`Request ${decision.action === "approve" ? "approved" : "rejected"}`)
      setDecision(null); setComment("")
      reload()
    } catch (e) {
      toastError(e)
    } finally {
      setSubmitting(false)
    }
  }

  async function submitCancel() {
    if (!cancelReq) return
    setSubmitting(true)
    try {
      await sendJson(`/api/attendance-requests/${cancelReq.id}`, {
        action: "cancel",
        comment,
        approverName,
        approverType: "HR",
      }, "PATCH")
      toastSuccess("Request cancelled")
      setCancelReq(null); setComment("")
      reload()
    } catch (e) {
      toastError(e)
    } finally {
      setSubmitting(false)
    }
  }

  function exportCSV() {
    const rows = filtered.map((r) => ({
      Employee: empName(r.employee),
      Code: r.employee?.employeeCode || "",
      Type: r.requestType,
      Date: fmtDate(r.attendanceDate),
      FromTime: r.fromTime || "",
      ToTime: r.toTime || "",
      Duration: calcDuration(r),
      Status: r.status,
      PendingWith: pendingWith(r),
      Reason: r.reason || "",
      AppliedAt: fmtDateTime(r.appliedAt),
    }))
    downloadCSV(`attendance-requests-${format(new Date(), "yyyyMMdd")}.csv`, rows)
  }

  const columns: Column<AttendanceRequest>[] = [
    {
      key: "employee", header: "Employee",
      render: (r) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
            {empInitials(r.employee)}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{empName(r.employee)}</p>
            <p className="text-xs text-muted-foreground">{r.employee?.employeeCode || "—"}</p>
          </div>
        </div>
      ),
    },
    { key: "requestType", header: "Type", render: (r) => <TypeBadge type={r.requestType} /> },
    { key: "date", header: "Date", render: (r) => <span className="text-sm">{fmtDate(r.attendanceDate)}</span> },
    {
      key: "time", header: "From–To",
      render: (r) => (
        <span className="text-sm tabular-nums">
          {r.fromTime || "—"} <span className="text-muted-foreground">→</span> {r.toTime || "—"}
        </span>
      ),
    },
    { key: "duration", header: "Duration", render: (r) => <span className="text-sm tabular-nums">{calcDuration(r)}</span> },
    {
      key: "reason", header: "Reason",
      render: (r) => (
        <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px] inline-block align-bottom" title={r.reason || ""}>
          {r.reason || "—"}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (r) => <RequestStatusBadge status={r.status} /> },
    { key: "pendingWith", header: "Pending With", render: (r) => <span className="text-xs text-muted-foreground">{pendingWith(r)}</span> },
    { key: "applied", header: "Applied", render: (r) => <span className="text-xs text-muted-foreground">{fmtDate(r.appliedAt)}</span> },
    {
      key: "actions", header: "", width: "200px",
      render: (r) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setView(r)} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          {r.status === "PendingApproval" && (
            <>
              <Button size="sm" variant="outline" className="h-8 text-rose-600 hover:text-rose-700 gap-1" onClick={() => { setDecision({ req: r, action: "reject" }); setComment("") }}>
                <X className="h-3.5 w-3.5" /> Reject
              </Button>
              <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={() => { setDecision({ req: r, action: "approve" }); setComment("") }}>
                <Check className="h-3.5 w-3.5" /> Approve
              </Button>
            </>
          )}
          {(r.status === "PendingApproval" || r.status === "Approved") && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500" onClick={() => { setCancelReq(r); setComment("") }} title="Cancel">
              <Ban className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Attendance Requests</h2>
          <p className="text-sm text-muted-foreground">Central approval queue for all attendance-related applications.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Request
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pending" value={stats.pending} icon={Clock} accent="amber" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Rejected" value={stats.rejected} icon={XCircle} accent="coral" />
        <StatCard label="Total" value={stats.total} icon={FileText} accent="cyan" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee, code, reason…"
            className="pl-9 h-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 p-3 text-sm text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        emptyState={<EmptyState icon={Inbox} title="No requests found" description="Adjust filters or create a new attendance request." />}
      />

      {/* New Request dialog */}
      <NewRequestDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={reload} />

      {/* Decision dialog */}
      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {decision?.action === "approve" ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-rose-600" />}
              {decision?.action === "approve" ? "Approve" : "Reject"} Request
            </DialogTitle>
            <DialogDescription>
              {decision && (
                <>
                  {empName(decision.req.employee)} · <TypeBadge type={decision.req.requestType} /> · {fmtDate(decision.req.attendanceDate)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="an">Approver Name</Label>
              <Input id="an" value={approverName} onChange={(e) => setApproverName(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cm">Comment {decision?.action === "reject" && <span className="text-rose-500">*</span>}</Label>
              <Textarea id="cm" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Comment for the employee…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDecision(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={submitting || (decision?.action === "reject" && !comment.trim())}
              onClick={submitDecision}
              className={decision?.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
            >
              {submitting ? "Saving…" : decision?.action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={!!cancelReq} onOpenChange={(o) => !o && setCancelReq(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-slate-600" /> Cancel Request
            </DialogTitle>
            <DialogDescription>
              {cancelReq && (
                <>
                  {empName(cancelReq.employee)} · <TypeBadge type={cancelReq.requestType} /> · {fmtDate(cancelReq.attendanceDate)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cc">Reason</Label>
            <Textarea id="cc" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Reason for cancellation…" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCancelReq(null)}>Close</Button>
            <Button size="sm" disabled={submitting} onClick={submitCancel} className="bg-slate-600 hover:bg-slate-700">
              {submitting ? "Cancelling…" : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View sheet */}
      <Sheet open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Request Details</SheetTitle>
            <SheetDescription>Submitted on {fmtDateTime(view?.appliedAt)}</SheetDescription>
          </SheetHeader>
          {view && <RequestDetail req={view} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ---------- Request Detail (in the side sheet) ----------

function RequestDetail({ req }: { req: AttendanceRequest }) {
  const aps = req.approvals || []
  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
          {empInitials(req.employee)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold">{empName(req.employee)}</p>
          <p className="text-xs text-muted-foreground">{req.employee?.employeeCode} · {req.employee?.department?.name || "—"}</p>
        </div>
        <div className="ml-auto"><RequestStatusBadge status={req.status} /></div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Request Type" value={<TypeBadge type={req.requestType} />} />
        <Field label="Attendance Date" value={fmtDate(req.attendanceDate)} />
        <Field label="From Time" value={req.fromTime || "—"} />
        <Field label="To Time" value={req.toTime || "—"} />
        <Field label="Duration" value={calcDuration(req)} />
        <Field label="Permission Type" value={req.permissionType || "—"} />
        <Field label="Work Location" value={req.workLocation || "—"} />
        <Field label="Client / Site" value={req.clientSiteName || "—"} />
        <Field label="Current Status" value={req.currentStatus || "—"} />
        <Field label="Requested Status" value={req.requestedStatus || "—"} />
        <Field label="Current First In" value={req.currentFirstIn ? fmtTime(req.currentFirstIn) : "—"} />
        <Field label="Current Last Out" value={req.currentLastOut ? fmtTime(req.currentLastOut) : "—"} />
        <Field label="Requested First In" value={req.requestedFirstIn ? fmtDateTime(req.requestedFirstIn) : "—"} />
        <Field label="Requested Last Out" value={req.requestedLastOut ? fmtDateTime(req.requestedLastOut) : "—"} />
        <Field label="Purpose" value={req.purpose || "—"} full />
        <Field label="Reason" value={req.reason || "—"} full />
      </div>

      {/* Approval chain timeline */}
      <div className="rounded-xl border border-border/60 p-3">
        <p className="text-sm font-semibold mb-3">Approval Chain</p>
        {aps.length === 0 ? (
          <p className="text-xs text-muted-foreground">No approval steps recorded.</p>
        ) : (
          <ol className="space-y-3">
            {aps.map((ap, i) => {
              const dot = ap.action === "Approved" ? "bg-emerald-500" : ap.action === "Rejected" ? "bg-rose-500" : "bg-amber-400"
              return (
                <li key={ap.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dot}`} />
                    {i < aps.length - 1 && <span className="flex-1 w-px bg-border min-h-[24px]" />}
                  </div>
                  <div className="min-w-0 pb-1">
                    <p className="text-sm font-medium">
                      Step {ap.stepOrder} · {ap.approverType?.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ap.approverName || "Awaiting"} · {ap.action}
                      {ap.actedAt && <> · {fmtDateTime(ap.actedAt)}</>}
                    </p>
                    {ap.comment && <p className="text-xs mt-1 italic text-muted-foreground">“{ap.comment}”</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {req.decisionComment && (
        <div className="rounded-xl border border-border/60 p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Decision Comment</p>
          <p className="text-sm">{req.decisionComment}</p>
          <p className="text-xs text-muted-foreground mt-2">
            By {req.decisionBy || "—"} on {fmtDateTime(req.decisionAt)}
          </p>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium mt-0.5 break-words">{value}</p>
    </div>
  )
}

// ---------- New Request Dialog ----------

function NewRequestDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void
}) {
  const { data: employees } = useAsync<EmployeeLite[]>(() => fetchJson("/api/employees"), [])
  const [employeeId, setEmployeeId] = React.useState("")
  const [requestType, setRequestType] = React.useState("Regularization")
  const [date, setDate] = React.useState(format(new Date(), "yyyy-MM-dd"))
  const [fromTime, setFromTime] = React.useState("09:00")
  const [toTime, setToTime] = React.useState("18:00")
  const [reason, setReason] = React.useState("")
  const [workLocation, setWorkLocation] = React.useState("")
  const [purpose, setPurpose] = React.useState("")
  const [permissionType, setPermissionType] = React.useState("Personal")
  const [submitting, setSubmitting] = React.useState(false)

  async function submit() {
    if (!employeeId) { toast.error("Select an employee"); return }
    if (!reason.trim()) { toast.error("Reason is required"); return }
    setSubmitting(true)
    try {
      await sendJson("/api/attendance-requests", {
        employeeId,
        requestType,
        attendanceDate: date,
        fromTime, toTime,
        reason: reason.trim(),
        workLocation: workLocation || undefined,
        purpose: purpose || undefined,
        permissionType: requestType === "Permission" ? permissionType : undefined,
        requestedStatus: requestType === "WFH" ? "WFH" : requestType === "OnDuty" ? "OnDuty" : requestType === "Permission" ? "Permission" : undefined,
      })
      toastSuccess("Request submitted")
      onOpenChange(false)
      setReason(""); setWorkLocation(""); setPurpose("")
      onCreated()
    } catch (e) {
      toastError(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-emerald-600" /> New Attendance Request
          </DialogTitle>
          <DialogDescription>Apply for a regularization, WFH, on-duty, permission or other request.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label>Employee <span className="text-rose-500">*</span></Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {(employees || []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {empName(e)} {e.employeeCode ? `· ${e.employeeCode}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Request Type</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {REQUEST_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/([A-Z])/g, " $1").trim()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label>From Time</Label>
            <Input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label>To Time</Label>
            <Input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} className="h-9" />
          </div>
          {requestType === "Permission" && (
            <div className="space-y-1.5 col-span-2">
              <Label>Permission Type</Label>
              <Select value={permissionType} onValueChange={setPermissionType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Personal", "Official", "Medical", "Family", "Bereavement", "Other"].map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {(requestType === "WFH" || requestType === "OnDuty") && (
            <div className="space-y-1.5 col-span-2">
              <Label>Work Location</Label>
              <Input value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} className="h-9" placeholder="e.g. Home, Client office…" />
            </div>
          )}
          {requestType === "OnDuty" && (
            <div className="space-y-1.5 col-span-2">
              <Label>Purpose</Label>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} className="h-9" placeholder="Purpose of on-duty…" />
            </div>
          )}
          <div className="space-y-1.5 col-span-2">
            <Label>Reason <span className="text-rose-500">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Explain the reason for this request…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={submitting} onClick={submit} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? "Submitting…" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
