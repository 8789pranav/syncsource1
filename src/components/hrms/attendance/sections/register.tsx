'use client'

import * as React from "react"
import { format, startOfMonth, endOfMonth, getDaysInMonth, getMonth, getYear } from "date-fns"
import {
  CalendarDays, ChevronLeft, ChevronRight, Download, Filter, Search,
  Eye, Edit3, CheckCircle2, XCircle, LogIn,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Column, DataTable, EmptyState, SectionCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"
import {
  fetchJson, sendJson, useAsync, empName, empInitials, fmtTime, fmtDate,
  AttendanceStatusBadge, AttendanceRecord, EmployeeLite,
  toastError, toastSuccess, downloadCSV, TableSkeleton,
} from "../shared"

// ============================================================
// Helpers / constants
// ============================================================

const STATUS_CODE: Record<string, string> = {
  Present: "P", Absent: "A", "Half Day": "HD", Late: "L", EarlyGoing: "EG",
  Leave: "LV", WFH: "W", OnDuty: "OD", OD: "OD", WeeklyOff: "WO", Holiday: "H",
  MissingInPunch: "MP", MissingOutPunch: "MP", MissingPunch: "MP", LWP: "LW",
  Permission: "PM", CompOff: "CO", NotYetPunched: "—",
}

const STATUS_CELL_COLOR: Record<string, string> = {
  P: "bg-emerald-500 text-white", A: "bg-rose-500 text-white", HD: "bg-amber-400 text-white",
  L: "bg-amber-500 text-white", EG: "bg-amber-300 text-white", LV: "bg-cyan-500 text-white",
  W: "bg-violet-500 text-white", OD: "bg-orange-500 text-white",
  WO: "bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-100",
  H: "bg-slate-400 text-white", MP: "bg-pink-500 text-white", LW: "bg-rose-700 text-white",
  PM: "bg-teal-500 text-white", CO: "bg-emerald-400 text-white",
  "—": "bg-muted text-muted-foreground",
}

const LEGEND = [
  ["P", "Present"], ["A", "Absent"], ["L", "Late"], ["HD", "Half Day"],
  ["W", "WFH"], ["OD", "On Duty"], ["LV", "Leave"], ["WO", "Weekly Off"],
  ["H", "Holiday"], ["MP", "Missing Punch"],
] as const

function statusToCode(status?: string): string {
  if (!status) return "—"
  return STATUS_CODE[status] || "—"
}

function lateByMins(r: AttendanceRecord): number {
  return typeof r.lateBy === "number" ? r.lateBy : 0
}

function earlyByMins(r: AttendanceRecord): number {
  return typeof r.earlyBy === "number" ? r.earlyBy : 0
}

function navigate(section: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("attendance:navigate", { detail: section }))
  }
}

// Shared month navigation strip
function MonthStrip({ cursor, setCursor, label, extra }: {
  cursor: Date; setCursor: (d: Date) => void; label: string; extra?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-sm font-medium min-w-[110px] text-center">{label}</div>
      <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" className="h-9" onClick={() => setCursor(new Date())}>This Month</Button>
      {extra}
    </div>
  )
}

// ============================================================
// Main
// ============================================================

export function RegisterSection() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Attendance Register</h2>
        <p className="text-sm text-muted-foreground">
          Daily punch details, monthly grid view, and per-employee summary for payroll.
        </p>
      </div>
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="daily">Daily View</TabsTrigger>
          <TabsTrigger value="monthly">Monthly View</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="mt-3"><DailyView /></TabsContent>
        <TabsContent value="monthly" className="mt-3"><MonthlyView /></TabsContent>
        <TabsContent value="summary" className="mt-3"><SummaryView /></TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// Daily View
// ============================================================

