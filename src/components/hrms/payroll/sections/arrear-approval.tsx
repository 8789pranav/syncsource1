"use client"

// ============================================================================
//  ArrearApprovalSection — Arrear menu #7 (Arrear Approval)
//  ----------------------------------------------------------------------------
//  Approval queue + bulk approve + workflow visualization (manager → finance
//  → HR head). Filters pending approval arrears. Amber/orange accent.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ShieldCheck, Search, Filter, RefreshCw, Eye, CheckCircle2, XCircle,
  Clock, IndianRupee, Layers, Inbox, Building2, Tag, MoreHorizontal,
  Info, ArrowRight, UserCog, FileSpreadsheet, AlertTriangle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  ArrearCase, ArrearType, STATUS_COLORS,
  formatCurrency, formatCurrencyShort, formatDateTime, initials, avatarColor,
} from "../shared"

// ---------- Constants ----------
const ARREAR_TYPES: ArrearType[] = [
  "Salary Revision", "LOP Reversal", "Attendance Correction", "Bonus",
  "Incentive", "Manual", "Component Change", "Structure Change",
]

const APPROVERS = [
  "Reporting Manager", "Finance Manager", "HR Head", "Payroll Admin", "CFO",
]

const WORKFLOW_STEPS = [
  { id: 1, name: "Reporting Manager", role: "Manager", desc: "Validates business reason for arrear" },
  { id: 2, name: "Finance Manager", role: "Finance", desc: "Reviews amount, budget, and compliance" },
  { id: 3, name: "HR Head", role: "HR", desc: "Final approval & payroll inclusion" },
]

// SLA thresholds (in days)
const SLA_THRESHOLDS = { warning: 2, breach: 5 }

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

// ---------- Stat card ----------
function StatCard({
  label, value, icon: Icon, sub, accent = "amber",
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  sub?: string
  accent?: "amber" | "emerald" | "rose"
}) {
  const accents: Record<string, string> = {
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
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

// ---------- SLA Badge ----------
function SlaBadge({ days }: { days: number }) {
  if (days >= SLA_THRESHOLDS.breach) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
        <AlertTriangle className="h-3 w-3" /> {days}d · Breached
      </span>
    )
  }
  if (days >= SLA_THRESHOLDS.warning) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
        <Clock className="h-3 w-3" /> {days}d · Warning
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
      <Clock className="h-3 w-3" /> {days}d
    </span>
  )
}

