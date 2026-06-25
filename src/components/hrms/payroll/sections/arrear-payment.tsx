"use client"

// ============================================================================
//  ArrearPaymentSection — Arrear menu #8 (Arrear Payment)
//  ----------------------------------------------------------------------------
//  Payment pipeline for approved & paid arrears. Filter + stats + payment
//  table + Process Payments dialog (batch pay via bank file). Mark Paid /
//  Download Voucher / View actions. Amber/orange accent.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Wallet, Search, Filter, RefreshCw, Eye, CheckCircle2,
  Clock, IndianRupee, Layers, Inbox, Building2, CalendarDays,
  MoreHorizontal, Download, Banknote, FileSpreadsheet, Landmark,
  CheckCheck, Receipt, ListChecks,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
  ArrearCase, STATUS_COLORS,
  formatCurrency, formatCurrencyShort, formatDateTime, formatDate, initials, avatarColor,
} from "../shared"

// ---------- Constants ----------
const PAYMENT_MODES = ["Bank Transfer (NEFT)", "Bank Transfer (RTGS)", "IMPS", "Cheque", "WPS", "ACH", "GIRO"]
const BANK_FILE_FORMATS = ["HDFC Format", "ICICI Format", "SBI Format", "Axis Format", "Custom CSV", "UAE WPS / SIF", "RTGS / NEFT"]

// Synthetic payment metadata keyed by arrear id
function genUtr(id: string): string {
  return "UTR" + (parseInt(id.replace(/\D/g, "") || "0", 10) + 9000000)
}

