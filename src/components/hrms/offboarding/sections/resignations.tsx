"use client"

// ============================================================================
//  Offboarding — Resignation Requests section (spec §6, lines 469-541)
//  Stats → Filter bar → Table → Review / Details / Logs dialogs.
//  Rose theme accents. All actions operate on in-memory state + sonner toast.
// ============================================================================

import * as React from "react"
import {
  Search, Filter, FileText, Clock3, ShieldCheck, CheckCircle2, Eye,
  UserCheck, Check, X, Undo2, Ban, LogOut, History, MoreHorizontal,
  CalendarDays, AlertTriangle, Heart, TrendingUp, MessageSquare,
  FileSignature, CircleDot, Briefcase, ArrowRight,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import {
  initials, formatDate, formatDateTime, daysBetween,
  STATUS_COLORS, type ResignationRequest, type ResignationStatus,
} from "../shared"
import { RESIGNATION_REQUESTS, EXIT_WORKFLOWS, EXIT_CHECKLISTS } from "../data"

// ---------- Constants ----------
const STANDARD_NOTICE_DAYS = 60

const STATUS_FILTER_OPTIONS: (ResignationStatus | "All")[] = [
  "All", "Draft", "Submitted", "Pending Manager Approval", "Pending HR Approval",
  "Approved", "Rejected", "Withdrawn", "Exit Initiated",
]

const FLOW_STEPS: { label: string; status: ResignationStatus }[] = [
  { label: "Submitted", status: "Submitted" },
  { label: "Manager Approval", status: "Pending Manager Approval" },
  { label: "HR Approval", status: "Pending HR Approval" },
  { label: "Approved", status: "Approved" },
  { label: "Exit Initiated", status: "Exit Initiated" },
]

const STATUS_BADGE_CLASSES: Record<ResignationStatus, string> = {
  "Draft": "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  "Submitted": "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "Pending Manager Approval": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "Pending HR Approval": "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "Approved": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "Rejected": "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  "Withdrawn": "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  "Cancelled": "bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400",
  "Exit Initiated": "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
}

const OFF_FLOW_STATUSES: ResignationStatus[] = ["Draft", "Rejected", "Withdrawn", "Cancelled"]

function canAction(s: ResignationStatus, a: string): boolean {
  switch (a) {
    case "manager-review": return s === "Submitted" || s === "Pending Manager Approval"
    case "hr-review": return s === "Pending HR Approval" || s === "Pending Manager Approval"
    case "approve": case "reject": return ["Submitted", "Pending Manager Approval", "Pending HR Approval"].includes(s)
    case "send-back": return ["Pending Manager Approval", "Pending HR Approval"].includes(s)
    case "withdraw": return ["Submitted", "Pending Manager Approval", "Pending HR Approval", "Approved"].includes(s)
    case "initiate-exit": return s === "Approved"
    default: return true
  }
}

function noticeInfo(r: ResignationRequest) {
  const served = daysBetween(r.resignationDate, r.requestedLwd)
  const shortfall = r.noticeShortfallDays ?? Math.max(0, STANDARD_NOTICE_DAYS - served)
  return { served, shortfall, standard: STANDARD_NOTICE_DAYS }
}

// ---------- Small presentational helpers ----------
function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold text-white shadow-sm ring-2 ring-white/70 dark:ring-white/10"
      style={{ background: color, width: size, height: size, fontSize: size * 0.36 }}
    >{initials(name)}</span>
  )
}

function StatusBadge({ status }: { status: ResignationStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_BADGE_CLASSES[status])}>
      <span className="size-1.5 rounded-full" style={{ background: STATUS_COLORS[status] || "#94a3b8" }} />
      {status}
    </span>
  )
}

function StatCard({ label, value, icon: Icon, accent, hint }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>; accent: string; hint?: string
}) {
  return (
    <Card className="overflow-hidden border-border/60 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="flex size-11 items-center justify-center rounded-xl" style={{ background: `${accent}1a`, color: accent }}>
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  )
}

