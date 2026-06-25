"use client"

// =============================================================
// Onboarding Logs Section — spec #25 (audit trail)
// Task ID: 8-F
// READ-ONLY: filters + views system-generated logs.
// =============================================================

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ScrollText, User, Workflow, ArrowRightLeft, FileText, Mail,
  ListChecks, CheckCircle2, ShieldCheck, UserCheck, Settings,
  AlertTriangle, Search, Download, Inbox, X, ChevronLeft,
  ChevronRight, Clock, AlertCircle, Info,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from "@/components/ui/tooltip"

import { PageHeader, StatCard, EmptyState } from "@/components/hrms/ui"
import {
  useFetch, formatDateTime, initials,
} from "@/components/hrms/onboarding/shared"

// =============================================================
// Types
// =============================================================

interface LogItem {
  id: string
  tenantId?: string
  logType: string
  candidateId?: string | null
  candidateName?: string | null
  employeeCode?: string | null
  entityId?: string | null
  entityType?: string | null
  actionType: string
  oldValue?: string | null
  newValue?: string | null
  performedBy?: string | null
  performedByName?: string | null
  role?: string | null
  ipAddress?: string | null
  device?: string | null
  status: string // Success | Failed | Warning
  remarks?: string | null
  metadata?: string | null
  createdAt: string
}

interface LogsResponse {
  items: LogItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// =============================================================
// Log type metadata — 11 types per spec #25
// =============================================================

interface LogTypeMeta {
  value: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  borderClass: string // left-border color on table rows
  iconBgClass: string // sidebar icon bg
  iconTextClass: string // sidebar icon text color
}

const LOG_TYPES: LogTypeMeta[] = [
  {
    value: "Candidate Activity", label: "Candidate Activity", icon: User,
    borderClass: "border-l-emerald-500",
    iconBgClass: "bg-emerald-500/10",
    iconTextClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "Workflow", label: "Workflow", icon: Workflow,
    borderClass: "border-l-teal-500",
    iconBgClass: "bg-teal-500/10",
    iconTextClass: "text-teal-600 dark:text-teal-400",
  },
  {
    value: "Stage Movement", label: "Stage Movement", icon: ArrowRightLeft,
    borderClass: "border-l-cyan-500",
    iconBgClass: "bg-cyan-500/10",
    iconTextClass: "text-cyan-600 dark:text-cyan-400",
  },
  {
    value: "Document", label: "Document", icon: FileText,
    borderClass: "border-l-amber-500",
    iconBgClass: "bg-amber-500/10",
    iconTextClass: "text-amber-600 dark:text-amber-400",
  },
  {
    value: "Email", label: "Email", icon: Mail,
    borderClass: "border-l-violet-500",
    iconBgClass: "bg-violet-500/10",
    iconTextClass: "text-violet-600 dark:text-violet-400",
  },
  {
    value: "Checklist", label: "Checklist", icon: ListChecks,
    borderClass: "border-l-lime-500",
    iconBgClass: "bg-lime-500/10",
    iconTextClass: "text-lime-600 dark:text-lime-400",
  },
  {
    value: "Approval", label: "Approval", icon: CheckCircle2,
    borderClass: "border-l-emerald-500",
    iconBgClass: "bg-emerald-500/10",
    iconTextClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "Verification", label: "Verification", icon: ShieldCheck,
    borderClass: "border-l-rose-500",
    iconBgClass: "bg-rose-500/10",
    iconTextClass: "text-rose-600 dark:text-rose-400",
  },
  {
    value: "Employee Conversion", label: "Employee Conversion", icon: UserCheck,
    borderClass: "border-l-fuchsia-500",
    iconBgClass: "bg-fuchsia-500/10",
    iconTextClass: "text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    value: "System", label: "System", icon: Settings,
    borderClass: "border-l-slate-500",
    iconBgClass: "bg-slate-500/10",
    iconTextClass: "text-slate-600 dark:text-slate-400",
  },
  {
    value: "Error", label: "Error", icon: AlertTriangle,
    borderClass: "border-l-rose-500",
    iconBgClass: "bg-rose-500/10",
    iconTextClass: "text-rose-600 dark:text-rose-400",
  },
]

const ALL_LOG_TYPE_META: LogTypeMeta = {
  value: "All",
  label: "All Logs",
  icon: ScrollText,
  borderClass: "",
  iconBgClass: "bg-emerald-500/10",
  iconTextClass: "text-emerald-600 dark:text-emerald-400",
}

function getLogTypeMeta(value: string): LogTypeMeta | undefined {
  return LOG_TYPES.find((t) => t.value === value)
}

// =============================================================
// Status + role badge palettes (NO indigo, NO blue)
// =============================================================

const STATUS_OPTIONS = ["All", "Success", "Warning", "Failed"] as const

const STATUS_BADGE_CLASS: Record<string, string> = {
  Success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Failed: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  HR: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  System: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  Admin: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  Manager: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
}

function LogStatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE_CLASS[status] || "bg-muted text-muted-foreground"
  return (
    <Badge variant="secondary" className={cn("font-medium border-0", cls)}>
      {status}
    </Badge>
  )
}

