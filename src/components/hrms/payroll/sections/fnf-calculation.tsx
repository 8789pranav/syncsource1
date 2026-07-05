"use client"

// ============================================================================
//  FnF Calculation — review settlement calculations, per-component breakdown
//  Rose/pink accents. Filter, stats, table, run calculation dialog, detail.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Calculator, Search, Filter, Eye, RefreshCw, Lock, Play, TrendingUp,
  TrendingDown, Scale, Clock, CheckCircle2, Coins, Database,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

import { FNF_CASES } from "../data"
import type { FnFCase } from "../shared"
import {
  initials, avatarColor, formatDate, formatDateTime, formatCurrency,
  formatCurrencyShort, STATUS_COLORS,
} from "../shared"

const ACCENT_MAP: Record<string, { grad: string; text: string; ring: string }> = {
  rose:    { grad: "from-rose-500/15 to-pink-500/5",     text: "text-rose-600 dark:text-rose-400",     ring: "ring-rose-500/20" },
  amber:   { grad: "from-amber-500/15 to-orange-500/5",  text: "text-amber-600 dark:text-amber-400",   ring: "ring-amber-500/20" },
  cyan:    { grad: "from-cyan-500/15 to-teal-500/5",     text: "text-cyan-600 dark:text-cyan-400",     ring: "ring-cyan-500/20" },
  emerald: { grad: "from-emerald-500/15 to-teal-500/5",  text: "text-emerald-600 dark:text-emerald-400",ring: "ring-emerald-500/20" },
  teal:    { grad: "from-teal-500/15 to-cyan-500/5",     text: "text-teal-600 dark:text-teal-400",     ring: "ring-teal-500/20" },
  slate:   { grad: "from-slate-500/15 to-slate-500/5",   text: "text-slate-600 dark:text-slate-400",   ring: "ring-slate-500/20" },
}
type Accent = keyof typeof ACCENT_MAP