// ---------- Stat card ----------
function StatCard({
  label, value, icon: Icon, sub, accent = "amber",
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  sub?: string
  accent?: "amber" | "emerald" | "teal" | "rose"
}) {
  const accents: Record<string, string> = {
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    teal: "from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-400 ring-teal-500/20",
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

// ---------- Process Payments dialog ----------
function ProcessPaymentsDialog({
  open, onOpenChange, selected, onProcess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  selected: ArrearCase[]
  onProcess: (fileFormat: string, paymentMode: string) => void
}) {
  const [fileFormat, setFileFormat] = useState("HDFC Format")
  const [paymentMode, setPaymentMode] = useState("Bank Transfer (NEFT)")
  const totalAmount = selected.reduce((s, a) => s + a.netArrear, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <Banknote className="h-4 w-4" />
            </div>
            Process Arrear Payments
          </DialogTitle>
          <DialogDescription>
            Batch-pay {selected.length} approved arrear(s) via bank file. Total: {formatCurrency(totalAmount)}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-4 p-1 pr-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Bank File Format *</Label>
                <Select value={fileFormat} onValueChange={setFileFormat}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BANK_FILE_FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Mode *</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide mb-2 block">Selected Arrears ({selected.length})</Label>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow>
                      <TableHead className="text-xs">Employee</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Payout</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-xs text-center text-muted-foreground py-6">
                          No arrears selected.
                        </TableCell>
                      </TableRow>
                    ) : selected.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className={cn("text-[9px] text-white font-semibold", avatarColor(a.employeeId))}>
                                {initials(a.employeeName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-medium">{a.employeeName}</p>
                              <p className="text-[10px] text-muted-foreground">{a.employeeCode}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{a.arrearType}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.payoutMonth}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-semibold">{formatCurrency(a.netArrear)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-lg bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-500/10 dark:to-orange-500/5 p-3 border border-amber-500/20">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Records</p>
                <p className="text-lg font-semibold text-foreground tabular-nums">{selected.length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Amount</p>
                <p className="text-lg font-semibold text-amber-700 dark:text-amber-400 tabular-nums">{formatCurrency(totalAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">File Format</p>
                <p className="text-xs font-medium text-foreground truncate pt-1">{fileFormat}</p>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sticky bottom-0 bg-background pt-3 border-t border-border/60">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
            onClick={() => { onProcess(fileFormat, paymentMode); onOpenChange(false) }}
            disabled={selected.length === 0}
          >
            <Banknote className="h-4 w-4" /> Generate Bank File & Pay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Component ----------
export function ArrearPaymentSection() {
  const [records, setRecords] = useState<ArrearCase[]>(
    ARREAR_CASES.filter(a => a.status === "Approved" || a.status === "Paid"),
  )
  const [entityFilter, setEntityFilter] = useState("all")
  const [payoutFilter, setPayoutFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [processOpen, setProcessOpen] = useState(false)

  // ---------- Options ----------
  const entityOptions = useMemo(() => Array.from(new Set(records.map(r => r.entity))), [records])
  const payoutOptions = useMemo(() => Array.from(new Set(records.map(r => r.payoutMonth))), [records])

  // ---------- Filtered ----------
  const filtered = useMemo(() => {
    return records.filter(r => {
      if (entityFilter !== "all" && r.entity !== entityFilter) return false
      if (payoutFilter !== "all" && r.payoutMonth !== payoutFilter) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hit =
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q) ||
          r.arrearType.toLowerCase().includes(q) ||
          (r.referenceId || "").toLowerCase().includes(q)
        if (!hit) return false
      }
      return true
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [records, entityFilter, payoutFilter, statusFilter, search])

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const total = records.length
    const pending = records.filter(r => r.status === "Approved").length
    const paid = records.filter(r => r.status === "Paid").length
    const totalAmount = records.reduce((s, r) => s + r.netArrear, 0)
    const currentMonth = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    const paidThisMonth = records.filter(r => r.status === "Paid" && r.payoutMonth === currentMonth).reduce((s, r) => s + r.netArrear, 0)
    return { total, pending, paid, totalAmount, paidThisMonth }
  }, [records])

  // ---------- Actions ----------
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    const eligible = filtered.filter(f => f.status === "Approved")
    if (eligible.length > 0 && selected.size === eligible.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(eligible.map(f => f.id)))
    }
  }

  const handleMarkPaid = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "Paid", paidAt: new Date().toISOString() } : r))
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    toast.success("Arrear marked as paid")
  }
  const handleDownloadVoucher = (a: ArrearCase) => {
    toast.success("Voucher downloaded", { description: `${a.employeeName} · ${formatCurrency(a.netArrear)} · UTR ${genUtr(a.id)}` })
  }

  const handleProcess = (fileFormat: string, paymentMode: string) => {
    const count = selected.size
    const total = records.filter(r => selected.has(r.id)).reduce((s, r) => s + r.netArrear, 0)
    setRecords(prev => prev.map(r => selected.has(r.id) ? { ...r, status: "Paid", paidAt: new Date().toISOString() } : r))
    setSelected(new Set())
    toast.success("Bank file generated & payments processed", {
      description: `${count} payment(s) · ${formatCurrency(total)} via ${fileFormat} (${paymentMode})`,
    })
  }

  const handleClearFilters = () => {
    setEntityFilter("all"); setPayoutFilter("all"); setStatusFilter("all"); setSearch("")
  }
  const handleRefresh = () => toast.success("Refreshed")

  const selectedRecords = filtered.filter(f => selected.has(f.id))
  const approvedCount = filtered.filter(f => f.status === "Approved").length

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-soft">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">
              Arrear Payment
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Payout pipeline for approved arrears. Generate bank files, mark payments as paid, and
              download vouchers.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={handleRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => selected.size === 0 ? toast.error("Select at least one approved arrear") : setProcessOpen(true)}
            className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
          >
            <Banknote className="h-3.5 w-3.5" /> Process Payments ({selected.size})
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Payments" value={stats.total} icon={Layers} accent="amber" sub="Approved + Paid" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} accent="amber" sub="Approved, not paid" />
        <StatCard label="Paid" value={stats.paid} icon={CheckCircle2} accent="emerald" sub="Settled" />
        <StatCard label="Total Amount" value={formatCurrencyShort(stats.totalAmount)} icon={IndianRupee} accent="amber" sub="Net payable" />
        <StatCard label="Paid This Month" value={formatCurrencyShort(stats.paidThisMonth)} icon={Wallet} accent="teal" sub="Current cycle" />
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
            <FilterSelect label="Payout Month" icon={CalendarDays} value={payoutFilter} onChange={setPayoutFilter} options={payoutOptions} allLabel="All months" />
            <FilterSelect label="Status" icon={CheckCircle2} value={statusFilter} onChange={setStatusFilter} options={["Approved", "Paid"]} allLabel="All statuses" />
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

      {/* Payment table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={approvedCount > 0 && selected.size === approvedCount}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all approved"
              />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Arrear Payments</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} record(s) · {selected.size} selected for payment</p>
              </div>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400">
              status ∈ {`{Approved, Paid}`}
            </Badge>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground mb-3">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No arrear payments found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">Approved arrears awaiting payment will appear here.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[640px] w-full">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
                  <TableRow className="hover:bg-muted/60">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide min-w-[200px]">Employee</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Entity</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Arrear Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Payout Month</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Payment Mode</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">UTR</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Paid At</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a: ArrearCase) => {
                    const isPaid = a.status === "Paid"
                    return (
                      <TableRow key={a.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-500/5">
                        <TableCell>
                          {!isPaid && (
                            <Checkbox
                              checked={selected.has(a.id)}
                              onCheckedChange={() => toggleSelect(a.id)}
                              aria-label={`Select ${a.employeeName}`}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className={cn("text-[10px] text-white font-semibold", avatarColor(a.employeeId))}>
                                {initials(a.employeeName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{a.employeeName}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{a.employeeCode} · {a.department}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]">{a.entity}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px] border-amber-500/30 text-amber-700 dark:text-amber-400">
                            {a.arrearType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "text-sm font-semibold tabular-nums",
                            a.netArrear < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground",
                          )}>
                            {formatCurrency(a.netArrear)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{a.payoutMonth}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {isPaid ? "Bank Transfer" : "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {isPaid ? (genUtr(a.id) || a.referenceId || "—") : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {a.paidAt ? formatDateTime(a.paidAt) : "—"}
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
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-[11px]">Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => toast.info(`Viewing ${a.employeeName} payment`)}>
                                <Eye className="h-3.5 w-3.5 mr-2" /> View
                              </DropdownMenuItem>
                              {!isPaid && (
                                <DropdownMenuItem onClick={() => handleMarkPaid(a.id)}>
                                  <CheckCheck className="h-3.5 w-3.5 mr-2" /> Mark as Paid
                                </DropdownMenuItem>
                              )}
                              {isPaid && (
                                <DropdownMenuItem onClick={() => handleDownloadVoucher(a)}>
                                  <Download className="h-3.5 w-3.5 mr-2" /> Download Voucher
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => toast.info(`Generating bank advice`)}>
                                <Landmark className="h-3.5 w-3.5 mr-2" /> Generate Bank Advice
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info(`Exporting payment ledger`)}>
                                <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Export
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toast.info(`Viewing payslip`)}>
                                <Receipt className="h-3.5 w-3.5 mr-2" /> View Payslip
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

      <ProcessPaymentsDialog
        open={processOpen}
        onOpenChange={setProcessOpen}
        selected={selectedRecords}
        onProcess={handleProcess}
      />

      {/* Helpful note */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5 p-3 text-xs text-muted-foreground">
        <ListChecks className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-medium text-foreground">Tip:</span> Only <span className="font-medium text-amber-700 dark:text-amber-400">Approved</span> arrears can be selected for batch processing. Once paid, a UTR is generated and the voucher can be downloaded for audit.
        </div>
      </div>
    </div>
  )
}

export default ArrearPaymentSection
