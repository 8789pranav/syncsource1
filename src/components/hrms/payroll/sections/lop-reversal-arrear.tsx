"use client"

// ============================================================================
//  LopReversalArrearSection — Arrear menu #5 (LOP Reversal Arrear)
//  ----------------------------------------------------------------------------
//  Arrears arising from LOP (Loss of Pay) reversals. Filter + stats + table +
//  Create LOP Reversal dialog with auto-calc from CTC. Amber/orange accent.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  RefreshCcw, Plus, Search, Filter, RefreshCw, Eye, CheckCircle2,
  Clock, IndianRupee, Layers, Inbox, Building2, Briefcase, CalendarDays,
  MoreHorizontal, TrendingUp, Calculator, FileSpreadsheet,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

import { ARREAR_CASES, EMPLOYEE_SALARIES } from "../data"
import {
  ArrearCase, STATUS_COLORS,
  formatCurrency, formatCurrencyShort, formatDate, initials, avatarColor,
} from "../shared"

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

// ---------- Create LOP Reversal dialog ----------
interface LopReversalForm {
  employeeId: string
  lopMonth: string
  reversalDate: string
  daysToReverse: string
  reason: string
}

function CreateLopReversalDialog({
  open, onOpenChange, onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (form: LopReversalForm, amount: number, emp: typeof EMPLOYEE_SALARIES[0]) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<LopReversalForm>({
    employeeId: "", lopMonth: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    reversalDate: today, daysToReverse: "1", reason: "",
  })

  const emp = EMPLOYEE_SALARIES.find(e => e.id === form.employeeId)
  const days = Math.max(0, Number(form.daysToReverse) || 0)
  // LOP reversal: per-day = monthly CTC / 30
  const perDayAmount = emp ? Math.round(emp.ctcMonthly / 30) : 0
  const amount = perDayAmount * days

  const handleSubmit = () => {
    if (!form.employeeId) { toast.error("Please pick an employee."); return }
    if (!emp) { toast.error("Employee not found."); return }
    if (days <= 0) { toast.error("Days to reverse must be greater than 0."); return }
    if (!form.reason.trim()) { toast.error("Please provide a reason."); return }
    onSubmit(form, amount, emp)
    onOpenChange(false)
    setForm({ employeeId: "", lopMonth: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }), reversalDate: today, daysToReverse: "1", reason: "" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <RefreshCcw className="h-4 w-4" />
            </div>
            Create LOP Reversal
          </DialogTitle>
          <DialogDescription>
            Reverse previously deducted LOP days. The arrear amount auto-calculates as (monthly CTC / 30) × days reversed.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-1 pr-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Employee *</Label>
              <Select value={form.employeeId} onValueChange={v => setForm({ ...form, employeeId: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pick an employee…" /></SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_SALARIES.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.employeeName} ({e.employeeCode}) · {e.department} · {formatCurrencyShort(e.ctcAnnual)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {emp && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-border/60 p-3 bg-muted/30">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Entity</p>
                  <p className="text-xs font-medium text-foreground truncate">{emp.entity}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Department</p>
                  <p className="text-xs font-medium text-foreground">{emp.department}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Monthly CTC</p>
                  <p className="text-xs font-medium text-foreground tabular-nums">{formatCurrency(emp.ctcMonthly)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Per-Day Rate</p>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 tabular-nums">{formatCurrency(perDayAmount)}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">LOP Month *</Label>
                <Input value={form.lopMonth} onChange={e => setForm({ ...form, lopMonth: e.target.value })} placeholder="e.g. May 2025" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reversal Date *</Label>
                <Input type="date" value={form.reversalDate} onChange={e => setForm({ ...form, reversalDate: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Days to Reverse *</Label>
                <Input type="number" min="0.5" step="0.5" value={form.daysToReverse} onChange={e => setForm({ ...form, daysToReverse: e.target.value })} className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reason *</Label>
              <Textarea
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Leave approved retroactively after LOP was deducted…"
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-500/10 dark:to-orange-500/5 p-3 border border-amber-500/20">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Days Reversed</p>
                <p className="text-lg font-semibold text-foreground tabular-nums">{days}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reversal Amount</p>
                <p className="text-lg font-semibold text-amber-700 dark:text-amber-400 tabular-nums">{formatCurrency(amount)}</p>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sticky bottom-0 bg-background pt-3 border-t border-border/60">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
            <RefreshCcw className="h-4 w-4" /> Create Reversal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Component ----------
export function LopReversalArrearSection() {
  const [records, setRecords] = useState<ArrearCase[]>(
    ARREAR_CASES.filter(a => a.arrearType === "LOP Reversal"),
  )
  const [entityFilter, setEntityFilter] = useState("all")
  const [deptFilter, setDeptFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

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
  const handleCreate = (form: LopReversalForm, amount: number, emp: typeof EMPLOYEE_SALARIES[0]) => {
    const days = Number(form.daysToReverse)
    const newRec: ArrearCase = {
      id: `ar-${Date.now()}`,
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      employeeCode: emp.employeeCode,
      entity: emp.entity,
      department: emp.department,
      arrearType: "LOP Reversal",
      effectiveFrom: form.reversalDate,
      effectiveTo: form.reversalDate,
      monthsAffected: 1,
      arrearAmount: amount,
      recoveryAmount: 0,
      netArrear: amount,
      description: `LOP reversal — ${days} day(s) reversed for ${form.lopMonth}. Reason: ${form.reason}`,
      referenceId: undefined,
      status: "Pending Approval",
      payoutMonth: form.lopMonth,
      showSeparately: false,
      createdAt: new Date().toISOString(),
    }
    setRecords(prev => [newRec, ...prev])
    toast.success("LOP reversal created", {
      description: `${emp.employeeName} · ${days} day(s) · ${formatCurrency(amount)}`,
    })
  }

  const handleApprove = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "Approved", approvedBy: "You", approvedAt: new Date().toISOString() } : r))
    toast.success("LOP reversal approved")
  }

  const handleClearFilters = () => {
    setEntityFilter("all"); setDeptFilter("all"); setStatusFilter("all"); setSearch("")
  }
  const handleRefresh = () => toast.success("Refreshed")

  // Compute LOP days reversed from arrear amount — assume per-day = monthly/30
  const getLopDays = (a: ArrearCase) => {
    const emp = EMPLOYEE_SALARIES.find(e => e.employeeId === a.employeeId)
    if (!emp) return a.monthsAffected
    return Math.round((a.arrearAmount / (emp.ctcMonthly / 30)) * 10) / 10
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-soft">
            <RefreshCcw className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">
              LOP Reversal Arrears
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Arrears arising from reversal of previously deducted Loss of Pay (LOP) days — typically
              from retroactively approved leaves or attendance corrections.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={handleRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
            <Plus className="h-3.5 w-3.5" /> Create LOP Reversal
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total LOP Reversals" value={stats.total} icon={Layers} accent="amber" sub="All cases" />
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
              <h3 className="text-sm font-semibold text-foreground">LOP Reversal Arrears</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} record(s)</p>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400">
              arrearType = LOP Reversal
            </Badge>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground mb-3">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No LOP reversal arrears found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">Create a new LOP reversal to get started.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[640px] w-full">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
                  <TableRow className="hover:bg-muted/60">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide min-w-[200px]">Employee</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Entity / Dept</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">LOP Month</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Reversal Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-center">LOP Days Reversed</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide min-w-[260px]">Description</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a: ArrearCase) => (
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
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-muted-foreground/60" />
                          {a.payoutMonth}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(a.effectiveFrom)}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center h-6 min-w-[28px] px-1.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold tabular-nums">
                          {getLopDays(a)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                          {formatCurrency(a.netArrear)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-foreground/80 line-clamp-2 max-w-[280px]">{a.description}</p>
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
                            <DropdownMenuItem onClick={() => toast.info(`Viewing ${a.employeeName} reversal`)}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> View
                            </DropdownMenuItem>
                            {(a.status === "Pending Approval" || a.status === "Draft") && (
                              <DropdownMenuItem onClick={() => handleApprove(a.id)}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Approve
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => toast.info(`Recalculating reversal`)}>
                              <Calculator className="h-3.5 w-3.5 mr-2" /> Recalculate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info(`Exporting voucher`)}>
                              <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Export
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600 dark:text-rose-400" onClick={() => toast.info("Reversal cancelled")}>
                              <RefreshCcw className="h-3.5 w-3.5 mr-2" /> Reverse Action
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <CreateLopReversalDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={handleCreate} />
    </div>
  )
}

export default LopReversalArrearSection
