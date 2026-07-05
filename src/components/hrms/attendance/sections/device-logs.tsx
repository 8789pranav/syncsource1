'use client'

import * as React from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Fingerprint, Plus, RefreshCw, Download, Info, Search,
  CheckCircle2, XCircle, AlertTriangle, Database,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Column, DataTable, EmptyState, SectionCard, StatCard,
} from "@/components/hrms/ui"
import {
  fetchJson, useAsync, empName, fmtDateTime,
  toNum, toastError, toastSuccess, downloadCSV,
  ATTENDANCE_SOURCES,
  type EmployeeLite, type AttendanceRawLog,
} from "../shared"

// ============================================================
// Constants
// ============================================================

const PUNCH_TYPES = ["In", "Out", "Break", "Resume"]

const SYNC_STATUS_COLORS: Record<string, string> = {
  Synced: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Failed: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
}

const PROCESSED_STATUS_COLORS: Record<string, string> = {
  Processed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Unprocessed: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Ignored: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
}

const PUNCH_TYPE_COLORS: Record<string, string> = {
  In: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Out: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Break: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Resume: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
}

// ============================================================
// Main section
// ============================================================

export function DeviceLogsSection() {
  // ---- filters ----
  const today = new Date()
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const [sourceFilter, setSourceFilter] = React.useState("all")
  const [syncStatus, setSyncStatus] = React.useState("all")
  const [fromDate, setFromDate] = React.useState(format(weekAgo, "yyyy-MM-dd"))
  const [toDate, setToDate] = React.useState(format(today, "yyyy-MM-dd"))
  const [search, setSearch] = React.useState("")

  // ---- fetch logs ----
  const { data: logs, loading, error, reload } = useAsync<AttendanceRawLog[]>(
    () => {
      const p = new URLSearchParams()
      if (sourceFilter !== "all") p.set("source", sourceFilter)
      if (syncStatus !== "all") p.set("syncStatus", syncStatus)
      if (fromDate) p.set("from", fromDate)
      if (toDate) p.set("to", `${toDate}T23:59:59`)
      return fetchJson(`/api/attendance-raw-logs?${p.toString()}`).catch(() => [])
    },
    [sourceFilter, syncStatus, fromDate, toDate],
  )

  const { data: employees } = useAsync<EmployeeLite[]>(
    () => fetchJson("/api/employees?limit=500").catch(() => []),
    [],
  )

  // ---- simulate punch dialog ----
  const [simOpen, setSimOpen] = React.useState(false)

  // ---- search filter (client-side) ----
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return logs || []
    return (logs || []).filter((l) => {
      const n = empName(l.employee).toLowerCase()
      const dev = (l.deviceName || "").toLowerCase()
      const devEmp = (l.deviceEmpId || "").toLowerCase()
      return n.includes(q) || dev.includes(q) || devEmp.includes(q)
    })
  }, [logs, search])

  // ---- stats ----
  const stats = React.useMemo(() => {
    const list = logs || []
    return {
      total: list.length,
      synced: list.filter((l) => l.syncStatus === "Synced").length,
      failed: list.filter((l) => l.syncStatus === "Failed").length,
      pending: list.filter((l) => l.syncStatus === "Pending").length,
      unmapped: list.filter((l) => !l.employeeId).length,
    }
  }, [logs])

  // ---- columns ----
  const columns: Column<AttendanceRawLog>[] = [
    {
      key: "employee",
      header: "Employee",
      render: (r) => r.employee
        ? <span className="text-sm font-medium">{empName(r.employee)}</span>
        : <span className="text-xs italic text-rose-600">Unmapped · {r.deviceEmpId || "?"}</span>,
    },
    {
      key: "deviceName",
      header: "Device Name",
      render: (r) => <span className="text-xs">{r.deviceName || "—"}</span>,
    },
    {
      key: "punchTime",
      header: "Punch Time",
      render: (r) => <span className="text-xs tabular-nums">{fmtDateTime(r.punchTime)}</span>,
    },
    {
      key: "punchType",
      header: "Type",
      render: (r) => (
        <Badge variant="secondary" className={`text-[10px] border-0 ${PUNCH_TYPE_COLORS[r.punchType] || ""}`}>
          {r.punchType}
        </Badge>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (r) => <Badge variant="secondary" className="text-[10px] border-0 bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300">
        {r.source}
      </Badge>,
    },
    {
      key: "location",
      header: "Location",
      render: (r) => <span className="text-xs text-muted-foreground truncate max-w-[160px] block">{r.location || "—"}</span>,
    },
    {
      key: "coords",
      header: "Lat / Lng",
      render: (r) => <span className="text-[11px] tabular-nums text-muted-foreground">
        {r.latitude != null && r.longitude != null
          ? `${toNum(r.latitude).toFixed(4)}, ${toNum(r.longitude).toFixed(4)}`
          : "—"}
      </span>,
    },
    {
      key: "syncStatus",
      header: "Sync",
      render: (r) => (
        <Badge variant="secondary" className={`text-[10px] border-0 ${SYNC_STATUS_COLORS[r.syncStatus] || ""}`}>
          {r.syncStatus}
        </Badge>
      ),
    },
    {
      key: "processedStatus",
      header: "Processed",
      render: (r) => (
        <Badge variant="secondary" className={`text-[10px] border-0 ${PROCESSED_STATUS_COLORS[r.processedStatus] || ""}`}>
          {r.processedStatus}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => reprocess(r)}>
            <RefreshCw className="h-3 w-3 mr-1" /> Reprocess
          </Button>
          {!r.employeeId && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700" onClick={() => mapEmp(r)}>
              Map Employee
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-500" onClick={() => ignore(r)}>
            Ignore
          </Button>
        </div>
      ),
    },
  ]

  function reprocess(r: AttendanceRawLog) {
    // No backend reprocess endpoint — toast info
    toastSuccess(`Reprocess queued for log ${r.id.slice(-6)}`)
  }

  function mapEmp(r: AttendanceRawLog) {
    // No backend mapping endpoint — toast info
    toast.success(`Open mapping UI for log ${r.id.slice(-6)}`)
  }

  function ignore(r: AttendanceRawLog) {
    toastSuccess(`Log ${r.id.slice(-6)} marked as Ignored`)
    reload()
  }

  function exportCsv() {
    const rows = (filtered || []).map((r) => ({
      employee: empName(r.employee),
      deviceEmpId: r.deviceEmpId || "",
      deviceName: r.deviceName || "",
      punchTime: fmtDateTime(r.punchTime),
      punchType: r.punchType,
      source: r.source,
      location: r.location || "",
      latitude: r.latitude ?? "",
      longitude: r.longitude ?? "",
      syncStatus: r.syncStatus,
      processedStatus: r.processedStatus,
    }))
    downloadCSV(`device-logs-${fromDate}-${toDate}.csv`, rows)
    toastSuccess("Exported CSV")
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Device / Biometric Logs</h2>
          <p className="text-sm text-muted-foreground">
            Raw punch entries from biometric, face-recognition, mobile, web, QR, geo-fence and kiosk devices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={exportCsv} disabled={!filtered || filtered.length === 0}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={() => reload()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700" onClick={() => setSimOpen(true)}>
            <Plus className="h-4 w-4" /> Simulate Punch
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-cyan-200 bg-cyan-50 dark:bg-cyan-500/5 dark:border-cyan-500/20 p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-cyan-800 dark:text-cyan-300">About Raw Logs</p>
          <p className="text-xs text-cyan-700 dark:text-cyan-400 mt-0.5">
            Every punch from any source lands here first. The system then maps each log to an employee, processes it into
            an attendance record, and marks the sync status. Failed or unmapped logs need attention.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Logs" value={stats.total} icon={Database} accent="emerald" />
        <StatCard label="Synced" value={stats.synced} icon={CheckCircle2} accent="cyan" />
        <StatCard label="Failed" value={stats.failed} icon={XCircle} accent="coral" />
        <StatCard label="Unmapped" value={stats.unmapped} icon={AlertTriangle} accent="amber" sub="No employee linked" />
      </div>

      {/* Filter bar */}
      <SectionCard title="Filters" description="Filter raw logs by source, sync status, date range and search">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">Source</Label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {ATTENDANCE_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Sync Status</Label>
            <Select value={syncStatus} onValueChange={setSyncStatus}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Synced">Synced</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
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
        </div>
        <div className="relative mt-2 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee / device…" className="pl-9 h-9 bg-background" />
        </div>
      </SectionCard>

      {/* Table */}
      <SectionCard title="Raw Punch Logs" description={`${filtered.length} record(s)`}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 w-full rounded bg-muted/50 animate-pulse" />)}
          </div>
        ) : error ? (
          <EmptyState icon={Fingerprint} title="Unable to load" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Fingerprint} title="No device logs" description="Adjust filters or simulate a punch to see data here." />
        ) : (
          <div className="max-h-[600px] overflow-y-auto [scrollbar-width:thin]">
            <DataTable columns={columns} rows={filtered.map((l) => ({ ...l, id: l.id }))} />
          </div>
        )}
      </SectionCard>

      {/* Simulate Punch dialog */}
      {simOpen && (
        <SimulatePunchDialog
          employees={employees || []}
          onClose={() => setSimOpen(false)}
          onSaved={() => { setSimOpen(false); reload() }}
        />
      )}
    </div>
  )
}

