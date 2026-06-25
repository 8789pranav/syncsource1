"use client"

// ============================================================================
//  FnF Cases — Full & Final settlement case management
//  Rose/pink accents. Filter bar, stats, table, initiate dialog, detail dialog.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ClipboardCheck, Wallet, Inbox, Calculator, ShieldCheck, BadgeCheck, Coins,
  Search, Filter, Plus, Building2, Briefcase, UserMinus, Eye, Pencil,
  CheckCircle2, Wallet as WalletIcon, FileText, RefreshCw, X, Clock,
  TrendingUp, TrendingDown, Scale, ArrowRight, CalendarDays,
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

import { FNF_CASES } from "../data"
import type { FnFCase } from "../shared"
import {
  initials, avatarColor, formatDate, formatDateTime, formatCurrency,
  formatCurrencyShort, STATUS_COLORS,
} from "../shared"

// ---------- accent helpers ----------
const ACCENT_MAP: Record<string, { grad: string; text: string; ring: string }> = {
  rose:    { grad: "from-rose-500/15 to-pink-500/5",     text: "text-rose-600 dark:text-rose-400",     ring: "ring-rose-500/20" },
  amber:   { grad: "from-amber-500/15 to-orange-500/5",  text: "text-amber-600 dark:text-amber-400",   ring: "ring-amber-500/20" },
  cyan:    { grad: "from-cyan-500/15 to-teal-500/5",     text: "text-cyan-600 dark:text-cyan-400",     ring: "ring-cyan-500/20" },
  emerald: { grad: "from-emerald-500/15 to-teal-500/5",  text: "text-emerald-600 dark:text-emerald-400",ring: "ring-emerald-500/20" },
  teal:    { grad: "from-teal-500/15 to-cyan-500/5",     text: "text-teal-600 dark:text-teal-400",     ring: "ring-teal-500/20" },
  slate:   { grad: "from-slate-500/15 to-slate-500/5",   text: "text-slate-600 dark:text-slate-400",   ring: "ring-slate-500/20" },
  pink:    { grad: "from-pink-500/15 to-rose-500/5",     text: "text-pink-600 dark:text-pink-400",     ring: "ring-pink-500/20" },
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

// Mock employee list for the initiate dialog
const EMPLOYEE_OPTIONS = [
  { id: "EMP-1201", name: "Nikhil Agarwal", code: "EMP-1201", entity: "ACME India Pvt Ltd", dept: "Engineering", desg: "Software Engineer II", exitCaseId: "EXIT-2025-012", lwd: new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10) },
  { id: "EMP-1202", name: "Sneha Bhat", code: "EMP-1202", entity: "ACME India Pvt Ltd", dept: "Product", desg: "Associate PM", exitCaseId: "EXIT-2025-013", lwd: new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10) },
  { id: "EMP-1203", name: "Vivek Rao", code: "EMP-1203", entity: "ACME India Pvt Ltd", dept: "Sales", desg: "Sales Executive", exitCaseId: "EXIT-2025-014", lwd: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10) },
  { id: "EMP-2006", name: "Yusuf Khan", code: "EMP-2006", entity: "ACME UAE LLC", dept: "Operations", desg: "Ops Coordinator", exitCaseId: "EXIT-2025-UAE-02", lwd: new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10) },
]

