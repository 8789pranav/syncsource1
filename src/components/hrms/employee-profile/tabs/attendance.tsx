"use client"

// ============================================================
// AttendanceTab — monthly attendance calendar + punch history +
// regularize dialog.
// ------------------------------------------------------------
// API: GET /api/attendance?employeeId=&from=&to=
//      PATCH /api/attendance/<recordId>
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, getDate } from "date-fns"
import {
  CalendarCheck, CalendarX, Clock, Home, CalendarClock,
  CalendarOff, ChevronLeft, ChevronRight, Pencil, RefreshCw, X, Loader2, CalendarDays,
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { SectionCard, EmptyState, StatCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- types ----------

interface AttendanceRec {
  id: string
  date: string | Date
  clockIn?: string | Date | null
  clockOut?: string | Date | null
  status: string
  workHours: number
  overtimeHours?: number
  isLate?: boolean
  isEarlyGoing?: boolean
  remarks?: string | null
  source?: string
}

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  Present: { label: "Present", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400", dot: "bg-emerald-500" },
  Absent: { label: "Absent", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400", dot: "bg-rose-500" },
  Late: { label: "Late", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400", dot: "bg-amber-500" },
  "Half Day": { label: "Half Day", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400", dot: "bg-amber-400" },
  WFH: { label: "WFH", cls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400", dot: "bg-cyan-500" },
  Leave: { label: "Leave", cls: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400", dot: "bg-fuchsia-500" },
  "Weekly Off": { label: "Weekly Off", cls: "bg-muted text-muted-foreground", dot: "bg-slate-400" },
  Holiday: { label: "Holiday", cls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400", dot: "bg-cyan-400" },
  OD: { label: "On Duty", cls: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400", dot: "bg-teal-500" },
}

function statusMeta(s?: string) {
  return STATUS_META[s || ""] || { label: s || "—", cls: "bg-muted text-muted-foreground", dot: "bg-slate-400" }
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}
function fmtTime(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "hh:mm a") } catch { return "—" }
}
function fmtMonth(d: Date) { return format(d, "MMMM yyyy") }

// ============================================================
// Component
// ============================================================

export default function AttendanceTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<AttendanceRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [month, setMonth] = React.useState<Date>(startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null)
  const [regularizeTarget, setRegularizeTarget] = React.useState<AttendanceRec | null>(null)

  const fromStr = format(startOfMonth(month), "yyyy-MM-dd") + "T00:00:00"
  const toStr = format(endOfMonth(month), "yyyy-MM-dd") + "T23:59:59"

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/attendance?employeeId=${encodeURIComponent(employeeId)}&from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load attendance")
      setItems(data?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load attendance")
    } finally {
      setLoading(false)
    }
  }, [employeeId, fromStr, toStr])

  React.useEffect(() => { load() }, [load])

  // Map of yyyy-MM-dd -> rec
  const byDate = React.useMemo(() => {
    const m = new Map<string, AttendanceRec>()
    for (const it of items) {
      const k = format(new Date(it.date), "yyyy-MM-dd")
      m.set(k, it)
    }
    return m
  }, [items])

  // Build calendar grid (with leading/trailing outside-days)
  const calendarDays = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [month])

  const counts = React.useMemo(() => {
    const c = { Present: 0, Absent: 0, Late: 0, WFH: 0, "Half Day": 0, Leave: 0, "Weekly Off": 0, Holiday: 0 }
    for (const it of items) {
      const s = it.status as keyof typeof c
      if (s in c) c[s]++
    }
    return c
  }, [items])

  const selectedRec = selectedDay ? byDate.get(format(selectedDay, "yyyy-MM-dd")) : undefined

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
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Attendance</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Monthly attendance with color-coded calendar, punch history and one-click regularization.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Month navigation + Calendar */}
      <SectionCard
        title="Attendance Calendar"
        description="Click any day to view punch details. Color indicates attendance status."
        action={
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setMonth(subMonths(month, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">{fmtMonth(month)}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 ml-1" onClick={() => setMonth(startOfMonth(new Date()))}>
              Today
            </Button>
          </div>
        }
      >
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
          {(["Present", "Absent", "Late", "WFH", "Leave", "Half Day", "Weekly Off", "Holiday"] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("h-2.5 w-2.5 rounded-full", statusMeta(s).dot)} />
              {s}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day) => {
                const key = format(day, "yyyy-MM-dd")
                const rec = byDate.get(key)
                const meta = rec ? statusMeta(rec.status) : null
                const inMonth = isSameMonth(day, month)
                const isToday = isSameDay(day, new Date())
                const isSel = selectedDay && isSameDay(day, selectedDay)
                const dow = getDay(day)
                const isWeekend = dow === 0 || dow === 6
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "relative aspect-square rounded-lg border p-1.5 text-left transition-all hover:shadow-soft",
                      "flex flex-col justify-between items-stretch",
                      inMonth ? "bg-card border-border/60" : "bg-muted/30 border-transparent opacity-50",
                      isSel && "ring-2 ring-emerald-500 ring-offset-1 ring-offset-background",
                      isToday && !isSel && "border-emerald-400",
                    )}
                    title={rec ? `${rec.status} · ${fmtDate(rec.date)}` : fmtDate(day)}
                  >
                    <span className={cn(
                      "text-xs font-semibold tabular-nums",
                      inMonth ? "text-foreground" : "text-muted-foreground",
                      isToday && "text-emerald-600 dark:text-emerald-400",
                    )}>
                      {getDate(day)}
                    </span>
                    {rec && (
                      <div className="flex flex-col items-start gap-0.5">
                        <span className={cn("inline-block h-2 w-2 rounded-full", meta!.dot)} />
                        <span className="text-[10px] leading-none text-muted-foreground truncate w-full">
                          {rec.clockIn ? format(new Date(rec.clockIn), "HH:mm") : ""}
                          {rec.clockOut ? ` – ${format(new Date(rec.clockOut), "HH:mm")}` : ""}
                        </span>
                      </div>
                    )}
                    {!rec && inMonth && isWeekend && (
                      <span className="text-[10px] text-muted-foreground/60">Off</span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </SectionCard>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Present" value={counts.Present} icon={CalendarCheck} accent="emerald" />
        <StatCard label="Absent" value={counts.Absent} icon={CalendarX} accent="coral" />
        <StatCard label="Late" value={counts.Late} icon={Clock} accent="amber" />
        <StatCard label="WFH" value={counts.WFH} icon={Home} accent="cyan" />
        <StatCard label="Half Day" value={counts["Half Day"]} icon={CalendarClock} accent="amber" />
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <SectionCard
          title={`Day Detail · ${fmtDate(selectedDay)}`}
          action={
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedDay(null)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          }
        >
          {selectedRec ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="secondary" className={cn("font-medium border-0 mt-1", statusMeta(selectedRec.status).cls)}>
                  {selectedRec.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clock In</p>
                <p className="font-medium mt-1">{fmtTime(selectedRec.clockIn)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clock Out</p>
                <p className="font-medium mt-1">{fmtTime(selectedRec.clockOut)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Work Hours</p>
                <p className="font-medium mt-1">{selectedRec.workHours?.toFixed(2) || "0"}h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Source</p>
                <p className="font-medium mt-1">{selectedRec.source || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Flags</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {selectedRec.isLate && <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Late</Badge>}
                  {selectedRec.isEarlyGoing && <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Early Going</Badge>}
                  {!selectedRec.isLate && !selectedRec.isEarlyGoing && <span className="text-muted-foreground text-sm">—</span>}
                </div>
              </div>
              <div className="col-span-2 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Remarks</p>
                <p className="font-medium mt-1">{selectedRec.remarks || "—"}</p>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRegularizeTarget(selectedRec)}>
                  <Pencil className="h-3.5 w-3.5" /> Regularize
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={CalendarOff}
              title="No attendance record"
              description="There is no punch-in / attendance entry for this day."
            />
          )}
        </SectionCard>
      )}

      {/* Punch history table */}
      <SectionCard title="Punch History" description={`${items.length} records · ${fmtMonth(month)}`}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No attendance records"
            description="No punches logged for this month yet."
          />
        ) : (
          <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
            <ScrollArea className="max-h-[480px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clock In</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clock Out</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hrs</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flags</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => {
                    const meta = statusMeta(r.status)
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{fmtDate(r.date)}</TableCell>
                        <TableCell className="tabular-nums">{fmtTime(r.clockIn)}</TableCell>
                        <TableCell className="tabular-nums">{fmtTime(r.clockOut)}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{r.workHours?.toFixed(2) || "0"}h</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium border-0", meta.cls)}>{r.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.source || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {r.isLate && <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Late</Badge>}
                            {r.isEarlyGoing && <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Early</Badge>}
                            {!r.isLate && !r.isEarlyGoing && <span className="text-muted-foreground text-sm">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="h-7 gap-1.5" onClick={() => setRegularizeTarget(r)}>
                            <Pencil className="h-3.5 w-3.5" /> Regularize
                          </Button>
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

      {/* Regularize dialog */}
      <RegularizeDialog
        open={!!regularizeTarget}
        onOpenChange={(o) => !o && setRegularizeTarget(null)}
        rec={regularizeTarget}
        onSaved={load}
      />
    </motion.div>
  )
}

// ============================================================
// Regularize Dialog
// ============================================================

const REG_STATUS_OPTIONS = ["Present", "Absent", "Late", "Half Day", "WFH", "Leave", "Weekly Off", "Holiday", "OD"]

function RegularizeDialog({
  open, onOpenChange, rec, onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  rec: AttendanceRec | null
  onSaved: () => void
}) {
  const [status, setStatus] = React.useState("Present")
  const [clockIn, setClockIn] = React.useState("")
  const [clockOut, setClockOut] = React.useState("")
  const [remarks, setRemarks] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open && rec) {
      setStatus(rec.status || "Present")
      try {
        setClockIn(rec.clockIn ? format(new Date(rec.clockIn), "yyyy-MM-dd'T'HH:mm") : "")
      } catch { setClockIn("") }
      try {
        setClockOut(rec.clockOut ? format(new Date(rec.clockOut), "yyyy-MM-dd'T'HH:mm") : "")
      } catch { setClockOut("") }
      setRemarks(rec.remarks || "")
    }
  }, [open, rec])

  async function handleSubmit() {
    if (!rec) return
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        status,
        remarks: remarks || undefined,
        source: "Manual",
      }
      if (clockIn) payload.clockIn = new Date(clockIn).toISOString()
      else payload.clockIn = null
      if (clockOut) payload.clockOut = new Date(clockOut).toISOString()
      else payload.clockOut = null
      // Auto-set flags
      payload.isLate = status === "Late"
      payload.isEarlyGoing = false
      const res = await fetch(`/api/attendance/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to regularize")
      toast.success("Attendance regularized")
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to regularize")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Regularize Attendance</DialogTitle>
          <DialogDescription>
            {rec ? `${rec.status} · ${fmtDate(rec.date)}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Status <span className="text-rose-500">*</span></Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {REG_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Clock In</Label>
              <Input
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Clock Out</Label>
              <Input
                type="datetime-local"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Reason for regularization..."
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Source: Manual</Badge>
            <span>Regularizations are logged in the audit trail.</span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            Save Regularization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
