"use client"

// ============================================================================
//  FnF Inputs — earnings & deductions inputs for FnF settlement cases
//  Rose/pink accents. Filter, stats, table, add manual input, auto-fetch.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Inbox, RefreshCw, Search, Filter, Plus, Building2, Pencil, Trash2,
  Database, TrendingUp, TrendingDown, Coins, Layers, Wallet,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
import type { FnFEntry, FnFCase } from "../shared"
import { initials, avatarColor, formatCurrency, formatCurrencyShort } from "../shared"

// ---------- flattened input row ----------
interface FnFInputRow extends FnFEntry {
  rowId: string
  caseId: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  department: string
}

function flattenFnFInputs(cases: FnFCase[]): FnFInputRow[] {
  const rows: FnFInputRow[] = []
  cases.forEach(c => {
    ;[...c.earnings, ...c.deductions].forEach((e, i) => {
      rows.push({
        ...e,
        rowId: `${c.id}-${e.code}-${i}`,
        caseId: c.id,
        employeeId: c.employeeId,
        employeeName: c.employeeName,
        employeeCode: c.employeeCode,
        entity: c.entity,
        department: c.department,
      })
    })
  })
  return rows
}

const ACCENT_MAP: Record<string, { grad: string; text: string; ring: string }> = {
  rose:    { grad: "from-rose-500/15 to-pink-500/5",     text: "text-rose-600 dark:text-rose-400",     ring: "ring-rose-500/20" },
  cyan:    { grad: "from-cyan-500/15 to-teal-500/5",     text: "text-cyan-600 dark:text-cyan-400",     ring: "ring-cyan-500/20" },
  amber:   { grad: "from-amber-500/15 to-orange-500/5",  text: "text-amber-600 dark:text-amber-400",   ring: "ring-amber-500/20" },
  emerald: { grad: "from-emerald-500/15 to-teal-500/5",  text: "text-emerald-600 dark:text-emerald-400",ring: "ring-emerald-500/20" },
  teal:    { grad: "from-teal-500/15 to-cyan-500/5",     text: "text-teal-600 dark:text-teal-400",     ring: "ring-teal-500/20" },
  slate:   { grad: "from-slate-500/15 to-slate-500/5",   text: "text-slate-600 dark:text-slate-400",   ring: "ring-slate-500/20" },
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
export function FnFInputsSection() {
  const [inputs, setInputs] = useState<FnFInputRow[]>(() => flattenFnFInputs(FNF_CASES))
  const [entityFilter, setEntityFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    caseId: "",
    category: "Earning" as "Earning" | "Deduction",
    name: "",
    code: "",
    amount: "",
    description: "",
  })

  const entityOptions = useMemo(() => Array.from(new Set(inputs.map(i => i.entity))), [inputs])
  const caseOptions = useMemo(() => FNF_CASES.map(c => ({ id: c.id, label: `${c.employeeName} · ${c.id}` })), [])

  const filtered = useMemo(() => {
    return inputs.filter(r => {
      if (entityFilter !== "all" && r.entity !== entityFilter) return false
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false
      if (statusFilter !== "all") {
        // status = source for inputs demo
        if (statusFilter === "Pending" && r.source !== "Manual") return false
        if (statusFilter === "Fetched" && r.source !== "Auto") return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        return r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.caseId.toLowerCase().includes(q)
      }
      return true
    })
  }, [inputs, entityFilter, sourceFilter, categoryFilter, statusFilter, search])

  const stats = useMemo(() => {
    const total = inputs.length
    const auto = inputs.filter(i => i.source === "Auto").length
    const manual = inputs.filter(i => i.source === "Manual").length
    const earnings = inputs.filter(i => i.category === "Earning").length
    const deductions = inputs.filter(i => i.category === "Deduction").length
    const pendingFetch = FNF_CASES.filter(c => c.earnings.length === 0 && c.deductions.length === 0).length
    return { total, auto, manual, earnings, deductions, pendingFetch }
  }, [inputs])

  const handleAddManual = () => {
    if (!addForm.caseId || !addForm.name || !addForm.code || !addForm.amount) {
      toast.error("Please fill in case, name, code and amount.")
      return
    }
    const amt = Number(addForm.amount)
    if (Number.isNaN(amt) || amt <= 0) {
      toast.error("Amount must be a positive number.")
      return
    }
    const fnfCase = FNF_CASES.find(c => c.id === addForm.caseId)
    if (!fnfCase) return
    const newRow: FnFInputRow = {
      rowId: `manual-${Date.now()}`,
      name: addForm.name,
      code: addForm.code,
      amount: amt,
      source: "Manual",
      category: addForm.category,
      description: addForm.description,
      caseId: addForm.caseId,
      employeeId: fnfCase.employeeId,
      employeeName: fnfCase.employeeName,
      employeeCode: fnfCase.employeeCode,
      entity: fnfCase.entity,
      department: fnfCase.department,
    }
    setInputs(prev => [newRow, ...prev])
    toast.success("Manual input added", {
      description: `${addForm.name} (${addForm.code}) — ${formatCurrency(amt)} for ${fnfCase.employeeName}`,
    })
    setAddOpen(false)
    setAddForm({ caseId: "", category: "Earning", name: "", code: "", amount: "", description: "" })
  }

  const handleDelete = (row: FnFInputRow) => {
    setInputs(prev => prev.filter(r => r.rowId !== row.rowId))
    toast.success("Input deleted", { description: `${row.name} removed from ${row.employeeName}` })
  }

  const handleRefetch = (row: FnFInputRow) => {
    toast.success("Input re-fetched", { description: `${row.name} for ${row.employeeName} re-synced from source system.` })
  }

  const handleAutoFetchAll = () => {
    toast.success("Auto-fetch all triggered", {
      description: "Re-syncing payroll, leave, gratuity, notice, loan & asset inputs for all open cases.",
    })
  }

  const clearFilters = () => {
    setEntityFilter("all"); setSourceFilter("all"); setCategoryFilter("all")
    setStatusFilter("all"); setSearch("")
  }
  const hasFilters = entityFilter !== "all" || sourceFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all" || search

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-soft">
            <Inbox className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">FnF Inputs</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Auto-fetched &amp; manual earnings/deductions feeding each FnF calculation.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={handleAutoFetchAll} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Auto-Fetch All
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
            <Plus className="h-4 w-4" /> Add Manual Input
          </Button>
        </div>
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
                placeholder="Search by employee, case, input name or code…"
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:items-center">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[160px]"><SelectValue placeholder="Entity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[140px]"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="Auto">Auto</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Earning">Earning</SelectItem>
                  <SelectItem value="Deduction">Deduction</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Fetched">Fetched</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>Showing {filtered.length} of {inputs.length} inputs</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>Clear filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Inputs" value={stats.total} icon={Layers} accent="rose" />
        <StatCard label="Auto-Fetched" value={stats.auto} icon={Database} accent="cyan" />
        <StatCard label="Manual" value={stats.manual} icon={Pencil} accent="amber" />
        <StatCard label="Earnings" value={stats.earnings} icon={TrendingUp} accent="emerald" />
        <StatCard label="Deductions" value={stats.deductions} icon={TrendingDown} accent="rose" />
        <StatCard label="Pending Fetch" value={stats.pendingFetch} icon={RefreshCw} accent="slate" />
      </div>

      {/* Inputs table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px] rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 sticky top-0 z-10">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Employee</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">FnF Case</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Input Name</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Code</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Amount</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Description</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Inbox className="h-8 w-8 opacity-40" />
                        <p className="text-sm">No inputs match your filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.rowId} className="hover:bg-rose-500/5 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white", avatarColor(r.employeeId))}>
                          {initials(r.employeeName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.employeeName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{r.employeeCode} · {r.department}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-xs font-medium text-foreground">{r.caseId}</span></TableCell>
                    <TableCell><span className="text-sm text-foreground font-medium">{r.name}</span></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] font-mono">{r.code}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(
                        "font-medium border-0 text-[10px]",
                        r.category === "Earning"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                      )}>
                        {r.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-sm font-semibold tabular-nums",
                        r.category === "Earning"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-rose-700 dark:text-rose-400"
                      )}>
                        {formatCurrency(r.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[10px] font-medium",
                        r.source === "Auto"
                          ? "border-sky-300 text-sky-700 dark:text-sky-300"
                          : "border-rose-300 text-rose-700 dark:text-rose-300"
                      )}>
                        {r.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground line-clamp-1">{r.description || "—"}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit" onClick={() => toast.info(`Edit input — ${r.name}`, { description: `For ${r.employeeName}` })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Refetch" onClick={() => handleRefetch(r)}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-400" title="Delete" onClick={() => handleDelete(r)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add manual input dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                <Plus className="h-4 w-4" />
              </div>
              Add Manual Input
            </DialogTitle>
            <DialogDescription>Add a manual earning or deduction input for an FnF case.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-1 space-y-4 pr-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">FnF Case / Employee</Label>
                  <Select value={addForm.caseId} onValueChange={v => setAddForm(f => ({ ...f, caseId: v }))}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select case…" /></SelectTrigger>
                    <SelectContent>
                      {caseOptions.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Category</Label>
                  <Select value={addForm.category} onValueChange={v => setAddForm(f => ({ ...f, category: v as "Earning" | "Deduction" }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Earning">Earning</SelectItem>
                      <SelectItem value="Deduction">Deduction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Input Name</Label>
                  <Input
                    value={addForm.name}
                    onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Performance Bonus"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Code</Label>
                  <Input
                    value={addForm.code}
                    onChange={e => setAddForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. BONUS"
                    className="h-10 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input
                    value={addForm.amount}
                    onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0"
                    type="number"
                    min={0}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={addForm.description}
                  onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description / reference…"
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddManual} className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
              <Plus className="h-4 w-4" /> Add Input
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FnFInputsSection
