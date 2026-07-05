"use client"

// =============================================================
// Payroll — Settings → General (spec: General Settings)
// Tenant-level payroll defaults: currency, country, frequency,
// pay date, fiscal year, payroll admin emails, working days,
// LOP basis, round-off, auto-publish.
// Slate accent (Settings menu colour).
// =============================================================

import * as React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  SlidersHorizontal, Save, Building2, Calendar, Mail, Calculator,
  CheckCircle2, RotateCcw,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

import {
  CURRENCIES, PAYROLL_FREQUENCIES, ENTITIES,
} from "../shared"

// =============================================================
// Local state shape
// =============================================================

interface GeneralForm {
  defaultCurrency: string
  defaultCountry: string
  defaultPayrollFrequency: string
  defaultPayDate: string
  fiscalYearStart: string
  payrollAdminEmail: string
  financeHeadEmail: string
  hrHeadEmail: string
  workingDaysPerMonth: number
  defaultLopCalculationBasis: string
  roundOffNetPay: boolean
  autoPublishPayslips: boolean
}

const COUNTRIES = Array.from(new Set(ENTITIES.map((e) => e.country)))
const LOP_BASIS = ["Per day = CTC/30", "Per day = CTC/26", "Per day = CTC/31", "Calendar days", "Working days only"]

const INITIAL: GeneralForm = {
  defaultCurrency: "INR",
  defaultCountry: "India",
  defaultPayrollFrequency: "Monthly",
  defaultPayDate: "Last Working Day",
  fiscalYearStart: "April",
  payrollAdminEmail: "payroll.admin@acmecorp.com",
  financeHeadEmail: "finance.head@acmecorp.com",
  hrHeadEmail: "hr.head@acmecorp.com",
  workingDaysPerMonth: 30,
  defaultLopCalculationBasis: "Per day = CTC/30",
  roundOffNetPay: true,
  autoPublishPayslips: true,
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const PAY_DATE_OPTIONS = ["Last Working Day", "Last Day", "1st", "5th", "7th", "10th", "15th", "25th", "28th"]

// =============================================================
// Section
// =============================================================

export function GeneralSettingsSection() {
  const [form, setForm] = useState<GeneralForm>(INITIAL)
  const [dirty, setDirty] = useState(false)

  function set<K extends keyof GeneralForm>(key: K, value: GeneralForm[K]) {
    setForm((p) => ({ ...p, [key]: value }))
    setDirty(true)
  }

  function save() {
    toast.success("General payroll settings saved", {
      description: `Default: ${form.defaultCurrency} · ${form.defaultPayrollFrequency} · ${form.defaultPayDate}`,
    })
    setDirty(false)
  }

  function reset() {
    setForm(INITIAL)
    setDirty(false)
    toast.info("Reverted to last saved values")
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">General Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tenant-level payroll defaults used as fallbacks when entity configuration is missing.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? (
            <Badge variant="outline" className="text-amber-700 border-amber-300/60 dark:text-amber-300 dark:border-amber-500/40">
              Unsaved changes
            </Badge>
          ) : (
            <Badge variant="outline" className="text-emerald-700 border-emerald-300/60 dark:text-emerald-300 dark:border-emerald-500/40">
              <CheckCircle2 className="h-3 w-3 mr-1" /> All changes saved
            </Badge>
          )}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5 sm:p-6 flex flex-col gap-6">
            {/* Currency & Country */}
            <SettingsBlock icon={Building2} title="Currency & Country" subtitle="Tenant-wide defaults for new payroll runs and reports.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Default Currency" hint="Used for new entities and reports when no entity-level currency is set.">
                  <Select value={form.defaultCurrency} onValueChange={(v) => set("defaultCurrency", v)}>
                    <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} — {c.name} ({c.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Default Country" hint="Determines default compliance rule and payslip template.">
                  <Select value={form.defaultCountry} onValueChange={(v) => set("defaultCountry", v)}>
                    <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </SettingsBlock>

            <Separator />

            {/* Payroll Calendar */}
            <SettingsBlock icon={Calendar} title="Payroll Calendar Defaults" subtitle="Fallback frequency and pay date for new pay groups.">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Default Payroll Frequency">
                  <Select value={form.defaultPayrollFrequency} onValueChange={(v) => set("defaultPayrollFrequency", v)}>
                    <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYROLL_FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Default Pay Date">
                  <Select value={form.defaultPayDate} onValueChange={(v) => set("defaultPayDate", v)}>
                    <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAY_DATE_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Fiscal Year Start" hint="First month of the financial year.">
                  <Select value={form.fiscalYearStart} onValueChange={(v) => set("fiscalYearStart", v)}>
                    <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </SettingsBlock>

            <Separator />

            {/* Stakeholder Emails */}
            <SettingsBlock icon={Mail} title="Stakeholder Emails" subtitle="Default recipients for payroll notifications and approvals.">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Payroll Admin Email">
                  <Input type="email" value={form.payrollAdminEmail} onChange={(e) => set("payrollAdminEmail", e.target.value)} className="h-9" />
                </Field>
                <Field label="Finance Head Email">
                  <Input type="email" value={form.financeHeadEmail} onChange={(e) => set("financeHeadEmail", e.target.value)} className="h-9" />
                </Field>
                <Field label="HR Head Email">
                  <Input type="email" value={form.hrHeadEmail} onChange={(e) => set("hrHeadEmail", e.target.value)} className="h-9" />
                </Field>
              </div>
            </SettingsBlock>

            <Separator />

            {/* Working Days & LOP */}
            <SettingsBlock icon={Calculator} title="Working Days & LOP" subtitle="Used for per-day salary calculation and LOP deduction.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Working Days per Month" hint="Standard denominator for per-day salary.">
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={form.workingDaysPerMonth}
                    onChange={(e) => set("workingDaysPerMonth", Number(e.target.value))}
                    className="h-9"
                  />
                </Field>
                <Field label="Default LOP Calculation Basis">
                  <Select value={form.defaultLopCalculationBasis} onValueChange={(v) => set("defaultLopCalculationBasis", v)}>
                    <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOP_BASIS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </SettingsBlock>

            <Separator />

            {/* Calculation toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ToggleRow
                label="Round Off Net Pay"
                description="Round net pay to the nearest integer in payslips and bank files."
                checked={form.roundOffNetPay}
                onChange={(v) => set("roundOffNetPay", v)}
              />
              <ToggleRow
                label="Auto-publish Payslips"
                description="Automatically publish payslips to employees on pay date."
                checked={form.autoPublishPayslips}
                onChange={(v) => set("autoPublishPayslips", v)}
              />
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={reset} disabled={!dirty}>
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
              <Button
                size="sm"
                className={cn("gap-1.5 bg-slate-600 hover:bg-slate-700 text-white", !dirty && "opacity-60")}
                onClick={save}
                disabled={!dirty}
              >
                <Save className="h-4 w-4" /> Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// =============================================================
// Sub-components
// =============================================================

function SettingsBlock({
  icon: Icon, title, subtitle, children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="pl-0 sm:pl-9">{children}</div>
    </div>
  )
}

function Field({
  label, hint, children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 hover:bg-background p-3 transition-colors cursor-pointer">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500 mt-0.5"
      />
    </label>
  )
}

export default GeneralSettingsSection
