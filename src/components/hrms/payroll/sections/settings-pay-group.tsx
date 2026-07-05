"use client"

// =============================================================
// Payroll → Settings → Pay Group Settings
// Lists PAY_GROUPS with edit capability and entity-defaults grid.
// Slate accent.
// =============================================================

import * as React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Users, Plus, Pencil, Save, X, CheckCircle2, Star, Building2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  PayGroup, PAYROLL_FREQUENCIES, ENTITIES, CURRENCIES, STATUS_COLORS,
} from "../shared"
import { PAY_GROUPS, SALARY_STRUCTURES } from "../data"

const STRUCTURE_OPTIONS = SALARY_STRUCTURES.map((s) => s.name)

interface EditForm {
  id?: string
  name: string
  code: string
  entity: string
  frequency: string
  payrollMonth: string
  payDate: string
  currency: string
  defaultStructure: string
  status: "Active" | "Inactive"
  isDefault: boolean
}

const EMPTY: EditForm = {
  name: "", code: "", entity: ENTITIES[0].name, frequency: "Monthly",
  payrollMonth: "1st to 31st", payDate: "Last Working Day", currency: "INR",
  defaultStructure: STRUCTURE_OPTIONS[0] || "", status: "Active", isDefault: false,
}

export function PayGroupSettingsSection() {
  const [groups, setGroups] = useState<PayGroup[]>(PAY_GROUPS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<EditForm>(EMPTY)
  const [editing, setEditing] = useState<PayGroup | null>(null)

  function openAdd() { setForm(EMPTY); setEditing(null); setDialogOpen(true) }
  function openEdit(g: PayGroup) {
    setEditing(g)
    setForm({
      id: g.id, name: g.name, code: g.code, entity: g.entity,
      frequency: g.frequency, payrollMonth: g.payrollMonth, payDate: g.payDate,
      currency: g.currency, defaultStructure: STRUCTURE_OPTIONS[0] || "",
      status: g.status, isDefault: g.isDefault,
    })
    setDialogOpen(true)
  }
  function set<K extends keyof EditForm>(k: K, v: EditForm[K]) { setForm((p) => ({ ...p, [k]: v })) }

  function save() {
    if (!form.name || !form.code) { toast.error("Name and code are required"); return }
    if (editing) {
      setGroups((prev) => prev.map((g) => g.id === editing.id ? { ...g, ...form } : g))
      toast.success(`Pay group "${form.name}" updated`)
    } else {
      const newG: PayGroup = {
        id: `pg-${Date.now()}`, name: form.name, code: form.code,
        description: "", entity: form.entity, frequency: form.frequency,
        payrollMonth: form.payrollMonth, payDate: form.payDate, currency: form.currency,
        status: form.status, employeeCount: 0, isDefault: form.isDefault,
        createdAt: new Date().toISOString(),
      }
      setGroups((prev) => [...prev, newG])
      toast.success(`Pay group "${form.name}" created`)
    }
    setDialogOpen(false)
  }

  const entityDefaults = ENTITIES.map((e) => {
    const def = groups.find((g) => g.entity === e.name && g.isDefault)
    return { entity: e.name, default: def }
  })

  return (
    <div className="flex flex-col gap-5">
      <Header />
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Pay Groups</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{groups.length} pay groups across {ENTITIES.length} entities.</p>
            </div>
            <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Pay Group
            </Button>
          </div>
          <ScrollArea className="max-h-[640px] overflow-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="hover:bg-transparent border-border/60">
                  {["Name", "Code", "Entity", "Frequency", "Payroll Month", "Pay Date", "Currency", "Default Structure", "Employees", "Default", "Status", "Actions"].map((h) => (
                    <TableHead key={h} className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g) => (
                  <TableRow key={g.id} className="border-border/40 hover:bg-slate-50/60 dark:hover:bg-slate-500/5 transition-colors">
                    <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">{g.name}</TableCell>
                    <TableCell className="text-xs text-foreground/80 font-mono whitespace-nowrap">{g.code}</TableCell>
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{g.entity}</TableCell>
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{g.frequency}</TableCell>
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{g.payrollMonth}</TableCell>
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{g.payDate}</TableCell>
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{g.currency}</TableCell>
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{STRUCTURE_OPTIONS[0] || "—"}</TableCell>
                    <TableCell className="text-xs text-foreground/90 tabular-nums whitespace-nowrap">{g.employeeCount}</TableCell>
                    <TableCell>
                      {g.isDefault ? (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-0 gap-1">
                          <Star className="h-3 w-3" /> Default
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("font-medium border-0", STATUS_COLORS[g.status] || STATUS_COLORS.Inactive)}>{g.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs hover:bg-slate-500/10" onClick={() => openEdit(g)}>
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

      {/* Entity defaults grid */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Global Defaults — Per Entity</h3>
              <p className="text-xs text-muted-foreground">The default pay group automatically used when no entity-specific group is assigned.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {entityDefaults.map(({ entity, default: def }) => (
              <div key={entity} className="rounded-lg border border-border/60 bg-background/60 p-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{entity}</div>
                {def ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-foreground">{def.name}</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic mt-1">No default set</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-slate-500/8 via-transparent to-transparent shrink-0">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              {editing ? "Edit Pay Group" : "Add Pay Group"}
            </DialogTitle>
            <DialogDescription className="text-xs">Configure a pay group with frequency, pay date and default salary structure.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Name *"><Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-9" /></FormField>
              <FormField label="Code *"><Input value={form.code} onChange={(e) => set("code", e.target.value)} className="h-9" /></FormField>
              <FormField label="Entity">
                <Select value={form.entity} onValueChange={(v) => set("entity", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{ENTITIES.map((e) => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Frequency">
                <Select value={form.frequency} onValueChange={(v) => set("frequency", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYROLL_FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Payroll Month"><Input value={form.payrollMonth} onChange={(e) => set("payrollMonth", e.target.value)} className="h-9" /></FormField>
              <FormField label="Pay Date"><Input value={form.payDate} onChange={(e) => set("payDate", e.target.value)} className="h-9" /></FormField>
              <FormField label="Currency">
                <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Default Salary Structure">
                <Select value={form.defaultStructure} onValueChange={(v) => set("defaultStructure", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{STRUCTURE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Status">
                <Select value={form.status} onValueChange={(v) => set("status", v as EditForm["status"])}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Active", "Inactive"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3 sm:col-span-2 cursor-pointer">
                <div>
                  <div className="text-sm font-medium text-foreground">Default for Entity</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Use this pay group as the entity default.</div>
                </div>
                <Switch checked={form.isDefault} onCheckedChange={(v) => set("isDefault", v)} className="data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
              </label>
            </div>
          </ScrollArea>
          <DialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/30 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDialogOpen(false)}><X className="h-4 w-4" /> Cancel</Button>
            <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white" onClick={save}><Save className="h-4 w-4" /> {editing ? "Save Changes" : "Create Pay Group"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Header() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
      <div className="flex items-start gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Pay Group Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage pay groups and their entity-level defaults.</p>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {children}
    </div>
  )
}

export default PayGroupSettingsSection
