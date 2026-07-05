'use client'

import * as React from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Inbox, Eye, Plus, Info, AlertTriangle, CalendarClock,
  UserCog, ClipboardList, Clock, CheckCircle2, XCircle,
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
import {
  Tabs, TabsList, TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Column, DataTable, EmptyState, StatCard,
} from "@/components/hrms/ui"
import {
  fetchJson, sendJson, useAsync, empName, empInitials, fmtDate, fmtDateTime,
  fmtTime, toastError, toastSuccess,
  RequestStatusBadge, AttendanceStatusBadge,
  REGULARIZATION_TYPES, ATTENDANCE_STATUSES,
  AttendanceRequest, EmployeeLite, AttendanceRecord,
} from "../shared"

const REG_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "PendingApproval", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "Cancelled", label: "Cancelled" },
]

export function RegularizationSection() {
  const [tab, setTab] = React.useState<"my" | "behalf">("my")
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [regType, setRegType] = React.useState("all")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [view, setView] = React.useState<AttendanceRequest | null>(null)
  const [applyOpen, setApplyOpen] = React.useState(false)

  const qs = React.useMemo(() => {
    const p = new URLSearchParams()
    p.set("type", "Regularization")
    if (status !== "all") p.set("status", status)
    if (from) p.set("from", from)
    if (to) p.set("to", to)
    return p.toString()
  }, [status, from, to])

  const { data: requests, loading, error, reload } = useAsync<AttendanceRequest[]>(
    () => fetchJson(`/api/attendance-requests?${qs}`),
    [qs],
  )

  const filtered = (requests || []).filter((r) => {
    if (regType !== "all") {
      // match by reason containing reg type OR requestedStatus — best effort
      const reason = (r.reason || "").toLowerCase()
      const t = regType.toLowerCase().replace(/([a-z])([A-Z])/g, "$1 $2")
      if (!reason.includes(t)) return false
    }
    if (!search) return true
    const n = empName(r.employee).toLowerCase()
    const code = (r.employee?.employeeCode || "").toLowerCase()
    const q = search.toLowerCase()
    return n.includes(q) || code.includes(q)
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
    { key: "date", header: "Date", render: (r) => <span className="text-sm">{fmtDate(r.attendanceDate)}</span> },
    { key: "current", header: "Current", render: (r) => <AttendanceStatusBadge status={r.currentStatus || undefined} /> },
    { key: "requested", header: "Requested", render: (r) => <AttendanceStatusBadge status={r.requestedStatus || undefined} /> },
    {
      key: "punches", header: "Requested Punches",
      render: (r) => (
        <div className="text-xs tabular-nums">
          <span className="text-muted-foreground">In:</span> {r.requestedFirstIn ? fmtTime(r.requestedFirstIn) : "—"}
          <span className="mx-1 text-muted-foreground">·</span>
          <span className="text-muted-foreground">Out:</span> {r.requestedLastOut ? fmtTime(r.requestedLastOut) : "—"}
        </div>
      ),
    },
    {
      key: "reason", header: "Reason",
      render: (r) => (
        <span className="text-sm text-muted-foreground line-clamp-1 max-w-[220px] inline-block align-bottom" title={r.reason || ""}>
          {r.reason || "—"}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (r) => <RequestStatusBadge status={r.status} /> },
    { key: "applied", header: "Applied", render: (r) => <span className="text-xs text-muted-foreground">{fmtDate(r.appliedAt)}</span> },
    {
      key: "actions", header: "", width: "120px",
      render: (r) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setView(r)} title="View">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Attendance Regularization</h2>
          <p className="text-sm text-muted-foreground">Correct missing/wrong punches and request status changes for past dates.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setApplyOpen(true)}>
          <Plus className="h-4 w-4" /> Apply Regularization
        </Button>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 p-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-sm text-emerald-800 dark:text-emerald-300">
          <p className="font-medium">How regularization works</p>
          <p className="text-xs mt-0.5 text-emerald-700/80 dark:text-emerald-400/80">
            Regularization requests require approval from your reporting manager. Once approved, the system auto-updates the
            attendance record (status, in/out times, work hours). Future dates and payroll-locked dates cannot be regularized.
          </p>
        </div>
      </div>

      {/* Sub tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "my" | "behalf")}>
        <TabsList>
          <TabsTrigger value="my" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> My Regularization</TabsTrigger>
          <TabsTrigger value="behalf" className="gap-1.5"><UserCog className="h-3.5 w-3.5" /> Apply on Behalf</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pending" value={stats.pending} icon={Clock} accent="amber" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Rejected" value={stats.rejected} icon={XCircle} accent="coral" />
        <StatCard label="Total" value={stats.total} icon={ClipboardList} accent="cyan" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" />
          <span className="text-muted-foreground text-sm">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" />
          <Select value={regType} onValueChange={setRegType}>
            <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All Regularization Types</SelectItem>
              {REGULARIZATION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t.replace(/([A-Z])/g, " $1").trim()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:max-w-xs">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee…"
              className="h-9 bg-background"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REG_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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
        emptyState={<EmptyState icon={Inbox} title="No regularization requests" description="Apply for regularization to correct past attendance." />}
      />

      {/* Apply dialog */}
      <ApplyRegularizationDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        onCreated={reload}
        behalfMode={tab === "behalf"}
      />

      {/* View sheet */}
      <Sheet open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Regularization Details</SheetTitle>
            <SheetDescription>Submitted on {fmtDateTime(view?.appliedAt)}</SheetDescription>
          </SheetHeader>
          {view && <RegDetail req={view} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ---------- Apply Regularization Dialog ----------

function ApplyRegularizationDialog({
  open, onOpenChange, onCreated, behalfMode,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void
  behalfMode: boolean
}) {
  const { data: employees } = useAsync<EmployeeLite[]>(() => fetchJson("/api/employees"), [])
  const { data: notifyEmployees } = useAsync<EmployeeLite[]>(() => fetchJson("/api/employees"), [])

  const [employeeId, setEmployeeId] = React.useState("")
  const [date, setDate] = React.useState(format(new Date(), "yyyy-MM-dd"))
  const [regType, setRegType] = React.useState(REGULARIZATION_TYPES[0])
  const [requestedStatus, setRequestedStatus] = React.useState("Present")
  const [requestedFirstIn, setRequestedFirstIn] = React.useState("")
  const [requestedLastOut, setRequestedLastOut] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [attachmentUrl, setAttachmentUrl] = React.useState("")
  const [notifyTo, setNotifyTo] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  // Fetch current attendance for the selected employee + date
  const [currentRec, setCurrentRec] = React.useState<AttendanceRecord | null>(null)
  const [loadingRec, setLoadingRec] = React.useState(false)

  React.useEffect(() => {
    if (!employeeId || !date) { setCurrentRec(null); return }
    let alive = true
    setLoadingRec(true)
    fetchJson<AttendanceRecord[]>(`/api/attendance?employeeId=${employeeId}&from=${date}&to=${date}`)
      .then((items) => { if (alive) setCurrentRec((items || [])[0] || null) })
      .catch(() => { if (alive) setCurrentRec(null) })
      .finally(() => { if (alive) setLoadingRec(false) })
    return () => { alive = false }
  }, [employeeId, date])

  // Validation hints
  const isFuture = date ? new Date(date) > new Date() : false
  const isLocked = currentRec?.isPayrollLocked || currentRec?.isLocked

  React.useEffect(() => {
    // prefill current punches as defaults for requested
    if (currentRec) {
      if (currentRec.firstIn) {
        try { setRequestedFirstIn(toLocalDT(new Date(currentRec.firstIn))) } catch { /* ignore */ }
      }
      if (currentRec.lastOut) {
        try { setRequestedLastOut(toLocalDT(new Date(currentRec.lastOut))) } catch { /* ignore */ }
      }
    }
  }, [currentRec])

  async function submit() {
    if (!employeeId) { toast.error("Select an employee"); return }
    if (!reason.trim()) { toast.error("Reason is required"); return }
    if (isFuture) { toast.error("Cannot regularize future dates"); return }
    if (isLocked) { toast.error("Cannot regularize locked attendance"); return }
    setSubmitting(true)
    try {
      await sendJson("/api/attendance-requests", {
        employeeId,
        requestType: "Regularization",
        attendanceDate: date,
        fromTime: requestedFirstIn ? requestedFirstIn.slice(11, 16) : null,
        toTime: requestedLastOut ? requestedLastOut.slice(11, 16) : null,
        currentStatus: currentRec?.status || null,
        requestedStatus,
        currentFirstIn: currentRec?.firstIn || null,
        currentLastOut: currentRec?.lastOut || null,
        requestedFirstIn: requestedFirstIn || null,
        requestedLastOut: requestedLastOut || null,
        reason: `${regType}: ${reason.trim()}`,
        attachmentUrl: attachmentUrl || undefined,
        notifyTo: notifyTo || undefined,
      })
      toastSuccess("Regularization request submitted")
      onOpenChange(false)
      setReason(""); setAttachmentUrl("")
      onCreated()
    } catch (e) {
      toastError(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-emerald-600" /> Apply Regularization
          </DialogTitle>
          <DialogDescription>
            {behalfMode ? "Apply on behalf of an employee (HR/Manager)." : "Apply to correct your own attendance."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
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
            <Label>Attendance Date <span className="text-rose-500">*</span></Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" max={format(new Date(), "yyyy-MM-dd")} />
          </div>

          {/* Current attendance status */}
          <div className="sm:col-span-2 rounded-xl border border-border/60 p-3 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Current Attendance</p>
            {loadingRec ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : currentRec ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <AttendanceStatusBadge status={currentRec.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">First In</p>
                  <p className="font-medium tabular-nums">{currentRec.firstIn ? fmtTime(currentRec.firstIn) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Out</p>
                  <p className="font-medium tabular-nums">{currentRec.lastOut ? fmtTime(currentRec.lastOut) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Work Hours</p>
                  <p className="font-medium tabular-nums">{currentRec.workHours?.toFixed(2) || "0"}h</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No attendance record found for this date.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Regularization Type</Label>
            <Select value={regType} onValueChange={setRegType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {REGULARIZATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/([A-Z])/g, " $1").trim()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Requested Status</Label>
            <Select value={requestedStatus} onValueChange={setRequestedStatus}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {ATTENDANCE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Current First In</Label>
            <Input value={currentRec?.firstIn ? fmtTime(currentRec.firstIn) : "—"} disabled className="h-9 bg-muted/50" />
          </div>
          <div className="space-y-1.5">
            <Label>Current Last Out</Label>
            <Input value={currentRec?.lastOut ? fmtTime(currentRec.lastOut) : "—"} disabled className="h-9 bg-muted/50" />
          </div>

          <div className="space-y-1.5">
            <Label>Requested First In</Label>
            <Input type="datetime-local" value={requestedFirstIn} onChange={(e) => setRequestedFirstIn(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label>Requested Last Out</Label>
            <Input type="datetime-local" value={requestedLastOut} onChange={(e) => setRequestedLastOut(e.target.value)} className="h-9" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Reason <span className="text-rose-500">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Explain why this regularization is needed…" />
          </div>

          <div className="space-y-1.5">
            <Label>Attachment URL</Label>
            <Input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} className="h-9" placeholder="https://… (optional)" />
          </div>
          <div className="space-y-1.5">
            <Label>Notify To</Label>
            <Select value={notifyTo} onValueChange={setNotifyTo}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select (optional)" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {(notifyEmployees || []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>{empName(e)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Validation hints */}
          {(isFuture || isLocked) && (
            <div className="sm:col-span-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-2.5 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                {isFuture && <p>• Cannot regularize future dates.</p>}
                {isLocked && <p>• This attendance is locked (payroll/admin). Unlock before regularizing.</p>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={submitting || isFuture || isLocked} onClick={submit} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? "Submitting…" : "Submit Regularization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function toLocalDT(d: Date): string {
  // returns yyyy-MM-ddTHH:mm in local time for datetime-local input
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ---------- Reg Detail (side sheet) ----------

function RegDetail({ req }: { req: AttendanceRequest }) {
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
        <Field label="Date" value={fmtDate(req.attendanceDate)} />
        <Field label="Requested Status" value={<AttendanceStatusBadge status={req.requestedStatus || undefined} />} />
        <Field label="Current Status" value={<AttendanceStatusBadge status={req.currentStatus || undefined} />} />
        <Field label="From–To" value={`${req.fromTime || "—"} → ${req.toTime || "—"}`} />
        <Field label="Current First In" value={req.currentFirstIn ? fmtTime(req.currentFirstIn) : "—"} />
        <Field label="Current Last Out" value={req.currentLastOut ? fmtTime(req.currentLastOut) : "—"} />
        <Field label="Requested First In" value={req.requestedFirstIn ? fmtDateTime(req.requestedFirstIn) : "—"} />
        <Field label="Requested Last Out" value={req.requestedLastOut ? fmtDateTime(req.requestedLastOut) : "—"} />
        <Field label="Reason" value={req.reason || "—"} full />
        {req.attachmentUrl && (
          <Field label="Attachment" value={<a href={req.attachmentUrl} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">View attachment</a>} full />
        )}
      </div>

      {(req.approvals || []).length > 0 && (
        <div className="rounded-xl border border-border/60 p-3">
          <p className="text-sm font-semibold mb-3">Approval Chain</p>
          <ol className="space-y-3">
            {req.approvals!.map((ap, i) => {
              const dot = ap.action === "Approved" ? "bg-emerald-500" : ap.action === "Rejected" ? "bg-rose-500" : "bg-amber-400"
              return (
                <li key={ap.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dot}`} />
                    {i < (req.approvals!.length - 1) && <span className="flex-1 w-px bg-border min-h-[24px]" />}
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
