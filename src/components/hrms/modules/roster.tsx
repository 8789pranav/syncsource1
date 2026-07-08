'use client'

import * as React from "react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  PageHeader, ListToolbar, DataTable, StatusBadge, EmptyState, Column,
} from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { rosterFormSchema } from "@/lib/form-schemas"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarRange, Plus, Pencil, Trash2, Eye, ArrowLeft, Send, CalendarOff, X } from "lucide-react"
import { format, eachDayOfInterval, isWeekend, isSameDay } from "date-fns"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"

// ============================================================
// Types
// ============================================================

interface Shift {
  id: string
  code: string
  name: string
  startTime: string
  endTime: string
  color: string
  status: string
}

interface EmployeeLite {
  id: string
  employeeCode: string
  firstName: string
  middleName?: string | null
  lastName?: string | null
  displayName?: string | null
  department?: { id: string; name: string } | null
}

interface RosterEntry {
  id: string
  employeeId: string
  shiftId: string | null
  shift?: Shift | null
  date: string | Date
  isWeeklyOff: boolean
  isHoliday: boolean
  notes?: string | null
}

interface Roster {
  id: string
  name: string
  code: string
  startDate: string | Date
  endDate: string | Date
  cycle: string
  status: string
  publishedAt?: string | Date | null
  _count?: { entries: number }
  entries?: RosterEntry[]
}

// ============================================================
// Helpers
// ============================================================

function empName(e?: EmployeeLite) {
  if (!e) return "—"
  return e.displayName || [e.firstName, e.lastName].filter(Boolean).join(" ") || e.employeeCode
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

// ============================================================
// Main Module
// ============================================================

export function RosterModule() {
  const [rosters, setRosters] = React.useState<Roster[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Roster | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Roster | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch("/api/rosters")
      const data = await res.json()
      setRosters(data?.items || [])
    } catch {
      toast.error("Failed to load rosters")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const filtered = rosters.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
  })

  async function handleSubmit(v: any) {
    setSubmitting(true)
    try {
      const url = editing ? `/api/rosters/${editing.id}` : "/api/rosters"
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
      toast.success(editing ? "Roster updated" : "Roster created")
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
      const res = await apiFetch(`/api/rosters/${deleteId}`, { method: "DELETE" })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to delete")
      }
      toast.success("Roster deleted")
      setDeleteId(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete")
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePublish(r: Roster) {
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/rosters/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Published" }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to publish")
      }
      toast.success("Roster published")
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to publish")
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<Roster>[] = [
    {
      key: "code", header: "Code",
      render: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span>,
    },
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: "cycle", header: "Cycle",
      render: (r) => (
        <Badge variant="outline" className="text-[11px]">{r.cycle}</Badge>
      ),
    },
    {
      key: "range", header: "Date Range",
      render: (r) => (
        <span className="text-sm">
          {fmtDate(r.startDate)} <span className="mx-1 text-muted-foreground">→</span> {fmtDate(r.endDate)}
        </span>
      ),
    },
    {
      key: "entries", header: "Entries",
      render: (r) => <span className="text-xs tabular-nums text-muted-foreground">{r._count?.entries || 0} assigned</span>,
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions", header: "", className: "text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSelected(r)}>
            <Eye className="h-3.5 w-3.5 mr-1" /> Open
          </Button>
          {r.status === "Draft" && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:bg-emerald-500/10" onClick={() => handlePublish(r)} disabled={submitting}>
              <Send className="h-3.5 w-3.5 mr-1" /> Publish
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditing(r); setOpen(true) }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10" onClick={() => setDeleteId(r.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      {selected ? (
        <RosterDetailView roster={selected} onBack={() => { setSelected(null); load() }} />
      ) : (
        <>
          <PageHeader
            title="Roster Management"
            description="Plan, assign, and publish employee shift rosters."
            icon={CalendarRange}
          />
          <ListToolbar
            search={search}
            onSearch={setSearch}
            onAdd={() => { setEditing(null); setOpen(true) }}
            addLabel="Create Roster"
          />
          <DataTable
            columns={columns}
            rows={filtered}
            loading={loading}
            onRowClick={(r) => setSelected(r)}
            emptyState={
              <EmptyState
                icon={CalendarRange}
                title="No rosters yet"
                description="Create a roster to start assigning shifts to employees."
                action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Create Roster</Button>}
              />
            }
          />
        </>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Roster" : "Create Roster"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update roster details." : "Define the roster name, cycle, and date range."}
            </DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={rosterFormSchema}
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
            <DialogTitle>Delete Roster?</DialogTitle>
            <DialogDescription>This will permanently delete the roster and all its entries.</DialogDescription>
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