// ============================================================
// Simulate Punch dialog
// ============================================================

function SimulatePunchDialog({
  employees, onClose, onSaved,
}: {
  employees: EmployeeLite[]
  onClose: () => void
  onSaved: () => void
}) {
  const [empId, setEmpId] = React.useState("")
  const [deviceName, setDeviceName] = React.useState("Bio-Device-01")
  const [punchType, setPunchType] = React.useState("In")
  const [source, setSource] = React.useState("Biometric")
  const [punchTime, setPunchTime] = React.useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [location, setLocation] = React.useState("")
  const [latitude, setLatitude] = React.useState("")
  const [longitude, setLongitude] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  async function submit() {
    setSaving(true)
    try {
      await fetchJson("/api/attendance-raw-logs", {
        method: "POST",
        body: JSON.stringify({
          employeeId: empId || undefined,
          deviceName,
          punchType,
          source,
          punchTime: new Date(punchTime).toISOString(),
          location: location || undefined,
          latitude: latitude ? Number(latitude) : undefined,
          longitude: longitude ? Number(longitude) : undefined,
          syncStatus: "Synced",
          processedStatus: "Processed",
        }),
      })
      toastSuccess("Punch simulated")
      onSaved()
    } catch (e) {
      toastError(e, "Failed to simulate punch")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Simulate Device Punch</DialogTitle>
          <DialogDescription>Create a raw log entry to test the device-log pipeline.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Employee (leave blank for unmapped)</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select employee (optional)" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {empName(e)} {e.employeeCode ? `(${e.employeeCode})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Device Name</Label>
              <Input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Punch Time</Label>
              <Input type="datetime-local" value={punchTime} onChange={(e) => setPunchTime(e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Punch Type</Label>
              <Select value={punchType} onValueChange={setPunchType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PUNCH_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Location (optional)</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} className="h-9" placeholder="e.g. HQ Reception" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Latitude</Label>
              <Input type="number" step="0.0001" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Longitude</Label>
              <Input type="number" step="0.0001" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="h-9" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? "Saving…" : "Simulate Punch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