// ============================================================================
export function FnFCasesSection() {
  const [cases, setCases] = useState<FnFCase[]>(FNF_CASES)
  const [entityFilter, setEntityFilter] = useState("all")
  const [deptFilter, setDeptFilter] = useState("all")
  const [exitTypeFilter, setExitTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [initiateOpen, setInitiateOpen] = useState(false)
  const [initEmp, setInitEmp] = useState<string>("")
  const [detailCase, setDetailCase] = useState<FnFCase | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const entityOptions = useMemo(() => Array.from(new Set(cases.map(c => c.entity))), [cases])
  const deptOptions = useMemo(() => Array.from(new Set(cases.map(c => c.department))), [cases])
  const exitTypeOptions = useMemo(() => Array.from(new Set(cases.map(c => c.exitType))), [cases])
  const statusOptions = useMemo(() => Array.from(new Set(cases.map(c => c.status))), [cases])

  const filtered = useMemo(() => {
    return cases.filter(c => {
      if (entityFilter !== "all" && c.entity !== entityFilter) return false
      if (deptFilter !== "all" && c.department !== deptFilter) return false
      if (exitTypeFilter !== "all" && c.exitType !== exitTypeFilter) return false
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return c.employeeName.toLowerCase().includes(q) ||
          c.employeeCode.toLowerCase().includes(q) ||
          c.exitCaseId.toLowerCase().includes(q) ||
          c.designation.toLowerCase().includes(q)
      }
      return true
    })
  }, [cases, entityFilter, deptFilter, exitTypeFilter, statusFilter, search])

  const stats = useMemo(() => {
    const total = cases.length
    const inputsPending = cases.filter(c => c.status === "Inputs Pending").length
    const inProgress = cases.filter(c => c.status === "Calculation In Progress").length
    const pendingAppr = cases.filter(c => c.status === "Pending Approval").length
    const approved = cases.filter(c => c.status === "Approved").length
    const paid = cases.filter(c => c.status === "Paid").length
    const netPayable = cases.reduce((s, c) => s + c.netPayable, 0)
    return { total, inputsPending, inProgress, pendingAppr, approved, paid, netPayable }
  }, [cases])

  const selectedEmp = EMPLOYEE_OPTIONS.find(e => e.id === initEmp)

  const handleAction = (action: string, c: FnFCase) => {
    const patch: Partial<FnFCase> = {}
    let msg = ""
    switch (action) {
      case "view":
        setDetailCase(c); setDetailOpen(true); return
      case "edit":
        toast.info(`Edit case — ${c.employeeName}`, { description: "Open the inputs editor to adjust entries." })
        return
      case "calculate":
        patch.status = "Calculation In Progress"
        patch.calculatedAt = new Date().toISOString()
        msg = "Calculation started"
        toast.success(msg, { description: `${c.employeeName} · net payable ${formatCurrency(c.netPayable)}` })
        break
      case "approve":
        patch.status = "Approved"
        patch.approvedBy = "Rajesh Kumar"
        patch.approvedAt = new Date().toISOString()
        msg = "FnF approved"
        toast.success(msg, { description: `${c.employeeName} · approved by Rajesh Kumar` })
        break
      case "pay":
        patch.status = "Paid"
        patch.paidAt = new Date().toISOString()
        patch.paymentMode = "Bank Transfer"
        patch.utrNumber = "UTR" + Math.floor(Math.random() * 9000000 + 1000000)
        msg = "FnF paid"
        toast.success(msg, { description: `${c.employeeName} · UTR ${patch.utrNumber}` })
        break
      case "letter":
        toast.success("FnF letter generated", { description: `${c.employeeName} · settlement letter ready` })
        return
      default:
        return
    }
    if (Object.keys(patch).length > 0) {
      setCases(prev => prev.map(x => x.id === c.id ? { ...x, ...patch } : x))
      if (detailCase && detailCase.id === c.id) {
        setDetailCase(prev => prev ? { ...prev, ...patch } : prev)
      }
    }
  }

  const handleInitiate = () => {
    if (!selectedEmp) {
      toast.error("Please select an employee to initiate FnF.")
      return
    }
    toast.success("FnF case initiated", {
      description: `${selectedEmp.name} (${selectedEmp.code}) · Exit ${selectedEmp.exitCaseId}`,
    })
    setInitiateOpen(false)
    setInitEmp("")
  }

  const clearFilters = () => {
    setEntityFilter("all"); setDeptFilter("all"); setExitTypeFilter("all")
    setStatusFilter("all"); setSearch("")
  }

  const hasFilters = entityFilter !== "all" || deptFilter !== "all" || exitTypeFilter !== "all" || statusFilter !== "all" || search

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-soft">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">FnF Cases</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Manage full &amp; final settlement cases — initiate, calculate, approve, pay &amp; generate letters.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setInitiateOpen(true)} className="gap-1.5 shrink-0 bg-rose-600 hover:bg-rose-700 text-white">
          <Plus className="h-4 w-4" /> Initiate FnF
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
                placeholder="Search by employee, code, exit case or designation…"
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:items-center">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[160px]"><SelectValue placeholder="Entity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[160px]"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {deptOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={exitTypeFilter} onValueChange={setExitTypeFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[160px]"><SelectValue placeholder="Exit Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exit Types</SelectItem>
                  {exitTypeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
              <span>Showing {filtered.length} of {cases.length} cases</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>Clear filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="Total Cases" value={stats.total} icon={ClipboardCheck} accent="rose" />
        <StatCard label="Inputs Pending" value={stats.inputsPending} icon={Inbox} accent="amber" />
        <StatCard label="In Progress" value={stats.inProgress} icon={Calculator} accent="cyan" />
        <StatCard label="Pending Approval" value={stats.pendingAppr} icon={ShieldCheck} accent="pink" />
        <StatCard label="Approved" value={stats.approved} icon={BadgeCheck} accent="emerald" />
        <StatCard label="Paid" value={stats.paid} icon={Coins} accent="teal" />
        <StatCard label="Net Payable" value={formatCurrencyShort(stats.netPayable)} icon={TrendingUp} accent="rose" />
      </div>

      {/* Cases table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px] rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 sticky top-0 z-10">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[220px]">Employee</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity / Dept</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exit Case</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exit Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">LWD</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">DOJ</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tenure</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Earnings</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Deductions</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Net Payable</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Inbox className="h-8 w-8 opacity-40" />
                        <p className="text-sm">No FnF cases match your filters.</p>
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
                    <TableCell>
                      <div className="text-xs">
                        <p className="font-medium text-foreground truncate max-w-[160px]">{c.entity}</p>
                        <p className="text-muted-foreground">{c.department}</p>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-xs font-medium text-foreground">{c.exitCaseId}</span></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{c.exitType}</span></TableCell>
                    <TableCell><span className="text-xs text-foreground">{formatDate(c.lwd)}</span></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{formatDate(c.doj)}</span></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground tabular-nums">{c.tenureYears} yr</span></TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(c.totalEarnings)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(c.totalDeductions)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn("text-sm font-bold tabular-nums", c.netPayable >= 0 ? "text-rose-700 dark:text-rose-400" : "text-rose-700 dark:text-rose-400")}>
                        {formatCurrency(c.netPayable)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-medium border-0 text-[10px]", STATUS_COLORS[c.status] || "")}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleAction("view", c)} title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-[11px] text-muted-foreground">Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleAction("view", c)}><Eye className="h-3.5 w-3.5 mr-2" /> View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction("edit", c)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleAction("calculate", c)}><Calculator className="h-3.5 w-3.5 mr-2" /> Calculate</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction("approve", c)}><CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Approve</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction("pay", c)}><WalletIcon className="h-3.5 w-3.5 mr-2" /> Pay</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleAction("letter", c)}><FileText className="h-3.5 w-3.5 mr-2" /> Generate Letter</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Initiate FnF dialog */}
      <Dialog open={initiateOpen} onOpenChange={setInitiateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                <Plus className="h-4 w-4" />
              </div>
              Initiate FnF Case
            </DialogTitle>
            <DialogDescription>Select an employee with an active exit case to initiate their full &amp; final settlement.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-1 space-y-4 pr-3">
              <div className="space-y-2">
                <Label className="text-xs">Employee (with active exit case)</Label>
                <Select value={initEmp} onValueChange={setInitEmp}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select employee…" /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_OPTIONS.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} · {e.code} · {e.exitCaseId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedEmp && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("grid h-10 w-10 place-items-center rounded-full text-xs font-semibold text-white", avatarColor(selectedEmp.id))}>
                        {initials(selectedEmp.name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{selectedEmp.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedEmp.code} · {selectedEmp.desg}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-rose-500/30 text-rose-700 dark:text-rose-400 text-[10px]">
                      {selectedEmp.exitCaseId}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Entity</p>
                      <p className="font-medium text-foreground">{selectedEmp.entity}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium text-foreground">{selectedEmp.dept}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Working Day</p>
                      <p className="font-medium text-foreground">{formatDate(selectedEmp.lwd)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Exit Type</p>
                      <p className="font-medium text-foreground">Voluntary Resignation</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Auto-Fetched Inputs Preview</p>
                    <div className="space-y-1.5">
                      {[
                        { name: "Pending Salary (till LWD)", src: "Payroll", amt: 64000 },
                        { name: "Leave Encashment (18 EL)", src: "Leave", amt: 36000 },
                        { name: "Gratuity (3.2 years)", src: "Gratuity", amt: 76800 },
                        { name: "Notice Recovery (shortfall)", src: "Notice", amt: -48000 },
                        { name: "Loan Outstanding", src: "Loan", amt: -18000 },
                        { name: "Asset Recovery (laptop)", src: "Asset", amt: -6500 },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md bg-background/60">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{row.name}</span>
                            <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 text-muted-foreground">{row.src}</Badge>
                          </div>
                          <span className={cn("font-semibold tabular-nums", row.amt >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                            {formatCurrency(Math.abs(row.amt))}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-border/40">
                      <span className="font-semibold text-foreground">Estimated Net Payable</span>
                      <span className="font-bold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(104300)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInitiateOpen(false)}>Cancel</Button>
            <Button onClick={handleInitiate} className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Initiate FnF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                <Wallet className="h-4 w-4" />
              </div>
              FnF Case Detail
            </DialogTitle>
            <DialogDescription>Full breakdown of earnings, deductions &amp; settlement summary.</DialogDescription>
          </DialogHeader>
          {detailCase && (
            <ScrollArea className="max-h-[70vh]">
              <div className="p-1 space-y-4 pr-3">
                {/* Employee header */}
                <div className="rounded-xl border border-border/60 p-4 bg-gradient-to-br from-rose-500/5 to-pink-500/5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className={cn("grid h-12 w-12 place-items-center rounded-full text-sm font-semibold text-white", avatarColor(detailCase.employeeId))}>
                        {initials(detailCase.employeeName)}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground">{detailCase.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{detailCase.employeeCode} · {detailCase.designation}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{detailCase.department} · {detailCase.entity}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[detailCase.status] || "")}>
                        {detailCase.status}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">Case: {detailCase.id}</span>
                      <span className="text-[11px] text-muted-foreground">Exit: {detailCase.exitCaseId}</span>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div><p className="text-muted-foreground">Exit Type</p><p className="font-medium text-foreground">{detailCase.exitType}</p></div>
                    <div><p className="text-muted-foreground">DOJ</p><p className="font-medium text-foreground">{formatDate(detailCase.doj)}</p></div>
                    <div><p className="text-muted-foreground">LWD</p><p className="font-medium text-foreground">{formatDate(detailCase.lwd)}</p></div>
                    <div><p className="text-muted-foreground">Tenure</p><p className="font-medium text-foreground">{detailCase.tenureYears} years</p></div>
                  </div>
                </div>

                {/* Status timeline */}
                <div className="rounded-xl border border-border/60 p-4">
                  <p className="text-xs font-semibold text-foreground mb-3">Settlement Timeline</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { label: "Created", val: detailCase.createdAt, icon: ClipboardCheck },
                      { label: "Calculated", val: detailCase.calculatedAt, icon: Calculator },
                      { label: "Approved", val: detailCase.approvedAt, icon: ShieldCheck },
                      { label: "Paid", val: detailCase.paidAt, icon: Coins },
                    ].map((step, i) => (
                      <div key={i} className={cn("rounded-lg border p-2.5", step.val ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/60 bg-muted/30")}>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
                          <step.icon className="h-3 w-3" />
                          {step.label}
                        </div>
                        <p className="font-medium text-foreground text-[11px]">{formatDateTime(step.val)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Earnings & Deductions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Earnings */}
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-sm font-semibold text-foreground">Earnings</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        {formatCurrency(detailCase.totalEarnings)}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      {detailCase.earnings.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-4 text-center">No earnings recorded yet.</p>
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
                  {/* Deductions */}
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        <p className="text-sm font-semibold text-foreground">Deductions</p>
                      </div>
                      <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
                        {formatCurrency(detailCase.totalDeductions)}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      {detailCase.deductions.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-4 text-center">No deductions recorded.</p>
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

                {/* Payment info if paid */}
                {detailCase.paidAt && (
                  <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-3 flex items-center gap-3 text-xs">
                    <Coins className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">Paid via {detailCase.paymentMode || "Bank Transfer"}</p>
                      <p className="text-muted-foreground">UTR: {detailCase.utrNumber || "—"} · Paid at {formatDateTime(detailCase.paidAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" /> Last updated {formatDateTime(detailCase?.calculatedAt || detailCase?.createdAt)}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
              {detailCase && (
                <Button className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5" onClick={() => { handleAction("letter", detailCase); setDetailOpen(false) }}>
                  <FileText className="h-4 w-4" /> Generate Letter
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FnFCasesSection
