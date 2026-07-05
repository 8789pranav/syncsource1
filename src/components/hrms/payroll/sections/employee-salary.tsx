"use client"

// ============================================================================
//  Salary — Employee Salary (Task ID 3-a)
// ----------------------------------------------------------------------------
//  Manage employee-wise salary assignments: filters, stats, table, detail
//  dialog & assign-salary dialog.
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  UserSquare, Plus, Search, Filter, MoreHorizontal, Eye, Pencil, Pause, Play,
  RefreshCw, CheckCircle2, Banknote, TrendingUp, Users, Wallet, ChevronRight,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
  EmployeeSalary, STATUS_COLORS, formatCurrency, formatCurrencyShort, formatDate,
  initials, avatarColor, GRADES,
} from "../shared"
import { PAY_GROUPS, SALARY_STRUCTURES, EMPLOYEE_SALARIES } from "../data"

// ---------- motion ----------
const gridContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const gridItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

// ---------- Stat tile ----------
function StatTile({ label, value, icon: Icon, accent, sub }: {
  label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>
  accent: "teal" | "cyan" | "emerald" | "amber" | "rose"; sub?: string
}) {
  const map: Record<string, string> = {
    teal: "from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-400",
    cyan: "from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400",
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
//  Salary detail dialog
// ============================================================================
function SalaryDetailDialog({ salary, onClose }: { salary: EmployeeSalary | null; onClose: () => void }) {
  if (!salary) return null
  return (
    <Dialog open={!!salary} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Salary Breakdown
          </DialogTitle>
          <DialogDescription>{salary.salaryStructureName} · Effective from {formatDate(salary.effectiveFrom)}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4 py-2">
            {/* Employee header */}
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-gradient-to-br from-teal-50/50 to-cyan-50/30 dark:from-teal-500/5 dark:to-cyan-500/5 p-4">
              <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-full text-white text-sm font-semibold", avatarColor(salary.employeeName))}>
                {initials(salary.employeeName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{salary.employeeName}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{salary.employeeCode}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{salary.designation}</Badge>
                  <Badge variant="outline" className="text-[10px]">{salary.department}</Badge>
                  <Badge variant="outline" className="text-[10px]">{salary.grade}</Badge>
                  <Badge variant="secondary" className={cn("text-[10px] border-0", STATUS_COLORS[salary.status])}>{salary.status}</Badge>
                </div>
              </div>
            </div>

            {/* CTC summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border/60 bg-background p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">CTC Annual</p>
                <p className="text-base font-semibold text-foreground tabular-nums mt-1">{formatCurrencyShort(salary.ctcAnnual)}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">CTC Monthly</p>
                <p className="text-base font-semibold text-foreground tabular-nums mt-1">{formatCurrencyShort(salary.ctcMonthly)}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Gross Monthly</p>
                <p className="text-base font-semibold text-foreground tabular-nums mt-1">{formatCurrencyShort(salary.totalEarningsMonthly)}</p>
              </div>
              <div className="rounded-lg border border-teal-500/30 bg-teal-50/40 dark:bg-teal-500/5 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Net Pay</p>
                <p className="text-base font-semibold text-teal-700 dark:text-teal-400 tabular-nums mt-1">{formatCurrencyShort(salary.netPayMonthly)}</p>
              </div>
            </div>

            {/* Earnings & Deductions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <div className="px-3 py-2 bg-emerald-50/60 dark:bg-emerald-500/10 border-b border-border/40">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Earnings (Monthly)
                  </p>
                </div>
                <div className="p-3 space-y-2">
                  {[
                    { label: "Basic", value: salary.basicMonthly },
                    { label: "House Rent Allowance", value: salary.hraMonthly },
                    { label: "Special Allowance", value: salary.specialAllowanceMonthly },
                    { label: "Conveyance", value: 1600 },
                    { label: "Medical", value: 1250 },
                  ].map(e => (
                    <div key={e.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{e.label}</span>
                      <span className="font-medium text-foreground tabular-nums">{formatCurrency(e.value)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">Total Earnings</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(salary.totalEarningsMonthly)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 overflow-hidden">
                <div className="px-3 py-2 bg-rose-50/60 dark:bg-rose-500/10 border-b border-border/40">
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5" /> Deductions (Monthly)
                  </p>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Provident Fund (Employee)</span>
                    <span className="font-medium text-foreground tabular-nums">{formatCurrency(Math.round(salary.basicMonthly * 0.12))}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Professional Tax</span>
                    <span className="font-medium text-foreground tabular-nums">{formatCurrency(200)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">TDS</span>
                    <span className="font-medium text-foreground tabular-nums">{formatCurrency(Math.round((salary.basicMonthly + salary.hraMonthly + salary.specialAllowanceMonthly) * 0.05))}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">Total Deductions</span>
                    <span className="font-semibold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(salary.totalDeductionsMonthly)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-muted-foreground">Last Revision</p>
                <p className="font-medium text-foreground mt-0.5">{formatDate(salary.lastRevisionDate)}</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-muted-foreground">Pay Group</p>
                <p className="font-medium text-foreground mt-0.5 truncate">{salary.payGroupName}</p>
              </div>
            </div>
          </div>
        </ScrollArea>
        <Separator />
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info("Revise dialog opened")} className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Revise</Button>
          <Button size="sm" onClick={onClose} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <CheckCircle2 className="h-3.5 w-3.5" /> Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Assign Salary dialog
// ============================================================================
function AssignSalaryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [employeeId, setEmployeeId] = React.useState("")
  const [payGroupId, setPayGroupId] = React.useState("")
  const [structureId, setStructureId] = React.useState("")
  const [ctc, setCtc] = React.useState("")

  const employee = EMPLOYEE_SALARIES.find(e => e.employeeId === employeeId)
  const structure = SALARY_STRUCTURES.find(s => s.id === structureId)
  const ctcNum = Number(ctc) || 0
  const monthlyCtc = Math.round(ctcNum / 12)
  const basic = Math.round(monthlyCtc * 0.4)
  const hra = Math.round(basic * 0.5)
  const pf = Math.round(basic * 0.12)
  const net = monthlyCtc - pf - 200

  const submit = () => {
    if (!employeeId || !payGroupId || !structureId || !ctc) {
      toast.error("Please fill all required fields")
      return
    }
    toast.success("Salary assigned", { description: `${employee?.employeeName} · ${formatCurrencyShort(ctcNum)}/yr` })
    onClose()
    setEmployeeId(""); setPayGroupId(""); setStructureId(""); setCtc("")
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Assign Salary
          </DialogTitle>
          <DialogDescription>Assign a salary structure & CTC to an employee. Components auto-calculate.</DialogDescription>
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
              <Label className="text-xs">Salary Structure *</Label>
              <Select value={structureId} onValueChange={setStructureId}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select structure" /></SelectTrigger>
                <SelectContent>
                  {SALARY_STRUCTURES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Annual CTC (₹) *</Label>
              <Input type="number" value={ctc} onChange={e => setCtc(e.target.value)} placeholder="1200000" className="bg-background" />
            </div>

            {/* Auto-calc preview */}
            {ctcNum > 0 && (
              <div className="sm:col-span-2 rounded-lg border border-teal-500/30 bg-teal-50/40 dark:bg-teal-500/5 p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Auto-calculated Components (Monthly)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Basic (40%)", value: basic },
                    { label: "HRA (50% of Basic)", value: hra },
                    { label: "PF (12% of Basic)", value: pf },
                    { label: "Net Pay", value: net, accent: true },
                  ].map(c => (
                    <div key={c.label}>
                      <p className="text-[10px] text-muted-foreground truncate">{c.label}</p>
                      <p className={cn("text-sm font-semibold tabular-nums", c.accent ? "text-teal-700 dark:text-teal-400" : "text-foreground")}>
                        {formatCurrencyShort(c.value)}
                      </p>
                    </div>
                  ))}
                </div>
                {structure && (
                  <p className="text-[10px] text-muted-foreground mt-2 italic">
                    Based on structure: <span className="font-medium text-foreground">{structure.name}</span> (CTC range: {formatCurrencyShort(structure.monthlyCtcMin)}–{formatCurrencyShort(structure.monthlyCtcMax)}/mo)
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
        <Separator />
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <CheckCircle2 className="h-3.5 w-3.5" /> Assign Salary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Main component
// ============================================================================
export function EmployeeSalarySection() {
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState({ entity: "all", department: "all", payGroup: "all", structure: "all", grade: "all", status: "all" })
  const [assignOpen, setAssignOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<EmployeeSalary | null>(null)

  const entities = Array.from(new Set(EMPLOYEE_SALARIES.map(e => e.entity)))
  const departments = Array.from(new Set(EMPLOYEE_SALARIES.map(e => e.department)))

  const filtered = React.useMemo(() => {
    let list = EMPLOYEE_SALARIES
    if (filters.entity !== "all") list = list.filter(e => e.entity === filters.entity)
    if (filters.department !== "all") list = list.filter(e => e.department === filters.department)
    if (filters.payGroup !== "all") list = list.filter(e => e.payGroupId === filters.payGroup)
    if (filters.structure !== "all") list = list.filter(e => e.salaryStructureId === filters.structure)
    if (filters.grade !== "all") list = list.filter(e => e.grade === filters.grade)
    if (filters.status !== "all") list = list.filter(e => e.status === filters.status)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e => e.employeeName.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q) || e.designation.toLowerCase().includes(q))
    }
    return list
  }, [filters, search])

  const stats = {
    total: EMPLOYEE_SALARIES.length,
    active: EMPLOYEE_SALARIES.filter(e => e.status === "Active").length,
    onHold: EMPLOYEE_SALARIES.filter(e => e.status === "On Hold").length,
    avgCtc: EMPLOYEE_SALARIES.length ? Math.round(EMPLOYEE_SALARIES.reduce((s, e) => s + e.ctcAnnual, 0) / EMPLOYEE_SALARIES.length) : 0,
    monthlyPayout: EMPLOYEE_SALARIES.filter(e => e.status === "Active").reduce((s, e) => s + e.netPayMonthly, 0),
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-soft">
            <UserSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Employee Salary</h1>
            <p className="text-sm text-muted-foreground mt-0.5">View, assign & revise employee-wise salary structures and CTC.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => toast.info("Refreshed")} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          <Button size="sm" onClick={() => setAssignOpen(true)} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <Plus className="h-3.5 w-3.5" /> Assign Salary
          </Button>
        </div>
      </div>

      {/* Stat row */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" variants={gridContainer} initial="hidden" animate="show">
        <motion.div variants={gridItem}><StatTile label="Total Employees" value={stats.total} icon={Users} accent="teal" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Active Salaries" value={stats.active} icon={CheckCircle2} accent="emerald" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="On Hold" value={stats.onHold} icon={Pause} accent="amber" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Average CTC" value={formatCurrencyShort(stats.avgCtc)} icon={TrendingUp} accent="cyan" sub="Annual" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Monthly Payout" value={formatCurrencyShort(stats.monthlyPayout)} icon={Banknote} accent="rose" sub="Net" /></motion.div>
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
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="pl-9 h-9 bg-background" />
            </div>
            <Select value={filters.entity} onValueChange={v => setFilters({ ...filters, entity: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.department} onValueChange={v => setFilters({ ...filters, department: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.payGroup} onValueChange={v => setFilters({ ...filters, payGroup: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Pay Group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pay Groups</SelectItem>
                {PAY_GROUPS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.structure} onValueChange={v => setFilters({ ...filters, structure: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Structure" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Structures</SelectItem>
                {SALARY_STRUCTURES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.grade} onValueChange={v => setFilters({ ...filters, grade: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Grade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {["Active", "On Hold", "Inactive"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/60 rounded-xl shadow-soft overflow-hidden">
        <ScrollArea className="max-h-[640px]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur z-10">
              <TableRow className="hover:bg-muted/40">
                <TableHead className="min-w-[220px]">Employee</TableHead>
                <TableHead className="min-w-[140px]">Entity</TableHead>
                <TableHead className="min-w-[120px]">Department</TableHead>
                <TableHead className="min-w-[160px]">Designation</TableHead>
                <TableHead className="min-w-[60px]">Grade</TableHead>
                <TableHead className="min-w-[140px]">Pay Group</TableHead>
                <TableHead className="min-w-[140px]">Salary Structure</TableHead>
                <TableHead className="min-w-[110px] text-right">CTC Annual</TableHead>
                <TableHead className="min-w-[110px] text-right">CTC Monthly</TableHead>
                <TableHead className="min-w-[100px] text-right">Basic</TableHead>
                <TableHead className="min-w-[110px] text-right">Net Pay</TableHead>
                <TableHead className="min-w-[90px]">Status</TableHead>
                <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <UserSquare className="h-8 w-8 opacity-40" />
                      <p className="text-sm font-medium">No employees match your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map(emp => (
                <TableRow key={emp.id} className="border-border/40 hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(emp)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-[10px] font-semibold", avatarColor(emp.employeeName))}>
                        {initials(emp.employeeName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{emp.employeeName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{emp.employeeCode}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[140px]">{emp.entity}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground">{emp.department}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[160px]">{emp.designation}</span></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{emp.grade}</Badge></TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[140px]">{emp.payGroupName}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[140px]">{emp.salaryStructureName}</span></TableCell>
                  <TableCell className="text-right text-xs font-medium tabular-nums text-foreground">{formatCurrencyShort(emp.ctcAnnual)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatCurrencyShort(emp.ctcMonthly)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatCurrencyShort(emp.basicMonthly)}</TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums text-teal-700 dark:text-teal-400">{formatCurrencyShort(emp.netPayMonthly)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[11px] border-0", STATUS_COLORS[emp.status])}>{emp.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right pr-4" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setDetail(emp)}><Eye className="h-3.5 w-3.5 mr-2" /> View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info("Revise dialog opened")}><Pencil className="h-3.5 w-3.5 mr-2" /> Revise</DropdownMenuItem>
                        {emp.status === "Active" ? (
                          <DropdownMenuItem onClick={() => toast.success("Salary held")}><Pause className="h-3.5 w-3.5 mr-2" /> Hold</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => toast.success("Salary released")}><Play className="h-3.5 w-3.5 mr-2" /> Release</DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toast.success("Payslips generated")} className="gap-1.5">
                          <ChevronRight className="h-3.5 w-3.5 mr-2" /> Generate Payslips
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

      <AssignSalaryDialog open={assignOpen} onClose={() => setAssignOpen(false)} />
      <SalaryDetailDialog salary={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

export default EmployeeSalarySection
