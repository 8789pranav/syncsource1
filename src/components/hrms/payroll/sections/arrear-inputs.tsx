"use client"

// ============================================================================
//  ArrearInputsSection — Arrear menu #2 (Arrear Inputs)
//  ----------------------------------------------------------------------------
//  Filterable list of arrear-eligible payroll inputs (LOP Reversal, Arrear,
//  Attendance, Manual Adjustment). Stats row + sticky-header table + Add
//  Arrear Input dialog. Amber/orange accent.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ListChecks, Plus, Search, Filter, RefreshCw, Eye, Pencil, Trash2,
  CheckCircle2, Clock, Lock, IndianRupee, TrendingUp, TrendingDown,
  Layers, Inbox, Building2, Briefcase, CalendarDays, Tag, MoreHorizontal,
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

import { PAYROLL_INPUTS, PAY_GROUPS } from "../data"
import {
  PayrollInput, InputType, STATUS_COLORS,
  formatCurrency, formatDate, formatDateTime, initials, avatarColor,
} from "../shared"

// ---------- Constants ----------
const ARREAR_ELIGIBLE_INPUTS: InputType[] = [
  "LOP Reversal", "Arrear", "Attendance", "Manual Adjustment",
]

const INPUT_SOURCES = ["Attendance", "Leave", "Salary Revision", "Manual"] as const

const SOURCE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Attendance: CalendarDays,
  Leave: Briefcase,
  "Salary Revision": TrendingUp,
  Manual: Pencil,
}

