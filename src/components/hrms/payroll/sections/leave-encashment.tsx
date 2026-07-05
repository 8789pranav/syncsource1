"use client"

// ============================================================================
//  Leave Encashment — calculate & track leave encashment during FnF
//  Rose/pink accents. Filter, stats, table, calculate dialog, formula card.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Plane, Search, Filter, Plus, Eye, CheckCircle2, Clock, Coins,
  Calculator, TrendingUp, CalendarDays, Building2,
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

import { FNF_CASES } from "../data"
import {
  initials, avatarColor, formatCurrency, formatCurrencyShort, STATUS_COLORS,
} from "../shared"

// ---------- Synthesize leave encashment records from FNF + EMP_SEED ----------
interface LeaveEncashment {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  department: string
  designation: string
  leaveType: "Earned Leave" | "Privileged Leave" | "Comp Off"
  balanceDays: number
  encashDays: number
  perDayRate: number
  encashmentAmount: number
  status: "Pending" | "Approved" | "Paid" | "Rejected"
  fnfCaseId: string
}

const LEAVE_ENCASHMENTS: LeaveEncashment[] = [
  { id: "le-1", employeeId: "EMP-1190", employeeName: "Pooja Iyer", employeeCode: "EMP-1190", entity: "ACME India Pvt Ltd", department: "Customer Success", designation: "CS Executive", leaveType: "Earned Leave", balanceDays: 24, encashDays: 18, perDayRate: 1778, encashmentAmount: 32000, status: "Approved", fnfCaseId: "fnf-1" },
  { id: "le-2", employeeId: "EMP-1185", employeeName: "Rahul Verma", employeeCode: "EMP-1185", entity: "ACME India Pvt Ltd", department: "Engineering", designation: "Software Engineer", leaveType: "Earned Leave", balanceDays: 30, encashDays: 30, perDayRate: 1500, encashmentAmount: 45000, status: "Paid", fnfCaseId: "fnf-2" },
  { id: "le-3", employeeId: "EMP-1180", employeeName: "Suresh Babu", employeeCode: "EMP-1180", entity: "ACME India Pvt Ltd", department: "Operations", designation: "Operations Analyst", leaveType: "Earned Leave", balanceDays: 18, encashDays: 15, perDayRate: 1467, encashmentAmount: 22000, status: "Approved", fnfCaseId: "fnf-3" },
  { id: "le-4", employeeId: "EMP-1175", employeeName: "Kavya Menon", employeeCode: "EMP-1175", entity: "ACME India Pvt Ltd", department: "Marketing", designation: "Marketing Analyst", leaveType: "Earned Leave", balanceDays: 12, encashDays: 0, perDayRate: 1833, encashmentAmount: 0, status: "Pending", fnfCaseId: "fnf-4" },
  { id: "le-5", employeeId: "EMP-1170", employeeName: "Amit Saxena", employeeCode: "EMP-1170", entity: "ACME India Pvt Ltd", department: "Sales", designation: "Sales Executive", leaveType: "Privileged Leave", balanceDays: 28, encashDays: 28, perDayRate: 1357, encashmentAmount: 38000, status: "Paid", fnfCaseId: "fnf-5" },
  { id: "le-6", employeeId: "EMP-2005", employeeName: "Mohammed Ali", employeeCode: "EMP-2005", entity: "ACME UAE LLC", department: "Sales", designation: "Sales Executive", leaveType: "Earned Leave", balanceDays: 22, encashDays: 22, perDayRate: 682, encashmentAmount: 15000, status: "Pending", fnfCaseId: "fnf-6" },
]

// ---------- EMP options for dialog ----------
const ENCASH_EMP_OPTIONS = FNF_CASES.map(c => ({
  id: c.employeeId,
  name: c.employeeName,
  code: c.employeeCode,
  entity: c.entity,
  dept: c.department,
  desg: c.designation,
  fnfCaseId: c.id,
  basic: Math.round(40000 + (c.tenureYears * 5000) + (c.employeeId.charCodeAt(c.employeeId.length - 1) % 5) * 3000),
}))

