"use client"

// ============================================================
// NotesTab — CRUD for EmployeeNote.
// API: /api/employees/[id]/notes (GET list, POST create,
// GET/PATCH/DELETE by recordId).
// SECURITY: Some notes are private (hidden from employee).
// ------------------------------------------------------------

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  StickyNote, Plus, Pencil, Trash2, Filter, X, Lock, Eye, Paperclip, AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import { EmptyState } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- types ----------

interface NoteRec {
  id: string
  category: string
  body: string
  isPrivate: boolean
  visibleToManager: boolean
  attachmentUrl?: string | null
  createdBy?: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

// ---------- helpers ----------

const CATEGORIES = [
  "General", "Performance", "Disciplinary", "Medical",
  "HR discussion", "Manager feedback", "Exit discussion",
] as const

const CATEGORY_STYLE: Record<string, { badge: string; border: string }> = {
  General: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    border: "border-l-emerald-500",
  },
  Performance: {
    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
    border: "border-l-cyan-500",
  },
  Disciplinary: {
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
    border: "border-l-rose-500",
  },
  Medical: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    border: "border-l-amber-500",
  },
  "HR discussion": {
    badge: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
    border: "border-l-fuchsia-500",
  },
  "Manager feedback": {
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
    border: "border-l-teal-500",
  },
  "Exit discussion": {
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
    border: "border-l-rose-500",
  },
}

function getStyle(category: string) {
  return CATEGORY_STYLE[category] || CATEGORY_STYLE.General
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy, hh:mm a") } catch { return "—" }
}

// "current user" stub — in a real app, read from session
const CURRENT_USER = "HR Admin"

// ============================================================
// Component
// ============================================================

export default function NotesTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<NoteRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [catFilter, setCatFilter] = React.useState<string>("all")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<NoteRec | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<NoteRec | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/notes`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load notes")
      setItems(data?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load notes")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  const filtered = items.filter((n) => catFilter === "all" || n.category === catFilter)

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/employees/${employeeId}/notes/${deleteTarget.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      toast.success("Note deleted")
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
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Notes</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            HR / manager / private notes about this employee. Some notes are private and hidden from the employee.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Add Note
        </Button>
      </div>

      {/* Security banner */}
      <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10 p-3 flex items-start gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-amber-700 dark:text-amber-300">
          Notes marked <strong>Private</strong> are hidden from the employee. Use this flag carefully for sensitive information.
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          <Filter className="h-4 w-4" /> Category
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="gap-1.5">
          <StickyNote className="h-3 w-3" /> {filtered.length} note{filtered.length === 1 ? "" : "s"}
        </Badge>
        {catFilter !== "all" && (
          <Button variant="ghost" size="sm" className="h-9 gap-1.5"
            onClick={() => setCatFilter("all")}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border/60">
          <EmptyState
            icon={StickyNote}
            title="No notes yet"
            description="Add a note to start tracking HR / manager / private discussions."
            action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Note</Button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((n, idx) => {
            const style = getStyle(n.category)
            const canModify = (n.createdBy || "HR Admin") === CURRENT_USER
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(idx * 0.03, 0.3) }}
                className={cn(
                  "rounded-xl border border-border/60 border-l-4 bg-card p-4 shadow-soft hover:shadow-card transition-shadow",
                  style.border
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className={cn("font-medium border-0", style.badge)}>
                      {n.category}
                    </Badge>
                    {n.isPrivate && (
                      <Badge variant="outline" className="gap-1 text-rose-600 border-rose-200 dark:border-rose-500/30 dark:text-rose-400">
                        <Lock className="h-3 w-3" /> Private
                      </Badge>
                    )}
                    {n.visibleToManager && (
                      <Badge variant="outline" className="gap-1 text-teal-600 border-teal-200 dark:border-teal-500/30 dark:text-teal-400">
                        <Eye className="h-3 w-3" /> Visible to manager
                      </Badge>
                    )}
                  </div>
                  {canModify && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditTarget(n)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10"
                        onClick={() => setDeleteTarget(n)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{n.body}</p>
                <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span>By {n.createdBy || "—"}</span>
                  <span>{fmtDate(n.createdAt)}</span>
                </div>
                {n.attachmentUrl && (
                  <a
                    href={n.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <Paperclip className="h-3 w-3" /> {n.attachmentUrl.split("/").pop() || "Attachment"}
                  </a>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <NoteFormDialog
        open={createOpen || !!editTarget}
        editTarget={editTarget}
        employeeId={employeeId}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditTarget(null) } }}
        onSaved={load}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {deleteTarget?.category.toLowerCase()} note. This action cannot be undone.
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
// Note Create / Edit Dialog
// ============================================================

function NoteFormDialog({
  open, editTarget, employeeId, onOpenChange, onSaved,
}: {
  open: boolean
  editTarget: NoteRec | null
  employeeId: string
  onOpenChange: (o: boolean) => void
  onSaved: () => void
}) {
  const [form, setForm] = React.useState({
    category: "General",
    body: "",
    isPrivate: false,
    visibleToManager: false,
    attachmentUrl: "",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (editTarget) {
        setForm({
          category: editTarget.category,
          body: editTarget.body,
          isPrivate: editTarget.isPrivate,
          visibleToManager: editTarget.visibleToManager,
          attachmentUrl: editTarget.attachmentUrl || "",
        })
      } else {
        setForm({ category: "General", body: "", isPrivate: false, visibleToManager: false, attachmentUrl: "" })
      }
    }
  }, [open, editTarget])

  async function handleSubmit() {
    if (!form.body.trim()) {
      toast.error("Note body is required")
      return
    }
    setSubmitting(true)
    try {
      const url = editTarget
        ? `/api/employees/${employeeId}/notes/${editTarget.id}`
        : `/api/employees/${employeeId}/notes`
      const method = editTarget ? "PATCH" : "POST"
      const payload: any = {
        category: form.category,
        body: form.body,
        isPrivate: form.isPrivate,
        visibleToManager: form.visibleToManager,
        attachmentUrl: form.attachmentUrl || undefined,
      }
      if (!editTarget) payload.createdBy = CURRENT_USER
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to save note")
      toast.success(editTarget ? "Note updated" : "Note added")
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to save note")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            {editTarget ? "Edit Note" : "Add Note"}
          </DialogTitle>
          <DialogDescription>
            {editTarget ? "Update note content and visibility." : "Add a new note. Use the privacy flags carefully."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Category <span className="text-rose-500">*</span></Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Note body <span className="text-rose-500">*</span></Label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Write the note content..."
              rows={5}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Attachment URL</Label>
            <Input
              value={form.attachmentUrl}
              onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <div>
                  <p className="text-sm font-medium">Private</p>
                  <p className="text-xs text-muted-foreground">Hidden from employee</p>
                </div>
              </div>
              <Switch
                checked={form.isPrivate}
                onCheckedChange={(c) => setForm({ ...form, isPrivate: c })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <div>
                  <p className="text-sm font-medium">Visible to manager</p>
                  <p className="text-xs text-muted-foreground">Reporting manager can see</p>
                </div>
              </div>
              <Switch
                checked={form.visibleToManager}
                onCheckedChange={(c) => setForm({ ...form, visibleToManager: c })}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {editTarget ? "Save Changes" : "Add Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
