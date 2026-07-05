"use client"

// =============================================================
// Payroll → Settings → FnF Settings
// Global FnF rules + timeline + leave encashment formula
// + notice period rules by grade.
// Slate accent.
// =============================================================

import * as React from "react"
import { useState } from "react"
import { toast } from "sonner"
import {
  Receipt, Save, Sparkles, ArrowRight, Calculator, Clock,
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

const GRADES = ["G1", "G2", "G3", "G4", "G5", "M1", "M2", "M3", "E1", "E2"]

interface NoticeRule {
  grade: string
  noticeDays: number
  buyoutAllowed: boolean
}

const INITIAL_NOTICE: NoticeRule[] = GRADES.map((g, i) => ({
  grade: g,
  noticeDays: i < 4 ? 30 : i < 7 ? 60 : 90,
  buyoutAllowed: true,
}))

export function FnFSettingsSection() {
  const [autoFetchInputs, setAutoFetchInputs] = useState(true)
  const [approvalWorkflow, setApprovalWorkflow] = useState("HR Head → Finance Head")
  const [generateLetter, setGenerateLetter] = useState(true)
  const [paymentTracking, setPaymentTracking] = useState(true)
  const [gratuityMethod, setGratuityMethod] = useState("India: 15/26 × last drawn × years")
  const [leaveEncashment, setLeaveEncashment] = useState("Basic + DA / 26 × leave days")
  const [notice, setNotice] = useState<NoticeRule[]>(INITIAL_NOTICE)

  function updateNotice(idx: number, key: keyof NoticeRule, value: string | number | boolean) {
    setNotice((prev) => prev.map((n, i) => i === idx ? { ...n, [key]: value } : n))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">FnF Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Full & Final settlement rules, timeline and notice period matrix.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Global FnF rules */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Global FnF Rules</h3>
                <p className="text-xs text-muted-foreground">Apply to all entities unless overridden.</p>
              </div>
            </div>
            <Separator />
            <ToggleRow label="Auto-fetch Inputs on Initiation" description="Pull payroll inputs, leave, loan, asset, arrear automatically." checked={autoFetchInputs} onChange={setAutoFetchInputs} />
            <ToggleRow label="Generate Letter Automatically" description="Create FnF letter on settlement approval." checked={generateLetter} onChange={setGenerateLetter} />
            <ToggleRow label="Payment Tracking" description="Track FnF payment status and UTR." checked={paymentTracking} onChange={setPaymentTracking} />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Approval Workflow</Label>
              <Select value={approvalWorkflow} onValueChange={setApprovalWorkflow}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["HR Head → Finance Head", "Manager → HR → Finance", "Finance Head only", "Payroll Admin → Finance"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Gratuity Calculation Method</Label>
              <Select value={gratuityMethod} onValueChange={setGratuityMethod}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["India: 15/26 × last drawn × years", "UAE: 21 days × years (first 5), 30 days after", "Singapore: per employment contract", "Not applicable"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Choose the method that matches the entity's jurisdiction.</p>
            </div>
          </CardContent>
        </Card>

        {/* Leave Encashment + Timeline */}
        <Card className="rounded-xl border-border/60 shadow-soft">
          <CardContent className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/20">
                <Calculator className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Leave Encashment Formula</h3>
                <p className="text-xs text-muted-foreground">Formula used to compute leave encashment on exit.</p>
              </div>
            </div>
            <Input value={leaveEncashment} onChange={(e) => setLeaveEncashment(e.target.value)} className="h-9 font-mono text-xs" />
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <h4 className="text-sm font-semibold text-foreground">FnF Timeline — Standard Stages</h4>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {["Initiate", "Inputs", "Calculate", "Approve", "Pay", "Letter", "Close"].map((s, idx, arr) => (
                  <React.Fragment key={s}>
                    <span className={cn(
                      "inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium border",
                      idx === arr.length - 1 ? "bg-teal-600 text-white border-teal-600" : "bg-background text-foreground border-border/60",
                    )}>
                      {s}
                    </span>
                    {idx < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/60" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notice period rules */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Notice Period Rules by Grade</h3>
                <p className="text-xs text-muted-foreground">Configure notice days and buyout eligibility per grade.</p>
              </div>
            </div>
            <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white" onClick={() => toast.success("FnF settings saved")}>
              <Save className="h-4 w-4" /> Save All Settings
            </Button>
          </div>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  {["Grade", "Notice Days", "Buyout Allowed"].map((h) => (
                    <TableHead key={h} className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {notice.map((n, idx) => (
                  <TableRow key={n.grade} className="border-border/40 hover:bg-slate-50/60 dark:hover:bg-slate-500/5">
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{n.grade}</Badge>
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={n.noticeDays} onChange={(e) => updateNotice(idx, "noticeDays", Number(e.target.value))} className="h-8 text-xs w-32" />
                    </TableCell>
                    <TableCell>
                      <Switch checked={n.buyoutAllowed} onCheckedChange={(v) => updateNotice(idx, "buyoutAllowed", v)} className="data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
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

export default FnFSettingsSection
