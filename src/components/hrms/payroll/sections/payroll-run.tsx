"use client"

// ============================================================================
//  Salary — Payroll Run (Task ID 3-a)
// ----------------------------------------------------------------------------
//  Operational page for managing payroll runs: filter bar, stat row, runs table,
//  "Start Payroll Run" 4-step wizard, and run-detail dialog.
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Play, Search, Filter, MoreHorizontal, Eye, CheckCircle2, XCircle, Landmark,
  Building2, Users, CalendarDays, ChevronLeft, ChevronRight, Check, Ban,
  Banknote, FileText, ListChecks, Clock, TrendingUp, Layers, RefreshCw,
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
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs"

import {
  PayrollRun, PayrollRunEmployee,
  STATUS_COLORS, formatCurrency, formatCurrencyShort, formatDate, formatDateTime,
  initials, avatarColor,
} from "../shared"
import { PAY_GROUPS, PAYROLL_RUNS } from "../data"

// ---------- motion ----------
const gridContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const gridItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

// ---------- Stat card ----------
function StatTile({
  label, value, icon: Icon, accent, sub,
}: {
  label: string; value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  accent: "teal" | "cyan" | "emerald" | "amber" | "rose" | "violet"
  sub?: string
}) {
  const map: Record<string, string> = {
    teal: "from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-400 ring-teal-500/20",
    cyan: "from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 ring-cyan-500/20",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400 ring-rose-500/20",
    violet: "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400 ring-violet-500/20",
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

// ---------- Filter bar ----------
function FilterBar({
  search, onSearch, filters, onFilters,
}: {
  search: string
  onSearch: (v: string) => void
  filters: { entity: string; payGroup: string; status: string; month: string }
  onFilters: (f: { entity: string; payGroup: string; status: string; month: string }) => void
}) {
  const entities = Array.from(new Set(PAYROLL_RUNS.map(r => r.entity)))
  const months = Array.from(new Set(PAYROLL_RUNS.map(r => r.payrollMonth)))
  return (
    <Card className="border-border/60 rounded-xl shadow-soft">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-teal-500" />
          <h3 className="text-sm font-semibold text-foreground">Filters</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="relative col-span-2 sm:col-span-3 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search runs..." className="pl-9 h-9 bg-background" />
          </div>
          <Select value={filters.entity} onValueChange={v => onFilters({ ...filters, entity: v })}>
            <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Entity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.payGroup} onValueChange={v => onFilters({ ...filters, payGroup: v })}>
            <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Pay Group" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pay Groups</SelectItem>
              {PAY_GROUPS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={v => onFilters({ ...filters, status: v })}>
            <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {["Draft", "Processing", "Processed", "Approved", "Paid", "Cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.month} onValueChange={v => onFilters({ ...filters, month: v })}>
            <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
//  Start Payroll Run wizard (4 steps)
// ============================================================================
const WIZARD_STEPS = [
  { id: 1, name: "Select Pay Group & Month", icon: Building2 },
  { id: 2, name: "Review Inputs", icon: ListChecks },
  { id: 3, name: "Preview Employees", icon: Users },
  { id: 4, name: "Confirm & Start", icon: CheckCircle2 },
] as const

function StartRunWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = React.useState(1)
  const [payGroupId, setPayGroupId] = React.useState("")
  const [month, setMonth] = React.useState(new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }))
  const [includeArrears, setIncludeArrears] = React.useState(true)
  const [includeBonus, setIncludeBonus] = React.useState(true)

  React.useEffect(() => { if (open) setStep(1) }, [open])

  const payGroup = PAY_GROUPS.find(p => p.id === payGroupId)
  const next = () => setStep(s => Math.min(4, s + 1))
  const prev = () => setStep(s => Math.max(1, s - 1))

  const finish = () => {
    toast.success("Payroll run started", { description: `${payGroup?.name} · ${month}` })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Start Payroll Run
          </DialogTitle>
          <DialogDescription>Configure and start a new payroll cycle in 4 steps.</DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 py-2">
          {WIZARD_STEPS.map((s, i) => {
            const isActive = step === s.id
            const isDone = step > s.id
            return (
              <React.Fragment key={s.id}>
                <div className={cn("flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                  isActive ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm" :
                  isDone ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400" :
                  "bg-muted text-muted-foreground")}>
                  <s.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{s.name}</span>
                  <span className="sm:hidden">{s.id}</span>
                  {isDone && <Check className="h-3 w-3" />}
                </div>
                {i < WIZARD_STEPS.length - 1 && <div className={cn("h-px flex-1 min-w-[12px]", isDone ? "bg-teal-500/40" : "bg-border")} />}
              </React.Fragment>
            )
          })}
        </div>

        <Separator />

        <ScrollArea className="flex-1 min-h-[280px] pr-2">
          <div className="space-y-4 py-2">
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pay Group *</Label>
                    <Select value={payGroupId} onValueChange={setPayGroupId}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Select pay group" /></SelectTrigger>
                      <SelectContent>
                        {PAY_GROUPS.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.entity})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Payroll Month *</Label>
                    <Input value={month} onChange={e => setMonth(e.target.value)} className="bg-background" />
                  </div>
                </div>
                {payGroup && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Entity:</span><span className="font-medium text-foreground">{payGroup.entity}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Frequency:</span><span className="font-medium text-foreground">{payGroup.frequency}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Currency:</span><span className="font-medium text-foreground">{payGroup.currency}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Employees:</span><span className="font-medium text-foreground">{payGroup.employeeCount}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Pay Date:</span><span className="font-medium text-foreground">{payGroup.payDate}</span></div>
                  </div>
                )}
              </div>
            )}
            {step === 2 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Review inputs to be included in this payroll cycle:</p>
                {[
                  { name: "Attendance & LOP", count: 142, source: "Attendance System", auto: true },
                  { name: "Leave Deductions", count: 12, source: "Leave Module", auto: true },
                  { name: "Bonus & Incentives", count: 8, source: "Manual Entry", auto: includeBonus, toggle: () => setIncludeBonus(v => !v) },
                  { name: "Arrears", count: 5, source: "Arrear Module", auto: includeArrears, toggle: () => setIncludeArrears(v => !v) },
                  { name: "Loan EMI Recovery", count: 4, source: "Loan Module", auto: true },
                  { name: "Reimbursements", count: 7, source: "Expense Module", auto: true },
                ].map(inp => (
                  <div key={inp.name} className="flex items-center justify-between rounded-lg border border-border/60 bg-background p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
                        <ListChecks className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{inp.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{inp.source} · {inp.count} entries</p>
                      </div>
                    </div>
                    {inp.toggle ? (
                      <Button size="sm" variant={inp.auto ? "default" : "outline"} onClick={inp.toggle}
                        className={cn("h-7 text-xs gap-1", inp.auto && "bg-teal-600 hover:bg-teal-700 text-white")}>
                        {inp.auto ? <><Check className="h-3 w-3" /> Include</> : "Excluded"}
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">Auto</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            {step === 3 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Preview of employees in this run (showing first 6 of {payGroup?.employeeCount || 0}):</p>
                <div className="rounded-lg border border-border/60 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs">Employee</TableHead>
                        <TableHead className="text-xs">Department</TableHead>
                        <TableHead className="text-xs text-right">Gross</TableHead>
                        <TableHead className="text-xs text-right">Deductions</TableHead>
                        <TableHead className="text-xs text-right">Net Pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {PAYROLL_RUNS[0].employees.slice(0, 6).map(emp => (
                        <TableRow key={emp.employeeId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={cn("grid h-7 w-7 place-items-center rounded-full text-white text-[10px] font-semibold", avatarColor(emp.employeeName))}>
                                {initials(emp.employeeName)}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-foreground">{emp.employeeName}</p>
                                <p className="text-[10px] text-muted-foreground">{emp.employeeCode}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{emp.department}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{formatCurrencyShort(emp.grossEarnings)}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-rose-600 dark:text-rose-400">{formatCurrencyShort(emp.totalDeductions)}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-semibold">{formatCurrencyShort(emp.netPay)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="space-y-3">
                <div className="rounded-lg border border-teal-500/30 bg-teal-50/40 dark:bg-teal-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <p className="text-sm font-semibold text-foreground">Ready to start</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Review the summary below and confirm to start the payroll run.</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Pay Group:</span><span className="font-medium text-foreground">{payGroup?.name || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Entity:</span><span className="font-medium text-foreground">{payGroup?.entity}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Month:</span><span className="font-medium text-foreground">{month}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Employees:</span><span className="font-medium text-foreground">{payGroup?.employeeCount || 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Include Arrears:</span><span className="font-medium text-foreground">{includeArrears ? "Yes" : "No"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Include Bonus:</span><span className="font-medium text-foreground">{includeBonus ? "Yes" : "No"}</span></div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" size="sm" onClick={prev} disabled={step === 1} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            {step < 4 ? (
              <Button size="sm" onClick={next} disabled={step === 1 && !payGroupId} className="gap-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={finish} className="gap-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
                <Play className="h-3.5 w-3.5" /> Start Run
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Run detail dialog
// ============================================================================
function RunDetailDialog({ run, onClose }: { run: PayrollRun | null; onClose: () => void }) {
  const [sortKey, setSortKey] = React.useState<"netPay" | "grossEarnings" | "totalDeductions" | "lopDays">("netPay")
  if (!run) return null
  const employees = [...run.employees].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number))

  const timeline = [
    { label: "Created", date: run.createdAt, done: true },
    { label: "Started", date: run.startedAt, done: !!run.startedAt },
    { label: "Processed", date: run.processedAt, done: !!run.processedAt },
    { label: "Approved", date: run.approvedAt, done: !!run.approvedAt },
    { label: "Paid", date: run.paidAt, done: !!run.paidAt },
  ]

  return (
    <Dialog open={!!run} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" /> {run.name}
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono">{run.code}</span> · {run.payGroupName} · {run.payrollMonth}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="employees" className="flex-1 flex flex-col min-h-0">
          <TabsList className="self-start">
            <TabsTrigger value="employees" className="text-xs">Employees ({run.totalEmployees})</TabsTrigger>
            <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="flex-1 min-h-0 mt-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Showing all {employees.length} employees · sortable</p>
              <Select value={sortKey} onValueChange={v => setSortKey(v as any)}>
                <SelectTrigger className="h-7 w-44 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="netPay">Sort: Net Pay</SelectItem>
                  <SelectItem value="grossEarnings">Sort: Gross</SelectItem>
                  <SelectItem value="totalDeductions">Sort: Deductions</SelectItem>
                  <SelectItem value="lopDays">Sort: LOP Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ScrollArea className="h-[440px] pr-2">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur z-10">
                  <TableRow>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Department</TableHead>
                    <TableHead className="text-xs text-right">Gross</TableHead>
                    <TableHead className="text-xs text-right">Deductions</TableHead>
                    <TableHead className="text-xs text-right">LOP</TableHead>
                    <TableHead className="text-xs text-right">Net Pay</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map(emp => (
                    <TableRow key={emp.employeeId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("grid h-7 w-7 place-items-center rounded-full text-white text-[10px] font-semibold", avatarColor(emp.employeeName))}>
                            {initials(emp.employeeName)}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground">{emp.employeeName}</p>
                            <p className="text-[10px] text-muted-foreground">{emp.employeeCode}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{emp.department}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{formatCurrencyShort(emp.grossEarnings)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-rose-600 dark:text-rose-400">{formatCurrencyShort(emp.totalDeductions)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{emp.lopDays}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-semibold">{formatCurrencyShort(emp.netPay)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-[10px] border-0", STATUS_COLORS[emp.status] || "bg-muted text-muted-foreground")}>{emp.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="summary" className="mt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Total Employees", value: run.totalEmployees },
                { label: "Processed", value: run.processedEmployees },
                { label: "LOP Days", value: run.lopDays },
                { label: "Gross Payout", value: formatCurrencyShort(run.grossPayout) },
                { label: "Total Deductions", value: formatCurrencyShort(run.totalDeductions) },
                { label: "Net Payout", value: formatCurrencyShort(run.netPayout) },
                { label: "Arrear Amount", value: formatCurrencyShort(run.arrearAmount) },
                { label: "Bonus Amount", value: formatCurrencyShort(run.bonusAmount) },
                { label: "Reimbursement", value: formatCurrencyShort(run.reimbursementAmount) },
              ].map(s => (
                <div key={s.label} className="rounded-lg border border-border/60 bg-background p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <p className="text-lg font-semibold text-foreground tabular-nums mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-2">
            <div className="relative max-h-[440px] overflow-y-auto pr-2">
              <ol className="relative space-y-3 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border/60">
                {timeline.map(t => (
                  <li key={t.label} className="relative flex gap-3 pl-0">
                    <div className={cn("relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border shadow-soft",
                      t.done ? "bg-gradient-to-br from-teal-500 to-cyan-500 border-teal-500 text-white" : "bg-background border-border/60 text-muted-foreground")}>
                      {t.done ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div className="pt-1.5">
                      <p className={cn("text-sm font-medium", t.done ? "text-foreground" : "text-muted-foreground")}>{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.date ? formatDateTime(t.date) : "Pending"}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />
        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.success("Bank file generated", { description: run.name })} className="gap-1.5">
              <Landmark className="h-3.5 w-3.5" /> Bank File
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Payslips generated", { description: run.name })} className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Payslips
            </Button>
            {run.status === "Processed" && (
              <Button size="sm" onClick={() => { toast.success("Run approved", { description: run.name }); onClose() }} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Main component
// ============================================================================
export function PayrollRunSection() {
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState({ entity: "all", payGroup: "all", status: "all", month: "all" })
  const [wizardOpen, setWizardOpen] = React.useState(false)
  const [detailRun, setDetailRun] = React.useState<PayrollRun | null>(null)

  const filtered = React.useMemo(() => {
    let list = PAYROLL_RUNS
    if (filters.entity !== "all") list = list.filter(r => r.entity === filters.entity)
    if (filters.payGroup !== "all") list = list.filter(r => r.payGroupId === filters.payGroup)
    if (filters.status !== "all") list = list.filter(r => r.status === filters.status)
    if (filters.month !== "all") list = list.filter(r => r.payrollMonth === filters.month)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.entity.toLowerCase().includes(q))
    }
    return list
  }, [filters, search])

  // Stats
  const inProgress = PAYROLL_RUNS.filter(r => r.status === "Processing" || r.status === "Draft").length
  const processed = PAYROLL_RUNS.filter(r => r.status === "Processed").length
  const approved = PAYROLL_RUNS.filter(r => r.status === "Approved").length
  const paid = PAYROLL_RUNS.filter(r => r.status === "Paid").length
  const netThisMonth = PAYROLL_RUNS.filter(r => r.status === "Paid" || r.status === "Approved" || r.status === "Processed").reduce((s, r) => s + r.netPayout, 0)

  const onAction = (action: string, run?: PayrollRun) => {
    toast.success(action, { description: run?.name })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-soft">
            <Play className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Payroll Run</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Run, process, approve & pay monthly payroll cycles.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => toast.info("Refreshed")} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          <Button size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <Play className="h-3.5 w-3.5" /> Start Payroll Run
          </Button>
        </div>
      </div>

      {/* Stat row */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" variants={gridContainer} initial="hidden" animate="show">
        <motion.div variants={gridItem}><StatTile label="Total Runs" value={PAYROLL_RUNS.length} icon={Layers} accent="teal" sub="All-time" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="In Progress" value={inProgress} icon={Clock} accent="cyan" sub="Active cycles" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Processed" value={processed} icon={CheckCircle2} accent="emerald" sub="Awaiting approval" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Approved" value={approved} icon={CheckCircle2} accent="violet" sub="Ready to pay" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Paid" value={paid} icon={Banknote} accent="teal" sub="Completed" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Net Payout (Month)" value={formatCurrencyShort(netThisMonth)} icon={TrendingUp} accent="amber" sub="Current month" /></motion.div>
      </motion.div>

      {/* Filter bar */}
      <FilterBar search={search} onSearch={setSearch} filters={filters} onFilters={setFilters} />

      {/* Runs table */}
      <Card className="border-border/60 rounded-xl shadow-soft overflow-hidden">
        <ScrollArea className="max-h-[640px]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur z-10">
              <TableRow className="hover:bg-muted/40">
                <TableHead className="min-w-[200px]">Run Name</TableHead>
                <TableHead className="min-w-[140px]">Pay Group</TableHead>
                <TableHead className="min-w-[140px]">Entity</TableHead>
                <TableHead className="min-w-[120px]">Month</TableHead>
                <TableHead className="min-w-[110px]">Pay Date</TableHead>
                <TableHead className="min-w-[80px] text-right">Employees</TableHead>
                <TableHead className="min-w-[120px] text-right">Gross</TableHead>
                <TableHead className="min-w-[120px] text-right">Deductions</TableHead>
                <TableHead className="min-w-[130px] text-right">Net Payout</TableHead>
                <TableHead className="min-w-[110px]">Status</TableHead>
                <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Play className="h-8 w-8 opacity-40" />
                      <p className="text-sm font-medium">No payroll runs match your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map(run => (
                <TableRow key={run.id} className="border-border/40 hover:bg-muted/30 cursor-pointer" onClick={() => setDetailRun(run)}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{run.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{run.code}</p>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[140px]">{run.payGroupName}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[140px]">{run.entity}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground">{run.payrollMonth}</span></TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{formatDate(run.payDate)}</span></TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{run.totalEmployees}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatCurrencyShort(run.grossPayout)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-rose-600 dark:text-rose-400">{formatCurrencyShort(run.totalDeductions)}</TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums text-foreground">{formatCurrencyShort(run.netPayout)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[11px] border-0", STATUS_COLORS[run.status] || "bg-muted text-muted-foreground")}>
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-4" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setDetailRun(run)}><Eye className="h-3.5 w-3.5 mr-2" /> View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction("Run processed", run)}><Play className="h-3.5 w-3.5 mr-2" /> Process</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction("Run approved", run)}><CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Approve</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction("Bank file generated", run)}><Landmark className="h-3.5 w-3.5 mr-2" /> Generate Bank File</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction("Payslips generated", run)}><FileText className="h-3.5 w-3.5 mr-2" /> View Employees</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-rose-600 dark:text-rose-400" onClick={() => onAction("Run cancelled", run)}>
                          <Ban className="h-3.5 w-3.5 mr-2" /> Cancel Run
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

      {/* Wizard */}
      <StartRunWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
      {/* Run detail */}
      <RunDetailDialog run={detailRun} onClose={() => setDetailRun(null)} />
    </div>
  )
}

export default PayrollRunSection
