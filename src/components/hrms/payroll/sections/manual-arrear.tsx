"use client"

// ============================================================================
//  ManualArrearSection — Arrear menu #6 (Manual Arrear)
//  ----------------------------------------------------------------------------
//  Manual / Bonus / Incentive / Component Change arrears. Filter + stats +
//  table with positive (green) and negative (red) amount distinction +
//  Create Manual Arrear dialog with negative toggle for recovery.
//  Amber/orange accent.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  HandCoins, Plus, Search, Filter, RefreshCw, Eye, CheckCircle2,
  Clock, IndianRupee, Layers, Inbox, Building2, Briefcase, CalendarDays,
  MoreHorizontal, TrendingUp, TrendingDown, FileSpreadsheet, Settings2,
  Gift, Target,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
  ArrearCase, ArrearType, STATUS_COLORS,
  formatCurrency, formatCurrencyShort, formatDate, initials, avatarColor,
} from "../shared"

// ---------- Constants ----------
const MANUAL_TYPES: ArrearType[] = ["Manual", "Bonus", "Incentive", "Component Change"]

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Manual: HandCoins,
  Bonus: Gift,
  Incentive: Target,
  "Component Change": Settings2,
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

// ---------- Create Manual Arrear dialog ----------
interface ManualArrearForm {
  employeeId: string
  arrearType: ArrearType
  amount: string
  isNegative: boolean
  description: string
  payoutMonth: string
  showSeparately: boolean
  effectiveDate: string
}

