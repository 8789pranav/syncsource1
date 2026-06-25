'use client'

import * as React from "react"
import { toast } from "sonner"
import {
  ChevronLeft, ChevronRight, CalendarRange, Filter, CalendarDays,
} from "lucide-react"
import { format, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { SectionCard, EmptyState, StatusBadge } from "@/components/hrms/ui"
import {
  fetchJson, useAsync, empName, empInitials, fmtDate,
  Holiday, LeaveApplication, WEEKDAYS, EmployeeLite,
} from "../shared"

interface DayEntry {
  employeeId: string
  employeeName?: string
  employee?: EmployeeLite | null
  leaveTypeCode?: string
  leaveTypeColor?: string
  status: string
  halfDay?: boolean
}

interface CalendarResp {
  days?: Record<string, DayEntry[]>
  holidays?: Holiday[]
  weeklyOffs?: Array<{ fixedDays?: string; weekOffType?: string }>
}

export function CalendarSection() {
  const [cursor, setCursor] = React.useState<Date>(new Date())
  const [view, setView] = React.useState<"My" | "Team" | "Department" | "Company">("Company")
  const [departmentId, setDepartmentId] = React.useState<string>("all")
  const [dayDetail, setDayDetail] = React.useState<{ date: Date; entries: DayEntry[] } | null>(null)

  const { data: departments } = useAsync<{ id: string; name: string }[]>(
    () => fetchJson("/api/departments"),
    [],
  )

  const month = format(cursor, "yyyy-MM")
  const { data, loading, error } = useAsync<CalendarResp>(
    () => fetchJson(`/api/leave-calendar?month=${month}&departmentId=${departmentId === "all" ? "" : departmentId}&view=${view}`),
    [month, departmentId, view],
  )

  // Holidays + weekly offs (fallback to global fetch)
  const { data: holidays } = useAsync<Holiday[]>(
    () => fetchJson("/api/holidays").catch(() => [] as Holiday[]),
    [],
  )

  const days = data?.days || {}
  const holidayByDate = React.useMemo(() => {
    const m = new Map<string, Holiday>()
    for (const h of (data?.holidays || holidays || [])) {
      try { m.set(format(parseISO(String(h.date)), "yyyy-MM-dd"), h) } catch { /* skip */ }
    }
    return m
  }, [data, holidays])

  const weeklyOffNums = React.useMemo(() => {
    const nums = new Set<number>()
    for (const w of (data?.weeklyOffs || [])) {
      if (w.fixedDays) w.fixedDays.split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => {
        const n = parseInt(s, 10); if (!isNaN(n)) nums.add(n)
      })
    }
    if (nums.size === 0) nums.add(0) // default Sunday off
    return nums
  }, [data])

  // Build calendar grid
  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const grid = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Leave Calendar</h2>
          <p className="text-sm text-muted-foreground">Monthly view of who is on leave across the organisation.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={view} onValueChange={(v) => setView(v as any)}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="My">My Leaves</SelectItem>
              <SelectItem value="Team">Team</SelectItem>
              <SelectItem value="Department">Department</SelectItem>
              <SelectItem value="Company">Company</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {(departments || []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
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

      {loading ? (
        <Skeleton className="h-[520px] w-full rounded-xl" />
      ) : error ? (
        <SectionCard title="Leave Calendar">
          <EmptyState
            icon={CalendarRange}
            title="Calendar unavailable"
            description="The leave calendar API isn't ready yet. Please try again later."
            action={<Button onClick={() => window.location.reload()} variant="outline" size="sm">Retry</Button>}
          />
        </SectionCard>
      ) : (
        <Card className="border-border/60 shadow-soft">
          <CardContent className="p-3 sm:p-4">
            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground py-1">
                  {d.slice(0, 3)}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {grid.map((day) => {
                const key = format(day, "yyyy-MM-dd")
                const entries = days[key] || []
                const inMonth = isSameMonth(day, cursor)
                const today = isToday(day)
                const holiday = holidayByDate.get(key)
                const isWeeklyOff = weeklyOffNums.has(day.getDay())
                return (
                  <button
                    key={key}
                    onClick={() => entries.length > 0 && setDayDetail({ date: day, entries })}
                    className={[
                      "min-h-[84px] rounded-lg border p-1.5 text-left transition-colors",
                      inMonth ? "bg-card" : "bg-muted/30",
                      today ? "border-emerald-500 ring-1 ring-emerald-500/30" : "border-border/60",
                      entries.length > 0 ? "hover:border-emerald-400 hover:shadow-soft cursor-pointer" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <span className={[
                        "text-xs font-semibold",
                        today ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
                      ].join(" ")}>
                        {format(day, "d")}
                      </span>
                      {holiday && (
                        <span title={holiday.name} className="h-2 w-2 rounded-full bg-rose-500" />
                      )}
                      {isWeeklyOff && !holiday && (
                        <span title="Weekly off" className="h-2 w-2 rounded-full bg-cyan-400" />
                      )}
                    </div>
                    {/* Holiday banner */}
                    {holiday && (
                      <p className="mt-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400 truncate" title={holiday.name}>
                        {holiday.name}
                      </p>
                    )}
                    {/* Leave chips */}
                    <div className="mt-1 space-y-0.5">
                      {entries.slice(0, 3).map((e, i) => (
                        <div key={i} className="flex items-center gap-1 min-w-0">
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: e.leaveTypeColor || "#10b981" }} />
                          <span className="text-[10px] text-foreground/80 truncate">
                            {e.employeeName || empName(e.employee)}
                          </span>
                        </div>
                      ))}
                      {entries.length > 3 && (
                        <p className="text-[10px] text-muted-foreground">+{entries.length - 3} more</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Holiday</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-400" /> Weekly Off</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Approved</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Pending</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day detail dialog */}
      <Dialog open={!!dayDetail} onOpenChange={(o) => !o && setDayDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-emerald-500" />
              {dayDetail && format(dayDetail.date, "EEEE, dd MMM yyyy")}
            </DialogTitle>
            <DialogDescription>{dayDetail?.entries.length || 0} employee(s) on leave</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto [scrollbar-width:thin] pr-1">
            {dayDetail?.entries.map((e, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {empInitials(e.employee)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.employeeName || empName(e.employee)}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: e.leaveTypeColor || "#10b981" }} />
                    {e.leaveTypeCode || "Leave"} {e.halfDay && "· Half day"}
                  </p>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
