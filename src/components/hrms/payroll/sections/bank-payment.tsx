"use client"

// ============================================================================
//  Salary — Bank / Payment (Task ID 3-a)
// ----------------------------------------------------------------------------
//  Generate bank files, send to bank, approve & mark payments as paid.
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Landmark, Plus, Search, Filter, MoreHorizontal, Eye, Download, Send,
  CheckCircle2, RefreshCw, Banknote, Clock, FileText, XCircle, FileCheck2,
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
  BankPayment, STATUS_COLORS, formatCurrency, formatCurrencyShort, formatDate,
  BANK_FILE_FORMATS,
} from "../shared"
import { BANK_PAYMENTS, PAYROLL_RUNS } from "../data"

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
//  Generate Bank File dialog
// ============================================================================
function GenerateBankFileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [runId, setRunId] = React.useState("")
  const [bankAccount, setBankAccount] = React.useState("")
  const [fileFormat, setFileFormat] = React.useState("HDFC Format")

  const run = PAYROLL_RUNS.find(r => r.id === runId)
  const amount = run?.netPayout || 0
  const empCount = run?.totalEmployees || 0

  const submit = () => {
    if (!runId || !bankAccount) { toast.error("Payroll run and bank account are required"); return }
    toast.success("Bank file generated", { description: `${run?.name} · ${formatCurrencyShort(amount)} · ${empCount} employees` })
    onClose()
    setRunId(""); setBankAccount("")
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Generate Bank File
          </DialogTitle>
          <DialogDescription>Generate a bank file for a processed payroll run.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-2">
          <div className="grid sm:grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Payroll Run *</Label>
              <Select value={runId} onValueChange={setRunId}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select payroll run" /></SelectTrigger>
                <SelectContent>
                  {PAYROLL_RUNS.filter(r => r.status === "Processed" || r.status === "Approved").map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({r.entity})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bank Account *</Label>
              <Input value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="5010012345678" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">File Format</Label>
              <Select value={fileFormat} onValueChange={setFileFormat}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BANK_FILE_FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {run && (
              <div className="sm:col-span-2 rounded-lg border border-teal-500/30 bg-teal-50/40 dark:bg-teal-500/5 p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Preview</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Entity</p>
                    <p className="text-sm font-semibold text-foreground truncate">{run.entity}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Employees</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">{empCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Net Payout</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">{formatCurrencyShort(amount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Format</p>
                    <p className="text-sm font-semibold text-foreground">{fileFormat}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <Separator />
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <FileCheck2 className="h-3.5 w-3.5" /> Generate File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Main component
// ============================================================================
export function BankPaymentSection() {
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState({ entity: "all", bank: "all", format: "all", status: "all" })
  const [genOpen, setGenOpen] = React.useState(false)

  const entities = Array.from(new Set(BANK_PAYMENTS.map(b => b.entity)))
  const banks = Array.from(new Set(BANK_PAYMENTS.map(b => b.bankName)))

  const filtered = React.useMemo(() => {
    let list = BANK_PAYMENTS
    if (filters.entity !== "all") list = list.filter(b => b.entity === filters.entity)
    if (filters.bank !== "all") list = list.filter(b => b.bankName === filters.bank)
    if (filters.format !== "all") list = list.filter(b => b.fileFormat === filters.format)
    if (filters.status !== "all") list = list.filter(b => b.status === filters.status)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b => b.payrollRunName.toLowerCase().includes(q) || b.entity.toLowerCase().includes(q) || (b.fileReference || "").toLowerCase().includes(q) || (b.utrNumber || "").toLowerCase().includes(q))
    }
    return list
  }, [filters, search])

  const stats = {
    total: BANK_PAYMENTS.length,
    pending: BANK_PAYMENTS.filter(b => b.status === "Pending").length,
    fileGenerated: BANK_PAYMENTS.filter(b => b.status === "File Generated").length,
    approved: BANK_PAYMENTS.filter(b => b.status === "Approved").length,
    paid: BANK_PAYMENTS.filter(b => b.status === "Paid").length,
    failed: BANK_PAYMENTS.filter(b => b.status === "Failed").length,
    amount: BANK_PAYMENTS.reduce((s, b) => s + b.totalAmount, 0),
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-soft">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Bank / Payment</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Generate bank files, send to bank, approve & track payments.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => toast.info("Refreshed")} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          <Button size="sm" onClick={() => setGenOpen(true)} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <Plus className="h-3.5 w-3.5" /> Generate Bank File
          </Button>
        </div>
      </div>

      {/* Stat row */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3" variants={gridContainer} initial="hidden" animate="show">
        <motion.div variants={gridItem}><StatTile label="Total Payments" value={stats.total} icon={Landmark} accent="teal" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Pending" value={stats.pending} icon={Clock} accent="amber" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="File Generated" value={stats.fileGenerated} icon={FileText} accent="cyan" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Approved" value={stats.approved} icon={CheckCircle2} accent="violet" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Paid" value={stats.paid} icon={Banknote} accent="emerald" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Failed" value={stats.failed} icon={XCircle} accent="rose" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Total Amount" value={formatCurrencyShort(stats.amount)} icon={Banknote} accent="teal" /></motion.div>
      </motion.div>

      {/* Filter bar */}
      <Card className="border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-teal-500" />
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments..." className="pl-9 h-9 bg-background" />
            </div>
            <Select value={filters.entity} onValueChange={v => setFilters({ ...filters, entity: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.bank} onValueChange={v => setFilters({ ...filters, bank: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Bank" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Banks</SelectItem>
                {banks.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.format} onValueChange={v => setFilters({ ...filters, format: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="File Format" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                {BANK_FILE_FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {["Pending", "File Generated", "Sent to Bank", "Approved", "Paid", "Failed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                <TableHead className="min-w-[200px]">Payroll Run</TableHead>
                <TableHead className="min-w-[140px]">Entity</TableHead>
                <TableHead className="min-w-[130px]">Bank Account</TableHead>
                <TableHead className="min-w-[120px]">Bank Name</TableHead>
                <TableHead className="min-w-[130px]">File Format</TableHead>
                <TableHead className="min-w-[120px] text-right">Amount</TableHead>
                <TableHead className="min-w-[80px] text-right">Employees</TableHead>
                <TableHead className="min-w-[110px]">Status</TableHead>
                <TableHead className="min-w-[140px]">File Reference</TableHead>
                <TableHead className="min-w-[120px]">UTR Number</TableHead>
                <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Landmark className="h-8 w-8 opacity-40" />
                      <p className="text-sm font-medium">No bank payments match your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map(b => (
                <TableRow key={b.id} className="border-border/40 hover:bg-muted/30">
                  <TableCell>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{b.payrollRunName}</p>
                      <p className="text-[11px] text-muted-foreground">{b.entity}</p>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[140px]">{b.entity}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground font-mono">{b.bankAccount}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground">{b.bankName}</span></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{b.fileFormat}</Badge></TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums text-foreground">{formatCurrencyShort(b.totalAmount)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{b.employeeCount}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[11px] border-0", STATUS_COLORS[b.status])}>{b.status}</Badge>
                  </TableCell>
                  <TableCell><span className="text-[11px] text-muted-foreground font-mono">{b.fileReference || "—"}</span></TableCell>
                  <TableCell><span className="text-[11px] text-muted-foreground font-mono">{b.utrNumber || "—"}</span></TableCell>
                  <TableCell className="text-right pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => toast.info(`View ${b.payrollRunName}`)}><Eye className="h-3.5 w-3.5 mr-2" /> View</DropdownMenuItem>
                        {(b.status === "Pending") && (
                          <DropdownMenuItem onClick={() => toast.success("Bank file generated", { description: b.payrollRunName })}>
                            <FileText className="h-3.5 w-3.5 mr-2" /> Generate File
                          </DropdownMenuItem>
                        )}
                        {(b.status === "File Generated") && (
                          <DropdownMenuItem onClick={() => toast.success("Sent to bank", { description: b.payrollRunName })}>
                            <Send className="h-3.5 w-3.5 mr-2" /> Send to Bank
                          </DropdownMenuItem>
                        )}
                        {(b.status === "Sent to Bank") && (
                          <DropdownMenuItem onClick={() => toast.success("Payment approved", { description: b.payrollRunName })}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Approve
                          </DropdownMenuItem>
                        )}
                        {(b.status === "Approved") && (
                          <DropdownMenuItem onClick={() => toast.success("Marked as paid", { description: b.payrollRunName })} className="text-emerald-600 dark:text-emerald-400">
                            <Banknote className="h-3.5 w-3.5 mr-2" /> Mark Paid
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toast.success("File downloaded", { description: b.payrollRunName })}>
                          <Download className="h-3.5 w-3.5 mr-2" /> Download File
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

      <GenerateBankFileDialog open={genOpen} onClose={() => setGenOpen(false)} />
    </div>
  )
}

export default BankPaymentSection
