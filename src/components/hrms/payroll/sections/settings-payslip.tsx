"use client"

// =============================================================
// Payroll → Settings → Payslip Settings
// Template list + global display settings + publish rules +
// template editor with sample preview.
// Slate accent.
// =============================================================

import * as React from "react"
import { useState } from "react"
import { toast } from "sonner"
import {
  FileSliders, Save, Sparkles, Eye, Star, Pencil,
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

interface PayslipTemplate {
  id: string
  name: string
  country: string
  format: string
  isDefault: boolean
  lastUpdated: string
}

const TEMPLATES: PayslipTemplate[] = [
  { id: "tpl-1", name: "India Payslip Template", country: "India", format: "PDF — A4 Portrait", isDefault: true, lastUpdated: "2 days ago" },
  { id: "tpl-2", name: "UAE Payslip Template", country: "United Arab Emirates", format: "PDF — A4 Portrait", isDefault: false, lastUpdated: "5 days ago" },
  { id: "tpl-3", name: "US Payslip Template", country: "United States", format: "PDF — Letter Portrait", isDefault: false, lastUpdated: "1 week ago" },
  { id: "tpl-4", name: "Singapore Payslip Template", country: "Singapore", format: "PDF — A4 Portrait", isDefault: false, lastUpdated: "2 weeks ago" },
]

export function PayslipSettingsSection() {
  const [templates, setTemplates] = useState<PayslipTemplate[]>(TEMPLATES)
  const [showEmployer, setShowEmployer] = useState(true)
  const [showCtc, setShowCtc] = useState(true)
  const [showYtd, setShowYtd] = useState(true)
  const [showLop, setShowLop] = useState(true)
  const [showLeave, setShowLeave] = useState(true)
  const [hideZero, setHideZero] = useState(true)
  const [autoPublish, setAutoPublish] = useState(true)
  const [emailOnPublish, setEmailOnPublish] = useState(true)
  const [passwordProtect, setPasswordProtect] = useState(true)

  function toggleDefault(id: string) {
    setTemplates((prev) => prev.map((t) => ({ ...t, isDefault: t.id === id })))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <FileSliders className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Payslip Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Templates, display options and publish rules for payslips.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Template list */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
                <FileSliders className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Payslip Templates</h3>
            </div>
            <ScrollArea className="max-h-[300px] rounded-lg border border-border/60">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow className="hover:bg-transparent">
                    {["Template", "Country", "Format", "Default", "Updated"].map((h) => (
                      <TableHead key={h} className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id} className="border-border/40 hover:bg-slate-50/60 dark:hover:bg-slate-500/5">
                      <TableCell className="text-sm font-medium text-foreground">{t.name}</TableCell>
                      <TableCell className="text-xs text-foreground/90">{t.country}</TableCell>
                      <TableCell className="text-xs text-foreground/80">{t.format}</TableCell>
                      <TableCell>
                        <button onClick={() => toggleDefault(t.id)}>
                          {t.isDefault ? (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-0 gap-1 cursor-pointer">
                              <Star className="h-3 w-3" /> Default
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="cursor-pointer text-muted-foreground">Set Default</Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.lastUpdated}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Display settings */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Global Display Settings</h3>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ToggleRow label="Show Employer Contribution" checked={showEmployer} onChange={setShowEmployer} />
              <ToggleRow label="Show CTC Components" checked={showCtc} onChange={setShowCtc} />
              <ToggleRow label="Show YTD" checked={showYtd} onChange={setShowYtd} />
              <ToggleRow label="Show LOP Days" checked={showLop} onChange={setShowLop} />
              <ToggleRow label="Show Leave Balance" checked={showLeave} onChange={setShowLeave} />
              <ToggleRow label="Hide Zero Components" checked={hideZero} onChange={setHideZero} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Publish rules */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/20">
              <Eye className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Payslip Publish Rules</h3>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ToggleRow label="Auto-publish on Pay Date" checked={autoPublish} onChange={setAutoPublish} />
            <ToggleRow label="Email on Publish" checked={emailOnPublish} onChange={setEmailOnPublish} />
            <ToggleRow label="Password Protection" checked={passwordProtect} onChange={setPasswordProtect} />
          </div>
          <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white self-start" onClick={() => toast.success("Payslip settings saved")}>
            <Save className="h-4 w-4" /> Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Template preview */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h3 className="text-sm font-semibold text-foreground">Template Editor — Live Preview</h3>
            </div>
            <Badge variant="outline" className="text-xs">Sample Data</Badge>
          </div>
          <div className="rounded-xl border border-border/60 overflow-hidden max-w-2xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-500/10 to-transparent p-5 border-b border-border/60">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-foreground">ACME India Pvt Ltd</div>
                  <div className="text-xs text-muted-foreground">Payslip — November 2024</div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>Employee Code: EMP-0001</div>
                  <div>PAN: ABCDE1234F</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-sm font-semibold text-foreground">Aarav Sharma</div>
                <div className="text-xs text-muted-foreground">Senior Software Engineer · Engineering</div>
              </div>
            </div>
            {/* Body */}
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Earnings</div>
                <SampleRow label="Basic" amount="₹60,000" ytd="₹6,60,000" showYtd={showYtd} hideZero={hideZero} />
                <SampleRow label="HRA" amount="₹24,000" ytd="₹2,64,000" showYtd={showYtd} hideZero={hideZero} />
                <SampleRow label="Special Allowance" amount="₹36,000" ytd="₹3,96,000" showYtd={showYtd} hideZero={hideZero} />
                <SampleRow label="Overtime" amount="₹0" ytd="₹0" showYtd={showYtd} hideZero={hideZero} />
                <div className="flex justify-between text-xs font-semibold text-foreground pt-2 mt-1 border-t border-border/60">
                  <span>Gross Earnings</span><span>₹1,20,000</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Deductions</div>
                <SampleRow label="PF" amount="₹1,800" ytd="₹19,800" showYtd={showYtd} hideZero={hideZero} />
                <SampleRow label="TDS" amount="₹8,500" ytd="₹93,500" showYtd={showYtd} hideZero={hideZero} />
                <SampleRow label="Professional Tax" amount="₹200" ytd="₹2,200" showYtd={showYtd} hideZero={hideZero} />
                {showLop && <SampleRow label="LOP (1 day)" amount="₹4,000" ytd="₹4,000" showYtd={showYtd} hideZero={hideZero} />}
                <div className="flex justify-between text-xs font-semibold text-foreground pt-2 mt-1 border-t border-border/60">
                  <span>Total Deductions</span><span>₹14,500</span>
                </div>
              </div>
            </div>
            {/* Footer */}
            <div className="bg-muted/30 p-5 border-t border-border/60 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Net Pay</div>
                <div className="text-lg font-bold text-foreground">₹1,05,500</div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {showLeave && <div>Leave Balance: 18 days</div>}
                {showEmployer && <div>Employer PF: ₹1,800</div>}
                {showCtc && <div>Monthly CTC: ₹1,23,600</div>}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">Toggle display settings above to see changes reflected in this preview.</p>
        </CardContent>
      </Card>
    </div>
  )
}

function SampleRow({ label, amount, ytd, showYtd, hideZero }: { label: string; amount: string; ytd: string; showYtd: boolean; hideZero: boolean }) {
  const isZero = amount === "₹0"
  if (isZero && hideZero) return null
  return (
    <div className="flex justify-between text-xs py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground tabular-nums">
        {amount} {showYtd && <span className="text-muted-foreground ml-2">({ytd})</span>}
      </span>
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

export default PayslipSettingsSection
