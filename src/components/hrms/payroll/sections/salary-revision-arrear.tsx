"use client"

// ============================================================================
//  SalaryRevisionArrearSection — Arrear menu #4
//  ----------------------------------------------------------------------------
//  Arrears generated from salary revisions. Filter + stats + table + Generate
//  from Revision dialog (pick a pending salary revision, auto-calculate arrear
//  for affected months, review breakdown). Amber/orange accent.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  TrendingUp, Plus, Search, Filter, RefreshCw, Eye, CheckCircle2,
  Clock, IndianRupee, Layers, Inbox, Building2, Briefcase, Link2,
  MoreHorizontal, ArrowRight, Percent, CalendarDays, FileSpreadsheet,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Avatar, AvatarFallback,
} from "@/components/ui/avatar"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

import { ARREAR_CASES, SALARY_REVISIONS } from "../data"
import {
  ArrearCase, SalaryRevision, STATUS_COLORS,
  formatCurrency, formatCurrencyShort, formatDate, initials, avatarColor,
} from "../shared"

// ---------- Helpers ----------
function monthsBetween(from: string, to?: string): number {
  const f = new Date(from)
  const t = to ? new Date(to) : new Date()
  return Math.max(1, (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth()) + 1)
}
function monthLabel(date: string, offset: number): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + offset)
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
}

