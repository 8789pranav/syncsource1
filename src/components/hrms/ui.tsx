'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { LucideIcon, Search, Plus, Inbox } from "lucide-react"

// ---------- Page Header ----------

export function PageHeader({
  title, description, icon: Icon, actions, badge,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-emerald text-primary-foreground shadow-soft">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">{title}</h1>
            {badge}
          </div>
          {description && <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

// ---------- Stat Card ----------

export function StatCard({
  label, value, icon: Icon, trend, accent = "emerald", sub,
}: {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  trend?: { value: string; up: boolean }
  accent?: "emerald" | "amber" | "fuchsia" | "coral" | "cyan"
  sub?: string
}) {
  const accents: Record<string, string> = {
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400",
    fuchsia: "from-fuchsia-500/10 to-fuchsia-500/5 text-fuchsia-600 dark:text-fuchsia-400",
    coral: "from-rose-500/10 to-rose-500/5 text-rose-600 dark:text-rose-400",
    cyan: "from-cyan-500/10 to-cyan-500/5 text-cyan-600 dark:text-cyan-400",
  }
  return (
    <Card className="relative overflow-hidden border-border/60 shadow-soft hover:shadow-card transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-semibold mt-1 text-foreground tabular-nums">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            {trend && (
              <div className={cn("inline-flex items-center gap-1 mt-2 text-xs font-medium", trend.up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                <span>{trend.up ? "▲" : "▼"}</span>
                <span>{trend.value}</span>
              </div>
            )}
          </div>
          <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br", accents[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Empty State ----------

export function EmptyState({
  icon: Icon = Inbox, title, description, action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground mb-4">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ---------- Search + Add bar ----------

export function ListToolbar({
  search, onSearch, onAdd, addLabel = "Add New", extra,
}: {
  search: string
  onSearch: (v: string) => void
  onAdd?: () => void
  addLabel?: string
  extra?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-3">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search..."
          className="pl-9 h-9 bg-background"
        />
      </div>
      <div className="flex items-center gap-2">
        {extra}
        {onAdd && (
          <Button size="sm" onClick={onAdd} className="gap-1.5">
            <Plus className="h-4 w-4" /> {addLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------- Generic Data Table ----------

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
  width?: string
}

export function DataTable<T extends { id: string }>({
  columns, rows, loading, onRowClick, emptyState,
  selectable, selectedIds, onSelectionChange, getRowId,
}: {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  onRowClick?: (row: T) => void
  emptyState?: React.ReactNode
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  getRowId?: (row: T) => string
}) {
  const rowId = (r: T) => (getRowId ? getRowId(r) : (r as any).id)
  const allSelected = selectable && rows.length > 0 && selectedIds !== undefined && rows.every((r) => selectedIds.has(rowId(r)))
  const someSelected = selectable && selectedIds !== undefined && !allSelected && selectedIds.size > 0

  const toggleAll = () => {
    if (!onSelectionChange || selectedIds === undefined) return
    const next = new Set(selectedIds)
    if (allSelected) {
      rows.forEach((r) => next.delete(rowId(r)))
    } else {
      rows.forEach((r) => next.add(rowId(r)))
    }
    onSelectionChange(next)
  }

  const toggleRow = (r: T) => {
    if (!onSelectionChange || selectedIds === undefined) return
    const next = new Set(selectedIds)
    const id = rowId(r)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="p-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }
  if (rows.length === 0) {
    return <div className="rounded-xl border border-border/60">{emptyState || <EmptyState title="No records found" description="Add a new record or adjust your filters." />}</div>
  }
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {selectable && (
                <TableHead className="w-[44px] pl-3">
                  <Checkbox
                    checked={allSelected ? true : (someSelected ? "indeterminate" : false)}
                    onCheckedChange={toggleAll}
                    aria-label="Select all rows"
                  />
                </TableHead>
              )}
              {columns.map((c) => (
                <TableHead key={c.key} className={cn("text-xs font-semibold uppercase tracking-wide text-muted-foreground", c.className)} style={{ width: c.width }}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const id = rowId(row)
              const isSelected = selectable && selectedIds?.has(id)
              return (
                <TableRow
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-muted/30",
                    isSelected && "bg-emerald-50/60 dark:bg-emerald-500/5",
                  )}
                >
                  {selectable && (
                    <TableCell className="w-[44px] pl-3" onClick={(ev) => ev.stopPropagation()}>
                      <Checkbox
                        checked={isSelected || false}
                        onCheckedChange={() => toggleRow(row)}
                        aria-label={`Select row ${id}`}
                      />
                    </TableCell>
                  )}
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn("text-sm", c.className)}>
                      {c.render ? c.render(row) : (row as any)[c.key]}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ---------- Status Badge ----------

const statusColors: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Inactive: "bg-muted text-muted-foreground",
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Cancelled: "bg-muted text-muted-foreground",
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  Published: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Locked: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  "In Stock": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Assigned: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Returned: "bg-muted text-muted-foreground",
  Damaged: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Lost: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Repair: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Retired: "bg-muted text-muted-foreground",
  Disposed: "bg-muted text-muted-foreground",
  "On Probation": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "On Notice": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Resigned: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Fulfilled: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
}

export function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted-foreground/50 text-sm italic">—</span>
  const cls = statusColors[status] || "bg-muted text-muted-foreground"
  return <Badge variant="secondary" className={cn("font-medium border-0", cls)}>{status}</Badge>
}

// ---------- Section Card ----------

export function SectionCard({
  title, description, children, action, className,
}: {
  title?: string
  description?: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn("border-border/60 shadow-soft", className)}>
      {(title || action) && (
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <div>
            {title && <CardTitle className="text-sm font-semibold">{title}</CardTitle>}
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>
          {action}
        </CardHeader>
      )}
      <CardContent className={cn((title || action) && "pt-0")}>{children}</CardContent>
    </Card>
  )
}

// ---------- async button ----------

export function useAsyncAction() {
  const [loading, setLoading] = React.useState(false)
  const run = React.useCallback(async (fn: () => Promise<void>) => {
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }, [])
  return { loading, run }
}
