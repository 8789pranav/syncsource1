"use client"

// ============================================================================
//  FnF Approval — approve / reject / request-info for FnF cases
//  Rose/pink accents. Filter, stats, queue, workflow, bulk approve.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ShieldCheck, Search, Filter, Eye, CheckCircle2, XCircle, Info, Clock,
  Coins, TrendingUp, AlertCircle, Building2, UserCheck, ArrowRight, Users,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

const APPROVERS = ["HR Head (Anita Desai)", "Finance Head (Rajesh Kumar)", "CFO (Meera Joshi)"]

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

// Sla helper
function computeSla(submittedAt: string): { text: string; overdue: boolean; pct: number } {
  const submitted = new Date(submittedAt).getTime()
  const slaMs = 3 * 86400000 // 3-day SLA
  const elapsed = Date.now() - submitted
  const pct = Math.min(100, Math.max(0, (elapsed / slaMs) * 100))
  const remaining = slaMs - elapsed
  const overdue = remaining < 0
  if (overdue) {
    const days = Math.ceil(Math.abs(remaining) / 86400000)
    return { text: `${days}d overdue`, overdue, pct: 100 }
  }
  const hours = Math.ceil(remaining / (1000 * 60 * 60))
  if (hours < 24) return { text: `${hours}h left`, overdue, pct }
  return { text: `${Math.ceil(hours / 24)}d left`, overdue, pct }
}