function DetailField({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{icon}{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}

function ToggleCard({ label, description, checked, onCheckedChange }: {
  label: string; description: string; checked: boolean; onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex flex-col justify-between gap-2 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center justify-end"><Switch checked={checked} onCheckedChange={onCheckedChange} /></div>
    </div>
  )
}

// Horizontal stepper for status flow visualization
function StatusFlowStepper({ current }: { current: ResignationStatus }) {
  const offFlow = OFF_FLOW_STATUSES.includes(current)
  const currentIndex = FLOW_STEPS.findIndex((s) => s.status === current)
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <TrendingUp className="size-3.5 text-rose-500" /> Status Flow
      </div>
      {offFlow ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-rose-300 bg-rose-50/60 px-3 py-2.5 text-sm dark:border-rose-500/30 dark:bg-rose-500/10">
          <AlertTriangle className="size-4 text-rose-500" />
          <span className="text-rose-700 dark:text-rose-300">
            This request is currently <span className="font-semibold">{current}</span> and is outside the main approval flow.
          </span>
        </div>
      ) : (
        <ol className="flex flex-wrap items-center gap-y-3">
          {FLOW_STEPS.map((step, i) => {
            const isCurrent = step.status === current
            const isDone = currentIndex > i
            const isLast = i === FLOW_STEPS.length - 1
            return (
              <li key={step.status} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <span className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                    isCurrent && "border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-500/30",
                    isDone && "border-emerald-500 bg-emerald-500 text-white",
                    !isCurrent && !isDone && "border-border bg-background text-muted-foreground",
                  )}>{isDone ? <Check className="size-4" /> : i + 1}</span>
                  <span className={cn(
                    "max-w-[110px] text-center text-[11px] font-medium leading-tight",
                    isCurrent ? "text-rose-600 dark:text-rose-400" : isDone ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                  )}>{step.label}</span>
                </div>
                {!isLast && <div className={cn("mx-2 h-0.5 w-8 sm:w-14", isDone ? "bg-emerald-500" : "bg-border")} />}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function ReviewTrailItem({ role, who, decision, lwd, remarks }: {
  role: string; who: string; decision: string; lwd?: string; remarks?: string
}) {
  const tone = decision === "Approved" ? "text-emerald-600 dark:text-emerald-400"
    : decision === "Rejected" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{role} · <span className="text-muted-foreground">{who}</span></p>
        <p className={cn("text-sm font-semibold", tone)}>{decision}</p>
      </div>
      {lwd && <p className="text-xs text-muted-foreground">Recommended / Final LWD: {formatDate(lwd)}</p>}
      {remarks && <p className="mt-1 text-sm">{remarks}</p>}
    </div>
  )
}

// ---------- Review Dialog (Manager OR HR) ----------
interface MgrState { decision: "Approved" | "Rejected" | "Pending"; recommendedLwd: string; retentionDone: boolean; discussionSummary: string; regrettable: boolean; remarks: string }
interface HrState { finalLwd: string; noticeWaiver: boolean; noticeBuyout: boolean; noticeRecovery: boolean; exitWorkflowId: string; clearanceChecklistId: string; remarks: string }

function ReviewDialog({ open, onOpenChange, mode, request, onAction }: {
  open: boolean; onOpenChange: (v: boolean) => void; mode: "manager" | "hr";
  request: ResignationRequest | null; onAction: (reqId: string, action: string, payload?: any) => void
}) {
  const [mgr, setMgr] = React.useState<MgrState>({ decision: "Pending", recommendedLwd: "", retentionDone: false, discussionSummary: "", regrettable: false, remarks: "" })
  const [hr, setHr] = React.useState<HrState>({ finalLwd: "", noticeWaiver: false, noticeBuyout: false, noticeRecovery: false, exitWorkflowId: "", clearanceChecklistId: "", remarks: "" })

  React.useEffect(() => {
    if (!request) return
    setMgr({
      decision: request.managerDecision || "Pending",
      recommendedLwd: request.managerRecommendedLwd || request.requestedLwd || "",
      retentionDone: false,
      discussionSummary: request.managerRemarks || "",
      regrettable: !!request.regrettable,
      remarks: request.managerRemarks || "",
    })
    setHr({
      finalLwd: request.hrFinalLwd || request.requestedLwd || "",
      noticeWaiver: false, noticeBuyout: false,
      noticeRecovery: (request.noticeShortfallDays || 0) > 0,
      exitWorkflowId: EXIT_WORKFLOWS[0]?.id || "",
      clearanceChecklistId: EXIT_CHECKLISTS[0]?.id || "",
      remarks: request.hrRemarks || "",
    })
  }, [request])

  if (!request) return null
  const ni = noticeInfo(request)
  const isManager = mode === "manager"

  const submitManager = (decision: "Approved" | "Rejected") => {
    onAction(request.id, `manager-${decision.toLowerCase()}`, {
      decision, recommendedLwd: mgr.recommendedLwd, regrettable: mgr.regrettable, remarks: mgr.remarks,
    })
    onOpenChange(false)
  }
  const submitHR = (action: "approve" | "reject" | "send-back") => {
    onAction(request.id, `hr-${action}`, {
      finalLwd: hr.finalLwd, noticeWaiver: hr.noticeWaiver, noticeBuyout: hr.noticeBuyout,
      noticeRecovery: hr.noticeRecovery, exitWorkflowId: hr.exitWorkflowId,
      clearanceChecklistId: hr.clearanceChecklistId, remarks: hr.remarks,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-full gap-0 overflow-y-auto p-0 sm:max-w-3xl">
        <DialogHeader className="border-b bg-gradient-to-r from-rose-500/10 to-transparent p-5">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {isManager ? <UserCheck className="size-5 text-rose-500" /> : <ShieldCheck className="size-5 text-rose-500" />}
            {isManager ? "Manager Review" : "HR Review"}
            <Badge variant="outline" className="ml-1 font-mono text-xs">{request.requestId}</Badge>
          </DialogTitle>
          <DialogDescription>
            {isManager ? "Review the resignation, recommend LWD and forward to HR." : "Finalize the last working day, notice terms and exit workflow."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 p-5">
          {/* Employee header */}
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <Avatar name={request.employeeName} color={request.avatarColor} size={42} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{request.employeeName}</p>
              <p className="truncate text-xs text-muted-foreground">{request.employeeCode} · {request.designation} · {request.department}</p>
            </div>
            <div className="text-right text-xs">
              <p className="text-muted-foreground">Reporting Manager</p>
              <p className="font-medium">{request.reportingManager}</p>
            </div>
          </div>

          {/* Employee resignation form */}
          <section className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold"><FileText className="size-4 text-rose-500" />Employee Resignation Form</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailField label="Resignation Date" value={formatDate(request.resignationDate)} icon={<CalendarDays className="size-3.5" />} />
              <DetailField label="Requested LWD" value={formatDate(request.requestedLwd)} icon={<CalendarDays className="size-3.5" />} />
              <DetailField label="Exit Reason" value={request.exitReason} icon={<CircleDot className="size-3.5" />} />
              <DetailField label="Notice Served" value={`${ni.served} day(s)`} icon={<Clock3 className="size-3.5" />} />
              <DetailField label="Notice Shortfall" value={
                <span className={ni.shortfall > 0 ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>
                  {ni.shortfall} day(s) {ni.shortfall > 0 ? `(of ${ni.standard} required)` : ""}
                </span>
              } icon={<AlertTriangle className="size-3.5" />} />
              <DetailField label="Regrettable Attrition" value={request.regrettable ? "Yes" : "No"} icon={<Heart className="size-3.5" />} />
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Detailed Reason</p>
              <p className="text-sm">{request.detailedReason || "—"}</p>
            </div>
            {request.managerRemarks && (
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Employee Remarks</p>
                <p className="text-sm">{request.managerRemarks}</p>
              </div>
            )}
          </section>

          <Separator />
          <StatusFlowStepper current={request.status} />
          <Separator />

          {/* Manager review fields */}
          {isManager && (
            <section className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold"><UserCheck className="size-4 text-rose-500" />Manager Review</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Manager Decision</Label>
                  <Select value={mgr.decision} onValueChange={(v) => setMgr({ ...mgr, decision: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Recommended LWD</Label>
                  <Input type="date" value={mgr.recommendedLwd} onChange={(e) => setMgr({ ...mgr, recommendedLwd: e.target.value })} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Retention Discussion Done</p>
                  <p className="text-xs text-muted-foreground">Confirm whether a retention conversation has happened.</p>
                </div>
                <Switch checked={mgr.retentionDone} onCheckedChange={(v) => setMgr({ ...mgr, retentionDone: v })} />
              </div>

              <div className="space-y-1.5">
                <Label>Discussion Summary</Label>
                <Textarea rows={3} placeholder="Summary of retention discussion, counter-offer etc." value={mgr.discussionSummary} onChange={(e) => setMgr({ ...mgr, discussionSummary: e.target.value })} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Regrettable Attrition</p>
                  <p className="text-xs text-muted-foreground">Flag if losing this employee is a regret.</p>
                </div>
                <Switch checked={mgr.regrettable} onCheckedChange={(v) => setMgr({ ...mgr, regrettable: v })} />
              </div>

              <div className="space-y-1.5">
                <Label>Manager Remarks</Label>
                <Textarea rows={3} placeholder="Final remarks for HR / record." value={mgr.remarks} onChange={(e) => setMgr({ ...mgr, remarks: e.target.value })} />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                {mgr.decision === "Rejected" ? (
                  <Button variant="destructive" onClick={() => submitManager("Rejected")}><X className="size-4" />Reject &amp; Send Back</Button>
                ) : (
                  <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => submitManager("Approved")}>
                    <ArrowRight className="size-4" />Forward to HR
                  </Button>
                )}
              </div>
            </section>
          )}

          {/* HR review fields */}
          {!isManager && (
            <section className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-rose-500" />HR Review</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Final LWD</Label>
                  <Input type="date" value={hr.finalLwd} onChange={(e) => setHr({ ...hr, finalLwd: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Exit Workflow</Label>
                  <Select value={hr.exitWorkflowId} onValueChange={(v) => setHr({ ...hr, exitWorkflowId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select workflow" /></SelectTrigger>
                    <SelectContent>
                      {EXIT_WORKFLOWS.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Clearance Checklist</Label>
                  <Select value={hr.clearanceChecklistId} onValueChange={(v) => setHr({ ...hr, clearanceChecklistId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select checklist" /></SelectTrigger>
                    <SelectContent>
                      {EXIT_CHECKLISTS.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <ToggleCard label="Notice Waiver" description="Waive the remaining notice period." checked={hr.noticeWaiver} onCheckedChange={(v) => setHr({ ...hr, noticeWaiver: v })} />
                <ToggleCard label="Notice Buyout" description="Employee pays for shortfall." checked={hr.noticeBuyout} onCheckedChange={(v) => setHr({ ...hr, noticeBuyout: v })} />
                <ToggleCard label="Notice Recovery" description="Recover shortfall from FnF." checked={hr.noticeRecovery} onCheckedChange={(v) => setHr({ ...hr, noticeRecovery: v })} />
              </div>

              <div className="space-y-1.5">
                <Label>HR Remarks</Label>
                <Textarea rows={3} placeholder="Final HR remarks / decision rationale." value={hr.remarks} onChange={(e) => setHr({ ...hr, remarks: e.target.value })} />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button variant="outline" onClick={() => submitHR("send-back")}><Undo2 className="size-4" />Send Back</Button>
                <Button variant="destructive" onClick={() => submitHR("reject")}><X className="size-4" />Reject</Button>
                <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => submitHR("approve")}><Check className="size-4" />Approve &amp; Initiate</Button>
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- View Details dialog ----------
function ViewDetailsDialog({ open, onOpenChange, request }: {
  open: boolean; onOpenChange: (v: boolean) => void; request: ResignationRequest | null
}) {
  if (!request) return null
  const ni = noticeInfo(request)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-full overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="border-b bg-gradient-to-r from-rose-500/10 to-transparent p-5">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Eye className="size-5 text-rose-500" />Resignation Details
            <Badge variant="outline" className="ml-1 font-mono text-xs">{request.requestId}</Badge>
          </DialogTitle>
          <DialogDescription>Submitted by {request.employeeName} ({request.employeeCode})</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
            <Avatar name={request.employeeName} color={request.avatarColor} size={42} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{request.employeeName}</p>
              <p className="text-xs text-muted-foreground">{request.employeeCode} · {request.designation}</p>
            </div>
            <StatusBadge status={request.status} />
            {request.regrettable && (
              <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <Heart className="mr-1 size-3" />Regrettable
              </Badge>
            )}
          </div>

          <StatusFlowStepper current={request.status} />

          <section className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold"><FileText className="size-4 text-rose-500" />Resignation Form</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Resignation Date" value={formatDate(request.resignationDate)} />
              <DetailField label="Requested LWD" value={formatDate(request.requestedLwd)} />
              <DetailField label="Exit Reason" value={request.exitReason} />
              <DetailField label="Notice Served" value={`${ni.served} day(s)`} />
              <DetailField label="Notice Shortfall" value={`${ni.shortfall} day(s)`} />
              <DetailField label="Reporting Manager" value={request.reportingManager} />
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Detailed Reason</p>
              <p className="text-sm">{request.detailedReason || "—"}</p>
            </div>
          </section>

          {(request.managerDecision || request.hrDecision) && (
            <section className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold"><FileSignature className="size-4 text-rose-500" />Review Trail</h4>
              <div className="space-y-2">
                {request.managerDecision && (
                  <ReviewTrailItem role="Manager" who={request.reportingManager} decision={request.managerDecision} lwd={request.managerRecommendedLwd} remarks={request.managerRemarks} />
                )}
                {request.hrDecision && (
                  <ReviewTrailItem role="HR" who="HR Business Partner" decision={request.hrDecision || "Pending"} lwd={request.hrFinalLwd} remarks={request.hrRemarks} />
                )}
              </div>
            </section>
          )}

          <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
            <span>Created: {formatDateTime(request.createdAt)}</span>
            <span>Last updated: {formatDateTime(request.updatedAt)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Logs dialog (synthesised timeline) ----------
function LogsDialog({ open, onOpenChange, request }: {
  open: boolean; onOpenChange: (v: boolean) => void; request: ResignationRequest | null
}) {
  if (!request) return null
  const events: { ts: string; label: string; by: string; tone: string }[] = [
    { ts: request.createdAt, label: `Resignation request ${request.requestId} created by ${request.employeeName}`, by: request.employeeName, tone: "info" },
    { ts: request.createdAt, label: `Submitted with exit reason: ${request.exitReason}`, by: request.employeeName, tone: "info" },
  ]
  if (request.managerDecision && request.managerDecision !== "Pending") {
    events.push({
      ts: request.updatedAt,
      label: `Manager ${request.managerDecision.toLowerCase()} the request${request.managerRecommendedLwd ? ` · recommended LWD: ${formatDate(request.managerRecommendedLwd)}` : ""}`,
      by: request.reportingManager,
      tone: request.managerDecision === "Approved" ? "success" : "error",
    })
  }
  if (request.hrDecision && request.hrDecision !== "Pending") {
    events.push({
      ts: request.updatedAt,
      label: `HR ${request.hrDecision.toLowerCase()} the request${request.hrFinalLwd ? ` · final LWD: ${formatDate(request.hrFinalLwd)}` : ""}`,
      by: "HR Business Partner",
      tone: request.hrDecision === "Approved" ? "success" : request.hrDecision === "Rejected" ? "error" : "warning",
    })
  }
  if (request.status === "Withdrawn") events.push({ ts: request.updatedAt, label: "Request withdrawn by employee", by: request.employeeName, tone: "warning" })
  if (request.status === "Exit Initiated") events.push({ ts: request.updatedAt, label: "Exit case initiated from this resignation request", by: "HR Business Partner", tone: "success" })

  const toneColor: Record<string, string> = { info: "bg-sky-500", success: "bg-emerald-500", warning: "bg-amber-500", error: "bg-rose-500" }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader className="border-b p-5">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <History className="size-5 text-rose-500" />Activity Logs
            <Badge variant="outline" className="ml-1 font-mono text-xs">{request.requestId}</Badge>
          </DialogTitle>
          <DialogDescription>Timeline of actions for this resignation request.</DialogDescription>
        </DialogHeader>
        <div className="p-5">
          <ol className="relative space-y-4 border-l border-border pl-4">
            {events.map((ev, i) => (
              <li key={i} className="relative">
                <span className={cn("absolute -left-[21px] top-1 size-2.5 rounded-full ring-4 ring-background", toneColor[ev.tone])} />
                <p className="text-sm font-medium">{ev.label}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(ev.ts)} · by {ev.by}</p>
              </li>
            ))}
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Main section ----------
export function ResignationsSection() {
  const [requests, setRequests] = React.useState<ResignationRequest[]>(() => [...RESIGNATION_REQUESTS])
  const [statusFilter, setStatusFilter] = React.useState<ResignationStatus | "All">("All")
  const [deptFilter, setDeptFilter] = React.useState<string>("All")
  const [search, setSearch] = React.useState("")

  const [reviewOpen, setReviewOpen] = React.useState(false)
  const [reviewMode, setReviewMode] = React.useState<"manager" | "hr">("manager")
  const [selected, setSelected] = React.useState<ResignationRequest | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [logsOpen, setLogsOpen] = React.useState(false)

  const departments = React.useMemo(() => ["All", ...Array.from(new Set(RESIGNATION_REQUESTS.map((r) => r.department))).sort()], [])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return requests.filter((r) => {
      if (statusFilter !== "All" && r.status !== statusFilter) return false
      if (deptFilter !== "All" && r.department !== deptFilter) return false
      if (q && !`${r.employeeName} ${r.employeeCode} ${r.requestId}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [requests, statusFilter, deptFilter, search])

  const total = requests.length
  const pendingMgr = requests.filter((r) => r.status === "Pending Manager Approval").length
  const pendingHr = requests.filter((r) => r.status === "Pending HR Approval").length
  const now = new Date()
  const approvedThisMonth = requests.filter((r) => {
    if (r.status !== "Approved" && r.status !== "Exit Initiated") return false
    const d = new Date(r.updatedAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const handleAction = (reqId: string, action: string, payload?: any) => {
    setRequests((prev) => prev.map((r) => {
      if (r.id !== reqId) return r
      const u: ResignationRequest = { ...r, updatedAt: new Date().toISOString() }
      switch (action) {
        case "manager-approved":
          u.managerDecision = "Approved"; u.managerRecommendedLwd = payload?.recommendedLwd
          u.managerRemarks = payload?.remarks; u.regrettable = !!payload?.regrettable; u.status = "Pending HR Approval"
          toast.success("Manager review submitted — forwarded to HR."); break
        case "manager-rejected":
          u.managerDecision = "Rejected"; u.managerRemarks = payload?.remarks; u.status = "Rejected"
          toast.error("Resignation rejected by manager."); break
        case "hr-approve":
          u.hrDecision = "Approved"; u.hrFinalLwd = payload?.finalLwd; u.hrRemarks = payload?.remarks; u.status = "Exit Initiated"
          toast.success("Resignation approved. Exit case initiated."); break
        case "hr-reject":
          u.hrDecision = "Rejected"; u.hrRemarks = payload?.remarks; u.status = "Rejected"
          toast.error("Resignation rejected by HR."); break
        case "hr-send-back":
          u.hrDecision = "Send Back"; u.hrRemarks = payload?.remarks; u.status = "Pending Manager Approval"
          toast.info("Request sent back to manager."); break
        case "approve":
          if (r.status === "Pending HR Approval") { u.hrDecision = "Approved"; u.status = "Exit Initiated" }
          else if (r.status === "Pending Manager Approval") { u.managerDecision = "Approved"; u.status = "Pending HR Approval" }
          else u.status = "Pending Manager Approval"
          toast.success("Request approved."); break
        case "reject":
          u.status = "Rejected"
          if (r.status === "Pending HR Approval") u.hrDecision = "Rejected"; else u.managerDecision = "Rejected"
          toast.error("Request rejected."); break
        case "send-back":
          u.status = "Pending Manager Approval"; toast.info("Request sent back to manager."); break
        case "withdraw":
          u.status = "Withdrawn"; toast.info("Resignation withdrawn by employee."); break
        case "initiate-exit":
          u.status = "Exit Initiated"; toast.success("Exit case initiated."); break
        default: break
      }
      return u
    }))
    setSelected((prev) => prev && prev.id === reqId ? requests.find((r) => r.id === reqId) || prev : prev)
  }

  const openReview = (req: ResignationRequest, mode: "manager" | "hr") => { setSelected(req); setReviewMode(mode); setReviewOpen(true) }
  const openDetails = (req: ResignationRequest) => { setSelected(req); setDetailsOpen(true) }
  const openLogs = (req: ResignationRequest) => { setSelected(req); setLogsOpen(true) }

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <span className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <FileSignature className="size-4.5" />
              </span>
              Resignation Requests
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Review, approve and convert employee resignations into exit cases.</p>
          </div>
          <Badge variant="outline" className="bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {filtered.length} of {total} request{total === 1 ? "" : "s"}
          </Badge>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Requests" value={total} icon={Briefcase} accent="#e11d48" hint="All time" />
          <StatCard label="Pending Manager" value={pendingMgr} icon={UserCheck} accent="#f59e0b" hint="Awaiting review" />
          <StatCard label="Pending HR" value={pendingHr} icon={ShieldCheck} accent="#8b5cf6" hint="Awaiting approval" />
          <StatCard label="Approved This Month" value={approvedThisMonth} icon={CheckCircle2} accent="#10b981" hint={now.toLocaleString("en-IN", { month: "long", year: "numeric" })} />
        </div>

        {/* Filter bar */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by employee name, code or request ID…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-[210px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTER_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              {(statusFilter !== "All" || deptFilter !== "All" || search) && (
                <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("All"); setDeptFilter("All"); setSearch("") }}>Clear</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Request ID</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Reporting Manager</TableHead>
                  <TableHead>Resignation Date</TableHead>
                  <TableHead>Requested LWD</TableHead>
                  <TableHead>Exit Reason</TableHead>
                  <TableHead className="text-right">Shortfall</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-12 text-center text-sm text-muted-foreground">
                      No resignation requests match the current filters.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((r) => {
                  const ni = noticeInfo(r)
                  return (
                    <TableRow key={r.id} className="group">
                      <TableCell className="pl-4 font-mono text-xs text-muted-foreground">{r.requestId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.employeeName} color={r.avatarColor} size={32} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{r.employeeName}</p>
                            <p className="text-xs text-muted-foreground">{r.employeeCode}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{r.department}</TableCell>
                      <TableCell className="text-sm">{r.designation}</TableCell>
                      <TableCell className="text-sm">{r.reportingManager}</TableCell>
                      <TableCell className="text-sm">{formatDate(r.resignationDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(r.requestedLwd)}</TableCell>
                      <TableCell className="text-sm">{r.exitReason}</TableCell>
                      <TableCell className="text-right">
                        {ni.shortfall > 0 ? (
                          <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{ni.shortfall}d</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell>
                        {r.regrettable ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                                <Heart className="mr-1 size-3" />Regret
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Regrettable attrition</TooltipContent>
                          </Tooltip>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">{r.requestId}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openDetails(r)}><Eye className="size-4" />View Details</DropdownMenuItem>
                            <DropdownMenuItem disabled={!canAction(r.status, "manager-review")} onClick={() => openReview(r, "manager")}>
                              <UserCheck className="size-4" />Manager Review
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!canAction(r.status, "hr-review")} onClick={() => openReview(r, "hr")}>
                              <ShieldCheck className="size-4" />HR Review
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={!canAction(r.status, "approve")} onClick={() => handleAction(r.id, "approve")}>
                              <Check className="size-4" />Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!canAction(r.status, "reject")} className="text-rose-600 focus:text-rose-700" onClick={() => handleAction(r.id, "reject")}>
                              <X className="size-4" />Reject
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!canAction(r.status, "send-back")} onClick={() => handleAction(r.id, "send-back")}>
                              <Undo2 className="size-4" />Send Back
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!canAction(r.status, "withdraw")} onClick={() => handleAction(r.id, "withdraw")}>
                              <Ban className="size-4" />Withdraw
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!canAction(r.status, "initiate-exit")} onClick={() => handleAction(r.id, "initiate-exit")}>
                              <LogOut className="size-4" />Initiate Exit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openLogs(r)}><History className="size-4" />View Logs</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Hint footer */}
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-rose-300 bg-rose-50/40 px-4 py-2.5 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <MessageSquare className="size-3.5" />
          Actions operate on in-memory state for this demo. In production they would call
          <code className="mx-1 rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-rose-500/20">POST /api/offboarding/resignations/:id/action</code>
          and write an audit log entry.
        </div>

        {/* Dialogs */}
        <ReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} mode={reviewMode} request={selected} onAction={handleAction} />
        <ViewDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} request={selected} />
        <LogsDialog open={logsOpen} onOpenChange={setLogsOpen} request={selected} />
      </div>
    </TooltipProvider>
  )
}

export default ResignationsSection
