"use client"

// ============================================================
// TimelineTab — vertical timeline of the employee journey.
// API: /api/employees/[id]/timeline (GET list, POST create).
// ------------------------------------------------------------

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format, differenceInDays } from "date-fns"
import {
  Plus, Calendar, ChevronDown, ChevronUp, History, User, UserPlus,
  FileText, CalendarCheck, Wallet, TrendingUp, Shuffle, UserCog,
  ClipboardCheck, Laptop, LogOut, Activity, RefreshCw,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
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
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { EmptyState } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- types ----------

interface TimelineEvent {
  id: string
  eventType: string
  title: string
  description?: string | null
  eventDate: string | Date
  actorId?: string | null
  actorName?: string | null
  metadata?: string | null
}

// ---------- helpers ----------

const EVENT_TYPES = [
  "Created", "Joined", "Profile updated", "Document uploaded", "Leave approved",
  "Attendance regularized", "Salary revised", "Promoted", "Transferred",
  "Manager changed", "Probation confirmed", "Asset assigned",
  "Resignation submitted", "Exit completed", "Status changed",
] as const

type EventStyle = { icon: LucideIcon; color: string; dot: string; line: string }

const EVENT_STYLES: Record<string, EventStyle> = {
  Created: { icon: User, color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", line: "bg-emerald-500/40" },
  Joined: { icon: UserPlus, color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", line: "bg-emerald-500/40" },
  "Profile updated": { icon: Activity, color: "text-cyan-600 dark:text-cyan-400", dot: "bg-cyan-500", line: "bg-cyan-500/40" },
  "Document uploaded": { icon: FileText, color: "text-cyan-600 dark:text-cyan-400", dot: "bg-cyan-500", line: "bg-cyan-500/40" },
  "Leave approved": { icon: CalendarCheck, color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500", line: "bg-amber-500/40" },
  "Attendance regularized": { icon: RefreshCw, color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500", line: "bg-amber-500/40" },
  "Salary revised": { icon: Wallet, color: "text-fuchsia-600 dark:text-fuchsia-400", dot: "bg-fuchsia-500", line: "bg-fuchsia-500/40" },
  Promoted: { icon: TrendingUp, color: "text-teal-600 dark:text-teal-400", dot: "bg-teal-500", line: "bg-teal-500/40" },
  Transferred: { icon: Shuffle, color: "text-cyan-600 dark:text-cyan-400", dot: "bg-cyan-500", line: "bg-cyan-500/40" },
  "Manager changed": { icon: UserCog, color: "text-cyan-600 dark:text-cyan-400", dot: "bg-cyan-500", line: "bg-cyan-500/40" },
  "Probation confirmed": { icon: ClipboardCheck, color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", line: "bg-emerald-500/40" },
  "Asset assigned": { icon: Laptop, color: "text-teal-600 dark:text-teal-400", dot: "bg-teal-500", line: "bg-teal-500/40" },
  "Resignation submitted": { icon: LogOut, color: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500", line: "bg-rose-500/40" },
  "Exit completed": { icon: LogOut, color: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500", line: "bg-rose-500/40" },
  "Status changed": { icon: Activity, color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500", line: "bg-amber-500/40" },
}

function getStyle(eventType: string): EventStyle {
  return EVENT_STYLES[eventType] || { icon: Activity, color: "text-muted-foreground", dot: "bg-muted-foreground", line: "bg-muted-foreground/40" }
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

function fmtDateRange(items: TimelineEvent[]) {
  if (items.length === 0) return null
  const dates = items.map((i) => new Date(i.eventDate).getTime()).filter((t) => !isNaN(t))
  if (dates.length === 0) return null
  const first = new Date(Math.min(...dates))
  const last = new Date(Math.max(...dates))
  const days = differenceInDays(last, first)
  return `${fmtDate(first)} → ${fmtDate(last)} (${days} day${days === 1 ? "" : "s"})`
}

function prettyJson(s?: string | null) {
  if (!s) return null
  try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return s }
}

// ============================================================
// Component
// ============================================================

export default function TimelineTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<TimelineEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [reverse, setReverse] = React.useState(true) // newest first by default
  const [addOpen, setAddOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/timeline`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load timeline")
      setItems(data?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load timeline")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  const filtered = React.useMemo(() => {
    const list = typeFilter === "all" ? items : items.filter((i) => i.eventType === typeFilter)
    const sorted = [...list].sort((a, b) => {
      const da = new Date(a.eventDate).getTime()
      const db = new Date(b.eventDate).getTime()
      return reverse ? db - da : da - db
    })
    return sorted
  }, [items, typeFilter, reverse])

  const rangeStr = fmtDateRange(items)

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
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Timeline</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Complete employee journey — joining, profile changes, leaves, salary revisions, promotions, transfers, probation, assets, resignation, and exit events.
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Add Event
        </Button>
      </div>

      {/* Stats + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="outline" className="gap-1.5">
            <History className="h-3 w-3" /> {items.length} event{items.length === 1 ? "" : "s"}
          </Badge>
          {rangeStr && (
            <span className="text-xs">{rangeStr}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[180px]">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All event types</SelectItem>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => setReverse((r) => !r)}>
            {reverse ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            {reverse ? "Newest first" : "Oldest first"}
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border/60">
          <EmptyState
            icon={History}
            title="No timeline events"
            description="No events match the current filter, or this employee has no recorded events yet."
            action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Event</Button>}
          />
        </div>
      ) : (
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
          <ul className="space-y-5">
            {filtered.map((ev, idx) => {
              const style = getStyle(ev.eventType)
              const Icon = style.icon
              const meta = prettyJson(ev.metadata)
              return (
                <motion.li
                  key={ev.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(idx * 0.02, 0.3) }}
                  className="relative"
                >
                  {/* Dot */}
                  <span className={cn(
                    "absolute -left-[19px] top-1 grid h-5 w-5 place-items-center rounded-full ring-4 ring-background",
                    style.dot
                  )}>
                    <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-card" />
                  </span>
                  <div className="rounded-xl border border-border/60 bg-card p-4 shadow-soft hover:shadow-card transition-shadow">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted", style.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">{ev.title}</p>
                            <Badge variant="secondary" className={cn("font-medium border-0 bg-muted text-muted-foreground")}>
                              {ev.eventType}
                            </Badge>
                          </div>
                          {ev.description && (
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{ev.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground/70 mt-1.5">
                            {fmtDate(ev.eventDate)}{ev.actorName ? ` · by ${ev.actorName}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                    {meta && (
                      <Collapsible className="mt-3">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground">
                            <ChevronDown className="h-3 w-3" /> Metadata
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <pre className="text-xs bg-muted/60 rounded-lg p-3 mt-2 overflow-x-auto whitespace-pre-wrap font-mono">
                            {meta}
                          </pre>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Add event dialog */}
      <AddEventDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        employeeId={employeeId}
        onCreated={load}
      />
    </motion.div>
  )
}

// ============================================================
// Add Event Dialog
// ============================================================

function AddEventDialog({
  open, onOpenChange, employeeId, onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  onCreated: () => void
}) {
  const [form, setForm] = React.useState({
    eventType: "Profile updated",
    title: "",
    description: "",
    eventDate: format(new Date(), "yyyy-MM-dd"),
    metadata: "",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setForm({
        eventType: "Profile updated",
        title: "",
        description: "",
        eventDate: format(new Date(), "yyyy-MM-dd"),
        metadata: "",
      })
    }
  }, [open])

  async function handleSubmit() {
    if (!form.title.trim()) {
      toast.error("Title is required")
      return
    }
    if (form.metadata.trim()) {
      try { JSON.parse(form.metadata) } catch {
        toast.error("Metadata must be valid JSON")
        return
      }
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: form.eventType,
          title: form.title,
          description: form.description || undefined,
          eventDate: new Date(form.eventDate).toISOString(),
          actorName: "HR Admin",
          metadata: form.metadata || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to add event")
      toast.success("Event added to timeline")
      onOpenChange(false)
      onCreated()
    } catch (e: any) {
      toast.error(e.message || "Failed to add event")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Timeline Event
          </DialogTitle>
          <DialogDescription>
            Manually log an event on the employee timeline.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Event type <span className="text-rose-500">*</span></Label>
              <Select value={form.eventType} onValueChange={(v) => setForm({ ...form, eventType: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Event date <span className="text-rose-500">*</span></Label>
              <Input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Title <span className="text-rose-500">*</span></Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Short title for this event"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description..."
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Metadata (JSON)</Label>
            <Textarea
              value={form.metadata}
              onChange={(e) => setForm({ ...form, metadata: e.target.value })}
              placeholder='{"key": "value"}'
              rows={3}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">Optional. Must be valid JSON.</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