const ACCENT_MAP: Record<string, { grad: string; text: string; ring: string }> = {
  rose:    { grad: "from-rose-500/15 to-pink-500/5",     text: "text-rose-600 dark:text-rose-400",     ring: "ring-rose-500/20" },
  amber:   { grad: "from-amber-500/15 to-orange-500/5",  text: "text-amber-600 dark:text-amber-400",   ring: "ring-amber-500/20" },
  emerald: { grad: "from-emerald-500/15 to-teal-500/5",  text: "text-emerald-600 dark:text-emerald-400",ring: "ring-emerald-500/20" },
  teal:    { grad: "from-teal-500/15 to-cyan-500/5",     text: "text-teal-600 dark:text-teal-400",     ring: "ring-teal-500/20" },
  slate:   { grad: "from-slate-500/15 to-slate-500/5",   text: "text-slate-600 dark:text-slate-400",   ring: "ring-slate-500/20" },
  pink:    { grad: "from-pink-500/15 to-rose-500/5",     text: "text-pink-600 dark:text-pink-400",     ring: "ring-pink-500/20" },
  cyan:    { grad: "from-cyan-500/15 to-teal-500/5",     text: "text-cyan-600 dark:text-cyan-400",     ring: "ring-cyan-500/20" },
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

// ============================================================================
export function LeaveEncashmentSection() {
  const [records, setRecords] = useState<LeaveEncashment[]>(LEAVE_ENCASHMENTS)
  const [entityFilter, setEntityFilter] = useState("all")
  const [deptFilter, setDeptFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [calcOpen, setCalcOpen] = useState(false)
  const [form, setForm] = useState({
    empId: "",
    leaveType: "Earned Leave" as "Earned Leave" | "Privileged Leave" | "Comp Off",
    encashDays: "",
    perDayRate: "",
  })

  const entityOptions = useMemo(() => Array.from(new Set(records.map(r => r.entity))), [records])
  const deptOptions = useMemo(() => Array.from(new Set(records.map(r => r.department))), [records])

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (entityFilter !== "all" && r.entity !== entityFilter) return false
      if (deptFilter !== "all" && r.department !== deptFilter) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q) ||
          r.leaveType.toLowerCase().includes(q) ||
          r.fnfCaseId.toLowerCase().includes(q)
      }
      return true
    })
  }, [records, entityFilter, deptFilter, statusFilter, search])

  const stats = useMemo(() => {
    const total = records.length
    const pending = records.filter(r => r.status === "Pending").length
    const approved = records.filter(r => r.status === "Approved" || r.status === "Paid").length
    const totalBalance = records.reduce((s, r) => s + r.balanceDays, 0)
    const totalAmount = records.reduce((s, r) => s + r.encashmentAmount, 0)
    const encashedDays = records.reduce((s, r) => s + r.encashDays, 0)
    const avgDays = records.length === 0 ? 0 : Math.round(encashedDays / records.length * 10) / 10
    return { total, pending, approved, totalBalance, totalAmount, avgDays }
  }, [records])

  const selectedEmp = ENCASH_EMP_OPTIONS.find(e => e.id === form.empId)
  const autoPerDay = selectedEmp ? Math.round(selectedEmp.basic / 26) : 0
  const effectiveRate = Number(form.perDayRate) || autoPerDay
  const calcAmount = (Number(form.encashDays) || 0) * effectiveRate

  const handleCalculate = () => {
    if (!form.empId || !form.encashDays) {
      toast.error("Please select an employee and enter encash days.")
      return
    }
    const days = Number(form.encashDays)
    if (Number.isNaN(days) || days <= 0) {
      toast.error("Encash days must be a positive number.")
      return
    }
    if (!selectedEmp) return
    const newRec: LeaveEncashment = {
      id: `le-${Date.now()}`,
      employeeId: selectedEmp.id,
      employeeName: selectedEmp.name,
      employeeCode: selectedEmp.code,
      entity: selectedEmp.entity,
      department: selectedEmp.dept,
      designation: selectedEmp.desg,
      leaveType: form.leaveType,
      balanceDays: Math.max(days, 20),
      encashDays: days,
      perDayRate: effectiveRate,
      encashmentAmount: calcAmount,
      status: "Pending",
      fnfCaseId: selectedEmp.fnfCaseId,
    }
    setRecords(prev => [newRec, ...prev])
    toast.success("Leave encashment calculated", {
      description: `${selectedEmp.name} · ${days} days × ${formatCurrency(effectiveRate)} = ${formatCurrency(calcAmount)}`,
    })
    setCalcOpen(false)
    setForm({ empId: "", leaveType: "Earned Leave", encashDays: "", perDayRate: "" })
  }

  const handleApprove = (r: LeaveEncashment) => {
    setRecords(prev => prev.map(x => x.id === r.id ? { ...x, status: "Approved" as const } : x))
    toast.success("Leave encashment approved", { description: `${r.employeeName} · ${formatCurrency(r.encashmentAmount)}` })
  }

  const clearFilters = () => { setEntityFilter("all"); setDeptFilter("all"); setStatusFilter("all"); setSearch("") }
  const hasFilters = entityFilter !== "all" || deptFilter !== "all" || statusFilter !== "all" || search

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-soft">
            <Plane className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Leave Encashment</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Calculate &amp; track leave encashments during FnF settlement.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCalcOpen(true)} className="gap-1.5 shrink-0 bg-rose-600 hover:bg-rose-700 text-white">
          <Calculator className="h-4 w-4" /> Calculate Encashment
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
                placeholder="Search by employee, leave type or FnF case…"
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:items-center">
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>Showing {filtered.length} of {records.length} encashments</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>Clear filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Encashments" value={stats.total} icon={Plane} accent="rose" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} accent="amber" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Total Leave Balance" value={`${stats.totalBalance}d`} icon={CalendarDays} accent="cyan" />
        <StatCard label="Encashment Amount" value={formatCurrencyShort(stats.totalAmount)} icon={Coins} accent="pink" />
        <StatCard label="Avg Days Encashed" value={`${stats.avgDays}d`} icon={TrendingUp} accent="teal" />
      </div>

      {/* Table + Formula card */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <Card className="xl:col-span-3 border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-0">
            <ScrollArea className="max-h-[640px] rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 sticky top-0 z-10">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Employee</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity / Dept</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Leave Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Balance</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Encash Days</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Per Day Rate</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Plane className="h-8 w-8 opacity-40" />
                          <p className="text-sm">No leave encashments match your filters.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(r => (
                    <TableRow key={r.id} className="hover:bg-rose-500/5 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white", avatarColor(r.employeeId))}>
                            {initials(r.employeeName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{r.employeeName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{r.employeeCode} · {r.designation}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p className="font-medium text-foreground truncate max-w-[140px]">{r.entity}</p>
                          <p className="text-muted-foreground">{r.department}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-medium">{r.leaveType}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs font-medium text-foreground tabular-nums">{r.balanceDays}d</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs font-medium text-foreground tabular-nums">{r.encashDays}d</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs text-muted-foreground tabular-nums">{formatCurrency(r.perDayRate)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-bold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(r.encashmentAmount)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("font-medium border-0 text-[10px]", STATUS_COLORS[r.status] || "")}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="View" onClick={() => toast.info(`View encashment — ${r.employeeName}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {r.status === "Pending" && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-emerald-500/10 hover:text-emerald-700" title="Approve" onClick={() => handleApprove(r)}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Formula card */}
        <Card className="border border-rose-500/30 rounded-xl shadow-soft bg-gradient-to-br from-rose-500/5 to-pink-500/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                <Calculator className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Encashment Formula</p>
                <p className="text-[11px] text-muted-foreground">Standard calculation rule</p>
              </div>
            </div>
            <Separator className="mb-3" />
            <div className="space-y-3 text-xs">
              <div className="rounded-lg bg-background/60 p-3">
                <p className="font-semibold text-rose-700 dark:text-rose-400 mb-1">Monthly-paid employees</p>
                <p className="text-muted-foreground font-mono text-[11px]">Per Day Rate = (Basic + DA) / 26</p>
                <p className="text-muted-foreground/80 mt-1 text-[11px]">Based on 26 working days per month.</p>
              </div>
              <div className="rounded-lg bg-background/60 p-3">
                <p className="font-semibold text-rose-700 dark:text-rose-400 mb-1">Daily-wage employees</p>
                <p className="text-muted-foreground font-mono text-[11px]">Per Day Rate = (Basic + DA) / 30</p>
                <p className="text-muted-foreground/80 mt-1 text-[11px]">Based on 30 calendar days per month.</p>
              </div>
              <div className="rounded-lg bg-background/60 p-3">
                <p className="font-semibold text-rose-700 dark:text-rose-400 mb-1">Total Encashment</p>
                <p className="text-muted-foreground font-mono text-[11px]">Amount = Per Day Rate × Encash Days</p>
                <p className="text-muted-foreground/80 mt-1 text-[11px]">Only unavailed earned leaves are encashed.</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="font-semibold text-amber-700 dark:text-amber-400 text-[11px] mb-1">Tax Note</p>
                <p className="text-muted-foreground/80 text-[11px]">Leave encashment is fully taxable for non-government employees. Added to gross income.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calculate Encashment dialog */}
      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                <Calculator className="h-4 w-4" />
              </div>
              Calculate Leave Encashment
            </DialogTitle>
            <DialogDescription>Auto-fetch leave balance and compute encashment amount.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-1 space-y-4 pr-3">
              <div className="space-y-2">
                <Label className="text-xs">Employee (auto-fetch leave balance)</Label>
                <Select value={form.empId} onValueChange={v => setForm(f => ({ ...f, empId: v, perDayRate: "" }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select employee…" /></SelectTrigger>
                  <SelectContent>
                    {ENCASH_EMP_OPTIONS.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name} · {e.code} · {e.fnfCaseId}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedEmp && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Entity</p>
                    <p className="font-medium text-foreground truncate">{selectedEmp.entity}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Department</p>
                    <p className="font-medium text-foreground">{selectedEmp.dept}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Basic + DA</p>
                    <p className="font-medium text-foreground tabular-nums">{formatCurrency(selectedEmp.basic)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Leave Balance</p>
                    <p className="font-medium text-foreground">22 EL available</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Leave Type</Label>
                  <Select value={form.leaveType} onValueChange={v => setForm(f => ({ ...f, leaveType: v as typeof form.leaveType }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Earned Leave">Earned Leave</SelectItem>
                      <SelectItem value="Privileged Leave">Privileged Leave</SelectItem>
                      <SelectItem value="Comp Off">Comp Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Encash Days</Label>
                  <Input
                    value={form.encashDays}
                    onChange={e => setForm(f => ({ ...f, encashDays: e.target.value }))}
                    type="number" min={0} max={30}
                    placeholder="e.g. 18"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Per Day Rate (auto = Basic/26)</Label>
                  <Input
                    value={form.perDayRate || (selectedEmp ? String(autoPerDay) : "")}
                    onChange={e => setForm(f => ({ ...f, perDayRate: e.target.value }))}
                    type="number" min={0}
                    placeholder={selectedEmp ? String(autoPerDay) : "Auto"}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-pink-500/5 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Encashment Amount</p>
                  <p className="text-xs text-muted-foreground">{form.encashDays || 0} days × {formatCurrency(effectiveRate)}</p>
                </div>
                <p className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(calcAmount)}</p>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCalcOpen(false)}>Cancel</Button>
            <Button onClick={handleCalculate} className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Save &amp; Calculate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LeaveEncashmentSection
