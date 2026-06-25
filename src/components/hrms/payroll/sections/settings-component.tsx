"use client"

// =============================================================
// Payroll → Settings → Salary Component Settings
// Component ordering table + per-component toggles +
// Import Standard Components action.
// Slate accent.
// =============================================================

import * as React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Layers, Plus, ArrowUp, ArrowDown, Save, X, Download, FileSpreadsheet,
  Pencil, Check,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"

import {
  SalaryComponent, ComponentType, CalcType, COMPONENT_TYPE_COLORS,
} from "../shared"
import { SALARY_COMPONENTS } from "../data"

const TYPES: ComponentType[] = ["Earning", "Deduction", "Reimbursement", "Employer Contribution", "Statutory", "Informational"]
const CALC_TYPES: CalcType[] = ["Fixed", "Percentage", "Formula", "Slab", "Manual"]
const STANDARD_SETS = ["India Standard Components", "UAE Standard Components", "US Standard Components"]

interface EditForm {
  id?: string
  name: string
  code: string
  type: ComponentType
  calcType: CalcType
  value: number
  percentageOf: string
  formula: string
  description: string
  taxable: boolean
  statutory: boolean
  isActive: boolean
  payslipDisplay: boolean
}

const EMPTY: EditForm = {
  name: "", code: "", type: "Earning", calcType: "Fixed",
  value: 0, percentageOf: "", formula: "", description: "",
  taxable: false, statutory: false, isActive: true, payslipDisplay: true,
}

