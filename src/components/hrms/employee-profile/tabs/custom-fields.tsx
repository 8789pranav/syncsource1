"use client"

// ============================================================
// CustomFieldsTab — CRUD for EmployeeCustomFieldValue.
// API: /api/employees/[id]/custom-fields (GET list, POST
// upsert by fieldKey, PATCH/DELETE by recordId).
// ------------------------------------------------------------

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  SlidersHorizontal, Plus, Pencil, Trash2, Check, X, Asterisk, ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { EmptyState, SectionCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- types ----------

interface CustomFieldRec {
  id: string
  fieldKey: string
  fieldLabel?: string | null
  fieldType?: string | null
  value?: string | null
  category?: string | null
  isMandatory: boolean
  approvalRequired: boolean
  updatedAt: string | Date
}

// ---------- helpers ----------

const CATEGORIES = ["General", "Project", "Accommodation", "Uniform", "Other"] as const

const FIELD_TYPES = ["text", "number", "date", "select", "multiselect", "checkbox"] as const

const CATEGORY_COLORS: Record<string, string> = {
  General: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Project: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Accommodation: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Uniform: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Other: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
}

const CATEGORY_BORDER: Record<string, string> = {
  General: "border-l-emerald-500",
  Project: "border-l-cyan-500",
  Accommodation: "border-l-amber-500",
  Uniform: "border-l-teal-500",
  Other: "border-l-fuchsia-500",
}

// ============================================================
// Component
// ============================================================

export default function CustomFieldsTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<CustomFieldRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<CustomFieldRec | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<CustomFieldRec | null>(null)
  const [inlineEdit, setInlineEdit] = React.useState<{ id: string; value: string } | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/custom-fields`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load custom fields")
      setItems(data?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load custom fields")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  // Group by category
  const grouped = React.useMemo(() => {
    const g: Record<string, CustomFieldRec[]> = {}
    items.forEach((it) => {
      const cat = it.category || "Other"
      if (!g[cat]) g[cat] = []
      g[cat].push(it)
    })
    return g
  }, [items])

  async function handleInlineSave(rec: CustomFieldRec) {
    if (!inlineEdit) return
    try {
      const res = await fetch(`/api/employees/${employeeId}/custom-fields/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: inlineEdit.value }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to update")
      toast.success("Value updated")
      setInlineEdit(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to update")
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/employees/${employeeId}/custom-fields/${deleteTarget.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      toast.success("Custom field deleted")
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
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Custom Fields</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Manage custom fields for this employee, grouped by category. Inline-edit values directly or add new fields.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Add Custom Field
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border/60">
          <EmptyState
            icon={SlidersHorizontal}
            title="No custom fields"
            description="Add a custom field to capture additional information for this employee."
            action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Custom Field</Button>}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {CATEGORIES.map((cat) => {
            const catItems = grouped[cat] || []
            if (catItems.length === 0) return null
            return (
              <SectionCard
                key={cat}
                title={cat}
                description={`${catItems.length} field${catItems.length === 1 ? "" : "s"}`}
                action={
                  <Badge variant="secondary" className={cn("font-medium border-0", CATEGORY_COLORS[cat])}>
                    {cat}
                  </Badge>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {catItems.map((f) => (
                    <div
                      key={f.id}
                      className={cn(
                        "rounded-lg border border-border/60 border-l-4 bg-card p-3",
                        CATEGORY_BORDER[cat]
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold truncate">{f.fieldLabel || f.fieldKey}</p>
                            {f.isMandatory && (
                              <Badge variant="outline" className="text-[10px] gap-0.5 text-rose-600 border-rose-200 dark:border-rose-500/30 dark:text-rose-400">
                                <Asterisk className="h-2.5 w-2.5" /> Required
                              </Badge>
                            )}
                            {f.approvalRequired && (
                              <Badge variant="outline" className="text-[10px] gap-0.5 text-amber-600 border-amber-200 dark:border-amber-500/30 dark:text-amber-400">
                                <ShieldCheck className="h-2.5 w-2.5" /> Approval
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            {f.fieldKey} · {f.fieldType || "text"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditTarget(f)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-rose-600 hover:bg-rose-500/10"
                            onClick={() => setDeleteTarget(f)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Inline editable value */}
                      {inlineEdit?.id === f.id ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Input
                            value={inlineEdit.value}
                            onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleInlineSave(f)
                              if (e.key === "Escape") setInlineEdit(null)
                            }}
                            className="h-8 text-sm"
                          />
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-500/10"
                            onClick={() => handleInlineSave(f)}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                            onClick={() => setInlineEdit(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setInlineEdit({ id: f.id, value: f.value || "" })}
                          className="block w-full text-left text-sm text-foreground hover:bg-muted/40 rounded px-1.5 py-1 -mx-1.5 -my-1 transition-colors cursor-text"
                          title="Click to edit"
                        >
                          {f.value || <span className="text-muted-foreground/60 italic">Click to set value...</span>}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <FieldFormDialog
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
            <AlertDialogTitle>Delete custom field?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the field <strong>{deleteTarget?.fieldLabel || deleteTarget?.fieldKey}</strong>. This action cannot be undone.
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
// Field Form Dialog
// ============================================================

function FieldFormDialog({
  open, editTarget, employeeId, onOpenChange, onSaved,
}: {
  open: boolean
  editTarget: CustomFieldRec | null
  employeeId: string
  onOpenChange: (o: boolean) => void
  onSaved: () => void
}) {
  const [form, setForm] = React.useState({
    fieldKey: "",
    fieldLabel: "",
    fieldType: "text",
    value: "",
    category: "General",
    isMandatory: false,
    approvalRequired: false,
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (editTarget) {
        setForm({
          fieldKey: editTarget.fieldKey,
          fieldLabel: editTarget.fieldLabel || "",
          fieldType: editTarget.fieldType || "text",
          value: editTarget.value || "",
          category: editTarget.category || "General",
          isMandatory: editTarget.isMandatory,
          approvalRequired: editTarget.approvalRequired,
        })
      } else {
        setForm({
          fieldKey: "", fieldLabel: "", fieldType: "text", value: "",
          category: "General", isMandatory: false, approvalRequired: false,
        })
      }
    }
  }, [open, editTarget])

  async function handleSubmit() {
    if (!form.fieldKey.trim()) {
      toast.error("Field key is required")
      return
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(form.fieldKey)) {
      toast.error("Field key must start with a letter and contain only letters, digits, and underscores")
      return
    }
    setSubmitting(true)
    try {
      // POST upserts by (employeeId, fieldKey) on the API
      const url = editTarget
        ? `/api/employees/${employeeId}/custom-fields/${editTarget.id}`
        : `/api/employees/${employeeId}/custom-fields`
      const method = editTarget ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldKey: form.fieldKey,
          fieldLabel: form.fieldLabel,
          fieldType: form.fieldType,
          value: form.value,
          category: form.category,
          isMandatory: form.isMandatory,
          approvalRequired: form.approvalRequired,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to save field")
      toast.success(editTarget ? "Field updated" : "Field added")
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to save field")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            {editTarget ? "Edit Custom Field" : "Add Custom Field"}
          </DialogTitle>
          <DialogDescription>
            {editTarget
              ? `Editing "${editTarget.fieldKey}".`
              : "Add a new custom field. The field key must be unique per employee."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Field key <span className="text-rose-500">*</span></Label>
              <Input
                value={form.fieldKey}
                onChange={(e) => setForm({ ...form, fieldKey: e.target.value })}
                placeholder="e.g. project_code"
                disabled={!!editTarget}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">Letters, digits, underscores. Cannot be changed after creation.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Field label</Label>
              <Input
                value={form.fieldLabel}
                onChange={(e) => setForm({ ...form, fieldLabel: e.target.value })}
                placeholder="e.g. Project Code"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Field type</Label>
              <Select value={form.fieldType} onValueChange={(v) => setForm({ ...form, fieldType: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Value</Label>
            <Input
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder="Field value"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div className="flex items-center gap-2">
                <Asterisk className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <div>
                  <p className="text-sm font-medium">Mandatory</p>
                  <p className="text-xs text-muted-foreground">Required to fill</p>
                </div>
              </div>
              <Switch
                checked={form.isMandatory}
                onCheckedChange={(c) => setForm({ ...form, isMandatory: c })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-medium">Approval required</p>
                  <p className="text-xs text-muted-foreground">Needs HR approval</p>
                </div>
              </div>
              <Switch
                checked={form.approvalRequired}
                onCheckedChange={(c) => setForm({ ...form, approvalRequired: c })}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {editTarget ? "Save Changes" : "Add Field"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
