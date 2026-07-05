'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Plus, Eye, Undo2, CalendarCheck, AlertTriangle } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { leaveApplicationFormSchema } from "@/lib/form-schemas"
import { Column, DataTable, EmptyState, SectionCard, StatusBadge } from "@/components/hrms/ui"
import {
  fetchJson, sendJson, useAsync, empName, empInitials, fmtDate, fmtDateTime,
  LeaveApplication, LeaveApplication as LA, LeaveTypeLite, EmployeeLite, LEAVE_STATUS_COLORS,
} from "../shared"

// ============================================================
// Hooks
// ============================================================

function useEmployees() {
  return useAsync<{ label: string; value: string }[]>(
    () => fetchJson("/api/employees/picker?limit=500"),
    [],
  )
}

function useLeaveTypes() {
  return useAsync<LeaveTypeLite[]>(() => fetchJson("/api/leave-types"), [])
}

function useMyApplications(employeeId: string | null) {
  return useAsync<LeaveApplication[]>(
    () => employeeId ? fetchJson(`/api/leave-applications?employeeId=${employeeId}`) : Promise.resolve([]),
    [employeeId],
  )
}

function useMyBalance(employeeId: string | null) {
  return useAsync<any[]>(
    async () => {
      if (!employeeId) return []
      try { return await fetchJson(`/api/leave-balance?employeeId=${employeeId}`) } catch { return [] }
    },
    [employeeId],
  )
}

// ============================================================
// Main
// ============================================================

