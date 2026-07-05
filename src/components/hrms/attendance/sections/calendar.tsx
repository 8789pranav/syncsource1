'use client'

import * as React from "react"
import {
  format, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday,
} from "date-fns"
import {
  ChevronLeft, ChevronRight, CalendarRange, CalendarDays,
  RefreshCw, Edit3, Home, Briefcase, MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { SectionCard, EmptyState } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  fetchJson, useAsync, empName, empInitials, fmtTime, fmtDate,
  AttendanceStatusBadge, AttendanceRecord,
  toastSuccess, toastError,
} from "../shared"

// ============================================================
// Status color legend
// ============================================================

const LEGEND: Array<{ label: string; dot: string }> = [
  { label: "Present", dot: "bg-emerald-500" },
  { label: "Absent", dot: "bg-rose-500" },
  { label: "Late", dot: "bg-amber-500" },
  { label: "Leave", dot: "bg-cyan-500" },
  { label: "WFH", dot: "bg-violet-500" },
  { label: "On Duty", dot: "bg-orange-500" },
  { label: "Weekly Off", dot: "bg-slate-400" },
  { label: "Holiday", dot: "bg-slate-600" },
  { label: "Missing Punch", dot: "bg-pink-500" },
]

const STATUS_DOT: Record<string, string> = {
  Present: "bg-emerald-500",
  Absent: "bg-rose-500",
  Late: "bg-amber-500",
  "Half Day": "bg-amber-400",
  EarlyGoing: "bg-amber-300",
  Leave: "bg-cyan-500",
  WFH: "bg-violet-500",
  OnDuty: "bg-orange-500",
  OD: "bg-orange-500",
  WeeklyOff: "bg-slate-400",
  Holiday: "bg-slate-600",
  MissingInPunch: "bg-pink-500",
  MissingOutPunch: "bg-pink-500",
  MissingPunch: "bg-pink-500",
  LWP: "bg-rose-700",
  Permission: "bg-teal-500",
  CompOff: "bg-emerald-400",
}

function navigate(section: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("attendance:navigate", { detail: section }))
  }
}

// ============================================================
// Main
// ============================================================

type ViewMode = "My" | "Team" | "Department"

