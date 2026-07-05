"use client"

// ============================================================
// TrainingTab — CRUD for EmployeeTraining.
//   • Stat strip: Assigned / In Progress / Completed / Pending
//   • Table with score, completion rate, mark-complete action
// ------------------------------------------------------------
// API: /api/employees/[id]/training (+ /<recordId>)
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Plus, Pencil, Trash2, RefreshCw, Loader2, Eye, CheckCircle2, GraduationCap,
  PlayCircle, Clock, Award, ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SectionCard, EmptyState, StatCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- types ----------

interface TrainingRec {
  id: string
  courseName: string
  trainingType?: string | null
  startDate?: string | Date | null
  endDate?: string | Date | null
  status: string
  score?: number | null
  certificateUrl?: string | null
  trainerFeedback?: string | null
  employeeFeedback?: string | null
}

const TRAINING_TYPES = ["Online", "Classroom", "On-the-job", "External"]
const STATUS_OPTIONS = ["Assigned", "In Progress", "Completed", "Pending", "Cancelled"]

const TYPE_COLORS: Record<string, string> = {
  Online: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Classroom: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "On-the-job": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  External: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
}

const STATUS_COLORS: Record<string, string> = {
  Assigned: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "In Progress": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Pending: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  Cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

// ============================================================
// Component
// ============================================================

export default function TrainingTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<TrainingRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editDialog, setEditDialog] = React.useState<{ open: boolean; target: TrainingRec | null }>({ open: false, target: null })
  const [viewTarget, setViewTarget] = React.useState<TrainingRec | null>(null)
  const [completeTarget, setCompleteTarget] = React.useState<TrainingRec | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<TrainingRec | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/training`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load training")
      setItems(data?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load training")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  const counts = React.useMemo(() => ({
    assigned: items.filter((i) => i.status === "Assigned").length,
    inProgress: items.filter((i) => i.status === "In Progress").length,
    completed: items.filter((i) => i.status === "Completed").length,
    pending: items.filter((i) => i.status === "Pending").length,
  }), [items])

  const completionRate = items.length > 0 ? Math.round((counts.completed / items.length) * 100) : 0

  async function patchStatus(rec: TrainingRec, payload: Record<string, unknown>, msg: string) {
    try {
      const res = await fetch(`/api/employees/${employeeId}/training/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to update")
      toast.success(msg)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to update")
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/employees/${employeeId}/training/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      toast.success("Training deleted")
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
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Training & Development</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Assigned courses, progress tracking, scores and certificates.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setEditDialog({ open: true, target: null })}>
            <Plus className="h-4 w-4" /> Assign Training
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Assigned" value={counts.assigned} icon={Clock} accent="cyan" />
        <StatCard label="In Progress" value={counts.inProgress} icon={PlayCircle} accent="amber" />
        <StatCard label="Completed" value={counts.completed} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Pending" value={counts.pending} icon={GraduationCap} accent="coral" />
      </div>

      {/* Completion rate */}
      <SectionCard title="Completion Rate" description={`${counts.completed} of ${items.length} trainings completed`}>
        <div className="flex items-center gap-3">
          <Progress value={completionRate} className="h-2.5 flex-1" />
          <span className="text-sm font-semibold tabular-nums min-w-[44px] text-right">{completionRate}%</span>
        </div>
      </SectionCard>

      {/* Training table */}
      <SectionCard title="Trainings" description={`${items.length} records`}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No trainings assigned"
            description="Assign a course to start tracking training progress."
            action={<Button size="sm" onClick={() => setEditDialog({ open: true, target: null })}><Plus className="h-4 w-4 mr-1.5" /> Assign Training</Button>} />
        ) : (
          <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
            <ScrollArea className="max-h-[560px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Course</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Certificate</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((t) => {
                    const passScore = t.score !== null && t.score !== undefined && t.score >= 60
                    return (
                      <TableRow key={t.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setViewTarget(t)}>
                        <TableCell className="font-medium">{t.courseName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium border-0", TYPE_COLORS[t.trainingType || ""] || "bg-muted text-muted-foreground")}>
                            {t.trainingType || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                          {fmtDate(t.startDate)} – {fmtDate(t.endDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[t.status] || "bg-muted text-muted-foreground")}>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {t.score !== null && t.score !== undefined ? (
                            <Badge variant="secondary" className={cn("font-medium border-0 tabular-nums",
                              passScore ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                            )}>
                              {t.score}
                            </Badge>
                          ) : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell>
                          {t.certificateUrl ? (
                            <a href={t.certificateUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline text-xs">
                              <ExternalLink className="h-3 w-3" /> View
                            </a>
                          ) : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewTarget(t)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {t.status !== "Completed" && t.status !== "Cancelled" && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                                onClick={() => setCompleteTarget(t)}>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditDialog({ open: true, target: t })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10" onClick={() => setDeleteTarget(t)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </SectionCard>

      {/* Edit / create dialog */}
      <TrainingDialog
        open={editDialog.open}
        onOpenChange={(o) => setEditDialog({ open: o, target: null })}
        employeeId={employeeId}
        existing={editDialog.target}
        onSaved={load}
      />

      {/* View dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {viewTarget?.courseName}
              {viewTarget && (
                <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[viewTarget.status] || "bg-muted text-muted-foreground")}>
                  {viewTarget.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {viewTarget?.trainingType || "—"} · {fmtDate(viewTarget?.startDate)} – {fmtDate(viewTarget?.endDate)}
            </DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Score</p>
                  <p className="font-medium tabular-nums">{viewTarget.score !== null && viewTarget.score !== undefined ? `${viewTarget.score} / 100` : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Certificate</p>
                  {viewTarget.certificateUrl ? (
                    <a href={viewTarget.certificateUrl} target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> View
                    </a>
                  ) : <span className="text-muted-foreground">—</span>}
                </div>
              </div>
              {viewTarget.trainerFeedback && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Trainer Feedback</p>
                  <p className="whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{viewTarget.trainerFeedback}</p>
                </div>
              )}
              {viewTarget.employeeFeedback && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Employee Feedback</p>
                  <p className="whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{viewTarget.employeeFeedback}</p>
                </div>
              )}
              <DialogFooter className="gap-2">
                {viewTarget.status !== "Completed" && viewTarget.status !== "Cancelled" && (
                  <Button variant="outline" className="gap-1.5" onClick={() => { setCompleteTarget(viewTarget); setViewTarget(null) }}>
                    <CheckCircle2 className="h-4 w-4" /> Mark Complete
                  </Button>
                )}
                <Button variant="outline" className="gap-1.5" onClick={() => { setEditDialog({ open: true, target: viewTarget }); setViewTarget(null) }}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark Complete dialog */}
      <CompleteDialog
        open={!!completeTarget}
        onOpenChange={(o) => !o && setCompleteTarget(null)}
        rec={completeTarget}
        onConfirm={(score, certUrl) => {
          if (completeTarget) {
            patchStatus(completeTarget, { status: "Completed", score, certificateUrl: certUrl || undefined }, "Training marked complete")
            setCompleteTarget(null)
          }
        }}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete training?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.courseName}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// ============================================================
// Training Dialog (Create / Edit)
// ============================================================

function TrainingDialog({
  open, onOpenChange, employeeId, existing, onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  existing: TrainingRec | null
  onSaved: () => void
}) {
  const isEdit = !!existing
  const [form, setForm] = React.useState({
    courseName: "", trainingType: "Online",
    startDate: "", endDate: "", status: "Assigned",
    score: "", certificateUrl: "", trainerFeedback: "", employeeFeedback: "",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (existing) {
        setForm({
          courseName: existing.courseName || "",
          trainingType: existing.trainingType || "Online",
          startDate: existing.startDate ? format(new Date(existing.startDate), "yyyy-MM-dd") : "",
          endDate: existing.endDate ? format(new Date(existing.endDate), "yyyy-MM-dd") : "",
          status: existing.status || "Assigned",
          score: existing.score != null ? String(existing.score) : "",
          certificateUrl: existing.certificateUrl || "",
          trainerFeedback: existing.trainerFeedback || "",
          employeeFeedback: existing.employeeFeedback || "",
        })
      } else {
        setForm({
          courseName: "", trainingType: "Online",
          startDate: "", endDate: "", status: "Assigned",
          score: "", certificateUrl: "", trainerFeedback: "", employeeFeedback: "",
        })
      }
    }
  }, [open, existing])

  async function handleSubmit() {
    if (!form.courseName.trim()) { toast.error("Course name is required"); return }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        courseName: form.courseName,
        trainingType: form.trainingType,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        status: form.status,
        score: form.score ? Number(form.score) : undefined,
        certificateUrl: form.certificateUrl || undefined,
        trainerFeedback: form.trainerFeedback || undefined,
        employeeFeedback: form.employeeFeedback || undefined,
      }
      const url = isEdit ? `/api/employees/${employeeId}/training/${existing!.id}` : `/api/employees/${employeeId}/training`
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to save training")
      toast.success(isEdit ? "Training updated" : "Training assigned")
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to save training")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Training" : "Assign Training"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update training details." : "Assign a new training course to this employee."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Course Name <span className="text-rose-500">*</span></Label>
            <Input value={form.courseName} onChange={(e) => setForm({ ...form, courseName: e.target.value })} placeholder="e.g. Advanced React Patterns" />
          </div>
          <div className="space-y-1.5">
            <Label>Training Type</Label>
            <Select value={form.trainingType} onValueChange={(v) => setForm({ ...form, trainingType: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRAINING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>End Date</Label>
            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Score (0–100)</Label>
            <Input type="number" min={0} max={100} value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Certificate URL</Label>
            <Input value={form.certificateUrl} onChange={(e) => setForm({ ...form, certificateUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Trainer Feedback</Label>
            <Textarea value={form.trainerFeedback} onChange={(e) => setForm({ ...form, trainerFeedback: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Employee Feedback</Label>
            <Textarea value={form.employeeFeedback} onChange={(e) => setForm({ ...form, employeeFeedback: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
            {isEdit ? "Save Changes" : "Assign Training"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Mark Complete Dialog
// ============================================================

function CompleteDialog({
  open, onOpenChange, rec, onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  rec: TrainingRec | null
  onConfirm: (score: number, certUrl: string) => void
}) {
  const [score, setScore] = React.useState("")
  const [certUrl, setCertUrl] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setScore(rec?.score != null ? String(rec.score) : "")
      setCertUrl(rec?.certificateUrl || "")
    }
  }, [open, rec])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Mark Training Complete
          </DialogTitle>
          <DialogDescription>{rec?.courseName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Score (0–100)</Label>
            <Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 85" />
          </div>
          <div className="space-y-1.5">
            <Label>Certificate URL</Label>
            <Input value={certUrl} onChange={(e) => setCertUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onConfirm(Number(score || 0), certUrl)}>
            <CheckCircle2 className="h-4 w-4" /> Mark Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
