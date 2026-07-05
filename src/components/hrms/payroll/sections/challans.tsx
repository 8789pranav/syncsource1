"use client"

// =============================================================
// Challans — Payroll / Compliance #10
// Statutory challan payments (PF/ESI/PT/LWF/TDS) with due date
// highlighting + Generate Challan dialog.
// Emerald/teal theme.
// =============================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Coins, Search, Filter, Building2, Calendar, IndianRupee,
  CheckCircle2, Clock, Download, MoreHorizontal, X, FileDown,
  History, PiggyBank, HeartPulse, Landmark, Wallet, Receipt,
  AlertTriangle, Sparkles, ArrowRight,
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

import { CHALLANS } from "../data"
import type { Challan } from "../shared"
import {
  formatCurrency, formatCurrencyShort, formatDate, formatDateTime,
  initials, avatarColor, STATUS_COLORS,
} from "../shared"

// ---------- Challan type config ----------
const CHALLAN_TYPES: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PF:  { label: "PF",  color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400", icon: PiggyBank },
  ESI: { label: "ESI", color: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",             icon: HeartPulse },
  PT:  { label: "PT",  color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",         icon: Landmark },
  LWF: { label: "LWF", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",             icon: Wallet },
  TDS: { label: "TDS", color: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",     icon: Receipt },
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
    rose: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400 ring-rose-500/20",
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

// ---------- Due-date helper ----------
function dueStatus(dueDate: string, status: string): "overdue" | "soon" | "normal" | "paid" {
  if (status === "Paid") return "paid"
  if (status === "Overdue") return "overdue"
  const due = new Date(dueDate).getTime()
  const diff = (due - Date.now()) / 86400000
  if (diff < 0) return "overdue"
  if (diff <= 7) return "soon"
  return "normal"
}

// ---------- Component ----------
export function ChallansSection() {
  const [challans, setChallans] = useState<Challan[]>(CHALLANS)
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [genOpen, setGenOpen] = useState(false)

  const entityOptions = useMemo(() => Array.from(new Set(challans.map((c) => c.entity))), [challans])
  const monthOptions = useMemo(() => Array.from(new Set(challans.map((c) => c.payrollMonth))).sort().reverse(), [challans])

  const filtered = useMemo(() => {
    return challans.filter((c) => {
      if (entityFilter !== "all" && c.entity !== entityFilter) return false
      if (typeFilter !== "all" && c.challanType !== typeFilter) return false
      if (monthFilter !== "all" && c.payrollMonth !== monthFilter) return false
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!(c.entity.toLowerCase().includes(q) || c.challanType.toLowerCase().includes(q) || (c.challanNumber?.toLowerCase().includes(q) ?? false) || (c.referenceNumber?.toLowerCase().includes(q) ?? false))) return false
      }
      return true
    })
  }, [challans, search, entityFilter, typeFilter, monthFilter, statusFilter])

  // ---------- Stats ----------
  const total = filtered.length
  const pending = filtered.filter((c) => c.status === "Pending").length
  const paid = filtered.filter((c) => c.status === "Paid").length
  const overdue = filtered.filter((c) => c.status === "Overdue").length
  const totalAmount = filtered.filter((c) => c.status !== "Paid").reduce((s, c) => s + c.amount, 0)

  function markPaid(c: Challan) {
    setChallans((prev) => prev.map((x) => x.id === c.id ? {
      ...x, status: "Paid",
      paidAt: new Date().toISOString(),
      challanNumber: x.challanNumber || `${x.challanType}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999)).padStart(3, "0")}`,
      referenceNumber: x.referenceNumber || `UTR${Date.now().toString().slice(-12)}`,
    } : x))
    toast.success(`${c.challanType} challan marked as Paid`)
  }
  function downloadChallan(c: Challan) {
    toast.success(`${c.challanType} challan PDF downloaded`)
  }
  function viewHistory(c: Challan) {
    toast.info(`Viewing payment history for ${c.challanType} challan`)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-primary-foreground shadow-soft">
            <Coins className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Challans / Payments</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Statutory challan payments across PF, ESI, PT, LWF &amp; TDS with due-date tracking.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setGenOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
          <FileDown className="h-4 w-4" /> Generate Challan
        </Button>
      </div>

      {/* Stat tiles */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
        initial="hidden" animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }}
      >
        {[
          { label: "Total Challans", value: total, icon: Coins, accent: "emerald", sub: "In filter" },
          { label: "Pending", value: pending, icon: Clock, accent: "amber", sub: "Awaiting payment" },
          { label: "Paid", value: paid, icon: CheckCircle2, accent: "teal", sub: "Completed" },
          { label: "Overdue", value: overdue, icon: AlertTriangle, accent: "rose", sub: "Past due date" },
          { label: "Total Amount Due", value: formatCurrencyShort(totalAmount), icon: IndianRupee, accent: "violet", sub: "Pending + Overdue" },
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
                <Coins className="h-3 w-3" /> Challan Type
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="PF">PF</SelectItem>
                  <SelectItem value="ESI">ESI</SelectItem>
                  <SelectItem value="PT">PT</SelectItem>
                  <SelectItem value="LWF">LWF</SelectItem>
                  <SelectItem value="TDS">TDS</SelectItem>
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
                  <SelectItem value="Generated">Generated</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Search className="h-3 w-3" /> Search
              </label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type, entity, number" className="h-8 text-xs bg-background" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/40">
            <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setEntityFilter("all"); setTypeFilter("all"); setMonthFilter("all"); setStatusFilter("all") }} className="gap-1.5">
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
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Month</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Amount</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Employees</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Challan Number</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reference / Paid At</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const ds = dueStatus(c.dueDate, c.status)
                  const typeCfg = CHALLAN_TYPES[c.challanType]
                  return (
                    <TableRow
                      key={c.id}
                      className={cn(
                        "hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5",
                        ds === "overdue" && "bg-rose-50/40 dark:bg-rose-500/5",
                        ds === "soon" && "bg-amber-50/40 dark:bg-amber-500/5",
                      )}
                    >
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", typeCfg.color)}>
                          <typeCfg.icon className="h-3 w-3" />
                          {typeCfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-foreground/80">{c.entity}</TableCell>
                      <TableCell className="text-xs text-foreground/80">{c.payrollMonth}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-foreground/80">{formatDate(c.dueDate)}</span>
                          {ds === "overdue" && <AlertTriangle className="h-3 w-3 text-rose-500" />}
                          {ds === "soon" && <Clock className="h-3 w-3 text-amber-500" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-right font-bold">{formatCurrency(c.amount)}</TableCell>
                      <TableCell className="text-xs tabular-nums text-center text-foreground/80">{c.employeeCount}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_COLORS[c.status])}>
                          {c.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-[11px] font-mono text-foreground/80">{c.challanNumber || "—"}</TableCell>
                      <TableCell className="text-[11px]">
                        {c.referenceNumber ? (
                          <>
                            <div className="font-mono text-foreground/80">{c.referenceNumber}</div>
                            <div className="text-muted-foreground">{c.paidAt ? formatDateTime(c.paidAt) : ""}</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2 text-xs" onClick={() => toast.info(`Viewing ${c.challanType} challan details`)}>
                              <Search className="h-3.5 w-3.5" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-xs" onClick={() => viewHistory(c)}>
                              <History className="h-3.5 w-3.5" /> View History
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-xs" onClick={() => downloadChallan(c)}>
                              <Download className="h-3.5 w-3.5" /> Download Challan
                            </DropdownMenuItem>
                            {c.status !== "Paid" && (
                              <DropdownMenuItem className="gap-2 text-xs text-emerald-700 dark:text-emerald-400" onClick={() => markPaid(c)}>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Paid
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
                    <TableCell colSpan={10} className="text-center py-10 text-sm text-muted-foreground">
                      No challans match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Generate Challan dialog */}
      <GenerateChallanDialog open={genOpen} onOpenChange={setGenOpen} entityOptions={entityOptions} monthOptions={monthOptions} />
    </div>
  )
}

// ---------- Generate Challan dialog ----------
function GenerateChallanDialog({
  open, onOpenChange, entityOptions, monthOptions,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  entityOptions: string[]
  monthOptions: string[]
}) {
  const [type, setType] = useState<Challan["challanType"]>("PF")
  const [entity, setEntity] = useState(entityOptions[0] || "")
  const [month, setMonth] = useState(monthOptions[0] || "")
  const [generated, setGenerated] = useState(false)

  // Mock auto-calc
  const baseEmpCount = 142
  const typeConfig: Record<string, { perEmp: number; label: string }> = {
    PF:  { perEmp: 22000, label: "PF (12% + 8.33%)" },
    ESI: { perEmp: 1250,  label: "ESI (0.75% + 3.25%)" },
    PT:  { perEmp: 200,   label: "PT (state-wise)" },
    LWF: { perEmp: 60,    label: "LWF (emp + emr)" },
    TDS: { perEmp: 13000, label: "TDS (avg per emp)" },
  }
  const amount = baseEmpCount * typeConfig[type].perEmp
  const empCount = baseEmpCount

  function handleGenerate() {
    setGenerated(true)
    toast.success(`${type} challan generated for ${month}`)
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
            <FileDown className="h-5 w-5 text-emerald-600" />
            Generate Statutory Challan
          </DialogTitle>
          <DialogDescription className="text-xs">
            Auto-calculates amount &amp; employee count based on type &amp; payroll data.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Challan Type</Label>
                <Select value={type} onValueChange={(v) => { setType(v as Challan["challanType"]); setGenerated(false) }}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PF">PF / EPF</SelectItem>
                    <SelectItem value="ESI">ESI</SelectItem>
                    <SelectItem value="PT">Professional Tax</SelectItem>
                    <SelectItem value="LWF">Labour Welfare</SelectItem>
                    <SelectItem value="TDS">TDS / Income Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <Label className="text-xs font-medium">Payroll Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select month" /></SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Auto-calc summary */}
            <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-500/20 p-3">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Auto-Calculated
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Type</p>
                  <p className="text-sm font-semibold text-foreground">{typeConfig[type].label}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Employees</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">{empCount}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Amount</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(amount)}</p>
                </div>
              </div>
            </div>

            {generated && (
              <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-500/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Challan Generated</p>
                </div>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                  Challan No: <span className="font-mono">{type}-{new Date().getFullYear()}-{String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}</span>
                </p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                  Due Date: <span className="font-medium">{formatDate(new Date(Date.now() + 15 * 86400000).toISOString())}</span> · Amount: <span className="font-medium">{formatCurrency(amount)}</span>
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <ArrowRight className="h-3 w-3" /> Statutory board-compliant
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleClose(false)}>Cancel</Button>
            {generated ? (
              <Button size="sm" onClick={() => toast.success("Challan downloaded")} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            ) : (
              <Button size="sm" onClick={handleGenerate} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <FileDown className="h-3.5 w-3.5" /> Generate Challan
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ChallansSection
