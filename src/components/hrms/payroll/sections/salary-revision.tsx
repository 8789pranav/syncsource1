"use client"

// ============================================================================
//  Salary — Salary Revision (Task ID 3-a)
// ----------------------------------------------------------------------------
//  Initiate, approve & implement salary revisions. Generate arrears.
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  TrendingUp, Plus, Search, Filter, MoreHorizontal, Eye, CheckCircle2, XCircle,
  RefreshCw, Play, ArrowLeftRight, CalendarDays, Banknote, Clock, FileText,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
  SalaryRevision, STATUS_COLORS, formatCurrency, formatCurrencyShort, formatDate,
  initials, avatarColor, formatPercent,
} from "../shared"
import { EMPLOYEE_SALARIES, SALARY_REVISIONS } from "../data"

const REVISION_TYPES = ["Annual Hike", "Promotion", "Correction", "Probation Confirmation", "Market Correction"] as const

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
//  Initiate Revision dialog
// ============================================================================
function InitiateRevisionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [employeeId, setEmployeeId] = React.useState("")
  const [revisionType, setRevisionType] = React.useState<string>("Annual Hike")
  const [revisedCtc, setRevisedCtc] = React.useState("")
  const [effectiveFrom, setEffectiveFrom] = React.useState(new Date().toISOString().slice(0, 10))
  const [reason, setReason] = React.useState("")
  const [generateArrear, setGenerateArrear] = React.useState(true)

  const employee = EMPLOYEE_SALARIES.find(e => e.employeeId === employeeId)
  const previousCtc = employee?.ctcAnnual || 0
  const revisedCtcNum = Number(revisedCtc) || 0
  const hikePct = previousCtc > 0 ? ((revisedCtcNum - previousCtc) / previousCtc) * 100 : 0

  const submit = () => {
    if (!employeeId || !revisedCtc) { toast.error("Employee and revised CTC are required"); return }
    toast.success("Salary revision initiated", { description: `${employee?.employeeName} · ${hikePct >= 0 ? "+" : ""}${hikePct.toFixed(2)}% hike` })
    onClose()
    setEmployeeId(""); setRevisedCtc(""); setReason("")
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Initiate Salary Revision
          </DialogTitle>
          <DialogDescription>Submit a new revision for approval. Arrears auto-generate when effective date is in the past.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-2">
          <div className="grid sm:grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Employee *</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_SALARIES.map(e => <SelectItem key={e.employeeId} value={e.employeeId}>{e.employeeName} ({e.employeeCode}) — {e.designation}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {employee && (
              <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg bg-muted/30 p-3 text-xs">
                <div><p className="text-muted-foreground">Current CTC</p><p className="font-semibold text-foreground mt-0.5">{formatCurrencyShort(employee.ctcAnnual)}</p></div>
                <div><p className="text-muted-foreground">Basic (Monthly)</p><p className="font-semibold text-foreground mt-0.5">{formatCurrencyShort(employee.basicMonthly)}</p></div>
                <div><p className="text-muted-foreground">Department</p><p className="font-semibold text-foreground mt-0.5">{employee.department}</p></div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Revision Type *</Label>
              <Select value={revisionType} onValueChange={setRevisionType}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REVISION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Revised CTC (Annual ₹) *</Label>
              <Input type="number" value={revisedCtc} onChange={e => setRevisedCtc(e.target.value)} placeholder="1800000" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Effective From</Label>
              <Input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hike % (auto)</Label>
              <div className="relative">
                <Input value={hikePct.toFixed(2)} readOnly className="bg-muted/40 pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Reason</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Annual performance review — Exceeds Expectations" className="bg-background resize-none" />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background p-3">
              <div>
                <Label className="text-xs">Generate Arrear Automatically</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">Auto-create arrear case if effective date is in the past.</p>
              </div>
              <Switch checked={generateArrear} onCheckedChange={setGenerateArrear} />
            </div>
          </div>
        </ScrollArea>
        <Separator />
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <CheckCircle2 className="h-3.5 w-3.5" /> Submit for Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Main component
// ============================================================================
export function SalaryRevisionSection() {
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState({ entity: "all", department: "all", revisionType: "all", status: "all" })
  const [open, setOpen] = React.useState(false)

  const entities = Array.from(new Set(SALARY_REVISIONS.map(r => r.entity)))
  const departments = Array.from(new Set(SALARY_REVISIONS.map(r => r.department)))

  const filtered = React.useMemo(() => {
    let list = SALARY_REVISIONS
    if (filters.entity !== "all") list = list.filter(r => r.entity === filters.entity)
    if (filters.department !== "all") list = list.filter(r => r.department === filters.department)
    if (filters.revisionType !== "all") list = list.filter(r => r.revisionType === filters.revisionType)
    if (filters.status !== "all") list = list.filter(r => r.status === filters.status)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => r.employeeName.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q) || r.designation.toLowerCase().includes(q))
    }
    return list
  }, [filters, search])

  const stats = {
    total: SALARY_REVISIONS.length,
    pending: SALARY_REVISIONS.filter(r => r.status === "Pending Approval").length,
    approved: SALARY_REVISIONS.filter(r => r.status === "Approved").length,
    implemented: SALARY_REVISIONS.filter(r => r.status === "Implemented").length,
    rejected: SALARY_REVISIONS.filter(r => r.status === "Rejected").length,
    hikeAmount: SALARY_REVISIONS.filter(r => r.status === "Implemented" || r.status === "Approved").reduce((s, r) => s + (r.revisedCtc - r.previousCtc), 0),
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-soft">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Salary Revision</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Initiate, approve & implement annual hikes, promotions, corrections.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => toast.info("Refreshed")} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <Plus className="h-3.5 w-3.5" /> Initiate Revision
          </Button>
        </div>
      </div>

      {/* Stat row */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" variants={gridContainer} initial="hidden" animate="show">
        <motion.div variants={gridItem}><StatTile label="Total Revisions" value={stats.total} icon={TrendingUp} accent="teal" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Pending Approval" value={stats.pending} icon={Clock} accent="amber" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Approved" value={stats.approved} icon={CheckCircle2} accent="emerald" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Implemented" value={stats.implemented} icon={Play} accent="cyan" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Rejected" value={stats.rejected} icon={XCircle} accent="rose" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Total Hike Amount" value={formatCurrencyShort(stats.hikeAmount)} icon={Banknote} accent="violet" sub="Annual" /></motion.div>
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
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search revisions..." className="pl-9 h-9 bg-background" />
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
            <Select value={filters.revisionType} onValueChange={v => setFilters({ ...filters, revisionType: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Revision Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {REVISION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {["Draft", "Pending Approval", "Approved", "Rejected", "Implemented"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                <TableHead className="min-w-[200px]">Employee</TableHead>
                <TableHead className="min-w-[140px]">Entity</TableHead>
                <TableHead className="min-w-[120px]">Department</TableHead>
                <TableHead className="min-w-[160px]">Designation</TableHead>
                <TableHead className="min-w-[140px]">Revision Type</TableHead>
                <TableHead className="min-w-[120px] text-right">Previous CTC</TableHead>
                <TableHead className="min-w-[120px] text-right">Revised CTC</TableHead>
                <TableHead className="min-w-[80px] text-right">Hike %</TableHead>
                <TableHead className="min-w-[110px]">Effective From</TableHead>
                <TableHead className="min-w-[200px]">Reason</TableHead>
                <TableHead className="min-w-[80px] text-center">Arrear</TableHead>
                <TableHead className="min-w-[120px]">Status</TableHead>
                <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-8 w-8 opacity-40" />
                      <p className="text-sm font-medium">No revisions match your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id} className="border-border/40 hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-[10px] font-semibold", avatarColor(r.employeeName))}>
                        {initials(r.employeeName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.employeeName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{r.employeeCode}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[140px]">{r.entity}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground">{r.department}</span></TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[160px]">{r.designation}</span></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.revisionType}</Badge></TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatCurrencyShort(r.previousCtc)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold tabular-nums text-foreground">{formatCurrencyShort(r.revisedCtc)}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn("text-xs font-semibold tabular-nums", r.hikePercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                      {r.hikePercent >= 0 ? "+" : ""}{formatPercent(r.hikePercent)}
                    </span>
                  </TableCell>
                  <TableCell><span className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(r.effectiveFrom)}</span></TableCell>
                  <TableCell><span className="text-xs text-muted-foreground truncate block max-w-[200px]">{r.reason}</span></TableCell>
                  <TableCell className="text-center">
                    {r.arrearGenerated ? <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400 gap-1"><ArrowLeftRight className="h-3 w-3" /> Yes</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[11px] border-0", STATUS_COLORS[r.status])}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => toast.info(`View ${r.employeeName}`)}><Eye className="h-3.5 w-3.5 mr-2" /> View</DropdownMenuItem>
                        {r.status === "Pending Approval" && (
                          <>
                            <DropdownMenuItem onClick={() => toast.success("Revision approved", { description: r.employeeName })} className="text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.success("Revision rejected", { description: r.employeeName })} className="text-rose-600 dark:text-rose-400">
                              <XCircle className="h-3.5 w-3.5 mr-2" /> Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        {(r.status === "Approved") && (
                          <DropdownMenuItem onClick={() => toast.success("Revision implemented", { description: r.employeeName })}>
                            <Play className="h-3.5 w-3.5 mr-2" /> Implement
                          </DropdownMenuItem>
                        )}
                        {!r.arrearGenerated && (r.status === "Approved" || r.status === "Implemented") && (
                          <DropdownMenuItem onClick={() => toast.success("Arrear generated", { description: r.employeeName })}>
                            <ArrowLeftRight className="h-3.5 w-3.5 mr-2" /> Generate Arrear
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toast.success("Letter generated", { description: r.employeeName })}>
                          <FileText className="h-3.5 w-3.5 mr-2" /> Revision Letter
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

      <InitiateRevisionDialog open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

export default SalaryRevisionSection
