"use client"

// =============================================================
// Payroll → Settings → Arrear Settings
// Global arrear rules + arrear aging + escalation matrix.
// Slate accent.
// =============================================================

import * as React from "react"
import { useState } from "react"
import { toast } from "sonner"
import {
  ArrowLeftRight, Save, Sparkles, Clock, AlertTriangle,
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

interface AgingRow {
  days: string
  action: string
  escalateTo: string
  sla: string
}

const INITIAL_AGING: AgingRow[] = [
  { days: "0–7 days", action: "Notify creator", escalateTo: "Payroll Admin", sla: "1 day" },
  { days: "8–15 days", action: "Reminder to approver", escalateTo: "Approver", sla: "2 days" },
  { days: "16–30 days", action: "Escalate to manager", escalateTo: "Reporting Manager", sla: "3 days" },
  { days: "30+ days", action: "Auto-escalate to HR Head", escalateTo: "HR Head", sla: "Immediate" },
]

export function ArrearSettingsSection() {
  const [autoOnRevision, setAutoOnRevision] = useState(true)
  const [autoOnLopReversal, setAutoOnLopReversal] = useState(true)
  const [autoOnAttendance, setAutoOnAttendance] = useState(true)
  const [payoutMonth, setPayoutMonth] = useState("Next Cycle")
  const [approvalRequired, setApprovalRequired] = useState(true)
  const [showSeparately, setShowSeparately] = useState(true)
  const [allowManual, setAllowManual] = useState(true)
  const [allowNegative, setAllowNegative] = useState(true)
  const [maxDays, setMaxDays] = useState("30 days")
  const [aging, setAging] = useState<AgingRow[]>(INITIAL_AGING)

  function updateAging(idx: number, key: keyof AgingRow, value: string) {
    setAging((prev) => prev.map((a, i) => i === idx ? { ...a, [key]: value } : a))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Arrear Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Global arrear automation, payout and aging rules.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Global arrear rules */}
        <Card className="rounded-xl border-border/60 shadow-soft lg:col-span-2">
          <CardContent className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Global Arrear Rules</h3>
                <p className="text-xs text-muted-foreground">Apply to all entities unless overridden.</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ToggleRow label="Auto-generate on Revision" description="Create arrear automatically when salary is revised." checked={autoOnRevision} onChange={setAutoOnRevision} />
              <ToggleRow label="Auto-generate on LOP Reversal" description="Create arrear when LOP is reversed after payroll lock." checked={autoOnLopReversal} onChange={setAutoOnLopReversal} />
              <ToggleRow label="Auto-generate on Attendance Correction" description="Create arrear when attendance is corrected post-payroll." checked={autoOnAttendance} onChange={setAutoOnAttendance} />
              <ToggleRow label="Approval Required" description="Arrear cases require approval before payout." checked={approvalRequired} onChange={setApprovalRequired} />
              <ToggleRow label="Show Separately in Payslip" description="Display arrear as a separate section, not merged with earnings." checked={showSeparately} onChange={setShowSeparately} />
              <ToggleRow label="Allow Manual Arrear" description="Allow HR to manually create arrear cases." checked={allowManual} onChange={setAllowManual} />
              <ToggleRow label="Allow Negative Arrear (Recovery)" description="Allow recovery-type arrear (negative payout)." checked={allowNegative} onChange={setAllowNegative} />
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">Default Payout Month</Label>
                <Select value={payoutMonth} onValueChange={setPayoutMonth}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Same Cycle", "Next Cycle", "Manual selection"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aging config */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Aging Limits</h3>
                <p className="text-xs text-muted-foreground">Max days before escalation.</p>
              </div>
            </div>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Max Days to Process</Label>
              <Select value={maxDays} onValueChange={setMaxDays}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{["15 days", "30 days", "45 days", "60 days"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Arrears pending beyond this limit are auto-escalated.</p>
            </div>
            <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 dark:bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Configure escalation matrix below to define per-tier actions.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Escalation matrix */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Escalation Matrix</h3>
                <p className="text-xs text-muted-foreground">Define actions and SLA per aging tier.</p>
              </div>
            </div>
            <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white" onClick={() => toast.success("Arrear settings saved")}>
              <Save className="h-4 w-4" /> Save All Settings
            </Button>
          </div>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  {["Aging Bucket", "Action", "Escalate To", "SLA"].map((h) => (
                    <TableHead key={h} className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {aging.map((row, idx) => (
                  <TableRow key={idx} className="border-border/40 hover:bg-slate-50/60 dark:hover:bg-slate-500/5">
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{row.days}</Badge>
                    </TableCell>
                    <TableCell>
                      <Input value={row.action} onChange={(e) => updateAging(idx, "action", e.target.value)} className="h-8 text-xs" />
                    </TableCell>
                    <TableCell>
                      <Input value={row.escalateTo} onChange={(e) => updateAging(idx, "escalateTo", e.target.value)} className="h-8 text-xs" />
                    </TableCell>
                    <TableCell>
                      <Input value={row.sla} onChange={(e) => updateAging(idx, "sla", e.target.value)} className="h-8 text-xs w-32" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
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

export default ArrearSettingsSection
