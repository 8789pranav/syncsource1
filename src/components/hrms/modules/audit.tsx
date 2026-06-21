'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { ScrollText, Search, RefreshCw, User, Clock, FileClock } from "lucide-react"

import { PageHeader, ListToolbar, DataTable, EmptyState, type Column } from "@/components/hrms/ui"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AuditEntry {
  id: string
  module: string
  action: string
  recordId?: string | null
  userId?: string | null
  userName?: string | null
  details?: string | null
  ip?: string | null
  createdAt: string
}

const actionStyles: Record<string, string> = {
  Create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Update: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Delete: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Approve: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Reject: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

const moduleLabels: Record<string, string> = {
  asset: "Asset",
  assetCategory: "Asset Category",
  assetRequest: "Asset Request",
  forms: "Form Schema",
  workflows: "Workflow",
  announcements: "Announcement",
  employee: "Employee",
  entity: "Entity",
  branch: "Branch",
  department: "Department",
  designation: "Designation",
  grade: "Grade",
  location: "Location",
  leaveType: "Leave Type",
  leaveApplication: "Leave Application",
  shift: "Shift",
  roster: "Roster",
  holiday: "Holiday",
  attendance: "Attendance",
}

const MODULE_OPTIONS = [
  "asset", "assetCategory", "assetRequest", "forms", "workflows", "announcements",
  "employee", "entity", "department", "leaveApplication", "shift", "holiday", "attendance",
]

const fmtTime = (v: string) => {
  const d = new Date(v)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

const fmtFull = (v: string) => new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

export function AuditModule() {
  const [rows, setRows] = React.useState<AuditEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [module, setModule] = React.useState("all")
  const [detail, setDetail] = React.useState<AuditEntry | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (module !== "all") params.set("module", module)
      params.set("limit", "200")
      const res = await fetch(`/api/audit?${params.toString()}`)
      const data = await res.json()
      setRows(data.items || [])
    } catch { toast.error("Failed to load audit log") }
    finally { setLoading(false) }
  }, [module])

  React.useEffect(() => { load() }, [load])

  const filtered = rows.filter((r) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      r.module.toLowerCase().includes(s) ||
      r.action.toLowerCase().includes(s) ||
      (r.userName || "").toLowerCase().includes(s) ||
      (r.details || "").toLowerCase().includes(s) ||
      (r.recordId || "").toLowerCase().includes(s)
    )
  })

  const columns: Column<AuditEntry>[] = [
    { key: "createdAt", header: "When", width: "150px", render: (r) => (
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{fmtTime(r.createdAt)}</p>
        <p className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-IN")}</p>
      </div>
    ) },
    { key: "module", header: "Module", render: (r) => (
      <Badge variant="outline" className="font-normal">{moduleLabels[r.module] || r.module}</Badge>
    ) },
    { key: "action", header: "Action", render: (r) => (
      <Badge variant="secondary" className={cn("font-medium border-0", actionStyles[r.action] || "bg-muted text-muted-foreground")}>{r.action}</Badge>
    ) },
    { key: "userName", header: "User", render: (r) => (
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
          {(r.userName || "?").slice(0, 2).toUpperCase()}
        </div>
        <span className="text-sm truncate">{r.userName || "System"}</span>
      </div>
    ) },
    { key: "details", header: "Details", render: (r) => {
      let detail: any = null
      try { detail = r.details ? JSON.parse(r.details) : null } catch { detail = r.details }
      const text = typeof detail === "string" ? detail : detail ? Object.entries(detail).slice(0, 2).map(([k, v]) => `${k}: ${String(v as any)}`).join(" · ") : ""
      return <span className="text-xs text-muted-foreground line-clamp-1 font-mono">{text || "—"}</span>
    } },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Log"
        description="Immutable trail of every create, update, delete, and approval action across the system."
        icon={ScrollText}
        badge={<Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px]">Read-only</Badge>}
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-1">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, module, action…"
            className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
          />
        </div>
        <Select value={module} onValueChange={setModule}>
          <SelectTrigger className="w-full sm:w-[200px] h-9"><SelectValue placeholder="All modules" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {MODULE_OPTIONS.map((m) => <SelectItem key={m} value={m}>{moduleLabels[m] || m}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground sm:ml-auto">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {rows.length} entries
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        onRowClick={(r) => setDetail(r)}
        emptyState={<EmptyState icon={FileClock} title="No audit entries" description="Try changing the filters or perform some actions to generate activity." />}
      />

      {/* Detail dialog */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetail(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg"
          >
            <Card className="shadow-xl border-border/60">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={cn("font-medium border-0", actionStyles[detail.action] || "")}>{detail.action}</Badge>
                    <Badge variant="outline" className="font-normal">{moduleLabels[detail.module] || detail.module}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>Close</Button>
                </div>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Timestamp</p>
                    <p className="font-medium mt-0.5 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {fmtFull(detail.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">User</p>
                    <p className="font-medium mt-0.5 flex items-center gap-1"><User className="h-3.5 w-3.5" /> {detail.userName || "System"}</p>
                  </div>
                  {detail.recordId && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Record ID</p>
                      <p className="font-mono text-xs mt-0.5 break-all">{detail.recordId}</p>
                    </div>
                  )}
                  {detail.ip && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">IP</p>
                      <p className="font-mono text-xs mt-0.5">{detail.ip}</p>
                    </div>
                  )}
                </div>
                {detail.details && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Details</p>
                    <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto max-h-60 font-mono whitespace-pre-wrap break-all">
                      {(() => {
                        try { return JSON.stringify(JSON.parse(detail.details), null, 2) } catch { return detail.details }
                      })()}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  )
}
