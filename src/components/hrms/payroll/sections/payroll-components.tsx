"use client"

// ============================================================================
//  Salary — Payroll Components (Task ID 3-a)
// ----------------------------------------------------------------------------
//  Manage salary components (earnings, deductions, statutory, etc.).
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Layers, Plus, Search, Filter, MoreHorizontal, Eye, Pencil, Trash2, Copy,
  RefreshCw, CheckCircle2, Calculator, Coins, ShieldCheck, Receipt, Info,
  Percent, Hash, Sigma, Hand, X,
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
  SalaryComponent, ComponentType, CalcType, COMPONENT_TYPE_COLORS,
} from "../shared"
import { SALARY_COMPONENTS } from "../data"

// ---------- Calc type icons ----------
const CALC_ICON: Record<CalcType, React.ComponentType<{ className?: string }>> = {
  Fixed: Hash,
  Percentage: Percent,
  Formula: Sigma,
  Slab: Calculator,
  Manual: Hand,
}
const CALC_COLOR: Record<CalcType, string> = {
  Fixed: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Percentage: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  Formula: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Slab: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Manual: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
}

const TYPE_ICON: Record<ComponentType, React.ComponentType<{ className?: string }>> = {
  Earning: Coins,
  Deduction: Receipt,
  Reimbursement: Receipt,
  "Employer Contribution": ShieldCheck,
  Statutory: ShieldCheck,
  Informational: Info,
}

