"use client"

// =============================================================
// Payroll → Settings → Salary Structure Settings
// Structure list with default flags per entity / employee-type.
// Global rules: auto-assign on join, change requires approval,
// versioning policy.
// Slate accent.
// =============================================================

import * as React from "react"
import { useState } from "react"
import { toast } from "sonner"
import {
  FileSpreadsheet, Star, CheckCircle2, Save, X, Plus, Pencil, ShieldCheck,
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

import { SalaryStructure, ENTITIES, EMPLOYEE_TYPES, STATUS_COLORS, formatDate } from "../shared"
import { SALARY_STRUCTURES } from "../data"

interface GlobalRules {
  autoAssignOnJoin: boolean
  changeRequiresApproval: boolean
  versioningPolicy: string
}

export function StructureSettingsSection() {
  const [structures, setStructures] = useState<SalaryStructure[]>(SALARY_STRUCTURES)
  const [rules, setRules] = useState<GlobalRules>({
    autoAssignOnJoin: true,
    changeRequiresApproval: true,
    versioningPolicy: "Major.Minor (auto-increment on edit)",
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<Partial<SalaryStructure>>({})
  const [editing, setEditing] = useState<SalaryStructure | null>(null)

  function openAdd() {
    setEditing(null)
    setForm({ name: "", code: "", entity: ENTITIES[0].name, employeeType: "Full-Time", ctcFormula: "Basic + HRA + Special Allowance", monthlyCtcMin: 0, monthlyCtcMax: 0, status: "Draft", isDefault: false })
    setDialogOpen(true)
  }
  function openEdit(s: SalaryStructure) {
    setEditing(s)
    setForm({ ...s })
    setDialogOpen(true)
  }
  function setField<K extends keyof SalaryStructure>(k: K, v: SalaryStructure[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }
  function save() {
    if (!form.name || !form.code) { toast.error("Name and code are required"); return }
    if (editing) {
      setStructures((prev) => prev.map((s) => s.id === editing.id ? { ...s, ...form } as SalaryStructure : s))
      toast.success(`Structure "${form.name}" updated`)
    } else {
      const newS: SalaryStructure = {
        id: `str-${Date.now()}`, name: form.name!, code: form.code!,
        description: "", entity: form.entity!, employeeType: form.employeeType!,
        grade: form.grade, components: [], ctcFormula: form.ctcFormula || "",
        monthlyCtcMin: form.monthlyCtcMin || 0, monthlyCtcMax: form.monthlyCtcMax || 0,
        isDefault: form.isDefault || false, status: form.status || "Draft", version: 1,
        effectiveFrom: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }
      setStructures((prev) => [...prev, newS])
      toast.success(`Structure "${form.name}" created`)
    }
    setDialogOpen(false)
  }
  function toggleDefault(id: string) {
    setStructures((prev) => prev.map((s) => {
      if (s.id === id) return { ...s, isDefault: !s.isDefault }
      // un-default other structures for the same entity+employeeType
      const target = prev.find((x) => x.id === id)
      if (target && s.entity === target.entity && s.employeeType === target.employeeType && s.id !== id) {
        return { ...s, isDefault: false }
      }
      return s
    }))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Salary Structure Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Manage salary structures and entity-wide assignment rules.</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Structure
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Structure list */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl border-border/60 shadow-soft">
            <CardContent className="p-0">
              <ScrollArea className="max-h-[640px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow className="hover:bg-transparent border-border/60">
                      {["Structure", "Code", "Entity", "Employee Type", "Grade", "CTC Range", "Components", "Version", "Default", "Status", "Effective", "Actions"].map((h) => (
                        <TableHead key={h} className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {structures.map((s) => (
                      <TableRow key={s.id} className="border-border/40 hover:bg-slate-50/60 dark:hover:bg-slate-500/5 transition-colors">
                        <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">{s.name}</TableCell>
                        <TableCell className="text-xs font-mono text-foreground/80">{s.code}</TableCell>
                        <TableCell className="text-xs text-foreground/90">{s.entity}</TableCell>
                        <TableCell className="text-xs text-foreground/90">{s.employeeType}</TableCell>
                        <TableCell className="text-xs text-foreground/90">{s.grade || "—"}</TableCell>
                        <TableCell className="text-xs text-foreground/80 tabular-nums whitespace-nowrap">
                          {s.monthlyCtcMin.toLocaleString("en-IN")} – {s.monthlyCtcMax.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-xs text-foreground/90 tabular-nums">{s.components.length}</TableCell>
                        <TableCell className="text-xs text-foreground/90">v{s.version}</TableCell>
                        <TableCell>
                          <button onClick={() => toggleDefault(s.id)} className="inline-flex">
                            {s.isDefault ? (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-0 gap-1 cursor-pointer">
                                <Star className="h-3 w-3" /> Default
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="cursor-pointer text-muted-foreground">Set Default</Badge>
                            )}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("font-medium border-0", STATUS_COLORS[s.status] || STATUS_COLORS.Draft)}>{s.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{formatDate(s.effectiveFrom)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs hover:bg-slate-500/10" onClick={() => openEdit(s)}>
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
        </div>

        {/* Global rules */}
        <div className="flex flex-col gap-4">
          <Card className="rounded-xl border-border/60 shadow-soft">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Global Rules</h3>
                  <p className="text-xs text-muted-foreground">Tenant-wide defaults for structure lifecycle.</p>
                </div>
              </div>
              <Separator />
              <ToggleRow label="Auto-assign on Join" description="Auto-assign the default structure when an employee joins." checked={rules.autoAssignOnJoin} onChange={(v) => setRules((r) => ({ ...r, autoAssignOnJoin: v }))} />
              <ToggleRow label="Change Requires Approval" description="Structure edits must be approved before activation." checked={rules.changeRequiresApproval} onChange={(v) => setRules((r) => ({ ...r, changeRequiresApproval: v }))} />
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">Versioning Policy</Label>
                <Select value={rules.versioningPolicy} onValueChange={(v) => setRules((r) => ({ ...r, versioningPolicy: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Major.Minor (auto-increment on edit)", "Manual version bump", "Auto-version every change", "Quarterly snapshots"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white mt-1" onClick={() => toast.success("Global rules saved")}>
                <Save className="h-4 w-4" /> Save Rules
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/60 shadow-soft bg-muted/20">
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-foreground mb-2">Default Flags Per Entity / Type</div>
              <div className="flex flex-col gap-1.5 text-xs">
                {structures.filter((s) => s.isDefault).map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-foreground font-medium">{s.name}</span>
                    <span className="text-muted-foreground">→ {s.entity} · {s.employeeType}</span>
                  </div>
                ))}
                {structures.filter((s) => s.isDefault).length === 0 && (
                  <p className="text-muted-foreground italic">No defaults set.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-slate-500/8 via-transparent to-transparent shrink-0">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              {editing ? "Edit Structure" : "Add Structure"}
            </DialogTitle>
            <DialogDescription className="text-xs">Configure structure metadata. Components are added on the structure detail page.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Name *"><Input value={form.name || ""} onChange={(e) => setField("name", e.target.value)} className="h-9" /></FormField>
              <FormField label="Code *"><Input value={form.code || ""} onChange={(e) => setField("code", e.target.value)} className="h-9" /></FormField>
              <FormField label="Entity">
                <Select value={form.entity || ""} onValueChange={(v) => setField("entity", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{ENTITIES.map((e) => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Employee Type">
                <Select value={form.employeeType || ""} onValueChange={(v) => setField("employeeType", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{EMPLOYEE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Grade (optional)"><Input value={form.grade || ""} onChange={(e) => setField("grade", e.target.value)} className="h-9" placeholder="G1, M2, etc." /></FormField>
              <FormField label="Status">
                <Select value={form.status || ""} onValueChange={(v) => setField("status", v as SalaryStructure["status"])}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Draft", "Active", "Inactive"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="CTC Min (Monthly)" full><Input type="number" value={form.monthlyCtcMin || 0} onChange={(e) => setField("monthlyCtcMin", Number(e.target.value))} className="h-9" /></FormField>
              <FormField label="CTC Max (Monthly)" full><Input type="number" value={form.monthlyCtcMax || 0} onChange={(e) => setField("monthlyCtcMax", Number(e.target.value))} className="h-9" /></FormField>
              <FormField label="CTC Formula" full><Input value={form.ctcFormula || ""} onChange={(e) => setField("ctcFormula", e.target.value)} className="h-9" /></FormField>
              <ToggleRow label="Default for Entity / Employee Type" checked={!!form.isDefault} onChange={(v) => setField("isDefault", v)} />
            </div>
          </ScrollArea>
          <DialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/30 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDialogOpen(false)}><X className="h-4 w-4" /> Cancel</Button>
            <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white" onClick={save}><Save className="h-4 w-4" /> {editing ? "Save Changes" : "Create Structure"}</Button>
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

function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 hover:bg-background p-3 transition-colors cursor-pointer sm:col-span-2">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5 data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
    </label>
  )
}

export default StructureSettingsSection
