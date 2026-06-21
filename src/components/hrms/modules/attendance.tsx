'use client'

import * as React from "react"
import { toast } from "sonner"
import {
  PageHeader, DataTable, StatusBadge, EmptyState, Column, StatCard, SectionCard,
} from "@/components/hrms/ui"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Fingerprint, Calendar as CalIcon, Clock, LogIn, LogOut, Check, X, Save,
  TrendingUp,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

// ============================================================
// Types
// ============================================================

interface EmployeeLite {
  id: string
  employeeCode: string
  firstName: string
  middleName?: string | null
  lastName?: string | null
  displayName?: string | null
  department?: { id: string; name: string } | null
}

interface Attendance {
  id: string
  employeeId: string
  employee?: EmployeeLite
  date: string | Date
  clockIn?: string | Date | null
  clockOut?: string | Date | null
  status: string
  workHours: number
  overtimeHours: number
  isLate: boolean
  isEarlyGoing: boolean
  remarks?: string | null
  source: string
}

// ============================================================
// Helpers
// ============================================================

function empName(e?: EmployeeLite) {
  if (!e) return "—"
  return e.displayName || [e.firstName, e.lastName].filter(Boolean).join(" ") || e.employeeCode
}

function fmtTime(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "hh:mm a") } catch { return "—" }
}

function toDateInputValue(d?: string | Date | null): string {
  if (!d) return ""
  try { return format(new Date(d), "yyyy-MM-dd'T'HH:mm") } catch { return "" }
}

// ============================================================
// Main Module
// ============================================================

