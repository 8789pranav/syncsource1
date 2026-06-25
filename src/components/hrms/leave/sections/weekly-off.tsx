'use client'

import * as React from "react"
import { toast } from "sonner"
import { CalendarOff, Plus, Pencil, Trash2, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Column, DataTable, EmptyState, ListToolbar, SectionCard, StatusBadge } from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { weeklyOffFormSchema } from "@/lib/form-schemas"
import { cn } from "@/lib/utils"
import {
  fetchJson, sendJson, useAsync, fmtDate, WEEKDAYS,
  WeeklyOffCalendar,
} from "../shared"

const WEEKOFF_TYPES = [
  { value: "Fixed", label: "Fixed" },
  { value: "AlternateSaturday", label: "Alternate Saturday" },
  { value: "Rotational", label: "Rotational" },
  { value: "ShiftBased", label: "Shift Based" },
  { value: "Custom", label: "Custom" },
]

export function WeeklyOffSection() {
  const [search, setSearch] = React.useState("")
  const [edit, setEdit] = React.useState<WeeklyOffCalendar | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [del, setDel] = React.useState<WeeklyOffCalendar | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [preview, setPreview] = React.useState<WeeklyOffCalendar | null>(null)

  const { data, loading, reload } = useAsync<WeeklyOffCalendar[]>(
    () => fetchJson("/api/weekly-off").catch(() => [] as WeeklyOffCalendar[]),
    [],
  )

  const filtered = (data || []).filter((w) => {
    if (!search) return true
    const q = search.toLowerCase()
    return w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q) || (w.weekOffType || "").toLowerCase().includes(q)
  })

  async function submitCreate(v: any) {
    setSubmitting(true)
    try {
      await sendJson("/api/weekly-off", v)
      toast.success("Weekly off created")
      setCreateOpen(false); reload()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to create") }
    finally { setSubmitting(false) }
  }
  async function submitEdit(v: any) {
    if (!edit) return
    setSubmitting(true)
    try {
      await sendJson(`/api/weekly-off/${edit.id}`, v, "PATCH")
      toast.success("Weekly off updated")
      setEdit(null); reload()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to update") }
    finally { setSubmitting(false) }
  }
  async function confirmDelete() {
    if (!del) return
    setSubmitting(true)
    try {
      await sendJson(`/api/weekly-off/${del.id}`, {}, "DELETE")
      toast.success("Weekly off deleted")
      setDel(null); reload()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete") }
    finally { setSubmitting(false) }
  }

  const columns: Column<WeeklyOffCalendar>[] = [
    {
      key: "name", header: "Name", className: "min-w-[200px]",
      render: (w) => (
        <div>
          <p className="font-medium text-sm">{w.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{w.code}</p>
        </div>
      ),
    },
    { key: "type", header: "Type", render: (w) => <Badge variant="secondary" className="text-[10px] border-0 bg-muted text-muted-foreground">{WEEKOFF_TYPES.find((t) => t.value === w.weekOffType)?.label || w.weekOffType}</Badge> },
    {
      key: "days", header: "Off Days",
      render: (w) => (
        <div className="flex items-center gap-1">
          {w.fixedDays?.split(",").map((s) => s.trim()).filter(Boolean).map((d) => {
            const n = parseInt(d, 10)
            return <Badge key={d} variant="secondary" className="text-[10px] border-0 bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400">{WEEKDAYS[n] || d}</Badge>
          })}
          {!w.fixedDays && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      ),
    },
    { key: "eff", header: "Effective", render: (w) => <span className="text-xs text-muted-foreground">{fmtDate(w.effectiveFrom)} → {fmtDate(w.effectiveTo)}</span> },
    { key: "status", header: "Status", render: (w) => <StatusBadge status={w.status || "Active"} /> },
    {
      key: "actions", header: "", width: "150px",
      render: (w) => (
        <div className="flex items-center gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setPreview(w)}>Preview</Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEdit(w)}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500" onClick={() => setDel(w)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Weekly Off</h2>
        <p className="text-sm text-muted-foreground">Configure weekly off patterns — fixed, alternate Saturdays, rotational, shift-based or custom.</p>
      </div>

      <ListToolbar
        search={search}
        onSearch={setSearch}
        onAdd={() => setCreateOpen(true)}
        addLabel="Add Weekly Off"
      />

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        emptyState={<EmptyState icon={CalendarOff} title="No weekly offs" description="Define weekly off patterns for your organisation." action={<Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add Weekly Off</Button>} />}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-500" /> Add Weekly Off</DialogTitle>
            <DialogDescription>Configure which weekdays are off.</DialogDescription>
          </DialogHeader>
          <WeeklyOffForm
            initial={{}}
            submitting={submitting}
            onCancel={() => setCreateOpen(false)}
            onSubmit={submitCreate}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-emerald-500" /> Edit Weekly Off</DialogTitle>
            <DialogDescription>{edit?.name}</DialogDescription>
          </DialogHeader>
          {edit && (
            <WeeklyOffForm
              initial={edit as any}
              submitting={submitting}
              onCancel={() => setEdit(null)}
              onSubmit={submitEdit}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-emerald-500" /> {preview?.name}</DialogTitle>
            <DialogDescription>Weekly off pattern preview</DialogDescription>
          </DialogHeader>
          {preview && <WeeklyOffPreview w={preview} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-rose-500" /> Delete Weekly Off?</AlertDialogTitle>
            <AlertDialogDescription>Permanently delete <b>{del?.name}</b>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={submitting} className="bg-rose-600 hover:bg-rose-700">
              {submitting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function WeeklyOffForm({
  initial, onSubmit, onCancel, submitting,
}: {
  initial: any
  onSubmit: (v: any) => void
  onCancel: () => void
  submitting: boolean
}) {
  const [name, setName] = React.useState(initial.name || "")
  const [code, setCode] = React.useState(initial.code || "")
  const [weekOffType, setWeekOffType] = React.useState(initial.weekOffType || "Fixed")
  const [fixedDays, setFixedDays] = React.useState<Set<number>>(
    new Set((initial.fixedDays || "0").split(",").map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n)))
  )
  const [entityIds, setEntityIds] = React.useState(initial.entityIds || "")
  const [locationIds, setLocationIds] = React.useState(initial.locationIds || "")
  const [effectiveFrom, setEffectiveFrom] = React.useState(initial.effectiveFrom ? String(initial.effectiveFrom).slice(0, 10) : "")
  const [effectiveTo, setEffectiveTo] = React.useState(initial.effectiveTo ? String(initial.effectiveTo).slice(0, 10) : "")
  const [status, setStatus] = React.useState(initial.status || "Active")

  function toggleDay(n: number) {
    const next = new Set(fixedDays)
    if (next.has(n)) next.delete(n); else next.add(n)
    setFixedDays(next)
  }

  function submit() {
    if (!name || !code) { toast.error("Name and code are required"); return }
    onSubmit({
      name, code, weekOffType,
      fixedDays: Array.from(fixedDays).sort().join(","),
      entityIds: entityIds || null,
      locationIds: locationIds || null,
      effectiveFrom: effectiveFrom || null,
      effectiveTo: effectiveTo || null,
      status,
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" placeholder="Standard Sunday Off" />
        </div>
        <div>
          <Label className="text-xs">Code *</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-9" placeholder="WO-SUN" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Week Off Type</Label>
        <Select value={weekOffType} onValueChange={setWeekOffType}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {WEEKOFF_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Fixed Off Days</Label>
        <div className="grid grid-cols-7 gap-1 mt-1">
          {WEEKDAYS.map((d, n) => (
            <button
              key={n}
              type="button"
              onClick={() => toggleDay(n)}
              className={cn(
                "rounded-md border py-2 text-xs font-medium transition-colors",
                fixedDays.has(n)
                  ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400"
                  : "border-border/60 hover:bg-muted/50",
              )}
            >
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Entity IDs (comma)</Label>
          <Input value={entityIds} onChange={(e) => setEntityIds(e.target.value)} className="h-9" placeholder="All if blank" />
        </div>
        <div>
          <Label className="text-xs">Location IDs (comma)</Label>
          <Input value={locationIds} onChange={(e) => setLocationIds(e.target.value)} className="h-9" placeholder="All if blank" />
        </div>
        <div>
          <Label className="text-xs">Effective From</Label>
          <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Effective To</Label>
          <Input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} className="h-9" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
          {submitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}

function WeeklyOffPreview({ w }: { w: WeeklyOffCalendar }) {
  const days = new Set((w.fixedDays || "0").split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)))
  // Build a 4-week preview
  const weeks = [0, 1, 2, 3]
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground uppercase">
        {WEEKDAYS.map((d) => <div key={d} className="text-center font-semibold">{d.slice(0, 3)}</div>)}
      </div>
      {weeks.map((wk) => (
        <div key={wk} className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((_, n) => (
            <div key={n} className={cn(
              "h-10 rounded-md border text-center text-xs grid place-items-center",
              days.has(n) ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400 border-cyan-300" : "border-border/60",
            )}>
              {days.has(n) ? "OFF" : ""}
            </div>
          ))}
        </div>
      ))}
      <div className="text-xs text-muted-foreground text-center">
        Pattern: <b>{WEEKOFF_TYPES.find((t) => t.value === w.weekOffType)?.label}</b> · Off days: {Array.from(days).map((d) => WEEKDAYS[d]).join(", ") || "—"}
      </div>
    </div>
  )
}
