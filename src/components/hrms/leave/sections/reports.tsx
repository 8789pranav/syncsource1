'use client'

import * as React from "react"
import { toast } from "sonner"
import { FileBarChart, Download, Filter, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Column, DataTable, EmptyState, SectionCard } from "@/components/hrms/ui"
import {
  fetchJson, useAsync, empName, fmtDate, toNum, downloadCSV,
} from "../shared"

const REPORT_TYPES = [
  { value: "balance", label: "Leave Balance" },
  { value: "ledger", label: "Leave Ledger" },
  { value: "requests", label: "Leave Requests" },
  { value: "lop", label: "LOP Days" },
  { value: "encashment", label: "Encashment" },
  { value: "carryforward", label: "Carry Forward" },
  { value: "compoff", label: "Comp-Off" },
]

export function ReportsSection() {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [reportType, setReportType] = React.useState("balance")
  const [fromDate, setFromDate] = React.useState(startOfMonth.toISOString().slice(0, 10))
  const [toDate, setToDate] = React.useState(today.toISOString().slice(0, 10))
  const [deptId, setDeptId] = React.useState("all")
  const [empId, setEmpId] = React.useState("all")

  const { data: departments } = useAsync<{ id: string; name: string }[]>(
    () => fetchJson("/api/departments").catch(() => []),
    [],
  )
  const { data: employees } = useAsync<{ label: string; value: string }[]>(
    () => fetchJson("/api/employees/picker?limit=500").catch(() => []),
    [],
  )

  const params = new URLSearchParams({
    type: reportType, fromDate, toDate, format: "json",
  })
  if (deptId !== "all") params.set("departmentId", deptId)
  if (empId !== "all") params.set("employeeId", empId)

  const { data, loading, error, reload } = useAsync<any[]>(
    () => fetchJson(`/api/leave-reports?${params.toString()}`).then((r: any) => r.items || r || []).catch(() => []),
    [reportType, fromDate, toDate, deptId, empId],
  )

  function exportCsv() {
    const rows = (data || []).map((r) => {
      const flat: Record<string, any> = {}
      for (const k of Object.keys(r)) {
        const v = (r as any)[k]
        if (v && typeof v === "object") {
          if (k === "employee") flat[k] = empName(v)
          else if (k === "leaveType") flat[k] = v.name || v.code
          else flat[k] = JSON.stringify(v)
        } else {
          flat[k] = v
        }
      }
      return flat
    })
    downloadCSV(`leave-${reportType}-${fromDate}-${toDate}.csv`, rows)
    toast.success("Exported CSV")
  }

  const columns: Column<any>[] = React.useMemo(() => {
    if (!data || data.length === 0) return []
    const sample = data[0]
    return Object.keys(sample).filter((k) => k !== "id").map((k) => ({
      key: k,
      header: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
      render: (r: any) => {
        const v = r[k]
        if (v && typeof v === "object") {
          if (k === "employee") return empName(v)
          if (k === "leaveType") return <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: v.color || "#10b981" }} />{v.name || v.code}</span>
          return <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{JSON.stringify(v)}</span>
        }
        if (typeof v === "number") return <span className="tabular-nums">{v}</span>
        if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return fmtDate(v)
        return <span className="text-sm">{v == null ? "—" : String(v)}</span>
      },
    }))
  }, [data])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Reports</h2>
          <p className="text-sm text-muted-foreground">Generate and export leave reports across multiple dimensions.</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={exportCsv} disabled={!data || data.length === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <SectionCard title="Report Configuration" action={<Filter className="h-4 w-4 text-muted-foreground" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
          <div>
            <Label className="text-xs">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">From Date</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">To Date</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Department</Label>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {(departments || []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Employee</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {(employees || []).map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button size="sm" className="gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => reload()}>
            <Play className="h-3.5 w-3.5" /> Generate
          </Button>
          <Badge variant="secondary" className="text-[10px] border-0 bg-muted text-muted-foreground">{data?.length || 0} records</Badge>
        </div>
      </SectionCard>

      {loading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : error ? (
        <SectionCard title="Report"><EmptyState icon={FileBarChart} title="Unable to load report" description="Please try again later." /></SectionCard>
      ) : !data || data.length === 0 ? (
        <SectionCard title="Report"><EmptyState icon={FileBarChart} title="No data" description="Adjust filters and regenerate." /></SectionCard>
      ) : (
        <DataTable columns={columns} rows={data} />
      )}
    </div>
  )
}
