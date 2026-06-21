"use client"

// ============================================================
// CompensationTab — timeline of salary revisions + add/edit/delete.
// ------------------------------------------------------------
// API: /api/employees/[id]/compensation
//   GET list, POST create, PATCH/DELETE /<recordId>
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  TrendingUp, Plus, Pencil, Trash2, RefreshCw, ArrowRight, Loader2,
  Calendar, CheckCircle2, XCircle, Eye, History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SectionCard, EmptyState, StatCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- types ----------

interface CompRec {
  id: string
  effectiveDate: string | Date
  oldCtc?: number | null
  newCtc?: number | null
  oldBasic?: number | null
  newBasic?: number | null
  oldHra?: number | null
  newHra?: number | null
  incrementPercent?: number | null
  revisionReason?: string | null
  promotionMapping?: string | null
  approvedBy?: string | null
  status: string
  letterUrl?: string | null
  createdAt: string | Date
}

const REASON_OPTIONS = ["Annual appraisal", "Promotion", "Off-cycle", "Joining", "Correction"]
const STATUS_OPTIONS = ["Draft", "Approved", "Rejected"]

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}
function inr(v?: number | null) {
  if (v === null || v === undefined) return "—"
  return "₹" + Math.round(v).toLocaleString("en-IN")
}
function inrShort(v?: number | null) {
  if (v === null || v === undefined) return "—"
  const n = Number(v)
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + " Cr"
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + " L"
  if (n >= 1000) return "₹" + (n / 1000).toFixed(1) + "K"
  return "₹" + Math.round(n).toLocaleString("en-IN")
}

// ============================================================
// Component
// ============================================================

