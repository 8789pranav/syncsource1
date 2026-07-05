"use client"

// =============================================================
// Payroll → Settings → Tax Settings
// Tax regime rules + TDS settings + Investment declaration
// + Form 16 settings.
// Slate accent.
// =============================================================

import * as React from "react"
import { useState } from "react"
import { toast } from "sonner"
import {
  BadgePercent, Save, Sparkles, Calendar, FileText, ShieldCheck,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

export function TaxSettingsSection() {
  const [defaultRegime, setDefaultRegime] = useState("New")
  const [allowEmployeeSwitch, setAllowEmployeeSwitch] = useState(true)
  const [comparisonThreshold, setComparisonThreshold] = useState("₹2,50,000")
  const [tdsMonth, setTdsMonth] = useState("April")
  const [tdsOnBonus, setTdsOnBonus] = useState(true)
  const [tdsRoundOff, setTdsRoundOff] = useState(true)
  const [declarationWindow, setDeclarationWindow] = useState("April – June")
  const [proofDeadline, setProofDeadline] = useState("31st January")
  const [autoApproveThreshold, setAutoApproveThreshold] = useState("₹50,000")
  const [autoForm16, setAutoForm16] = useState(true)
  const [issueDate, setIssueDate] = useState("15th June")
  const [digitalSignature, setDigitalSignature] = useState(true)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <BadgePercent className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Tax Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Tax regime rules, TDS, investment declaration and Form 16 automation.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tax Regime */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5 flex flex-col gap-3">
            <BlockHeader icon={ShieldCheck} title="Tax Regime Rules" subtitle="Default regime and employee switching policy." />
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Default Regime">
                <Select value={defaultRegime} onValueChange={setDefaultRegime}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Old", "New"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Regime Comparison Threshold">
                <Input value={comparisonThreshold} onChange={(e) => setComparisonThreshold(e.target.value)} className="h-9" />
              </FormField>
            </div>
            <ToggleRow label="Allow Employee Switch" description="Employees can switch between Old and New regimes annually." checked={allowEmployeeSwitch} onChange={setAllowEmployeeSwitch} />
          </CardContent>
        </Card>

        {/* TDS */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5 flex flex-col gap-3">
            <BlockHeader icon={Calendar} title="TDS Settings" subtitle="TDS deduction month and bonus treatment." />
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="TDS Deduction Start Month">
                <Select value={tdsMonth} onValueChange={setTdsMonth}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["April", "May", "June"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="TDS Round-Off">
                <Select value={tdsRoundOff ? "Yes" : "No"} onValueChange={(v) => setTdsRoundOff(v === "Yes")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Yes", "No"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>
            <ToggleRow label="TDS on Bonus / Incentive" description="Apply TDS on bonus and incentive payouts in the cycle they are paid." checked={tdsOnBonus} onChange={setTdsOnBonus} />
          </CardContent>
        </Card>

        {/* Investment Declaration */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5 flex flex-col gap-3">
            <BlockHeader icon={Sparkles} title="Investment Declaration" subtitle="Declaration window and proof submission rules." />
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Declaration Window">
                <Select value={declarationWindow} onValueChange={setDeclarationWindow}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["April – June", "April – September", "April – December", "Year-round"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Proof Submission Deadline">
                <Select value={proofDeadline} onValueChange={setProofDeadline}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["31st January", "15th February", "28th February", "15th March"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Auto-Approve Threshold" full>
                <Input value={autoApproveThreshold} onChange={(e) => setAutoApproveThreshold(e.target.value)} className="h-9" />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Form 16 */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5 flex flex-col gap-3">
            <BlockHeader icon={FileText} title="Form 16 Settings" subtitle="Auto-generation and digital signature." />
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Issue Date">
                <Select value={issueDate} onValueChange={setIssueDate}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["15th June", "30th June", "15th July", "31st July"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Digital Signature">
                <Select value={digitalSignature ? "Enabled" : "Disabled"} onValueChange={(v) => setDigitalSignature(v === "Enabled")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Enabled", "Disabled"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>
            <ToggleRow label="Auto-generate Form 16" description="Generate Form 16 automatically after FY close." checked={autoForm16} onChange={setAutoForm16} />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white" onClick={() => toast.success("Tax settings saved")}>
          <Save className="h-4 w-4" /> Save All Settings
        </Button>
      </div>
    </div>
  )
}

function BlockHeader({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
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
    <label className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 hover:bg-background p-3 transition-colors cursor-pointer">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5 data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
    </label>
  )
}

export default TaxSettingsSection
