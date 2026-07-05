"use client"

// =============================================================
// Payroll → Settings → Email Settings
// Email template group list + 9 email event toggles +
// sender settings + test email action.
// Slate accent.
// =============================================================

import * as React from "react"
import { useState } from "react"
import { toast } from "sonner"
import {
  Mail, Save, Send, Sparkles, Building2,
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

import { ENTITIES } from "../shared"

interface TemplateGroup {
  id: string
  entity: string
  group: string
  events: number
  lastUpdated: string
}

const EMAIL_EVENTS: Array<[string, string]> = [
  ["payrollFinalizedEmail", "Payroll Finalized"],
  ["payslipPublishedEmail", "Payslip Published"],
  ["salaryHoldEmail", "Salary Hold"],
  ["salaryReleaseEmail", "Salary Release"],
  ["taxDeclarationReminder", "Tax Declaration Reminder"],
  ["investmentProofReminder", "Investment Proof Reminder"],
  ["arrearApprovedEmail", "Arrear Approved"],
  ["fnfPaymentEmail", "FnF Payment"],
  ["bankPaymentNotification", "Bank Payment Notification"],
]

const INITIAL_GROUPS: TemplateGroup[] = ENTITIES.map((e) => ({
  id: `eg-${e.id}`, entity: e.name, group: `${e.country} Payroll Emails`,
  events: EMAIL_EVENTS.length, lastUpdated: "2 days ago",
}))

export function EmailSettingsSection() {
  const [groups, setGroups] = useState<TemplateGroup[]>(INITIAL_GROUPS)
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    EMAIL_EVENTS.reduce((acc, [k]) => ({ ...acc, [k]: true }), {})
  )
  const [fromName, setFromName] = useState("ACME HRMS")
  const [fromEmail, setFromEmail] = useState("hr@acmecorp.com")
  const [replyTo, setReplyTo] = useState("hr-support@acmecorp.com")
  const [bccFinance, setBccFinance] = useState(true)

  function toggleEvent(key: string) {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }))
  }
  function sendTestEmail() {
    toast.success("Test email sent", { description: `Sent from ${fromEmail} to ${replyTo}.` })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Email Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Template groups, event triggers and sender configuration.</p>
          </div>
        </div>
      </div>

      {/* Template group list */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  {["Entity", "Template Group", "Events", "Last Updated"].map((h) => (
                    <TableHead key={h} className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g) => (
                  <TableRow key={g.id} className="border-border/40 hover:bg-slate-50/60 dark:hover:bg-slate-500/5">
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{g.entity}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{g.group}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{g.events} events</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{g.lastUpdated}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Email event toggles */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Email Event Toggles</h3>
            </div>
            <Separator />
            <div className="grid grid-cols-1 gap-2">
              {EMAIL_EVENTS.map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 hover:bg-background p-3 transition-colors cursor-pointer">
                  <div className="text-sm font-medium text-foreground">{label}</div>
                  <Switch checked={!!toggles[key]} onCheckedChange={() => toggleEvent(key)} className="data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sender settings */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
                <Building2 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Email Sender Settings</h3>
            </div>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">From Name</Label>
              <Input value={fromName} onChange={(e) => setFromName(e.target.value)} className="h-9" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">From Email</Label>
              <Input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} className="h-9" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Reply-To Email</Label>
              <Input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} className="h-9" />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-foreground">BCC Finance</div>
                <div className="text-xs text-muted-foreground mt-0.5">BCC the finance head on all payroll emails.</div>
              </div>
              <Switch checked={bccFinance} onCheckedChange={setBccFinance} className="data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
            </label>
            <Separator />
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={sendTestEmail}>
                <Send className="h-3.5 w-3.5" /> Test Email
              </Button>
              <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white" onClick={() => toast.success("Email settings saved")}>
                <Save className="h-4 w-4" /> Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default EmailSettingsSection