// ---------- Stat card ----------
function StatCard({
  label, value, icon: Icon, sub, accent = "amber",
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  sub?: string
  accent?: "amber" | "emerald" | "rose"
}) {
  const accents: Record<string, string> = {
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400 ring-rose-500/20",
  }
  const cls = accents[accent] || accents.amber
  return (
    <Card className="relative overflow-hidden border border-border/60 rounded-xl shadow-soft hover:shadow-card transition-all">
      <CardContent className="p-4">
        <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", cls)} />
        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl font-semibold mt-1 text-foreground tabular-nums leading-none">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>}
          </div>
          <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background/70 ring-1 backdrop-blur-sm", cls)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterSelect({
  label, icon: Icon, value, onChange, options, allLabel,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  value: string
  onChange: (v: string) => void
  options: string[]
  allLabel: string
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[150px]">
      <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder={allLabel} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

// ---------- Generate from Revision dialog ----------
function GenerateFromRevisionDialog({
  open, onOpenChange, onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (revision: SalaryRevision, monthsAffected: number, arrearAmount: number, breakdown: { component: string; months: number[]; total: number }[]) => void
}) {
  // pending = approved + implemented revisions not yet having arrears generated
  const pendingRevisions = useMemo(() =>
    SALARY_REVISIONS.filter(r => !r.arrearGenerated && (r.status === "Approved" || r.status === "Implemented")),
    [],
  )
  const [selectedId, setSelectedId] = useState<string>("")
  const selected = useMemo(() => pendingRevisions.find(r => r.id === selectedId), [pendingRevisions, selectedId])

  const monthsAffected = useMemo(() => selected ? monthsBetween(selected.effectiveFrom) : 0, [selected])
  const monthlyArrear = selected ? Math.round((selected.revisedCtc - selected.previousCtc) / 12) : 0
  const arrearAmount = monthlyArrear * monthsAffected

  // breakdown by component (uses revisedBasic vs previousBasic + same ratios)
  const breakdown = useMemo(() => {
    if (!selected) return []
    const prevMonthly = selected.previousCtc / 12
    const revisedMonthly = selected.revisedCtc / 12
    const delta = revisedMonthly - prevMonthly
    const components = [
      { name: "Basic", ratio: 0.4 },
      { name: "HRA", ratio: 0.2 },
      { name: "Special Allowance", ratio: 0.3 },
      { name: "Conveyance", ratio: 0.02 },
      { name: "Medical", ratio: 0.02 },
      { name: "PF (Employer)", ratio: 0.048 },
      { name: "Gratuity", ratio: 0.012 },
    ]
    return components.map(c => ({
      component: c.name,
      months: Array.from({ length: monthsAffected }, () => Math.round(delta * c.ratio)),
      total: Math.round(delta * c.ratio) * monthsAffected,
    }))
  }, [selected, monthsAffected])

  const handleSubmit = () => {
    if (!selected) {
      toast.error("Please select a salary revision.")
      return
    }
    if (arrearAmount <= 0) {
      toast.error("Selected revision has no positive arrear (delta ≤ 0).")
      return
    }
    onSubmit(selected, monthsAffected, arrearAmount, breakdown)
    onOpenChange(false)
    setSelectedId("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <TrendingUp className="h-4 w-4" />
            </div>
            Generate Arrear from Salary Revision
          </DialogTitle>
          <DialogDescription>
            Pick an approved salary revision. The system auto-calculates arrear for the months elapsed since the effective date.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-1 pr-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Select Salary Revision *</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pick a pending revision…" /></SelectTrigger>
                <SelectContent>
                  {pendingRevisions.length === 0 ? (
                    <SelectItem value="_none" disabled>No pending revisions</SelectItem>
                  ) : pendingRevisions.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.employeeName} ({r.employeeCode}) · {r.revisionType} · {r.hikePercent.toFixed(2)}% hike
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selected && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-border/60 p-3 bg-muted/30">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Employee</p>
                    <p className="text-xs font-medium text-foreground truncate">{selected.employeeName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Revision Type</p>
                    <p className="text-xs font-medium text-foreground">{selected.revisionType}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Effective From</p>
                    <p className="text-xs font-medium text-foreground">{formatDate(selected.effectiveFrom)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Hike %</p>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{selected.hikePercent.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Previous CTC</p>
                    <p className="text-xs font-medium text-foreground tabular-nums">{formatCurrency(selected.previousCtc)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Revised CTC</p>
                    <p className="text-xs font-medium text-foreground tabular-nums">{formatCurrency(selected.revisedCtc)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Monthly Delta</p>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 tabular-nums">{formatCurrency(monthlyArrear)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Months Affected</p>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{monthsAffected}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide mb-2 block">Per-Month Component Breakdown</Label>
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/60">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">Component</th>
                            {Array.from({ length: monthsAffected }, (_, i) => monthLabel(selected.effectiveFrom, i)).map(m => (
                              <th key={m} className="text-right px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide min-w-[100px]">{m}</th>
                            ))}
                            <th className="text-right px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide min-w-[100px] bg-amber-50/40 dark:bg-amber-500/5">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {breakdown.map(row => (
                            <tr key={row.component} className="border-t border-border/40 hover:bg-amber-50/30 dark:hover:bg-amber-500/5">
                              <td className="px-3 py-1.5 font-medium text-foreground">{row.component}</td>
                              {row.months.map((v, i) => (
                                <td key={i} className="px-3 py-1.5 text-right tabular-nums text-foreground">{formatCurrency(v)}</td>
                              ))}
                              <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-500/5">{formatCurrency(row.total)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/5">
                            <td className="px-3 py-2 font-bold text-foreground">Total / Month</td>
                            {Array.from({ length: monthsAffected }, () => monthlyArrear).map((m, i) => (
                              <td key={i} className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">{formatCurrency(m)}</td>
                            ))}
                            <td className="px-3 py-2 text-right tabular-nums font-bold text-amber-700 dark:text-amber-400">{formatCurrency(arrearAmount)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 rounded-lg bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-500/10 dark:to-orange-500/5 p-3 border border-amber-500/20">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Monthly Arrear</p>
                    <p className="text-lg font-semibold text-foreground tabular-nums">{formatCurrency(monthlyArrear)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Months</p>
                    <p className="text-lg font-semibold text-amber-700 dark:text-amber-400 tabular-nums">{monthsAffected}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Arrear</p>
                    <p className="text-lg font-semibold text-amber-700 dark:text-amber-400 tabular-nums">{formatCurrency(arrearAmount)}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sticky bottom-0 bg-background pt-3 border-t border-border/60">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selected || arrearAmount <= 0} className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
            <TrendingUp className="h-4 w-4" /> Generate Arrear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Component ----------
export function SalaryRevisionArrearSection() {
  const [records, setRecords] = useState<ArrearCase[]>(
    ARREAR_CASES.filter(a => a.arrearType === "Salary Revision"),
  )
  const [entityFilter, setEntityFilter] = useState("all")
  const [deptFilter, setDeptFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [genOpen, setGenOpen] = useState(false)

  // ---------- Options ----------
  const entityOptions = useMemo(() => Array.from(new Set(records.map(r => r.entity))), [records])
  const deptOptions = useMemo(() => Array.from(new Set(records.map(r => r.department))), [records])

  // ---------- Filtered ----------
  const filtered = useMemo(() => {
    return records.filter(r => {
      if (entityFilter !== "all" && r.entity !== entityFilter) return false
      if (deptFilter !== "all" && r.department !== deptFilter) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hit =
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.referenceId || "").toLowerCase().includes(q)
        if (!hit) return false
      }
      return true
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [records, entityFilter, deptFilter, statusFilter, search])

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const total = records.length
    const pending = records.filter(r => r.status === "Pending Approval" || r.status === "Draft").length
    const approved = records.filter(r => r.status === "Approved" || r.status === "Paid").length
    const totalAmount = records.reduce((s, r) => s + r.netArrear, 0)
    return { total, pending, approved, totalAmount }
  }, [records])

  // ---------- Actions ----------
  const handleGenerate = (revision: SalaryRevision, monthsAffected: number, arrearAmount: number, _breakdown: { component: string; months: number[]; total: number }[]) => {
    const newRec: ArrearCase = {
      id: `ar-${Date.now()}`,
      employeeId: revision.employeeId,
      employeeName: revision.employeeName,
      employeeCode: revision.employeeCode,
      entity: revision.entity,
      department: revision.department,
      arrearType: "Salary Revision",
      effectiveFrom: revision.effectiveFrom,
      effectiveTo: new Date().toISOString(),
      monthsAffected,
      arrearAmount,
      recoveryAmount: 0,
      netArrear: arrearAmount,
      description: `Auto-generated arrear from ${revision.revisionType} (hike ${revision.hikePercent.toFixed(2)}%) — ${revision.reason}`,
      referenceId: revision.id,
      status: "Pending Approval",
      payoutMonth: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      showSeparately: true,
      createdAt: new Date().toISOString(),
    }
    setRecords(prev => [newRec, ...prev])
    toast.success("Arrear generated from revision", {
      description: `${revision.employeeName} · ${revision.revisionType} · ${formatCurrency(arrearAmount)} over ${monthsAffected} month(s)`,
    })
  }

  const handleApprove = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "Approved", approvedBy: "You", approvedAt: new Date().toISOString() } : r))
    toast.success("Salary revision arrear approved")
  }
  const handleLink = (a: ArrearCase) => {
    toast.info(`Linked to salary revision ${a.referenceId || "—"}`)
  }

  const handleClearFilters = () => {
    setEntityFilter("all"); setDeptFilter("all"); setStatusFilter("all"); setSearch("")
  }
  const handleRefresh = () => toast.success("Refreshed")

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-soft">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">
              Salary Revision Arrears
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Arrears arising from salary revisions — annual hikes, promotions, market corrections and
              probation confirmations. Auto-generate from approved revisions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={handleRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setGenOpen(true)} className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
            <Plus className="h-3.5 w-3.5" /> Generate from Revision
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Revision Arrears" value={stats.total} icon={Layers} accent="amber" sub="All revision cases" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} accent="amber" sub="Awaiting approval" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} accent="emerald" sub="Approved/Paid" />
        <StatCard label="Total Amount" value={formatCurrencyShort(stats.totalAmount)} icon={IndianRupee} accent="amber" sub="Net arrear" />
      </div>

      {/* Filter bar */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400">
              {filtered.length} of {records.length}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <FilterSelect label="Entity" icon={Building2} value={entityFilter} onChange={setEntityFilter} options={entityOptions} allLabel="All entities" />
            <FilterSelect label="Department" icon={Briefcase} value={deptFilter} onChange={setDeptFilter} options={deptOptions} allLabel="All departments" />
            <FilterSelect label="Status" icon={CheckCircle2} value={statusFilter} onChange={setStatusFilter} options={["Draft", "Pending Approval", "Approved", "Rejected", "Paid", "Cancelled"]} allLabel="All statuses" />
            <div className="flex flex-col gap-1 min-w-[150px]">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Search className="h-3 w-3" /> Search
              </label>
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, code, ref…" className="h-8 text-xs bg-background" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/40">
            <Button size="sm" variant="ghost" onClick={handleClearFilters}>Clear</Button>
            <Button size="sm" onClick={() => toast.info("Filters applied")} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
              <Filter className="h-3.5 w-3.5" /> Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Salary Revision Arrears</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} record(s)</p>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400">
              arrearType = Salary Revision
            </Badge>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground mb-3">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No salary revision arrears found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">Generate arrears from approved salary revisions.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[640px] w-full">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
                  <TableRow className="hover:bg-muted/60">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide min-w-[200px]">Employee</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Entity / Dept</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Linked Revision</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Previous CTC</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Revised CTC</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Hike %</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Effective From</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-center">Months</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Arrear Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a: ArrearCase) => {
                    const revision = SALARY_REVISIONS.find(r => r.id === a.referenceId)
                    return (
                      <TableRow key={a.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-500/5">
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className={cn("text-[10px] text-white font-semibold", avatarColor(a.employeeId))}>
                                {initials(a.employeeName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{a.employeeName}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{a.employeeCode}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-foreground truncate max-w-[140px]">{a.entity}</p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">{a.department}</p>
                        </TableCell>
                        <TableCell>
                          {revision ? (
                            <div className="flex items-center gap-1.5">
                              <Link2 className="h-3 w-3 text-amber-500" />
                              <div className="min-w-0">
                                <p className="text-xs font-mono text-foreground truncate">{revision.id}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{revision.revisionType}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                          {revision ? formatCurrency(revision.previousCtc) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                          {revision ? formatCurrency(revision.revisedCtc) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {revision ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                              <Percent className="h-3 w-3" />
                              {revision.hikePercent.toFixed(2)}%
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3 text-muted-foreground/60" />
                            {formatDate(a.effectiveFrom)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold tabular-nums">
                            {a.monthsAffected}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("text-sm font-semibold tabular-nums", a.netArrear < 0 ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-400")}>
                            {formatCurrency(a.netArrear)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_COLORS[a.status] || "bg-muted text-muted-foreground")}>
                            {a.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuLabel className="text-[11px]">Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => toast.info(`Viewing ${a.employeeName} arrear`)}>
                                <Eye className="h-3.5 w-3.5 mr-2" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleLink(a)}>
                                <Link2 className="h-3.5 w-3.5 mr-2" /> Link to Revision
                              </DropdownMenuItem>
                              {(a.status === "Pending Approval" || a.status === "Draft") && (
                                <DropdownMenuItem onClick={() => handleApprove(a.id)}>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Approve
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => toast.info(`Exporting arrear voucher`)}>
                                <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Export
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toast.info(`Viewing revision ${a.referenceId || "—"}`)}>
                                <ArrowRight className="h-3.5 w-3.5 mr-2" /> Open Revision
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <GenerateFromRevisionDialog open={genOpen} onOpenChange={setGenOpen} onSubmit={handleGenerate} />
    </div>
  )
}

export default SalaryRevisionArrearSection
