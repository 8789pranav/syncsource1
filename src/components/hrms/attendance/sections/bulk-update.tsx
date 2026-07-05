'use client'

import * as React from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  CalendarRange, Users2, CheckCircle2, Layers3, ChevronRight,
  ChevronLeft, Play, RefreshCw, Download, AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Column, DataTable, EmptyState, SectionCard, StatCard,
} from "@/components/hrms/ui"
import {
  fetchJson, useAsync, empName, empInitials, fmtDate, fmtDateTime,
  toNum, downloadCSV, toastError, toastSuccess,
  BULK_ACTIONS,
  type EmployeeLite, type AttendanceBulkUpdate,
} from "../shared"

// ============================================================
// Constants
// ============================================================

const STEPS = [
  { id: 1, label: "Date Range", icon: CalendarRange },
  { id: 2, label: "Filter", icon: Layers3 },
  { id: 3, label: "Select Employees", icon: Users2 },
  { id: 4, label: "Choose Action", icon: CheckCircle2 },
  { id: 5, label: "Preview", icon: AlertTriangle },
  { id: 6, label: "Submit", icon: Play },
]

const ACTION_LABELS: Record<string, string> = {
  MarkPresent: "Mark Present",
  MarkAbsent: "Mark Absent",
  MarkHalfDay: "Mark Half Day",
  MarkWeeklyOff: "Mark Weekly Off",
  MarkHoliday: "Mark Holiday",
  MarkWFH: "Mark WFH",
  MarkOnDuty: "Mark On Duty",
  MarkLWP: "Mark LWP",
  UpdatePunchTime: "Update Punch Time",
  AddMissingPunch: "Add Missing Punch",
  CancelPenalty: "Cancel Penalty",
  Regularize: "Regularize",
  AssignShift: "Assign Shift",
  ChangeWeeklyOff: "Change Weekly Off",
  Lock: "Lock Attendance",
  Unlock: "Unlock Attendance",
  Recalculate: "Recalculate",
}

// ============================================================
// Main section
// ============================================================