const ALL_TYPES: ComponentType[] = ["Earning", "Deduction", "Reimbursement", "Employer Contribution", "Statutory", "Informational"]
const ALL_CALCS: CalcType[] = ["Fixed", "Percentage", "Formula", "Slab", "Manual"]

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
//  Add/Edit Component dialog
// ============================================================================
function ComponentDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: SalaryComponent | null }) {
  const [form, setForm] = React.useState({
    name: "", code: "", type: "Earning" as ComponentType, calcType: "Fixed" as CalcType,
    value: "", percentageOf: "", formula: "", description: "",
    taxable: false, statutory: false, isActive: true, payslipDisplay: true, priority: "1",
  })

  React.useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name, code: editing.code, type: editing.type, calcType: editing.calcType,
        value: editing.value?.toString() || "", percentageOf: editing.percentageOf || "", formula: editing.formula || "",
        description: editing.description, taxable: editing.taxable, statutory: editing.statutory,
        isActive: editing.isActive, payslipDisplay: editing.payslipDisplay, priority: editing.priority.toString(),
      })
    } else {
      setForm({
        name: "", code: "", type: "Earning", calcType: "Fixed",
        value: "", percentageOf: "", formula: "", description: "",
        taxable: false, statutory: false, isActive: true, payslipDisplay: true, priority: "1",
      })
    }
  }, [editing, open])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const submit = () => {
    if (!form.name || !form.code) { toast.error("Name and code are required"); return }
    toast.success(editing ? "Component updated" : "Component created", { description: `${form.name} (${form.code})` })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" /> {editing ? "Edit Component" : "Add Component"}
          </DialogTitle>
          <DialogDescription>Define a salary component with calculation rules.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-2">
          <div className="grid sm:grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Basic" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Code *</Label>
              <Input value={form.code} onChange={e => set("code", e.target.value)} placeholder="BASIC" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type *</Label>
              <Select value={form.type} onValueChange={v => set("type", v as ComponentType)}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Calc Type *</Label>
              <Select value={form.calcType} onValueChange={v => set("calcType", v as CalcType)}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_CALCS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(form.calcType === "Fixed" || form.calcType === "Percentage") && (
              <div className="space-y-1.5">
                <Label className="text-xs">{form.calcType === "Fixed" ? "Value (₹)" : "Percentage (%)"}</Label>
                <Input type="number" value={form.value} onChange={e => set("value", e.target.value)} placeholder="0" className="bg-background" />
              </div>
            )}
            {form.calcType === "Percentage" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Percentage Of</Label>
                <Select value={form.percentageOf} onValueChange={v => set("percentageOf", v)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select base" /></SelectTrigger>
                  <SelectContent>
                    {["CTC", "Basic", "Gross", "Net"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.calcType === "Formula" && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Formula</Label>
                <Textarea value={form.formula} onChange={e => set("formula", e.target.value)} rows={3} placeholder="CTC - Basic - HRA - PF - Gratuity - Bonus" className="bg-background font-mono text-xs resize-none" />
                <p className="text-[10px] text-muted-foreground">Use component codes in formula expressions. Reference available: BASIC, HRA, CTC, GROSS, NET, PF_EMP, PF_EMR, etc.</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Input type="number" value={form.priority} onChange={e => set("priority", e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} className="bg-background resize-none" placeholder="Brief description..." />
            </div>
            <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Taxable</Label>
                <Switch checked={form.taxable} onCheckedChange={v => set("taxable", v)} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Statutory</Label>
                <Switch checked={form.statutory} onCheckedChange={v => set("statutory", v)} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Active</Label>
                <Switch checked={form.isActive} onCheckedChange={v => set("isActive", v)} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Payslip</Label>
                <Switch checked={form.payslipDisplay} onCheckedChange={v => set("payslipDisplay", v)} />
              </div>
            </div>
          </div>
        </ScrollArea>
        <Separator />
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <CheckCircle2 className="h-3.5 w-3.5" /> {editing ? "Save Changes" : "Create Component"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Main component
// ============================================================================
export function PayrollComponentsSection() {
  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<ComponentType | "all">("all")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SalaryComponent | null>(null)

  const filtered = React.useMemo(() => {
    let list = SALARY_COMPONENTS
    if (typeFilter !== "all") list = list.filter(c => c.type === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
    }
    return list.sort((a, b) => a.priority - b.priority)
  }, [typeFilter, search])

  const stats = {
    total: SALARY_COMPONENTS.length,
    earnings: SALARY_COMPONENTS.filter(c => c.type === "Earning").length,
    deductions: SALARY_COMPONENTS.filter(c => c.type === "Deduction").length,
    statutory: SALARY_COMPONENTS.filter(c => c.type === "Statutory").length,
    employer: SALARY_COMPONENTS.filter(c => c.type === "Employer Contribution").length,
    reimb: SALARY_COMPONENTS.filter(c => c.type === "Reimbursement").length,
  }

  const openAdd = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (c: SalaryComponent) => { setEditing(c); setDialogOpen(true) }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-soft">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Payroll Components</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Define earnings, deductions, statutory & employer contribution components.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => toast.info("Refreshed")} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          <Button size="sm" onClick={openAdd} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <Plus className="h-3.5 w-3.5" /> Add Component
          </Button>
        </div>
      </div>

      {/* Stat row */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" variants={gridContainer} initial="hidden" animate="show">
        <motion.div variants={gridItem}><StatTile label="Total" value={stats.total} icon={Layers} accent="teal" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Earnings" value={stats.earnings} icon={Coins} accent="emerald" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Deductions" value={stats.deductions} icon={Receipt} accent="rose" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Statutory" value={stats.statutory} icon={ShieldCheck} accent="amber" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Employer" value={stats.employer} icon={ShieldCheck} accent="violet" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Reimbursements" value={stats.reimb} icon={Receipt} accent="cyan" /></motion.div>
      </motion.div>

      {/* Type filter pills + search */}
      <Card className="border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-teal-500" />
              {(["all", ...ALL_TYPES] as const).map(t => {
                const active = typeFilter === t
                const count = t === "all" ? SALARY_COMPONENTS.length : SALARY_COMPONENTS.filter(c => c.type === t).length
                return (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-all border",
                      active
                        ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-transparent shadow-sm"
                        : "bg-background text-muted-foreground border-border/60 hover:bg-muted/40 hover:text-foreground"
                    )}
                  >
                    {t === "all" ? "All" : t} <span className={cn("ml-1", active ? "opacity-80" : "text-muted-foreground/70")}>({count})</span>
                  </button>
                )
              })}
            </div>
            <div className="relative w-full lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search components..." className="pl-9 h-9 bg-background" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/60 rounded-xl shadow-soft overflow-hidden">
        <ScrollArea className="max-h-[640px]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur z-10">
              <TableRow className="hover:bg-muted/40">
                <TableHead className="min-w-[220px]">Name & Code</TableHead>
                <TableHead className="min-w-[140px]">Type</TableHead>
                <TableHead className="min-w-[120px]">Calc Type</TableHead>
                <TableHead className="min-w-[180px]">Value / % / Formula</TableHead>
                <TableHead className="min-w-[80px]">Taxable</TableHead>
                <TableHead className="min-w-[80px]">Statutory</TableHead>
                <TableHead className="min-w-[80px]">Active</TableHead>
                <TableHead className="min-w-[80px]">Payslip</TableHead>
                <TableHead className="min-w-[60px] text-right">Priority</TableHead>
                <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Layers className="h-8 w-8 opacity-40" />
                      <p className="text-sm font-medium">No components match your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map(c => {
                const TypeIcon = TYPE_ICON[c.type]
                const CalcIcon = CALC_ICON[c.calcType]
                return (
                  <TableRow key={c.id} className="border-border/40 hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", COMPONENT_TYPE_COLORS[c.type])}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{c.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-[11px] border-0", COMPONENT_TYPE_COLORS[c.type])}>{c.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium", CALC_COLOR[c.calcType])}>
                        <CalcIcon className="h-3 w-3" /> {c.calcType}
                      </span>
                    </TableCell>
                    <TableCell>
                      {c.calcType === "Fixed" && <span className="text-xs font-medium text-foreground tabular-nums">₹{c.value?.toLocaleString("en-IN")}</span>}
                      {c.calcType === "Percentage" && <span className="text-xs font-medium text-foreground">{c.value}% of {c.percentageOf}</span>}
                      {c.calcType === "Formula" && <span className="text-[11px] text-muted-foreground font-mono truncate block max-w-[180px]">{c.formula}</span>}
                      {c.calcType === "Slab" && <span className="text-xs text-muted-foreground">Slab-based</span>}
                      {c.calcType === "Manual" && <span className="text-xs text-muted-foreground">Manual entry</span>}
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-xs font-medium", c.taxable ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>{c.taxable ? "Yes" : "No"}</span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-xs font-medium", c.statutory ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>{c.statutory ? "Yes" : "No"}</span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1 text-xs", c.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", c.isActive ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-xs font-medium", c.payslipDisplay ? "text-foreground" : "text-muted-foreground")}>{c.payslipDisplay ? "Yes" : "No"}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{c.priority}</TableCell>
                    <TableCell className="text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => toast.info(`View ${c.name}`)}><Eye className="h-3.5 w-3.5 mr-2" /> View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.success("Component cloned", { description: c.name })}><Copy className="h-3.5 w-3.5 mr-2" /> Clone</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 dark:text-rose-400" onClick={() => toast.success("Component deleted", { description: c.name })}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
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
      </Card>

      <ComponentDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} />
    </div>
  )
}

export default PayrollComponentsSection