function StatCard({
  label, value, icon: Icon, accent, sub,
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  accent: Accent
  sub?: string
}) {
  const a = ACCENT_MAP[accent] || ACCENT_MAP.rose
  return (
    <Card className={cn("relative overflow-hidden border border-border/60 rounded-xl shadow-soft hover:shadow-card transition-all bg-gradient-to-br", a.grad)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl font-semibold mt-1 text-foreground tabular-nums leading-none">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-1 truncate">{sub}</p>}
          </div>
          <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-background/70 ring-1 backdrop-blur-sm", a.ring, a.text)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const FORMULA_REFS = [
  { name: "Pending Salary", formula: "(Monthly Gross / 30) × days worked in month of exit" },
  { name: "Leave Encashment", formula: "(Basic + DA) / 26 × unavailed earned leaves" },
  { name: "Gratuity (India)", formula: "(Basic + DA) × 15 / 26 × tenure years (≥5 years)" },
  { name: "Gratuity (UAE)", formula: "21 days basic per year (1-5 yrs), 30 days basic per year (>5 yrs)" },
  { name: "Notice Recovery", formula: "Per day rate × notice shortfall days" },
  { name: "TDS", formula: "Per slab on total FnF earnings (excluding gratuity upto ₹20L)" },
]

// ============================================================================
export function FnFCalculationSection() {
  const [cases, setCases] = useState<FnFCase[]>(FNF_CASES.filter(c => c.earnings.length > 0 || c.deductions.length > 0))
  const [entityFilter, setEntityFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [runOpen, setRunOpen] = useState(false)
  const [runCaseId, setRunCaseId] = useState("")
  const [runResult, setRunResult] = useState<{ earnings: number; deductions: number; net: number } | null>(null)
  const [runLoading, setRunLoading] = useState(false)

  const [detailCase, setDetailCase] = useState<FnFCase | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const entityOptions = useMemo(() => Array.from(new Set(cases.map(c => c.entity))), [cases])
  const statusOptions = useMemo(() => Array.from(new Set(cases.map(c => c.status))), [cases])
  const pendingCases = FNF_CASES.filter(c => c.status === "Inputs Pending" || c.status === "Draft")

  const filtered = useMemo(() => {
    return cases.filter(c => {
      if (entityFilter !== "all" && c.entity !== entityFilter) return false
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return c.employeeName.toLowerCase().includes(q) ||
          c.employeeCode.toLowerCase().includes(q) ||
          c.exitCaseId.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      }
      return true
    })
  }, [cases, entityFilter, statusFilter, search])

  const stats = useMemo(() => {
    const total = cases.length
    const pending = cases.filter(c => c.status === "Calculation In Progress" || c.status === "Inputs Pending").length
    const completed = cases.filter(c => c.status === "Approved" || c.status === "Paid").length
    const totalEarnings = cases.reduce((s, c) => s + c.totalEarnings, 0)
    const totalDeductions = cases.reduce((s, c) => s + c.totalDeductions, 0)
    const netPayable = cases.reduce((s, c) => s + c.netPayable, 0)
    return { total, pending, completed, totalEarnings, totalDeductions, netPayable }
  }, [cases])

  const handleView = (c: FnFCase) => { setDetailCase(c); setDetailOpen(true) }

  const handleRecalculate = (c: FnFCase) => {
    setCases(prev => prev.map(x => x.id === c.id ? {
      ...x,
      calculatedAt: new Date().toISOString(),
      status: "Calculation In Progress" as const,
    } : x))
    toast.success("Recalculation triggered", { description: `${c.employeeName} · net payable ${formatCurrency(c.netPayable)}` })
    if (detailCase && detailCase.id === c.id) {
      setDetailCase(prev => prev ? { ...prev, calculatedAt: new Date().toISOString() } : prev)
    }
  }

  const handleLock = (c: FnFCase) => {
    setCases(prev => prev.map(x => x.id === c.id ? { ...x, status: "Pending Approval" as const } : x))
    toast.success("Calculation locked", { description: `${c.employeeName} · sent for approval` })
    if (detailCase && detailCase.id === c.id) {
      setDetailCase(prev => prev ? { ...prev, status: "Pending Approval" as const } : prev)
    }
  }

  const handleRunCalculation = () => {
    if (!runCaseId) {
      toast.error("Please select an FnF case to calculate.")
      return
    }
    setRunLoading(true)
    setRunResult(null)
    setTimeout(() => {
      const c = FNF_CASES.find(x => x.id === runCaseId)
      const earnings = c?.earnings.reduce((s, e) => s + e.amount, 0) || 60000
      const deductions = c?.deductions.reduce((s, d) => s + d.amount, 0) || 25000
      setRunResult({ earnings, deductions, net: earnings - deductions })
      setRunLoading(false)
      toast.success("Calculation completed", {
        description: `Net payable: ${formatCurrency(earnings - deductions)}`,
      })
    }, 1200)
  }

  const clearFilters = () => { setEntityFilter("all"); setStatusFilter("all"); setSearch("") }
  const hasFilters = entityFilter !== "all" || statusFilter !== "all" || search

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-soft">
            <Calculator className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">FnF Calculation</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Run, review &amp; lock FnF calculations — per-component breakdowns with auto vs manual sources.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => { setRunResult(null); setRunOpen(true) }} className="gap-1.5 shrink-0 bg-rose-600 hover:bg-rose-700 text-white">
          <Play className="h-4 w-4" /> Run Calculation
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by employee, case or exit ID…"
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:flex lg:items-center">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[160px]"><SelectValue placeholder="Entity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>Showing {filtered.length} of {cases.length} calculations</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>Clear filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Calculations" value={stats.total} icon={Calculator} accent="rose" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} accent="amber" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Total Earnings" value={formatCurrencyShort(stats.totalEarnings)} icon={TrendingUp} accent="emerald" />
        <StatCard label="Total Deductions" value={formatCurrencyShort(stats.totalDeductions)} icon={TrendingDown} accent="rose" />
        <StatCard label="Total Net Payable" value={formatCurrencyShort(stats.netPayable)} icon={Scale} accent="pink" />
      </div>

      {/* Calculations table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px] rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 sticky top-0 z-10">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[220px]">Employee</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exit Case</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Total Earnings</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Total Deductions</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Net Payable</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Calculated At</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Calculator className="h-8 w-8 opacity-40" />
                        <p className="text-sm">No calculations match your filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map(c => (
                  <TableRow key={c.id} className="hover:bg-rose-500/5 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white", avatarColor(c.employeeId))}>
                          {initials(c.employeeName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.employeeName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{c.employeeCode} · {c.designation}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{c.entity}</span></TableCell>
                    <TableCell><span className="text-xs font-medium text-foreground">{c.exitCaseId}</span></TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(c.totalEarnings)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-semibold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(c.totalDeductions)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-base font-bold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(c.netPayable)}</span>
                    </TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{formatDate(c.calculatedAt)}</span></TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-medium border-0 text-[10px]", STATUS_COLORS[c.status] || "")}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="View" onClick={() => handleView(c)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Recalculate" onClick={() => handleRecalculate(c)}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Lock & Send for Approval" onClick={() => handleLock(c)}>
                          <Lock className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Run Calculation dialog */}
      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                <Play className="h-4 w-4" />
              </div>
              Run FnF Calculation
            </DialogTitle>
            <DialogDescription>Select an FnF case with pending inputs to compute its settlement.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-1 space-y-4 pr-3">
              <div className="space-y-2">
                <Label className="text-xs">FnF Case</Label>
                <Select value={runCaseId} onValueChange={v => { setRunCaseId(v); setRunResult(null) }}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select case to calculate…" /></SelectTrigger>
                  <SelectContent>
                    {pendingCases.length === 0 ? (
                      FNF_CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.employeeName} · {c.id} · {c.status}</SelectItem>)
                    ) : (
                      pendingCases.map(c => <SelectItem key={c.id} value={c.id}>{c.employeeName} · {c.id} · {c.status}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>
              {runCaseId && (() => {
                const c = FNF_CASES.find(x => x.id === runCaseId)
                if (!c) return null
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">Inputs Preview</p>
                      <Badge variant="outline" className="border-rose-500/30 text-rose-700 dark:text-rose-400 text-[10px]">
                        {c.earnings.length + c.deductions.length} inputs
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Earnings</p>
                        {c.earnings.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No earnings yet.</p>
                        ) : c.earnings.map((e, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-foreground">{e.name}</span>
                            <span className="font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(e.amount)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wide">Deductions</p>
                        {c.deductions.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No deductions yet.</p>
                        ) : c.deductions.map((d, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-foreground">{d.name}</span>
                            <span className="font-medium text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(d.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )
              })()}
              {runResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm font-semibold text-foreground">Calculation Result</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-background/60 p-2.5">
                      <p className="text-[10px] uppercase text-muted-foreground">Earnings</p>
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrencyShort(runResult.earnings)}</p>
                    </div>
                    <div className="rounded-lg bg-background/60 p-2.5">
                      <p className="text-[10px] uppercase text-muted-foreground">Deductions</p>
                      <p className="text-sm font-bold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrencyShort(runResult.deductions)}</p>
                    </div>
                    <div className="rounded-lg bg-gradient-to-br from-rose-500/20 to-pink-500/10 p-2.5">
                      <p className="text-[10px] uppercase text-muted-foreground">Net Payable</p>
                      <p className="text-base font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(runResult.net)}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRunOpen(false)}>Close</Button>
            <Button onClick={handleRunCalculation} disabled={runLoading} className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
              {runLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {runLoading ? "Calculating…" : "Run Calculation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                <Calculator className="h-4 w-4" />
              </div>
              Calculation Detail
            </DialogTitle>
            <DialogDescription>Per-component breakdown with auto/manual source tagging.</DialogDescription>
          </DialogHeader>
          {detailCase && (
            <ScrollArea className="max-h-[70vh]">
              <div className="p-1 space-y-4 pr-3">
                <div className="rounded-xl border border-border/60 p-4 bg-gradient-to-br from-rose-500/5 to-pink-500/5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className={cn("grid h-11 w-11 place-items-center rounded-full text-sm font-semibold text-white", avatarColor(detailCase.employeeId))}>
                        {initials(detailCase.employeeName)}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground">{detailCase.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{detailCase.employeeCode} · {detailCase.designation}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{detailCase.entity} · {detailCase.department}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[detailCase.status] || "")}>
                        {detailCase.status}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">Calculated: {formatDateTime(detailCase.calculatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-sm font-semibold text-foreground">Earnings Breakdown</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        {formatCurrency(detailCase.totalEarnings)}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      {detailCase.earnings.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-3 text-center">No earnings recorded.</p>
                      ) : detailCase.earnings.map((e, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md bg-background/60">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{e.name}</span>
                            <Badge variant="outline" className={cn("text-[9px] h-4 px-1 py-0", e.source === "Auto" ? "border-sky-300 text-sky-700 dark:text-sky-300" : "border-rose-300 text-rose-700 dark:text-rose-300")}>
                              {e.source}
                            </Badge>
                          </div>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        <p className="text-sm font-semibold text-foreground">Deductions Breakdown</p>
                      </div>
                      <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
                        {formatCurrency(detailCase.totalDeductions)}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      {detailCase.deductions.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-3 text-center">No deductions recorded.</p>
                      ) : detailCase.deductions.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md bg-background/60">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{d.name}</span>
                            <Badge variant="outline" className={cn("text-[9px] h-4 px-1 py-0", d.source === "Auto" ? "border-sky-300 text-sky-700 dark:text-sky-300" : "border-rose-300 text-rose-700 dark:text-rose-300")}>
                              {d.source}
                            </Badge>
                          </div>
                          <span className="font-semibold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(d.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Summary tiles */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Earnings</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(detailCase.totalEarnings)}</p>
                  </div>
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center">
                    <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400 mx-auto mb-1" />
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Deductions</p>
                    <p className="text-lg font-bold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(detailCase.totalDeductions)}</p>
                  </div>
                  <div className="rounded-xl border border-rose-500/40 bg-gradient-to-br from-rose-500/20 to-pink-500/10 p-4 text-center">
                    <Scale className="h-5 w-5 text-rose-600 dark:text-rose-400 mx-auto mb-1" />
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Net Payable</p>
                    <p className="text-xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(detailCase.netPayable)}</p>
                  </div>
                </div>

                <Separator />
                {/* Formula reference */}
                <div className="rounded-xl border border-border/60 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="h-4 w-4 text-rose-500" />
                    <p className="text-sm font-semibold text-foreground">Calculation Formula Reference</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {FORMULA_REFS.map((f, i) => (
                      <div key={i} className="rounded-lg bg-muted/40 p-2.5 text-xs">
                        <p className="font-medium text-foreground">{f.name}</p>
                        <p className="text-muted-foreground mt-0.5 font-mono text-[10px]">{f.formula}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
            {detailCase && (
              <>
                <Button variant="outline" onClick={() => handleRecalculate(detailCase)} className="gap-1.5">
                  <RefreshCw className="h-4 w-4" /> Recalculate
                </Button>
                <Button onClick={() => { handleLock(detailCase); setDetailOpen(false) }} className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
                  <Lock className="h-4 w-4" /> Lock &amp; Send for Approval
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FnFCalculationSection