export function BulkUpdateSection() {
  // ---- step state ----
  const [step, setStep] = React.useState(1)
  const [fromDate, setFromDate] = React.useState(format(new Date(), "yyyy-MM-dd"))
  const [toDate, setToDate] = React.useState(format(new Date(), "yyyy-MM-dd"))

  // ---- filters ----
  const [deptFilter, setDeptFilter] = React.useState("all")
  const [locFilter, setLocFilter] = React.useState("all")
  const [shiftFilter, setShiftFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")

  // ---- selection ----
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [actionType, setActionType] = React.useState<string>("")
  const [reason, setReason] = React.useState("")
  const [submitOpen, setSubmitOpen] = React.useState(false)

  // ---- fetch employees + picker data ----
  const { data: employees, loading: empLoading, reload: reloadEmps } = useAsync<EmployeeLite[]>(
    () => fetchJson("/api/employees?limit=500").catch(() => []),
    [],
  )
  const { data: departments } = useAsync<{ id: string; name: string }[]>(
    () => fetchJson("/api/departments").catch(() => []),
    [],
  )
  const { data: locations } = useAsync<{ id: string; name: string }[]>(
    () => fetchJson("/api/locations").catch(() => []),
    [],
  )
  const { data: shifts } = useAsync<{ id: string; code: string; name: string }[]>(
    () => fetchJson("/api/shifts").catch(() => []),
    [],
  )

  // ---- history ----
  const { data: history, loading: histLoading, reload: reloadHist } = useAsync<AttendanceBulkUpdate[]>(
    () => fetchJson("/api/attendance-bulk").catch(() => []),
    [],
  )

  // ---- filtered employees (by step 2 filters) ----
  const filteredEmployees = React.useMemo(() => {
    const list = employees || []
    return list.filter((e) => {
      if (deptFilter !== "all" && e.department?.id !== deptFilter) return false
      if (locFilter !== "all" && e.location?.id !== locFilter) return false
      if (statusFilter !== "all" && (e as any).employeeStatus !== statusFilter) return false
      return true
    })
  }, [employees, deptFilter, locFilter, statusFilter])

  const selectedEmployees = React.useMemo(() => {
    return (employees || []).filter((e) => selectedIds.has(e.id))
  }, [employees, selectedIds])

  // ---- day count between dates ----
  const dayCount = React.useMemo(() => {
    const a = new Date(fromDate); const b = new Date(toDate)
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0
    const diff = Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 0
  }, [fromDate, toDate])

  const totalImpact = selectedIds.size * dayCount

  // ---- navigation ----
  function next() { setStep((s) => Math.min(6, s + 1)) }
  function prev() { setStep((s) => Math.max(1, s - 1)) }

  const canNext = (
    (step === 1 && dayCount > 0) ||
    step === 2 ||
    (step === 3 && selectedIds.size > 0) ||
    (step === 4 && !!actionType) ||
    step === 5
  )

  // ---- submit ----
  async function submit() {
    setSubmitOpen(false)
    try {
      await fetchJson("/api/attendance-bulk", {
        method: "POST",
        body: JSON.stringify({
          employeeIds: Array.from(selectedIds),
          actionType,
          fromDate,
          toDate,
          newStatus: actionType,
          reason,
          requestedBy: "HR Admin",
        }),
      })
      toastSuccess(`Bulk update applied to ${selectedIds.size} employee(s) · ${dayCount} day(s)`)
      setReason("")
      setActionType("")
      setSelectedIds(new Set())
      setStep(1)
      reloadHist()
      reloadEmps()
    } catch (e) {
      toastError(e, "Bulk update failed")
    }
  }

  // ---- history columns ----
  const historyColumns: Column<AttendanceBulkUpdate>[] = [
    {
      key: "action",
      header: "Action",
      render: (r) => <Badge variant="secondary" className="text-[10px] border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
        {ACTION_LABELS[r.actionType] || r.actionType}
      </Badge>,
    },
    {
      key: "range",
      header: "Date Range",
      render: (r) => <span className="text-xs">{fmtDate(r.fromDate)} → {fmtDate(r.toDate)}</span>,
    },
    {
      key: "empCount",
      header: "Employees",
      render: (r) => <span className="text-xs tabular-nums">{(r.employeeIds || "").split(",").filter(Boolean).length}</span>,
    },
    {
      key: "affected",
      header: "Affected",
      render: (r) => <span className="text-xs tabular-nums font-medium text-emerald-700 dark:text-emerald-400">{toNum(r.affectedCount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant="secondary" className="text-[10px] border-0 bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400">{r.status}</Badge>,
    },
    {
      key: "by",
      header: "Requested By",
      render: (r) => <span className="text-xs">{r.requestedBy || "—"}</span>,
    },
    {
      key: "at",
      header: "Timestamp",
      render: (r) => <span className="text-xs text-muted-foreground">{fmtDateTime(r.processedAt || r.createdAt)}</span>,
    },
    {
      key: "reason",
      header: "Reason",
      render: (r) => <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{r.reason || "—"}</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Bulk Attendance Update</h2>
          <p className="text-sm text-muted-foreground">
            Multi-step workflow: pick dates → filter employees → choose action → preview impact → submit.
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={() => { reloadHist(); reloadEmps() }}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Selected Employees" value={selectedIds.size} icon={Users2} accent="emerald" />
        <StatCard label="Days in Range" value={dayCount} icon={CalendarRange} accent="cyan" />
        <StatCard label="Total Records Affected" value={totalImpact} icon={Layers3} accent="amber" />
        <StatCard label="Past Bulk Updates" value={(history || []).length} icon={CheckCircle2} accent="coral" />
      </div>

      {/* Stepper */}
      <SectionCard title="Bulk Update Wizard" description="Complete each step in order">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const active = step === s.id
            const done = step > s.id
            return (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => (s.id < step ? setStep(s.id) : null)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "bg-emerald-600 text-white"
                      : done
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{s.id}. {s.label}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
              </React.Fragment>
            )
          })}
        </div>

        {/* Step content */}
        <div className="mt-3 rounded-xl border border-border/60 p-4">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Step 1 — Select Date Range</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                <div>
                  <Label className="text-xs">From Date</Label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">To Date</Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9" />
                </div>
              </div>
              {dayCount > 0 && (
                <Badge variant="secondary" className="text-[10px] border-0 bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400">
                  {dayCount} day(s) selected
                </Badge>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Step 2 — Filter Employees</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Department</Label>
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {(departments || []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Location</Label>
                  <Select value={locFilter} onValueChange={setLocFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {(locations || []).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Shift</Label>
                  <Select value={shiftFilter} onValueChange={setShiftFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Shifts</SelectItem>
                      {(shifts || []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Employee Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="On Notice">On Notice</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{filteredEmployees.length} employee(s) match these filters.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Step 3 — Select Employees ({selectedIds.size} selected)</p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => setSelectedIds(new Set(filteredEmployees.map((e) => e.id)))}>
                    Select All
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </Button>
                </div>
              </div>
              {empLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 w-full rounded bg-muted/50 animate-pulse" />)}
                </div>
              ) : filteredEmployees.length === 0 ? (
                <EmptyState icon={Users2} title="No employees match your filters" description="Go back and adjust filters." />
              ) : (
                <div className="max-h-72 overflow-y-auto [scrollbar-width:thin] rounded-lg border border-border/60">
                  <DataTable
                    columns={empPickerCols()}
                    rows={filteredEmployees}
                    selectable
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                  />
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Step 4 — Choose Bulk Action</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {BULK_ACTIONS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setActionType(a)}
                    className={`text-left rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      actionType === a
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "border-border/60 hover:bg-muted/50"
                    }`}
                  >
                    {ACTION_LABELS[a] || a}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Step 5 — Preview Impact</p>
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-500/5 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  About to apply <b className="mx-1">{ACTION_LABELS[actionType] || actionType}</b> to <b className="mx-1">{selectedIds.size}</b> employee(s) across <b className="mx-1">{dayCount}</b> day(s).
                </div>
                <p className="text-xs mt-1 text-amber-700 dark:text-amber-500">
                  Total records affected: <b>{totalImpact}</b>. Date range: <b>{fmtDate(fromDate)}</b> → <b>{fmtDate(toDate)}</b>.
                </p>
              </div>
              <div>
                <Label className="text-xs">Reason / Comments (required)</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                  placeholder="e.g. System outage on 12-Jun, regularising all employees as Present." />
              </div>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <div className="bg-muted/40 px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground">
                  Selected Employees ({selectedIds.size})
                </div>
                <div className="max-h-48 overflow-y-auto [scrollbar-width:thin]">
                  {selectedEmployees.slice(0, 20).map((e) => (
                    <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 text-xs border-t border-border/40">
                      <Avatar className="h-6 w-6 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        <AvatarFallback className="rounded text-[9px]">{empInitials(e)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{empName(e)}</span>
                      <span className="text-muted-foreground">{e.employeeCode}</span>
                    </div>
                  ))}
                  {selectedEmployees.length > 20 && (
                    <div className="px-3 py-1.5 text-xs text-muted-foreground italic">…and {selectedEmployees.length - 20} more.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Step 6 — Review &amp; Submit</p>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/5 p-3 text-sm space-y-1">
                <div><b>Action:</b> {ACTION_LABELS[actionType] || actionType}</div>
                <div><b>Date Range:</b> {fmtDate(fromDate)} → {fmtDate(toDate)} ({dayCount} day(s))</div>
                <div><b>Employees:</b> {selectedIds.size}</div>
                <div><b>Estimated records:</b> {totalImpact}</div>
                <div><b>Reason:</b> {reason || "—"}</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Click <b>Submit Bulk Update</b> to apply. This action is logged in the audit trail.
              </p>
            </div>
          )}
        </div>

        {/* Nav buttons */}
        <div className="flex items-center justify-between mt-3">
          <Button size="sm" variant="outline" className="h-9" onClick={prev} disabled={step === 1}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < 6 ? (
            <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700" onClick={next} disabled={!canNext}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700" onClick={() => setSubmitOpen(true)}
              disabled={!actionType || selectedIds.size === 0 || !reason.trim()}>
              <Play className="h-4 w-4 mr-1" /> Submit Bulk Update
            </Button>
          )}
        </div>
      </SectionCard>

      {/* History */}
      <SectionCard title="Bulk Update History" description="Past bulk attendance updates"
        action={
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
            onClick={() => downloadCSV("attendance-bulk-history.csv", (history || []).map((h) => ({
              action: h.actionType, from: fmtDate(h.fromDate), to: fmtDate(h.toDate),
              employees: (h.employeeIds || "").split(",").filter(Boolean).length,
              affected: h.affectedCount, status: h.status, requestedBy: h.requestedBy,
              processedAt: fmtDateTime(h.processedAt || h.createdAt), reason: h.reason || "",
            })))}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        }>
        {histLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 w-full rounded bg-muted/50 animate-pulse" />)}
          </div>
        ) : (history || []).length === 0 ? (
          <EmptyState icon={Layers3} title="No bulk updates yet" description="Submit your first bulk update using the wizard above." />
        ) : (
          <div className="max-h-96 overflow-y-auto [scrollbar-width:thin]">
            <DataTable columns={historyColumns} rows={(history || []).map((h) => ({ ...h, id: h.id }))} />
          </div>
        )}
      </SectionCard>

      {/* Submit confirm */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Update</DialogTitle>
            <DialogDescription>
              Apply <b>{ACTION_LABELS[actionType] || actionType}</b> to <b>{selectedIds.size}</b> employee(s) across <b>{dayCount}</b> day(s).
              <br />This will affect approximately <b>{totalImpact}</b> attendance records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="bg-emerald-600 hover:bg-emerald-700">
              <Play className="h-4 w-4 mr-1" /> Apply Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Employee picker columns
// ============================================================

function empPickerCols(): Column<EmployeeLite>[] {
  return [
    {
      key: "employee",
      header: "Employee",
      render: (e) => (
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-7 w-7 shrink-0 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <AvatarFallback className="rounded text-[9px] font-semibold">{empInitials(e)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{empName(e)}</p>
            <p className="text-[11px] text-muted-foreground">{e.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "dept",
      header: "Department",
      render: (e) => <span className="text-xs">{e.department?.name || "—"}</span>,
    },
    {
      key: "loc",
      header: "Location",
      render: (e) => <span className="text-xs">{e.location?.name || "—"}</span>,
    },
  ]
}