// ============================================================================
export function FnFApprovalSection() {
  // Cases awaiting approval (Pending Approval or Calculation In Progress)
  const initialQueue = useMemo(() => FNF_CASES.filter(c =>
    c.status === "Pending Approval" || c.status === "Calculation In Progress"
  ), [])

  const [queue, setQueue] = useState<FnFCase[]>(initialQueue)
  const [entityFilter, setEntityFilter] = useState("all")
  const [approverFilter, setApproverFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkComment, setBulkComment] = useState("")
  const [actionTarget, setActionTarget] = useState<FnFCase | null>(null)
  const [actionType, setActionType] = useState<"approve" | "reject" | "info" | null>(null)
  const [actionComment, setActionComment] = useState("")

  const entityOptions = useMemo(() => Array.from(new Set(queue.map(c => c.entity))), [queue])

  const filtered = useMemo(() => {
    return queue.filter(c => {
      if (entityFilter !== "all" && c.entity !== entityFilter) return false
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      if (approverFilter !== "all") {
        // Pending with = approverFilter; demo mapping
        const pendingWith = c.status === "Calculation In Progress" ? APPROVERS[0] : APPROVERS[1]
        if (pendingWith !== approverFilter) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        return c.employeeName.toLowerCase().includes(q) ||
          c.employeeCode.toLowerCase().includes(q) ||
          c.exitCaseId.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      }
      return true
    })
  }, [queue, entityFilter, approverFilter, statusFilter, search])

  const stats = useMemo(() => {
    const pending = queue.length
    const approvedToday = FNF_CASES.filter(c => c.approvedAt && isToday(c.approvedAt)).length
    const rejectedToday = 0
    const totalPendingAmount = queue.reduce((s, c) => s + c.netPayable, 0)
    const avgApprovalTime = 2.4 // days demo
    return { pending, approvedToday, rejectedToday, totalPendingAmount, avgApprovalTime }
  }, [queue])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(c => c.id)))
    }
  }

  const openAction = (type: "approve" | "reject" | "info", c: FnFCase) => {
    setActionTarget(c)
    setActionType(type)
    setActionComment("")
  }

  const submitAction = () => {
    if (!actionTarget || !actionType) return
    if (!actionComment && actionType !== "approve") {
      toast.error("Please add a comment for this action.")
      return
    }
    const c = actionTarget
    if (actionType === "approve") {
      setQueue(prev => prev.filter(x => x.id !== c.id))
      toast.success("FnF approved", {
        description: `${c.employeeName} · ${formatCurrency(c.netPayable)} · by Rajesh Kumar`,
      })
    } else if (actionType === "reject") {
      setQueue(prev => prev.filter(x => x.id !== c.id))
      toast.error("FnF rejected", {
        description: `${c.employeeName} · returned to inputs pending`,
      })
    } else if (actionType === "info") {
      toast.info("Info requested", {
        description: `${c.employeeName} · ${actionComment}`,
      })
    }
    setActionTarget(null)
    setActionType(null)
    setActionComment("")
  }

  const handleBulkApprove = () => {
    if (selected.size === 0) {
      toast.error("Select at least one case to bulk approve.")
      return
    }
    setQueue(prev => prev.filter(x => !selected.has(x.id)))
    toast.success("Bulk approval completed", {
      description: `${selected.size} FnF cases approved by Rajesh Kumar`,
    })
    setSelected(new Set())
    setBulkOpen(false)
    setBulkComment("")
  }

  const clearFilters = () => { setEntityFilter("all"); setApproverFilter("all"); setStatusFilter("all"); setSearch("") }
  const hasFilters = entityFilter !== "all" || approverFilter !== "all" || statusFilter !== "all" || search

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-soft">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">FnF Approval</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Review &amp; approve full &amp; final settlements — single &amp; bulk approvals.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          disabled={selected.size === 0}
          onClick={() => setBulkOpen(true)}
          className="gap-1.5 shrink-0 bg-rose-600 hover:bg-rose-700 text-white"
        >
          <Users className="h-4 w-4" /> Bulk Approve ({selected.size})
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
                placeholder="Search by employee, case or exit ID…"
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
              <Select value={approverFilter} onValueChange={setApproverFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[200px]"><SelectValue placeholder="Pending With" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Approvers</SelectItem>
                  {APPROVERS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Calculation In Progress">Calculation In Progress</SelectItem>
                  <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>Showing {filtered.length} of {queue.length} cases</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>Clear filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Pending Approvals" value={stats.pending} icon={Clock} accent="rose" />
        <StatCard label="Approved Today" value={stats.approvedToday} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Rejected Today" value={stats.rejectedToday} icon={XCircle} accent="slate" />
        <StatCard label="Total Pending Amount" value={formatCurrencyShort(stats.totalPendingAmount)} icon={Coins} accent="pink" />
        <StatCard label="Avg Approval Time" value={`${stats.avgApprovalTime}d`} icon={TrendingUp} accent="cyan" />
      </div>

      {/* Approval workflow visualization */}
      <Card className="border border-rose-500/30 rounded-xl shadow-soft bg-gradient-to-br from-rose-500/5 to-pink-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Approval Workflow</p>
                <p className="text-[11px] text-muted-foreground">HR Head → Finance Head (2-level sequential)</p>
              </div>
            </div>
            <Badge variant="outline" className="border-rose-500/30 text-rose-700 dark:text-rose-400 text-[10px]">
              2-level · sequential
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { step: 1, role: "HR Head", person: "Anita Desai", status: "Verify employee & inputs", icon: ShieldCheck },
              { step: 2, role: "Finance Head", person: "Rajesh Kumar", status: "Verify calc & approve", icon: Coins },
              { step: 3, role: "Payment", person: "Auto-dispatch", status: "Move to FnF Payment", icon: ArrowRight },
            ].map((s, i, arr) => (
              <div key={s.step} className="flex items-center gap-2">
                <div className="flex-1 rounded-xl border border-border/60 bg-background/60 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      <s.icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Step {s.step} · {s.role}</p>
                      <p className="text-[10px] text-muted-foreground">{s.person}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{s.status}</p>
                </div>
                {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-rose-500 shrink-0 hidden sm:block" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approval queue table */}
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
              <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} className="gap-1.5">
                <Users className="h-3.5 w-3.5" /> Bulk Approve Selected
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
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exit Case</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Net Payable</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending With</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[140px]">SLA</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 opacity-40" />
                        <p className="text-sm">No approvals pending. All caught up!</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map(c => {
                  const sla = computeSla(c.calculatedAt || c.createdAt)
                  const pendingWith = c.status === "Calculation In Progress" ? APPROVERS[0] : APPROVERS[1]
                  return (
                    <TableRow key={c.id} className="hover:bg-rose-500/5 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={selected.has(c.id)}
                          onCheckedChange={() => toggleSelect(c.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white", avatarColor(c.employeeId))}>
                            {initials(c.employeeName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{c.employeeName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{c.employeeCode} · {c.designation}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{c.entity}</span></TableCell>
                      <TableCell><span className="text-xs font-medium text-foreground">{c.exitCaseId}</span></TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-bold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(c.netPayable)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{formatDate(c.calculatedAt || c.createdAt)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p className="font-medium text-foreground">{pendingWith.split(" (")[0]}</p>
                          <p className="text-muted-foreground">{pendingWith.match(/\((.*?)\)/)?.[1]}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[120px]">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className={cn("font-medium", sla.overdue ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground")}>
                              {sla.text}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", sla.overdue ? "bg-rose-500" : sla.pct > 70 ? "bg-amber-500" : "bg-emerald-500")}
                              style={{ width: `${sla.pct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="View" onClick={() => toast.info(`View case — ${c.employeeName}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-emerald-500/10 hover:text-emerald-700" title="Approve" onClick={() => openAction("approve", c)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-rose-500/10 hover:text-rose-700" title="Reject" onClick={() => openAction("reject", c)}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-amber-500/10 hover:text-amber-700" title="Request Info" onClick={() => openAction("info", c)}>
                            <Info className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Single action dialog */}
      <Dialog open={!!actionTarget} onOpenChange={(o) => { if (!o) { setActionTarget(null); setActionType(null); setActionComment("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" && <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
              {actionType === "reject" && <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
              {actionType === "info" && <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
              {actionType === "approve" ? "Approve FnF" : actionType === "reject" ? "Reject FnF" : "Request Info"}
            </DialogTitle>
            <DialogDescription>
              {actionTarget?.employeeName} · {actionTarget?.exitCaseId} · Net payable {actionTarget ? formatCurrency(actionTarget.netPayable) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 p-1">
            <Label className="text-xs">Comment {actionType !== "approve" && <span className="text-rose-500">*</span>}</Label>
            <Textarea
              value={actionComment}
              onChange={e => setActionComment(e.target.value)}
              placeholder={actionType === "approve" ? "Optional comment…" : "Provide a reason / what info is needed…"}
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setActionTarget(null); setActionType(null); setActionComment("") }}>Cancel</Button>
            <Button
              onClick={submitAction}
              className={cn(
                "gap-1.5 text-white",
                actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : actionType === "reject" ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700"
              )}
            >
              {actionType === "approve" ? <CheckCircle2 className="h-4 w-4" /> : actionType === "reject" ? <XCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
              Confirm {actionType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk approve dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                <Users className="h-4 w-4" />
              </div>
              Bulk Approve FnF Cases
            </DialogTitle>
            <DialogDescription>Review &amp; approve {selected.size} selected cases in one go.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <div className="p-1 space-y-3 pr-3">
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                <p className="text-xs text-muted-foreground mb-2">Selected Cases ({selected.size})</p>
                <div className="space-y-1.5">
                  {queue.filter(c => selected.has(c.id)).map(c => (
                    <div key={c.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md bg-background/60">
                      <div className="flex items-center gap-2">
                        <div className={cn("grid h-6 w-6 place-items-center rounded-full text-[9px] font-semibold text-white", avatarColor(c.employeeId))}>
                          {initials(c.employeeName)}
                        </div>
                        <span className="font-medium text-foreground">{c.employeeName}</span>
                        <span className="text-muted-foreground">· {c.exitCaseId}</span>
                      </div>
                      <span className="font-semibold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(c.netPayable)}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Total Net Payable</span>
                  <span className="font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                    {formatCurrency(queue.filter(c => selected.has(c.id)).reduce((s, c) => s + c.netPayable, 0))}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Approval Comment</Label>
                <Textarea
                  value={bulkComment}
                  onChange={e => setBulkComment(e.target.value)}
                  placeholder="Optional comment for all selected cases…"
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Approve {selected.size} Cases
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- helpers ----------
function isToday(d?: string | Date | null): boolean {
  if (!d) return false
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return false
  const now = new Date()
  return dt.getDate() === now.getDate() && dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
}

export default FnFApprovalSection