// ---------- Stat card ----------
function StatCard({
  label, value, icon: Icon, sub, accent = "amber",
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  sub?: string
  accent?: "amber" | "emerald" | "rose" | "slate"
}) {
  const accents: Record<string, string> = {
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400 ring-rose-500/20",
    slate: "from-slate-500/15 to-slate-500/5 text-slate-600 dark:text-slate-400 ring-slate-500/20",
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

// ---------- Filter select ----------
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
        <Icon className="h-3 w-3" />
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs bg-background">
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

// ---------- Add Arrear Input dialog ----------
interface AddArrearInputForm {
  employeeName: string
  employeeCode: string
  entity: string
  department: string
  inputType: InputType
  source: string
  amount: string
  description: string
  referenceId: string
  payGroupId: string
  payrollMonth: string
}

function AddArrearInputDialog({
  open, onOpenChange, onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (form: AddArrearInputForm) => void
}) {
  const [form, setForm] = useState<AddArrearInputForm>({
    employeeName: "", employeeCode: "", entity: "ACME India Pvt Ltd",
    department: "Engineering", inputType: "Arrear", source: "Manual",
    amount: "", description: "", referenceId: "",
    payGroupId: "pg-1", payrollMonth: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
  })

  const handleSubmit = () => {
    if (!form.employeeName.trim() || !form.employeeCode.trim() || !form.amount.trim() || !form.description.trim()) {
      toast.error("Please fill in employee, amount and description.")
      return
    }
    const amt = Number(form.amount)
    if (Number.isNaN(amt) || amt === 0) {
      toast.error("Amount must be a non-zero number.")
      return
    }
    onSubmit(form)
    onOpenChange(false)
    setForm({
      employeeName: "", employeeCode: "", entity: "ACME India Pvt Ltd",
      department: "Engineering", inputType: "Arrear", source: "Manual",
      amount: "", description: "", referenceId: "",
      payGroupId: "pg-1", payrollMonth: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <Plus className="h-4 w-4" />
            </div>
            Add Arrear Input
          </DialogTitle>
          <DialogDescription>
            Capture a new arrear-eligible payroll input. Eligible types: LOP Reversal, Arrear, Attendance, Manual Adjustment.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1 pr-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Employee Name *</Label>
              <Input
                value={form.employeeName}
                onChange={e => setForm({ ...form, employeeName: e.target.value })}
                placeholder="e.g. Sneha Reddy"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Employee Code *</Label>
              <Input
                value={form.employeeCode}
                onChange={e => setForm({ ...form, employeeCode: e.target.value })}
                placeholder="e.g. EMP-1004"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Entity</Label>
              <Select value={form.entity} onValueChange={v => setForm({ ...form, entity: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["ACME India Pvt Ltd", "ACME UAE LLC", "ACME US Inc", "ACME Singapore Pte Ltd"].map(o => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Department</Label>
              <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Engineering", "Product", "Design", "Sales", "Marketing", "Finance", "Human Resources", "Operations", "Customer Success"].map(o => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Input Type *</Label>
              <Select value={form.inputType} onValueChange={v => setForm({ ...form, inputType: v as InputType })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ARREAR_ELIGIBLE_INPUTS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Input Source</Label>
              <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INPUT_SOURCES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount * (negative for recovery)</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="e.g. 12000 or -4500"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reference ID</Label>
              <Input
                value={form.referenceId}
                onChange={e => setForm({ ...form, referenceId: e.target.value })}
                placeholder="e.g. AR-2025-001"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pay Group</Label>
              <Select value={form.payGroupId} onValueChange={v => setForm({ ...form, payGroupId: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAY_GROUPS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payroll Month</Label>
              <Input
                value={form.payrollMonth}
                onChange={e => setForm({ ...form, payrollMonth: e.target.value })}
                placeholder="e.g. June 2025"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Description *</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the arrear input reason, source, and any approver notes…"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sticky bottom-0 bg-background pt-3 border-t border-border/60">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
            <Plus className="h-4 w-4" /> Create Arrear Input
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Component ----------
export function ArrearInputsSection() {
  const [records, setRecords] = useState<PayrollInput[]>(() =>
    PAYROLL_INPUTS.filter(p => ARREAR_ELIGIBLE_INPUTS.includes(p.inputType)),
  )
  const [entityFilter, setEntityFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [payGroupFilter, setPayGroupFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)

  // ---------- Options ----------
  const entityOptions = useMemo(() => Array.from(new Set(records.map(r => r.entity))), [records])
  const sourceOptions = useMemo(() => Array.from(new Set(records.map(r => r.source))), [records])
  const payGroupOptions = useMemo(() => {
    const map = new Map<string, string>()
    PAY_GROUPS.forEach(p => map.set(p.id, p.name))
    return Array.from(new Set(records.map(r => r.payGroupId)))
      .map(id => ({ id, name: map.get(id) || id }))
  }, [records])
  const monthOptions = useMemo(() => Array.from(new Set(records.map(r => r.payrollMonth))), [records])

  // ---------- Filtered ----------
  const filtered = useMemo(() => {
    return records.filter(r => {
      if (entityFilter !== "all" && r.entity !== entityFilter) return false
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false
      if (payGroupFilter !== "all" && r.payGroupId !== payGroupFilter) return false
      if (monthFilter !== "all" && r.payrollMonth !== monthFilter) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hit =
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q) ||
          r.inputType.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q) ||
          (r.referenceId || "").toLowerCase().includes(q)
        if (!hit) return false
      }
      return true
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [records, entityFilter, sourceFilter, payGroupFilter, monthFilter, statusFilter, search])

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const total = records.length
    const pending = records.filter(r => r.status === "Pending").length
    const approved = records.filter(r => r.status === "Approved").length
    const locked = records.filter(r => r.status === "Locked").length
    const totalAmount = records.reduce((s, r) => s + r.amount, 0)
    return { total, pending, approved, locked, totalAmount }
  }, [records])

  // ---------- Actions ----------
  const handleAdd = (form: AddArrearInputForm) => {
    const newRec: PayrollInput = {
      id: `pi-${Date.now()}`,
      employeeId: form.employeeCode,
      employeeName: form.employeeName,
      employeeCode: form.employeeCode,
      entity: form.entity,
      department: form.department,
      inputType: form.inputType,
      amount: Number(form.amount),
      description: form.description,
      referenceId: form.referenceId || undefined,
      payGroupId: form.payGroupId,
      payrollMonth: form.payrollMonth,
      status: "Pending",
      source: form.source as PayrollInput["source"],
      createdAt: new Date().toISOString(),
    }
    setRecords(prev => [newRec, ...prev])
    toast.success("Arrear input created", {
      description: `${form.employeeName} · ${form.inputType} · ${formatCurrency(Number(form.amount))}`,
    })
  }

  const handleApprove = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "Approved", approvedBy: "You", createdAt: new Date().toISOString() } : r))
    toast.success("Input approved")
  }
  const handleLock = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "Locked" } : r))
    toast.info("Input locked for payroll run")
  }
  const handleDelete = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id))
    toast.success("Input removed")
  }

  const handleClearFilters = () => {
    setEntityFilter("all"); setSourceFilter("all"); setPayGroupFilter("all")
    setMonthFilter("all"); setStatusFilter("all"); setSearch("")
  }
  const handleRefresh = () => toast.success("Inputs refreshed")

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-soft">
            <ListChecks className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">
              Arrear Inputs
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Arrear-eligible payroll inputs — LOP Reversal, Arrear, Attendance, Manual Adjustment.
              These feed into the arrear calculation engine.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={handleRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
            <Plus className="h-3.5 w-3.5" /> Add Arrear Input
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Inputs" value={stats.total} icon={Layers} accent="amber" sub="Arrear-eligible" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} accent="amber" sub="Awaiting approval" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} accent="emerald" sub="Ready for run" />
        <StatCard label="Locked" value={stats.locked} icon={Lock} accent="slate" sub="In payroll cycle" />
        <StatCard label="Total Amount" value={formatCurrency(stats.totalAmount)} icon={IndianRupee} accent="amber" sub="Net (incl. recovery)" />
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <FilterSelect label="Entity" icon={Building2} value={entityFilter} onChange={setEntityFilter} options={entityOptions} allLabel="All entities" />
            <FilterSelect label="Input Source" icon={Tag} value={sourceFilter} onChange={setSourceFilter} options={sourceOptions} allLabel="All sources" />
            <div className="flex flex-col gap-1 min-w-[150px]">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Layers className="h-3 w-3" /> Pay Group
              </label>
              <Select value={payGroupFilter} onValueChange={setPayGroupFilter}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="All pay groups" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All pay groups</SelectItem>
                  {payGroupOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <FilterSelect label="Month" icon={CalendarDays} value={monthFilter} onChange={setMonthFilter} options={monthOptions} allLabel="All months" />
            <FilterSelect label="Status" icon={CheckCircle2} value={statusFilter} onChange={setStatusFilter} options={["Pending", "Approved", "Rejected", "Locked"]} allLabel="All statuses" />
            <div className="flex flex-col gap-1 min-w-[150px]">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Search className="h-3 w-3" /> Search
              </label>
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, code, ref…"
                className="h-8 text-xs bg-background"
              />
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

      {/* Inputs table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Arrear Inputs Table</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} record(s)</p>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400">
              Arrear-eligible only
            </Badge>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground mb-3">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No arrear inputs found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">Adjust filters or create a new arrear input to get started.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[640px] w-full">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
                  <TableRow className="hover:bg-muted/60">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide min-w-[200px]">Employee</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Entity / Dept</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Input Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Source</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide min-w-[200px]">Description</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Reference</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Pay Group</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Month</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Approved By</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: PayrollInput) => {
                    const SourceIcon = SOURCE_ICON[r.source] || Tag
                    return (
                      <TableRow key={r.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-500/5">
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className={cn("text-[10px] text-white font-semibold", avatarColor(r.employeeId))}>
                                {initials(r.employeeName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{r.employeeName}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{r.employeeCode}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-foreground truncate max-w-[160px]">{r.entity}</p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{r.department}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px] border-amber-500/30 text-amber-700 dark:text-amber-400">
                            {r.inputType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <SourceIcon className="h-3 w-3" /> {r.source}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "text-sm font-semibold tabular-nums inline-flex items-center gap-1 justify-end",
                            r.amount < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground",
                          )}>
                            {r.amount < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                            {formatCurrency(r.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-foreground/80 line-clamp-2 max-w-[220px]">{r.description}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{r.referenceId || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {PAY_GROUPS.find(p => p.id === r.payGroupId)?.name || r.payGroupId}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.payrollMonth}</TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_COLORS[r.status] || "bg-muted text-muted-foreground")}>
                            {r.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.approvedBy ? <span>{r.approvedBy}<br /><span className="text-[10px]">{formatDate(r.createdAt)}</span></span> : "—"}
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
                              <DropdownMenuItem onClick={() => toast.info(`Viewing ${r.employeeName} input`)}>
                                <Eye className="h-3.5 w-3.5 mr-2" /> View
                              </DropdownMenuItem>
                              {r.status === "Pending" && (
                                <DropdownMenuItem onClick={() => handleApprove(r.id)}>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Approve
                                </DropdownMenuItem>
                              )}
                              {r.status === "Approved" && (
                                <DropdownMenuItem onClick={() => handleLock(r.id)}>
                                  <Lock className="h-3.5 w-3.5 mr-2" /> Lock for Payroll
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => toast.info(`Edit ${r.employeeName} input`)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-rose-600 dark:text-rose-400" onClick={() => handleDelete(r.id)}>
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
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

      <AddArrearInputDialog open={addOpen} onOpenChange={setAddOpen} onSubmit={handleAdd} />
    </div>
  )
}

export default ArrearInputsSection
