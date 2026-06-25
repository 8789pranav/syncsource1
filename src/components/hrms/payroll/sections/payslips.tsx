"use client"

// ============================================================================
//  Salary — Payslips (Task ID 3-a)
// ----------------------------------------------------------------------------
//  Generate, publish, hold, re-issue payslips. Preview formatted payslip.
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  FileText, Plus, Search, Filter, MoreHorizontal, Eye, Download, Send, Pause,
  Play, RefreshCw, CheckCircle2, Banknote, Building2, CalendarDays, FileCheck2,
  Printer,
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
  Payslip, STATUS_COLORS, formatCurrency, formatCurrencyShort, formatDate,
  initials, avatarColor,
} from "../shared"
import { PAY_GROUPS, PAYROLL_RUNS, PAYSLIPS } from "../data"

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
//  Payslip preview dialog (formatted like a real payslip)
// ============================================================================
function PayslipPreviewDialog({ payslip, onClose }: { payslip: Payslip | null; onClose: () => void }) {
  if (!payslip) return null
  const totalEarningsYtd = payslip.earnings.reduce((s, e) => s + e.ytd, 0)
  const totalDeductionsYtd = payslip.deductions.reduce((s, d) => s + d.ytd, 0)
  return (
    <Dialog open={!!payslip} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Payslip Preview
          </DialogTitle>
          <DialogDescription>{payslip.payrollMonth} · {payslip.payrollRunName}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-2">
          <div className="py-2">
            {/* Company header */}
            <div className="rounded-t-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold tracking-tight">{payslip.entity}</p>
                  <p className="text-[11px] opacity-90">Salary Slip · {payslip.payrollMonth}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] opacity-90">Pay Date</p>
                  <p className="text-sm font-semibold">{formatDate(payslip.payDate)}</p>
                </div>
              </div>
            </div>

            {/* Employee details */}
            <div className="grid grid-cols-2 gap-3 border-x border-border/60 bg-muted/30 p-4 text-xs">
              <div className="space-y-1">
                <p className="text-muted-foreground uppercase tracking-wide text-[10px]">Employee</p>
                <div className="flex items-center gap-2">
                  <div className={cn("grid h-8 w-8 place-items-center rounded-full text-white text-[10px] font-semibold", avatarColor(payslip.employeeName))}>
                    {initials(payslip.employeeName)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{payslip.employeeName}</p>
                    <p className="text-muted-foreground font-mono">{payslip.employeeCode}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-muted-foreground uppercase tracking-wide text-[10px]">Designation</p>
                <p className="font-semibold text-foreground">{payslip.designation}</p>
                <p className="text-muted-foreground">{payslip.department}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-muted-foreground text-[10px]">PAN: <span className="font-mono text-foreground">{payslip.pan}</span></p>
                <p className="text-muted-foreground text-[10px]">Bank A/C: <span className="font-mono text-foreground">{payslip.bankAccount}</span></p>
                <p className="text-muted-foreground text-[10px]">IFSC: <span className="font-mono text-foreground">{payslip.bankIfsc}</span></p>
              </div>
              <div className="space-y-0.5 text-right">
                <p className="text-muted-foreground text-[10px]">Pay Days: <span className="font-semibold text-foreground">{payslip.payDays}</span></p>
                <p className="text-muted-foreground text-[10px]">LOP Days: <span className="font-semibold text-rose-600 dark:text-rose-400">{payslip.lopDays}</span></p>
                <p className="text-muted-foreground text-[10px]">Present Days: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{payslip.presentDays}</span></p>
              </div>
            </div>

            {/* Earnings & Deductions tables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-x border-border/60">
              {/* Earnings */}
              <div className="border-r border-border/40">
                <div className="px-3 py-2 bg-emerald-50/60 dark:bg-emerald-500/10 border-b border-border/40">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">EARNINGS</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] uppercase">Component</TableHead>
                      <TableHead className="text-[10px] uppercase text-right">Amount</TableHead>
                      <TableHead className="text-[10px] uppercase text-right">YTD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslip.earnings.map(e => (
                      <TableRow key={e.name}>
                        <TableCell className="text-xs py-1.5">{e.name}</TableCell>
                        <TableCell className="text-xs py-1.5 text-right tabular-nums">{formatCurrency(e.amount)}</TableCell>
                        <TableCell className="text-xs py-1.5 text-right tabular-nums text-muted-foreground">{formatCurrency(e.ytd)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-emerald-50/40 dark:bg-emerald-500/5">
                      <TableCell className="text-xs py-2 font-semibold">Gross Earnings</TableCell>
                      <TableCell className="text-xs py-2 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(payslip.grossEarnings)}</TableCell>
                      <TableCell className="text-xs py-2 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(totalEarningsYtd)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {/* Deductions */}
              <div>
                <div className="px-3 py-2 bg-rose-50/60 dark:bg-rose-500/10 border-b border-border/40">
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">DEDUCTIONS</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] uppercase">Component</TableHead>
                      <TableHead className="text-[10px] uppercase text-right">Amount</TableHead>
                      <TableHead className="text-[10px] uppercase text-right">YTD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslip.deductions.map(d => (
                      <TableRow key={d.name}>
                        <TableCell className="text-xs py-1.5">{d.name}</TableCell>
                        <TableCell className="text-xs py-1.5 text-right tabular-nums">{formatCurrency(d.amount)}</TableCell>
                        <TableCell className="text-xs py-1.5 text-right tabular-nums text-muted-foreground">{formatCurrency(d.ytd)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-rose-50/40 dark:bg-rose-500/5">
                      <TableCell className="text-xs py-2 font-semibold">Total Deductions</TableCell>
                      <TableCell className="text-xs py-2 text-right font-semibold tabular-nums text-rose-700 dark:text-rose-400">{formatCurrency(payslip.totalDeductions)}</TableCell>
                      <TableCell className="text-xs py-2 text-right font-semibold tabular-nums text-rose-700 dark:text-rose-400">{formatCurrency(totalDeductionsYtd)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Net pay banner */}
            <div className="rounded-b-lg bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] opacity-90 uppercase tracking-wide">Net Pay (Take Home)</p>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(payslip.netPay)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] opacity-90">Annual CTC</p>
                <p className="text-sm font-semibold">{formatCurrencyShort(payslip.ctcAnnual)}</p>
              </div>
            </div>

            {/* Footer */}
            <p className="text-[10px] text-muted-foreground text-center mt-3 italic">
              This is a computer-generated payslip and does not require a signature. Generated on {formatDate(payslip.generatedAt)}.
            </p>
          </div>
        </ScrollArea>
        <Separator />
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.success("Print dialog opened")} className="gap-1.5"><Printer className="h-3.5 w-3.5" /> Print</Button>
          <Button variant="outline" size="sm" onClick={() => toast.success("Payslip downloaded")} className="gap-1.5"><Download className="h-3.5 w-3.5" /> Download</Button>
          {payslip.status === "Generated" && (
            <Button size="sm" onClick={() => { toast.success("Payslip published"); onClose() }} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
              <Send className="h-3.5 w-3.5" /> Publish
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Main component
// ============================================================================
export function PayslipsSection() {
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState({ entity: "all", payGroup: "all", run: "all", status: "all", month: "all" })
  const [preview, setPreview] = React.useState<Payslip | null>(null)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  const entities = Array.from(new Set(PAYSLIPS.map(p => p.entity)))
  const months = Array.from(new Set(PAYSLIPS.map(p => p.payrollMonth)))

  const filtered = React.useMemo(() => {
    let list = PAYSLIPS
    if (filters.entity !== "all") list = list.filter(p => p.entity === filters.entity)
    if (filters.payGroup !== "all") list = list.filter(p => p.payGroupId === filters.payGroup)
    if (filters.run !== "all") list = list.filter(p => p.payrollRunId === filters.run)
    if (filters.status !== "all") list = list.filter(p => p.status === filters.status)
    if (filters.month !== "all") list = list.filter(p => p.payrollMonth === filters.month)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.employeeName.toLowerCase().includes(q) || p.employeeCode.toLowerCase().includes(q) || p.department.toLowerCase().includes(q))
    }
    return list
  }, [filters, search])

  const allSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id))
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(filtered.map(p => p.id)))
  const toggle = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const stats = {
    total: PAYSLIPS.length,
    published: PAYSLIPS.filter(p => p.status === "Published").length,
    generated: PAYSLIPS.filter(p => p.status === "Generated").length,
    held: PAYSLIPS.filter(p => p.status === "Held").length,
    netPay: PAYSLIPS.filter(p => p.status === "Published").reduce((s, p) => s + p.netPay, 0),
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-soft">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Payslips</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Generate, publish, hold & re-issue employee payslips.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => toast.info("Refreshed")} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          {selectedIds.size > 0 && (
            <Button size="sm" onClick={() => { toast.success("Bulk published", { description: `${selectedIds.size} payslip(s)` }); setSelectedIds(new Set()) }} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
              <Send className="h-3.5 w-3.5" /> Publish ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Stat row */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" variants={gridContainer} initial="hidden" animate="show">
        <motion.div variants={gridItem}><StatTile label="Total Payslips" value={stats.total} icon={FileText} accent="teal" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Published" value={stats.published} icon={CheckCircle2} accent="emerald" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Generated" value={stats.generated} icon={FileCheck2} accent="cyan" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Held" value={stats.held} icon={Pause} accent="amber" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Total Net Pay" value={formatCurrencyShort(stats.netPay)} icon={Banknote} accent="rose" sub="Published" /></motion.div>
      </motion.div>

      {/* Filter bar */}
      <Card className="border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-teal-500" />
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="relative col-span-2 sm:col-span-3 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payslips..." className="pl-9 h-9 bg-background" />
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
            <Select value={filters.run} onValueChange={v => setFilters({ ...filters, run: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Run" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Runs</SelectItem>
                {PAYROLL_RUNS.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {["Generated", "Published", "Held", "Re-issued"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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

      {/* Table */}
      <Card className="border-border/60 rounded-xl shadow-soft overflow-hidden">
        <ScrollArea className="max-h-[640px]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur z-10">
              <TableRow className="hover:bg-muted/40">
                <TableHead className="w-[40px] pl-4">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-border" />
                </TableHead>
                <TableHead className="min-w-[200px]">Employee</TableHead>
                <TableHead className="min-w-[130px]">Entity</TableHead>
                <TableHead className="min-w-[120px]">Department</TableHead>
                <TableHead className="min-w-[160px]">Payroll Run</TableHead>
                <TableHead className="min-w-[110px]">Month</TableHead>
                <TableHead className="min-w-[100px]">Pay Date</TableHead>
                <TableHead className="min-w-[110px] text-right">Gross</TableHead>
                <TableHead className="min-w-[110px] text-right">Deductions</TableHead>
                <TableHead className="min-w-[120px] text-right">Net Pay</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileText className="h-8 w-8 opacity-40" />
                      <p className="text-sm font-medium">No payslips match your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.id} className={cn("border-border/40 hover:bg-muted/30", selectedIds.has(p.id) && "bg-teal-50/40 dark:bg-teal-500/5")}>
                  <TableCell className="pl-4">
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 rounded border-border" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-[10px] font-semibold", avatarColor(p.employeeName))}>
                        {initials(p.employeeName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.employeeName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{p.employeeCode}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[130px]">{p.entity}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground">{p.department}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[160px]">{p.payrollRunName}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground">{p.payrollMonth}</span></TableCell>
                  <TableCell><span className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(p.payDate)}</span></TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatCurrencyShort(p.grossEarnings)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-rose-600 dark:text-rose-400">{formatCurrencyShort(p.totalDeductions)}</TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums text-foreground">{formatCurrencyShort(p.netPay)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[11px] border-0", STATUS_COLORS[p.status])}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setPreview(p)}><Eye className="h-3.5 w-3.5 mr-2" /> View / Preview</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.success("Payslip downloaded", { description: p.employeeName })}><Download className="h-3.5 w-3.5 mr-2" /> Download</DropdownMenuItem>
                        {p.status !== "Published" && (
                          <DropdownMenuItem onClick={() => toast.success("Payslip published", { description: p.employeeName })} className="text-emerald-600 dark:text-emerald-400">
                            <Send className="h-3.5 w-3.5 mr-2" /> Publish
                          </DropdownMenuItem>
                        )}
                        {p.status === "Published" && (
                          <DropdownMenuItem onClick={() => toast.success("Payslip held", { description: p.employeeName })} className="text-amber-600 dark:text-amber-400">
                            <Pause className="h-3.5 w-3.5 mr-2" /> Hold
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => toast.success("Payslip re-issued", { description: p.employeeName })}>
                          <Play className="h-3.5 w-3.5 mr-2" /> Re-issue
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

      <PayslipPreviewDialog payslip={preview} onClose={() => setPreview(null)} />
    </div>
  )
}

export default PayslipsSection