export function CalendarSection() {
  const [cursor, setCursor] = React.useState<Date>(new Date())
  const [view, setView] = React.useState<ViewMode>("My")
  const [employeeId, setEmployeeId] = React.useState<string>("")
  const [departmentId, setDepartmentId] = React.useState<string>("all")
  const [dayDetail, setDayDetail] = React.useState<{ date: Date; records: AttendanceRecord[] } | null>(null)

  // Load employees & departments for pickers
  const { data: employees } = useAsync<{ id: string; firstName?: string; lastName?: string; displayName?: string | null; employeeCode?: string }[]>(
    () => fetchJson("/api/employees/picker?limit=200").catch(() => []),
    [],
  )
  const { data: departments } = useAsync<{ id: string; name: string }[]>(
    () => fetchJson("/api/departments").catch(() => []),
    [],
  )

  // Month range
  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const grid = eachDayOfInterval({ start: gridStart, end: gridEnd })

  // Fetch attendance for the whole visible grid range
  const fromIso = gridStart.toISOString()
  const toIso = gridEnd.toISOString()
  const url = `/api/attendance?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}${employeeId && view === "My" ? `&employeeId=${employeeId}` : ""}`

  const { data, loading, error, reload } = useAsync<{ items: AttendanceRecord[] }>(
    () => fetchJson(url),
    [url],
  )

  const items = (data?.items || []) as AttendanceRecord[]

  // Group by date (yyyy-MM-dd)
  const byDate = React.useMemo(() => {
    const m = new Map<string, AttendanceRecord[]>()
    for (const r of items) {
      const key = format(new Date(r.date), "yyyy-MM-dd")
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(r)
    }
    return m
  }, [items])

  // Filter by department for "Department" view
  const filterByDept = (recs: AttendanceRecord[]) => {
    if (view !== "Department" || departmentId === "all") return recs
    return recs.filter((r) => r.employee?.department?.id === departmentId)
  }

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  function openDay(date: Date) {
    const key = format(date, "yyyy-MM-dd")
    const recs = filterByDept(byDate.get(key) || [])
    if (recs.length === 0) {
      toastSuccess("No attendance records for this day")
      return
    }
    setDayDetail({ date, records: recs })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Attendance Calendar</h2>
          <p className="text-sm text-muted-foreground">Visual month view — click any day to drill in.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="My">My Calendar</SelectItem>
              <SelectItem value="Team">Team Calendar</SelectItem>
              <SelectItem value="Department">Department Calendar</SelectItem>
            </SelectContent>
          </Select>
          {view === "My" && (
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {(employees || []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {empName(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {view === "Department" && (
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {(departments || []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={() => setCursor(addMonths(cursor, -1))}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <div className="text-base font-semibold">{format(cursor, "MMMM yyyy")}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-9" onClick={() => setCursor(new Date())}>Today</Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={() => setCursor(addMonths(cursor, 1))}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="h-[520px] w-full rounded-xl bg-muted/40 animate-pulse" />
      ) : error ? (
        <SectionCard title="Attendance Calendar">
          <EmptyState
            icon={CalendarRange}
            title="Calendar unavailable"
            description={error}
            action={<Button onClick={reload} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1" /> Retry</Button>}
          />
        </SectionCard>
      ) : (
        <Card className="border-border/60 shadow-soft">
          <CardContent className="p-3 sm:p-4">
            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekdayLabels.map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {grid.map((day) => {
                const key = format(day, "yyyy-MM-dd")
                const recs = filterByDept(byDate.get(key) || [])
                const inMonth = isSameMonth(day, cursor)
                const today = isToday(day)
                const isWeekend = day.getDay() === 0 || day.getDay() === 6

                // Aggregate status counts for the day
                const statusCounts = new Map<string, number>()
                for (const r of recs) {
                  const s = r.status || "Unknown"
                  statusCounts.set(s, (statusCounts.get(s) || 0) + 1)
                }
                const topStatuses = Array.from(statusCounts.entries()).slice(0, 3)

                return (
                  <button
                    key={key}
                    onClick={() => openDay(day)}
                    className={cn(
                      "min-h-[88px] rounded-lg border p-1.5 text-left transition-all",
                      inMonth ? "bg-card" : "bg-muted/30",
                      today ? "border-emerald-500 ring-1 ring-emerald-500/30" : "border-border/60",
                      "hover:border-emerald-400 hover:shadow-soft cursor-pointer",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-xs font-semibold",
                        today ? "text-emerald-600 dark:text-emerald-400" : inMonth ? "text-foreground" : "text-muted-foreground/60",
                      )}>
                        {format(day, "d")}
                      </span>
                      {isWeekend && inMonth && (
                        <span title="Weekend" className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      )}
                      {recs.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{recs.length}</span>
                      )}
                    </div>
                    {/* Status dots / mini badges */}
                    <div className="mt-1 space-y-0.5">
                      {topStatuses.map(([status, count]) => (
                        <div key={status} className="flex items-center gap-1 min-w-0">
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[status] || "bg-muted")} />
                          <span className="text-[10px] text-foreground/80 truncate">
                            {view === "My" ? status : `${count} ${status}`}
                          </span>
                        </div>
                      ))}
                      {recs.length === 0 && inMonth && (
                        <span className="text-[10px] text-muted-foreground/40">No records</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-3 border-t border-border/40">
              {LEGEND.map((l) => (
                <span key={l.label} className="flex items-center gap-1">
                  <span className={cn("h-2 w-2 rounded-full", l.dot)} />
                  {l.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day detail dialog */}
      <DayDetailDialog
        open={!!dayDetail}
        onOpenChange={(o) => !o && setDayDetail(null)}
        date={dayDetail?.date}
        records={dayDetail?.records || []}
      />
    </div>
  )
}

// ============================================================
// Day Detail Dialog
// ============================================================

function DayDetailDialog({
  open, onOpenChange, date, records,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  date?: Date
  records: AttendanceRecord[]
}) {
  const single = records.length === 1 ? records[0] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-emerald-500" />
            {date ? format(date, "EEEE, dd MMM yyyy") : ""}
          </DialogTitle>
          <DialogDescription>
            {records.length} attendance record(s) for this day
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto [scrollbar-width:thin] pr-1">
          {/* If single record — show full detail */}
          {single ? (
            <SingleRecordDetail rec={single} />
          ) : (
            /* Multi records — show as list */
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {empInitials(r.employee)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{empName(r.employee)}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {r.employee?.employeeCode} · {r.employee?.department?.name || "—"}
                    </p>
                  </div>
                  <AttendanceStatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("regularization")}>
            <Edit3 className="h-4 w-4 mr-1.5" /> Regularize
          </Button>
          <Button variant="outline" size="sm" onClick={() => quickAction("WFH")}>
            <Home className="h-4 w-4 mr-1.5" /> Apply WFH
          </Button>
          <Button variant="outline" size="sm" onClick={() => quickAction("OD")}>
            <Briefcase className="h-4 w-4 mr-1.5" /> Apply OD
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function quickAction(_type: string) {
  // For now, navigate to requests section. The actual apply dialog will be implemented by the requests section.
  navigate("wfh-od-permission")
  toastSuccess(`Opening ${_type === "WFH" ? "Work From Home" : "On Duty"} request form…`)
}

function SingleRecordDetail({ rec }: { rec: AttendanceRecord }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
          {empInitials(rec.employee)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{empName(rec.employee)}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {rec.employee?.employeeCode} · {rec.employee?.department?.name || "—"} · {rec.employee?.designation?.name || "—"}
          </p>
        </div>
        <AttendanceStatusBadge status={rec.status} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Shift" value={rec.shift?.code || "—"} />
        <Field label="Source" value={rec.source || "—"} />
        <Field label="First In" value={fmtTime(rec.firstIn || rec.clockIn)} />
        <Field label="Last Out" value={fmtTime(rec.lastOut || rec.clockOut)} />
        <Field label="Work Hours" value={`${(rec.workHours ?? 0).toFixed(2)}h`} />
        <Field label="Overtime" value={`${(rec.overtimeHours ?? 0).toFixed(2)}h`} />
        <Field label="Late By" value={typeof rec.lateBy === "number" && rec.lateBy > 0 ? `${rec.lateBy}m` : "—"} />
        <Field label="Early By" value={typeof rec.earlyBy === "number" && rec.earlyBy > 0 ? `${rec.earlyBy}m` : "—"} />
      </div>

      {rec.geoAddress && (
        <div className="rounded-lg border border-border/60 p-3 text-xs">
          <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Geo Location
          </p>
          <p className="text-foreground">{rec.geoAddress}</p>
          {rec.geoLat && rec.geoLng && (
            <p className="text-muted-foreground mt-1">{rec.geoLat.toFixed(5)}, {rec.geoLng.toFixed(5)}</p>
          )}
        </div>
      )}

      {rec.remarks && (
        <div className="rounded-lg border border-border/60 p-3 text-xs">
          <p className="text-muted-foreground mb-0.5">Remarks</p>
          <p className="text-foreground">{rec.remarks}</p>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5 tabular-nums">{value}</p>
    </div>
  )
}
