"use client"

// =============================================================
// Statutory Setup — Payroll / Compliance #2
// Compliance rules table + 5-step Add wizard + country presets.
// Emerald/teal theme.
// =============================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  ShieldCheck, Plus, Search, MoreHorizontal, Pencil, Copy,
  Power, Check, X, Globe, IndianRupee, PiggyBank, HeartPulse,
  Landmark, Wallet, Banknote, Gift, ArrowRight, ArrowLeft,
  Building2, Code, FileText, Sparkles,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

import { COMPLIANCE_RULES } from "../data"
import type { ComplianceRule } from "../shared"
import {
  initials, avatarColor, STATUS_COLORS,
} from "../shared"

// ---------- Country presets ----------
const COUNTRY_PRESETS = [
  { code: "India", name: "India Standard", flag: "🇮🇳", pf: true, esi: true, pt: true, lwf: true, tds: true, gratuity: true, bonus: true },
  { code: "United Arab Emirates", name: "UAE WPS", flag: "🇦🇪", pf: false, esi: false, pt: false, lwf: false, tds: false, gratuity: true, bonus: false },
  { code: "United States", name: "US Federal", flag: "🇺🇸", pf: false, esi: false, pt: false, lwf: false, tds: true, gratuity: false, bonus: false },
  { code: "Singapore", name: "Singapore CPF", flag: "🇸🇬", pf: false, esi: false, pt: false, lwf: false, tds: false, gratuity: false, bonus: false },
]

const WIZARD_STEPS = [
  { id: 1, label: "Basic", icon: Building2 },
  { id: 2, label: "PF Settings", icon: PiggyBank },
  { id: 3, label: "ESI Settings", icon: HeartPulse },
  { id: 4, label: "PT / LWF", icon: Landmark },
  { id: 5, label: "Tax / Gratuity / Bonus", icon: IndianRupee },
]

// ---------- Applicability cell ----------
function ApplicableIcon({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
      <Check className="h-3 w-3" />
    </span>
  ) : (
    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground">
      <X className="h-3 w-3" />
    </span>
  )
}

// ---------- Wizard ----------
interface WizardState {
  name: string; code: string; entity: string; country: string;
  pfApplicable: boolean; pfRate: number; pensionRate: number;
  esiApplicable: boolean; esiRate: number; esiWageCeiling: number;
  ptApplicable: boolean; ptAmount: number;
  lwfApplicable: boolean; lwfRate: number;
  tdsApplicable: boolean;
  gratuityApplicable: boolean;
  bonusApplicable: boolean;
  isDefault: boolean;
}

const initialWizard: WizardState = {
  name: "", code: "", entity: "", country: "India",
  pfApplicable: true, pfRate: 12, pensionRate: 8.33,
  esiApplicable: true, esiRate: 3.25, esiWageCeiling: 21000,
  ptApplicable: true, ptAmount: 200,
  lwfApplicable: true, lwfRate: 0.2,
  tdsApplicable: true,
  gratuityApplicable: true,
  bonusApplicable: true,
  isDefault: false,
}

