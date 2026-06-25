"use client"

// ============================================================================
//  Salary — Payroll Inputs (Task ID 3-a)
// ----------------------------------------------------------------------------
//  Operational page for managing payroll inputs (attendance, leave, OT,
//  reimbursement, loan, bonus, incentive, LOP reversal, arrear, manual adj).
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ListChecks, Search, Filter, MoreHorizontal, Plus, CheckCircle2, XCircle,
  Pencil, Lock, Building2, Briefcase, Tag, Banknote, CalendarDays, RefreshCw,
  CheckSquare, Trash2, Eye,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import {
  PayrollInput, InputType,
  STATUS_COLORS, formatCurrency, formatDate, initials, avatarColor,
} from "../shared"
import { PAY_GROUPS, PAYROLL_INPUTS, EMPLOYEE_SALARIES } from "../data"

// ---------- Input type colors ----------
const INPUT_TYPE_COLORS: Record<InputType, string> = {
  Attendance: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Leave: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  Overtime: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Reimbursement: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Loan: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Bonus: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Incentive: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  "LOP Reversal": "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Arrear: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Manual Adjustment": "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
}

const SOURCE_COLORS: Record<string, string> = {
  Manual: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  Attendance: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Leave: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  Expense: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Loan: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Arrear: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
}

const ALL_INPUT_TYPES: InputType[] = ["Attendance", "Leave", "Overtime", "Reimbursement", "Loan", "Bonus", "Incentive", "LOP Reversal", "Arrear", "Manual Adjustment"]
const ALL_SOURCES = ["Manual", "Attendance", "Leave", "Expense", "Loan", "Arrear"]

// ---------- motion ----------
const gridContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const gridItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

