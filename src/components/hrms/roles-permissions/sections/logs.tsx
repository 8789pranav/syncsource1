'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ScrollText, Download, Filter, AlertTriangle, XCircle, Eye, History, Search,
} from "lucide-react"

import { PageHeader, StatCard, DataTable, EmptyState, type Column } from "@/components/hrms/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { AUDIT_ACTIONS } from "@/lib/permissions-constants"
import { apiFetch } from "@/lib/api-client"

interface AuditLog {
  id: string; action: string; entityType: string | null; entityId: string | null;
  roleName: string | null; oldValue: string | null; newValue: string | null;
  performedById: string | null; performedByName: string | null;
  ipAddress: string | null; device: string | null; reason: string | null;
  status: string; createdAt: string;
}

const ACTION_CATEGORIES: Record<string, { label: string; color: string }> = {
  RoleCreated: { label: "Role Created", color: "bg-emerald-100 text-emerald-700" },
  RoleUpdated: { label: "Role Updated", color: "bg-amber-100 text-amber-700" },
  RoleDeleted: { label: "Role Deleted", color: "bg-rose-100 text-rose-700" },
  RoleCloned: { label: "Role Cloned", color: "bg-violet-100 text-violet-700" },
  PermissionChanged: { label: "Permission Changed", color: "bg-sky-100 text-sky-700" },
  UserRoleAssigned: { label: "User Role Assigned", color: "bg-emerald-100 text-emerald-700" },
  UserRoleRemoved: { label: "User Role Removed", color: "bg-rose-100 text-rose-700" },
  DataScopeChanged: { label: "Data Scope Changed", color: "bg-amber-100 text-amber-700" },
  FieldPermissionChanged: { label: "Field Permission Changed", color: "bg-amber-100 text-amber-700" },
  AccessRequestApproved: { label: "Access Request Approved", color: "bg-emerald-100 text-emerald-700" },
  AccessRequestRejected: { label: "Access Request Rejected", color: "bg-rose-100 text-rose-700" },
  TemporaryAccessGranted: { label: "Temporary Access Granted", color: "bg-cyan-100 text-cyan-700" },
  TemporaryAccessExpired: { label: "Temporary Access Expired", color: "bg-slate-100 text-slate-600" },
  LoginAttempt: { label: "Login Attempt", color: "bg-slate-100 text-slate-600" },
  PermissionDenied: { label: "Permission Denied", color: "bg-rose-100 text-rose-700" },
  SensitiveDataViewed: { label: "Sensitive Data Viewed", color: "bg-fuchsia-100 text-fuchsia-700" },
  ExportPerformed: { label: "Export Performed", color: "bg-orange-100 text-orange-700" },
  DelegationCreated: { label: "Delegation Created", color: "bg-cyan-100 text-cyan-700" },
  DelegationRevoked: { label: "Delegation Revoked", color: "bg-rose-100 text-rose-700" },
  ApprovalRoleCreated: { label: "Approval Role Created", color: "bg-emerald-100 text-emerald-700" },
  ApprovalRoleUpdated: { label: "Approval Role Updated", color: "bg-amber-100 text-amber-700" },
  SettingsUpdated: { label: "Settings Updated", color: "bg-amber-100 text-amber-700" },
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function LogsSection() {
  const [items, setItems] = React.useState<AuditLog[]>([])
  const [stats, setStats] = React.useState<{ total30d: number; criticalActions: number; failedAttempts: number; sensitiveViews: number } | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [filterAction, setFilterAction] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState("")
  const [viewLog, setViewLog] = React.useState<AuditLog | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (filterAction && filterAction !== "__all__") params.set("action", filterAction)
      if (filterStatus && filterStatus !== "__all__") params.set("status", filterStatus)
      params.set("take", "200")
      const [lr, sr] = await Promise.all([
        apiFetch(`/api/roles-permissions/logs?${params}`),
        apiFetch(`/api/roles-permissions/logs/stats`),
      ])
      if (lr.ok) setItems((await lr.json()).items)
      if (sr.ok) setStats(await sr.json())
    } finally { setLoading(false) }
  }, [search, filterAction, filterStatus])

  React.useEffect(() => { load() }, [load])

  const exportCSV = () => {
    if (items.length === 0) { toast.info("Nothing to export"); return }
    const header = ["Date", "Action", "Performed By", "Role/Entity", "Status", "IP", "Reason"]
    const rows = items.map(l => [
      new Date(l.createdAt).toISOString(), l.action, l.performedByName || "",
      l.roleName || l.entityId || "", l.status, l.ipAddress || "", l.reason || "",
    ])
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `permission-audit-logs-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success("Logs exported")
  }

  const columns: Column<AuditLog>[] = [
    {
      key: "createdAt", header: "Date & Time", width: "160px",
      render: (l) => (
        <div>
          <p className="text-xs font-medium">{new Date(l.createdAt).toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">{timeAgo(l.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "performedByName", header: "Performed By", width: "150px",
      render: (l) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 border"><AvatarFallback className="bg-slate-500/10 text-slate-600 text-[9px] font-semibold">{(l.performedByName || "S")[0]?.toUpperCase()}</AvatarFallback></Avatar>
          <span className="text-xs truncate">{l.performedByName || "System"}</span>
        </div>
      ),
    },
    {
      key: "action", header: "Action",
      render: (l) => {
        const c = ACTION_CATEGORIES[l.action] || { label: l.action, color: "bg-muted" }
        return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${c.color}`}>{c.label}</span>
      },
    },
    {
      key: "target", header: "Target",
      render: (l) => (
        <div className="text-xs">
          {l.roleName && <p className="font-medium">{l.roleName}</p>}
          {l.entityType && <p className="text-[9px] text-muted-foreground">{l.entityType}{l.entityId ? ` · ${l.entityId.slice(-6)}` : ""}</p>}
          {!l.roleName && !l.entityType && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    { key: "ipAddress", header: "IP", render: (l) => <span className="text-[10px] text-muted-foreground font-mono">{l.ipAddress || "—"}</span> },
    {
      key: "status", header: "Status",
      render: (l) => <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${l.status === "Failed" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{l.status}</span>,
    },
    {
      key: "actions", header: "", width: "40px",
      render: (l) => <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setViewLog(l) }}><Eye className="h-3.5 w-3.5" /></Button>,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Logs (30d)" value={stats?.total30d || 0} icon={History} accent="amber" sub="Last 30 days" />
        <StatCard label="Critical Actions" value={stats?.criticalActions || 0} icon={AlertTriangle} accent="coral" sub="High-risk events" />
        <StatCard label="Failed Attempts" value={stats?.failedAttempts || 0} icon={XCircle} accent="rose" sub="Permission denials" />
        <StatCard label="Sensitive Data Views" value={stats?.sensitiveViews || 0} icon={Eye} accent="fuchsia" sub="Salary/bank/PAN views" />
      </div>

      <PageHeader
        title="Audit Logs"
        description="Every permission change, role assignment, access request and sensitive data view is logged for compliance."
        icon={ScrollText}
        actions={<Button size="sm" variant="outline" className="gap-1.5 hover:-translate-y-0.5 hover:shadow-md hover:border-violet-300 hover:text-violet-600 transition-all" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>}
      />

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 bg-background focus-visible:ring-violet-400/40" />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Actions</SelectItem>
            {AUDIT_ACTIONS.map(a => <SelectItem key={a} value={a}>{ACTION_CATEGORIES[a]?.label || a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Status</SelectItem>
            <SelectItem value="Success">Success</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit logs" description="Permission changes will be logged here." action={<Button size="sm" variant="outline" className="gap-1.5 hover:-translate-y-0.5 hover:shadow-md hover:border-violet-300 hover:text-violet-600 transition-all" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>} />
      ) : (
        <>
          <DataTable columns={columns} rows={items} onRowClick={(l) => setViewLog(l)} />
          <p className="text-xs text-muted-foreground text-center">Showing {items.length} most recent logs</p>
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!viewLog} onOpenChange={(o) => !o && setViewLog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ScrollText className="h-4 w-4" /> Audit Log Detail</DialogTitle>
            <DialogDescription>{viewLog && (ACTION_CATEGORIES[viewLog.action]?.label || viewLog.action)}</DialogDescription>
          </DialogHeader>
          {viewLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/40 p-2 transition-colors hover:border-violet-300/60 hover:bg-violet-50/30 dark:hover:bg-violet-500/5">
                  <p className="text-[10px] text-muted-foreground uppercase">Date</p>
                  <p className="font-medium text-xs">{new Date(viewLog.createdAt).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border/40 p-2 transition-colors hover:border-violet-300/60 hover:bg-violet-50/30 dark:hover:bg-violet-500/5">
                  <p className="text-[10px] text-muted-foreground uppercase">Performed By</p>
                  <p className="font-medium text-xs">{viewLog.performedByName || "System"}</p>
                </div>
                <div className="rounded-lg border border-border/40 p-2 transition-colors hover:border-violet-300/60 hover:bg-violet-50/30 dark:hover:bg-violet-500/5">
                  <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                  <Badge variant="outline" className={`text-[10px] ${viewLog.status === "Failed" ? "border-rose-300 text-rose-600" : "border-emerald-300 text-emerald-600"}`}>{viewLog.status}</Badge>
                </div>
                <div className="rounded-lg border border-border/40 p-2 transition-colors hover:border-violet-300/60 hover:bg-violet-50/30 dark:hover:bg-violet-500/5">
                  <p className="text-[10px] text-muted-foreground uppercase">IP / Device</p>
                  <p className="font-mono text-[10px]">{viewLog.ipAddress || "—"} {viewLog.device && `· ${viewLog.device}`}</p>
                </div>
                {viewLog.roleName && (
                  <div className="rounded-lg border border-border/40 p-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Role</p>
                    <p className="font-medium text-xs">{viewLog.roleName}</p>
                  </div>
                )}
                {viewLog.entityType && (
                  <div className="rounded-lg border border-border/40 p-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Entity</p>
                    <p className="font-medium text-xs">{viewLog.entityType} {viewLog.entityId && `· ${viewLog.entityId.slice(-8)}`}</p>
                  </div>
                )}
              </div>

              {viewLog.reason && (
                <div className="rounded-lg border border-border/40 p-2">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Reason</p>
                  <p className="text-xs">{viewLog.reason}</p>
                </div>
              )}

              {(viewLog.oldValue || viewLog.newValue) && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {viewLog.oldValue && (
                    <div className="rounded-lg border border-rose-200/50 bg-rose-50/30 dark:bg-rose-500/5 p-2">
                      <p className="text-[10px] text-rose-600 uppercase mb-1">Old Value</p>
                      <pre className="text-[10px] font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">{(() => { try { return JSON.stringify(JSON.parse(viewLog.oldValue), null, 2) } catch { return viewLog.oldValue } })()}</pre>
                    </div>
                  )}
                  {viewLog.newValue && (
                    <div className="rounded-lg border border-emerald-200/50 bg-emerald-50/30 dark:bg-emerald-500/5 p-2">
                      <p className="text-[10px] text-emerald-600 uppercase mb-1">New Value</p>
                      <pre className="text-[10px] font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">{(() => { try { return JSON.stringify(JSON.parse(viewLog.newValue), null, 2) } catch { return viewLog.newValue } })()}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
