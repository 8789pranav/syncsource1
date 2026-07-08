"use client"

// ============================================================
// AuditTab — read-only audit history.
// API: /api/employees/[id]/audit (GET list only).
// SECURITY: Visible to Super admin / Org admin / HR admin /
// Auditor only.
// ------------------------------------------------------------

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  ShieldAlert, Search, Download, Filter, X, Eye, ShieldCheck, ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState, SectionCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"

// ---------- types ----------

interface AuditRec {
  id: string
  module?: string | null
  field?: string | null
  oldValue?: string | null
  newValue?: string | null
  action?: string | null
  changedBy?: string | null
  reason?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  approvalRef?: string | null
  createdAt: string | Date
}

// ---------- helpers ----------

const MODULES = [
  "Personal", "Job", "Bank", "Statutory", "Document", "Leave", "Attendance",
  "Payroll", "Compensation", "Performance", "Asset", "Role", "Exit", "Other",
] as const

const ACTIONS = ["Create", "Update", "Delete"] as const

const MODULE_COLORS: Record<string, string> = {
  Personal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Job: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Bank: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Statutory: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Document: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Leave: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Attendance: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Payroll: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
  Compensation: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
  Performance: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Asset: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Role: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Exit: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Other: "bg-muted text-muted-foreground",
}

const ACTION_COLORS: Record<string, string> = {
  Create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Update: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Delete: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

function fmtDateTime(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy, hh:mm a") } catch { return "—" }
}

// ============================================================
// Component
// ============================================================

export default function AuditTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<AuditRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [moduleFilter, setModuleFilter] = React.useState<string>("all")
  const [actionFilter, setActionFilter] = React.useState<string>("all")
  const [fromDate, setFromDate] = React.useState<string>("")
  const [toDate, setToDate] = React.useState<string>("")
  const [fieldSearch, setFieldSearch] = React.useState("")
  const [view, setView] = React.useState<AuditRec | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/audit`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load audit log")
      setItems(data?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load audit log")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  const filtered = React.useMemo(() => {
    return items.filter((r) => {
      if (moduleFilter !== "all" && r.module !== moduleFilter) return false
      if (actionFilter !== "all" && r.action !== actionFilter) return false
      if (fromDate) {
        const d = new Date(r.createdAt).getTime()
        const f = new Date(fromDate).getTime()
        if (d < f) return false
      }
      if (toDate) {
        const d = new Date(r.createdAt).getTime()
        const t = new Date(toDate).getTime() + 24 * 60 * 60 * 1000
        if (d > t) return false
      }
      if (fieldSearch) {
        const q = fieldSearch.toLowerCase()
        if (!(r.field || "").toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [items, moduleFilter, actionFilter, fromDate, toDate, fieldSearch])

  const lastModified = items.length > 0
    ? fmtDateTime(items[0].createdAt)
    : null

  const hasFilters = moduleFilter !== "all" || actionFilter !== "all" || fromDate || toDate || fieldSearch

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
          <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            Audit Log
            <Badge variant="outline" className="gap-1 text-rose-600 border-rose-200 dark:border-rose-500/30 dark:text-rose-400">
              <ShieldAlert className="h-3 w-3" /> Restricted
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Read-only audit trail of every change to this employee record. Visible to Super admin / Org admin / HR admin / Auditor only.
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 shrink-0"
          onClick={() => toast.info("Exporting audit log...")}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      {/* Security banner */}
      <div className="rounded-xl border border-rose-200/70 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/10 p-3 flex items-center gap-2 text-sm">
        <ShieldCheck className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
        <p className="text-rose-700 dark:text-rose-300">
          This audit trail is sensitive. Access is logged. Do not share without authorization.
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-sm flex-wrap">
        <Badge variant="outline" className="gap-1.5">
          <ShieldAlert className="h-3 w-3" /> {filtered.length} of {items.length} entr{filtered.length === 1 ? "y" : "ies"}
        </Badge>
        {lastModified && (
          <span className="text-xs text-muted-foreground">Last modified: {lastModified}</span>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              {MODULES.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9"
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9"
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search field..."
              value={fieldSearch}
              onChange={(e) => setFieldSearch(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 gap-1.5"
            onClick={() => { setModuleFilter("all"); setActionFilter("all"); setFromDate(""); setToDate(""); setFieldSearch("") }}>
            <X className="h-3.5 w-3.5" /> Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border/60">
          <EmptyState
            icon={ShieldAlert}
            title="No audit entries"
            description="No changes match your filters, or this employee record has no audit history yet."
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
          <ScrollArea className="max-h-[640px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[160px]">Timestamp</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Module</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Field</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[280px]">Old → New</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Changed by</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">IP</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setView(r)}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(r.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-medium border-0", MODULE_COLORS[r.module || ""] || "bg-muted text-muted-foreground")}>
                        {r.module || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.field || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-[280px]">
                        <span className="text-xs text-muted-foreground truncate" title={r.oldValue || ""}>{r.oldValue || "—"}</span>
                        {r.action !== "Create" && r.action !== "Delete" && (
                          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        )}
                        {r.action !== "Delete" && (
                          <span className="text-xs font-medium text-foreground truncate" title={r.newValue || ""}>{r.newValue || "—"}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-medium border-0", ACTION_COLORS[r.action || ""] || "bg-muted text-muted-foreground")}>
                        {r.action || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.changedBy || "—"}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[180px] truncate" title={r.reason || ""}>{r.reason || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{r.ipAddress || "—"}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setView(r)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              Audit Entry
              {view?.module && (
                <Badge variant="secondary" className={cn("font-medium border-0", MODULE_COLORS[view.module] || "bg-muted text-muted-foreground")}>
                  {view.module}
                </Badge>
              )}
              {view?.action && (
                <Badge variant="secondary" className={cn("font-medium border-0", ACTION_COLORS[view.action] || "bg-muted text-muted-foreground")}>
                  {view.action}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {fmtDateTime(view?.createdAt)} · {view?.changedBy || "—"}
            </DialogDescription>
          </DialogHeader>
          {view && (
            <div className="space-y-4">
              <SectionCard title="Change">
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Field</dt>
                    <dd className="font-mono font-medium">{view.field || "—"}</dd>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-xs text-muted-foreground mb-1">Old value</dt>
                      <dd className="text-sm break-words whitespace-pre-wrap">{view.oldValue || "—"}</dd>
                    </div>
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-3">
                      <dt className="text-xs text-emerald-700 dark:text-emerald-400 mb-1">New value</dt>
                      <dd className="text-sm break-words whitespace-pre-wrap">{view.newValue || "—"}</dd>
                    </div>
                  </div>
                </dl>
              </SectionCard>
              <SectionCard title="Context">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Changed by</dt>
                    <dd className="font-medium">{view.changedBy || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">IP address</dt>
                    <dd className="font-mono text-xs font-medium">{view.ipAddress || "—"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Reason</dt>
                    <dd className="font-medium">{view.reason || "—"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">User agent</dt>
                    <dd className="text-xs font-mono break-words">{view.userAgent || "—"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Approval reference</dt>
                    <dd className="font-mono text-xs font-medium">{view.approvalRef || "—"}</dd>
                  </div>
                </dl>
              </SectionCard>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
