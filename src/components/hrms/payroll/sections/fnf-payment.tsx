"use client"

// ============================================================================
//  FnF Payment — process & track FnF settlement payouts
//  Rose/pink accents. Filter, stats, table, batch-pay dialog.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Wallet, Search, Filter, Download, Mail, CheckCircle2, Clock, Coins,
  Play, Building2, CreditCard, TrendingUp,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
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
import type { FnFCase } from "../shared"
import {
  initials, avatarColor, formatDate, formatDateTime, formatCurrency,
  formatCurrencyShort, STATUS_COLORS,
} from "../shared"

const PAYMENT_MODES = ["Bank Transfer", "NEFT", "RTGS", "Cheque", "Cash", "WPS"]

interface PaymentRow extends FnFCase {
  paymentMode: string
  utrNumber: string
  paidAt?: string
  paidThisMonth: boolean
}

// Build payment rows from FNF_CASES where status is Approved or Paid
function buildPaymentRows(): PaymentRow[] {
  return FNF_CASES
    .filter(c => c.status === "Approved" || c.status === "Paid")
    .map(c => {
      const paidThisMonth = c.paidAt ? isThisMonth(c.paidAt) : false
      return {
        ...c,
        paymentMode: c.paymentMode || (c.entity.includes("UAE") ? "WPS" : "Bank Transfer"),
        utrNumber: c.utrNumber || "",
        paidAt: c.paidAt,
        paidThisMonth,
      }
    })
}

