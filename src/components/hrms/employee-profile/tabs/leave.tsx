"use client"

// ============================================================
// LeaveTab — leave balances + applications + apply dialog.
// ------------------------------------------------------------
// APIs:
//   GET /api/leave-applications?employeeId=
//   POST /api/leave-applications
//   PATCH /api/leave-applications/<id>
//   GET /api/leave-types
// Balances are derived from leave types' yearlyAccrual +
// applications (no /api/leave-balances route exists yet).
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  CalendarPlus, Plane, HeartPulse, Award, Gift, RefreshCw, X,
  Ban, Eye, Loader2, CalendarDays, Clock, CheckCircle2, XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SectionCard, EmptyState, StatCard } from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { leaveApplicationFormSchema } from "@/lib/form-schemas"
import type { FormValues } from "@/lib/types"
import { cn } from "@/lib/utils"

// ---------- types ----------

interface LeaveTypeRec {
  id: string
  code: string
  name: string
  color?: string
  yearlyAccrual?: number
  monthlyAccrual?: number
  openingBalance?: number
  carryForward?: boolean
  status: string
}

interface LeaveAppRec {
  id: string
  employeeId: string
  leaveTypeId: string
  leaveType?: { id: string; name: string; code: string; color?: string } | null
  fromDate: string | Date
  toDate: string | Date
  days: number
  halfDay?: boolean
  reason?: string | null
  status: string
  appliedAt: string | Date
  decisionAt?: string | Date | null
  decisionBy?: string | null
  decisionComment?: string | null
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Cancelled: "bg-muted text-muted-foreground",
  Withdrawn: "bg-muted text-muted-foreground",
}

const STATUS_FILTERS = ["All", "Pending", "Approved", "Rejected", "Cancelled", "Withdrawn"] as const

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

// Map common leave type codes to icons & defaults
const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  CL: Plane,
  SL: HeartPulse,
  EL: Award,
  CO: Gift,
  COMP: Gift,
}
function pickIcon(code: string) {
  const k = code.toUpperCase()
  for (const key of Object.keys(TYPE_ICON)) {
    if (k.includes(key)) return TYPE_ICON[key]
  }
  return CalendarDays
}

// ============================================================
// Component
// ============================================================