// ============================================================
// Roster Detail View (week grid centerpiece)
// ============================================================

function RosterDetailView({ roster, onBack }: { roster: Roster; onBack: () => void }) {
  const [employees, setEmployees] = React.useState<EmployeeLite[]>([])
  const [shifts, setShifts] = React.useState<Shift[]>([])
  const [entries, setEntries] = React.useState<RosterEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activeCell, setActiveCell] = React.useState<{ empId: string; date: Date } | null>(null)
  const [saving, setSaving] = React.useState(false)

  const days = React.useMemo(() => {
    try {
      return eachDayOfInterval({ start: new Date(roster.startDate), end: new Date(roster.endDate) })
    } catch { return [] }
  }, [roster])

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [empRes, shiftRes, rosterRes] = await Promise.all([
        apiFetch("/api/employees").catch(() => null),
        apiFetch("/api/shifts"),
        apiFetch(`/api/rosters/${roster.id}`),
      ])
      if (empRes && empRes.ok) {
        const ed = await empRes.json()
        setEmployees(ed?.items || [])
      } else {
        setEmployees([])
      }
      if (shiftRes.ok) {
        const sd = await shiftRes.json()
        setShifts(sd?.items || [])
      }
      if (rosterRes.ok) {
        const rd = await rosterRes.json()
        setEntries(rd?.entries || [])
      }
    } catch {
      toast.error("Failed to load roster detail")
    } finally {
      setLoading(false)
    }
  }, [roster.id])

  React.useEffect(() => { loadData() }, [loadData])

  // Index entries by `${employeeId}_${yyyy-MM-dd}` for O(1) lookup
  const entryMap = React.useMemo(() => {
    const m = new Map<string, RosterEntry>()
    for (const e of entries) {
      try {
        const key = `${e.employeeId}_${format(new Date(e.date), "yyyy-MM-dd")}`
        m.set(key, e)
      } catch {}
    }
    return m
  }, [entries])

  function getEntry(empId: string, date: Date): RosterEntry | undefined {
    return entryMap.get(`${empId}_${format(date, "yyyy-MM-dd")}`)
  }

  async function assignShift(empId: string, date: Date, shiftId: string | null, isWeeklyOff: boolean) {
    setSaving(true)
    try {
      const res = await apiFetch(`/api/rosters/${roster.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: empId,
          date: date.toISOString(),
          shiftId: shiftId,
          isWeeklyOff,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to assign")
      }
      toast.success(shiftId ? "Shift assigned" : isWeeklyOff ? "Marked as weekly off" : "Cleared")
      setActiveCell(null)
      loadData()
    } catch (e: any) {
      toast.error(e.message || "Failed to assign")
    } finally {
      setSaving(false)
    }
  }

  async function clearEntry(empId: string, date: Date) {
    setSaving(true)
    try {
      const res = await fetch(
        `/api/rosters/${roster.id}/entries?employeeId=${empId}&date=${date.toISOString()}`,
        { method: "DELETE" },
      )
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to clear")
      }
      toast.success("Entry cleared")
      setActiveCell(null)
      loadData()
    } catch (e: any) {
      toast.error(e.message || "Failed to clear")
    } finally {
      setSaving(false)
    }
  }

  async function publish() {
    setSaving(true)
    try {
      const res = await apiFetch(`/api/rosters/${roster.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Published" }),
      })
      if (!res.ok) throw new Error("Failed to publish")
      toast.success("Roster published")
      onBack()
    } catch {
      toast.error("Failed to publish")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight truncate">{roster.name}</h1>
              <StatusBadge status={roster.status} />
              <Badge variant="outline" className="text-[11px]">{roster.cycle}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-mono">{roster.code}</span> · {fmtDate(roster.startDate)} → {fmtDate(roster.endDate)} · {entries.length} entries
            </p>
          </div>
        </div>
        {roster.status === "Draft" && (
          <Button onClick={publish} disabled={saving} className="gap-1.5">
            <Send className="h-4 w-4" /> Publish Roster
          </Button>
        )}
      </div>

      {/* Legend */}
      {shifts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shifts:</span>
          {shifts.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-0.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              {s.code} — {s.name}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-0.5 text-xs">
            <CalendarOff className="h-3 w-3 text-muted-foreground" /> Weekly Off
          </span>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="rounded-xl border border-border/60 p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No employees available"
          description="Add employees first to assign them to this roster."
        />
      ) : days.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="Invalid date range"
          description="This roster has no valid date range."
        />
      ) : (
        <RosterGrid
          employees={employees}
          days={days}
          shifts={shifts}
          getEntry={getEntry}
          activeCell={activeCell}
          setActiveCell={setActiveCell}
          onAssign={assignShift}
          onClear={clearEntry}
          onWeeklyOff={(empId, date) => assignShift(empId, date, null, true)}
          saving={saving}
          readOnly={roster.status === "Locked"}
        />
      )}
    </div>
  )
}