function isThisMonth(d?: string | Date | null): boolean {
  if (!d) return false
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return false
  const now = new Date()
  return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
}

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
export function FnFPaymentSection() {
  const [rows, setRows] = useState<PaymentRow[]>(() => buildPaymentRows())
  const [entityFilter, setEntityFilter] = useState("all")
  const [modeFilter, setModeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [processOpen, setProcessOpen] = useState(false)
  const [processLoading, setProcessLoading] = useState(false)

  const entityOptions = useMemo(() => Array.from(new Set(rows.map(r => r.entity))), [rows])

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (entityFilter !== "all" && r.entity !== entityFilter) return false
      if (modeFilter !== "all" && r.paymentMode !== modeFilter) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.utrNumber.toLowerCase().includes(q)
      }
      return true
    })
  }, [rows, entityFilter, modeFilter, statusFilter, search])

  const stats = useMemo(() => {
    const total = rows.length
    const pending = rows.filter(r => r.status === "Approved").length
    const paid = rows.filter(r => r.status === "Paid").length
    const totalAmount = rows.reduce((s, r) => s + r.netPayable, 0)
    const paidThisMonthAmt = rows.filter(r => r.paidThisMonth).reduce((s, r) => s + r.netPayable, 0)
    return { total, pending, paid, totalAmount, paidThisMonthAmt }
  }, [rows])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(r => r.id)))
  }

  const handleMarkPaid = (r: PaymentRow) => {
    const utr = "UTR" + Math.floor(Math.random() * 9000000 + 1000000)
    const now = new Date().toISOString()
    setRows(prev => prev.map(x => x.id === r.id ? {
      ...x,
      status: "Paid" as const,
      paidAt: now,
      utrNumber: utr,
      paidThisMonth: true,
    } : x))
    toast.success("Payment marked as paid", {
      description: `${r.employeeName} · UTR ${utr} · ${formatCurrency(r.netPayable)}`,
    })
  }

  const handleDownloadVoucher = (r: PaymentRow) => {
    toast.success("Voucher downloaded", { description: `${r.employeeName} · ${formatCurrency(r.netPayable)}` })
  }

  const handleEmail = (r: PaymentRow) => {
    toast.success("Payment advice emailed", { description: `${r.employeeName} · ${r.employeeCode}@acme.com` })
  }

  const handleProcessBatch = () => {
    if (selected.size === 0) {
      toast.error("Select at least one case to process.")
      return
    }
    setProcessLoading(true)
    setTimeout(() => {
      const now = new Date().toISOString()
      setRows(prev => prev.map(x => {
        if (!selected.has(x.id)) return x
        return {
          ...x,
          status: "Paid" as const,
          paidAt: now,
          utrNumber: "UTR" + Math.floor(Math.random() * 9000000 + 1000000),
          paidThisMonth: true,
        }
      }))
      const totalAmt = rows.filter(r => selected.has(r.id)).reduce((s, r) => s + r.netPayable, 0)
      toast.success("Batch payment processed", {
        description: `${selected.size} cases paid · total ${formatCurrency(totalAmt)}`,
      })
      setSelected(new Set())
      setProcessLoading(false)
      setProcessOpen(false)
    }, 1500)
  }

  const clearFilters = () => { setEntityFilter("all"); setModeFilter("all"); setStatusFilter("all"); setSearch("") }
  const hasFilters = entityFilter !== "all" || modeFilter !== "all" || statusFilter !== "all" || search

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-soft">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">FnF Payment</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Process &amp; track FnF settlement payouts — single &amp; batch.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          disabled={selected.size === 0}
          onClick={() => setProcessOpen(true)}
          className="gap-1.5 shrink-0 bg-rose-600 hover:bg-rose-700 text-white"
        >
          <Play className="h-4 w-4" /> Process Payments ({selected.size})
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
                placeholder="Search by employee, case or UTR…"
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
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[160px]"><SelectValue placeholder="Payment Mode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  {PAYMENT_MODES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Approved">Approved (Pending Pay)</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>Showing {filtered.length} of {rows.length} payments</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>Clear filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Payments" value={stats.total} icon={Wallet} accent="rose" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} accent="amber" />
        <StatCard label="Paid" value={stats.paid} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Total Amount" value={formatCurrencyShort(stats.totalAmount)} icon={Coins} accent="pink" />
        <StatCard label="Paid This Month" value={formatCurrencyShort(stats.paidThisMonthAmt)} icon={TrendingUp} accent="teal" />
      </div>

      {/* Payments table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={filtered.length > 0 && selected.size === filtered.length}
                onCheckedChange={toggleSelectAll}
              />
              <span>{selected.size} of {filtered.length} selected</span>
            </div>
            {selected.size > 0 && (
              <Button size="sm" variant="outline" onClick={() => setProcessOpen(true)} className="gap-1.5">
                <Play className="h-3.5 w-3.5" /> Process Selected
              </Button>
            )}
          </div>
          <ScrollArea className="max-h-[640px] rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 sticky top-0 z-10">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Employee</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">FnF Case</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Net Payable</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mode</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">UTR</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paid At</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Wallet className="h-8 w-8 opacity-40" />
                        <p className="text-sm">No payments match your filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id} className="hover:bg-rose-500/5 transition-colors">
                    <TableCell>
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={() => toggleSelect(r.id)}
                        disabled={r.status === "Paid"}
                      />
                    </TableCell>
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
                    <TableCell><span className="text-xs text-muted-foreground">{r.entity}</span></TableCell>
                    <TableCell><span className="text-xs font-medium text-foreground">{r.id}</span></TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-bold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(r.netPayable)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-medium gap-1">
                        <CreditCard className="h-3 w-3" />
                        {r.paymentMode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground">{r.utrNumber || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{formatDate(r.paidAt)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-medium border-0 text-[10px]", STATUS_COLORS[r.status] || "")}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.status === "Approved" && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-emerald-500/10 hover:text-emerald-700" title="Mark Paid" onClick={() => handleMarkPaid(r)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {r.status === "Paid" && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Download Voucher" onClick={() => handleDownloadVoucher(r)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Email Advice" onClick={() => handleEmail(r)}>
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                          </>
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

      {/* Process payments dialog */}
      <Dialog open={processOpen} onOpenChange={setProcessOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                <Play className="h-4 w-4" />
              </div>
              Process FnF Payments
            </DialogTitle>
            <DialogDescription>Batch-pay {selected.size} approved FnF cases.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <div className="p-1 space-y-3 pr-3">
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                <p className="text-xs text-muted-foreground mb-2">Cases to Pay ({selected.size})</p>
                <div className="space-y-1.5">
                  {rows.filter(r => selected.has(r.id)).map(r => (
                    <div key={r.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md bg-background/60">
                      <div className="flex items-center gap-2">
                        <div className={cn("grid h-6 w-6 place-items-center rounded-full text-[9px] font-semibold text-white", avatarColor(r.employeeId))}>
                          {initials(r.employeeName)}
                        </div>
                        <span className="font-medium text-foreground">{r.employeeName}</span>
                        <span className="text-muted-foreground">· {r.id}</span>
                      </div>
                      <span className="font-semibold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(r.netPayable)}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Total Batch Amount</span>
                  <span className="font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                    {formatCurrency(rows.filter(r => selected.has(r.id)).reduce((s, r) => s + r.netPayable, 0))}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Bank Account</Label>
                  <Select defaultValue="acc-1">
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acc-1">HDFC Salary — 5010012345678</SelectItem>
                      <SelectItem value="acc-2">ICICI Salary — 6201009876543</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Payment Mode</Label>
                  <Select defaultValue="Bank Transfer">
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setProcessOpen(false)}>Cancel</Button>
            <Button onClick={handleProcessBatch} disabled={processLoading} className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
              {processLoading ? <Clock className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {processLoading ? "Processing…" : `Process ${selected.size} Payments`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FnFPaymentSection
