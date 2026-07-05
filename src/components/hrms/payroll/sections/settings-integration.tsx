"use client"

// =============================================================
// Payroll → Settings → Integration Settings
// 9 integration cards + global rules + entity-wise fallback diagram.
// Slate accent.
// =============================================================

import * as React from "react"
import { useState } from "react"
import { toast } from "sonner"
import {
  Plug, Save, CheckCircle2, XCircle, Clock, RefreshCw, ArrowRight,
  Sparkles, Fingerprint, Calendar, Users, Wallet, Package, LogOut,
  Settings as SettingsIcon, FileText,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface Integration {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  sourceModule: string
  status: "Connected" | "Not Configured"
  syncFrequency: string
  lastSync: string
  description: string
}

const INTEGRATIONS: Integration[] = [
  { id: "att", name: "Attendance", icon: Fingerprint, sourceModule: "Attendance / Timesheet", status: "Connected", syncFrequency: "Real-time", lastSync: "2 min ago", description: "Auto-fetch attendance records (present, absent, late, WFH)." },
  { id: "leave", name: "Leave", icon: Calendar, sourceModule: "Leave Management", status: "Connected", syncFrequency: "Hourly", lastSync: "12 min ago", description: "Auto-fetch approved leave and LOP days." },
  { id: "ts", name: "Timesheet", icon: Clock, sourceModule: "Timesheet", status: "Not Configured", syncFrequency: "—", lastSync: "—", description: "Pull billable hours for overtime calculation." },
  { id: "exp", name: "Expense", icon: Wallet, sourceModule: "Expense Management", status: "Connected", syncFrequency: "Daily", lastSync: "3h ago", description: "Pull approved reimbursements." },
  { id: "loan", name: "Loan", icon: Wallet, sourceModule: "Loan Management", status: "Connected", syncFrequency: "Daily", lastSync: "1h ago", description: "Pull loan EMI deductions." },
  { id: "asset", name: "Asset", icon: Package, sourceModule: "Asset Management", status: "Connected", syncFrequency: "On Trigger", lastSync: "2d ago", description: "Pull asset damage / loss recovery amounts." },
  { id: "offboard", name: "Offboarding", icon: LogOut, sourceModule: "Offboarding Module", status: "Connected", syncFrequency: "On Trigger", lastSync: "5h ago", description: "Trigger FnF when an exit case is initiated." },
  { id: "emp", name: "Employee Master", icon: Users, sourceModule: "Employee Module", status: "Connected", syncFrequency: "Real-time", lastSync: "just now", description: "Sync employee profile, status, salary changes." },
  { id: "tax", name: "Tax Declaration", icon: FileText, sourceModule: "Tax / Investment Module", status: "Connected", syncFrequency: "On Submit", lastSync: "30 min ago", description: "Pull investment declarations & proof submissions." },
]

export function IntegrationSettingsSection() {
  const [autoFetchTiming, setAutoFetchTiming] = useState("On Payroll Lock")
  const [syncOnLock, setSyncOnLock] = useState(true)
  const [manualOverride, setManualOverride] = useState(true)

  function configure(i: Integration) {
    if (i.status === "Connected") {
      toast.info(`Re-configuring ${i.name} integration`)
    } else {
      toast.success(`${i.name} integration configured`)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <Plug className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Integration Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Connect source modules to feed payroll automatically.</p>
          </div>
        </div>
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRATIONS.map((i) => {
          const Icon = i.icon
          const connected = i.status === "Connected"
          return (
            <Card key={i.id} className="rounded-xl border-border/60 shadow-soft hover:shadow-card transition-shadow">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1",
                      connected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20" : "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-slate-500/20",
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{i.name}</div>
                      <div className="text-[11px] text-muted-foreground">{i.sourceModule}</div>
                    </div>
                  </div>
                  {connected ? (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-0 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground gap-1">
                      <XCircle className="h-3 w-3" /> Not Configured
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{i.description}</p>
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Sync Frequency</div>
                    <div className="text-foreground font-medium">{i.syncFrequency}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Last Sync</div>
                    <div className="text-foreground font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {i.lastSync}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 flex-1 h-8" onClick={() => configure(i)}>
                    <SettingsIcon className="h-3.5 w-3.5" /> Configure
                  </Button>
                  {connected && (
                    <Button size="sm" variant="ghost" className="gap-1.5 h-8 hover:bg-slate-500/10" onClick={() => toast.info(`Syncing ${i.name}...`)}>
                      <RefreshCw className="h-3.5 w-3.5" /> Sync
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Global rules */}
        <Card className="rounded-xl border-border/60 shadow-soft lg:col-span-2">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Global Integration Rules</h3>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">Auto-Fetch Timing</Label>
                <Select value={autoFetchTiming} onValueChange={setAutoFetchTiming}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["On Payroll Lock", "Daily at midnight", "On Payroll Run", "Manual only"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <ToggleRow label="Sync on Payroll Lock" description="Trigger source-module sync when payroll is locked." checked={syncOnLock} onChange={setSyncOnLock} />
              <ToggleRow label="Manual Override Allowed" description="Allow HR to override synced values." checked={manualOverride} onChange={setManualOverride} />
            </div>
            <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white mt-2 self-start" onClick={() => toast.success("Integration rules saved")}>
              <Save className="h-4 w-4" /> Save Rules
            </Button>
          </CardContent>
        </Card>

        {/* Fallback diagram */}
        <Card className="rounded-xl border-border/60 shadow-soft bg-muted/20">
          <CardContent className="p-5">
            <div className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-slate-600" /> Entity-wise Fallback Logic
            </div>
            <div className="flex flex-col gap-1.5 text-xs">
              {["Employee-specific", "Department + Type", "Grade", "Location", "Entity", "Tenant Default"].map((label, idx, arr) => (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium border flex-1",
                      idx === arr.length - 1 ? "bg-teal-600 text-white border-teal-600" : "bg-background text-foreground border-border/60",
                    )}>
                      {label}
                    </span>
                  </div>
                  {idx < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/60 rotate-90 ml-3" />}
                </React.Fragment>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">When a setting is missing at one level, payroll falls back to the next level in the chain.</p>
          </CardContent>
        </Card>
      </div>
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

export default IntegrationSettingsSection
