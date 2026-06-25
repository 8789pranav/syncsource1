"use client"

// =============================================================
// LWF Records — Payroll / Compliance #6
// Labour Welfare Fund records with state-wise rate reference.
// Emerald/teal theme.
// =============================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Wallet, Search, Filter, Building2, Calendar, IndianRupee,
  Users, MapPin, CheckCircle2, Clock, Download, MoreHorizontal,
  X, BookOpen, Info, HandHeart,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

import { LWF_RECORDS } from "../data"
import type { LWFRecord } from "../shared"
import {
  formatCurrency, formatCurrencyShort, initials,
  avatarColor, STATUS_COLORS,
} from "../shared"

// ---------- LWF state-wise rate reference ----------
const LWF_RATES: {
  state: string
  employee: number
  employer: number
  frequency: string
  ceiling: string
}[] = [
  { state: "Karnataka",     employee: 20,  employer: 40,  frequency: "Annually (Dec)",  ceiling: "₹2,000 gross" },
  { state: "Maharashtra",   employee: 12,  employer: 36,  frequency: "Half-yearly",     ceiling: "₹3,000 gross" },
  { state: "Tamil Nadu",    employee: 20,  employer: 40,  frequency: "Annually (Dec)",  ceiling: "No ceiling" },
  { state: "Telangana",     employee: 20,  employer: 40,  frequency: "Annually (Dec)",  ceiling: "No ceiling" },
  { state: "Andhra Pradesh",employee: 20,  employer: 40,  frequency: "Annually (Dec)",  ceiling: "No ceiling" },
  { state: "Gujarat",       employee: 6,   employer: 12,  frequency: "Half-yearly",     ceiling: "₹3,000 gross" },
  { state: "Haryana",       employee: 31,  employer: 62,  frequency: "Annually (Dec)",  ceiling: "₹3,500 gross" },
  { state: "West Bengal",   employee: 12,  employer: 36,  frequency: "Half-yearly",     ceiling: "₹3,000 gross" },
  { state: "Madhya Pradesh",employee: 30,  employer: 60,  frequency: "Annually (Dec)",  ceiling: "₹1,800 gross" },
  { state: "Punjab",        employee: 15,  employer: 30,  frequency: "Annually (Dec)",  ceiling: "₹3,000 gross" },
]

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
export function LWFRecordsSection() {
  const [records, setRecords] = useState<LWFRecord[]>(LWF_RECORDS)
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")
  const [stateFilter, setStateFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const entityOptions = useMemo(() => Array.from(new Set(records.map((r) => r.entity))), [records])
  const stateOptions = useMemo(() => Array.from(new Set(records.map((r) => r.state))), [records])
  const monthOptions = useMemo(() => Array.from(new Set(records.map((r) => r.payrollMonth))).sort().reverse(), [records])

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (entityFilter !== "all" && r.entity !== entityFilter) return false
      if (stateFilter !== "all" && r.state !== stateFilter) return false
      if (monthFilter !== "all" && r.payrollMonth !== monthFilter) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!(r.employeeName.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q) || r.state.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [records, search, entityFilter, stateFilter, monthFilter, statusFilter])

  // ---------- Stats ----------
  const totalEmp = filtered.length
  const totalEmpContribution = filtered.reduce((s, r) => s + r.employeeContribution, 0)
  const totalEmrContribution = filtered.reduce((s, r) => s + r.employerContribution, 0)
  const grandTotal = totalEmpContribution + totalEmrContribution
  const filedCount = filtered.filter((r) => r.status === "Filed").length
  const pendingCount = filtered.filter((r) => r.status === "Pending").length

  function markFiled(r: LWFRecord) {
    setRecords((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "Filed" } : x))
    toast.success(`${r.employeeName}'s LWF record marked as Filed`)
  }
  function bulkFile() {
    const toFile = filtered.filter((r) => r.status === "Pending")
    if (toFile.length === 0) { toast.info("No pending records to file"); return }
    setRecords((prev) => prev.map((x) => {
      if (toFile.find((f) => f.id === x.id)) return { ...x, status: "Filed" }
      return x
    }))
    toast.success(`${toFile.length} LWF records filed`)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-primary-foreground shadow-soft">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Labour Welfare Fund (LWF) Records</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              State-wise LWF employee &amp; employer contributions for social welfare.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={bulkFile} className="gap-1.5 shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5" /> Bulk File
        </Button>
      </div>

      {/* Stat tiles */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
        initial="hidden" animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }}
      >
        {[
          { label: "Total Employees", value: totalEmp, icon: Users, accent: "emerald", sub: "In filter" },
          { label: "Employee Contribution", value: formatCurrencyShort(totalEmpContribution), icon: IndianRupee, accent: "teal", sub: "LWF employee share" },
          { label: "Employer Contribution", value: formatCurrencyShort(totalEmrContribution), icon: HandHeart, accent: "cyan", sub: "LWF employer share" },
          { label: "Grand Total", value: formatCurrencyShort(grandTotal), icon: Wallet, accent: "violet", sub: "Emp + Emr" },
          { label: "Filed / Pending", value: `${filedCount} / ${pendingCount}`, icon: Clock, accent: pendingCount > 0 ? "amber" : "emerald", sub: "Status count" },
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
                <MapPin className="h-3 w-3" /> State
              </label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="All states" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {stateOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, code or state" className="h-8 text-xs bg-background" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/40">
            <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setEntityFilter("all"); setStateFilter("all"); setMonthFilter("all"); setStatusFilter("all") }} className="gap-1.5">
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.info("Filters applied")} className="gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
              <Filter className="h-3.5 w-3.5" /> Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records table + slab reference side-by-side */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-0">
            <ScrollArea className="max-h-[640px]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Employee</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">State</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Employee</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Employer</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Total</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Month</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const total = r.employeeContribution + r.employerContribution
                    return (
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
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-medium gap-1">
                            <MapPin className="h-2.5 w-2.5" /> {r.state}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums text-right font-medium">{formatCurrency(r.employeeContribution)}</TableCell>
                        <TableCell className="text-sm tabular-nums text-right">{formatCurrency(r.employerContribution)}</TableCell>
                        <TableCell className="text-sm tabular-nums text-right font-bold">{formatCurrency(total)}</TableCell>
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
                              <DropdownMenuItem className="gap-2 text-xs" onClick={() => toast.info(`Viewing ${r.employeeName}'s LWF details`)}>
                                <Search className="h-3.5 w-3.5" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-xs" onClick={() => toast.success(`Downloaded ${r.employeeName}'s LWF statement`)}>
                                <Download className="h-3.5 w-3.5" /> Download
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
                    )
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-sm text-muted-foreground">
                        No LWF records match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* LWF state-wise rate reference */}
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-foreground">LWF State Rate Reference</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Employee / employer LWF contributions per state</p>
            <ScrollArea className="max-h-[560px] pr-2">
              <div className="space-y-2.5">
                {LWF_RATES.map((s) => (
                  <div key={s.state} className="rounded-lg border border-border/60 p-3 bg-card/50">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <p className="text-sm font-semibold text-foreground truncate">{s.state}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{s.frequency}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Employee</p>
                        <p className="font-semibold text-foreground tabular-nums">{formatCurrency(s.employee)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Employer</p>
                        <p className="font-semibold text-foreground tabular-nums">{formatCurrency(s.employer)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(s.employee + s.employer)}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground/80 mt-1.5">Ceiling: {s.ceiling}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="mt-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-500/20 p-2.5 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                LWF rates are state-specific and typically deducted annually (December) or half-yearly. Verify with state LWF board.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LWFRecordsSection
