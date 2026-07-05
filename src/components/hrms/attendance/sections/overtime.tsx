'use client'

import * as React from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Clock, Plus, Check, X, Send, Download, RefreshCw, Edit3,
  Timer, Hourglass, CheckCircle2, XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Column, DataTable, EmptyState, SectionCard, StatCard,
} from "@/components/hrms/ui"
import {
  fetchJson, useAsync, empName, empInitials, fmtDate, fmtDateTime,
  toNum, toastError, toastSuccess, downloadCSV,
  OVERTIME_TYPES,
  type EmployeeLite, type AttendanceOvertime,
} from "../shared"

// ============================================================
// Constants
// ============================================================

const OT_STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  SentToPayroll: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
}

// ============================================================
// Main section
// ============================================================

export function OvertimeSection() {
  // ---- filters ----
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [typeFilter, setTypeFilter] = React.useState("all")
  const [fromDate, setFromDate] = React.useState(format(startOfMonth, "yyyy-MM-dd"))
  const [toDate, setToDate] = React.useState(format(today, "yyyy-MM-dd"))

  // ---- fetch data ----
  const { data: items, loading, error, reload } = useAsync<AttendanceOvertime[]>(
    () => {
      const p = new URLSearchParams()
      if (statusFilter !== "all") p.set("status", statusFilter)
      if (typeFilter !== "all") p.set("overtimeType", typeFilter)
      if (fromDate) p.set("from", fromDate)
      if (toDate) p.set("to", toDate)
      return fetchJson(`/api/attendance-overtime?${p.toString()}`).catch(() => [])
    },
    [statusFilter, typeFilter, fromDate, toDate],
  )

  const { data: employees } = useAsync<EmployeeLite[]>(
    () => fetchJson("/api/employees?limit=500").catch(() => []),
    [],
  )

  // ---- dialogs ----
  const [addOpen, setAddOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<AttendanceOvertime | null>(null)
  const [commentItem, setCommentItem] = React.useState<{ item: AttendanceOvertime; action: "Approved" | "Rejected" } | null>(null)

  // ---- stats ----
  const stats = React.useMemo(() => {
    const list = items || []
    const totalHours = list.reduce((s, r) => s + toNum(r.overtimeHours), 0)
    const pending = list.filter((r) => r.status === "Pending").length
    const approved = list.filter((r) => r.status === "Approved").length
    const rejected = list.filter((r) => r.status === "Rejected").length
    return { totalHours, pending, approved, rejected, count: list.length }
  }, [items])

  // ---- columns ----
  const columns: Column<AttendanceOvertime>[] = [
    {
      key: "employee",
      header: "Employee",
      render: (r) => (
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-7 w-7 shrink-0 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <AvatarFallback className="rounded text-[9px] font-semibold">{empInitials(r.employee)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{empName(r.employee)}</p>
            <p className="text-[11px] text-muted-foreground">{r.employee?.department?.name || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (r) => <span className="text-xs">{fmtDate(r.date)}</span>,
    },
    {
      key: "shiftHours",
      header: "Shift Hrs",
      render: (r) => <span className="text-xs tabular-nums">{toNum(r.shiftHours).toFixed(1)}</span>,
    },
    {
      key: "actualHours",
      header: "Actual Hrs",
      render: (r) => <span className="text-xs tabular-nums">{toNum(r.actualHours).toFixed(1)}</span>,
    },
    {
      key: "otHours",
      header: "OT Hrs",
      render: (r) => <span className="text-xs tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
        +{toNum(r.overtimeHours).toFixed(1)}
      </span>,
    },
    {
      key: "overtimeType",
      header: "OT Type",
      render: (r) => <Badge variant="secondary" className="text-[10px] border-0 bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300">
        {r.overtimeType}
      </Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant="secondary" className={`text-[10px] border-0 ${OT_STATUS_COLORS[r.status] || ""}`}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: "payrollStatus",
      header: "Payroll",
      render: (r) => (
        <Badge variant="secondary" className={`text-[10px] border-0 ${
          r.payrollStatus === "SentToPayroll"
            ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400"
            : "bg-muted text-muted-foreground"
        }`}>
          {r.payrollStatus || "Not Sent"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex items-center gap-1">
          {r.status === "Pending" && (
            <>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700"
                onClick={() => setCommentItem({ item: r, action: "Approved" })}>
                <Check className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700"
                onClick={() => setCommentItem({ item: r, action: "Rejected" })}>
                <X className="h-3 w-3 mr-1" /> Reject
              </Button>
            </>
          )}
          {r.status === "Approved" && r.payrollStatus !== "SentToPayroll" && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-cyan-600 hover:text-cyan-700"
              onClick={() => sendToPayroll(r)}>
              <Send className="h-3 w-3 mr-1" /> To Payroll
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
            onClick={() => setEditItem(r)}>
            <Edit3 className="h-3 w-3 mr-1" /> Edit
          </Button>
        </div>
      ),
    },
  ]

  // ---- actions ----
  async function patchOt(item: AttendanceOvertime, body: Record<string, unknown>) {
    try {
      await fetchJson(`/api/attendance-overtime/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })
      toastSuccess(`Overtime ${body.status === "Approved" ? "approved" : body.status === "Rejected" ? "rejected" : "updated"}`)
      reload()
    } catch (e) {
      toastError(e, "Failed to update overtime")
    }
  }

  async function sendToPayroll(item: AttendanceOvertime) {
    try {
      await fetchJson(`/api/attendance-overtime/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "SentToPayroll", payrollStatus: "SentToPayroll" }),
      })
      toastSuccess("Overtime sent to payroll")
      reload()
    } catch (e) {
      toastError(e, "Failed to send to payroll")
    }
  }

  function exportCsv() {
    const rows = (items || []).map((r) => ({
      employee: empName(r.employee),
      date: fmtDate(r.date),
      shiftHours: toNum(r.shiftHours),
      actualHours: toNum(r.actualHours),
      overtimeHours: toNum(r.overtimeHours),
      overtimeType: r.overtimeType,
      status: r.status,
      payrollStatus: r.payrollStatus || "",
      remarks: r.remarks || "",
    }))
    downloadCSV(`overtime-${fromDate}-${toDate}.csv`, rows)
    toastSuccess("Exported CSV")
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Overtime Management</h2>
          <p className="text-sm text-muted-foreground">
            Track, approve, reject, and push overtime hours to payroll.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={exportCsv} disabled={!items || items.length === 0}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={() => reload()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Overtime
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total OT Hours" value={stats.totalHours.toFixed(1)} icon={Timer} accent="emerald" sub={`${stats.count} entries`} />
        <StatCard label="Pending Approvals" value={stats.pending} icon={Hourglass} accent="amber" />
        <StatCard label="Approved OT" value={stats.approved} icon={CheckCircle2} accent="cyan" />
        <StatCard label="Rejected OT" value={stats.rejected} icon={XCircle} accent="coral" />
      </div>

      {/* Filter bar */}
      <SectionCard title="Filters" description="Filter overtime entries by status, type, and date range">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="SentToPayroll">Sent to Payroll</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">OT Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {OVERTIME_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">From Date</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">To Date</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9" />
          </div>
        </div>
      </SectionCard>

      {/* Table */}
      <SectionCard title="Overtime Entries" description={`${(items || []).length} record(s)`}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 w-full rounded bg-muted/50 animate-pulse" />)}
          </div>
        ) : error ? (
          <EmptyState icon={Clock} title="Unable to load" description={error} />
        ) : (items || []).length === 0 ? (
          <EmptyState icon={Clock} title="No overtime entries" description="Adjust filters or add a new overtime entry." />
        ) : (
          <div className="max-h-[600px] overflow-y-auto [scrollbar-width:thin]">
            <DataTable columns={columns} rows={(items || []).map((it) => ({ ...it, id: it.id }))} />
          </div>
        )}
      </SectionCard>

      {/* OT policy card (static) */}
      <SectionCard title="Overtime Policy (Summary)" description="Reference summary — change in Settings">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PolicyRow label="Min Hours for OT" value="8 hrs" />
          <PolicyRow label="Daily OT Limit" value="4 hrs" />
          <PolicyRow label="Monthly OT Limit" value="50 hrs" />
          <PolicyRow label="Round-off" value="No rounding" />
          <PolicyRow label="Weekday Rate" value="1.0×" />
          <PolicyRow label="Weekend Rate" value="1.5×" />
          <PolicyRow label="Holiday Rate" value="2.0×" />
          <PolicyRow label="Approval Required" value="Yes" />
        </div>
      </SectionCard>

      {/* Add dialog */}
      {addOpen && (
        <AddOvertimeDialog
          employees={employees || []}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); reload() }}
        />
      )}

      {/* Edit dialog */}
      {editItem && (
        <EditOvertimeDialog
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); reload() }}
        />
      )}

      {/* Approve/Reject comment dialog */}
      {commentItem && (
        <ApproveRejectDialog
          item={commentItem.item}
          action={commentItem.action}
          onClose={() => setCommentItem(null)}
          onConfirm={(remarks) => {
            patchOt(commentItem.item, {
              status: commentItem.action,
              approvedBy: "HR Admin",
              remarks,
            })
            setCommentItem(null)
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

function PolicyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  )
}

// ============================================================
// Add Overtime dialog
// ============================================================

function AddOvertimeDialog({
  employees, onClose, onSaved,
}: {
  employees: EmployeeLite[]
  onClose: () => void
  onSaved: () => void
}) {
  const [empId, setEmpId] = React.useState("")
  const [date, setDate] = React.useState(format(new Date(), "yyyy-MM-dd"))
  const [shiftHours, setShiftHours] = React.useState("8")
  const [actualHours, setActualHours] = React.useState("10")
  const [otHours, setOtHours] = React.useState("2")
  const [otType, setOtType] = React.useState("Weekday")
  const [remarks, setRemarks] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  async function submit() {
    if (!empId) { toast.error("Please select an employee"); return }
    setSaving(true)
    try {
      await fetchJson("/api/attendance-overtime", {
        method: "POST",
        body: JSON.stringify({
          employeeId: empId,
          date,
          shiftHours: toNum(shiftHours),
          actualHours: toNum(actualHours),
          overtimeHours: toNum(otHours),
          overtimeType: otType,
          remarks,
        }),
      })
      toastSuccess("Overtime entry added")
      onSaved()
    } catch (e) {
      toastError(e, "Failed to add overtime")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Overtime Entry</DialogTitle>
          <DialogDescription>Manually add an overtime record for an employee.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Employee</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {empName(e)} {e.employeeCode ? `(${e.employeeCode})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">OT Type</Label>
              <Select value={otType} onValueChange={setOtType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OVERTIME_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Shift Hrs</Label>
              <Input type="number" step="0.5" value={shiftHours} onChange={(e) => setShiftHours(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Actual Hrs</Label>
              <Input type="number" step="0.5" value={actualHours} onChange={(e) => setActualHours(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">OT Hrs</Label>
              <Input type="number" step="0.5" value={otHours} onChange={(e) => setOtHours(e.target.value)} className="h-9" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Optional notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? "Saving…" : "Add Overtime"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Edit Overtime dialog
// ============================================================

function EditOvertimeDialog({
  item, onClose, onSaved,
}: {
  item: AttendanceOvertime
  onClose: () => void
  onSaved: () => void
}) {
  const [otHours, setOtHours] = React.useState(String(item.overtimeHours))
  const [remarks, setRemarks] = React.useState(item.remarks || "")
  const [saving, setSaving] = React.useState(false)

  async function submit() {
    setSaving(true)
    try {
      await fetchJson(`/api/attendance-overtime/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ overtimeHours: toNum(otHours), remarks }),
      })
      toastSuccess("Overtime updated")
      onSaved()
    } catch (e) {
      toastError(e, "Failed to update overtime")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Overtime — {empName(item.employee)}</DialogTitle>
          <DialogDescription>{fmtDate(item.date)} · Currently {toNum(item.overtimeHours).toFixed(1)} OT hrs</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">OT Hours</Label>
            <Input type="number" step="0.5" value={otHours} onChange={(e) => setOtHours(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Approve / Reject comment dialog
// ============================================================

function ApproveRejectDialog({
  item, action, onClose, onConfirm,
}: {
  item: AttendanceOvertime
  action: "Approved" | "Rejected"
  onClose: () => void
  onConfirm: (remarks: string) => void
}) {
  const [remarks, setRemarks] = React.useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === "Approved" ? "Approve" : "Reject"} Overtime — {empName(item.employee)}
          </DialogTitle>
          <DialogDescription>
            {fmtDate(item.date)} · {toNum(item.overtimeHours).toFixed(1)} OT hrs ({item.overtimeType})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Comment (optional)</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2}
              placeholder={action === "Approved" ? "Approved — looks good." : "Reason for rejection"} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onConfirm(remarks)}
            className={action === "Approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}>
            {action === "Approved" ? "Approve" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
