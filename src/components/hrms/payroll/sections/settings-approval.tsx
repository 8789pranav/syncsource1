"use client"

// =============================================================
// Payroll → Settings → Approval Settings
// 6 approval workflow cards + approval type reference +
// global rules.
// Slate accent.
// =============================================================

import * as React from "react"
import { useState } from "react"
import { toast } from "sonner"
import {
  CheckCircle2, Save, Sparkles, ArrowRight, Clock, AlertTriangle, Info,
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

import { APPROVAL_TYPES } from "../shared"

interface ApprovalCard {
  id: string
  domain: string
  workflow: string
  approvalType: string
  slaDays: number
  autoEscalation: boolean
}

const INITIAL: ApprovalCard[] = [
  { id: "payroll", domain: "Payroll Approval", workflow: "Payroll Admin → Finance Manager → HR Head", approvalType: "Sequential Approval", slaDays: 3, autoEscalation: true },
  { id: "structure", domain: "Salary Structure Approval", workflow: "Payroll Admin → HR Head", approvalType: "Multi Level", slaDays: 2, autoEscalation: true },
  { id: "revision", domain: "Salary Revision Approval", workflow: "Manager → HR Head → Finance", approvalType: "Sequential Approval", slaDays: 5, autoEscalation: true },
  { id: "arrear", domain: "Arrear Approval", workflow: "Manager → Finance Head", approvalType: "Single Level", slaDays: 2, autoEscalation: false },
  { id: "fnf", domain: "FnF Approval", workflow: "HR Head → Finance Head", approvalType: "Sequential Approval", slaDays: 3, autoEscalation: true },
  { id: "bank", domain: "Bank Payment Approval", workflow: "Finance Manager → CFO", approvalType: "Parallel Approval", slaDays: 1, autoEscalation: true },
]

const APPROVAL_TYPE_INFO: Record<string, string> = {
  "Single Level": "One approver. Approved or rejected in one step.",
  "Multi Level": "Multiple approvers, each must approve. Order not enforced.",
  "Sequential Approval": "Approvers act in sequence. Each step must complete before next.",
  "Parallel Approval": "Approvers act in parallel. Quorum required to approve.",
  "Role-Based Approval": "Approvers identified by role (e.g. Manager, HR Head).",
  "Employee-Specific Approval": "Custom approver per employee.",
}

export function ApprovalSettingsSection() {
  const [cards, setCards] = useState<ApprovalCard[]>(INITIAL)
  const [quorum, setQuorum] = useState("50%")
  const [autoApprove, setAutoApprove] = useState("₹0")
  const [rejectionFeedback, setRejectionFeedback] = useState(true)

  function update(id: string, key: keyof ApprovalCard, value: string | number | boolean) {
    setCards((prev) => prev.map((c) => c.id === id ? { ...c, [key]: value } : c))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Approval Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Approval workflows for each payroll domain.</p>
          </div>
        </div>
      </div>

      {/* Approval workflow cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Card key={c.id} className="rounded-xl border-border/60 shadow-soft">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{c.domain}</div>
                    <div className="text-[11px] text-muted-foreground">{c.approvalType}</div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="h-3 w-3" /> SLA {c.slaDays}d
                </Badge>
              </div>
              {/* Approver chain visual flow */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">Approver Chain</div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {c.workflow.split(" → ").map((step, idx, arr) => (
                    <React.Fragment key={idx}>
                      <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-background text-foreground border border-border/60">
                        {step}
                      </span>
                      {idx < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/60" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-foreground">Approval Type</Label>
                  <Select value={c.approvalType} onValueChange={(v) => update(c.id, "approvalType", v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{APPROVAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-foreground">SLA Days</Label>
                  <Input type="number" value={c.slaDays} onChange={(e) => update(c.id, "slaDays", Number(e.target.value))} className="h-9" min={1} />
                </div>
              </div>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3 cursor-pointer">
                <div>
                  <div className="text-sm font-medium text-foreground">Auto-Escalation</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Escalate to next tier if SLA breached.</div>
                </div>
                <Switch checked={c.autoEscalation} onCheckedChange={(v) => update(c.id, "autoEscalation", v)} className="data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
              </label>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Approval type reference */}
        <Card className="rounded-xl border-border/60 shadow-soft bg-muted/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <h3 className="text-sm font-semibold text-foreground">Approval Type Reference</h3>
            </div>
            <div className="flex flex-col gap-2">
              {APPROVAL_TYPES.map((t) => (
                <div key={t} className="rounded-lg border border-border/60 bg-background/60 p-3">
                  <div className="text-sm font-medium text-foreground">{t}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{APPROVAL_TYPE_INFO[t]}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Parallel Approval Quorum</Label>
              <Select value={quorum} onValueChange={setQuorum}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{["50%", "66%", "75%", "100%"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Minimum approver ratio for parallel approvals.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Auto-Approve Threshold</Label>
              <Input value={autoApprove} onChange={(e) => setAutoApprove(e.target.value)} className="h-9" />
              <p className="text-[11px] text-muted-foreground">Amounts at or below this threshold bypass approval.</p>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-foreground">Rejection Feedback Required</div>
                <div className="text-xs text-muted-foreground mt-0.5">Approvers must provide a reason when rejecting.</div>
              </div>
              <Switch checked={rejectionFeedback} onCheckedChange={setRejectionFeedback} className="data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500" />
            </label>
            <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white mt-1 self-start" onClick={() => toast.success("Approval settings saved")}>
              <Save className="h-4 w-4" /> Save All Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ApprovalSettingsSection
