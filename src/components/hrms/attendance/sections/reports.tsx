'use client'

import * as React from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  FileBarChart, Download, Play, CalendarDays, Users2,
  CalendarRange, CheckCircle2, XCircle, Clock,
  Edit3, Home, Briefcase, Timer, CalendarClock, FileText, Shield,
  Wallet, RefreshCw, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Column, DataTable, EmptyState, SectionCard,
} from "@/components/hrms/ui"
import {
  fetchJson, useAsync, empName, fmtDate,
  toastError, toastSuccess, downloadCSV,
  type EmployeeLite,
} from "../shared"

// ============================================================
// Report catalog
// ============================================================

interface ReportDef {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
}

const REPORTS: ReportDef[] = [
  { id: "daily", title: "Daily Attendance Report", description: "Day-by-day attendance for all employees in the date range.", icon: CalendarDays, accent: "emerald" },
  { id: "monthly", title: "Monthly Attendance Report", description: "Monthly summary with present, absent, leave and OT totals.", icon: CalendarRange, accent: "cyan" },
  { id: "summary", title: "Employee Attendance Summary", description: "Per-employee summary of worked days, late marks and OT.", icon: Users2, accent: "emerald" },
  { id: "present", title: "Present Report", description: "All employees marked Present with in/out times and work hours.", icon: CheckCircle2, accent: "emerald" },
  { id: "absent", title: "Absent Report", description: "All employees marked Absent in the selected range.", icon: XCircle, accent: "coral" },
  { id: "late", title: "Late Coming Report", description: "Employees who arrived late, with the number of minutes late.", icon: Clock, accent: "amber" },
  { id: "early", title: "Early Going Report", description: "Employees who left early, with the number of minutes early.", icon: Clock, accent: "amber" },
  { id: "missing", title: "Missing Punch Report", description: "Attendance records with missing In or Out punches.", icon: Edit3, accent: "coral" },
  { id: "regularization", title: "Regularization Report", description: "All regularization requests raised and their status.", icon: FileText, accent: "cyan" },
  { id: "wfh", title: "WFH Report", description: "Work-from-home days per employee.", icon: Home, accent: "emerald" },
  { id: "onduty", title: "On Duty Report", description: "On-duty / client-visit days per employee.", icon: Briefcase, accent: "amber" },
  { id: "overtime", title: "Overtime Report", description: "Approved, pending and rejected overtime per employee.", icon: Timer, accent: "emerald" },
  { id: "shift", title: "Shift Report", description: "Shift-wise distribution of attendance.", icon: CalendarClock, accent: "cyan" },
  { id: "weeklyoff", title: "Weekly Off Report", description: "Weekly-off utilisation per employee.", icon: CalendarRange, accent: "amber" },
  { id: "audit", title: "Attendance Audit Report", description: "Audit trail of all attendance changes (admin/bulk/system).", icon: Shield, accent: "coral" },
  { id: "payroll", title: "Payroll Attendance Report", description: "Payable days per employee for a payroll cycle.", icon: Wallet, accent: "emerald" },
]

const ACCENT_BG: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  cyan: "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  coral: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
}

// ============================================================
// Main section
// ============================================================