export function ComponentSettingsSection() {
  const [components, setComponents] = useState<SalaryComponent[]>(SALARY_COMPONENTS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [form, setForm] = useState<EditForm>(EMPTY)
  const [editing, setEditing] = useState<SalaryComponent | null>(null)

  function set<K extends keyof EditForm>(k: K, v: EditForm[K]) { setForm((p) => ({ ...p, [k]: v })) }
  function openAdd() { setForm(EMPTY); setEditing(null); setDialogOpen(true) }
  function openEdit(c: SalaryComponent) {
    setEditing(c)
    setForm({
      id: c.id, name: c.name, code: c.code, type: c.type, calcType: c.calcType,
      value: c.value || 0, percentageOf: c.percentageOf || "", formula: c.formula || "",
      description: c.description, taxable: c.taxable, statutory: c.statutory,
      isActive: c.isActive, payslipDisplay: c.payslipDisplay,
    })
    setDialogOpen(true)
  }

  function move(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= components.length) return
    const next = [...components]
    const a = next[idx]; const b = next[newIdx]
    next[idx] = { ...b, priority: a.priority }
    next[newIdx] = { ...a, priority: b.priority }
    next.sort((x, y) => x.priority - y.priority)
    setComponents(next)
    toast.info(`Reordered: ${a.name} moved ${dir === -1 ? "up" : "down"}`)
  }

  function toggleField(id: string, key: keyof SalaryComponent) {
    setComponents((prev) => prev.map((c) => c.id === id ? { ...c, [key]: !c[key as keyof SalaryComponent] } : c))
  }

  function save() {
    if (!form.name || !form.code) { toast.error("Name and code are required"); return }
    if (editing) {
      setComponents((prev) => prev.map((c) => c.id === editing.id ? { ...c, ...form } : c))
      toast.success(`Component "${form.name}" updated`)
    } else {
      const newC: SalaryComponent = {
        id: `cmp-${Date.now()}`, name: form.name, code: form.code, type: form.type,
        calcType: form.calcType, value: form.value, percentageOf: form.percentageOf || undefined,
        formula: form.formula || undefined, taxable: form.taxable, statutory: form.statutory,
        isActive: form.isActive, payslipDisplay: form.payslipDisplay, description: form.description,
        priority: components.length + 1,
      }
      setComponents((prev) => [...prev, newC])
      toast.success(`Component "${form.name}" created`)
    }
    setDialogOpen(false)
  }

  function importStandard(set: string) {
    toast.success(`Imported "${set}"`, { description: `${5 + Math.floor(Math.random() * 5)} new components added.` })
    setImportOpen(false)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Salary Component Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Configure components, ordering, and per-component behaviour.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
            <Download className="h-4 w-4" /> Import Standard
          </Button>
          <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Component
          </Button>
        </div>
      </div>

      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="hover:bg-transparent border-border/60">
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold w-10">Order</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[180px]">Component</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Code</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Type</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Calc</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Value</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold text-center">Taxable</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold text-center">Statutory</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold text-center">Payslip</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold text-center">Active</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.map((c, idx) => (
                  <TableRow key={c.id} className="border-border/40 hover:bg-slate-50/60 dark:hover:bg-slate-500/5 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground tabular-nums w-5">{c.priority}</span>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(idx, -1)} disabled={idx === 0}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(idx, 1)} disabled={idx === components.length - 1}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-foreground">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground">{c.description}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-foreground/80">{c.code}</TableCell>
                    <TableCell>
                      <Badge className={cn("border-0", COMPONENT_TYPE_COLORS[c.type])}>{c.type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-foreground/80">{c.calcType}</TableCell>
                    <TableCell className="text-xs text-foreground/80 tabular-nums">
                      {c.calcType === "Percentage" && c.percentageOf ? `${c.value || 0}% of ${c.percentageOf}` :
                       c.calcType === "Formula" ? c.formula || "—" :
                       c.calcType === "Fixed" ? `₹${c.value || 0}` :
                       c.calcType === "Slab" ? "Slab-based" : "Manual"}
                    </TableCell>
                    <TableCell className="text-center"><Switch checked={c.taxable} onCheckedChange={() => toggleField(c.id, "taxable")} className="data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" /></TableCell>
                    <TableCell className="text-center"><Switch checked={c.statutory} onCheckedChange={() => toggleField(c.id, "statutory")} className="data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" /></TableCell>
                    <TableCell className="text-center"><Switch checked={c.payslipDisplay} onCheckedChange={() => toggleField(c.id, "payslipDisplay")} className="data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" /></TableCell>
                    <TableCell className="text-center"><Switch checked={c.isActive} onCheckedChange={() => toggleField(c.id, "isActive")} className="data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs hover:bg-slate-500/10" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-slate-500/8 via-transparent to-transparent shrink-0">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              {editing ? "Edit Component" : "Add Component"}
            </DialogTitle>
            <DialogDescription className="text-xs">Define a salary component with calculation type and behaviour.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Name *"><Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-9" /></FormField>
              <FormField label="Code *"><Input value={form.code} onChange={(e) => set("code", e.target.value)} className="h-9" /></FormField>
              <FormField label="Type">
                <Select value={form.type} onValueChange={(v) => set("type", v as ComponentType)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Calculation Type">
                <Select value={form.calcType} onValueChange={(v) => set("calcType", v as CalcType)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{CALC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Value"><Input type="number" value={form.value} onChange={(e) => set("value", Number(e.target.value))} className="h-9" /></FormField>
              <FormField label="Percentage Of"><Input value={form.percentageOf} onChange={(e) => set("percentageOf", e.target.value)} placeholder="e.g. Basic" className="h-9" /></FormField>
              <FormField label="Formula" full><Input value={form.formula} onChange={(e) => set("formula", e.target.value)} placeholder="e.g. Basic + HRA" className="h-9" /></FormField>
              <FormField label="Description" full><Input value={form.description} onChange={(e) => set("description", e.target.value)} className="h-9" /></FormField>
              <Separator className="sm:col-span-2" />
              <ToggleRow label="Taxable" checked={form.taxable} onChange={(v) => set("taxable", v)} />
              <ToggleRow label="Statutory" checked={form.statutory} onChange={(v) => set("statutory", v)} />
              <ToggleRow label="Active" checked={form.isActive} onChange={(v) => set("isActive", v)} />
              <ToggleRow label="Payslip Display" checked={form.payslipDisplay} onChange={(v) => set("payslipDisplay", v)} />
            </div>
          </ScrollArea>
          <DialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/30 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDialogOpen(false)}><X className="h-4 w-4" /> Cancel</Button>
            <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white" onClick={save}><Save className="h-4 w-4" /> {editing ? "Save Changes" : "Create Component"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Standard Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Download className="h-4 w-4 text-slate-600 dark:text-slate-400" /> Import Standard Components
            </DialogTitle>
            <DialogDescription className="text-xs">Pre-built component sets for common payroll jurisdictions.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {STANDARD_SETS.map((s) => (
              <button key={s} onClick={() => importStandard(s)} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 hover:bg-background p-3 text-left transition-colors">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{s}</div>
                  <div className="text-xs text-muted-foreground">Includes Basic, HRA, Allowances, PF, ESI, TDS, Professional Tax</div>
                </div>
                <Check className="h-4 w-4 text-emerald-600 opacity-0" />
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FormField({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1.5", full && "sm:col-span-2")}>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {children}
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 hover:bg-background p-3 transition-colors cursor-pointer">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
    </label>
  )
}

export default ComponentSettingsSection