export function MyLeaveSection({ onApplyLeave }: { onApplyLeave?: () => void }) {
  const { data: employees, loading: empLoading } = useEmployees()
  const { data: leaveTypes } = useLeaveTypes()

  const [meId, setMeId] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!meId && employees && employees.length) setMeId(employees[0].value)
  }, [employees, meId])

  const { data: apps, loading: appsLoading, reload: reloadApps } = useMyApplications(meId)
  const { data: balances, reload: reloadBalances } = useMyBalance(meId)

  const [applyOpen, setApplyOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [viewApp, setViewApp] = React.useState<LA | null>(null)
  const [withdrawApp, setWithdrawApp] = React.useState<LA | null>(null)

  // Listen for external "open apply dialog" events (e.g. from header button)
  React.useEffect(() => {
    const handler = () => setApplyOpen(true)
    window.addEventListener("leave:open-apply-dialog", handler)
    return () => window.removeEventListener("leave:open-apply-dialog", handler)
  }, [])

  async function handleApply(v: any) {
    setSubmitting(true)
    try {
      await sendJson("/api/leave-applications", { ...v, employeeId: meId })
      toast.success("Leave application submitted")
      setApplyOpen(false)
      reloadApps(); reloadBalances()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to apply leave")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleWithdraw() {
    if (!withdrawApp) return
    setSubmitting(true)
    try {
      await sendJson(`/api/leave-applications/${withdrawApp.id}`, {
        status: "Withdrawn", action: "Withdraw", decisionComment: "Withdrawn by employee",
      }, "PATCH")
      toast.success("Leave withdrawn")
      setWithdrawApp(null)
      reloadApps(); reloadBalances()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to withdraw")
    } finally {
      setSubmitting(false)
    }
  }

  const me = employees?.find((e) => e.value === meId)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">My Leave</h2>
          <p className="text-sm text-muted-foreground">View balances, apply for leave and track your requests.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={meId || ""} onValueChange={setMeId} disabled={empLoading}>
            <SelectTrigger className="w-[220px] h-9">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {(employees || []).map((e) => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1.5" onClick={() => setApplyOpen(true)}>
            <Plus className="h-4 w-4" /> Apply Leave
          </Button>
        </div>
      </div>

      {/* Balance cards */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">My Leave Balances</h3>
        {empLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (!balances || balances.length === 0) ? (
          <Card className="border-dashed"><CardContent className="py-6 text-center text-sm text-muted-foreground">
            No balance records found. Leave balances appear once your applicable leave policy is processed.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {balances.map((b: any, i: number) => {
              const lt = b.leaveType || leaveTypes?.find((t) => t.id === b.leaveTypeId)
              const available = b.available ?? (b.opening + b.accrued + b.carryForward + b.granted + b.adjusted - b.used - b.pending - b.encashed - b.lapsed - b.expired)
              const total = (b.opening || 0) + (b.accrued || 0) + (b.carryForward || 0) + (b.granted || 0)
              return (
                <motion.div key={b.id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="border-border/60 shadow-soft hover:shadow-card transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: lt?.color || "#10b981" }} />
                          <span className="text-sm font-medium truncate">{lt?.name || b.leaveType?.name || "—"}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{b.year}</span>
                      </div>
                      <p className="text-2xl font-semibold tabular-nums">{Number(available).toFixed(1)}</p>
                      <p className="text-[11px] text-muted-foreground">Available of {Number(total).toFixed(1)}</p>
                      <Separator className="my-2" />
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        <span className="text-muted-foreground">Used: <b className="text-foreground">{Number(b.used || 0).toFixed(1)}</b></span>
                        <span className="text-muted-foreground">Pending: <b className="text-foreground">{Number(b.pending || 0).toFixed(1)}</b></span>
                        <span className="text-muted-foreground">Accrued: <b className="text-foreground">{Number(b.accrued || 0).toFixed(1)}</b></span>
                        <span className="text-muted-foreground">CF: <b className="text-foreground">{Number(b.carryForward || 0).toFixed(1)}</b></span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* My applications */}
      <SectionCard title="My Leave Requests" description="Your recent applications and their status">
        <ApplicationsTable
          rows={apps || []}
          loading={appsLoading}
          onView={setViewApp}
          onWithdraw={(a) => setWithdrawApp(a)}
        />
      </SectionCard>

      {/* Apply dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-emerald-500" /> Apply for Leave</DialogTitle>
            <DialogDescription>
              Submit a new leave application{me ? ` as ${me.label}` : ""}. Your manager will be notified.
            </DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={leaveApplicationFormSchema}
            initialValues={{ employeeId: meId || "" }}
            onSubmit={handleApply}
            onCancel={() => setApplyOpen(false)}
            submitLabel="Submit Application"
            loading={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Sheet open={!!viewApp} onOpenChange={(o) => !o && setViewApp(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Leave Application Details</SheetTitle>
            <SheetDescription>Submitted on {fmtDateTime(viewApp?.appliedAt)}</SheetDescription>
          </SheetHeader>
          {viewApp && <ApplicationDetails app={viewApp} />}
          {viewApp?.status === "Pending" && (
            <div className="p-4 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-rose-600 hover:text-rose-700"
                onClick={() => { setWithdrawApp(viewApp); setViewApp(null) }}
              >
                <Undo2 className="h-4 w-4" /> Withdraw Application
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Withdraw confirm */}
      <Dialog open={!!withdrawApp} onOpenChange={(o) => !o && setWithdrawApp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Withdraw Application?</DialogTitle>
            <DialogDescription>
              This will cancel your leave request for{" "}
              <b>{withdrawApp?.leaveType?.name}</b> ({fmtDate(withdrawApp?.fromDate)} → {fmtDate(withdrawApp?.toDate)}).
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setWithdrawApp(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleWithdraw} disabled={submitting}>
              {submitting ? "Withdrawing…" : "Withdraw"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Applications table (used here, reused in Team Leave)
// ============================================================

export function ApplicationsTable({
  rows, loading, onView, onWithdraw, onApprove, onReject, emptyMessage,
}: {
  rows: LA[]
  loading: boolean
  onView?: (a: LA) => void
  onWithdraw?: (a: LA) => void
  onApprove?: (a: LA) => void
  onReject?: (a: LA) => void
  emptyMessage?: string
}) {
  const columns: Column<LA>[] = [
    {
      key: "leaveType", header: "Leave Type",
      render: (a) => (
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: a.leaveType?.color || "#10b981" }} />
          <div>
            <p className="font-medium">{a.leaveType?.name || "—"}</p>
            <p className="text-xs text-muted-foreground">{a.leaveType?.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: "dates", header: "Dates",
      render: (a) => (
        <div>
          <p className="font-medium">{fmtDate(a.fromDate)}</p>
          <p className="text-xs text-muted-foreground">to {fmtDate(a.toDate)}</p>
        </div>
      ),
    },
    { key: "days", header: "Days", render: (a) => <span className="tabular-nums">{a.days}{a.halfDay ? " (½)" : ""}</span> },
    { key: "reason", header: "Reason", render: (a) => <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{a.reason || "—"}</span> },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
    {
      key: "actions", header: "", width: "120px",
      render: (a) => (
        <div className="flex items-center gap-1 justify-end">
          {onView && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onView(a)} title="View">
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {onWithdraw && a.status === "Pending" && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500" onClick={() => onWithdraw(a)} title="Withdraw">
              <Undo2 className="h-4 w-4" />
            </Button>
          )}
          {onApprove && a.status === "Pending" && (
            <Button size="sm" variant="ghost" className="h-8 px-2 text-emerald-600" onClick={() => onApprove(a)} title="Approve">
              Approve
            </Button>
          )}
          {onReject && a.status === "Pending" && (
            <Button size="sm" variant="ghost" className="h-8 px-2 text-rose-600" onClick={() => onReject(a)} title="Reject">
              Reject
            </Button>
          )}
        </div>
      ),
    },
  ]
  return (
    <DataTable
      columns={columns}
      rows={rows}
      loading={loading}
      emptyState={<EmptyState icon={CalendarCheck} title={emptyMessage || "No leave applications"} description="Apply for leave to get started." />}
    />
  )
}

// ============================================================
// Application details (used in view dialog/sheet)
// ============================================================

export function ApplicationDetails({ app }: { app: LA }) {
  const approvals = app.approvals || []
  const daysLog = app.days_log || []
  return (
    <div className="p-4 space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <Detail label="Employee" value={empName(app.employee)} />
        <Detail label="Leave Type" value={app.leaveType?.name || "—"} />
        <Detail label="From" value={fmtDate(app.fromDate)} />
        <Detail label="To" value={fmtDate(app.toDate)} />
        <Detail label="Days" value={`${app.days}${app.halfDay ? " (Half day)" : ""}`} />
        <Detail label="Status" value={<StatusBadge status={app.status} />} />
        <Detail label="Applied At" value={fmtDateTime(app.appliedAt)} />
        <Detail label="Decision At" value={fmtDateTime(app.decisionAt)} />
      </div>
      {app.reason && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Reason</p>
          <p className="text-foreground whitespace-pre-wrap">{app.reason}</p>
        </div>
      )}
      {app.decisionComment && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Decision Comment</p>
          <p className="text-foreground whitespace-pre-wrap">{app.decisionComment}</p>
        </div>
      )}

      {approvals.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Approval Chain</p>
          <div className="space-y-2">
            {approvals.map((ap) => {
              const color =
                ap.action === "Approve" ? "text-emerald-600" :
                ap.action === "Reject" ? "text-rose-600" :
                ap.action === "Pending" ? "text-amber-600" : "text-muted-foreground"
              return (
                <div key={ap.id} className="flex items-start gap-2 rounded-lg border border-border/60 p-2.5">
                  <div className={`mt-1 h-2 w-2 rounded-full ${ap.action === "Approve" ? "bg-emerald-500" : ap.action === "Reject" ? "bg-rose-500" : "bg-amber-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">Step {ap.stepOrder} · {ap.approverType}</p>
                      <span className={`text-xs font-medium ${color}`}>{ap.action}</span>
                    </div>
                    {ap.approverName && <p className="text-xs text-muted-foreground">{ap.approverName}</p>}
                    {ap.comment && <p className="text-xs text-muted-foreground mt-1 italic">“{ap.comment}”</p>}
                    {ap.actedAt && <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDateTime(ap.actedAt)}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {daysLog.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Days Breakdown</p>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <div className="max-h-48 overflow-y-auto [scrollbar-width:thin]">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-semibold text-muted-foreground">Date</th>
                    <th className="text-left p-2 font-semibold text-muted-foreground">Type</th>
                    <th className="text-left p-2 font-semibold text-muted-foreground">Flags</th>
                    <th className="text-right p-2 font-semibold text-muted-foreground">Counted</th>
                  </tr>
                </thead>
                <tbody>
                  {daysLog.map((dl) => (
                    <tr key={dl.id} className="border-t border-border/40">
                      <td className="p-2">{fmtDate(dl.date)}</td>
                      <td className="p-2">{dl.dayType}</td>
                      <td className="p-2 text-muted-foreground">
                        {dl.isHoliday && <span className="mr-1 text-rose-500">Holiday</span>}
                        {dl.isWeeklyOff && <span className="mr-1 text-cyan-500">WkOff</span>}
                        {!dl.isHoliday && !dl.isWeeklyOff && "—"}
                      </td>
                      <td className="p-2 text-right">{dl.counted ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}