function CreateManualArrearDialog({
  open, onOpenChange, onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (form: ManualArrearForm, netAmount: number, emp: typeof EMPLOYEE_SALARIES[0]) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<ManualArrearForm>({
    employeeId: "", arrearType: "Manual", amount: "",
    isNegative: false, description: "",
    payoutMonth: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    showSeparately: true, effectiveDate: today,
  })

  const emp = EMPLOYEE_SALARIES.find(e => e.id === form.employeeId)
  const rawAmount = Number(form.amount) || 0
  const netAmount = form.isNegative ? -Math.abs(rawAmount) : Math.abs(rawAmount)

  const handleSubmit = () => {
    if (!form.employeeId) { toast.error("Please pick an employee."); return }
    if (!emp) { toast.error("Employee not found."); return }
    if (rawAmount <= 0) { toast.error("Amount must be greater than 0."); return }
    if (!form.description.trim()) { toast.error("Please provide a description."); return }
    onSubmit(form, netAmount, emp)
    onOpenChange(false)
    setForm({
      employeeId: "", arrearType: "Manual", amount: "",
      isNegative: false, description: "",
      payoutMonth: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      showSeparately: true, effectiveDate: today,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <HandCoins className="h-4 w-4" />
            </div>
            Create Manual Arrear
          </DialogTitle>
          <DialogDescription>
            Manually create an arrear for bonus, incentive, component change or adjustment. Toggle
            negative for recovery (over-payment correction).
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
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Grade</p>
                  <p className="text-xs font-medium text-foreground">{emp.grade}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Arrear Type *</Label>
                <Select value={form.arrearType} onValueChange={v => setForm({ ...form, arrearType: v as ArrearType })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MANUAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Effective Date *</Label>
                <Input type="date" value={form.effectiveDate} onChange={e => setForm({ ...form, effectiveDate: e.target.value })} className="h-9" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Amount *</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="e.g. 12000"
                    className="h-9 pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payout Month</Label>
                <Input value={form.payoutMonth} onChange={e => setForm({ ...form, payoutMonth: e.target.value })} className="h-9" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div>
                  <Label className="text-xs">Negative (Recovery)</Label>
                  <p className="text-[11px] text-muted-foreground">For over-payment corrections</p>
                </div>
                <Switch checked={form.isNegative} onCheckedChange={v => setForm({ ...form, isNegative: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div>
                  <Label className="text-xs">Show Separately</Label>
                  <p className="text-[11px] text-muted-foreground">Separate payslip line</p>
                </div>
                <Switch checked={form.showSeparately} onCheckedChange={v => setForm({ ...form, showSeparately: v })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the reason for this manual arrear…"
                rows={3}
                className="resize-none"
              />
            </div>

            <div className={cn(
              "grid grid-cols-2 gap-3 rounded-lg p-3 border",
              netAmount < 0
                ? "bg-gradient-to-br from-rose-50/60 to-rose-50/40 dark:from-rose-500/10 dark:to-rose-500/5 border-rose-500/20"
                : "bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-500/10 dark:to-orange-500/5 border-amber-500/20",
            )}>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Type</p>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  {React.createElement(TYPE_ICON[form.arrearType] || HandCoins, { className: "h-4 w-4" })}
                  {form.arrearType}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {netAmount < 0 ? "Recovery Amount" : "Arrear Amount"}
                </p>
                <p className={cn(
                  "text-lg font-semibold tabular-nums",
                  netAmount < 0 ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-400",
                )}>
                  {formatCurrency(netAmount)}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sticky bottom-0 bg-background pt-3 border-t border-border/60">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
            <Plus className="h-4 w-4" /> Create Arrear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Component ----------
export function ManualArrearSection() {
  const [records, setRecords] = useState<ArrearCase[]>(
    ARREAR_CASES.filter(a => MANUAL_TYPES.includes(a.arrearType)),
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
          r.arrearType.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
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
    const negativeArrears = records.filter(r => r.netArrear < 0).length
    return { total, pending, approved, totalAmount, negativeArrears }
  }, [records])

  // ---------- Actions ----------
  const handleCreate = (form: ManualArrearForm, netAmount: number, emp: typeof EMPLOYEE_SALARIES[0]) => {
    const newRec: ArrearCase = {
      id: `ar-${Date.now()}`,
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      employeeCode: emp.employeeCode,
      entity: emp.entity,
      department: emp.department,
      arrearType: form.arrearType,
      effectiveFrom: form.effectiveDate,
      effectiveTo: form.effectiveDate,
      monthsAffected: 1,
      arrearAmount: netAmount >= 0 ? netAmount : 0,
      recoveryAmount: netAmount < 0 ? Math.abs(netAmount) : 0,
      netArrear: netAmount,
      description: form.description,
      referenceId: undefined,
      status: "Pending Approval",
      payoutMonth: form.payoutMonth,
      showSeparately: form.showSeparately,
      createdAt: new Date().toISOString(),
    }
    setRecords(prev => [newRec, ...prev])
    toast.success(form.isNegative ? "Recovery arrear created" : "Manual arrear created", {
      description: `${emp.employeeName} · ${form.arrearType} · ${formatCurrency(netAmount)}`,
    })
  }

  const handleApprove = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "Approved", approvedBy: "You", approvedAt: new Date().toISOString() } : r))
    toast.success("Arrear approved")
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
            <HandCoins className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">
              Manual Arrears
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Manually created arrears — bonus, incentive, component change, and ad-hoc adjustments.
              Negative arrears recover over-payments.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={handleRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
            <Plus className="h-3.5 w-3.5" /> Create Manual Arrear
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Manual Arrears" value={stats.total} icon={Layers} accent="amber" sub="All cases" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} accent="amber" sub="Awaiting approval" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} accent="emerald" sub="Approved/Paid" />
        <StatCard label="Total Amount" value={formatCurrencyShort(stats.totalAmount)} icon={IndianRupee} accent="amber" sub="Net arrear" />
        <StatCard label="Negative Arrears" value={stats.negativeArrears} icon={TrendingDown} accent="rose" sub="Recovery cases" />
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
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, code, type…" className="h-8 text-xs bg-background" />
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
              <h3 className="text-sm font-semibold text-foreground">Manual Arrears</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} record(s)</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="h-3 w-3 mr-1" /> Positive
              </Badge>
              <Badge variant="outline" className="border-rose-500/30 text-rose-700 dark:text-rose-400">
                <TrendingDown className="h-3 w-3 mr-1" /> Recovery
              </Badge>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground mb-3">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No manual arrears found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">Create a new manual arrear to get started.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[640px] w-full">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
                  <TableRow className="hover:bg-muted/60">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide min-w-[200px]">Employee</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Entity / Dept</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Arrear Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide min-w-[260px]">Description</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Payout Month</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-center">Sep.</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a: ArrearCase) => {
                    const TypeIcon = TYPE_ICON[a.arrearType] || HandCoins
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
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <TypeIcon className="h-3.5 w-3.5 text-amber-500" />
                            {a.arrearType}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-sm font-semibold tabular-nums",
                            a.netArrear < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
                          )}>
                            {a.netArrear < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                            {formatCurrency(Math.abs(a.netArrear))}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-foreground/80 line-clamp-2 max-w-[280px]">{a.description}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3 text-muted-foreground/60" />
                            {a.payoutMonth}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {a.showSeparately ? (
                            <CheckCircle2 className="h-4 w-4 text-amber-500 inline" />
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">—</span>
                          )}
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
                              {(a.status === "Pending Approval" || a.status === "Draft") && (
                                <DropdownMenuItem onClick={() => handleApprove(a.id)}>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Approve
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => toast.info(`Editing arrear`)}>
                                <Settings2 className="h-3.5 w-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info(`Exporting voucher`)}>
                                <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Export
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-rose-600 dark:text-rose-400" onClick={() => toast.info("Reversal queued")}>
                                <TrendingDown className="h-3.5 w-3.5 mr-2" /> Reverse
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

      <CreateManualArrearDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={handleCreate} />
    </div>
  )
}

export default ManualArrearSection
