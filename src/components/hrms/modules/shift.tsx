'use client'

import * as React from "react"
import { toast } from "sonner"
import {
  PageHeader, ListToolbar, DataTable, StatusBadge, EmptyState, Column,
} from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { shiftFormSchema } from "@/lib/form-schemas"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Plus, Pencil, Trash2, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

interface Shift {
  id: string
  code: string
  name: string
  startTime: string
  endTime: string
  breakStart?: string | null
  breakEnd?: string | null
  workingHours: number
  graceMinutes: number
  halfDayHours: number
  fullDayHours: number
  isNightShift: boolean
  isFlexible: boolean
  autoPunchOut: boolean
  overtimeEligible: boolean
  color: string
  status: string
}

function toMin(t?: string | null): number {
  if (!t) return 0
  const [h, m] = t.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

function fmt12(t?: string | null): string {
  if (!t) return "—"
  const [h, m] = t.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m || 0).padStart(2, "0")} ${ampm}`
}

// Compute a percentage bar for a 0-24h axis. Handles night shifts (wrap-around).
function ShiftTimelineBar({ shift }: { shift: Shift }) {
  const start = toMin(shift.startTime)
  const end = toMin(shift.endTime)
  const totalMin = 24 * 60
  const segments: { left: number; width: number }[] = []
  if (end >= start) {
    segments.push({ left: (start / totalMin) * 100, width: ((end - start) / totalMin) * 100 })
  } else {
    // night shift wraps midnight
    segments.push({ left: (start / totalMin) * 100, width: ((totalMin - start) / totalMin) * 100 })
    segments.push({ left: 0, width: (end / totalMin) * 100 })
  }
  const breakStart = toMin(shift.breakStart)
  const breakEnd = toMin(shift.breakEnd)
  const hasBreak = shift.breakStart && shift.breakEnd && breakEnd > breakStart

  return (
    <div className="w-full">
      <div className="relative h-5 rounded-full bg-muted/60 overflow-hidden">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="absolute top-0 h-full rounded-full"
            style={{
              left: `${seg.left}%`,
              width: `${seg.width}%`,
              background: `linear-gradient(90deg, ${shift.color}, ${shift.color}cc)`,
            }}
            title={`${fmt12(shift.startTime)} → ${fmt12(shift.endTime)}`}
          />
        ))}
        {hasBreak && (
          <div
            className="absolute top-0 h-full bg-background/80 border-x border-background"
            style={{
              left: `${(breakStart / totalMin) * 100}%`,
              width: `${((breakEnd - breakStart) / totalMin) * 100}%`,
            }}
            title={`Break ${fmt12(shift.breakStart)} → ${fmt12(shift.breakEnd)}`}
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
    </div>
  )
}

export function ShiftModule() {
  const [items, setItems] = React.useState<Shift[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Shift | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/shifts")
      const data = await res.json()
      setItems(data?.items || [])
    } catch {
      toast.error("Failed to load shifts")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const filtered = items.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
  })

  async function handleSubmit(v: any) {
    setSubmitting(true)
    try {
      const url = editing ? `/api/shifts/${editing.id}` : "/api/shifts"
      const method = editing ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to save")
      }
      toast.success(editing ? "Shift updated" : "Shift created")
      setOpen(false)
      setEditing(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to save")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/shifts/${deleteId}`, { method: "DELETE" })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to delete")
      }
      toast.success("Shift deleted")
      setDeleteId(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete")
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<Shift>[] = [
    {
      key: "code", header: "Code",
      render: (s) => (
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded ring-1 ring-border" style={{ background: s.color }} />
          <span className="font-mono text-xs font-semibold">{s.code}</span>
        </div>
      ),
    },
    {
      key: "name", header: "Name",
      render: (s) => (
        <div>
          <p className="font-medium">{s.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {s.isNightShift && (
              <Badge variant="outline" className="text-[10px] gap-1 px-1 py-0 border-fuchsia-500/30 text-fuchsia-600 dark:text-fuchsia-400">
                <Moon className="h-2.5 w-2.5" /> Night
              </Badge>
            )}
            {s.isFlexible && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 border-cyan-500/30 text-cyan-600 dark:text-cyan-400">Flexible</Badge>
            )}
            {s.overtimeEligible && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500/30 text-amber-600 dark:text-amber-400">OT</Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "time", header: "Start — End",
      render: (s) => (
        <div className="text-sm">
          <span className="font-medium tabular-nums">{fmt12(s.startTime)}</span>
          <span className="mx-1 text-muted-foreground">→</span>
          <span className="font-medium tabular-nums">{fmt12(s.endTime)}</span>
        </div>
      ),
    },
    {
      key: "workingHours", header: "Working Hrs",
      render: (s) => (
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
          <Clock className="h-3 w-3" /> {s.workingHours}h
        </span>
      ),
    },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    {
      key: "timeline", header: "Timeline (24h)", className: "min-w-[200px]",
      render: (s) => <ShiftTimelineBar shift={s} />,
    },
    {
      key: "actions", header: "", className: "text-right",
      render: (s) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditing(s); setOpen(true) }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10" onClick={() => setDeleteId(s.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Shifts"
        description="Define work shifts with timing, breaks, and overtime rules."
        icon={Clock}
      />

      <ListToolbar
        search={search}
        onSearch={setSearch}
        onAdd={() => { setEditing(null); setOpen(true) }}
        addLabel="Add Shift"
      />

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        emptyState={
          <EmptyState
            icon={Clock}
            title="No shifts configured"
            description="Create shifts like General, Morning, Evening, or Night."
            action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Shift</Button>}
          />
        }
      />

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editing ? "Edit Shift" : "Add Shift"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Update shift configuration." : "Configure a new shift with timings and rules."}
            </DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={shiftFormSchema}
            initialValues={editing || {}}
            onSubmit={handleSubmit}
            onCancel={() => { setOpen(false); setEditing(null) }}
            submitLabel={editing ? "Update" : "Create"}
            loading={submitting}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Shift?</DialogTitle>
            <DialogDescription>
              This will remove the shift. Existing assignments & roster entries will not be re-assigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={submitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
