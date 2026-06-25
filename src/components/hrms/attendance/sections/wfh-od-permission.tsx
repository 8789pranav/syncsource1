'use client'

import * as React from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Inbox, Check, X, Eye, Plus, Home, Briefcase, KeyRound,
  MapPin, Clock,
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
import { Switch } from "@/components/ui/switch"
import {
  Tabs, TabsList, TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Column, DataTable, EmptyState,
} from "@/components/hrms/ui"
import {
  fetchJson, sendJson, useAsync, empName, empInitials, fmtDate, fmtDateTime,
  toastError, toastSuccess,
  RequestStatusBadge,
  AttendanceRequest, EmployeeLite,
} from "../shared"

type TabKey = "WFH" | "OnDuty" | "Permission"

const TAB_META: Record<TabKey, { label: string; icon: typeof Home; color: string }> = {
  WFH: { label: "Work From Home", icon: Home, color: "violet" },
  OnDuty: { label: "On Duty", icon: Briefcase, color: "orange" },
  Permission: { label: "Permission", icon: KeyRound, color: "teal" },
}

const PERMISSION_TYPES = ["Personal", "Official", "Medical", "Family", "Bereavement", "Other"]

const POLICY: Record<TabKey, { limit: string; rules: string[] }> = {
  WFH: {
    limit: "8 days / month",
    rules: [
      "Max 8 WFH days per calendar month",
      "Requires prior approval from reporting manager",
      "WFH on Mondays & Fridays requires additional HR approval",
      "Must be available online during work hours",
    ],
  },
  OnDuty: {
    limit: "No fixed limit",
    rules: [
      "On-duty for client visits, training, official travel",
      "Geo-tagged check-in required at client/site location",
      "Approval required from reporting manager",
      "Must submit visit summary within 24 hours",
    ],
  },
  Permission: {
    limit: "2 hours / day · 8 hours / month",
    rules: [
      "Max 2 hours permission per day",
      "Max 8 hours permission per calendar month",
      "Half-day permission (>2h) requires manager approval",
      "Official permission requires supporting document",
    ],
  },
}

function calcDurationMins(fromTime?: string | null, toTime?: string | null): number {
  if (!fromTime || !toTime) return 0
  try {
    const [fh, fm] = fromTime.split(":").map(Number)
    const [th, tm] = toTime.split(":").map(Number)
    const mins = th * 60 + tm - (fh * 60 + fm)
    return mins > 0 ? mins : 0
  } catch { return 0 }
}

