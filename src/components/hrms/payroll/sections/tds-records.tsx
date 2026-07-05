"use client"

// =============================================================
// TDS Records — Payroll / Compliance #7
// Income Tax / TDS records with Form 26Q generation.
// Emerald/teal theme.
// =============================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Landmark, Search, Filter, Building2, Calendar, IndianRupee,
  Users, TrendingUp, CheckCircle2, Clock, Download, MoreHorizontal,
  X, FileSpreadsheet, FileDown, Sparkles, Scale,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

import { TDS_RECORDS } from "../data"
import type { TDSRecord } from "../shared"
import {
  formatCurrency, formatCurrencyShort, initials,
  avatarColor, STATUS_COLORS,
} from "../shared"

const REGIME_COLORS: Record<string, string> = {
  Old: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  New: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
}

// ---------- Stat tile ----------
function StatTile({
  label, value, icon: Icon, accent, sub,
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  accent: string
  sub?: string
}) {
  const accents: Record<string, string> = {
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    teal: "from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-400 ring-teal-500/20",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    cyan: "from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 ring-cyan-500/20",
    violet: "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400 ring-violet-500/20",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400 ring-rose-500/20",
  }
  const a = accents[accent] || accents.emerald
  return (
    <Card className={cn("relative overflow-hidden border border-border/60 rounded-xl shadow-soft hover:shadow-card transition-all bg-gradient-to-br", a)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl font-semibold mt-1 text-foreground tabular-nums leading-none">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>}
          </div>
          <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background/70 ring-1 backdrop-blur-sm", a)}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Component ----------
export function TDSRecordsSection() {
  const [records, setRecords] = useState<TDSRecord[]>(TDS_RECORDS)
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")
  const [regimeFilter, setRegimeFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [form26QOpen, setForm26QOpen] = useState(false)

  const entityOptions = useMemo(() => Array.from(new Set(records.map((r) => r.entity))), [records])
  const monthOptions = useMemo(() => Array.from(new Set(records.map((r) => r.payrollMonth))).sort().reverse(), [records])

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (entityFilter !== "all" && r.entity !== entityFilter) return false
      if (regimeFilter !== "all" && r.regime !== regimeFilter) return false
      if (monthFilter !== "all" && r.payrollMonth !== monthFilter) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!(r.employeeName.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q) || r.pan.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [records, search, entityFilter, regimeFilter, monthFilter, statusFilter])

  // ---------- Stats ----------
  const totalEmp = filtered.length
  const totalGross = filtered.reduce((s, r) => s + r.grossIncome, 0)
  const totalDeductions = filtered.reduce((s, r) => s + r.totalDeductions, 0)
  const totalTaxable = filtered.reduce((s, r) => s + r.taxableIncome, 0)
  const totalTaxLiability = filtered.reduce((s, r) => s + r.taxLiability, 0)
  const totalTDS = filtered.reduce((s, r) => s + r.tdsDeducted, 0)
  const totalYTDTDS = filtered.reduce((s, r) => s + r.ytdTds, 0)
  const filedCount = filtered.filter((r) => r.status === "Filed").length
  const pendingCount = filtered.filter((r) => r.status === "Pending").length

  function markFiled(r: TDSRecord) {
    setRecords((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "Filed" } : x))
    toast.success(`${r.employeeName}'s TDS record marked as Filed`)
  }
  function bulkFile() {
    const toFile = filtered.filter((r) => r.status === "Pending")
    if (toFile.length === 0) { toast.info("No pending records to file"); return }
    setRecords((prev) => prev.map((x) => {
      if (toFile.find((f) => f.id === x.id)) return { ...x, status: "Filed" }
      return x
    }))
    toast.success(`${toFile.length} TDS records filed`)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-primary-foreground shadow-soft">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">TDS / Income Tax Records</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Tax Deducted at Source per employee with regime-wise computation and quarterly Form 26Q generation.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={bulkFile} className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Bulk File
          </Button>
          <Button size="sm" onClick={() => setForm26QOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <FileDown className="h-4 w-4" /> Generate Form 26Q
          </Button>
        </div>
      </div>

      {/* Stat tiles */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3"
        initial="hidden" animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }}
      >
        {[
          { label: "Total Employees", value: totalEmp, icon: Users, accent: "emerald", sub: "In filter" },
          { label: "Total Gross Income", value: formatCurrencyShort(totalGross), icon: IndianRupee, accent: "teal", sub: "Annual" },
          { label: "Total Deductions", value: formatCurrencyShort(totalDeductions), icon: Scale, accent: "cyan", sub: "Sec 80 etc." },
          { label: "Total Taxable Income", value: formatCurrencyShort(totalTaxable), icon: TrendingUp, accent: "violet", sub: "After deductions" },
          { label: "Total Tax Liability", value: formatCurrencyShort(totalTaxLiability), icon: IndianRupee, accent: "amber", sub: "Annual" },
          { label: "Total TDS", value: formatCurrencyShort(totalTDS), icon: Landmark, accent: "emerald", sub: "This month" },
          { label: "YTD TDS / Filed", value: `${formatCurrencyShort(totalYTDTDS)} · ${filedCount}/${pendingCount + filedCount}`, icon: Clock, accent: pendingCount > 0 ? "amber" : "emerald", sub: "Year-to-date" },
        ].map((s) => (
          <motion.div key={s.label} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <StatTile {...s} />
          </motion.div>
        ))}
      </motion.div>

      {/* Filter bar */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Entity
              </label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="All entities" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  {entityOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Scale className="h-3 w-3" /> Regime
              </label>
              <Select value={regimeFilter} onValueChange={setRegimeFilter}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regimes</SelectItem>
                  <SelectItem value="Old">Old regime</SelectItem>
                  <SelectItem value="New">New regime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Payroll Month
              </label>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="All months" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  {monthOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Filed">Filed</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Search className="h-3 w-3" /> Search
              </label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, code or PAN" className="h-8 text-xs bg-background" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/40">
            <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setEntityFilter("all"); setRegimeFilter("all"); setMonthFilter("all"); setStatusFilter("all") }} className="gap-1.5">
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.info("Filters applied")} className="gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
              <Filter className="h-3.5 w-3.5" /> Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Employee</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PAN</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Regime</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Gross Income</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Deductions</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Taxable</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Tax Liability</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">TDS (Month)</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">YTD TDS</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Month</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-xs font-semibold", avatarColor(r.employeeId))}>
                          {initials(r.employeeName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{r.employeeName}</p>
                          <p className="text-[11px] text-muted-foreground truncate font-mono">{r.employeeCode}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-foreground/80">{r.entity}</TableCell>
                    <TableCell className="text-xs font-mono text-foreground/80">{r.pan}</TableCell>
                    <TableCell className="text-center">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", REGIME_COLORS[r.regime])}>
                        {r.regime}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-right">{formatCurrency(r.grossIncome)}</TableCell>
                    <TableCell className="text-sm tabular-nums text-right text-cyan-600 dark:text-cyan-400">{formatCurrency(r.totalDeductions)}</TableCell>
                    <TableCell className="text-sm tabular-nums text-right">{formatCurrency(r.taxableIncome)}</TableCell>
                    <TableCell className="text-sm tabular-nums text-right text-amber-600 dark:text-amber-400 font-medium">{formatCurrency(r.taxLiability)}</TableCell>
                    <TableCell className="text-sm tabular-nums text-right font-bold">{formatCurrency(r.tdsDeducted)}</TableCell>
                    <TableCell className="text-sm tabular-nums text-right text-violet-600 dark:text-violet-400">{formatCurrency(r.ytdTds)}</TableCell>
                    <TableCell className="text-xs text-foreground/80">{r.payrollMonth}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_COLORS[r.status])}>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => toast.info(`Viewing ${r.employeeName}'s TDS details`)}>
                            <Search className="h-3.5 w-3.5" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => toast.success(`Downloaded ${r.employeeName}'s TDS statement`)}>
                            <Download className="h-3.5 w-3.5" /> Download Statement
                          </DropdownMenuItem>
                          {r.status === "Pending" && (
                            <DropdownMenuItem className="gap-2 text-xs" onClick={() => markFiled(r)}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Filed
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-xs text-rose-600" onClick={() => toast.info("Delete disabled in demo")}>
                            <X className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-10 text-sm text-muted-foreground">
                      No TDS records match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Form 26Q dialog */}
      <Form26QDialog open={form26QOpen} onOpenChange={setForm26QOpen} entityOptions={entityOptions} records={filtered} />
    </div>
  )
}

// ---------- Form 26Q dialog ----------
function Form26QDialog({
  open, onOpenChange, entityOptions, records,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  entityOptions: string[]
  records: TDSRecord[]
}) {
  const [entity, setEntity] = useState(entityOptions[0] || "")
  const [quarter, setQuarter] = useState("Q1")
  const [generated, setGenerated] = useState(false)

  const scope = records.filter((r) => !entity || r.entity === entity)
  const empCount = scope.length
  const totalTDS = scope.reduce((s, r) => s + r.tdsDeducted * 3, 0) // approx 3 months in quarter
  const totalTaxable = scope.reduce((s, r) => s + r.taxableIncome, 0)

  function handleGenerate() {
    setGenerated(true)
    toast.success("Form 26Q generated — ready for upload to TRACES portal")
  }
  function handleClose(v: boolean) {
    onOpenChange(v)
    if (!v) setTimeout(() => setGenerated(false), 200)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Generate Form 26Q — Quarterly TDS Return
          </DialogTitle>
          <DialogDescription className="text-xs">
            Quarterly TDS return for salary (Section 192). Submitted to TRACES within 31 days of quarter end.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Entity</Label>
                <Select value={entity} onValueChange={setEntity}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select entity" /></SelectTrigger>
                  <SelectContent>
                    {entityOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Quarter</Label>
                <Select value={quarter} onValueChange={setQuarter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1 (Apr–Jun)</SelectItem>
                    <SelectItem value="Q2">Q2 (Jul–Sep)</SelectItem>
                    <SelectItem value="Q3">Q3 (Oct–Dec)</SelectItem>
                    <SelectItem value="Q4">Q4 (Jan–Mar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-500/20 p-3">
                <p className="text-[11px] text-muted-foreground uppercase">Employees</p>
                <p className="text-lg font-semibold text-foreground tabular-nums">{empCount}</p>
              </div>
              <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-500/20 p-3">
                <p className="text-[11px] text-muted-foreground uppercase">Taxable Income</p>
                <p className="text-lg font-semibold text-foreground tabular-nums">{formatCurrencyShort(totalTaxable)}</p>
              </div>
              <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-500/20 p-3">
                <p className="text-[11px] text-muted-foreground uppercase">Quarterly TDS</p>
                <p className="text-lg font-semibold text-foreground tabular-nums">{formatCurrencyShort(totalTDS)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs font-semibold text-foreground mb-2">Form 26Q Components</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Deductor details (TAN)
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Employee deductee details (PAN)
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Section 192 challan details
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Salary TDS breakdown
                </div>
              </div>
            </div>

            {generated && (
              <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-500/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Form 26Q Generated</p>
                </div>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                  File name: <span className="font-mono">26Q_{entity.replace(/\s+/g, "_")}_{quarter}_FY2025-26.txt</span>
                </p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                  Validate via TRACES / Return Preparation Utility (RPU) before upload.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> NSDL-compliant format
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleClose(false)}>Cancel</Button>
            {generated ? (
              <Button size="sm" onClick={() => toast.success("Form 26Q downloaded")} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            ) : (
              <Button size="sm" onClick={handleGenerate} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <FileDown className="h-3.5 w-3.5" /> Generate 26Q
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TDSRecordsSection
