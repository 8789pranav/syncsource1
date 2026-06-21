"use client"

// ============================================================
// LettersTab — CRUD for EmployeeLetter.
// API: /api/employees/[id]/letters (GET list, POST create,
// GET/PATCH/DELETE by recordId).
// ------------------------------------------------------------

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Mail, Plus, Eye, Pencil, Ban, Trash2, Download, Filter, X, FileText,
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- types ----------

interface LetterRec {
  id: string
  letterType: string
  letterCode?: string | null
  issuedDate: string | Date
  subject?: string | null
  body?: string | null
  pdfUrl?: string | null
  status: string
  issuedBy?: string | null
  approvedBy?: string | null
  version: number
}

// ---------- helpers ----------

const LETTER_TYPES = [
  "Offer", "Appointment", "Confirmation", "Increment", "Promotion", "Transfer",
  "Warning", "Experience", "Relieving", "Termination", "Internship", "NDA",
] as const

const LETTER_STATUS = ["Draft", "Generated", "Issued", "E-signed", "Cancelled"] as const

const TYPE_COLORS: Record<string, string> = {
  Offer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Appointment: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Confirmation: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Increment: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Promotion: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
  Transfer: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Warning: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Experience: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Relieving: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Termination: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Internship: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  NDA: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  Generated: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Issued: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "E-signed": "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

function empName(e?: any) {
  if (!e) return "Employee"
  return e.displayName || [e.firstName, e.lastName].filter(Boolean).join(" ") || e.employeeCode || "Employee"
}

// ============================================================
// Component
// ============================================================

export default function LettersTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<LetterRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<LetterRec | null>(null)
  const [view, setView] = React.useState<LetterRec | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<LetterRec | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/letters`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load letters")
      setItems(data?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load letters")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  const filtered = items.filter((r) => {
    if (typeFilter !== "all" && r.letterType !== typeFilter) return false
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    return true
  })

  async function patchStatus(rec: LetterRec, status: string, successMsg: string) {
    try {
      const res = await fetch(`/api/employees/${employeeId}/letters/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to update")
      toast.success(successMsg)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to update")
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/employees/${employeeId}/letters/${deleteTarget.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      toast.success("Letter deleted")
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
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Letters</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Generate and manage employee letters — offer, appointment, confirmation, increment, promotion, transfer, warning, experience, relieving, termination, internship, and NDA.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Generate Letter
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          <Filter className="h-4 w-4" /> Filters
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[160px]">
            <SelectValue placeholder="Letter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {LETTER_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {LETTER_STATUS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(typeFilter !== "all" || statusFilter !== "all") && (
          <Button variant="ghost" size="sm" className="h-9 gap-1.5"
            onClick={() => { setTypeFilter("all"); setStatusFilter("all") }}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border/60">
          <EmptyState
            icon={Mail}
            title="No letters found"
            description="Generate a new letter or adjust your filters."
            action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Generate Letter</Button>}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
          <ScrollArea className="max-h-[640px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[120px]">Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Code</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Issued</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Subject</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Issued by</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Version</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setView(r)}>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-medium border-0", TYPE_COLORS[r.letterType] || "bg-muted text-muted-foreground")}>
                        {r.letterType}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.letterCode || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.issuedDate)}</TableCell>
                    <TableCell className="font-medium max-w-[280px] truncate" title={r.subject || ""}>
                      {r.subject || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[r.status] || "bg-muted text-muted-foreground")}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.issuedBy || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">v{r.version}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setView(r)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditTarget(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {r.status !== "Cancelled" && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10"
                            onClick={() => patchStatus(r, "Cancelled", "Letter cancelled")}>
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10"
                          onClick={() => setDeleteTarget(r)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}

      {/* Create / Edit dialog */}
      <LetterFormDialog
        open={createOpen || !!editTarget}
        editTarget={editTarget}
        employeeId={employeeId}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditTarget(null) } }}
        onSaved={load}
      />

      {/* View dialog */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {view?.letterType} Letter
              {view?.letterCode && (
                <Badge variant="outline" className="font-mono">{view.letterCode}</Badge>
              )}
              {view && (
                <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[view.status] || "bg-muted text-muted-foreground")}>
                  {view.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Issued {fmtDate(view?.issuedDate)} by {view?.issuedBy || "—"}
            </DialogDescription>
          </DialogHeader>
          {view && (
            <div className="space-y-4">
              {/* Letter preview */}
              <div className="rounded-xl border border-border/60 bg-white p-6 sm:p-8 shadow-soft">
                <div className="border-b border-border pb-4 mb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-semibold text-emerald-700 dark:text-emerald-400">ACME Corporation</p>
                      <p className="text-xs text-muted-foreground mt-0.5">HR Department · 123 Business Park, Bangalore</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Ref: {view.letterCode || "LTR-XXXX"}</p>
                      <p>Date: {fmtDate(view.issuedDate)}</p>
                      <p>Version: v{view.version}</p>
                    </div>
                  </div>
                </div>
                <h3 className="text-sm font-semibold mb-3 text-foreground">
                  Subject: {view.subject || `${view.letterType} Letter`}
                </h3>
                <p className="text-sm mb-3 text-foreground">Dear {empName(employee)},</p>
                <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                  {view.body || "Letter body will appear here."}
                </div>
                <div className="mt-8 text-sm text-foreground">
                  <p>Regards,</p>
                  <p className="mt-1 font-medium">{view.issuedBy || "HR Admin"}</p>
                  <p className="text-xs text-muted-foreground">HR Department, ACME Corporation</p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" className="gap-1.5"
                  onClick={() => toast.info("Generating PDF... (stub for now)")}>
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
                {view.status !== "Cancelled" && (
                  <Button variant="outline" className="gap-1.5 text-rose-600 hover:bg-rose-500/10"
                    onClick={() => { patchStatus(view, "Cancelled", "Letter cancelled"); setView(null) }}>
                    <Ban className="h-4 w-4" /> Cancel Letter
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete letter?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete letter {deleteTarget?.letterCode || ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// ============================================================
// Letter Create / Edit Dialog
// ============================================================

function LetterFormDialog({
  open, editTarget, employeeId, onOpenChange, onSaved,
}: {
  open: boolean
  editTarget: LetterRec | null
  employeeId: string
  onOpenChange: (o: boolean) => void
  onSaved: () => void
}) {
  const [form, setForm] = React.useState({
    letterType: "Appointment",
    subject: "",
    body: "",
    status: "Generated",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (editTarget) {
        setForm({
          letterType: editTarget.letterType,
          subject: editTarget.subject || "",
          body: editTarget.body || "",
          status: editTarget.status,
        })
      } else {
        setForm({ letterType: "Appointment", subject: "", body: "", status: "Generated" })
      }
    }
  }, [open, editTarget])

  async function handleSubmit() {
    if (!form.subject.trim()) {
      toast.error("Subject is required")
      return
    }
    setSubmitting(true)
    try {
      const url = editTarget
        ? `/api/employees/${employeeId}/letters/${editTarget.id}`
        : `/api/employees/${employeeId}/letters`
      const method = editTarget ? "PATCH" : "POST"
      const payload: any = {
        letterType: form.letterType,
        subject: form.subject,
        body: form.body,
        status: form.status,
      }
      if (!editTarget) {
        payload.issuedDate = new Date().toISOString()
        payload.issuedBy = "HR Admin"
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to save letter")
      toast.success(editTarget ? "Letter updated" : "Letter generated (code auto-assigned)")
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to save letter")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {editTarget ? "Edit Letter" : "Generate Letter"}
          </DialogTitle>
          <DialogDescription>
            {editTarget
              ? `Editing ${editTarget.letterCode || editTarget.letterType}.`
              : "Letter code (LTR-XXXX) will be auto-generated on save."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Letter type <span className="text-rose-500">*</span></Label>
              <Select value={form.letterType} onValueChange={(v) => setForm({ ...form, letterType: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {LETTER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {LETTER_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Subject <span className="text-rose-500">*</span></Label>
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Letter subject"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Body</Label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Letter body..."
              rows={8}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {editTarget ? "Save Changes" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
