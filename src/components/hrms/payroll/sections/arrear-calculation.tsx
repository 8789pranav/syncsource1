"use client"

// ============================================================================
//  ArrearCalculationSection — Arrear menu #3 (Arrear Calculation)
//  ----------------------------------------------------------------------------
//  Per-case arrear calculation table with Calculate dialog (per-month
//  component × month grid) and a detail dialog showing the breakdown.
//  Amber/orange accent.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Calculator, Plus, Search, Filter, RefreshCw, Eye, CheckCircle2, XCircle,
  Clock, IndianRupee, Scale, TrendingDown, Layers, Inbox, Building2,
  CalendarDays, Tag, MoreHorizontal, ArrowRight, Repeat, FileSpreadsheet,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
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

import { ARREAR_CASES } from "../data"
import {
  ArrearCase, ArrearType, STATUS_COLORS,
  formatCurrency, formatCurrencyShort, formatDate, initials, avatarColor,
} from "../shared"

// ---------- Constants ----------
const ARREAR_TYPES: ArrearType[] = [
  "Salary Revision", "LOP Reversal", "Attendance Correction", "Bonus",
  "Incentive", "Manual", "Component Change", "Structure Change",
]
const COMPONENTS = ["Basic", "HRA", "Special Allowance", "Conveyance", "Medical", "PF (Employee)", "PF (Employer)", "Gratuity", "TDS"] as const
const PAYOUT_MONTHS = [
  new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
  new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
]

// ---------- Helpers ----------
function monthsBetween(from: string, to: string): number {
  const f = new Date(from), t = new Date(to)
  return Math.max(1, (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth()) + 1)
}
function monthLabel(date: string, offset: number): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + offset)
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
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
        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder={allLabel} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

// ---------- Calculate dialog ----------
interface CalcForm {
  employeeName: string
  employeeCode: string
  entity: string
  department: string
  arrearType: ArrearType
  effectiveFrom: string
  effectiveTo: string
  recoveryAmount: string
  payoutMonth: string
  showSeparately: boolean
  description: string
}