export default function CompensationTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<CompRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<CompRec | null>(null)
  const [viewTarget, setViewTarget] = React.useState<CompRec | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<CompRec | null>(null)

  const currentCtc = employee?.ctc ? Number(employee.ctc) : 0

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/compensation`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load compensation history")
      setItems(data?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load compensation history")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  // Sorted ascending by effectiveDate for timeline
  const sorted = React.useMemo(() => {
    return [...items].sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime())
  }, [items])

  const totalIncrement = React.useMemo(() => {
    if (sorted.length < 2) return 0
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const o = first.oldCtc ?? first.newCtc ?? 0
    const n = last.newCtc ?? last.oldCtc ?? 0
    if (!o || o <= 0) return 0
    return Number((((n - o) / o) * 100).toFixed(2))
  }, [sorted])

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/employees/${employeeId}/compensation/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      toast.success("Revision deleted")
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete")
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
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Compensation History</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Timeline of salary revisions with old → new CTC, increment %, reason and approvals.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Add Revision
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Current CTC" value={inrShort(currentCtc)} icon={TrendingUp} accent="emerald" sub={inr(currentCtc)} />
        <StatCard label="Total Revisions" value={items.length} icon={History} accent="cyan" />
        <StatCard
          label="Total Increment"
          value={`${totalIncrement > 0 ? "+" : ""}${totalIncrement}%`}
          icon={TrendingUp}
          accent={totalIncrement >= 0 ? "emerald" : "coral"}
          sub="First → Current"
        />
      </div>

      {/* Timeline */}
      <SectionCard title="Revision Timeline" description="Chronological view of salary changes">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No salary revisions yet"
            description="Add the first revision to start tracking salary history."
            action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Revision</Button>}
          />
        ) : (
          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/60" aria-hidden />
            <ol className="space-y-4">
              {[...sorted].reverse().map((rec, idx) => {
                const isLatest = idx === 0
                const inc = rec.incrementPercent ?? 0
                return (
                  <li key={rec.id} className="relative pl-10">
                    {/* dot */}
                    <span
                      className={cn(
                        "absolute left-2 top-3 grid h-4 w-4 place-items-center rounded-full ring-4 ring-background",
                        rec.status === "Approved" ? "bg-emerald-500" : rec.status === "Rejected" ? "bg-rose-500" : "bg-slate-400"
                      )}
                      aria-hidden
                    />
                    <div className={cn(
                      "rounded-xl border bg-card p-4 shadow-soft transition-shadow hover:shadow-card",
                      isLatest ? "border-emerald-300 dark:border-emerald-500/30" : "border-border/60"
                    )}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{fmtDate(rec.effectiveDate)}</span>
                            {isLatest && (
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">Latest</Badge>
                            )}
                            <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[rec.status] || "bg-muted text-muted-foreground")}>
                              {rec.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-sm text-muted-foreground tabular-nums">{inr(rec.oldCtc)}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-bold tabular-nums text-foreground">{inr(rec.newCtc)}</span>
                            <Badge variant="secondary" className={cn(
                              "font-medium border-0 tabular-nums",
                              inc > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                                : inc < 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {inc > 0 ? "+" : ""}{inc}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs">
                            <div>
                              <p className="text-muted-foreground">Reason</p>
                              <p className="font-medium">{rec.revisionReason || "—"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Approved By</p>
                              <p className="font-medium">{rec.approvedBy || "—"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Basic</p>
                              <p className="font-medium tabular-nums">{inr(rec.newBasic)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewTarget(rec)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditTarget(rec)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10" onClick={() => setDeleteTarget(rec)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </SectionCard>

      {/* Create dialog */}
      <RevisionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employeeId={employeeId}
        currentCtc={currentCtc}
        onSaved={load}
      />

      {/* Edit dialog */}
      <RevisionDialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        employeeId={employeeId}
        currentCtc={currentCtc}
        existing={editTarget}
        onSaved={load}
      />

      {/* View dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Revision Details</DialogTitle>
            <DialogDescription>{fmtDate(viewTarget?.effectiveDate)}</DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Old CTC</p>
                <p className="font-medium tabular-nums">{inr(viewTarget.oldCtc)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New CTC</p>
                <p className="font-medium tabular-nums">{inr(viewTarget.newCtc)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Old Basic</p>
                <p className="font-medium tabular-nums">{inr(viewTarget.oldBasic)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New Basic</p>
                <p className="font-medium tabular-nums">{inr(viewTarget.newBasic)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Old HRA</p>
                <p className="font-medium tabular-nums">{inr(viewTarget.oldHra)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New HRA</p>
                <p className="font-medium tabular-nums">{inr(viewTarget.newHra)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Increment %</p>
                <p className="font-medium tabular-nums">{viewTarget.incrementPercent ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reason</p>
                <p className="font-medium">{viewTarget.revisionReason || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Approved By</p>
                <p className="font-medium">{viewTarget.approvedBy || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[viewTarget.status] || "bg-muted text-muted-foreground")}>
                  {viewTarget.status}
                </Badge>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Promotion Mapping</p>
                <p className="font-medium">{viewTarget.promotionMapping || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Letter URL</p>
                {viewTarget.letterUrl ? (
                  <a href={viewTarget.letterUrl} target="_blank" rel="noreferrer" className="text-sm text-emerald-600 dark:text-emerald-400 underline truncate block">
                    {viewTarget.letterUrl}
                  </a>
                ) : <span className="text-sm text-muted-foreground">—</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete revision?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the salary revision dated {fmtDate(deleteTarget?.effectiveDate)}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// ============================================================
// Revision Dialog (Create / Edit)
// ============================================================

function RevisionDialog({
  open, onOpenChange, employeeId, currentCtc, existing, onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  currentCtc: number
  existing?: CompRec | null
  onSaved: () => void
}) {
  const isEdit = !!existing
  const [form, setForm] = React.useState({
    effectiveDate: format(new Date(), "yyyy-MM-dd"),
    newCtc: "",
    newBasic: "",
    newHra: "",
    revisionReason: "Annual appraisal",
    approvedBy: "HR Admin",
    status: "Approved",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (existing) {
        setForm({
          effectiveDate: format(new Date(existing.effectiveDate), "yyyy-MM-dd"),
          newCtc: existing.newCtc ? String(existing.newCtc) : "",
          newBasic: existing.newBasic ? String(existing.newBasic) : "",
          newHra: existing.newHra ? String(existing.newHra) : "",
          revisionReason: existing.revisionReason || "Annual appraisal",
          approvedBy: existing.approvedBy || "HR Admin",
          status: existing.status || "Approved",
        })
      } else {
        setForm({
          effectiveDate: format(new Date(), "yyyy-MM-dd"),
          newCtc: currentCtc ? String(currentCtc) : "",
          newBasic: "",
          newHra: "",
          revisionReason: "Annual appraisal",
          approvedBy: "HR Admin",
          status: "Approved",
        })
      }
    }
  }, [open, existing, currentCtc])

  const oldCtc = isEdit ? (existing?.oldCtc ?? currentCtc) : currentCtc
  const newCtcNum = Number(form.newCtc || 0)
  const increment = oldCtc && oldCtc > 0 ? Number((((newCtcNum - oldCtc) / oldCtc) * 100).toFixed(2)) : 0

  async function handleSubmit() {
    if (!form.effectiveDate) { toast.error("Effective date is required"); return }
    if (!form.newCtc) { toast.error("New CTC is required"); return }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        effectiveDate: new Date(form.effectiveDate).toISOString(),
        newCtc: Number(form.newCtc),
        newBasic: form.newBasic ? Number(form.newBasic) : undefined,
        newHra: form.newHra ? Number(form.newHra) : undefined,
        revisionReason: form.revisionReason,
        approvedBy: form.approvedBy,
        status: form.status,
      }
      const url = isEdit
        ? `/api/employees/${employeeId}/compensation/${existing!.id}`
        : `/api/employees/${employeeId}/compensation`
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to save revision")
      toast.success(isEdit ? "Revision updated" : "Revision added — Employee CTC synced")
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to save revision")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Revision" : "Add Salary Revision"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the revision details." : "Record a new salary revision. The employee's current CTC will be updated."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Effective Date <span className="text-rose-500">*</span></Label>
              <Input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Old CTC (auto)</Label>
              <Input value={inr(oldCtc)} disabled className="bg-muted/40 tabular-nums" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>New CTC <span className="text-rose-500">*</span></Label>
              <Input
                type="number"
                value={form.newCtc}
                onChange={(e) => setForm({ ...form, newCtc: e.target.value })}
                placeholder="0"
                className="tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Increment % (auto)</Label>
              <Input value={`${increment > 0 ? "+" : ""}${increment}%`} disabled className="bg-muted/40 tabular-nums" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>New Basic</Label>
              <Input
                type="number"
                value={form.newBasic}
                onChange={(e) => setForm({ ...form, newBasic: e.target.value })}
                placeholder="0"
                className="tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label>New HRA</Label>
              <Input
                type="number"
                value={form.newHra}
                onChange={(e) => setForm({ ...form, newHra: e.target.value })}
                placeholder="0"
                className="tabular-nums"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={form.revisionReason} onValueChange={(v) => setForm({ ...form, revisionReason: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Approved By</Label>
            <Input
              value={form.approvedBy}
              onChange={(e) => setForm({ ...form, approvedBy: e.target.value })}
              placeholder="Approver name"
            />
          </div>
          {form.status === "Approved" && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approved revisions will sync the employee's CTC, Basic and HRA fields.
            </div>
          )}
          {form.status === "Rejected" && (
            <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
              <XCircle className="h-3.5 w-3.5" />
              Rejected revisions will not affect the employee's current CTC.
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
            {isEdit ? "Save Changes" : "Add Revision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
