"use client"

// ============================================================================
//  Notice Recovery — calculate notice period shortfall recovery during FnF
//  Rose/pink accents. Filter, stats, table, calculate dialog, rules card.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  AlertCircle, Search, Filter, Calculator, Eye, CheckCircle2, Clock, Coins,
  TrendingDown, CalendarDays, Building2, Info,
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
import { initials, avatarColor, formatCurrency, formatCurrencyShort, STATUS_COLORS } from "../shared"

interface NoticeRecovery {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  department: string
  designation: string
  noticePeriodDays: number
  servedDays: number
  shortfallDays: number
  perDayRate: number
  recoveryAmount: number
  status: "Pending" | "Approved" | "Recovered" | "Waived"
  fnfCaseId: string
}

const NOTICE_RECOVERIES: NoticeRecovery[] = [
  { id: "nr-1", employeeId: "EMP-1190", employeeName: "Pooja Iyer", employeeCode: "EMP-1190", entity: "ACME India Pvt Ltd", department: "Customer Success", designation: "CS Executive", noticePeriodDays: 60, servedDays: 30, shortfallDays: 30, perDayRate: 1600, recoveryAmount: 48000, status: "Approved", fnfCaseId: "fnf-1" },
  { id: "nr-2", employeeId: "EMP-1185", employeeName: "Rahul Verma", employeeCode: "EMP-1185", entity: "ACME India Pvt Ltd", department: "Engineering", designation: "Software Engineer", noticePeriodDays: 90, servedDays: 90, shortfallDays: 0, perDayRate: 2500, recoveryAmount: 0, status: "Waived", fnfCaseId: "fnf-2" },
  { id: "nr-3", employeeId: "EMP-1180", employeeName: "Suresh Babu", employeeCode: "EMP-1180", entity: "ACME India Pvt Ltd", department: "Operations", designation: "Operations Analyst", noticePeriodDays: 30, servedDays: 30, shortfallDays: 0, perDayRate: 1833, recoveryAmount: 0, status: "Waived", fnfCaseId: "fnf-3" },
  { id: "nr-4", employeeId: "EMP-1170", employeeName: "Amit Saxena", employeeCode: "EMP-1170", entity: "ACME India Pvt Ltd", department: "Sales", designation: "Sales Executive", noticePeriodDays: 60, servedDays: 20, shortfallDays: 40, perDayRate: 1625, recoveryAmount: 65000, status: "Recovered", fnfCaseId: "fnf-5" },
  { id: "nr-5", employeeId: "EMP-2005", employeeName: "Mohammed Ali", employeeCode: "EMP-2005", entity: "ACME UAE LLC", department: "Sales", designation: "Sales Executive", noticePeriodDays: 30, servedDays: 30, shortfallDays: 0, perDayRate: 833, recoveryAmount: 0, status: "Waived", fnfCaseId: "fnf-6" },
]