// ---------- Stat tile ----------
function StatTile({ label, value, icon: Icon, accent, sub }: {
  label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>
  accent: "teal" | "cyan" | "emerald" | "amber" | "rose" | "violet"; sub?: string
}) {
  const map: Record<string, string> = {
    teal: "from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-400",
    cyan: "from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400",
    violet: "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400",
  }
  return (
    <Card className={cn("rounded-xl border border-border/60 shadow-soft bg-gradient-to-br", map[accent])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl font-semibold mt-1 text-foreground tabular-nums leading-none">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>}
          </div>
          <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background/70 ring-1 backdrop-blur-sm", map[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
//  Add Input dialog
// ============================================================================
function AddInputDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [employeeId, setEmployeeId] = React.useState("")
  const [inputType, setInputType] = React.useState<InputType>("Bonus")
  const [amount, setAmount] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [referenceId, setReferenceId] = React.useState("")
  const [payGroupId, setPayGroupId] = React.useState("")
  const [payrollMonth, setPayrollMonth] = React.useState(new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }))

  const employee = EMPLOYEE_SALARIES.find(e => e.employeeId === employeeId)

  const submit = () => {
    if (!employeeId || !amount || !payGroupId) {
      toast.error("Please fill all required fields")
      return
    }
    toast.success("Payroll input added", { description: `${inputType} · ${employee?.employeeName || ""} · ${formatCurrency(Number(amount))}` })
    onClose()
    // reset
    setEmployeeId(""); setAmount(""); setDescription(""); setReferenceId(""); setPayGroupId("")
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Add Payroll Input
          </DialogTitle>
          <DialogDescription>Add a new payroll input for an employee.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-2">
          <div className="grid sm:grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Employee *</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_SALARIES.map(e => <SelectItem key={e.employeeId} value={e.employeeId}>{e.employeeName} ({e.employeeCode}) — {e.department}</SelectItem>)}
                </SelectContent>
              </Select>
              {employee && (
                <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                  <span>Entity: <span className="font-medium text-foreground">{employee.entity}</span></span>
                  <span>Dept: <span className="font-medium text-foreground">{employee.department}</span></span>
                  <span>Pay Group: <span className="font-medium text-foreground">{employee.payGroupName}</span></span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Input Type *</Label>
              <Select value={inputType} onValueChange={v => setInputType(v as InputType)}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_INPUT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (₹) *</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pay Group *</Label>
              <Select value={payGroupId} onValueChange={setPayGroupId}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select pay group" /></SelectTrigger>
                <SelectContent>
                  {PAY_GROUPS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payroll Month</Label>
              <Input value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reference ID</Label>
              <Input value={referenceId} onChange={e => setReferenceId(e.target.value)} placeholder="OT-001, BNS-Q1-002..." className="bg-background" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Reason / details..." rows={2} className="bg-background resize-none" />
            </div>
          </div>
        </ScrollArea>
        <Separator />
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <CheckCircle2 className="h-3.5 w-3.5" /> Save Input
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Main component
// ============================================================================
export function PayrollInputsSection() {
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState({ entity: "all", payGroup: "all", inputType: "all", source: "all", status: "all", month: "all" })
  const [addOpen, setAddOpen] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  const entities = Array.from(new Set(PAYROLL_INPUTS.map(i => i.entity)))
  const months = Array.from(new Set(PAYROLL_INPUTS.map(i => i.payrollMonth)))

  const filtered = React.useMemo(() => {
    let list = PAYROLL_INPUTS
    if (filters.entity !== "all") list = list.filter(i => i.entity === filters.entity)
    if (filters.payGroup !== "all") list = list.filter(i => i.payGroupId === filters.payGroup)
    if (filters.inputType !== "all") list = list.filter(i => i.inputType === filters.inputType)
    if (filters.source !== "all") list = list.filter(i => i.source === filters.source)
    if (filters.status !== "all") list = list.filter(i => i.status === filters.status)
    if (filters.month !== "all") list = list.filter(i => i.payrollMonth === filters.month)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i => i.employeeName.toLowerCase().includes(q) || i.employeeCode.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || (i.referenceId || "").toLowerCase().includes(q))
    }
    return list
  }, [filters, search])

  const allSelected = filtered.length > 0 && filtered.every(i => selectedIds.has(i.id))
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(filtered.map(i => i.id)))
  const toggle = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const stats = {
    total: PAYROLL_INPUTS.length,
    pending: PAYROLL_INPUTS.filter(i => i.status === "Pending").length,
    approved: PAYROLL_INPUTS.filter(i => i.status === "Approved").length,
    locked: PAYROLL_INPUTS.filter(i => i.status === "Locked").length,
    amount: PAYROLL_INPUTS.filter(i => i.status === "Approved").reduce((s, i) => s + Math.abs(i.amount), 0),
  }

  const onAction = (action: string, item?: PayrollInput) => {
    toast.success(action, { description: item ? `${item.employeeName} · ${item.inputType}` : undefined })
  }
  const onBulk = (action: string) => {
    if (selectedIds.size === 0) { toast.error("Select at least one input first"); return }
    toast.success(action, { description: `${selectedIds.size} input(s) selected` })
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-soft">
            <ListChecks className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Payroll Inputs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Attendance, leave, OT, bonus, incentive, loan & reimbursement inputs feeding payroll.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => toast.info("Refreshed")} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <Plus className="h-3.5 w-3.5" /> Add Input
          </Button>
        </div>
      </div>

      {/* Stat row */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" variants={gridContainer} initial="hidden" animate="show">
        <motion.div variants={gridItem}><StatTile label="Total Inputs" value={stats.total} icon={ListChecks} accent="teal" sub="All-time" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Pending" value={stats.pending} icon={CalendarDays} accent="amber" sub="Awaiting approval" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Approved" value={stats.approved} icon={CheckCircle2} accent="emerald" sub="Ready for payroll" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Locked" value={stats.locked} icon={Lock} accent="violet" sub="In current run" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Total Amount" value={formatCurrency(stats.amount)} icon={Banknote} accent="cyan" sub="Approved value" /></motion.div>
      </motion.div>

      {/* Filter bar */}
      <Card className="border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-teal-500" />
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <div className="relative col-span-2 sm:col-span-3 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inputs..." className="pl-9 h-9 bg-background" />
            </div>
            <Select value={filters.entity} onValueChange={v => setFilters({ ...filters, entity: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.payGroup} onValueChange={v => setFilters({ ...filters, payGroup: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Pay Group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pay Groups</SelectItem>
                {PAY_GROUPS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.inputType} onValueChange={v => setFilters({ ...filters, inputType: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Input Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ALL_INPUT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.source} onValueChange={v => setFilters({ ...filters, source: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {ALL_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {["Pending", "Approved", "Rejected", "Locked"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.month} onValueChange={v => setFilters({ ...filters, month: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <Card className="border-teal-500/30 rounded-xl shadow-soft bg-teal-50/40 dark:bg-teal-500/5">
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400 gap-1">
              <CheckSquare className="h-3 w-3" /> {selectedIds.size} selected
            </Badge>
            <Button size="sm" variant="outline" onClick={() => onBulk("Bulk approved")} className="gap-1.5 h-8 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
              <CheckCircle2 className="h-3 w-3" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => onBulk("Bulk rejected")} className="gap-1.5 h-8 text-xs border-rose-500/40 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10">
              <XCircle className="h-3 w-3" /> Reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="h-8 text-xs ml-auto">Clear</Button>
          </CardContent>
        </Card>
      )}

      {/* Inputs table */}
      <Card className="border-border/60 rounded-xl shadow-soft overflow-hidden">
        <ScrollArea className="max-h-[640px]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur z-10">
              <TableRow className="hover:bg-muted/40">
                <TableHead className="w-[40px] pl-4">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                </TableHead>
                <TableHead className="min-w-[200px]">Employee</TableHead>
                <TableHead className="min-w-[130px]">Entity</TableHead>
                <TableHead className="min-w-[120px]">Department</TableHead>
                <TableHead className="min-w-[130px]">Input Type</TableHead>
                <TableHead className="min-w-[110px] text-right">Amount</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="min-w-[100px]">Source</TableHead>
                <TableHead className="min-w-[110px]">Reference ID</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[120px]">Approved By</TableHead>
                <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ListChecks className="h-8 w-8 opacity-40" />
                      <p className="text-sm font-medium">No payroll inputs match your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map(inp => (
                <TableRow key={inp.id} className={cn("border-border/40 hover:bg-muted/30", selectedIds.has(inp.id) && "bg-teal-50/40 dark:bg-teal-500/5")}>
                  <TableCell className="pl-4">
                    <Checkbox checked={selectedIds.has(inp.id)} onCheckedChange={() => toggle(inp.id)} aria-label={`Select ${inp.employeeName}`} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-[10px] font-semibold", avatarColor(inp.employeeName))}>
                        {initials(inp.employeeName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{inp.employeeName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{inp.employeeCode}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[130px]">{inp.entity}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground">{inp.department}</span></TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[11px] border-0", INPUT_TYPE_COLORS[inp.inputType])}>{inp.inputType}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn("text-sm font-semibold tabular-nums", inp.amount < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground")}>
                      {formatCurrency(inp.amount)}
                    </span>
                  </TableCell>
                  <TableCell><span className="text-xs text-muted-foreground truncate block max-w-[200px]">{inp.description}</span></TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px] border-0", SOURCE_COLORS[inp.source])}>{inp.source}</Badge>
                  </TableCell>
                  <TableCell><span className="text-[11px] text-muted-foreground font-mono">{inp.referenceId || "—"}</span></TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[11px] border-0", STATUS_COLORS[inp.status] || "bg-muted text-muted-foreground")}>{inp.status}</Badge>
                  </TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{inp.approvedBy || "—"}</span></TableCell>
                  <TableCell className="text-right pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onAction("View input", inp)}><Eye className="h-3.5 w-3.5 mr-2" /> View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction("Edit input", inp)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                        {inp.status === "Pending" && (
                          <DropdownMenuItem onClick={() => onAction("Approved", inp)} className="text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Approve
                          </DropdownMenuItem>
                        )}
                        {inp.status === "Pending" && (
                          <DropdownMenuItem onClick={() => onAction("Rejected", inp)} className="text-rose-600 dark:text-rose-400">
                            <XCircle className="h-3.5 w-3.5 mr-2" /> Reject
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onAction("Locked", inp)}><Lock className="h-3.5 w-3.5 mr-2" /> Lock</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-rose-600 dark:text-rose-400" onClick={() => onAction("Deleted", inp)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <AddInputDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

export default PayrollInputsSection
