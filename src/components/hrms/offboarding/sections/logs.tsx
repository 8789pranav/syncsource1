"use client"

// =============================================================
// Offboarding Logs (spec section #23) — Task ID 2a
// READ-ONLY audit trail. Rose theme.
// =============================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ScrollText, UserMinus, Inbox, Layers, ArrowRightLeft,
  ClipboardCheck, Package, Lock, Wallet, FileText, Mail,
  CheckCircle2, UserX, Users, AlertOctagon,
  Search, Download, X, ChevronLeft, ChevronRight,
  AlertCircle, Info, Clock,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

import {
  OffboardingLog,
  formatDateTime, formatDate,
} from "../shared"
import { OFFBOARDING_LOGS } from "../data"

// =============================================================
// Log type metadata — 14 types per spec #23 + "All"
// =============================================================
interface LogTypeMeta {
  value: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  chipActive: string
  dot: string
}

const LOG_TYPES: LogTypeMeta[] = [
  { value: "Exit Case Logs",         label: "Exit Case",      icon: UserMinus,       chipActive: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",       dot: "bg-rose-500" },
  { value: "Resignation Logs",       label: "Resignation",    icon: Inbox,           chipActive: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",   dot: "bg-amber-500" },
  { value: "Workflow Logs",          label: "Workflow",       icon: Layers,          chipActive: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30", dot: "bg-violet-500" },
  { value: "Stage Movement Logs",    label: "Stage Movement", icon: ArrowRightLeft,  chipActive: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",       dot: "bg-cyan-500" },
  { value: "Clearance Logs",         label: "Clearance",      icon: ClipboardCheck,  chipActive: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30", dot: "bg-orange-500" },
  { value: "Asset Recovery Logs",    label: "Asset Recovery", icon: Package,         chipActive: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",       dot: "bg-teal-500" },
  { value: "IT Revocation Logs",     label: "IT Revocation",  icon: Lock,            chipActive: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30",       dot: "bg-pink-500" },
  { value: "FnF Logs",               label: "FnF",            icon: Wallet,          chipActive: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", dot: "bg-emerald-500" },
  { value: "Document / Letter Logs", label: "Document/Letter",icon: FileText,        chipActive: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",       dot: "bg-cyan-500" },
  { value: "Email Logs",             label: "Email",          icon: Mail,            chipActive: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30", dot: "bg-violet-500" },
  { value: "Approval Logs",          label: "Approval",       icon: CheckCircle2,    chipActive: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", dot: "bg-emerald-500" },
  { value: "Employee Status Logs",   label: "Employee Status",icon: UserX,           chipActive: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",       dot: "bg-rose-500" },
  { value: "Alumni Logs",            label: "Alumni",         icon: Users,           chipActive: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30", dot: "bg-fuchsia-500" },
  { value: "System Error Logs",      label: "System Error",   icon: AlertOctagon,    chipActive: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",       dot: "bg-rose-500" },
]

const ALL_META: LogTypeMeta = {
  value: "All",
  label: "All Logs",
  icon: ScrollText,
  chipActive: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  dot: "bg-rose-500",
}

function getLogTypeMeta(value: string): LogTypeMeta | undefined {
  return LOG_TYPES.find((t) => t.value === value)
}

// =============================================================
// Status badges
// =============================================================
const STATUS_OPTIONS = ["All", "Success", "Warning", "Error", "Info"] as const

const STATUS_BADGE_CLASS: Record<string, string> = {
  Success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Error:   "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Info:    "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
}

function LogStatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE_CLASS[status] || "bg-muted text-muted-foreground"
  return (
    <Badge variant="secondary" className={cn("font-medium border-0", cls)}>
      {status}
    </Badge>
  )
}

// =============================================================
// Export helper — fires a toast (UI-only per spec)
// =============================================================
function handleExport(count: number) {
  if (count === 0) {
    toast.error("No logs to export")
    return
  }
  toast.success(`Exported ${count} log${count === 1 ? "" : "s"} to CSV`, {
    description: `offboarding-logs-${new Date().toISOString().slice(0, 10)}.csv`,
  })
}

// =============================================================
// Main section
// =============================================================
export function LogsSection() {
  // ---- Filter state ----
  const [activeType, setActiveType] = useState<string>("All")
  const [activeStatus, setActiveStatus] = useState<string>("All")
  const [search, setSearch] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // ---- Per-type counts ----
  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {}
    OFFBOARDING_LOGS.forEach((l) => {
      map[l.logType] = (map[l.logType] || 0) + 1
    })
    return map
  }, [])

  // ---- Main filter pipeline ----
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const fromTs = fromDate ? new Date(fromDate).getTime() : null
    // end-of-day for `to`
    const toTs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null

    return OFFBOARDING_LOGS.filter((log: OffboardingLog) => {
      if (activeType !== "All" && log.logType !== activeType) return false
      if (activeStatus !== "All" && log.status !== activeStatus) return false
      if (fromTs || toTs) {
        const ts = new Date(log.timestamp).getTime()
        if (fromTs !== null && ts < fromTs) return false
        if (toTs !== null && ts > toTs) return false
      }
      if (q) {
        const hay = [
          log.employeeName || "",
          log.exitCaseId || "",
          log.actionType || "",
          log.employeeCode || "",
          log.performedBy || "",
          log.remarks || "",
        ].join(" ").toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [activeType, activeStatus, fromDate, toDate, search])

  // ---- Pagination ----
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageClamped = Math.min(page, totalPages)
  const startIdx = (pageClamped - 1) * pageSize
  const items = filtered.slice(startIdx, startIdx + pageSize)

  // ---- Handlers ----
  const handleTypeChange = (t: string) => { setActiveType(t); setPage(1) }
  const handleStatusChange = (s: string) => { setActiveStatus(s); setPage(1) }
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1) }
  const handleFromDateChange = (v: string) => { setFromDate(v); setPage(1) }
  const handleToDateChange = (v: string) => { setToDate(v); setPage(1) }
  const handlePageSizeChange = (v: number) => { setPageSize(v); setPage(1) }

  const handleResetFilters = () => {
    setActiveType("All")
    setActiveStatus("All")
    setSearch("")
    setFromDate("")
    setToDate("")
    setPage(1)
  }

  const hasActiveFilters =
    activeType !== "All" ||
    activeStatus !== "All" ||
    search.trim() !== "" ||
    fromDate !== "" ||
    toDate !== ""

  // ---- Stats ----
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTs = today.getTime()
  const statsTotal = OFFBOARDING_LOGS.length
  const statsToday = OFFBOARDING_LOGS.filter((l) => new Date(l.timestamp).getTime() >= todayTs).length
  const statsErrors = OFFBOARDING_LOGS.filter((l) => l.status === "Error").length
  const statsWarnings = OFFBOARDING_LOGS.filter((l) => l.status === "Warning").length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-4 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-rose text-primary-foreground shadow-soft">
            <ScrollText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Offboarding Logs</h1>
              <Badge variant="outline" className="border-rose-500/30 text-rose-700 dark:text-rose-400">
                {statsTotal} total
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Complete audit trail of every action across the exit pipeline — case creation, stage movements, clearance, FnF, letters, and more.
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-border/60 rounded-xl shadow-soft bg-gradient-to-br from-rose-500/10 to-rose-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-semibold mt-1 text-foreground tabular-nums">{statsTotal}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">All time</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-background/70 ring-1 ring-rose-500/20 text-rose-600 dark:text-rose-400">
                <ScrollText className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 rounded-xl shadow-soft bg-gradient-to-br from-cyan-500/10 to-cyan-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Logs Today</p>
                <p className="text-2xl font-semibold mt-1 text-foreground tabular-nums">{statsToday}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Since midnight</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-background/70 ring-1 ring-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 rounded-xl shadow-soft bg-gradient-to-br from-rose-500/10 to-rose-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Errors</p>
                <p className="text-2xl font-semibold mt-1 text-foreground tabular-nums">{statsErrors}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Status: Error</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-background/70 ring-1 ring-rose-500/20 text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 rounded-xl shadow-soft bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Warnings</p>
                <p className="text-2xl font-semibold mt-1 text-foreground tabular-nums">{statsWarnings}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Status: Warning</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-background/70 ring-1 ring-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Log type filter chips */}
      <div className="rounded-xl border border-border/60 bg-card p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 pb-2">Log Type</p>
        <div className="flex flex-wrap gap-1.5">
          {/* All */}
          <button
            type="button"
            onClick={() => handleTypeChange("All")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
              activeType === "All"
                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                : "bg-background text-muted-foreground border-border/60 hover:bg-muted/40",
            )}
          >
            <ALL_META.icon className="h-3 w-3" />
            All
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
              activeType === "All" ? "bg-rose-500/20 text-rose-700 dark:text-rose-300" : "bg-muted text-muted-foreground",
            )}>
              {statsTotal}
            </span>
          </button>
          {LOG_TYPES.map((t) => {
            const Icon = t.icon
            const active = activeType === t.value
            const count = typeCounts[t.value] || 0
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => handleTypeChange(t.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                  active
                    ? t.chipActive
                    : "bg-background text-muted-foreground border-border/60 hover:bg-muted/40",
                )}
              >
                <Icon className="h-3 w-3" />
                {t.label}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  active
                    ? "bg-foreground/10 text-foreground"
                    : "bg-muted text-muted-foreground",
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Toolbar: search + date range + status + export */}
      <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
        <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search employee, exit case ID, action, performed by…"
              className="pl-9 h-9 bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport(filtered.length)}
              disabled={filtered.length === 0}
              className="gap-1.5 h-9 border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 pt-3 border-t border-border/40">
          {/* Date range */}
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Clock className="h-3 w-3" /> From
              </label>
              <Input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => handleFromDateChange(e.target.value)}
                className="h-8 text-xs w-[150px]"
              />
            </div>
            <span className="text-xs text-muted-foreground pb-1.5">→</span>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Clock className="h-3 w-3" /> To
              </label>
              <Input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => handleToDateChange(e.target.value)}
                className="h-8 text-xs w-[150px]"
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStatusChange(s)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium border transition-all",
                    activeStatus === s
                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                      : "bg-background text-muted-foreground border-border/60 hover:bg-muted/40",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground mb-4">
              <Inbox className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No logs match your filters.</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Try adjusting the log type, status, search keyword, or date range.
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4">
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[68vh] overflow-y-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
                <TableRow className="border-border/60 hover:bg-muted/60">
                  {[
                    "Date & Time",
                    "Exit Case ID",
                    "Employee",
                    "Emp Code",
                    "Entity",
                    "Log Type",
                    "Action Type",
                    "Old → New Value",
                    "Performed By",
                    "Role",
                    "IP Address",
                    "Status",
                    "Remarks",
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400 whitespace-nowrap"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((log: OffboardingLog, idx: number) => {
                  const meta = getLogTypeMeta(log.logType)
                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: Math.min(idx * 0.015, 0.25) }}
                      className={cn(
                        "border-b border-border/40 transition-colors hover:bg-muted/30",
                      )}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-2.5">
                        {formatDateTime(log.timestamp)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-foreground/80 whitespace-nowrap py-2.5">
                        {log.exitCaseId || <span className="text-muted-foreground/50 italic">—</span>}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-semibold", meta?.chipActive || "bg-muted text-muted-foreground")}>
                            {(log.employeeName || "?").slice(0, 1).toUpperCase()}
                          </span>
                          <span className="text-sm text-foreground truncate max-w-[140px]">
                            {log.employeeName || <span className="text-muted-foreground/50 italic text-xs">—</span>}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap py-2.5">
                        {log.employeeCode || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-2.5 max-w-[150px] truncate">
                        {log.entity || "—"}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className={cn("h-2 w-2 rounded-full", meta?.dot || "bg-slate-400")} />
                          <span className="text-muted-foreground">{log.logType}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-foreground whitespace-nowrap py-2.5">
                        {log.actionType}
                      </TableCell>
                      <TableCell className="text-xs py-2.5">
                        <div className="flex items-center gap-1.5 max-w-[220px]">
                          <span className="text-muted-foreground truncate">
                            {log.oldValue || <span className="italic">∅</span>}
                          </span>
                          {(log.oldValue || log.newValue) && (
                            <ArrowRightLeft className="h-3 w-3 text-rose-500/60 shrink-0" />
                          )}
                          <span className="text-foreground/80 truncate font-medium">
                            {log.newValue || <span className="italic">∅</span>}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground py-2.5">
                        <span className="truncate block max-w-[120px]">{log.performedBy || "—"}</span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        {log.role ? (
                          <Badge variant="outline" className="text-[10px] border-border/60 text-muted-foreground font-medium">
                            {log.role}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs italic">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap py-2.5">
                        {log.ipAddress || "—"}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <LogStatusBadge status={log.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] py-2.5">
                        <span className="truncate block">{log.remarks || <span className="italic">—</span>}</span>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between px-1 pt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={(v) => handlePageSizeChange(Number(v))}>
              <SelectTrigger className="h-7 w-[72px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="hidden sm:inline">
              · Showing {startIdx + 1}–{Math.min(startIdx + pageSize, total)} of {total}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pageClamped <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <span className="text-xs text-muted-foreground px-1">
              Page <span className="font-semibold text-foreground">{pageClamped}</span> of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pageClamped >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 gap-1"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Hint footer */}
      {items.length > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 px-1">
          <Info className="h-3 w-3" />
          Logs are read-only system audit entries. {formatDate(new Date())} snapshot.
        </p>
      )}
    </div>
  )
}

export default LogsSection
