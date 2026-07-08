'use client'

import * as React from "react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  PageHeader, ListToolbar, DataTable, EmptyState, Column,
} from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { holidayFormSchema } from "@/lib/form-schemas"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CalendarDays, Plus, Pencil, Trash2, CalendarHeart, MapPin,
} from "lucide-react"
import { format, isToday, isTomorrow, differenceInCalendarDays } from "date-fns"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"

// ============================================================
// Types
// ============================================================

interface Holiday {
  id: string
  name: string
  date: string | Date
  type: string
  description?: string | null
  country: string
  state?: string | null
}

// ============================================================
// Type color mapping (NO indigo/blue; use chart palette + tailwind)
// National=emerald, Regional=cyan, Optional=amber, Restricted=fuchsia
// ============================================================

const TYPE_STYLES: Record<string, {
  text: string
  bg: string
  border: string
  dot: string
  gradient: string
}> = {
  National: {
    text: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-500/15",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    gradient: "from-emerald-500/10 to-emerald-500/5",
  },
  Regional: {
    text: "text-cyan-700 dark:text-cyan-400",
    bg: "bg-cyan-100 dark:bg-cyan-500/15",
    border: "border-cyan-500/30",
    dot: "bg-cyan-500",
    gradient: "from-cyan-500/10 to-cyan-500/5",
  },
  Optional: {
    text: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-500/15",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    gradient: "from-amber-500/10 to-amber-500/5",
  },
  Restricted: {
    text: "text-fuchsia-700 dark:text-fuchsia-400",
    bg: "bg-fuchsia-100 dark:bg-fuchsia-500/15",
    border: "border-fuchsia-500/30",
    dot: "bg-fuchsia-500",
    gradient: "from-fuchsia-500/10 to-fuchsia-500/5",
  },
}

function typeStyle(type: string) {
  return TYPE_STYLES[type] || TYPE_STYLES.National
}

function relativeLabel(d: Date): string {
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  const diff = differenceInCalendarDays(d, new Date())
  if (diff > 0 && diff < 7) return `In ${diff} days`
  return format(d, "EEE, dd MMM yyyy")
}

// ============================================================
// Main Module
// ============================================================

export function HolidayModule() {
  const [items, setItems] = React.useState<Holiday[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Holiday | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch("/api/holidays")
      const data = await res.json()
      setItems(data?.items || [])
    } catch {
      toast.error("Failed to load holidays")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const filtered = items.filter((h) => {
    if (typeFilter !== "all" && h.type !== typeFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return h.name.toLowerCase().includes(q) || (h.state || "").toLowerCase().includes(q) || (h.country || "").toLowerCase().includes(q)
  })

  const upcoming = React.useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return items
      .filter((h) => new Date(h.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3)
  }, [items])

  async function handleSubmit(v: any) {
    setSubmitting(true)
    try {
      const url = editing ? `/api/holidays/${editing.id}` : "/api/holidays"
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
      toast.success(editing ? "Holiday updated" : "Holiday created")
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
      const res = await apiFetch(`/api/holidays/${deleteId}`, { method: "DELETE" })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to delete")
      }
      toast.success("Holiday deleted")
      setDeleteId(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete")
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<Holiday>[] = [
    {
      key: "name", header: "Holiday",
      render: (h) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", typeStyle(h.type).dot)} />
          <div className="min-w-0">
            <p className="font-medium truncate">{h.name}</p>
            {h.description && <p className="text-xs text-muted-foreground truncate">{h.description}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "date", header: "Date",
      render: (h) => (
        <div className="text-sm">
          <p className="font-medium tabular-nums">{format(new Date(h.date), "dd MMM yyyy")}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(h.date), "EEEE")}</p>
        </div>
      ),
    },
    {
      key: "type", header: "Type",
      render: (h) => {
        const s = typeStyle(h.type)
        return (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", s.bg, s.text)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} /> {h.type}
          </span>
        )
      },
    },
    {
      key: "location", header: "Location",
      render: (h) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {h.state ? `${h.state}, ${h.country}` : h.country}
        </div>
      ),
    },
    {
      key: "actions", header: "", className: "text-right",
      render: (h) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditing(h); setOpen(true) }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10" onClick={() => setDeleteId(h.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Holiday Calendar"
        description="Manage national, regional, optional, and restricted holidays."
        icon={CalendarDays}
      />

      {/* Upcoming holidays highlight */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <CalendarHeart className="h-3.5 w-3.5" /> Upcoming Holidays
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {upcoming.map((h, i) => {
              const s = typeStyle(h.type)
              return (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Card className={cn("overflow-hidden border shadow-soft hover:shadow-card transition-shadow bg-gradient-to-br", s.border, s.gradient)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{h.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{relativeLabel(new Date(h.date))}</p>
                        </div>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0", s.bg, s.text)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} /> {h.type}
                        </span>
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <p className="text-2xl font-bold tabular-nums leading-none">{format(new Date(h.date), "dd")}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(h.date), "MMM yyyy")}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{format(new Date(h.date), "EEEE")}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      <ListToolbar
        search={search}
        onSearch={setSearch}
        onAdd={() => { setEditing(null); setOpen(true) }}
        addLabel="Add Holiday"
        extra={
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="National">National</SelectItem>
              <SelectItem value="Regional">Regional</SelectItem>
              <SelectItem value="Optional">Optional</SelectItem>
              <SelectItem value="Restricted">Restricted</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        emptyState={
          <EmptyState
            icon={CalendarDays}
            title="No holidays configured"
            description="Add national, regional, and optional holidays for the calendar year."
            action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Holiday</Button>}
          />
        }
      />

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update holiday details." : "Configure a new holiday with type and region."}
            </DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={holidayFormSchema}
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
            <DialogTitle>Delete Holiday?</DialogTitle>
            <DialogDescription>This will permanently remove the holiday from the calendar.</DialogDescription>
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