// ============================================================
// Roster Grid
// ============================================================

interface RosterGridProps {
  employees: EmployeeLite[]
  days: Date[]
  shifts: Shift[]
  getEntry: (empId: string, date: Date) => RosterEntry | undefined
  activeCell: { empId: string; date: Date } | null
  setActiveCell: (c: { empId: string; date: Date } | null) => void
  onAssign: (empId: string, date: Date, shiftId: string | null, isWeeklyOff: boolean) => void
  onClear: (empId: string, date: Date) => void
  onWeeklyOff: (empId: string, date: Date) => void
  saving: boolean
  readOnly: boolean
}

function RosterGrid({
  employees, days, shifts, getEntry, activeCell, setActiveCell,
  onAssign, onClear, onWeeklyOff, saving, readOnly,
}: RosterGridProps) {
  // Cap the number of days to keep horizontal scroll manageable
  const visibleDays = days.slice(0, 31)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-soft"
    >
      <div className="overflow-auto max-h-[70vh]">
        <table className="border-collapse">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 bg-card border-b border-r border-border/60 px-3 py-2.5 text-left min-w-[180px]">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employee</span>
              </th>
              {visibleDays.map((d) => {
                const we = isWeekend(d)
                return (
                  <th key={d.toISOString()} className={cn(
                    "border-b border-border/60 px-2 py-2 text-center min-w-[88px]",
                    we && "bg-amber-500/5",
                  )}>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">{format(d, "EEE")}</span>
                      <span className="text-sm font-semibold tabular-nums">{format(d, "dd")}</span>
                      <span className="text-[10px] text-muted-foreground">{format(d, "MMM")}</span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => (
              <tr key={emp.id} className={cn(idx % 2 === 1 && "bg-muted/20")}>
                <td className={cn(
                  "sticky left-0 z-10 border-r border-border/60 px-3 py-2 bg-card",
                  idx % 2 === 1 && "bg-muted/20",
                )}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                      {empName(emp).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{empName(emp)}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {emp.employeeCode}{emp.department ? ` · ${emp.department.name}` : ""}
                      </p>
                    </div>
                  </div>
                </td>
                {visibleDays.map((d) => {
                  const entry = getEntry(emp.id, d)
                  const we = isWeekend(d)
                  const isActive = activeCell?.empId === emp.id && isSameDay(activeCell.date, d)
                  return (
                    <td key={d.toISOString()} className={cn("border-b border-border/40 p-1.5 text-center", we && "bg-amber-500/5")}>
                      <Cell
                        entry={entry}
                        shifts={shifts}
                        isActive={isActive}
                        readOnly={readOnly}
                        onOpen={() => setActiveCell({ empId: emp.id, date: d })}
                        onClose={() => setActiveCell(null)}
                        onAssign={(shiftId) => onAssign(emp.id, d, shiftId, false)}
                        onWeeklyOff={() => onWeeklyOff(emp.id, d)}
                        onClear={() => onClear(emp.id, d)}
                        saving={saving}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

// ============================================================
// Cell
// ============================================================

function Cell({
  entry, shifts, isActive, readOnly, onOpen, onClose, onAssign, onWeeklyOff, onClear, saving,
}: {
  entry: RosterEntry | undefined
  shifts: Shift[]
  isActive: boolean
  readOnly: boolean
  onOpen: () => void
  onClose: () => void
  onAssign: (shiftId: string | null) => void
  onWeeklyOff: () => void
  onClear: () => void
  saving: boolean
}) {
  if (entry?.isWeeklyOff) {
    return (
      <Popover open={isActive} onOpenChange={(o) => o ? onOpen() : onClose()} modal>
        <PopoverTrigger asChild>
          <button
            disabled={readOnly}
            className="w-full rounded-md border border-dashed border-border/60 bg-muted/30 px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/60 transition-colors flex items-center justify-center gap-1 disabled:cursor-not-allowed"
          >
            <CalendarOff className="h-3 w-3" /> Off
          </button>
        </PopoverTrigger>
        <CellPopover
          shifts={shifts}
          currentShiftId={null}
          isWeeklyOff
          onAssign={onAssign}
          onWeeklyOff={onWeeklyOff}
          onClear={onClear}
          onClose={onClose}
          saving={saving}
        />
      </Popover>
    )
  }

  if (entry?.shift) {
    return (
      <Popover open={isActive} onOpenChange={(o) => o ? onOpen() : onClose()} modal>
        <PopoverTrigger asChild>
          <button
            disabled={readOnly}
            className="w-full rounded-md px-2 py-1.5 text-[10px] font-semibold text-white shadow-sm hover:scale-[1.03] transition-transform disabled:cursor-not-allowed"
            style={{ background: entry.shift.color }}
            title={`${entry.shift.name} (${entry.shift.startTime} - ${entry.shift.endTime})`}
          >
            {entry.shift.code}
          </button>
        </PopoverTrigger>
        <CellPopover
          shifts={shifts}
          currentShiftId={entry.shiftId}
          isWeeklyOff={false}
          onAssign={onAssign}
          onWeeklyOff={onWeeklyOff}
          onClear={onClear}
          onClose={onClose}
          saving={saving}
        />
      </Popover>
    )
  }

  // Empty cell
  return (
    <Popover open={isActive} onOpenChange={(o) => o ? onOpen() : onClose()} modal>
      <PopoverTrigger asChild>
        <button
          disabled={readOnly}
          className="w-full rounded-md border border-dashed border-border/40 bg-transparent px-2 py-1.5 text-[10px] text-muted-foreground/50 hover:bg-muted/40 hover:text-muted-foreground transition-colors disabled:cursor-not-allowed"
        >
          +
        </button>
      </PopoverTrigger>
      <CellPopover
        shifts={shifts}
        currentShiftId={null}
        isWeeklyOff={false}
        onAssign={onAssign}
        onWeeklyOff={onWeeklyOff}
        onClear={onClear}
        onClose={onClose}
        saving={saving}
      />
    </Popover>
  )
}

function CellPopover({
  shifts, currentShiftId, isWeeklyOff, onAssign, onWeeklyOff, onClear, onClose, saving,
}: {
  shifts: Shift[]
  currentShiftId: string | null
  isWeeklyOff: boolean
  onAssign: (shiftId: string | null) => void
  onWeeklyOff: () => void
  onClear: () => void
  onClose: () => void
  saving: boolean
}) {
  const [sel, setSel] = React.useState<string>(currentShiftId || "")
  return (
    <PopoverContent className="w-56 p-3" align="center">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assign Shift</p>
        <Select value={sel} onValueChange={setSel}>
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder="Choose shift..." />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {shifts.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground text-center">No shifts configured</div>
            ) : shifts.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.code} — {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-col gap-1.5 pt-1">
          <Button
            size="sm"
            className="h-7 w-full text-xs"
            disabled={!sel || saving}
            onClick={() => onAssign(sel)}
          >
            Assign
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-full text-xs"
            disabled={saving || isWeeklyOff}
            onClick={onWeeklyOff}
          >
            <CalendarOff className="h-3 w-3 mr-1" /> Mark Weekly Off
          </Button>
          {(currentShiftId || isWeeklyOff) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-full text-xs text-rose-600 hover:bg-rose-500/10"
              disabled={saving}
              onClick={() => { onClear(); onClose() }}
            >
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>
    </PopoverContent>
  )
}