// ---------- Workflow visualization ----------
function WorkflowVisualization({ currentStep = 1 }: { currentStep?: number }) {
  return (
    <Card className="border border-border/60 rounded-xl shadow-soft">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <UserCog className="h-4 w-4 text-amber-500" /> Approval Workflow
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Sequential 3-level approval (Manager → Finance → HR Head)</p>
          </div>
          <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400">
            Step {currentStep} of {WORKFLOW_STEPS.length}
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative">
          {/* connector line on desktop */}
          <div className="hidden sm:block absolute top-6 left-[16%] right-[16%] h-px bg-border/60" />
          {WORKFLOW_STEPS.map((step, i) => {
            const idx = i + 1
            const isDone = idx < currentStep
            const isCurrent = idx === currentStep
            const isPending = idx > currentStep
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={cn(
                  "relative rounded-xl border p-3 bg-card z-10",
                  isDone && "border-emerald-500/30",
                  isCurrent && "border-amber-500/50 shadow-card",
                  isPending && "border-border/60 opacity-70",
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={cn(
                    "grid h-8 w-8 place-items-center rounded-full text-xs font-semibold",
                    isDone && "bg-emerald-500 text-white",
                    isCurrent && "bg-gradient-to-br from-amber-500 to-orange-500 text-white",
                    isPending && "bg-muted text-muted-foreground",
                  )}>
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : idx}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{step.name}</p>
                    <p className="text-[10px] text-muted-foreground">{step.role}</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">{step.desc}</p>
                {isCurrent && (
                  <Badge variant="outline" className="mt-2 text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400">
                    Pending Action
                  </Badge>
                )}
                {isDone && (
                  <Badge variant="outline" className="mt-2 text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Approved
                  </Badge>
                )}
                {isPending && (
                  <Badge variant="outline" className="mt-2 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5 mr-1" /> Pending
                  </Badge>
                )}
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Bulk approve dialog ----------
function BulkApproveDialog({
  open, onOpenChange, selected, onApprove, onReject,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  selected: ArrearCase[]
  onApprove: (comment: string) => void
  onReject: (comment: string) => void
}) {
  const [comment, setComment] = useState("")
  const totalAmount = selected.reduce((s, a) => s + a.netArrear, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            Bulk Approve / Reject Arrears
          </DialogTitle>
          <DialogDescription>
            {selected.length} arrear(s) selected · Total: {formatCurrency(totalAmount)}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-3 p-1 pr-3">
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.map(a => (
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
                      <TableCell className="text-xs text-right tabular-nums font-semibold">{formatCurrency(a.netArrear)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Approver Comment</Label>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a comment for the audit trail…"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sticky bottom-0 bg-background pt-3 border-t border-border/60">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="outline"
            className="gap-1.5 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/5"
            onClick={() => { onReject(comment || "Rejected in bulk"); onOpenChange(false); setComment("") }}
          >
            <XCircle className="h-4 w-4" /> Reject All
          </Button>
          <Button
            className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
            onClick={() => { onApprove(comment || "Approved in bulk"); onOpenChange(false); setComment("") }}
          >
            <CheckCircle2 className="h-4 w-4" /> Approve All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Component ----------
export function ArrearApprovalSection() {
  const [records, setRecords] = useState<ArrearCase[]>(
    ARREAR_CASES.filter(a => a.status === "Pending Approval"),
  )
  const [entityFilter, setEntityFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [approverFilter, setApproverFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [commentFor, setCommentFor] = useState<ArrearCase | null>(null)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState("")

  // ---------- Options ----------
  const entityOptions = useMemo(() => Array.from(new Set(records.map(r => r.entity))), [records])

  // ---------- Filtered ----------
  const filtered = useMemo(() => {
    return records.filter(r => {
      if (entityFilter !== "all" && r.entity !== entityFilter) return false
      if (typeFilter !== "all" && r.arrearType !== typeFilter) return false
      if (approverFilter !== "all") {
        // synthetic: rotate approvers based on case index
        const idx = ARREAR_CASES.findIndex(a => a.id === r.id) % APPROVERS.length
        const expected = APPROVERS[idx]
        if (expected !== approverFilter) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const hit =
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q) ||
          r.arrearType.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
        if (!hit) return false
      }
      return true
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [records, entityFilter, typeFilter, approverFilter, search])

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const pending = records.length
    const today = new Date().toDateString()
    const approvedToday = 0 // synthetic — would need a separate approved list
    const rejectedToday = 0
    const totalPendingAmount = records.reduce((s, r) => s + r.netArrear, 0)
    return { pending, approvedToday, rejectedToday, totalPendingAmount }
  }, [records])

  // ---------- Helpers ----------
  const pendingWithFor = (a: ArrearCase): string => {
    const idx = ARREAR_CASES.findIndex(x => x.id === a.id) % APPROVERS.length
    return APPROVERS[idx]
  }

  // ---------- Actions ----------
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(f => f.id)))
    }
  }

  const handleApprove = (id: string, comment: string) => {
    setRecords(prev => prev.filter(r => r.id !== id))
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    toast.success("Arrear approved", { description: comment })
  }
  const handleReject = (id: string, comment: string) => {
    setRecords(prev => prev.filter(r => r.id !== id))
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    toast.info("Arrear rejected", { description: comment })
  }
  const handleRequestInfo = (a: ArrearCase) => {
    toast.info(`Information requested from ${a.employeeName}'s manager`)
  }

  const handleBulkApprove = (comment: string) => {
    const count = selected.size
    setRecords(prev => prev.filter(r => !selected.has(r.id)))
    setSelected(new Set())
    toast.success(`${count} arrear(s) approved`, { description: comment })
  }
  const handleBulkReject = (comment: string) => {
    const count = selected.size
    setRecords(prev => prev.filter(r => !selected.has(r.id)))
    setSelected(new Set())
    toast.info(`${count} arrear(s) rejected`, { description: comment })
  }

  const openComment = (a: ArrearCase) => {
    setCommentFor(a)
    setCommentText("")
    setCommentOpen(true)
  }

  const handleClearFilters = () => {
    setEntityFilter("all"); setTypeFilter("all"); setApproverFilter("all"); setSearch("")
  }
  const handleRefresh = () => toast.success("Refreshed")

  const selectedRecords = filtered.filter(f => selected.has(f.id))

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-soft">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">
              Arrear Approval
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Approval queue for pending arrear cases. Bulk approve, request info, or reject with
              audit-trail comments.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={handleRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => selected.size === 0 ? toast.error("Select at least one arrear to bulk approve") : setBulkOpen(true)}
            className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Bulk Approve ({selected.size})
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pending Approvals" value={stats.pending} icon={Clock} accent="amber" sub="Awaiting action" />
        <StatCard label="Approved Today" value={stats.approvedToday} icon={CheckCircle2} accent="emerald" sub="Today" />
        <StatCard label="Rejected Today" value={stats.rejectedToday} icon={XCircle} accent="rose" sub="Today" />
        <StatCard label="Total Pending Amount" value={formatCurrencyShort(stats.totalPendingAmount)} icon={IndianRupee} accent="amber" sub="Net arrear" />
      </div>

      {/* Workflow visualization */}
      <WorkflowVisualization currentStep={1} />

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
            <FilterSelect label="Arrear Type" icon={Tag} value={typeFilter} onChange={setTypeFilter} options={ARREAR_TYPES} allLabel="All types" />
            <FilterSelect label="Approver" icon={UserCog} value={approverFilter} onChange={setApproverFilter} options={APPROVERS} allLabel="All approvers" />
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

      {/* Approval queue table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={filtered.length > 0 && selected.size === filtered.length}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Approval Queue</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} pending · {selected.size} selected</p>
              </div>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400">
              status = Pending Approval
            </Badge>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No pending approvals</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">All caught up! Pending arrear cases will appear here.</p>
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
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Submitted At</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Pending With</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">SLA</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a: ArrearCase) => {
                    const pendingWith = pendingWithFor(a)
                    const days = daysSince(a.createdAt)
                    return (
                      <TableRow key={a.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-500/5">
                        <TableCell>
                          <Checkbox
                            checked={selected.has(a.id)}
                            onCheckedChange={() => toggleSelect(a.id)}
                            aria-label={`Select ${a.employeeName}`}
                          />
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
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(a.createdAt)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                            <UserCog className="h-3 w-3 text-amber-500" />
                            {pendingWith}
                          </span>
                        </TableCell>
                        <TableCell><SlaBadge days={days} /></TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-[11px]">Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => toast.info(`Viewing ${a.employeeName} arrear`)}>
                                <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openComment(a)}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Approve with Comment
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRequestInfo(a)}>
                                <Info className="h-3.5 w-3.5 mr-2" /> Request Info
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info(`Reassigned to next approver`)}>
                                <ArrowRight className="h-3.5 w-3.5 mr-2" /> Reassign
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info(`Exporting arrear details`)}>
                                <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Export
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-rose-600 dark:text-rose-400" onClick={() => handleReject(a.id, "Rejected by approver")}>
                                <XCircle className="h-3.5 w-3.5 mr-2" /> Reject
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

      <BulkApproveDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        selected={selectedRecords}
        onApprove={handleBulkApprove}
        onReject={handleBulkReject}
      />

      {/* Single-approve comment dialog */}
      <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-500" />
              Approve Arrear
            </DialogTitle>
            <DialogDescription>
              {commentFor?.employeeName} · {commentFor?.arrearType} · {commentFor ? formatCurrency(commentFor.netArrear) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Approver Comment</Label>
              <Textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Add a comment for the audit trail…"
                rows={3}
                className="resize-none"
              />
            </div>
            {commentFor && (
              <div className="rounded-lg border border-border/60 p-2 bg-muted/30 text-xs text-muted-foreground">
                {commentFor.description}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCommentOpen(false)}>Cancel</Button>
            <Button
              className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
              onClick={() => {
                if (commentFor) handleApprove(commentFor.id, commentText || "Approved")
                setCommentOpen(false)
              }}
            >
              <CheckCircle2 className="h-4 w-4" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ArrearApprovalSection