function RoleBadge({ role }: { role?: string | null }) {
  if (!role) return <span className="text-muted-foreground/40 text-xs italic">—</span>
  const cls = ROLE_BADGE_CLASS[role] || "bg-muted text-muted-foreground"
  return (
    <Badge variant="secondary" className={cn("font-medium border-0 text-[10px] px-1.5 py-0", cls)}>
      {role}
    </Badge>
  )
}

// =============================================================
// CSV export helper
// =============================================================

function exportCsv(items: LogItem[]) {
  const headers = [
    "Date & Time", "Log Type", "Candidate", "Employee Code",
    "Entity Type", "Entity ID", "Action Type", "Old Value", "New Value",
    "Performed By", "Role", "IP Address", "Device", "Status", "Remarks",
  ]
  const esc = (v: string | null | undefined) => {
    const s = (v ?? "").toString()
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = items.map((it) => [
    formatDateTime(it.createdAt), it.logType, it.candidateName, it.employeeCode,
    it.entityType, it.entityId, it.actionType, it.oldValue, it.newValue,
    it.performedByName, it.role, it.ipAddress, it.device, it.status, it.remarks,
  ].map(esc).join(","))
  const csv = [headers.join(","), ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `onboarding-logs-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast.success(`Exported ${items.length} log${items.length === 1 ? "" : "s"} to CSV`)
}

// =============================================================
// Per-log-type counts (one fetch per type, all in parallel)
// =============================================================

function useLogTypeCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    let active = true
    Promise.all(
      LOG_TYPES.map(async (t) => {
        try {
          const r = await fetch(`/api/onboarding-logs?logType=${encodeURIComponent(t.value)}&pageSize=1`)
          if (!r.ok) return { type: t.value, count: 0 }
          const j = await r.json()
          return { type: t.value, count: j.total || 0 }
        } catch {
          return { type: t.value, count: 0 }
        }
      }),
    ).then((results) => {
      if (!active) return
      const map: Record<string, number> = {}
      results.forEach((r) => { map[r.type] = r.count })
      setCounts(map)
    }).catch(() => {
      // silently leave counts empty
    })
    return () => { active = false }
  }, [])

  return counts
}

// =============================================================
// Sidebar log-type pill
// =============================================================

function LogTypePill({
  meta, count, active, onClick,
}: {
  meta: LogTypeMeta
  count?: number
  active: boolean
  onClick: () => void
}) {
  const Icon = meta.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-sm transition-all",
        "border-transparent hover:bg-muted/40",
        active && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      )}
    >
      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md", meta.iconBgClass, meta.iconTextClass)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 truncate font-medium">{meta.label}</span>
      {typeof count === "number" && (
        <span className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
          active
            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
            : "bg-muted text-muted-foreground",
        )}>
          {count}
        </span>
      )}
    </button>
  )
}

// =============================================================
// Table skeleton
// =============================================================

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="p-2 space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  )
}

// =============================================================
// Log detail Sheet
// =============================================================

function metadataToDisplay(raw?: string | null): string | null {
  if (!raw) return null
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function DetailField({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="space-y-0.5 min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-sm text-foreground break-words", mono && "font-mono text-xs")}>
        {value || <span className="text-muted-foreground/50 italic">—</span>}
      </p>
    </div>
  )
}

function LogDetailSheet({
  log, open, onOpenChange,
}: {
  log: LogItem | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!log) return null
  const meta = getLogTypeMeta(log.logType)
  const Icon = meta?.icon || ScrollText
  const metadataDisplay = metadataToDisplay(log.metadata)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2.5 pr-6">
            <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", meta?.iconBgClass, meta?.iconTextClass)}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-base leading-tight">{log.actionType}</SheetTitle>
              <SheetDescription className="mt-0.5">
                {log.logType} · {formatDateTime(log.createdAt)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <LogStatusBadge status={log.status} />
            {log.role && <RoleBadge role={log.role} />}
            <Badge variant="outline" className="text-[10px] border-border/60 text-muted-foreground">
              {log.logType}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Candidate" value={log.candidateName} />
            <DetailField label="Employee Code" value={log.employeeCode} />
            <DetailField label="Entity Type" value={log.entityType} />
            <DetailField label="Entity ID" value={log.entityId} mono />
            <DetailField label="Performed By" value={log.performedByName} />
            <DetailField label="IP Address" value={log.ipAddress} mono />
            <DetailField label="Device" value={log.device} />
            <DetailField label="Candidate ID" value={log.candidateId} mono />
          </div>

          <div className="space-y-3">
            <DetailField label="Old Value" value={log.oldValue} />
            <DetailField label="New Value" value={log.newValue} />
            <DetailField label="Remarks" value={log.remarks} />
          </div>

          {metadataDisplay && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Metadata</p>
              <pre className="bg-muted/50 rounded-lg border border-border/60 p-3 text-xs text-foreground/90 overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                {metadataDisplay}
              </pre>
            </div>
          )}

          <div className="pt-3 border-t border-border/60 space-y-1.5">
            <DetailField label="Log ID" value={log.id} mono />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
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
  const [pageSize, setPageSize] = useState(50)
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // ---- Stable stats URLs (computed once on mount) ----
  const [statsUrls] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return {
      total: "/api/onboarding-logs?pageSize=1",
      today: `/api/onboarding-logs?from=${d.toISOString()}&pageSize=1`,
      errors: "/api/onboarding-logs?status=Failed&pageSize=1",
      warnings: "/api/onboarding-logs?status=Warning&pageSize=1",
    }
  })

  const { data: statsTotal } = useFetch<LogsResponse>(statsUrls.total, [])
  const { data: statsToday } = useFetch<LogsResponse>(statsUrls.today, [])
  const { data: statsErrors } = useFetch<LogsResponse>(statsUrls.errors, [])
  const { data: statsWarnings } = useFetch<LogsResponse>(statsUrls.warnings, [])

  // ---- Per-log-type counts (single hook, 11 parallel fetches) ----
  const logTypeCounts = useLogTypeCounts()

  // ---- Main query URL ----
  const mainUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("pageSize", String(pageSize))
    if (activeType !== "All") params.set("logType", activeType)
    if (activeStatus !== "All") params.set("status", activeStatus)
    if (fromDate) params.set("from", fromDate)
    if (toDate) params.set("to", `${toDate}T23:59:59`)
    if (search.trim()) params.set("q", search.trim())
    return `/api/onboarding-logs?${params.toString()}`
  }, [activeType, activeStatus, fromDate, toDate, search, page, pageSize])

  const { data, loading, error } = useFetch<LogsResponse>(mainUrl, [pageSize])

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 0

  // ---- Handlers (each batches page reset with filter change) ----
  const handleTypeChange = (t: string) => { setActiveType(t); setPage(1) }
  const handleStatusChange = (s: string) => { setActiveStatus(s); setPage(1) }
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1) }
  const handleFromDateChange = (v: string) => { setFromDate(v); setPage(1) }
  const handleToDateChange = (v: string) => { setToDate(v); setPage(1) }
  const handlePageSizeChange = (v: number) => { setPageSize(v); setPage(1) }

  const handleRowClick = (log: LogItem) => {
    setSelectedLog(log)
    setSheetOpen(true)
  }

  const handleExport = () => {
    if (items.length === 0) {
      toast.error("No logs to export")
      return
    }
    exportCsv(items)
  }

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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Onboarding Logs"
        description="Complete audit trail of every action across the onboarding pipeline. Filter by type, candidate, or date range."
        icon={ScrollText}
        badge={
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
            {statsTotal?.total ?? 0} total
          </Badge>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Logs" value={statsTotal?.total ?? "—"} icon={ScrollText} accent="emerald" sub="All time" />
        <StatCard label="Logs Today" value={statsToday?.total ?? "—"} icon={Clock} accent="cyan" sub="Since midnight" />
        <StatCard label="Errors" value={statsErrors?.total ?? "—"} icon={AlertCircle} accent="coral" sub="Status: Failed" />
        <StatCard label="Warnings" value={statsWarnings?.total ?? "—"} icon={AlertTriangle} accent="amber" sub="Status: Warning" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        {/* LEFT: filter sidebar */}
        <aside className="space-y-3 lg:sticky lg:top-2 lg:self-start">
          <div className="rounded-xl border border-border/60 bg-card p-2.5 space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 pb-1.5 pt-1">
              Log Types
            </p>
            <LogTypePill
              meta={ALL_LOG_TYPE_META}
              count={statsTotal?.total}
              active={activeType === "All"}
              onClick={() => handleTypeChange("All")}
            />
            <div className="h-px bg-border/40 my-1" />
            {LOG_TYPES.map((t) => (
              <LogTypePill
                key={t.value}
                meta={t}
                count={logTypeCounts[t.value]}
                active={activeType === t.value}
                onClick={() => handleTypeChange(t.value)}
              />
            ))}
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-2.5 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1">Status</p>
            <div className="flex flex-wrap gap-1.5 px-1">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStatusChange(s)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium border transition-all",
                    activeStatus === s
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      : "bg-background text-muted-foreground border-border/60 hover:bg-muted/40",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-2.5 space-y-2">
            <div className="flex items-center gap-1.5 px-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date Range</p>
            </div>
            <div className="space-y-1.5 px-1">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground/80">From</label>
                <Input
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                  className="h-8 text-xs mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground/80">To</label>
                <Input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => handleToDateChange(e.target.value)}
                  className="h-8 text-xs mt-0.5"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleResetFilters}
              >
                <X className="h-3 w-3" /> Reset Filters
              </Button>
            )}
          </div>
        </aside>

        {/* RIGHT: toolbar + table + pagination */}
        <section className="space-y-3 min-w-0">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search candidate, code, action, performed by, remarks…"
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={items.length === 0}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
          </div>

          {/* Table card */}
          <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
            {loading ? (
              <TableSkeleton rows={8} />
            ) : error ? (
              <EmptyState
                icon={AlertCircle}
                title="Failed to load logs"
                description={error}
                action={
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                }
              />
            ) : items.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No logs match your filters."
                description="Try adjusting the log type, status, search keyword, or date range."
                action={
                  hasActiveFilters ? (
                    <Button variant="outline" size="sm" onClick={handleResetFilters}>
                      Reset Filters
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto max-h-[68vh] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
                    <TableRow className="border-border/60 hover:bg-muted/60">
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Date & Time</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Candidate</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Emp Code</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Entity</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Action Type</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Value Change</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Performed By</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">IP Address</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Device</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((log, idx) => {
                      const meta = getLogTypeMeta(log.logType)
                      return (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, delay: Math.min(idx * 0.015, 0.25) }}
                          onClick={() => handleRowClick(log)}
                          className={cn(
                            "cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/30 border-l-4",
                            meta?.borderClass || "border-l-slate-400",
                          )}
                        >
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-2.5">
                            {formatDateTime(log.createdAt)}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback
                                  className={cn("text-[10px] font-semibold", meta?.iconBgClass, meta?.iconTextClass)}
                                >
                                  {initials(log.candidateName || "?")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-foreground truncate max-w-[150px]">
                                {log.candidateName || <span className="text-muted-foreground/50 italic text-xs">—</span>}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap py-2.5">
                            {log.employeeCode || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-2.5">
                            {log.entityType || "—"}
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
                                <ArrowRightLeft className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                              )}
                              <span className="text-foreground/80 truncate font-medium">
                                {log.newValue || <span className="italic">∅</span>}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-foreground truncate max-w-[110px]">
                                {log.performedByName || <span className="text-muted-foreground/50 italic text-xs">System</span>}
                              </span>
                              {log.role && <RoleBadge role={log.role} />}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap py-2.5">
                            {log.ipAddress || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate py-2.5">
                            {log.device || "—"}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <LogStatusBadge status={log.status} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] py-2.5">
                            {log.remarks ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="truncate block cursor-help">{log.remarks}</span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm whitespace-normal text-left">
                                  {log.remarks}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground/40 italic">—</span>
                            )}
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
          {!loading && !error && items.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between px-1 pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Rows per page:</span>
                <Select value={String(pageSize)} onValueChange={(v) => handlePageSizeChange(Number(v))}>
                  <SelectTrigger className="h-7 w-[72px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
                <span className="hidden sm:inline">· {total} total</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </Button>
                <span className="text-xs text-muted-foreground px-1">
                  Page <span className="font-semibold text-foreground">{page}</span> of {Math.max(totalPages, 1)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 gap-1"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Hint footer */}
          {!loading && !error && items.length > 0 && (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 px-1">
              <Info className="h-3 w-3" />
              Click any row to view full log details including metadata.
            </p>
          )}
        </section>
      </div>

      {/* Detail drawer */}
      <LogDetailSheet log={selectedLog} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  )
}

export default LogsSection