function fmtDuration(mins: number): string {
  if (!mins) return "—"
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function WfhOdPermissionSection() {
  const [tab, setTab] = React.useState<TabKey>("WFH")
  const [search, setSearch] = React.useState("")
  const [view, setView] = React.useState<AttendanceRequest | null>(null)
  const [applyOpen, setApplyOpen] = React.useState(false)
  const [decision, setDecision] = React.useState<{ req: AttendanceRequest; action: "approve" | "reject" } | null>(null)
  const [comment, setComment] = React.useState("")
  const [approverName, setApproverName] = React.useState("HR Manager")
  const [submitting, setSubmitting] = React.useState(false)

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

  const { data, loading, error, reload } = useAsync<AttendanceRequest[]>(
    () => fetchJson(`/api/attendance-requests?type=${tab}`),
    [tab],
  )

  const filtered = (data || []).filter((r) => {
    if (!search) return true
    const n = empName(r.employee).toLowerCase()
    const code = (r.employee?.employeeCode || "").toLowerCase()
    const reason = (r.reason || "").toLowerCase()
    const q = search.toLowerCase()
    return n.includes(q) || code.includes(q) || reason.includes(q)
  })

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
    {
      key: "time", header: "From – To",
      render: (r) => {
        const dur = calcDurationMins(r.fromTime, r.toTime)
        return (
          <div className="text-sm tabular-nums">
            <span>{r.fromTime || "—"}</span>
            <span className="text-muted-foreground mx-1">→</span>
            <span>{r.toTime || "—"}</span>
            {dur > 0 && <div className="text-xs text-muted-foreground">{fmtDuration(dur)}</div>}
          </div>
        )
      },
    },
    {
      key: "extra", header: tab === "OnDuty" ? "Client / Site" : tab === "Permission" ? "Permission Type" : "Work Location",
      render: (r) => {
        if (tab === "OnDuty") return <span className="text-sm">{r.clientSiteName || r.workLocation || "—"}</span>
        if (tab === "Permission") return <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400 border-0">{r.permissionType || "—"}</Badge>
        return <span className="text-sm">{r.workLocation || "Home"}</span>
      },
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
      key: "actions", header: "", width: "180px",
      render: (r) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setView(r)} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          {r.status === "PendingApproval" && (
            <>
              <Button size="sm" variant="outline" className="h-8 text-rose-600 hover:text-rose-700 gap-1 px-2" onClick={() => { setDecision({ req: r, action: "reject" }); setComment("") }}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 gap-1 px-2" onClick={() => { setDecision({ req: r, action: "approve" }); setComment("") }}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  const meta = TAB_META[tab]
  const policy = POLICY[tab]
  const Icon = meta.icon

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">WFH · On Duty · Permission</h2>
          <p className="text-sm text-muted-foreground">Apply for work-from-home, on-duty, and short permission (attendance requests, not leave).</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setApplyOpen(true)}>
          <Plus className="h-4 w-4" /> Apply {meta.label}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          {(Object.keys(TAB_META) as TabKey[]).map((k) => {
            const M = TAB_META[k]
            const I = M.icon
            return (
              <TabsTrigger key={k} value={k} className="gap-1.5">
                <I className="h-3.5 w-3.5" /> {M.label}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {/* Policy summary */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <h3 className="text-sm font-semibold">{meta.label} Policy</h3>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-0 w-fit">
                <Clock className="h-3 w-3 mr-1" /> Limit: {policy.limit}
              </Badge>
            </div>
            <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {policy.rules.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-1 h-1 w-1 rounded-full bg-emerald-500 shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-xs">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employee, reason…"
          className="h-9 bg-background"
        />
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
        emptyState={<EmptyState icon={Inbox} title={`No ${meta.label} requests`} description={`Apply for ${meta.label.toLowerCase()} to see it here.`} />}
      />

      {/* Decision dialog */}
      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {decision?.action === "approve" ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-rose-600" />}
              {decision?.action === "approve" ? "Approve" : "Reject"} {tab === "WFH" ? "WFH" : tab === "OnDuty" ? "On Duty" : "Permission"} Request
            </DialogTitle>
            <DialogDescription>
              {decision && <>{empName(decision.req.employee)} · {fmtDate(decision.req.attendanceDate)}</>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="an2">Approver Name</Label>
              <Input id="an2" value={approverName} onChange={(e) => setApproverName(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cm2">Comment {decision?.action === "reject" && <span className="text-rose-500">*</span>}</Label>
              <Textarea id="cm2" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Comment for the employee…" />
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

      {/* Apply dialog */}
      <ApplyDialog tab={tab} open={applyOpen} onOpenChange={setApplyOpen} onCreated={reload} />

      {/* View sheet */}
      <Sheet open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{TAB_META[tab].label} Details</SheetTitle>
            <SheetDescription>Submitted on {fmtDateTime(view?.appliedAt)}</SheetDescription>
          </SheetHeader>
          {view && <ReqDetail req={view} tab={tab} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ---------- Apply Dialog (type-specific) ----------

function ApplyDialog({
  tab, open, onOpenChange, onCreated,
}: {
  tab: TabKey
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void
}) {
  const { data: employees } = useAsync<EmployeeLite[]>(() => fetchJson("/api/employees"), [])
  const { data: mgrEmployees } = useAsync<EmployeeLite[]>(() => fetchJson("/api/employees"), [])

  const [employeeId, setEmployeeId] = React.useState("")
  const [date, setDate] = React.useState(format(new Date(), "yyyy-MM-dd"))
  const [fromTime, setFromTime] = React.useState("09:00")
  const [toTime, setToTime] = React.useState("18:00")
  const [halfDay, setHalfDay] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [workLocation, setWorkLocation] = React.useState("")
  const [clientSiteName, setClientSiteName] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [purpose, setPurpose] = React.useState("")
  const [permissionType, setPermissionType] = React.useState(PERMISSION_TYPES[0])
  const [geoRequired, setGeoRequired] = React.useState(true)
  const [notifyManager, setNotifyManager] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  // reset transient fields when tab changes
  React.useEffect(() => {
    setClientSiteName(""); setLocation(""); setPurpose("")
    setWorkLocation(""); setReason(""); setHalfDay(false)
  }, [tab])

  const durationMins = calcDurationMins(fromTime, toTime)

  async function submit() {
    if (!employeeId) { toast.error("Select an employee"); return }
    if (!reason.trim()) { toast.error("Reason is required"); return }
    setSubmitting(true)
    try {
      const base: Record<string, unknown> = {
        employeeId,
        requestType: tab,
        attendanceDate: date,
        fromTime, toTime,
        reason: reason.trim(),
      }
      if (tab === "WFH") {
        base.workLocation = workLocation || "Home"
        base.requestedStatus = halfDay ? "Half Day" : "WFH"
        if (notifyManager) base.notifyTo = notifyManager
      } else if (tab === "OnDuty") {
        base.clientSiteName = clientSiteName || undefined
        base.workLocation = location || undefined
        base.purpose = purpose || undefined
        base.requestedStatus = "OnDuty"
        if (notifyManager) base.notifyTo = notifyManager
      } else if (tab === "Permission") {
        base.permissionType = permissionType
        base.duration = durationMins / 60
        base.requestedStatus = "Permission"
      }
      await sendJson("/api/attendance-requests", base)
      toastSuccess(`${TAB_META[tab].label} request submitted`)
      onOpenChange(false)
      setReason("")
      onCreated()
    } catch (e) {
      toastError(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tab === "WFH" && <Home className="h-5 w-5 text-violet-600" />}
            {tab === "OnDuty" && <Briefcase className="h-5 w-5 text-orange-600" />}
            {tab === "Permission" && <KeyRound className="h-5 w-5 text-teal-600" />}
            Apply for {TAB_META[tab].label}
          </DialogTitle>
          <DialogDescription>
            Fill in the details below. This is an attendance request — not a leave application.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
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
            <Label>Date <span className="text-rose-500">*</span></Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
          </div>

          {tab === "WFH" && (
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Select value={halfDay ? "half" : "full"} onValueChange={(v) => setHalfDay(v === "half")}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Day</SelectItem>
                  <SelectItem value="half">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>From Time <span className="text-rose-500">*</span></Label>
            <Input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label>To Time <span className="text-rose-500">*</span></Label>
            <Input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} className="h-9" />
          </div>

          {tab === "Permission" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Duration (auto)</Label>
              <div className="flex items-center gap-2">
                <Input value={fmtDuration(durationMins)} readOnly className="h-9 bg-muted/50 tabular-nums" />
                {durationMins > 120 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-0 whitespace-nowrap">
                    Exceeds 2h
                  </Badge>
                )}
              </div>
            </div>
          )}

          {tab === "WFH" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Work Location</Label>
              <Input value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} className="h-9" placeholder="e.g. Home, Co-working space…" />
            </div>
          )}

          {tab === "OnDuty" && (
            <>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Client / Site Name <span className="text-rose-500">*</span></Label>
                <Input value={clientSiteName} onChange={(e) => setClientSiteName(e.target.value)} className="h-9" placeholder="e.g. Acme Corp HQ" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Location</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} className="h-9" placeholder="Full address" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Purpose <span className="text-rose-500">*</span></Label>
                <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} placeholder="Purpose of on-duty visit…" />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium">Geo-location required</p>
                    <p className="text-xs text-muted-foreground">Require check-in with GPS coordinates</p>
                  </div>
                </div>
                <Switch checked={geoRequired} onCheckedChange={setGeoRequired} />
              </div>
            </>
          )}

          {tab === "Permission" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Permission Type</Label>
              <Select value={permissionType} onValueChange={setPermissionType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERMISSION_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Reason <span className="text-rose-500">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Explain the reason for this request…" />
          </div>

          {(tab === "WFH" || tab === "OnDuty") && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notify Manager</Label>
              <Select value={notifyManager} onValueChange={setNotifyManager}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select (optional)" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {(mgrEmployees || []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{empName(e)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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

// ---------- Detail sheet ----------

function ReqDetail({ req, tab }: { req: AttendanceRequest; tab: TabKey }) {
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
        <Field label="From – To" value={`${req.fromTime || "—"} → ${req.toTime || "—"}`} />
        {tab === "WFH" && <Field label="Work Location" value={req.workLocation || "Home"} />}
        {tab === "OnDuty" && <Field label="Client / Site" value={req.clientSiteName || "—"} />}
        {tab === "OnDuty" && <Field label="Location" value={req.workLocation || "—"} />}
        {tab === "Permission" && <Field label="Permission Type" value={req.permissionType || "—"} />}
        {tab === "Permission" && <Field label="Duration" value={fmtDuration(calcDurationMins(req.fromTime, req.toTime))} />}
        {tab === "OnDuty" && <Field label="Purpose" value={req.purpose || "—"} full />}
        <Field label="Reason" value={req.reason || "—"} full />
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