// employee options (subset) for dialog
const NR_EMP_OPTIONS = FNF_CASES.map(c => ({
  id: c.employeeId,
  name: c.employeeName,
  code: c.employeeCode,
  entity: c.entity,
  dept: c.department,
  desg: c.designation,
  fnfCaseId: c.id,
  basic: Math.round(40000 + (c.tenureYears * 5000) + (c.employeeId.charCodeAt(c.employeeId.length - 1) % 5) * 3000),
  country: c.entity.includes("UAE") ? "UAE" : "India",
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
export function NoticeRecoverySection() {
  const [records, setRecords] = useState<NoticeRecovery[]>(NOTICE_RECOVERIES)
  const [entityFilter, setEntityFilter] = useState("all")
  const [deptFilter, setDeptFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [calcOpen, setCalcOpen] = useState(false)
  const [form, setForm] = useState({
    empId: "",
    noticeRequired: "",
    noticeServed: "",
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
          r.fnfCaseId.toLowerCase().includes(q)
      }
      return true
    })
  }, [records, entityFilter, deptFilter, statusFilter, search])

  const stats = useMemo(() => {
    const total = records.length
    const pending = records.filter(r => r.status === "Pending").length
    const approved = records.filter(r => r.status === "Approved" || r.status === "Recovered").length
    const totalShort = records.reduce((s, r) => s + r.shortfallDays, 0)
    const totalAmount = records.reduce((s, r) => s + r.recoveryAmount, 0)
    const recoveredRecords = records.filter(r => r.recoveryAmount > 0)
    const avgRecovery = recoveredRecords.length === 0 ? 0 : Math.round(totalAmount / recoveredRecords.length)
    return { total, pending, approved, totalShort, totalAmount, avgRecovery }
  }, [records])

  const selectedEmp = NR_EMP_OPTIONS.find(e => e.id === form.empId)
  const noticeReq = Number(form.noticeRequired) || (selectedEmp?.country === "UAE" ? 30 : 60)
  const noticeServed = Number(form.noticeServed) || 0
  const shortfall = Math.max(0, noticeReq - noticeServed)
  const autoRate = selectedEmp ? Math.round(selectedEmp.basic / 30) : 0
  const effectiveRate = Number(form.perDayRate) || autoRate
  const recoveryAmount = shortfall * effectiveRate

  const handleCalculate = () => {
    if (!form.empId || !form.noticeRequired || !form.noticeServed) {
      toast.error("Please fill in all fields.")
      return
    }
    if (!selectedEmp) return
    const newRec: NoticeRecovery = {
      id: `nr-${Date.now()}`,
      employeeId: selectedEmp.id,
      employeeName: selectedEmp.name,
      employeeCode: selectedEmp.code,
      entity: selectedEmp.entity,
      department: selectedEmp.dept,
      designation: selectedEmp.desg,
      noticePeriodDays: noticeReq,
      servedDays: noticeServed,
      shortfallDays: shortfall,
      perDayRate: effectiveRate,
      recoveryAmount,
      status: "Pending",
      fnfCaseId: selectedEmp.fnfCaseId,
    }
    setRecords(prev => [newRec, ...prev])
    toast.success("Notice recovery calculated", {
      description: `${selectedEmp.name} · shortfall ${shortfall}d × ${formatCurrency(effectiveRate)} = ${formatCurrency(recoveryAmount)}`,
    })
    setCalcOpen(false)
    setForm({ empId: "", noticeRequired: "", noticeServed: "", perDayRate: "" })
  }

  const handleApprove = (r: NoticeRecovery) => {
    setRecords(prev => prev.map(x => x.id === r.id ? { ...x, status: "Approved" as const } : x))
    toast.success("Notice recovery approved", { description: `${r.employeeName} · ${formatCurrency(r.recoveryAmount)}` })
  }

  const clearFilters = () => { setEntityFilter("all"); setDeptFilter("all"); setStatusFilter("all"); setSearch("") }
  const hasFilters = entityFilter !== "all" || deptFilter !== "all" || statusFilter !== "all" || search

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-soft">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Notice Recovery</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Calculate &amp; track notice period shortfall recovery during FnF.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCalcOpen(true)} className="gap-1.5 shrink-0 bg-rose-600 hover:bg-rose-700 text-white">
          <Calculator className="h-4 w-4" /> Calculate Recovery
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
                placeholder="Search by employee or FnF case…"
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
                  <SelectItem value="Recovered">Recovered</SelectItem>
                  <SelectItem value="Waived">Waived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>Showing {filtered.length} of {records.length} recoveries</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>Clear filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Recoveries" value={stats.total} icon={AlertCircle} accent="rose" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} accent="amber" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Notice Days Short" value={`${stats.totalShort}d`} icon={CalendarDays} accent="pink" />
        <StatCard label="Recovery Amount" value={formatCurrencyShort(stats.totalAmount)} icon={Coins} accent="rose" />
        <StatCard label="Avg Recovery" value={formatCurrencyShort(stats.avgRecovery)} icon={TrendingDown} accent="slate" />
      </div>

      {/* Table + Rules card */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <Card className="xl:col-span-3 border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-0">
            <ScrollArea className="max-h-[640px] rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 sticky top-0 z-10">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Employee</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity / Dept</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Notice Period</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Served</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Shortfall</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Per Day Rate</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Recovery Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <AlertCircle className="h-8 w-8 opacity-40" />
                          <p className="text-sm">No notice recoveries match your filters.</p>
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
                      <TableCell className="text-right">
                        <span className="text-xs text-foreground tabular-nums">{r.noticePeriodDays}d</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 tabular-nums font-medium">{r.servedDays}d</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn("text-xs font-bold tabular-nums", r.shortfallDays > 0 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground")}>
                          {r.shortfallDays}d
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs text-muted-foreground tabular-nums">{formatCurrency(r.perDayRate)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn("text-sm font-bold tabular-nums", r.recoveryAmount > 0 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground")}>
                          {formatCurrency(r.recoveryAmount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("font-medium border-0 text-[10px]", STATUS_COLORS[r.status] || "")}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="View" onClick={() => toast.info(`View notice recovery — ${r.employeeName}`)}>
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

        {/* Notice period rules card */}
        <Card className="border border-rose-500/30 rounded-xl shadow-soft bg-gradient-to-br from-rose-500/5 to-pink-500/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Notice Period Rules</p>
                <p className="text-[11px] text-muted-foreground">By country &amp; grade</p>
              </div>
            </div>
            <Separator className="mb-3" />
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-semibold text-rose-700 dark:text-rose-400 mb-1.5">India (by grade)</p>
                <div className="space-y-1">
                  <div className="rounded bg-background/60 p-2 flex items-center justify-between">
                    <span className="text-foreground">G1–G4 (Junior)</span>
                    <Badge variant="outline" className="text-[10px]">30 days</Badge>
                  </div>
                  <div className="rounded bg-background/60 p-2 flex items-center justify-between">
                    <span className="text-foreground">G5–G8 (Mid)</span>
                    <Badge variant="outline" className="text-[10px]">60 days</Badge>
                  </div>
                  <div className="rounded bg-background/60 p-2 flex items-center justify-between">
                    <span className="text-foreground">M1–M3 (Manager)</span>
                    <Badge variant="outline" className="text-[10px]">90 days</Badge>
                  </div>
                  <div className="rounded bg-background/60 p-2 flex items-center justify-between">
                    <span className="text-foreground">E1–E2 (Executive)</span>
                    <Badge variant="outline" className="text-[10px]">90 days</Badge>
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <p className="font-semibold text-rose-700 dark:text-rose-400 mb-1.5">UAE (by tenure)</p>
                <div className="space-y-1">
                  <div className="rounded bg-background/60 p-2 flex items-center justify-between">
                    <span className="text-foreground">&lt; 6 months</span>
                    <Badge variant="outline" className="text-[10px]">14 days</Badge>
                  </div>
                  <div className="rounded bg-background/60 p-2 flex items-center justify-between">
                    <span className="text-foreground">6 months – 5 yrs</span>
                    <Badge variant="outline" className="text-[10px]">30 days</Badge>
                  </div>
                  <div className="rounded bg-background/60 p-2 flex items-center justify-between">
                    <span className="text-foreground">&gt; 5 yrs</span>
                    <Badge variant="outline" className="text-[10px]">90 days</Badge>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="font-semibold text-amber-700 dark:text-amber-400 text-[11px] mb-1">Recovery Formula</p>
                <p className="text-muted-foreground/80 text-[11px] font-mono">Recovery = (Notice Req − Served) × (Basic / 30)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calculate dialog */}
      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                <Calculator className="h-4 w-4" />
              </div>
              Calculate Notice Recovery
            </DialogTitle>
            <DialogDescription>Auto-calc shortfall &amp; recovery amount from notice served.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-1 space-y-4 pr-3">
              <div className="space-y-2">
                <Label className="text-xs">Employee</Label>
                <Select value={form.empId} onValueChange={v => setForm(f => ({ ...f, empId: v, perDayRate: "" }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select employee…" /></SelectTrigger>
                  <SelectContent>
                    {NR_EMP_OPTIONS.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name} · {e.code} · {e.fnfCaseId}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedEmp && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div><p className="text-muted-foreground">Entity</p><p className="font-medium text-foreground truncate">{selectedEmp.entity}</p></div>
                  <div><p className="text-muted-foreground">Country</p><p className="font-medium text-foreground">{selectedEmp.country}</p></div>
                  <div><p className="text-muted-foreground">Basic</p><p className="font-medium text-foreground tabular-nums">{formatCurrency(selectedEmp.basic)}</p></div>
                  <div><p className="text-muted-foreground">Auto Rate</p><p className="font-medium text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(autoRate)}/day</p></div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Notice Required (days)</Label>
                  <Input
                    value={form.noticeRequired || (selectedEmp ? String(noticeReq) : "")}
                    onChange={e => setForm(f => ({ ...f, noticeRequired: e.target.value }))}
                    type="number" min={0}
                    placeholder="e.g. 60"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Notice Served (days)</Label>
                  <Input
                    value={form.noticeServed}
                    onChange={e => setForm(f => ({ ...f, noticeServed: e.target.value }))}
                    type="number" min={0}
                    placeholder="e.g. 30"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Per Day Rate (auto = Basic/30)</Label>
                  <Input
                    value={form.perDayRate || (selectedEmp ? String(autoRate) : "")}
                    onChange={e => setForm(f => ({ ...f, perDayRate: e.target.value }))}
                    type="number" min={0}
                    placeholder={selectedEmp ? String(autoRate) : "Auto"}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Shortfall</p>
                  <p className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">{shortfall}d</p>
                  <p className="text-[10px] text-muted-foreground">{noticeReq}d − {noticeServed}d</p>
                </div>
                <div className="rounded-xl border border-rose-500/40 bg-gradient-to-br from-rose-500/20 to-pink-500/10 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Recovery Amount</p>
                  <p className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(recoveryAmount)}</p>
                  <p className="text-[10px] text-muted-foreground">{shortfall}d × {formatCurrency(effectiveRate)}</p>
                </div>
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

export default NoticeRecoverySection