function CalculateArrearDialog({
  open, onOpenChange, onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (form: CalcForm, arrearAmount: number, monthsAffected: number, breakdown: Record<string, number[]>) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<CalcForm>({
    employeeName: "", employeeCode: "", entity: "ACME India Pvt Ltd",
    department: "Engineering", arrearType: "Salary Revision",
    effectiveFrom: today, effectiveTo: today, recoveryAmount: "0",
    payoutMonth: PAYOUT_MONTHS[0], showSeparately: true,
    description: "",
  })
  // per-component per-month values
  const [componentValues, setComponentValues] = useState<Record<string, number[]>>(() => {
    const obj: Record<string, number[]> = {}
    COMPONENTS.forEach(c => { obj[c] = [0] })
    return obj
  })

  const monthsAffected = useMemo(() => {
    if (!form.effectiveFrom || !form.effectiveTo) return 1
    try { return monthsBetween(form.effectiveFrom, form.effectiveTo) } catch { return 1 }
  }, [form.effectiveFrom, form.effectiveTo])

  // resize componentValues array when months change
  React.useEffect(() => {
    setComponentValues(prev => {
      const next: Record<string, number[]> = {}
      COMPONENTS.forEach(c => {
        const cur = prev[c] || []
        const arr = Array.from({ length: monthsAffected }, (_, i) => cur[i] || 0)
        next[c] = arr
      })
      return next
    })
  }, [monthsAffected])

  const arrearAmount = useMemo(() => {
    return Object.values(componentValues).reduce((s, arr) => s + arr.reduce((ss, v) => ss + (Number(v) || 0), 0), 0)
  }, [componentValues])

  const recoveryAmount = Number(form.recoveryAmount) || 0
  const netArrear = arrearAmount - recoveryAmount

  const handleComponentChange = (comp: string, monthIdx: number, val: string) => {
    setComponentValues(prev => {
      const arr = [...(prev[comp] || [])]
      arr[monthIdx] = Number(val) || 0
      return { ...prev, [comp]: arr }
    })
  }

  const handleSubmit = () => {
    if (!form.employeeName.trim() || !form.employeeCode.trim()) {
      toast.error("Please fill employee name and code.")
      return
    }
    if (arrearAmount === 0 && recoveryAmount === 0) {
      toast.error("Arrear amount cannot be zero.")
      return
    }
    onSubmit(form, arrearAmount, monthsAffected, componentValues)
    onOpenChange(false)
    // reset
    setForm({
      employeeName: "", employeeCode: "", entity: "ACME India Pvt Ltd",
      department: "Engineering", arrearType: "Salary Revision",
      effectiveFrom: today, effectiveTo: today, recoveryAmount: "0",
      payoutMonth: PAYOUT_MONTHS[0], showSeparately: true,
      description: "",
    })
    const obj: Record<string, number[]> = {}
    COMPONENTS.forEach(c => { obj[c] = [0] })
    setComponentValues(obj)
  }

  const monthLabels = Array.from({ length: monthsAffected }, (_, i) => monthLabel(form.effectiveFrom, i))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <Calculator className="h-4 w-4" />
            </div>
            Calculate Arrear
          </DialogTitle>
          <DialogDescription>
            Pick employee, arrear type, effective period — then enter per-component × per-month amounts.
            The system auto-totals arrear, recovery, and net payable.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[64vh]">
          <div className="space-y-4 p-1 pr-3">
            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Employee Name *</Label>
                <Input value={form.employeeName} onChange={e => setForm({ ...form, employeeName: e.target.value })} placeholder="e.g. Sneha Reddy" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Employee Code *</Label>
                <Input value={form.employeeCode} onChange={e => setForm({ ...form, employeeCode: e.target.value })} placeholder="e.g. EMP-1004" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Entity</Label>
                <Select value={form.entity} onValueChange={v => setForm({ ...form, entity: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["ACME India Pvt Ltd", "ACME UAE LLC", "ACME US Inc", "ACME Singapore Pte Ltd"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Department</Label>
                <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Engineering", "Product", "Design", "Sales", "Marketing", "Finance", "Human Resources", "Operations"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Arrear Type *</Label>
                <Select value={form.arrearType} onValueChange={v => setForm({ ...form, arrearType: v as ArrearType })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ARREAR_TYPES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payout Month</Label>
                <Select value={form.payoutMonth} onValueChange={v => setForm({ ...form, payoutMonth: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYOUT_MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Effective From *</Label>
                <Input type="date" value={form.effectiveFrom} onChange={e => setForm({ ...form, effectiveFrom: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Effective To * (months affected: <strong className="text-amber-600 dark:text-amber-400">{monthsAffected}</strong>)</Label>
                <Input type="date" value={form.effectiveTo} onChange={e => setForm({ ...form, effectiveTo: e.target.value })} className="h-9" />
              </div>
            </div>

            <Separator />

            {/* Per-component × month grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold uppercase tracking-wide">Per-Month Component Breakdown</Label>
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400">
                  {monthsAffected} month{monthsAffected !== 1 ? "s" : ""} × {COMPONENTS.length} components
                </Badge>
              </div>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide sticky left-0 bg-muted/60">Component</th>
                        {monthLabels.map(m => (
                          <th key={m} className="text-right px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide min-w-[110px]">{m}</th>
                        ))}
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide min-w-[110px] bg-amber-50/40 dark:bg-amber-500/5">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPONENTS.map(c => {
                        const total = (componentValues[c] || []).reduce((s, v) => s + (Number(v) || 0), 0)
                        return (
                          <tr key={c} className="border-t border-border/40 hover:bg-amber-50/30 dark:hover:bg-amber-500/5">
                            <td className="px-3 py-1.5 font-medium text-foreground sticky left-0 bg-card">{c}</td>
                            {(componentValues[c] || []).map((v, i) => (
                              <td key={i} className="px-2 py-1">
                                <Input
                                  type="number"
                                  value={v || ""}
                                  onChange={e => handleComponentChange(c, i, e.target.value)}
                                  placeholder="0"
                                  className="h-8 text-xs text-right tabular-nums"
                                />
                              </td>
                            ))}
                            <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-500/5">
                              {formatCurrency(total)}
                            </td>
                          </tr>
                        )
                      })}
                      <tr className="border-t-2 border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/5">
                        <td className="px-3 py-2 font-bold text-foreground sticky left-0 bg-amber-50/40 dark:bg-amber-500/5">Arrear Total</td>
                        {monthLabels.map((m, i) => {
                          const mt = COMPONENTS.reduce((s, c) => s + ((componentValues[c] || [])[i] || 0), 0)
                          return <td key={m} className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">{formatCurrency(mt)}</td>
                        })}
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-amber-700 dark:text-amber-400">{formatCurrency(arrearAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <Separator />

            {/* Recovery + payout options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Recovery Amount (if negative arrear)</Label>
                <Input
                  type="number"
                  value={form.recoveryAmount}
                  onChange={e => setForm({ ...form, recoveryAmount: e.target.value })}
                  placeholder="0"
                  className="h-9"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div>
                  <Label className="text-xs">Show Separately in Payslip</Label>
                  <p className="text-[11px] text-muted-foreground">Display as a separate line item</p>
                </div>
                <Switch checked={form.showSeparately} onCheckedChange={v => setForm({ ...form, showSeparately: v })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description / Notes</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Explain the reason for this arrear calculation…"
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Totals */}
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-500/10 dark:to-orange-500/5 p-3 border border-amber-500/20">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Arrear Amount</p>
                <p className="text-lg font-semibold text-foreground tabular-nums">{formatCurrency(arrearAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Recovery</p>
                <p className="text-lg font-semibold text-rose-600 dark:text-rose-400 tabular-nums">{formatCurrency(recoveryAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Net Arrear</p>
                <p className={cn("text-lg font-semibold tabular-nums", netArrear < 0 ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-400")}>
                  {formatCurrency(netArrear)}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sticky bottom-0 bg-background pt-3 border-t border-border/60">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
            <Calculator className="h-4 w-4" /> Save Calculation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Detail dialog ----------
function CalculationDetailDialog({
  arrear, open, onOpenChange,
}: {
  arrear: ArrearCase | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!arrear) return null
  const months = Math.max(1, arrear.monthsAffected)
  // synthetic breakdown — distribute arrear across components × months
  const monthLabels = Array.from({ length: months }, (_, i) => monthLabel(arrear.effectiveFrom, i))
  const distribution = [0.5, 0.25, 0.15, 0.04, 0.03, 0.06, 0.06, 0.03, -0.12] // Basic, HRA, SA, Conv, Med, PF-Emp, PF-Emr, Grat, TDS
  const perMonthArrears = Array.from({ length: months }, (_, m) => Math.round(arrear.arrearAmount / months))
  const breakdown = COMPONENTS.map((c, i) => ({
    component: c,
    months: perMonthArrears.map(m => Math.round(m * distribution[i])),
    total: perMonthArrears.reduce((s, m) => s + Math.round(m * distribution[i]), 0),
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            Arrear Calculation Detail
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{arrear.employeeName}</span> ({arrear.employeeCode}) · {arrear.arrearType}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[64vh]">
          <div className="space-y-4 p-1 pr-3">
            {/* meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-border/60 p-3 bg-muted/30">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Entity</p>
                <p className="text-xs font-medium text-foreground truncate">{arrear.entity}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Department</p>
                <p className="text-xs font-medium text-foreground">{arrear.department}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Effective Period</p>
                <p className="text-xs font-medium text-foreground">{formatDate(arrear.effectiveFrom)} → {formatDate(arrear.effectiveTo)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Months Affected</p>
                <p className="text-xs font-medium text-foreground">{arrear.monthsAffected}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Payout Month</p>
                <p className="text-xs font-medium text-foreground">{arrear.payoutMonth}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Show Separately</p>
                <p className="text-xs font-medium text-foreground">{arrear.showSeparately ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reference</p>
                <p className="text-xs font-mono text-foreground">{arrear.referenceId || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</p>
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_COLORS[arrear.status] || "bg-muted text-muted-foreground")}>
                  {arrear.status}
                </span>
              </div>
            </div>

            {/* per-month grid */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide mb-2 block">Per-Month Component Breakdown</Label>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide sticky left-0 bg-muted/60">Component</th>
                        {monthLabels.map(m => (
                          <th key={m} className="text-right px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide min-w-[100px]">{m}</th>
                        ))}
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide min-w-[100px] bg-amber-50/40 dark:bg-amber-500/5">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown.map(row => (
                        <tr key={row.component} className="border-t border-border/40 hover:bg-amber-50/30 dark:hover:bg-amber-500/5">
                          <td className="px-3 py-1.5 font-medium text-foreground sticky left-0 bg-card">{row.component}</td>
                          {row.months.map((v, i) => (
                            <td key={i} className="px-3 py-1.5 text-right tabular-nums text-foreground">{formatCurrency(v)}</td>
                          ))}
                          <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-500/5">{formatCurrency(row.total)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/5">
                        <td className="px-3 py-2 font-bold text-foreground sticky left-0 bg-amber-50/40 dark:bg-amber-500/5">Total / Month</td>
                        {perMonthArrears.map((m, i) => (
                          <td key={i} className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">{formatCurrency(m)}</td>
                        ))}
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-amber-700 dark:text-amber-400">{formatCurrency(arrear.arrearAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Recovery section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-500/10 dark:to-orange-500/5 p-3 border border-amber-500/20">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Arrear Amount</p>
                <p className="text-lg font-semibold text-foreground tabular-nums">{formatCurrency(arrear.arrearAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Recovery</p>
                <p className="text-lg font-semibold text-rose-600 dark:text-rose-400 tabular-nums">{formatCurrency(arrear.recoveryAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Net Arrear</p>
                <p className={cn("text-lg font-semibold tabular-nums", arrear.netArrear < 0 ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-400")}>
                  {formatCurrency(arrear.netArrear)}
                </p>
              </div>
            </div>

            {arrear.description && (
              <div className="rounded-lg border border-border/60 p-3 bg-muted/30">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Description</p>
                <p className="text-xs text-foreground/80">{arrear.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Approved By</p>
                <p className="text-xs font-medium text-foreground">{arrear.approvedBy || "—"}</p>
                <p className="text-[10px] text-muted-foreground">{arrear.approvedAt ? formatDate(arrear.approvedAt) : "—"}</p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Created At</p>
                <p className="text-xs font-medium text-foreground">{formatDate(arrear.createdAt)}</p>
                {arrear.paidAt && <p className="text-[10px] text-muted-foreground">Paid: {formatDate(arrear.paidAt)}</p>}
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sticky bottom-0 bg-background pt-3 border-t border-border/60">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => { toast.success("Recalculation queued"); onOpenChange(false) }} className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
            <Repeat className="h-4 w-4" /> Recalculate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Component ----------
export function ArrearCalculationSection() {
  const [records, setRecords] = useState<ArrearCase[]>(ARREAR_CASES)
  const [entityFilter, setEntityFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [payoutFilter, setPayoutFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [calcOpen, setCalcOpen] = useState(false)
  const [detailArrear, setDetailArrear] = useState<ArrearCase | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // ---------- Options ----------
  const entityOptions = useMemo(() => Array.from(new Set(records.map(r => r.entity))), [records])
  const payoutOptions = useMemo(() => Array.from(new Set(records.map(r => r.payoutMonth))), [records])

  // ---------- Filtered ----------
  const filtered = useMemo(() => {
    return records.filter(r => {
      if (entityFilter !== "all" && r.entity !== entityFilter) return false
      if (typeFilter !== "all" && r.arrearType !== typeFilter) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (payoutFilter !== "all" && r.payoutMonth !== payoutFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hit =
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q) ||
          r.arrearType.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.referenceId || "").toLowerCase().includes(q)
        if (!hit) return false
      }
      return true
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [records, entityFilter, typeFilter, statusFilter, payoutFilter, search])

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const total = records.length
    const pending = records.filter(r => r.status === "Pending Approval" || r.status === "Draft").length
    const approved = records.filter(r => r.status === "Approved" || r.status === "Paid").length
    const totalArrear = records.reduce((s, r) => s + r.arrearAmount, 0)
    const totalRecovery = records.reduce((s, r) => s + r.recoveryAmount, 0)
    const netPayable = totalArrear - totalRecovery
    return { total, pending, approved, totalArrear, totalRecovery, netPayable }
  }, [records])

  // ---------- Actions ----------
  const handleCalcSubmit = (form: CalcForm, arrearAmount: number, monthsAffected: number, _breakdown: Record<string, number[]>) => {
    const newRec: ArrearCase = {
      id: `ar-${Date.now()}`,
      employeeId: form.employeeCode,
      employeeName: form.employeeName,
      employeeCode: form.employeeCode,
      entity: form.entity,
      department: form.department,
      arrearType: form.arrearType,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo,
      monthsAffected,
      arrearAmount,
      recoveryAmount: Number(form.recoveryAmount) || 0,
      netArrear: arrearAmount - (Number(form.recoveryAmount) || 0),
      description: form.description,
      referenceId: undefined,
      status: "Pending Approval",
      payoutMonth: form.payoutMonth,
      showSeparately: form.showSeparately,
      createdAt: new Date().toISOString(),
    }
    setRecords(prev => [newRec, ...prev])
    toast.success("Arrear calculation saved", {
      description: `${form.employeeName} · ${form.arrearType} · ${formatCurrency(newRec.netArrear)} over ${monthsAffected} month(s)`,
    })
  }

  const handleApprove = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "Approved", approvedBy: "You", approvedAt: new Date().toISOString() } : r))
    toast.success("Arrear approved")
  }
  const handleCancel = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "Cancelled" } : r))
    toast.info("Arrear cancelled")
  }
  const handleRecalc = (id: string) => {
    toast.info(`Recalculation queued for ${records.find(r => r.id === id)?.employeeName}`)
  }

  const openDetail = (a: ArrearCase) => {
    setDetailArrear(a)
    setDetailOpen(true)
  }

  const handleClearFilters = () => {
    setEntityFilter("all"); setTypeFilter("all"); setStatusFilter("all"); setPayoutFilter("all"); setSearch("")
  }
  const handleRefresh = () => toast.success("Calculations refreshed")

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-soft">
            <Calculator className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">
              Arrear Calculation
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Per-case arrear computation with month-wise component breakdown, recovery handling,
              and payout scheduling.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={handleRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCalcOpen(true)} className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600">
            <Plus className="h-3.5 w-3.5" /> Calculate Arrear
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Calculations" value={stats.total} icon={Layers} accent="amber" sub="All cases" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} accent="amber" sub="Awaiting approval" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} accent="emerald" sub="Approved/Paid" />
        <StatCard label="Total Arrear" value={formatCurrencyShort(stats.totalArrear)} icon={IndianRupee} accent="amber" sub="Gross" />
        <StatCard label="Total Recovery" value={formatCurrencyShort(stats.totalRecovery)} icon={TrendingDown} accent="rose" sub="Negative arrear" />
        <StatCard label="Net Payable" value={formatCurrencyShort(stats.netPayable)} icon={Scale} accent="emerald" sub="After recovery" />
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <FilterSelect label="Entity" icon={Building2} value={entityFilter} onChange={setEntityFilter} options={entityOptions} allLabel="All entities" />
            <FilterSelect label="Arrear Type" icon={Tag} value={typeFilter} onChange={setTypeFilter} options={ARREAR_TYPES} allLabel="All types" />
            <FilterSelect label="Status" icon={CheckCircle2} value={statusFilter} onChange={setStatusFilter} options={["Draft", "Pending Approval", "Approved", "Rejected", "Paid", "Cancelled"]} allLabel="All statuses" />
            <FilterSelect label="Payout Month" icon={CalendarDays} value={payoutFilter} onChange={setPayoutFilter} options={payoutOptions} allLabel="All months" />
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

      {/* Calculations table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Arrear Calculations</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} record(s)</p>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400">
              Click row to view breakdown
            </Badge>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground mb-3">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No arrear calculations found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">Adjust filters or create a new calculation.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[640px] w-full">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
                  <TableRow className="hover:bg-muted/60">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide min-w-[200px]">Employee</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Entity / Dept</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Arrear Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Effective Period</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-center">Months</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Arrear</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Recovery</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Net</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Payout</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-center">Sep.</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a: ArrearCase) => (
                    <TableRow
                      key={a.id}
                      className="cursor-pointer hover:bg-amber-50/40 dark:hover:bg-amber-500/5"
                      onClick={() => openDetail(a)}
                    >
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
                        <Badge variant="outline" className="text-[11px] border-amber-500/30 text-amber-700 dark:text-amber-400">
                          {a.arrearType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(a.effectiveFrom)} → {formatDate(a.effectiveTo)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold tabular-nums">
                          {a.monthsAffected}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums text-foreground">{formatCurrency(a.arrearAmount)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-rose-600 dark:text-rose-400">{a.recoveryAmount > 0 ? formatCurrency(a.recoveryAmount) : "—"}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn("text-sm font-semibold tabular-nums", a.netArrear < 0 ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-400")}>
                          {formatCurrency(a.netArrear)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{a.payoutMonth}</TableCell>
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
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-[11px]">Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openDetail(a)}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> View Breakdown
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRecalc(a.id)}>
                              <Repeat className="h-3.5 w-3.5 mr-2" /> Recalculate
                            </DropdownMenuItem>
                            {(a.status === "Pending Approval" || a.status === "Draft") && (
                              <DropdownMenuItem onClick={() => handleApprove(a.id)}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Approve
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => toast.info(`Linked arrear ${a.referenceId || "—"}`)}>
                              <ArrowRight className="h-3.5 w-3.5 mr-2" /> View Source
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600 dark:text-rose-400" onClick={() => handleCancel(a.id)}>
                              <XCircle className="h-3.5 w-3.5 mr-2" /> Cancel
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

      <CalculateArrearDialog open={calcOpen} onOpenChange={setCalcOpen} onSubmit={handleCalcSubmit} />
      <CalculationDetailDialog arrear={detailArrear} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  )
}

export default ArrearCalculationSection
