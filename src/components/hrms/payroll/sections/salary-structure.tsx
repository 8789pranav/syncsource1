"use client"

// ============================================================================
//  Salary — Salary Structure (Task ID 3-a)
// ----------------------------------------------------------------------------
//  Manage salary structures: stats, table, structure editor dialog.
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  FileSpreadsheet, Plus, Search, Filter, MoreHorizontal, Eye, Pencil, Copy,
  Trash2, RefreshCw, CheckCircle2, Play, ArrowUp, ArrowDown, X, Plus as PlusIcon,
  Star, FileText,
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
  SalaryStructure, SalaryStructureComponent, CalcType,
  STATUS_COLORS, formatDate, formatCurrencyShort,
  EMPLOYEE_TYPES, GRADES,
} from "../shared"
import { SALARY_STRUCTURES, SALARY_COMPONENTS } from "../data"

// ---------- motion ----------
const gridContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const gridItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

// ---------- Stat tile ----------
function StatTile({ label, value, icon: Icon, accent, sub }: {
  label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>
  accent: "teal" | "cyan" | "emerald" | "amber"; sub?: string
}) {
  const map: Record<string, string> = {
    teal: "from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-400",
    cyan: "from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
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

const ALL_CALCS: CalcType[] = ["Fixed", "Percentage", "Formula", "Slab", "Manual"]

// ============================================================================
//  Structure editor dialog (large)
// ============================================================================
function StructureEditorDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: SalaryStructure | null }) {
  const [details, setDetails] = React.useState({
    name: "", code: "", description: "", entity: "", employeeType: "Full-Time",
    grade: "All", ctcFormula: "", monthlyCtcMin: "", monthlyCtcMax: "", effectiveFrom: new Date().toISOString().slice(0, 10),
  })
  const [components, setComponents] = React.useState<SalaryStructureComponent[]>([])

  React.useEffect(() => {
    if (editing) {
      setDetails({
        name: editing.name, code: editing.code, description: editing.description, entity: editing.entity,
        employeeType: editing.employeeType, grade: editing.grade || "All", ctcFormula: editing.ctcFormula,
        monthlyCtcMin: editing.monthlyCtcMin.toString(), monthlyCtcMax: editing.monthlyCtcMax.toString(),
        effectiveFrom: editing.effectiveFrom.slice(0, 10),
      })
      setComponents(editing.components.map(c => ({ ...c })))
    } else {
      setDetails({
        name: "", code: "", description: "", entity: "", employeeType: "Full-Time",
        grade: "All", ctcFormula: "", monthlyCtcMin: "", monthlyCtcMax: "", effectiveFrom: new Date().toISOString().slice(0, 10),
      })
      setComponents([])
    }
  }, [editing, open])

  const set = (k: string, v: string) => setDetails(d => ({ ...d, [k]: v }))

  const addComponent = (code: string) => {
    const comp = SALARY_COMPONENTS.find(c => c.code === code)
    if (!comp) return
    if (components.some(c => c.componentCode === code)) {
      toast.error("Component already added")
      return
    }
    setComponents(prev => [...prev, {
      componentCode: comp.code, componentName: comp.name, calcType: comp.calcType,
      value: comp.value, percentageOf: comp.percentageOf, formula: comp.formula, isMandatory: false,
    }])
  }

  const updateComp = (i: number, patch: Partial<SalaryStructureComponent>) => {
    setComponents(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }
  const removeComp = (i: number) => setComponents(prev => prev.filter((_, idx) => idx !== i))
  const moveUp = (i: number) => i > 0 && setComponents(prev => {
    const next = [...prev]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; return next
  })
  const moveDown = (i: number) => i < components.length - 1 && setComponents(prev => {
    const next = [...prev]; [next[i + 1], next[i]] = [next[i], next[i + 1]]; return next
  })

  const submit = () => {
    if (!details.name || !details.code || !details.entity) { toast.error("Name, code and entity are required"); return }
    if (components.length === 0) { toast.error("Add at least one component"); return }
    toast.success(editing ? "Structure updated" : "Structure created", { description: `${details.name} (${details.code})` })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            {editing ? "Edit Salary Structure" : "Create Salary Structure"}
          </DialogTitle>
          <DialogDescription>Define structure details on the left, manage components on the right.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0">
          {/* Left: details */}
          <ScrollArea className="lg:col-span-2 rounded-lg border border-border/60 p-3 max-h-[60vh] lg:max-h-none">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input value={details.name} onChange={e => set("name", e.target.value)} placeholder="India Full-Time Structure" className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Code *</Label>
                <Input value={details.code} onChange={e => set("code", e.target.value)} placeholder="IND_FT" className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea value={details.description} onChange={e => set("description", e.target.value)} rows={2} className="bg-background resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Entity *</Label>
                  <Select value={details.entity} onValueChange={v => set("entity", v)}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set(SALARY_STRUCTURES.map(s => s.entity))).map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Employee Type</Label>
                  <Select value={details.employeeType} onValueChange={v => set("employeeType", v)}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Grade</Label>
                  <Select value={details.grade} onValueChange={v => set("grade", v)}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Grades</SelectItem>
                      {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Effective From</Label>
                  <Input type="date" value={details.effectiveFrom} onChange={e => set("effectiveFrom", e.target.value)} className="bg-background" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Monthly CTC Min</Label>
                  <Input type="number" value={details.monthlyCtcMin} onChange={e => set("monthlyCtcMin", e.target.value)} className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Monthly CTC Max</Label>
                  <Input type="number" value={details.monthlyCtcMax} onChange={e => set("monthlyCtcMax", e.target.value)} className="bg-background" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CTC Formula</Label>
                <Textarea value={details.ctcFormula} onChange={e => set("ctcFormula", e.target.value)} rows={2} className="bg-background font-mono text-xs resize-none" placeholder="Basic + HRA + Special + Conveyance + Medical + Employer PF + Gratuity" />
              </div>
              {/* CTC preview */}
              {details.monthlyCtcMin && details.monthlyCtcMax && (
                <div className="rounded-lg border border-teal-500/30 bg-teal-50/40 dark:bg-teal-500/5 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">CTC Range Preview</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrencyShort(Number(details.monthlyCtcMin))} /mo — {formatCurrencyShort(Number(details.monthlyCtcMax))} /mo
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Annual: {formatCurrencyShort(Number(details.monthlyCtcMin) * 12)} — {formatCurrencyShort(Number(details.monthlyCtcMax) * 12)}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Right: components */}
          <div className="lg:col-span-3 rounded-lg border border-border/60 flex flex-col min-h-0">
            <div className="flex items-center justify-between p-3 border-b border-border/60 bg-muted/30">
              <div>
                <p className="text-xs font-semibold text-foreground">Components ({components.length})</p>
                <p className="text-[11px] text-muted-foreground">Add, reorder, and configure each component</p>
              </div>
              <Select value="" onValueChange={v => { if (v) addComponent(v) }}>
                <SelectTrigger className="h-8 w-44 text-xs bg-background">
                  <span className="flex items-center gap-1"><PlusIcon className="h-3 w-3" /> Add Component</span>
                </SelectTrigger>
                <SelectContent>
                  {SALARY_COMPONENTS.filter(c => !components.some(s => s.componentCode === c.code)).map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ScrollArea className="flex-1 max-h-[60vh] lg:max-h-[52vh]">
              <div className="p-3 space-y-2">
                {components.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No components added yet.</p>
                    <p className="text-xs text-muted-foreground/80">Use the "Add Component" dropdown above to add salary components.</p>
                  </div>
                ) : components.map((c, i) => (
                  <div key={i} className="rounded-lg border border-border/60 bg-background p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex flex-col">
                        <button onClick={() => moveUp(i)} disabled={i === 0} className="text-muted-foreground hover:text-teal-600 disabled:opacity-30">
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button onClick={() => moveDown(i)} disabled={i === components.length - 1} className="text-muted-foreground hover:text-teal-600 disabled:opacity-30">
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.componentName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{c.componentCode}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Label className="text-[10px] text-muted-foreground">Mandatory</Label>
                        <Switch checked={c.isMandatory} onCheckedChange={v => updateComp(i, { isMandatory: v })} />
                      </div>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-500" onClick={() => removeComp(i)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Calc Type</Label>
                        <Select value={c.calcType} onValueChange={v => updateComp(i, { calcType: v as CalcType })}>
                          <SelectTrigger className="h-7 text-xs bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ALL_CALCS.map(ct => <SelectItem key={ct} value={ct}>{ct}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {(c.calcType === "Fixed" || c.calcType === "Percentage") && (
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{c.calcType === "Fixed" ? "Value (₹)" : "Percent (%)"}</Label>
                          <Input type="number" value={c.value?.toString() || ""} onChange={e => updateComp(i, { value: Number(e.target.value) })} className="h-7 text-xs bg-background" />
                        </div>
                      )}
                      {c.calcType === "Percentage" && (
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">% Of</Label>
                          <Select value={c.percentageOf || ""} onValueChange={v => updateComp(i, { percentageOf: v })}>
                            <SelectTrigger className="h-7 text-xs bg-background"><SelectValue placeholder="Base" /></SelectTrigger>
                            <SelectContent>
                              {["CTC", "Basic", "Gross", "Net"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {c.calcType === "Formula" && (
                        <div className="space-y-1 col-span-2">
                          <Label className="text-[10px] text-muted-foreground">Formula</Label>
                          <Input value={c.formula || ""} onChange={e => updateComp(i, { formula: e.target.value })} className="h-7 text-xs bg-background font-mono" />
                        </div>
                      )}
                      {c.calcType === "Slab" && (
                        <div className="space-y-1 col-span-2 flex items-end">
                          <p className="text-[11px] text-muted-foreground italic">Slab-based — configured in compliance settings</p>
                        </div>
                      )}
                      {c.calcType === "Manual" && (
                        <div className="space-y-1 col-span-2 flex items-end">
                          <p className="text-[11px] text-muted-foreground italic">Manual entry per employee</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <Separator />
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <CheckCircle2 className="h-3.5 w-3.5" /> {editing ? "Save Changes" : "Create Structure"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Main component
// ============================================================================
export function SalaryStructureSection() {
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState({ entity: "all", status: "all" })
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SalaryStructure | null>(null)

  const entities = Array.from(new Set(SALARY_STRUCTURES.map(s => s.entity)))

  const filtered = React.useMemo(() => {
    let list = SALARY_STRUCTURES
    if (filters.entity !== "all") list = list.filter(s => s.entity === filters.entity)
    if (filters.status !== "all") list = list.filter(s => s.status === filters.status)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.entity.toLowerCase().includes(q))
    }
    return list
  }, [filters, search])

  const stats = {
    total: SALARY_STRUCTURES.length,
    active: SALARY_STRUCTURES.filter(s => s.status === "Active").length,
    default: SALARY_STRUCTURES.filter(s => s.isDefault).length,
    drafts: SALARY_STRUCTURES.filter(s => s.status === "Draft").length,
  }

  const openAdd = () => { setEditing(null); setEditorOpen(true) }
  const openEdit = (s: SalaryStructure) => { setEditing(s); setEditorOpen(true) }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-soft">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Salary Structure</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Define reusable CTC structures with component rules per entity & employee type.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => toast.info("Refreshed")} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          <Button size="sm" onClick={openAdd} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <Plus className="h-3.5 w-3.5" /> Add Structure
          </Button>
        </div>
      </div>

      {/* Stat row */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3" variants={gridContainer} initial="hidden" animate="show">
        <motion.div variants={gridItem}><StatTile label="Total Structures" value={stats.total} icon={FileSpreadsheet} accent="teal" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Active" value={stats.active} icon={CheckCircle2} accent="emerald" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Default" value={stats.default} icon={Star} accent="amber" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Drafts" value={stats.drafts} icon={FileText} accent="cyan" /></motion.div>
      </motion.div>

      {/* Filter bar */}
      <Card className="border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-teal-500" />
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search structures..." className="pl-9 h-9 bg-background" />
            </div>
            <Select value={filters.entity} onValueChange={v => setFilters({ ...filters, entity: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {["Draft", "Active", "Inactive"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                <TableHead className="min-w-[220px]">Name & Code</TableHead>
                <TableHead className="min-w-[160px]">Entity</TableHead>
                <TableHead className="min-w-[110px]">Employee Type</TableHead>
                <TableHead className="min-w-[80px]">Grade</TableHead>
                <TableHead className="min-w-[80px] text-center">Components</TableHead>
                <TableHead className="min-w-[140px] text-right">CTC Min / Max</TableHead>
                <TableHead className="min-w-[80px]">Default</TableHead>
                <TableHead className="min-w-[90px]">Status</TableHead>
                <TableHead className="min-w-[70px]">Version</TableHead>
                <TableHead className="min-w-[110px]">Effective From</TableHead>
                <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileSpreadsheet className="h-8 w-8 opacity-40" />
                      <p className="text-sm font-medium">No structures match your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.id} className="border-border/40 hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
                        <FileSpreadsheet className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{s.code}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[160px]">{s.entity}</span></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{s.employeeType}</Badge></TableCell>
                  <TableCell><span className="text-xs text-foreground">{s.grade || "All"}</span></TableCell>
                  <TableCell className="text-center text-sm tabular-nums">{s.components.length}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-xs text-foreground tabular-nums block">{formatCurrencyShort(s.monthlyCtcMin)}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{formatCurrencyShort(s.monthlyCtcMax)}</span>
                  </TableCell>
                  <TableCell>
                    {s.isDefault ? <Badge variant="secondary" className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400 gap-1"><Star className="h-3 w-3" /> Yes</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[11px] border-0", STATUS_COLORS[s.status])}>{s.status}</Badge>
                  </TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">v{s.version}</span></TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{formatDate(s.effectiveFrom)}</span></TableCell>
                  <TableCell className="text-right pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => openEdit(s)}><Eye className="h-3.5 w-3.5 mr-2" /> Preview / Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.success("Structure cloned", { description: s.name })}><Copy className="h-3.5 w-3.5 mr-2" /> Clone</DropdownMenuItem>
                        {s.status !== "Active" && (
                          <DropdownMenuItem onClick={() => toast.success("Structure activated", { description: s.name })}>
                            <Play className="h-3.5 w-3.5 mr-2" /> Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-rose-600 dark:text-rose-400" onClick={() => toast.success("Structure deleted", { description: s.name })}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
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

      <StructureEditorDialog open={editorOpen} onClose={() => setEditorOpen(false)} editing={editing} />
    </div>
  )
}

export default SalaryStructureSection
