"use client"

// ============================================================================
//  Asset & Loan Recovery — deduct outstanding assets/loans during FnF
//  Rose/pink accents. Tabs (Asset / Loan), filter, stats, table, add dialog.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Package, Landmark, Search, Filter, Plus, Eye, CheckCircle2, Clock,
  Coins, Layers, TrendingDown, Building2,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

import { FNF_CASES } from "../data"
import { initials, avatarColor, formatCurrency, formatCurrencyShort, STATUS_COLORS } from "../shared"

type RecoveryType = "Asset" | "Loan"

interface AssetLoanRecovery {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  department: string
  recoveryType: RecoveryType
  description: string
  referenceId: string
  amount: number
  status: "Pending" | "Approved" | "Recovered" | "Disputed"
  fnfCaseId: string
  createdAt: string
}

// Synthesize ~8 records mixing asset & loan
const RECOVERIES: AssetLoanRecovery[] = [
  { id: "ar-1", employeeId: "EMP-1190", employeeName: "Pooja Iyer", employeeCode: "EMP-1190", entity: "ACME India Pvt Ltd", department: "Customer Success", recoveryType: "Asset", description: "Laptop (MacBook Pro 13\") — damaged screen", referenceId: "ASSET-LP-2031", amount: 8500, status: "Approved", fnfCaseId: "fnf-1", createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: "ar-2", employeeId: "EMP-1190", employeeName: "Pooja Iyer", employeeCode: "EMP-1190", entity: "ACME India Pvt Ltd", department: "Customer Success", recoveryType: "Loan", description: "Personal loan outstanding — 5 EMIs pending", referenceId: "LOAN-LI-2024-018", amount: 25000, status: "Approved", fnfCaseId: "fnf-1", createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: "ar-3", employeeId: "EMP-1185", employeeName: "Rahul Verma", employeeCode: "EMP-1185", entity: "ACME India Pvt Ltd", department: "Engineering", recoveryType: "Asset", description: "Mobile phone — not returned", referenceId: "ASSET-MB-1198", amount: 5000, status: "Recovered", fnfCaseId: "fnf-2", createdAt: new Date(Date.now() - 28 * 86400000).toISOString() },
  { id: "ar-4", employeeId: "EMP-1170", employeeName: "Amit Saxena", employeeCode: "EMP-1170", entity: "ACME India Pvt Ltd", department: "Sales", recoveryType: "Loan", description: "Salary advance outstanding", referenceId: "LOAN-SA-2025-007", amount: 18000, status: "Recovered", fnfCaseId: "fnf-5", createdAt: new Date(Date.now() - 100 * 86400000).toISOString() },
  { id: "ar-5", employeeId: "EMP-1180", employeeName: "Suresh Babu", employeeCode: "EMP-1180", entity: "ACME India Pvt Ltd", department: "Operations", recoveryType: "Asset", description: "Headphones + Keyboard set", referenceId: "ASSET-AC-0821", amount: 2200, status: "Pending", fnfCaseId: "fnf-3", createdAt: new Date(Date.now() - 50 * 86400000).toISOString() },
  { id: "ar-6", employeeId: "EMP-1175", employeeName: "Kavya Menon", employeeCode: "EMP-1175", entity: "ACME India Pvt Ltd", department: "Marketing", recoveryType: "Asset", description: "Camera (Canon EOS) — for marketing use", referenceId: "ASSET-CM-0302", amount: 12500, status: "Disputed", fnfCaseId: "fnf-4", createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "ar-7", employeeId: "EMP-2005", employeeName: "Mohammed Ali", employeeCode: "EMP-2005", entity: "ACME UAE LLC", department: "Sales", recoveryType: "Asset", description: "iPad Air — for client demos", referenceId: "ASSET-IP-0410", amount: 1800, status: "Pending", fnfCaseId: "fnf-6", createdAt: new Date(Date.now() - 6 * 86400000).toISOString() },
  { id: "ar-8", employeeId: "EMP-1190", employeeName: "Pooja Iyer", employeeCode: "EMP-1190", entity: "ACME India Pvt Ltd", department: "Customer Success", recoveryType: "Loan", description: "Travel advance unadjusted", referenceId: "LOAN-TA-2025-014", amount: 4200, status: "Pending", fnfCaseId: "fnf-1", createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
]

const RECOVERY_EMP_OPTIONS = FNF_CASES.map(c => ({
  id: c.employeeId,
  name: c.employeeName,
  code: c.employeeCode,
  entity: c.entity,
  dept: c.department,
  fnfCaseId: c.id,
}))

const ACCENT_MAP: Record<string, { grad: string; text: string; ring: string }> = {
  rose:    { grad: "from-rose-500/15 to-pink-500/5",     text: "text-rose-600 dark:text-rose-400",     ring: "ring-rose-500/20" },
  amber:   { grad: "from-amber-500/15 to-orange-500/5",  text: "text-amber-600 dark:text-amber-400",   ring: "ring-amber-500/20" },
  emerald: { grad: "from-emerald-500/15 to-teal-500/5",  text: "text-emerald-600 dark:text-emerald-400",ring: "ring-emerald-500/20" },
  teal:    { grad: "from-teal-500/15 to-cyan-500/5",     text: "text-teal-600 dark:text-teal-400",     ring: "ring-teal-500/20" },
  slate:   { grad: "from-slate-500/15 to-slate-500/5",   text: "text-slate-600 dark:text-slate-400",   ring: "ring-slate-500/20" },
  pink:    { grad: "from-pink-500/15 to-rose-500/5",     text: "text-pink-600 dark:text-pink-400",     ring: "ring-pink-500/20" },
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
export function AssetLoanRecoverySection() {
  const [records, setRecords] = useState<AssetLoanRecovery[]>(RECOVERIES)
  const [activeTab, setActiveTab] = useState<"all" | "Asset" | "Loan">("all")
  const [entityFilter, setEntityFilter] = useState("all")
  const [deptFilter, setDeptFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({
    empId: "",
    recoveryType: "Asset" as RecoveryType,
    description: "",
    referenceId: "",
    amount: "",
  })

  const entityOptions = useMemo(() => Array.from(new Set(records.map(r => r.entity))), [records])
  const deptOptions = useMemo(() => Array.from(new Set(records.map(r => r.department))), [records])

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (activeTab !== "all" && r.recoveryType !== activeTab) return false
      if (entityFilter !== "all" && r.entity !== entityFilter) return false
      if (deptFilter !== "all" && r.department !== deptFilter) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.referenceId.toLowerCase().includes(q) ||
          r.fnfCaseId.toLowerCase().includes(q)
      }
      return true
    })
  }, [records, activeTab, entityFilter, deptFilter, statusFilter, search])

  const stats = useMemo(() => {
    const total = records.length
    const assetCount = records.filter(r => r.recoveryType === "Asset").length
    const loanCount = records.filter(r => r.recoveryType === "Loan").length
    const pending = records.filter(r => r.status === "Pending").length
    const totalAmount = records.reduce((s, r) => s + r.amount, 0)
    return { total, assetCount, loanCount, pending, totalAmount }
  }, [records])

  const handleAdd = () => {
    if (!form.empId || !form.description || !form.referenceId || !form.amount) {
      toast.error("Please fill in all fields.")
      return
    }
    const amt = Number(form.amount)
    if (Number.isNaN(amt) || amt <= 0) {
      toast.error("Amount must be a positive number.")
      return
    }
    const emp = RECOVERY_EMP_OPTIONS.find(e => e.id === form.empId)
    if (!emp) return
    const newRec: AssetLoanRecovery = {
      id: `ar-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeCode: emp.code,
      entity: emp.entity,
      department: emp.dept,
      recoveryType: form.recoveryType,
      description: form.description,
      referenceId: form.referenceId,
      amount: amt,
      status: "Pending",
      fnfCaseId: emp.fnfCaseId,
      createdAt: new Date().toISOString(),
    }
    setRecords(prev => [newRec, ...prev])
    toast.success(`${form.recoveryType} recovery added`, {
      description: `${emp.name} · ${form.referenceId} · ${formatCurrency(amt)}`,
    })
    setAddOpen(false)
    setForm({ empId: "", recoveryType: "Asset", description: "", referenceId: "", amount: "" })
  }

  const handleApprove = (r: AssetLoanRecovery) => {
    setRecords(prev => prev.map(x => x.id === r.id ? { ...x, status: "Approved" as const } : x))
    toast.success("Recovery approved", { description: `${r.employeeName} · ${formatCurrency(r.amount)}` })
  }

  const clearFilters = () => { setEntityFilter("all"); setDeptFilter("all"); setStatusFilter("all"); setSearch("") }
  const hasFilters = entityFilter !== "all" || deptFilter !== "all" || statusFilter !== "all" || search

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-soft">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Asset &amp; Loan Recovery</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Deduct outstanding assets &amp; loans from FnF settlement.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 shrink-0 bg-rose-600 hover:bg-rose-700 text-white">
          <Plus className="h-4 w-4" /> Add Recovery
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
                placeholder="Search by employee, reference ID or description…"
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
                  <SelectItem value="Disputed">Disputed</SelectItem>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Recoveries" value={stats.total} icon={Layers} accent="rose" />
        <StatCard label="Asset Recoveries" value={stats.assetCount} icon={Package} accent="pink" />
        <StatCard label="Loan Recoveries" value={stats.loanCount} icon={Landmark} accent="amber" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} accent="slate" />
        <StatCard label="Total Amount" value={formatCurrencyShort(stats.totalAmount)} icon={Coins} accent="teal" />
      </div>

      {/* Tabs + table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
            <TabsList className="bg-muted/60">
              <TabsTrigger value="all" className="gap-1.5 data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                <Layers className="h-3.5 w-3.5" /> All ({records.length})
              </TabsTrigger>
              <TabsTrigger value="Asset" className="gap-1.5 data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                <Package className="h-3.5 w-3.5" /> Asset Recovery ({stats.assetCount})
              </TabsTrigger>
              <TabsTrigger value="Loan" className="gap-1.5 data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                <Landmark className="h-3.5 w-3.5" /> Loan Recovery ({stats.loanCount})
              </TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              <ScrollArea className="max-h-[640px] rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 sticky top-0 z-10">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Employee</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity / Dept</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[220px]">Description</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reference ID</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Amount</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Package className="h-8 w-8 opacity-40" />
                            <p className="text-sm">No recoveries match your filters.</p>
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
                              <p className="text-[11px] text-muted-foreground truncate">{r.employeeCode} · {r.fnfCaseId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <p className="font-medium text-foreground truncate max-w-[140px]">{r.entity}</p>
                            <p className="text-muted-foreground">{r.department}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(
                            "font-medium border-0 text-[10px] gap-1",
                            r.recoveryType === "Asset"
                              ? "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                          )}>
                            {r.recoveryType === "Asset" ? <Package className="h-3 w-3" /> : <Landmark className="h-3 w-3" />}
                            {r.recoveryType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-foreground line-clamp-2">{r.description}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-mono">{r.referenceId}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-bold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(r.amount)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium border-0 text-[10px]", STATUS_COLORS[r.status] || "")}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="View" onClick={() => toast.info(`View recovery — ${r.employeeName}`)}>
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add recovery dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                <Plus className="h-4 w-4" />
              </div>
              Add Recovery
            </DialogTitle>
            <DialogDescription>Add an asset or loan recovery record for an FnF case.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-1 space-y-4 pr-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Employee</Label>
                  <Select value={form.empId} onValueChange={v => setForm(f => ({ ...f, empId: v }))}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select employee…" /></SelectTrigger>
                    <SelectContent>
                      {RECOVERY_EMP_OPTIONS.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name} · {e.code} · {e.fnfCaseId}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Recovery Type</Label>
                  <Select value={form.recoveryType} onValueChange={v => setForm(f => ({ ...f, recoveryType: v as RecoveryType }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asset">Asset Recovery</SelectItem>
                      <SelectItem value="Loan">Loan Recovery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs">Reference ID (Asset ID / Loan ID)</Label>
                  <Input
                    value={form.referenceId}
                    onChange={e => setForm(f => ({ ...f, referenceId: e.target.value.toUpperCase() }))}
                    placeholder={form.recoveryType === "Asset" ? "e.g. ASSET-LP-2031" : "e.g. LOAN-LI-2024-018"}
                    className="h-10 font-mono"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description of the asset / loan being recovered…"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    type="number" min={0}
                    placeholder="0"
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
              <Plus className="h-4 w-4" /> Add Recovery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AssetLoanRecoverySection