// ---------- Component ----------
export function StatutorySetupSection() {
  const [rules, setRules] = useState<ComplianceRule[]>(COMPLIANCE_RULES)
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WizardState>(initialWizard)

  const entityOptions = useMemo(
    () => Array.from(new Set(rules.map((r) => r.entity))),
    [rules],
  )

  const filtered = useMemo(() => {
    return rules.filter((r) => {
      if (entityFilter !== "all" && r.entity !== entityFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!(r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.country.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [rules, search, entityFilter])

  // Wizard handlers
  function openWizard() {
    setForm(initialWizard)
    setStep(1)
    setWizardOpen(true)
  }
  function applyPreset(country: string) {
    const p = COUNTRY_PRESETS.find((x) => x.code === country)
    if (!p) return
    setForm((f) => ({
      ...f,
      country: p.code,
      pfApplicable: p.pf, esiApplicable: p.esi, ptApplicable: p.pt,
      lwfApplicable: p.lwf, tdsApplicable: p.tds,
      gratuityApplicable: p.gratuity, bonusApplicable: p.bonus,
    }))
    toast.success(`${p.name} preset applied`)
  }
  function nextStep() { setStep((s) => Math.min(5, s + 1)) }
  function prevStep() { setStep((s) => Math.max(1, s - 1)) }
  function saveRule() {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and Code are required")
      return
    }
    const newRule: ComplianceRule = {
      id: "cr-" + (rules.length + 1),
      name: form.name, code: form.code,
      entity: form.entity || entityOptions[0] || "ACME India Pvt Ltd",
      country: form.country,
      pfApplicable: form.pfApplicable, esiApplicable: form.esiApplicable,
      ptApplicable: form.ptApplicable, lwfApplicable: form.lwfApplicable,
      tdsApplicable: form.tdsApplicable,
      gratuityApplicable: form.gratuityApplicable,
      bonusApplicable: form.bonusApplicable,
      pfRate: form.pfRate, pensionRate: form.pensionRate,
      esiRate: form.esiRate, esiWageCeiling: form.esiWageCeiling,
      ptAmount: form.ptAmount, lwfRate: form.lwfRate,
      status: "Active", isDefault: form.isDefault,
    }
    setRules((r) => [newRule, ...r])
    toast.success(`Compliance rule "${form.name}" created`)
    setWizardOpen(false)
  }

  function editRule(r: ComplianceRule) {
    setForm({
      name: r.name, code: r.code, entity: r.entity, country: r.country,
      pfApplicable: r.pfApplicable, pfRate: r.pfRate, pensionRate: r.pensionRate,
      esiApplicable: r.esiApplicable, esiRate: r.esiRate, esiWageCeiling: r.esiWageCeiling,
      ptApplicable: r.ptApplicable, ptAmount: r.ptAmount,
      lwfApplicable: r.lwfApplicable, lwfRate: r.lwfRate,
      tdsApplicable: r.tdsApplicable,
      gratuityApplicable: r.gratuityApplicable,
      bonusApplicable: r.bonusApplicable,
      isDefault: r.isDefault,
    })
    setStep(1)
    setWizardOpen(true)
  }
  function cloneRule(r: ComplianceRule) {
    const clone = { ...r, id: "cr-" + (rules.length + 1), name: r.name + " (Copy)", code: r.code + "_COPY", isDefault: false, status: "Inactive" as const }
    setRules((prev) => [clone, ...prev])
    toast.success(`Cloned "${r.name}"`)
  }
  function toggleStatus(r: ComplianceRule) {
    setRules((prev) => prev.map((x) => x.id === r.id ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" } : x))
    toast.success(`${r.name} ${r.status === "Active" ? "deactivated" : "activated"}`)
  }

  // ---------- Stat tiles ----------
  const totalRules = rules.length
  const activeRules = rules.filter((r) => r.status === "Active").length
  const defaultRules = rules.filter((r) => r.isDefault).length
  const countries = new Set(rules.map((r) => r.country)).size

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-primary-foreground shadow-soft">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Statutory Setup</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Configure country-specific statutory compliance — PF, ESI, PT, LWF, TDS, Gratuity &amp; Bonus applicability per entity.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openWizard} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
          <Plus className="h-4 w-4" /> Add Compliance Rule
        </Button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Rules", value: totalRules, icon: ShieldCheck, color: "from-emerald-500/10 to-emerald-500/5 text-emerald-600" },
          { label: "Active Rules", value: activeRules, icon: Power, color: "from-teal-500/10 to-teal-500/5 text-teal-600" },
          { label: "Default Rules", value: defaultRules, icon: Sparkles, color: "from-amber-500/10 to-amber-500/5 text-amber-600" },
          { label: "Countries", value: countries, icon: Globe, color: "from-cyan-500/10 to-cyan-500/5 text-cyan-600" },
        ].map((s) => (
          <Card key={s.label} className="border-border/60 shadow-soft overflow-hidden">
            <CardContent className={cn("p-4 bg-gradient-to-br", s.color)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <p className="text-2xl font-semibold mt-1 text-foreground tabular-nums">{s.value}</p>
                </div>
                <s.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Country presets quick bar */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-foreground">Country Preset Templates</h3>
            <span className="text-xs text-muted-foreground">— click to pre-fill the wizard</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {COUNTRY_PRESETS.map((p) => (
              <button
                key={p.code}
                onClick={() => { applyPreset(p.code); setWizardOpen(true) }}
                className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card hover:border-emerald-500/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <span className="text-2xl">{p.flag}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.code}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filter bar */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, code or country..."
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="h-9 w-[200px] bg-background text-sm">
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  {entityOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => { setSearch(""); setEntityFilter("all") }} className="gap-1.5">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Name / Code</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Country</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">PF</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">ESI</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">PT</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">LWF</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">TDS</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Grat</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Bonus</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PF Rate</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ESI Rate</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PT Amt</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Default</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white text-xs font-semibold", avatarColor(r.id))}>
                          {initials(r.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate font-mono">{r.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground/80">{r.entity}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium text-xs">{r.country}</Badge>
                    </TableCell>
                    <TableCell className="text-center"><ApplicableIcon value={r.pfApplicable} /></TableCell>
                    <TableCell className="text-center"><ApplicableIcon value={r.esiApplicable} /></TableCell>
                    <TableCell className="text-center"><ApplicableIcon value={r.ptApplicable} /></TableCell>
                    <TableCell className="text-center"><ApplicableIcon value={r.lwfApplicable} /></TableCell>
                    <TableCell className="text-center"><ApplicableIcon value={r.tdsApplicable} /></TableCell>
                    <TableCell className="text-center"><ApplicableIcon value={r.gratuityApplicable} /></TableCell>
                    <TableCell className="text-center"><ApplicableIcon value={r.bonusApplicable} /></TableCell>
                    <TableCell className="text-sm tabular-nums">{r.pfRate ? `${r.pfRate}%` : "—"}</TableCell>
                    <TableCell className="text-sm tabular-nums">{r.esiRate ? `${r.esiRate}%` : "—"}</TableCell>
                    <TableCell className="text-sm tabular-nums">{r.ptAmount ? `₹${r.ptAmount}` : "—"}</TableCell>
                    <TableCell>
                      {r.isDefault ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 text-xs">Default</Badge>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_COLORS[r.status])}>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => editRule(r)} className="gap-2 text-xs">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => cloneRule(r)} className="gap-2 text-xs">
                            <Copy className="h-3.5 w-3.5" /> Clone
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(r)} className="gap-2 text-xs">
                            <Power className="h-3.5 w-3.5" /> {r.status === "Active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-xs text-rose-600" onClick={() => toast.info("Delete is disabled in demo")}>
                            <X className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-10 text-sm text-muted-foreground">
                      No compliance rules match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Wizard dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-border/60">
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Add Compliance Rule
            </DialogTitle>
            <DialogDescription className="text-xs">
              5-step wizard — configure basic info, PF, ESI, PT/LWF and Tax settings.
            </DialogDescription>
          </DialogHeader>

          {/* Stepper */}
          <div className="px-5 py-3 border-b border-border/60 bg-muted/30">
            <div className="flex items-center justify-between gap-1">
              {WIZARD_STEPS.map((s, i) => {
                const isActive = step === s.id
                const isDone = step > s.id
                return (
                  <React.Fragment key={s.id}>
                    <div className={cn("flex items-center gap-2", isActive ? "text-emerald-600 dark:text-emerald-400" : isDone ? "text-emerald-600/70" : "text-muted-foreground")}>
                      <div className={cn(
                        "grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold border",
                        isActive ? "border-emerald-500 bg-emerald-500 text-white" : isDone ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "border-border bg-background",
                      )}>
                        {isDone ? <Check className="h-3.5 w-3.5" /> : s.id}
                      </div>
                      <span className="text-xs font-medium hidden sm:inline">{s.label}</span>
                    </div>
                    {i < WIZARD_STEPS.length - 1 && (
                      <div className={cn("h-px flex-1 mx-1", step > s.id ? "bg-emerald-500/40" : "bg-border")} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          <ScrollArea className="max-h-[55vh]">
            <div className="p-5 space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  {step === 1 && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Rule Name <span className="text-rose-500">*</span></Label>
                          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. India Standard Compliance" className="h-9" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Rule Code <span className="text-rose-500">*</span></Label>
                          <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. IND_STD" className="h-9 font-mono" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Entity</Label>
                          <Select value={form.entity || entityOptions[0]} onValueChange={(v) => setForm({ ...form, entity: v })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select entity" /></SelectTrigger>
                            <SelectContent>
                              {entityOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Country</Label>
                          <Select value={form.country} onValueChange={(v) => applyPreset(v)}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {COUNTRY_PRESETS.map((p) => <SelectItem key={p.code} value={p.code}>{p.flag} {p.code}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Set as Default</p>
                          <p className="text-xs text-muted-foreground">Use as the default rule for this entity</p>
                        </div>
                        <Switch checked={form.isDefault} onCheckedChange={(v) => setForm({ ...form, isDefault: v })} />
                      </div>
                      <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-500/20 p-3">
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" /> Tip: Pick a country above to auto-apply preset statutory applicability.
                        </p>
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                        <div className="flex items-center gap-2">
                          <PiggyBank className="h-4 w-4 text-emerald-600" />
                          <div>
                            <p className="text-sm font-medium text-foreground">PF Applicable</p>
                            <p className="text-xs text-muted-foreground">Employee Provident Fund</p>
                          </div>
                        </div>
                        <Switch checked={form.pfApplicable} onCheckedChange={(v) => setForm({ ...form, pfApplicable: v })} />
                      </div>
                      <div className={cn("grid grid-cols-2 gap-3 transition-opacity", !form.pfApplicable && "opacity-40 pointer-events-none")}>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">PF Rate (%)</Label>
                          <Input type="number" step="0.01" value={form.pfRate} onChange={(e) => setForm({ ...form, pfRate: parseFloat(e.target.value) || 0 })} className="h-9" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Pension Rate (%)</Label>
                          <Input type="number" step="0.01" value={form.pensionRate} onChange={(e) => setForm({ ...form, pensionRate: parseFloat(e.target.value) || 0 })} className="h-9" />
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/40 border border-border/60 p-3 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">Standard India PF</p>
                        Employee: 12% of Basic · Employer: 3.67% to PF + 8.33% to Pension (capped at ₹15,000 wage).
                      </div>
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                        <div className="flex items-center gap-2">
                          <HeartPulse className="h-4 w-4 text-teal-600" />
                          <div>
                            <p className="text-sm font-medium text-foreground">ESI Applicable</p>
                            <p className="text-xs text-muted-foreground">Employee State Insurance</p>
                          </div>
                        </div>
                        <Switch checked={form.esiApplicable} onCheckedChange={(v) => setForm({ ...form, esiApplicable: v })} />
                      </div>
                      <div className={cn("grid grid-cols-2 gap-3 transition-opacity", !form.esiApplicable && "opacity-40 pointer-events-none")}>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">ESI Rate (%) — Total</Label>
                          <Input type="number" step="0.01" value={form.esiRate} onChange={(e) => setForm({ ...form, esiRate: parseFloat(e.target.value) || 0 })} className="h-9" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Wage Ceiling (₹/month)</Label>
                          <Input type="number" value={form.esiWageCeiling} onChange={(e) => setForm({ ...form, esiWageCeiling: parseInt(e.target.value) || 0 })} className="h-9" />
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/40 border border-border/60 p-3 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">Standard India ESI</p>
                        Employee: 0.75% · Employer: 3.25% · Applicable up to ₹21,000/month gross (₹25,000 for PW).
                      </div>
                    </>
                  )}

                  {step === 4 && (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                          <div className="flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-amber-600" />
                            <div>
                              <p className="text-sm font-medium text-foreground">PT Applicable</p>
                              <p className="text-xs text-muted-foreground">Professional Tax (state-wise)</p>
                            </div>
                          </div>
                          <Switch checked={form.ptApplicable} onCheckedChange={(v) => setForm({ ...form, ptApplicable: v })} />
                        </div>
                        <div className={cn("grid grid-cols-2 gap-3 transition-opacity", !form.ptApplicable && "opacity-40 pointer-events-none")}>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Default PT Amount (₹/month)</Label>
                            <Input type="number" value={form.ptAmount} onChange={(e) => setForm({ ...form, ptAmount: parseInt(e.target.value) || 0 })} className="h-9" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">PT Slab Configuration</Label>
                            <Select defaultValue="standard">
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="standard">Standard slabs</SelectItem>
                                <SelectItem value="karnataka">Karnataka slabs</SelectItem>
                                <SelectItem value="maharashtra">Maharashtra slabs</SelectItem>
                                <SelectItem value="tn">Tamil Nadu slabs</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-cyan-600" />
                            <div>
                              <p className="text-sm font-medium text-foreground">LWF Applicable</p>
                              <p className="text-xs text-muted-foreground">Labour Welfare Fund</p>
                            </div>
                          </div>
                          <Switch checked={form.lwfApplicable} onCheckedChange={(v) => setForm({ ...form, lwfApplicable: v })} />
                        </div>
                        <div className={cn("grid grid-cols-2 gap-3 transition-opacity", !form.lwfApplicable && "opacity-40 pointer-events-none")}>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">LWF Rate (%)</Label>
                            <Input type="number" step="0.01" value={form.lwfRate} onChange={(e) => setForm({ ...form, lwfRate: parseFloat(e.target.value) || 0 })} className="h-9" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">LWF State</Label>
                            <Select defaultValue="Karnataka">
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Karnataka">Karnataka</SelectItem>
                                <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                                <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
                                <SelectItem value="Delhi">Delhi</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {step === 5 && (
                    <>
                      <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                        <div className="flex items-center gap-2">
                          <IndianRupee className="h-4 w-4 text-violet-600" />
                          <div>
                            <p className="text-sm font-medium text-foreground">TDS Applicable</p>
                            <p className="text-xs text-muted-foreground">Income Tax deduction at source</p>
                          </div>
                        </div>
                        <Switch checked={form.tdsApplicable} onCheckedChange={(v) => setForm({ ...form, tdsApplicable: v })} />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-emerald-600" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Gratuity Applicable</p>
                            <p className="text-xs text-muted-foreground">Statutory gratuity (4.81% of basic)</p>
                          </div>
                        </div>
                        <Switch checked={form.gratuityApplicable} onCheckedChange={(v) => setForm({ ...form, gratuityApplicable: v })} />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-rose-600" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Bonus Applicable</p>
                            <p className="text-xs text-muted-foreground">Statutory bonus (8.33%–20%)</p>
                          </div>
                        </div>
                        <Switch checked={form.bonusApplicable} onCheckedChange={(v) => setForm({ ...form, bonusApplicable: v })} />
                      </div>
                      <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-500/20 p-3">
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                          <Check className="h-3.5 w-3.5" /> Ready to create
                        </p>
                        <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                          Review the applicability matrix above and click Create Rule.
                        </p>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => setWizardOpen(false)}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button variant="outline" size="sm" onClick={prevStep} className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
              )}
              {step < 5 ? (
                <Button size="sm" onClick={nextStep} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button size="sm" onClick={saveRule} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Check className="h-3.5 w-3.5" /> Create Rule
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StatutorySetupSection