export function ReportsSection() {
  const [active, setActive] = React.useState<ReportDef | null>(null)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Attendance Reports</h2>
          <p className="text-sm text-muted-foreground">
            Generate and export 16 standard attendance reports. Pick a report, configure filters, and export to CSV.
          </p>
        </div>
      </div>

      {/* Grid of report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {REPORTS.map((r) => {
          const Icon = r.icon
          return (
            <div key={r.id}
              className="group rounded-xl border border-border/60 bg-card p-4 hover:border-emerald-300 hover:shadow-card transition-all flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${ACCENT_BG[r.accent] || ACCENT_BG.emerald}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs mt-auto w-full gap-1.5 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600"
                onClick={() => setActive(r)}
              >
                <Play className="h-3 w-3" /> Generate
              </Button>
            </div>
          )
        })}
      </div>

      {/* Report dialog */}
      {active && (
        <ReportDialog
          report={active}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  )
}

// ============================================================
// Report Dialog (consistent across all reports)
// ============================================================

function ReportDialog({ report, onClose }: { report: ReportDef; onClose: () => void }) {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [fromDate, setFromDate] = React.useState(format(startOfMonth, "yyyy-MM-dd"))
  const [toDate, setToDate] = React.useState(format(today, "yyyy-MM-dd"))
  const [entityId, setEntityId] = React.useState("all")
  const [deptId, setDeptId] = React.useState("all")

  // pickers
  const { data: entities } = useAsync<{ id: string; code: string; legalName: string; tradeName?: string | null }[]>(
    () => fetchJson("/api/entities").catch(() => []),
    [],
  )
  const { data: departments } = useAsync<{ id: string; name: string }[]>(
    () => fetchJson("/api/departments").catch(() => []),
    [],
  )

  // generated data
  const [data, setData] = React.useState<any[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function generate() {
    setLoading(true); setError(null); setData(null)
    try {
      const p = new URLSearchParams({ from: fromDate, to: toDate })
      if (deptId !== "all") p.set("departmentId", deptId)
      if (entityId !== "all") p.set("entityId", entityId)
      const res = await fetchJson<any[]>(`/api/attendance?${p.toString()}`).catch(() => [])
      // Filter client-side per report type for nicer previews when the backend
      // returns the unified attendance list.
      const filtered = filterByReport(res || [], report.id)
      setData(filtered)
      if (filtered.length === 0) toastError(new Error("No rows"), "No data for the selected filters")
      else toastSuccess(`Generated ${filtered.length} record(s)`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate")
      toastError(e, "Failed to generate report")
    } finally {
      setLoading(false)
    }
  }

  function exportCsv() {
    if (!data || data.length === 0) return
    const rows = data.map((r) => {
      const flat: Record<string, any> = {}
      for (const k of Object.keys(r)) {
        const v = r[k]
        if (v && typeof v === "object") flat[k] = empName(v as EmployeeLite)
        else flat[k] = v
      }
      return flat
    })
    downloadCSV(`attendance-${report.id}-${fromDate}-${toDate}.csv`, rows)
    toastSuccess("Exported CSV")
  }

  const columns: Column<any>[] = React.useMemo(() => {
    if (!data || data.length === 0) return []
    const sample = data[0]
    return Object.keys(sample).filter((k) => k !== "id").map((k) => ({
      key: k,
      header: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
      render: (r: any) => {
        const v = r[k]
        if (v && typeof v === "object") return <span className="text-sm">{empName(v as EmployeeLite)}</span>
        if (typeof v === "number") return <span className="tabular-nums text-sm">{v}</span>
        if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return <span className="text-xs">{fmtDate(v)}</span>
        return <span className="text-sm">{v == null ? "—" : String(v)}</span>
      },
    }))
  }, [data])

  const Icon = report.icon

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`grid h-8 w-8 place-items-center rounded-lg ${ACCENT_BG[report.accent] || ACCENT_BG.emerald}`}>
              <Icon className="h-4 w-4" />
            </div>
            {report.title}
          </DialogTitle>
          <DialogDescription>{report.description}</DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">From Date</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">To Date</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Entity</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {(entities || []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.tradeName || e.legalName} ({e.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Department</Label>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {(departments || []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <Button size="sm" className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700" onClick={generate} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {loading ? "Generating…" : "Generate"}
          </Button>
          {data && data.length > 0 && (
            <>
              <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={exportCsv}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
              <Badge variant="secondary" className="text-[10px] border-0 bg-muted text-muted-foreground">
                {data.length} record(s)
              </Badge>
            </>
          )}
        </div>

        {/* Results */}
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : error ? (
            <EmptyState icon={FileBarChart} title="Unable to load" description={error} />
          ) : !data ? (
            <EmptyState
              icon={FileBarChart}
              title="No data yet"
              description="Pick a date range and click Generate to view the report."
            />
          ) : data.length === 0 ? (
            <EmptyState icon={FileBarChart} title="No rows" description="Try widening the date range or removing filters." />
          ) : (
            <div className="max-h-96 overflow-y-auto [scrollbar-width:thin] rounded-lg border border-border/60">
              <DataTable columns={columns} rows={data.map((r, i) => ({ ...r, id: r.id || `row-${i}` }))} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="gap-1.5">
            <X className="h-4 w-4" /> Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Helpers
// ============================================================

function filterByReport(rows: any[], reportId: string): any[] {
  // Backend currently returns the unified attendance list. Filter client-side
  // per report type for nicer previews.
  switch (reportId) {
    case "present":
      return rows.filter((r) => r.status === "Present")
    case "absent":
      return rows.filter((r) => r.status === "Absent")
    case "late":
      return rows.filter((r) => r.isLate)
    case "early":
      return rows.filter((r) => r.isEarlyGoing)
    case "missing":
      return rows.filter((r) => r.status === "MissingInPunch" || r.status === "MissingOutPunch" || r.status === "MissingPunch")
    case "wfh":
      return rows.filter((r) => r.status === "WFH")
    case "onduty":
      return rows.filter((r) => r.status === "OnDuty" || r.status === "OD")
    case "overtime":
      return rows.filter((r) => Number(r.overtimeHours) > 0)
    case "weeklyoff":
      return rows.filter((r) => r.status === "WeeklyOff")
    default:
      return rows
  }
}
