"use client"

// ============================================================
// ProbationTab — probation review + confirmation.
// API: /api/employees/[id]/probation (GET list, POST create,
// PATCH by recordId).
// Also PATCHes /api/employees/[id] to sync probationStatus.
// ------------------------------------------------------------

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format, differenceInDays } from "date-fns"
import {
  ClipboardCheck, Plus, CheckCircle2, CalendarClock, AlertTriangle,
  XCircle, History, Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { EmptyState, SectionCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- types ----------

interface ProbationRec {
  id: string
  startDate: string | Date
  endDate: string | Date
  reviewDueDate?: string | Date | null
  status: string
  managerFeedback?: string | null
  hrFeedback?: string | null
  extendedEndDate?: string | Date | null
  confirmedDate?: string | Date | null
  confirmedBy?: string | null
  createdAt: string | Date
}

// ---------- helpers ----------

const STATUS_OPTIONS = [
  "On Probation", "Review pending", "Extended", "Confirmed", "Not Confirmed",
] as const

const STATUS_COLORS: Record<string, string> = {
  "On Probation": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Review pending": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Extended: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Not Confirmed": "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

function isOverdue(d?: string | Date | null) {
  if (!d) return false
  try { return differenceInDays(new Date(d), new Date()) < 0 } catch { return false }
}

// ============================================================
// Component
// ============================================================

export default function ProbationTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<ProbationRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addOpen, setAddOpen] = React.useState(false)
  const [confirmTarget, setConfirmTarget] = React.useState<ProbationRec | null>(null)
  const [extendTarget, setExtendTarget] = React.useState<ProbationRec | null>(null)
  const [rejectTarget, setRejectTarget] = React.useState<ProbationRec | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/probation`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load probation records")
      setItems(data?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load probation records")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  // "current" probation = first active record (On Probation / Review pending / Extended)
  const current = items.find((r) =>
    ["On Probation", "Review pending", "Extended"].includes(r.status)
  )
  const history = items.filter((r) => r.id !== current?.id)

  async function patchProbation(rec: ProbationRec, payload: any, successMsg: string) {
    try {
      const res = await fetch(`/api/employees/${employeeId}/probation/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to update")
      toast.success(successMsg)
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
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Probation</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Probation review and confirmation. Track start/end dates, manager and HR feedback, extensions, and final confirmation.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Add Probation Record
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border/60">
          <EmptyState
            icon={ClipboardCheck}
            title={employee?.probationStatus === "Confirmed" ? "Employee already confirmed" : "No probation record"}
            description={
              employee?.probationStatus === "Confirmed"
                ? "This employee has already been confirmed. No active probation record."
                : "This employee is not on probation. Add a probation record to begin tracking review."
            }
            action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Probation Record</Button>}
          />
        </div>
      ) : (
        <>
          {/* Current probation */}
          {current && (
            <SectionCard
              title="Current Probation"
              description={`Started ${fmtDate(current.startDate)}`}
              action={
                <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[current.status] || "bg-muted text-muted-foreground")}>
                  {current.status}
                </Badge>
              }
            >
              <div className="space-y-4">
                {/* Dates row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Start date</p>
                    <p className="text-sm font-medium">{fmtDate(current.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">End date</p>
                    <p className="text-sm font-medium">{fmtDate(current.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Review due</p>
                    <p className={cn(
                      "text-sm font-medium flex items-center gap-1.5",
                      isOverdue(current.reviewDueDate) && "text-rose-600 dark:text-rose-400"
                    )}>
                      {isOverdue(current.reviewDueDate) && <AlertTriangle className="h-3.5 w-3.5" />}
                      {fmtDate(current.reviewDueDate)}
                    </p>
                  </div>
                  {current.extendedEndDate && (
                    <div>
                      <p className="text-xs text-muted-foreground">Extended to</p>
                      <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">{fmtDate(current.extendedEndDate)}</p>
                    </div>
                  )}
                </div>

                {/* Overdue warning */}
                {isOverdue(current.reviewDueDate) && (
                  <div className="rounded-lg border border-rose-200/70 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/10 p-3 flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <p className="text-rose-700 dark:text-rose-300">
                      Review is overdue. Please complete the confirmation process.
                    </p>
                  </div>
                )}

                {/* Feedback */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Manager feedback</p>
                    <p className="text-sm whitespace-pre-wrap">{current.managerFeedback || "—"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground mb-1">HR feedback</p>
                    <p className="text-sm whitespace-pre-wrap">{current.hrFeedback || "—"}</p>
                  </div>
                </div>

                {/* Confirmation info if applicable */}
                {current.status === "Confirmed" && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Confirmed date</p>
                      <p className="font-medium text-emerald-600 dark:text-emerald-400">{fmtDate(current.confirmedDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Confirmed by</p>
                      <p className="font-medium">{current.confirmedBy || "—"}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {(current.status === "On Probation" || current.status === "Review pending") && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                    <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setConfirmTarget(current)}>
                      <CheckCircle2 className="h-4 w-4" /> Confirm Employee
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5"
                      onClick={() => setExtendTarget(current)}>
                      <CalendarClock className="h-4 w-4" /> Extend Probation
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-rose-600 hover:bg-rose-500/10"
                      onClick={() => setRejectTarget(current)}>
                      <XCircle className="h-4 w-4" /> Reject Confirmation
                    </Button>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Probation History */}
          {history.length > 0 && (
            <SectionCard
              title="Probation History"
              description={`${history.length} previous record${history.length === 1 ? "" : "s"}`}
            >
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="rounded-lg border border-border/60 p-3 flex items-start gap-3">
                    <History className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">
                          {fmtDate(h.startDate)} → {fmtDate(h.endDate)}
                        </p>
                        <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[h.status] || "bg-muted text-muted-foreground")}>
                          {h.status}
                        </Badge>
                      </div>
                      {h.managerFeedback && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />Manager: {h.managerFeedback}
                        </p>
                      )}
                      {h.confirmedDate && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Confirmed on {fmtDate(h.confirmedDate)} by {h.confirmedBy || "—"}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}

      {/* Add record dialog */}
      <AddProbationDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        employeeId={employeeId}
        onCreated={load}
      />

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(o) => !o && setConfirmTarget(null)}
        loading={false}
        onSubmit={(managerFeedback, hrFeedback) => {
          if (confirmTarget) {
            patchProbation(confirmTarget, {
              status: "Confirmed",
              managerFeedback,
              hrFeedback,
              confirmedBy: "HR Admin",
            }, "Employee confirmed")
          }
          setConfirmTarget(null)
        }}
      />

      {/* Extend dialog */}
      <ExtendDialog
        open={!!extendTarget}
        onOpenChange={(o) => !o && setExtendTarget(null)}
        loading={false}
        onSubmit={(extendedEndDate, reason) => {
          if (extendTarget) {
            const payload: any = { status: "Extended", extendedEndDate }
            if (reason) payload.hrFeedback = reason
            patchProbation(extendTarget, payload, "Probation extended")
          }
          setExtendTarget(null)
        }}
      />

      {/* Reject dialog */}
      <RejectDialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
        loading={false}
        onSubmit={(reason) => {
          if (rejectTarget) {
            patchProbation(rejectTarget, {
              status: "Not Confirmed",
              hrFeedback: reason,
            }, "Confirmation rejected")
          }
          setRejectTarget(null)
        }}
      />
    </motion.div>
  )
}

// ============================================================
// Add Probation Record Dialog
// ============================================================

function AddProbationDialog({
  open, onOpenChange, employeeId, onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  onCreated: () => void
}) {
  const [form, setForm] = React.useState({
    startDate: "",
    endDate: "",
    reviewDueDate: "",
    status: "On Probation",
    managerFeedback: "",
    hrFeedback: "",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setForm({
        startDate: "", endDate: "", reviewDueDate: "",
        status: "On Probation", managerFeedback: "", hrFeedback: "",
      })
    }
  }, [open])

  async function handleSubmit() {
    if (!form.startDate || !form.endDate) {
      toast.error("Start and end dates are required")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/probation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          reviewDueDate: form.reviewDueDate ? new Date(form.reviewDueDate).toISOString() : undefined,
          status: form.status,
          managerFeedback: form.managerFeedback || undefined,
          hrFeedback: form.hrFeedback || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to create record")
      toast.success("Probation record created")
      onOpenChange(false)
      onCreated()
    } catch (e: any) {
      toast.error(e.message || "Failed to create record")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Probation Record
          </DialogTitle>
          <DialogDescription>
            Log a new probation period for this employee.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Start date <span className="text-rose-500">*</span></Label>
              <Input type="date" value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>End date <span className="text-rose-500">*</span></Label>
              <Input type="date" value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Review due</Label>
              <Input type="date" value={form.reviewDueDate}
                onChange={(e) => setForm({ ...form, reviewDueDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Manager feedback</Label>
            <Textarea value={form.managerFeedback}
              onChange={(e) => setForm({ ...form, managerFeedback: e.target.value })}
              placeholder="Manager's review notes..." rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>HR feedback</Label>
            <Textarea value={form.hrFeedback}
              onChange={(e) => setForm({ ...form, hrFeedback: e.target.value })}
              placeholder="HR's review notes..." rows={3} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            <Plus className="h-4 w-4" /> Create Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Confirm / Extend / Reject Dialogs
// ============================================================

function ConfirmDialog({
  open, onOpenChange, onSubmit, loading,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSubmit: (managerFeedback: string, hrFeedback: string) => void
  loading: boolean
}) {
  const [managerFeedback, setManagerFeedback] = React.useState("")
  const [hrFeedback, setHrFeedback] = React.useState("")

  React.useEffect(() => {
    if (open) { setManagerFeedback(""); setHrFeedback("") }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Confirm Employee
          </DialogTitle>
          <DialogDescription>
            This will mark the employee as confirmed and update their probation status.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Manager feedback</Label>
            <Textarea value={managerFeedback} onChange={(e) => setManagerFeedback(e.target.value)}
              placeholder="Manager's confirmation note..." rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>HR feedback</Label>
            <Textarea value={hrFeedback} onChange={(e) => setHrFeedback(e.target.value)}
              placeholder="HR's confirmation note..." rows={3} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={() => onSubmit(managerFeedback, hrFeedback)} disabled={loading}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ExtendDialog({
  open, onOpenChange, onSubmit, loading,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSubmit: (extendedEndDate: string, reason: string) => void
  loading: boolean
}) {
  const [extendedEndDate, setExtendedEndDate] = React.useState("")
  const [reason, setReason] = React.useState("")

  React.useEffect(() => {
    if (open) { setExtendedEndDate(""); setReason("") }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
            <CalendarClock className="h-4 w-4" /> Extend Probation
          </DialogTitle>
          <DialogDescription>
            Extend the probation period to a new end date.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>New end date <span className="text-rose-500">*</span></Label>
            <Input type="date" value={extendedEndDate}
              onChange={(e) => setExtendedEndDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for extension..." rows={3} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={() => {
            if (!extendedEndDate) { toast.error("New end date is required"); return }
            onSubmit(extendedEndDate, reason)
          }} disabled={loading} className="gap-1.5">
            <CalendarClock className="h-4 w-4" /> Extend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RejectDialog({
  open, onOpenChange, onSubmit, loading,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSubmit: (reason: string) => void
  loading: boolean
}) {
  const [reason, setReason] = React.useState("")

  React.useEffect(() => { if (open) setReason("") }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <XCircle className="h-4 w-4" /> Reject Confirmation
          </DialogTitle>
          <DialogDescription>
            Mark the employee as not confirmed. This will update their probation status.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Reason <span className="text-rose-500">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for rejection..." rows={4} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={() => {
            if (!reason.trim()) { toast.error("Reason is required"); return }
            onSubmit(reason)
          }} disabled={loading}
            className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
            <XCircle className="h-4 w-4" /> Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
