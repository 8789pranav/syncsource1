"use client"

// =============================================================
// Payroll → Settings → Compliance Settings
// Compliance rule list with default per country +
// global rules + country-wise compliance matrix.
// Slate accent.
// =============================================================

import * as React from "react"
import { useState } from "react"
import { toast } from "sonner"
import {
  ShieldCheck, Save, Star, Sparkles, Check, X, AlertTriangle,
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

import { ComplianceRule, ENTITIES, STATUS_COLORS } from "../shared"
import { COMPLIANCE_RULES } from "../data"

const COUNTRIES = ["India", "United Arab Emirates", "United States", "Singapore"]
const COMPLIANCE_HEADERS = ["PF / EPF", "ESI", "PT", "LWF", "TDS / Income Tax", "Gratuity", "Statutory Bonus"]

export function ComplianceSettingsSection() {
  const [rules, setRules] = useState<ComplianceRule[]>(COMPLIANCE_RULES)
  const [autoGenerate, setAutoGenerate] = useState(true)
  const [challanDueOffset, setChallanDueOffset] = useState("15 days")
  const [filingReminder, setFilingReminder] = useState("7 days before")
  const [penaltyThreshold, setPenaltyThreshold] = useState("5%")

  function toggleDefault(id: string) {
    setRules((prev) => prev.map((r) => {
      if (r.id === id) return { ...r, isDefault: !r.isDefault }
      const target = prev.find((x) => x.id === id)
      if (target && r.country === target.country) return { ...r, isDefault: false }
      return r
    }))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Compliance Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Statutory compliance rules, challan automation and country-wise applicability.</p>
          </div>
        </div>
      </div>

      {/* Rule list */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[480px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="hover:bg-transparent border-border/60">
                  {["Rule", "Code", "Country", "Entity", "PF", "ESI", "PT", "LWF", "TDS", "Gratuity", "Bonus", "Default", "Status"].map((h) => (
                    <TableHead key={h} className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold whitespace-nowrap text-center">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id} className="border-border/40 hover:bg-slate-50/60 dark:hover:bg-slate-500/5 transition-colors">
                    <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">{r.name}</TableCell>
                    <TableCell className="text-xs font-mono text-foreground/80">{r.code}</TableCell>
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{r.country}</TableCell>
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{r.entity}</TableCell>
                    {[
                      r.pfApplicable, r.esiApplicable, r.ptApplicable, r.lwfApplicable,
                      r.tdsApplicable, r.gratuityApplicable, r.bonusApplicable,
                    ].map((v, i) => (
                      <TableCell key={i} className="text-center">
                        {v ? <Check className="h-4 w-4 text-emerald-600 inline" /> : <X className="h-4 w-4 text-muted-foreground/40 inline" />}
                      </TableCell>
                    ))}
                    <TableCell>
                      <button onClick={() => toggleDefault(r.id)}>
                        {r.isDefault ? (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-0 gap-1 cursor-pointer">
                            <Star className="h-3 w-3" /> Default
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="cursor-pointer text-muted-foreground">Set Default</Badge>
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("font-medium border-0", STATUS_COLORS[r.status] || STATUS_COLORS.Inactive)}>{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Global rules */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Global Rules</h3>
            </div>
            <Separator />
            <label className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-foreground">Auto-generate Challans on Payroll Finalize</div>
                <div className="text-xs text-muted-foreground mt-0.5">Create PF/ESI/PT/LWF/TDS challans automatically when payroll is finalized.</div>
              </div>
              <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} className="mt-0.5 data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Challan Due Date Offset">
                <Select value={challanDueOffset} onValueChange={setChallanDueOffset}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["7 days", "15 days", "30 days", "End of next month"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Filing Reminder Days">
                <Select value={filingReminder} onValueChange={setFilingReminder}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["3 days before", "7 days before", "14 days before", "30 days before"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Penalty Alert Threshold">
                <Select value={penaltyThreshold} onValueChange={setPenaltyThreshold}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["1%", "2%", "5%", "10%"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>
            <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white mt-1 self-start" onClick={() => toast.success("Compliance rules saved")}>
              <Save className="h-4 w-4" /> Save Rules
            </Button>
          </CardContent>
        </Card>

        {/* Country matrix */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-foreground">Country-wise Compliance Matrix</h3>
            </div>
            <ScrollArea className="max-h-[280px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Country</TableHead>
                    {COMPLIANCE_HEADERS.map((h) => (
                      <TableHead key={h} className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold text-center">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COUNTRIES.map((c) => {
                    const def = rules.find((r) => r.country === c && r.isDefault) || rules.find((r) => r.country === c)
                    return (
                      <TableRow key={c} className="border-border/40">
                        <TableCell className="text-xs font-medium text-foreground whitespace-nowrap">{c}</TableCell>
                        {[
                          def?.pfApplicable, def?.esiApplicable, def?.ptApplicable, def?.lwfApplicable,
                          def?.tdsApplicable, def?.gratuityApplicable, def?.bonusApplicable,
                        ].map((v, i) => (
                          <TableCell key={i} className="text-center">
                            {v ? <Check className="h-4 w-4 text-emerald-600 inline" /> : <X className="h-4 w-4 text-muted-foreground/40 inline" />}
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
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

export default ComplianceSettingsSection