export default function LeaveTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<LeaveAppRec[]>([])
  const [leaveTypes, setLeaveTypes] = React.useState<LeaveTypeRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState<string>("All")
  const [search, setSearch] = React.useState("")
  const [applyOpen, setApplyOpen] = React.useState(false)
  const [view, setView] = React.useState<LeaveAppRec | null>(null)
  const [withdrawTarget, setWithdrawTarget] = React.useState<LeaveAppRec | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [appsRes, typesRes] = await Promise.all([
        fetch(`/api/leave-applications?employeeId=${encodeURIComponent(employeeId)}`),
        fetch(`/api/leave-types`),
      ])
      const appsData = await appsRes.json()
      const typesData = await typesRes.json()
      if (!appsRes.ok) throw new Error(appsData?.error || "Failed to load applications")
      if (!typesRes.ok) throw new Error(typesData?.error || "Failed to load leave types")
      setItems(appsData?.items || [])
      setLeaveTypes((typesData?.items || []).filter((t: LeaveTypeRec) => t.status === "Active"))
    } catch (e: any) {
      toast.error(e.message || "Failed to load leave data")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  // Derive balances per leave type
  const balances = React.useMemo(() => {
    return leaveTypes.map((lt) => {
      const total = (lt.yearlyAccrual || 0) + (lt.openingBalance || 0)
      const apps = items.filter((a) => a.leaveTypeId === lt.id)
      const used = apps
        .filter((a) => a.status === "Approved")
        .reduce((s, a) => s + (a.days || 0), 0)
      const pending = apps
        .filter((a) => a.status === "Pending")
        .reduce((s, a) => s + (a.days || 0), 0)
      const available = Math.max(0, total - used - pending)
      return { leaveType: lt, total, used, pending, available }
    })
  }, [leaveTypes, items])

  const counts = React.useMemo(() => ({
    pending: items.filter((i) => i.status === "Pending").length,
    approved: items.filter((i) => i.status === "Approved").length,
    rejected: items.filter((i) => i.status === "Rejected").length,
    totalDays: items.filter((i) => i.status === "Approved").reduce((s, i) => s + (i.days || 0), 0),
  }), [items])

  const filtered = items.filter((r) => {
    if (statusFilter !== "All" && r.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const ltName = r.leaveType?.name || ""
      return ltName.toLowerCase().includes(q) || (r.reason || "").toLowerCase().includes(q)
    }
    return true
  })

  async function patchStatus(rec: LeaveAppRec, status: string, msg: string) {
    try {
      const res = await fetch(`/api/leave-applications/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to update")
      toast.success(msg)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to update")
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-5"
    >
      {/* Heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Leave</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Leave balances and applications. Apply for leave, track approvals, and withdraw pending requests.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setApplyOpen(true)}>
            <CalendarPlus className="h-4 w-4" /> Apply Leave
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pending" value={counts.pending} icon={Clock} accent="amber" />
        <StatCard label="Approved" value={counts.approved} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Rejected" value={counts.rejected} icon={XCircle} accent="coral" />
        <StatCard label="Days Taken" value={counts.totalDays} icon={CalendarDays} accent="cyan" />
      </div>

      {/* Leave Balance cards */}
      <SectionCard title="Leave Balances" description="Available / Used / Total per leave type for the current year">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : balances.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No leave types configured"
            description="Active leave types will appear here once configured by HR."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {balances.map(({ leaveType: lt, total, used, pending, available }) => {
              const Icon = pickIcon(lt.code)
              const pct = total > 0 ? Math.round((used / total) * 100) : 0
              return (
                <div key={lt.id} className="rounded-xl border border-border/60 bg-card p-4 shadow-soft">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{lt.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{lt.code}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-semibold tabular-nums">{available}</span>
                      <span className="text-xs text-muted-foreground">of {total} days</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>Used: <span className="font-medium text-foreground tabular-nums">{used}</span></span>
                      <span>Pending: <span className="font-medium text-amber-600 dark:text-amber-400 tabular-nums">{pending}</span></span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search leave type or reason..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 sm:max-w-xs"
        />
        {(statusFilter !== "All" || search) && (
          <Button variant="ghost" size="sm" className="h-9 gap-1.5"
            onClick={() => { setStatusFilter("All"); setSearch("") }}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Applications table */}
      <SectionCard title="Leave Applications" description={`${filtered.length} of ${items.length} applications`}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No leave applications"
            description="Apply for leave and it will appear here."
            action={<Button size="sm" onClick={() => setApplyOpen(true)}><CalendarPlus className="h-4 w-4 mr-1.5" /> Apply Leave</Button>}
          />
        ) : (
          <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
            <ScrollArea className="max-h-[560px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Leave Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">From – To</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Days</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Applied</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Decided By</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setView(r)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: r.leaveType?.color || "#10b981" }} />
                          <span>{r.leaveType?.name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums whitespace-nowrap">
                        {fmtDate(r.fromDate)} – {fmtDate(r.toDate)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {r.halfDay ? "0.5" : r.days}
                        {r.halfDay && <span className="text-[10px] text-muted-foreground ml-1">HD</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[240px] truncate" title={r.reason || ""}>
                        {r.reason || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[r.status] || "bg-muted text-muted-foreground")}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.appliedAt)}</TableCell>
                      <TableCell className="text-muted-foreground">{r.decisionBy || "—"}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setView(r)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {r.status === "Pending" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-foreground"
                              onClick={() => setWithdrawTarget(r)}>
                              <Ban className="h-3.5 w-3.5" /> Withdraw
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </SectionCard>

      {/* Apply Leave dialog (DynamicForm) */}
      <ApplyLeaveDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        employeeId={employeeId}
        onCreated={load}
      />

      {/* View dialog */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: view?.leaveType?.color || "#10b981" }} />
              {view?.leaveType?.name || "Leave Application"}
              {view && (
                <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[view.status] || "bg-muted text-muted-foreground")}>
                  {view.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Applied {fmtDate(view?.appliedAt)}
            </DialogDescription>
          </DialogHeader>
          {view && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="font-medium">{fmtDate(view.fromDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">To</p>
                  <p className="font-medium">{fmtDate(view.toDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Days</p>
                  <p className="font-medium tabular-nums">{view.halfDay ? "0.5 (Half Day)" : view.days}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Decided by</p>
                  <p className="font-medium">{view.decisionBy || "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Reason</p>
                <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{view.reason || "—"}</p>
              </div>
              {view.decisionComment && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Decision Comment</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{view.decisionComment}</p>
                </div>
              )}
              <DialogFooter className="gap-2">
                {view.status === "Pending" && (
                  <Button variant="outline" className="gap-1.5"
                    onClick={() => { patchStatus(view, "Withdrawn", "Application withdrawn"); setView(null) }}>
                    <Ban className="h-4 w-4" /> Withdraw
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Withdraw confirm */}
      <Dialog open={!!withdrawTarget} onOpenChange={(o) => !o && setWithdrawTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw application?</DialogTitle>
            <DialogDescription>
              {withdrawTarget?.leaveType?.name} · {fmtDate(withdrawTarget?.fromDate)} – {fmtDate(withdrawTarget?.toDate)}
              <br />
              Once withdrawn, this application cannot be re-submitted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWithdrawTarget(null)}>Cancel</Button>
            <Button
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                if (withdrawTarget) patchStatus(withdrawTarget, "Withdrawn", "Application withdrawn")
                setWithdrawTarget(null)
              }}
            >
              <Ban className="h-4 w-4" /> Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ============================================================
// Apply Leave Dialog (DynamicForm)
// ============================================================

function ApplyLeaveDialog({
  open, onOpenChange, employeeId, onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  onCreated: () => void
}) {
  const [submitting, setSubmitting] = React.useState(false)

  async function handleSubmit(v: FormValues) {
    if (!v.leaveTypeId) { toast.error("Leave type is required"); return }
    if (!v.fromDate || !v.toDate) { toast.error("From and To dates are required"); return }
    const from = new Date(v.fromDate as string)
    const to = new Date(v.toDate as string)
    if (to < from) { toast.error("To Date cannot be before From Date"); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/leave-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          leaveTypeId: v.leaveTypeId,
          fromDate: from.toISOString(),
          toDate: to.toISOString(),
          halfDay: !!v.halfDay,
          reason: v.reason || undefined,
          attachmentUrl: v.attachmentUrl || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to apply leave")
      toast.success("Leave application submitted")
      onOpenChange(false)
      onCreated()
    } catch (e: any) {
      toast.error(e.message || "Failed to apply leave")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply Leave</DialogTitle>
          <DialogDescription>
            Submit a new leave application. The application will be created in <span className="font-medium">Pending</span> status.
          </DialogDescription>
        </DialogHeader>
        <DynamicForm
          schema={leaveApplicationFormSchema}
          initialValues={{ employeeId, halfDay: false }}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          loading={submitting}
          submitLabel="Submit Application"
        />
      </DialogContent>
    </Dialog>
  )
}
