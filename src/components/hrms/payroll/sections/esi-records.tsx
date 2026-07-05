"use client"

// =============================================================
// ESI Records — Payroll / Compliance #4
// Employee State Insurance records.
// Emerald/teal theme.
// =============================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  HeartPulse, Search, Filter, Building2, Calendar, IndianRupee,
  Users, TrendingUp, CheckCircle2, Clock, Download,
  MoreHorizontal, X, Wallet, FileDown, AlertCircle,
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

import { ESI_RECORDS } from "../data"
import type { ESIRecord } from "../shared"
import {
  formatCurrency, formatCurrencyShort, initials,
  avatarColor, STATUS_COLORS,
} from "../shared"

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
export function ESIRecordsSection() {
  const [records, setRecords] = useState<ESIRecord[]>(ESI_RECORDS)
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  const [ceilingFilter, setCeilingFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const entityOptions = useMemo(() => Array.from(new Set(records.map((r) => r.entity))), [records])
  const monthOptions = useMemo(() => Array.from(new Set(records.map((r) => r.payrollMonth))).sort().reverse(), [records])

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (entityFilter !== "all" && r.entity !== entityFilter) return false
      if (monthFilter !== "all" && r.payrollMonth !== monthFilter) return false
      if (ceilingFilter !== "all") {
        const within = ceilingFilter === "within"
        if (r.withinWageCeiling !== within) return false
      }
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!(r.employeeName.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q) || r.esicNumber.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [records, search, entityFilter, monthFilter, ceilingFilter, statusFilter])

  // ---------- Stats ----------
  const totalEmp = filtered.length
  const totalEmpContribution = filtered.reduce((s, r) => s + r.employeeContribution, 0)
  const totalEmrContribution = filtered.reduce((s, r) => s + r.employerContribution, 0)
  const grandTotal = filtered.reduce((s, r) => s + r.totalContribution, 0)
  const filedCount = filtered.filter((r) => r.status === "Filed").length
  const pendingCount = filtered.filter((r) => r.status === "Pending").length

  function markFiled(r: ESIRecord) {
    setRecords((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "Filed" } : x))
    toast.success(`${r.employeeName}'s ESI record marked as Filed`)
  }
  function bulkFile() {
    const toFile = filtered.filter((r) => r.status === "Pending")
    if (toFile.length === 0) { toast.info("No pending records to file"); return }
    setRecords((prev) => prev.map((x) => {
      if (toFile.find((f) => f.id === x.id)) return { ...x, status: "Filed" }
      return x
    }))
    toast.success(`${toFile.length} ESI records filed`)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-primary-foreground shadow-soft">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">ESI Records</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Employee State Insurance contributions for employees under the ₹21,000/month wage ceiling.
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
          { label: "Total Employees", value: totalEmp, icon: Users, accent: "emerald", sub: "ESI eligible" },
          { label: "Employee Contribution", value: formatCurrencyShort(totalEmpContribution), icon: IndianRupee, accent: "teal", sub: "0.75% of gross" },
          { label: "Employer Contribution", value: formatCurrencyShort(totalEmrContribution), icon: Wallet, accent: "cyan", sub: "3.25% of gross" },
          { label: "Grand Total", value: formatCurrencyShort(grandTotal), icon: TrendingUp, accent: "violet", sub: "Emp + Emr" },
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
                <IndianRupee className="h-3 w-3" /> Within Ceiling
              </label>
              <Select value={ceilingFilter} onValueChange={setCeilingFilter}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="within">Within ₹21K</SelectItem>
                  <SelectItem value="exceed">Exceeds ceiling</SelectItem>
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
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, code or ESIC" className="h-8 text-xs bg-background" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/40">
            <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setEntityFilter("all"); setMonthFilter("all"); setCeilingFilter("all"); setStatusFilter("all") }} className="gap-1.5">
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
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[220px]">Employee</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ESIC Number</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Employee (0.75%)</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Employer (3.25%)</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Total</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Within Ceiling</TableHead>
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
                    <TableCell className="text-xs font-mono text-foreground/80">{r.esicNumber}</TableCell>
                    <TableCell className="text-sm tabular-nums text-right font-medium">{formatCurrency(r.employeeContribution)}</TableCell>
                    <TableCell className="text-sm tabular-nums text-right">{formatCurrency(r.employerContribution)}</TableCell>
                    <TableCell className="text-sm tabular-nums text-right font-bold">{formatCurrency(r.totalContribution)}</TableCell>
                    <TableCell className="text-center">
                      {r.withinWageCeiling ? (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-400">Within</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-700 dark:text-rose-400">
                          <AlertCircle className="h-2.5 w-2.5 mr-0.5" /> Exceeds
                        </Badge>
                      )}
                    </TableCell>
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
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => toast.info(`Viewing ${r.employeeName}'s ESI details`)}>
                            <Search className="h-3.5 w-3.5" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => toast.success(`Downloaded ${r.employeeName}'s ESI statement`)}>
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
                    <TableCell colSpan={10} className="text-center py-10 text-sm text-muted-foreground">
                      No ESI records match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Info banner */}
      <Card className="border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/5 rounded-xl shadow-soft">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600">
            <HeartPulse className="h-4.5 w-4.5" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-foreground">ESI Reference Rates</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Employee: <span className="font-medium text-foreground">0.75%</span> · Employer: <span className="font-medium text-foreground">3.25%</span> · Wage ceiling: <span className="font-medium text-foreground">₹21,000/month</span> (₹25,000 for persons with disabilities). Filing: monthly by 15th of following month via ESIC portal.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ESIRecordsSection