export function AttendanceModule() {
  const [items, setItems] = React.useState<Attendance[]>([])
  const [employees, setEmployees] = React.useState<EmployeeLite[]>([])
  const [loading, setLoading] = React.useState(true)
  const [date, setDate] = React.useState<Date>(new Date())
  const [empFilter, setEmpFilter] = React.useState<string>("all")
  const [detail, setDetail] = React.useState<Attendance | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [datePickerOpen, setDatePickerOpen] = React.useState(false)

  // Load employees for the filter dropdown
  React.useEffect(() => {
    fetch("/api/employees").then(r => r.ok ? r.json() : { items: [] }).then(d => setEmployees(d?.items || [])).catch(() => {})
  }, [])

  const dateStr = format(date, "yyyy-MM-dd")
  const fromIso = `${dateStr}T00:00:00`
  const toIso = `${dateStr}T23:59:59`

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const url = `/api/attendance?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}${empFilter !== "all" ? `&employeeId=${empFilter}` : ""}`
      const res = await fetch(url)
      const data = await res.json()
      setItems(data?.items || [])
    } catch {
      toast.error("Failed to load attendance")
    } finally {
      setLoading(false)
    }
  }, [fromIso, toIso, empFilter])

  React.useEffect(() => { load() }, [load])

  // Stat counts for selected date
  const stats = React.useMemo(() => {
    const present = items.filter(a => a.status === "Present").length
    const absent = items.filter(a => a.status === "Absent").length
    const late = items.filter(a => a.status === "Late" || a.isLate).length
    const wfh = items.filter(a => a.status === "WFH").length
    return { present, absent, late, wfh }
  }, [items])

  const columns: Column<Attendance>[] = [
    {
      key: "employee", header: "Employee",
      render: (a) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
            {empName(a.employee).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{empName(a.employee)}</p>
            <p className="text-xs text-muted-foreground">{a.employee?.employeeCode}{a.employee?.department ? ` · ${a.employee.department.name}` : ""}</p>
          </div>
        </div>
      ),
    },
    { key: "date", header: "Date", render: (a) => <span className="text-sm">{format(new Date(a.date), "dd MMM yyyy")}</span> },
    { key: "clockIn", header: "Clock In", render: (a) => <span className={cn("tabular-nums text-sm", a.isLate && "text-amber-600 dark:text-amber-400 font-medium")}>{fmtTime(a.clockIn)}</span> },
    { key: "clockOut", header: "Clock Out", render: (a) => <span className={cn("tabular-nums text-sm", a.isEarlyGoing && "text-amber-600 dark:text-amber-400 font-medium")}>{fmtTime(a.clockOut)}</span> },
    {
      key: "workHours", header: "Work Hrs",
      render: (a) => (
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
          <Clock className="h-3 w-3" /> {a.workHours}h
          {a.overtimeHours > 0 && <span className="text-emerald-600 dark:text-emerald-400">+{a.overtimeHours}</span>}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
    {
      key: "source", header: "Source",
      render: (a) => <Badge variant="outline" className="text-[11px]">{a.source}</Badge>,
    },
    {
      key: "actions", header: "", className: "text-right",
      render: (a) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setDetail(a)}>
            Regularize
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance"
        description="Daily attendance, regularization, and clock-in/out tracking."
        icon={Fingerprint}
      />

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Present" value={stats.present} icon={Check} accent="emerald" sub={format(date, "dd MMM")} />
        <StatCard label="Absent" value={stats.absent} icon={X} accent="coral" sub={format(date, "dd MMM")} />
        <StatCard label="Late" value={stats.late} icon={Clock} accent="amber" sub={format(date, "dd MMM")} />
        <StatCard label="WFH" value={stats.wfh} icon={TrendingUp} accent="cyan" sub={format(date, "dd MMM")} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-1">
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <CalIcon className="h-4 w-4" />
                {format(date, "EEE, dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { if (d) { setDate(d); setDatePickerOpen(false) } }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Select value={empFilter} onValueChange={setEmpFilter}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{empName(e)} ({e.employeeCode})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        onRowClick={(a) => setDetail(a)}
        emptyState={
          <EmptyState
            icon={Fingerprint}
            title="No attendance records"
            description={`No attendance data for ${format(date, "dd MMM yyyy")}. Try selecting another date.`}
          />
        }
      />

      <RegularizeSheet
        att={detail}
        onClose={() => setDetail(null)}
        saving={saving}
        onSave={async (v) => {
          if (!detail) return
          setSaving(true)
          try {
            const res = await fetch(`/api/attendance/${detail.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(v),
            })
            if (!res.ok) {
              const e = await res.json().catch(() => ({}))
              throw new Error(e.error || "Failed to regularize")
            }
            toast.success("Attendance regularized")
            setDetail(null)
            load()
          } catch (e: any) {
            toast.error(e.message || "Failed to regularize")
          } finally {
            setSaving(false)
          }
        }}
      />
    </div>
  )
}

// ============================================================
// Regularize Sheet
// ============================================================

function RegularizeSheet({
  att, onClose, onSave, saving,
}: {
  att: Attendance | null
  onClose: () => void
  onSave: (v: any) => void
  saving: boolean
}) {
  const [status, setStatus] = React.useState<string>("Present")
  const [clockIn, setClockIn] = React.useState<string>("")
  const [clockOut, setClockOut] = React.useState<string>("")
  const [remarks, setRemarks] = React.useState<string>("")
  const [source, setSource] = React.useState<string>("Manual")

  React.useEffect(() => {
    if (att) {
      setStatus(att.status || "Present")
      setClockIn(toDateInputValue(att.clockIn))
      setClockOut(toDateInputValue(att.clockOut))
      setRemarks(att.remarks || "")
      setSource(att.source || "Manual")
    }
  }, [att])

  return (
    <Sheet open={!!att} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md w-full" side="right">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" /> Regularize Attendance
          </SheetTitle>
          <SheetDescription>Update clock-in/out, status, and remarks for this record.</SheetDescription>
        </SheetHeader>
        {att && (
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
            <SectionCard title="Employee">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {empName(att.employee).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{empName(att.employee)}</p>
                  <p className="text-xs text-muted-foreground">{att.employee?.employeeCode} · {format(new Date(att.date), "dd MMM yyyy")}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Current Record">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Clock In</dt>
                  <dd className="font-medium tabular-nums">{fmtTime(att.clockIn)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Clock Out</dt>
                  <dd className="font-medium tabular-nums">{fmtTime(att.clockOut)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Work Hours</dt>
                  <dd className="font-medium">{att.workHours}h</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd><StatusBadge status={att.status} /></dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Regularize">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Present", "Absent", "Half Day", "Late", "Weekly Off", "Holiday", "Leave", "WFH", "OD"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cin">Clock In</Label>
                    <div className="relative">
                      <LogIn className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input id="cin" type="datetime-local" value={clockIn} onChange={(e) => setClockIn(e.target.value)} className="pl-8" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cout">Clock Out</Label>
                    <div className="relative">
                      <LogOut className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input id="cout" type="datetime-local" value={clockOut} onChange={(e) => setClockOut(e.target.value)} className="pl-8" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Source</Label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Web", "Mobile", "Biometric", "Manual"].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rem">Remarks</Label>
                  <Textarea id="rem" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Reason for regularization..." />
                </div>
              </div>
            </SectionCard>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button className="flex-1 gap-1.5" disabled={saving} onClick={() => onSave({ status, clockIn: clockIn || null, clockOut: clockOut || null, remarks, source })}>
                {saving ? <Clock className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