function DailyView() {
  const [date, setDate] = React.useState<Date>(new Date())
  const [departmentId, setDepartmentId] = React.useState<string>("all")
  const [search, setSearch] = React.useState("")
  const [selected, setSelected] = React.useState<AttendanceRecord | null>(null)
  const dateStr = format(date, "yyyy-MM-dd")

  const { data: departments } = useAsync<{ id: string; name: string }[]>(
    () => fetchJson("/api/departments").catch(() => []),
    [],
  )

  const from = new Date(date); from.setHours(0, 0, 0, 0)
  const to = new Date(date); to.setHours(23, 59, 59, 999)
  const { data, loading, error, reload } = useAsync<{ items: AttendanceRecord[] }>(
    () => fetchJson(`/api/attendance?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`),
    [dateStr],
  )

  const items = (data?.items || []) as AttendanceRecord[]
  const filtered = React.useMemo(() => {
    return items.filter((r) => {
      const name = empName(r.employee).toLowerCase()
      const code = (r.employee?.employeeCode || "").toLowerCase()
      const q = search.trim().toLowerCase()
      if (q && !name.includes(q) && !code.includes(q)) return false
      if (departmentId !== "all" && r.employee?.department?.id !== departmentId) return false
      return true
    })
  }, [items, search, departmentId])

  const columns: Column<AttendanceRecord>[] = [
    {
      key: "employee", header: "Employee", width: "240px",
      render: (r) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
            {empInitials(r.employee)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{empName(r.employee)}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {r.employee?.employeeCode} · {r.employee?.department?.name || "—"}
            </p>
          </div>
        </div>
      ),
    },
    { key: "entity", header: "Entity", width: "120px", render: (r) => <span className="text-xs text-muted-foreground">{r.employee?.entity?.tradeName || r.employee?.entity?.legalName || "—"}</span> },
    { key: "shift", header: "Shift", width: "100px", render: (r) => <span className="text-xs">{r.shift?.code || "—"}</span> },
    { key: "firstIn", header: "First In", width: "90px", render: (r) => <span className="text-xs tabular-nums">{fmtTime(r.firstIn || r.clockIn)}</span> },
    { key: "lastOut", header: "Last Out", width: "90px", render: (r) => <span className="text-xs tabular-nums">{fmtTime(r.lastOut || r.clockOut)}</span> },
    { key: "workHours", header: "Hours", width: "70px", render: (r) => <span className="text-xs tabular-nums">{(r.workHours ?? 0).toFixed(2)}h</span> },
    {
      key: "lateBy", header: "Late By", width: "70px",
      render: (r) => {
        const m = lateByMins(r)
        return m > 0 ? <span className="text-xs text-amber-600 dark:text-amber-400 tabular-nums">{m}m</span> : <span className="text-xs text-muted-foreground">—</span>
      },
    },
    {
      key: "earlyBy", header: "Early By", width: "70px",
      render: (r) => {
        const m = earlyByMins(r)
        return m > 0 ? <span className="text-xs text-amber-600 dark:text-amber-400 tabular-nums">{m}m</span> : <span className="text-xs text-muted-foreground">—</span>
      },
    },
    {
      key: "overtime", header: "OT", width: "60px",
      render: (r) => r.overtimeHours > 0
        ? <span className="text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">{r.overtimeHours.toFixed(2)}h</span>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
    { key: "status", header: "Status", width: "120px", render: (r) => <AttendanceStatusBadge status={r.status} /> },
    { key: "source", header: "Source", width: "90px", render: (r) => <span className="text-[11px] text-muted-foreground">{r.source || "—"}</span> },
    {
      key: "actions", header: "", width: "48px",
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Filter className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => setSelected(r)}>
                <Eye className="h-4 w-4 mr-2" /> View Logs
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("regularization")}>
                <Edit3 className="h-4 w-4 mr-2" /> Regularize
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => quickMark(r.id, "Present", reload)}>
                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" /> Mark Present
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => quickMark(r.id, "Absent", reload)}>
                <XCircle className="h-4 w-4 mr-2 text-rose-500" /> Mark Absent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <CalendarDays className="h-4 w-4 text-emerald-500" />
                {format(date, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
            </PopoverContent>
          </Popover>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {(departments || []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee…" className="pl-9 h-9" />
        </div>
      </div>

      {loading ? <TableSkeleton />
        : error ? (
          <SectionCard title="Daily Attendance">
            <EmptyState icon={LogIn} title="Failed to load" description={error}
              action={<Button size="sm" variant="outline" onClick={reload}>Retry</Button>} />
          </SectionCard>
        )
        : filtered.length === 0 ? (
          <SectionCard title={`Attendance for ${format(date, "dd MMM yyyy")}`}>
            <EmptyState icon={CalendarDays} title="No attendance records"
              description="No punches recorded for the selected date / filters." />
          </SectionCard>
        )
        : (
          <DataTable columns={columns} rows={filtered as any}
            onRowClick={(r) => setSelected(r as any)}
            emptyState={<EmptyState icon={CalendarDays} title="No records" />} />
        )
      }

      <RecordDetailSheet record={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

async function quickMark(id: string, status: string, reload: () => void) {
  try {
    await sendJson(`/api/attendance/${id}`, { status }, "PATCH")
    toastSuccess(`Marked as ${status}`)
    reload()
  } catch (e) {
    toastError(e, "Failed to update")
  }
}

// ============================================================
// RecordDetailSheet — shared by Daily + Monthly
// ============================================================

function RecordDetailSheet({ record, onClose }: {
  record: AttendanceRecord | null; onClose: () => void
}) {
  return (
    <Sheet open={!!record} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <SheetTitle className="flex items-center gap-2">
            <LogIn className="h-4 w-4 text-emerald-500" /> Attendance Detail
          </SheetTitle>
          <SheetDescription>
            {record ? `${fmtDate(record.date)} · ${record.employee?.employeeCode || ""}` : "—"}
          </SheetDescription>
        </SheetHeader>
        {record && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {empInitials(record.employee)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{empName(record.employee)}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {record.employee?.employeeCode} · {record.employee?.department?.name || "—"}
                </p>
              </div>
              <div className="ml-auto"><AttendanceStatusBadge status={record.status} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailRow label="Shift" value={record.shift?.code || "—"} />
              <DetailRow label="Source" value={record.source || "—"} />
              <DetailRow label="First In" value={fmtTime(record.firstIn || record.clockIn)} />
              <DetailRow label="Last Out" value={fmtTime(record.lastOut || record.clockOut)} />
              <DetailRow label="Work Hours" value={`${(record.workHours ?? 0).toFixed(2)}h`} />
              <DetailRow label="Overtime" value={`${(record.overtimeHours ?? 0).toFixed(2)}h`} />
              <DetailRow label="Late By" value={lateByMins(record) > 0 ? `${lateByMins(record)}m` : "—"} />
              <DetailRow label="Early By" value={earlyByMins(record) > 0 ? `${earlyByMins(record)}m` : "—"} />
            </div>

            {record.geoAddress && (
              <div className="rounded-lg border border-border/60 p-3 text-xs">
                <p className="text-muted-foreground mb-0.5">Geo Location</p>
                <p className="text-foreground">{record.geoAddress}</p>
                {record.geoLat && record.geoLng && (
                  <p className="text-muted-foreground mt-1">{record.geoLat.toFixed(5)}, {record.geoLng.toFixed(5)}</p>
                )}
              </div>
            )}

            {record.remarks && (
              <div className="rounded-lg border border-border/60 p-3 text-xs">
                <p className="text-muted-foreground mb-0.5">Remarks</p>
                <p className="text-foreground">{record.remarks}</p>
              </div>
            )}
          </div>
        )}
        <SheetFooter className="px-5 py-3 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={() => navigate("regularization")}>
            <Edit3 className="h-4 w-4 mr-1.5" /> Regularize
          </Button>
          <Button size="sm" onClick={onClose}>Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5 tabular-nums">{value}</p>
    </div>
  )
}

// ============================================================
// Monthly View
// ============================================================

function MonthlyView() {
  const [cursor, setCursor] = React.useState<Date>(new Date())
  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const dayCols = Array.from({ length: getDaysInMonth(cursor) }, (_, i) => i + 1)
  const fromIso = monthStart.toISOString()
  const toIso = monthEnd.toISOString()

  const { data, loading, error, reload } = useAsync<{ items: AttendanceRecord[] }>(
    () => fetchJson(`/api/attendance?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`),
    [fromIso, toIso],
  )

  const items = (data?.items || []) as AttendanceRecord[]

  const empMap = React.useMemo(() => {
    const m = new Map<string, { employee?: EmployeeLite; byDay: Map<number, AttendanceRecord> }>()
    for (const r of items) {
      if (!m.has(r.employeeId)) m.set(r.employeeId, { employee: r.employee, byDay: new Map() })
      const day = new Date(r.date).getDate()
      m.get(r.employeeId)!.byDay.set(day, r)
    }
    return Array.from(m.values())
  }, [items])

  const [selected, setSelected] = React.useState<AttendanceRecord | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Monthly Grid</h3>
          <p className="text-xs text-muted-foreground">{empMap.length} employees · {items.length} records</p>
        </div>
        <MonthStrip cursor={cursor} setCursor={setCursor} label={format(cursor, "MMMM yyyy")} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {LEGEND.map(([c, l]) => (
          <span key={c} className="inline-flex items-center gap-1">
            <span className={cn("inline-grid place-items-center text-[9px] font-bold w-4 h-4 rounded", STATUS_CELL_COLOR[c])}>{c}</span>
            <span className="text-muted-foreground">{l}</span>
          </span>
        ))}
      </div>

      {loading ? <TableSkeleton />
        : error ? (
          <SectionCard title="Monthly View">
            <EmptyState icon={CalendarDays} title="Failed to load" description={error}
              action={<Button size="sm" variant="outline" onClick={reload}>Retry</Button>} />
          </SectionCard>
        )
        : empMap.length === 0 ? (
          <SectionCard title="Monthly View">
            <EmptyState icon={CalendarDays} title="No records" description="No attendance data for this month." />
          </SectionCard>
        )
        : (
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <div className="overflow-auto max-h-[560px] [scrollbar-width:thin]">
              <table className="text-xs border-collapse min-w-max">
                <thead>
                  <tr className="bg-muted/40 sticky top-0 z-10">
                    <th className="sticky left-0 z-20 bg-muted/60 px-3 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px] border-r border-border/60">
                      Employee
                    </th>
                    {dayCols.map((d) => {
                      const dayDate = new Date(getYear(cursor), getMonth(cursor), d)
                      const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6
                      return (
                        <th key={d} className={cn("px-1 py-2 text-center font-medium text-muted-foreground w-9", isWeekend && "bg-rose-500/5")}>
                          {d}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {empMap.map((row, ri) => (
                    <tr key={row.employee?.id || ri} className="hover:bg-muted/20 border-t border-border/40">
                      <td className="sticky left-0 z-10 bg-card px-3 py-1.5 border-r border-border/60">
                        <div className="flex items-center gap-2 min-w-[180px]">
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                            {empInitials(row.employee)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{empName(row.employee)}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{row.employee?.employeeCode} · {row.employee?.department?.name || "—"}</p>
                          </div>
                        </div>
                      </td>
                      {dayCols.map((d) => {
                        const rec = row.byDay.get(d)
                        const code = statusToCode(rec?.status)
                        return (
                          <td key={d} className="p-0.5 text-center">
                            {rec ? (
                              <button
                                onClick={() => setSelected(rec)}
                                className={cn("inline-grid place-items-center text-[10px] font-bold w-7 h-7 rounded transition-transform hover:scale-110", STATUS_CELL_COLOR[code])}
                                title={`${empName(row.employee)} · Day ${d} · ${rec.status}`}
                              >
                                {code}
                              </button>
                            ) : (
                              <span className="inline-grid place-items-center text-[10px] w-7 h-7 text-muted-foreground/30">·</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      <RecordDetailSheet record={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

// ============================================================
// Summary View
// ============================================================

interface SummaryRow {
  id: string
  employee: EmployeeLite
  present: number; absent: number; late: number; wfh: number
  onDuty: number; leave: number; otHours: number; payableDays: number
}

function SummaryView() {
  const [cursor, setCursor] = React.useState<Date>(new Date())
  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const fromIso = monthStart.toISOString()
  const toIso = monthEnd.toISOString()

  const { data, loading, error, reload } = useAsync<{ items: AttendanceRecord[] }>(
    () => fetchJson(`/api/attendance?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`),
    [fromIso, toIso],
  )

  const rows: SummaryRow[] = React.useMemo(() => {
    const items = (data?.items || []) as AttendanceRecord[]
    const m = new Map<string, SummaryRow>()
    for (const r of items) {
      if (!m.has(r.employeeId)) {
        m.set(r.employeeId, {
          id: r.employeeId, employee: r.employee || ({} as EmployeeLite),
          present: 0, absent: 0, late: 0, wfh: 0, onDuty: 0, leave: 0, otHours: 0, payableDays: 0,
        })
      }
      const row = m.get(r.employeeId)!
      const s = r.status
      if (s === "Present") { row.present += 1; row.payableDays += 1 }
      else if (s === "Absent") row.absent += 1
      else if (s === "Late") { row.late += 1; row.payableDays += 1 }
      else if (s === "WFH") { row.wfh += 1; row.payableDays += 1 }
      else if (s === "OnDuty" || s === "OD") { row.onDuty += 1; row.payableDays += 1 }
      else if (s === "Leave") row.leave += 1
      else if (s === "Half Day") { row.payableDays += 0.5; row.present += 0.5 }
      else if (s === "WeeklyOff" || s === "Holiday") row.payableDays += 1
      else if (s === "LWP") row.absent += 1
      row.otHours += r.overtimeHours || 0
    }
    return Array.from(m.values()).sort((a, b) => empName(a.employee).localeCompare(empName(b.employee)))
  }, [data])

  const columns: Column<SummaryRow>[] = [
    {
      key: "employee", header: "Employee", width: "240px",
      render: (r) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
            {empInitials(r.employee)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{empName(r.employee)}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {r.employee?.employeeCode} · {r.employee?.department?.name || "—"}
            </p>
          </div>
        </div>
      ),
    },
    { key: "present", header: "Present", width: "90px", render: (r) => <span className="text-sm tabular-nums text-emerald-600 dark:text-emerald-400">{r.present}</span> },
    { key: "absent", header: "Absent", width: "80px", render: (r) => <span className="text-sm tabular-nums text-rose-600 dark:text-rose-400">{r.absent}</span> },
    { key: "late", header: "Late", width: "70px", render: (r) => <span className="text-sm tabular-nums text-amber-600 dark:text-amber-400">{r.late}</span> },
    { key: "wfh", header: "WFH", width: "70px", render: (r) => <span className="text-sm tabular-nums text-violet-600 dark:text-violet-400">{r.wfh}</span> },
    { key: "onDuty", header: "OD", width: "70px", render: (r) => <span className="text-sm tabular-nums text-orange-600 dark:text-orange-400">{r.onDuty}</span> },
    { key: "leave", header: "Leave", width: "70px", render: (r) => <span className="text-sm tabular-nums text-cyan-600 dark:text-cyan-400">{r.leave}</span> },
    { key: "otHours", header: "OT (hrs)", width: "90px", render: (r) => <span className="text-sm tabular-nums">{r.otHours.toFixed(2)}</span> },
    { key: "payableDays", header: "Payable Days", width: "110px", render: (r) => <span className="text-sm font-semibold tabular-nums">{r.payableDays.toFixed(1)}</span> },
  ]

  function handleExport() {
    const out = rows.map((r) => ({
      Employee: empName(r.employee), Code: r.employee?.employeeCode || "",
      Department: r.employee?.department?.name || "",
      Present: r.present, Absent: r.absent, Late: r.late, WFH: r.wfh,
      "On Duty": r.onDuty, Leave: r.leave,
      "OT Hours": r.otHours.toFixed(2), "Payable Days": r.payableDays.toFixed(1),
    }))
    downloadCSV(`attendance-summary-${format(cursor, "yyyy-MM")}.csv`, out)
    toastSuccess("Summary exported")
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Monthly Summary</h3>
          <p className="text-xs text-muted-foreground">{rows.length} employees · {format(cursor, "MMMM yyyy")}</p>
        </div>
        <MonthStrip cursor={cursor} setCursor={setCursor} label={format(cursor, "MMMM yyyy")}
          extra={
            <Button size="sm" className="h-9 gap-1.5" onClick={handleExport} disabled={rows.length === 0}>
              <Download className="h-4 w-4" /> Export
            </Button>
          }
        />
      </div>

      {loading ? <TableSkeleton />
        : error ? (
          <SectionCard title="Summary">
            <EmptyState icon={CalendarDays} title="Failed to load" description={error}
              action={<Button size="sm" variant="outline" onClick={reload}>Retry</Button>} />
          </SectionCard>
        )
        : rows.length === 0 ? (
          <SectionCard title="Summary">
            <EmptyState icon={CalendarDays} title="No data" description="No attendance records for this month." />
          </SectionCard>
        )
        : <DataTable columns={columns} rows={rows as any} emptyState={<EmptyState title="No data" />} />
      }
    </div>
  )
}
