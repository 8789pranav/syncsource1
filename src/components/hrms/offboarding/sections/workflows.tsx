"use client"

// ============================================================================
//  Offboarding — Workflow Configuration (spec §18 + §19)
//  -----------------------------------------------------------------------------
//  • Workflows table (EXIT_WORKFLOWS) with 13 columns + actions menu.
//  • 14-step Create/Edit Workflow Wizard inside a large dialog.
//  • Workflow Preview dialog (read-only stage pipeline).
//  • Version History + Assigned Exit Cases dialogs.
//  Rose theme accents. All actions operate on in-memory state + sonner toast.
// ============================================================================

import * as React from "react"
import { useState } from "react"
import {
  Search, Plus, Eye, Pencil, Copy, CheckCircle2, ShieldCheck, Archive,
  Power, GitBranch, Trash2, Users, History, Layers, Filter, KanbanSquare,
  FileEdit, ClipboardCheck, Package, Lock, MessageSquare, Wallet, FileText,
  Mail, Settings2, ChevronLeft, ChevronRight, Save, Send, AlertTriangle,
  CircleDot, Workflow as WorkflowIcon, Star, Sparkles, Clock, Calendar,
  Globe, Building2, BadgeCheck, ArrowRight, Check, Ban, Info,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import {
  formatDate, STATUS_COLORS,
  type ExitWorkflow, type WorkflowStep, type ScopeType,
  type ExitStage, DEFAULT_EXIT_STAGES,
} from "../shared"
import {
  EXIT_WORKFLOWS, KANBAN_BOARDS, EXIT_CHECKLISTS,
  EXIT_DOCUMENT_TEMPLATES, EXIT_EMAIL_TEMPLATES, EXIT_CASES,
} from "../data"

// ============================================================================
//  Constants
// ============================================================================

const SCOPE_TYPES: ScopeType[] = [
  "Tenant Default", "Entity", "Branch", "Location", "Department",
  "Grade", "Employee Type", "Work Mode", "Exit Type", "Specific Employee",
]

const WORKFLOW_STATUSES = ["Draft", "Active", "Published", "Archived"] as const

const PRIORITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const COUNTRIES = ["India", "UAE", "USA", "UK", "Singapore", "Australia", "Germany"]

const APPROVAL_TYPES = [
  "Resignation Approval", "HR Exit Approval", "LWD Change Approval",
  "Notice Waiver Approval", "Clearance Approval", "Asset Waiver Approval",
  "FnF Approval", "Letter Approval", "Exit Closure Approval",
]

const APPROVER_TYPES = [
  "Reporting Manager", "Department Head", "HR Owner", "HR Head",
  "Finance Head", "Entity Admin", "Role Based", "Specific User",
]

const TRIGGER_EVENTS = [
  "Resignation submitted", "Exit initiated", "Employee enters stage",
  "Employee exits stage", "Manager approval pending", "HR approval pending",
  "LWD changed", "Notice period started", "Clearance task assigned",
  "Clearance task overdue", "Asset return pending", "IT revocation pending",
  "Exit interview assigned", "Exit interview submitted", "FnF initiated",
  "FnF approved", "FnF paid", "Letter generated", "Employee marked exited",
  "Alumni profile created",
]

const EMAIL_TIMINGS = ["Immediately", "After Delay", "On Stage Entry", "On Stage Exit", "Scheduled"]

const REMINDER_FREQUENCIES = ["Daily", "Every 2 Days", "Weekly", "Bi-weekly", "Custom"]

// 14 wizard steps metadata (icon + title)
const WIZARD_STEPS: { id: string; title: string; icon: any }[] = [
  { id: "ws1", title: "Basic Details", icon: FileText },
  { id: "ws2", title: "Applicability", icon: Filter },
  { id: "ws3", title: "Kanban Board", icon: KanbanSquare },
  { id: "ws4", title: "Exit Request Rules", icon: FileEdit },
  { id: "ws5", title: "Clearance & Checklists", icon: ClipboardCheck },
  { id: "ws6", title: "Asset Recovery Rules", icon: Package },
  { id: "ws7", title: "IT Revocation Rules", icon: Lock },
  { id: "ws8", title: "Exit Interview Rules", icon: MessageSquare },
  { id: "ws9", title: "FnF Rules", icon: Wallet },
  { id: "ws10", title: "Document / Letter Rules", icon: FileText },
  { id: "ws11", title: "Approval Rules", icon: ShieldCheck },
  { id: "ws12", title: "Email Rules", icon: Mail },
  { id: "ws13", title: "Employee Status / Alumni", icon: Users },
  { id: "ws14", title: "Review & Publish", icon: CheckCircle2 },
]

// ============================================================================
//  Types
// ============================================================================

interface EmailRule {
  id: string
  stage: string
  triggerEvent: string
  template: string
  sendTo: string
  cc: string
  bcc: string
  sendTiming: string
  delay: string
  repeatReminder: boolean
  reminderFrequency: string
  maxCount: string
  escalation: boolean
  escalateTo: string
  condition: string
  status: "Active" | "Inactive"
}

interface WorkflowFormState {
  // Step 1 — Basic Details
  name: string
  code: string
  description: string
  scopeType: ScopeType
  entity: string
  country: string
  state: string
  effectiveFrom: string
  effectiveTo: string
  isDefault: boolean
  priority: number
  status: "Draft" | "Active" | "Published" | "Archived"
  version: number

  // Step 2 — Applicability
  appliesTo: Record<string, boolean>

  // Step 3 — Kanban Board
  useDefaultBoard: boolean
  kanbanBoardId: string
  allowStageCustomization: boolean
  allowHrManualMovement: boolean
  allowAutoMovement: boolean
  requireReasonForMovement: boolean

  // Step 4 — Exit Request / Resignation Rules
  resignationRules: Record<string, boolean>

  // Step 5 — Clearance & Checklists
  clearanceChecklistId: string
  stageMapping: string
  autoCreateTasks: boolean
  clearanceTaskRules: Record<string, boolean>
  taskOwner: string
  dueDateRule: string

  // Step 6 — Asset Recovery Rules
  assetRules: Record<string, boolean>
  assetOwner: string

  // Step 7 — IT Revocation Rules
  itRules: Record<string, boolean>
  revokeTiming: "Immediately" | "On LWD End of Day" | "After Clearance" | "Manual"

  // Step 8 — Exit Interview Rules
  interviewRules: Record<string, boolean>
  interviewFormId: string
  interviewDueDateRule: string

  // Step 9 — FnF Rules
  fnfRules: Record<string, boolean>
  fnfRuleId: string

  // Step 10 — Document / Letter Rules
  documentRules: Record<string, boolean>
  letterTemplateId: string
  letterStageMapping: string

  // Step 11 — Approval Rules
  approvalRules: Record<string, boolean>
  approvalType: string
  approverType: string
  approver: string
  approvalLevel: string
  sequentialOrParallel: "Sequential" | "Parallel"
  escalationDays: string
  reminderFrequency: string
  blockStage: string

  // Step 12 — Email Rules
  emailRules: EmailRule[]

  // Step 13 — Employee Status / Alumni Rules
  markExitedOn: "Actual LWD" | "Exit Closure" | "Manual HR Action"
  alumniRules: Record<string, boolean>
  defaultRehireEligibility: string
  dataRetentionRule: string
}

const DEFAULT_RESIGNATION_RULES = {
  allowEmployeeResignation: true,
  allowManagerInitiated: true,
  allowHrInitiated: true,
  allowBulk: false,
  allowFutureDated: true,
  allowBackdated: false,
  minimumNotice: true,
  allowWithdrawalBefore: true,
  allowWithdrawalAfter: false,
  withdrawalRequiresApproval: true,
  allowLwdChange: true,
  lwdChangeRequiresApproval: true,
  requireExitReason: true,
  requireDetailedReason: false,
  requireAttachment: false,
  requireManagerDiscussion: false,
}

const DEFAULT_CLEARANCE_TASK_RULES = {
  mandatoryTask: true,
  blockingTask: true,
  requiresAttachment: true,
  requiresComment: true,
  requiresApproval: true,
  financialImpact: false,
  recoveryAllowed: false,
  blockStageExit: true,
}

const DEFAULT_ASSET_RULES = {
  assetRecoveryRequired: true,
  autoFetchAssets: true,
  requireReturnBeforeExit: true,
  allowWaiver: false,
  allowDamageRecovery: true,
  allowLostRecovery: true,
  pushToFnf: true,
}

const DEFAULT_IT_RULES = {
  itRevocationRequired: true,
  autoFetchAccess: true,
  dataBackupRequired: true,
  ownershipTransferRequired: true,
  disableHrmsLogin: true,
  disableEmail: true,
  disableSsoVpn: true,
  disableBiometric: false,
  allowLimitedAlumniAccess: false,
  blockExitClosureUntilRevoked: true,
}

const DEFAULT_INTERVIEW_RULES = {
  interviewRequired: true,
  sendToEmployee: true,
  anonymousAllowed: false,
  hrReviewRequired: true,
  blockExitClosureUntilSubmitted: true,
  allowHrWaiver: true,
}

const DEFAULT_FNF_RULES = {
  fnfRequired: true,
  autoFetchPayroll: true,
  autoFetchLeaveEncashment: true,
  autoFetchNoticeRecovery: true,
  autoFetchLoanRecovery: true,
  autoFetchAssetRecovery: true,
  allowManualEarnings: true,
  allowManualDeductions: true,
  fnfApprovalRequired: true,
  fnfMustCompleteBeforeExit: true,
  allowFnfAfterExit: false,
  generateFnfLetter: true,
}

const DEFAULT_DOCUMENT_RULES = {
  generateResignationAcceptance: true,
  generateRelieving: true,
  generateExperience: true,
  generateNdc: true,
  generateFnfLetter: true,
  generateTerminationLetter: false,
  approvalRequiredBeforeIssue: true,
  digitalSignatureRequired: false,
  emailLetterToEmployee: true,
  blockClosureUntilLetterGenerated: true,
}

const DEFAULT_APPROVAL_RULES = {
  approvalRequired: true,
  autoApproveIfMissing: false,
  escalationRequired: true,
}

const DEFAULT_ALUMNI_RULES = {
  deactivateProfile: true,
  deactivateLogin: true,
  keepLimitedPortalAccess: false,
  createAlumniProfile: true,
  allowRehire: true,
  blacklistOption: true,
}

function createInitialForm(): WorkflowFormState {
  return {
    name: "",
    code: "",
    description: "",
    scopeType: "Tenant Default",
    entity: "",
    country: "India",
    state: "",
    effectiveFrom: "",
    effectiveTo: "",
    isDefault: false,
    priority: 5,
    status: "Draft",
    version: 1,
    appliesTo: {
      "Tenant Default": true, "Entity / Company": false, "Branch": false,
      "Location": false, "Department": false, "Designation": false,
      "Grade": false, "Employee Type": false, "Exit Type": false,
      "Exit Reason": false, "Specific Employee": false,
    },
    useDefaultBoard: true,
    kanbanBoardId: "board-1",
    allowStageCustomization: true,
    allowHrManualMovement: true,
    allowAutoMovement: true,
    requireReasonForMovement: true,
    resignationRules: { ...DEFAULT_RESIGNATION_RULES },
    clearanceChecklistId: "cl-1",
    stageMapping: "Clearance In Progress",
    autoCreateTasks: true,
    clearanceTaskRules: { ...DEFAULT_CLEARANCE_TASK_RULES },
    taskOwner: "HR Owner",
    dueDateRule: "Before LWD - 3 Days",
    assetRules: { ...DEFAULT_ASSET_RULES },
    assetOwner: "Asset Team",
    itRules: { ...DEFAULT_IT_RULES },
    revokeTiming: "On LWD End of Day",
    interviewRules: { ...DEFAULT_INTERVIEW_RULES },
    interviewFormId: "ei-1",
    interviewDueDateRule: "Before LWD - 3 Days",
    fnfRules: { ...DEFAULT_FNF_RULES },
    fnfRuleId: "fnf-1",
    documentRules: { ...DEFAULT_DOCUMENT_RULES },
    letterTemplateId: "dt-1",
    letterStageMapping: "Exit Letters",
    approvalRules: { ...DEFAULT_APPROVAL_RULES },
    approvalType: "Resignation Approval",
    approverType: "Reporting Manager",
    approver: "",
    approvalLevel: "1",
    sequentialOrParallel: "Sequential",
    escalationDays: "2",
    reminderFrequency: "Daily",
    blockStage: "Manager Review",
    emailRules: [
      {
        id: "er-1", stage: "Resignation Submitted", triggerEvent: "Resignation submitted",
        template: "Resignation Submitted Notification", sendTo: "Reporting Manager",
        cc: "HR Owner", bcc: "", sendTiming: "Immediately", delay: "",
        repeatReminder: false, reminderFrequency: "Daily", maxCount: "3",
        escalation: false, escalateTo: "", condition: "",
        status: "Active",
      },
    ],
    markExitedOn: "Actual LWD",
    alumniRules: { ...DEFAULT_ALUMNI_RULES },
    defaultRehireEligibility: "Eligible",
    dataRetentionRule: "7 Years",
  }
}

// ============================================================================
//  Small UI primitives
// ============================================================================

function SwitchRow({ label, description, checked, onChange }: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0 mt-0.5" />
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">{label}{hint && <span className="ml-1 text-muted-foreground">(?)</span>}</Label>
      {children}
    </div>
  )
}

function statusBadgeClass(status: string): string {
  const c = STATUS_COLORS[status] || "#94a3b8"
  return cn(
    "text-[10px] py-0 h-5 px-2 inline-flex items-center gap-1 rounded-full border font-medium",
  )
}

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "#94a3b8"
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium border"
      style={{
        color,
        borderColor: `${color}55`,
        backgroundColor: `${color}15`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  )
}

// ============================================================================
//  Step Indicator (horizontal stepper)
// ============================================================================

function StepIndicator({ steps, current, completed }: {
  steps: WorkflowStep[]
  current: number
  completed: Set<number>
}) {
  return (
    <div className="overflow-x-auto pb-1.5">
      <div className="flex items-center gap-1 min-w-max">
        {steps.map((s, i) => {
          const isCurrent = i === current
          const isComplete = completed.has(i) || s.status === "complete"
          const Ic = WIZARD_STEPS[i]?.icon || CircleDot
          return (
            <React.Fragment key={s.id}>
              <button
                type="button"
                onClick={() => {/* navigation handled by parent */}}
                className={cn(
                  "group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                  isCurrent
                    ? "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/40"
                    : isComplete
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/40"
                    : "border-border/70 bg-background text-muted-foreground hover:border-rose-300 hover:text-rose-600",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold shrink-0",
                    isCurrent
                      ? "bg-rose-500 text-white"
                      : isComplete
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {isComplete && !isCurrent ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <Ic className="h-3.5 w-3.5 shrink-0" />
                <span>{s.title}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={cn(
                  "h-px w-4 shrink-0",
                  isComplete ? "bg-emerald-400" : "bg-border/70",
                )} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
//  Step panels
// ============================================================================

function StepBasicDetails({ f, set }: { f: WorkflowFormState; set: (patch: Partial<WorkflowFormState>) => void }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-rose-500" /> Workflow Identity
          </CardTitle>
          <CardDescription className="text-xs">Core identification and lifecycle metadata for this exit workflow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Workflow Name *">
              <Input
                value={f.name}
                onChange={(e) => {
                  const v = e.target.value
                  set({ name: v, code: v.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, "_").slice(0, 32) })
                }}
                placeholder="e.g. India Full-Time Exit Workflow"
              />
            </Field>
            <Field label="Workflow Code *">
              <Input value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} className="font-mono text-xs" placeholder="INDIA_FT_EXIT" />
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={2} placeholder="Brief description of when this workflow applies." />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Scope Type *">
              <Select value={f.scopeType} onValueChange={(v) => set({ scopeType: v as ScopeType })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{SCOPE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Entity / Company">
              <Input value={f.entity} onChange={(e) => set({ entity: e.target.value })} placeholder="ACME India Pvt Ltd" />
            </Field>
            <Field label="Priority">
              <Select value={String(f.priority)} onValueChange={(v) => set({ priority: Number(v) })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={String(p)}>P{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-rose-500" /> Geography & Effective Period
          </CardTitle>
          <CardDescription className="text-xs">Where and when this workflow applies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Country">
              <Select value={f.country} onValueChange={(v) => set({ country: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="State / Province">
              <Input value={f.state} onChange={(e) => set({ state: e.target.value })} placeholder="Karnataka" />
            </Field>
            <Field label="Version">
              <Input type="number" min={1} value={f.version} onChange={(e) => set({ version: Number(e.target.value) || 1 })} />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Effective From">
              <Input type="date" value={f.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} />
            </Field>
            <Field label="Effective To">
              <Input type="date" value={f.effectiveTo} onChange={(e) => set({ effectiveTo: e.target.value })} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/60 divide-y divide-border/60">
              <SwitchRow
                label="Default Workflow"
                description="Used when no workflow is explicitly chosen"
                checked={f.isDefault}
                onChange={(v) => set({ isDefault: v })}
              />
            </div>
            <Field label="Status">
              <Select value={f.status} onValueChange={(v) => set({ status: v as WorkflowFormState["status"] })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{WORKFLOW_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StepApplicability({ f, set }: { f: WorkflowFormState; set: (patch: Partial<WorkflowFormState>) => void }) {
  const items = [
    { key: "Tenant Default", icon: Building2, desc: "Default across the entire tenant" },
    { key: "Entity / Company", icon: Building2, desc: "Specific to a legal entity" },
    { key: "Branch", icon: Building2, desc: "Office / branch specific" },
    { key: "Location", icon: Globe, desc: "Geographic location specific" },
    { key: "Department", icon: Users, desc: "Department-specific (e.g. Engineering)" },
    { key: "Designation", icon: BadgeCheck, desc: "Job-title specific" },
    { key: "Grade", icon: Layers, desc: "Employee grade / band specific" },
    { key: "Employee Type", icon: Users, desc: "Full-time, Contract, Intern, etc." },
    { key: "Exit Type", icon: FileEdit, desc: "Resignation, Termination, Retirement, etc." },
    { key: "Exit Reason", icon: FileEdit, desc: "Specific exit reasons" },
    { key: "Specific Employee", icon: Users, desc: "Apply to specific employee(s)" },
  ]
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-rose-500" /> Apply Workflow To
        </CardTitle>
        <CardDescription className="text-xs">Select the scopes this workflow applies to. Multiple scopes are combined with AND logic.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {items.map((it) => {
            const checked = !!f.appliesTo[it.key]
            return (
              <label
                key={it.key}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm",
                  checked
                    ? "border-rose-300 bg-rose-50/50 dark:bg-rose-500/5 dark:border-rose-500/40"
                    : "border-border/60 bg-background hover:border-rose-200",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => set({ appliesTo: { ...f.appliesTo, [it.key]: !!v } })}
                  className="mt-0.5"
                />
                <it.icon className={cn("h-4 w-4 mt-0.5 shrink-0", checked ? "text-rose-500" : "text-muted-foreground")} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{it.key}</p>
                  <p className="text-xs text-muted-foreground">{it.desc}</p>
                </div>
              </label>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function StepKanbanBoard({ f, set }: { f: WorkflowFormState; set: (patch: Partial<WorkflowFormState>) => void }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <KanbanSquare className="h-4 w-4 text-rose-500" /> Board Selection
          </CardTitle>
          <CardDescription className="text-xs">Link this workflow to a Kanban board that defines exit stages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SwitchRow
            label="Use Default Kanban Board"
            description="Auto-link the tenant-default exit board"
            checked={f.useDefaultBoard}
            onChange={(v) => set({ useDefaultBoard: v })}
          />
          {!f.useDefaultBoard && (
            <Field label="Selected Kanban Board">
              <Select value={f.kanbanBoardId} onValueChange={(v) => set({ kanbanBoardId: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KANBAN_BOARDS.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.stagesCount} stages)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" /> Board preview
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DEFAULT_EXIT_STAGES.slice(0, 8).map((s, i) => (
                <span key={s.id} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${s.color}20`, color: s.color }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {i + 1}. {s.name}
                </span>
              ))}
              <span className="text-[10px] text-muted-foreground">+{DEFAULT_EXIT_STAGES.length - 8} more</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Stage Movement Rules</CardTitle>
          <CardDescription className="text-xs">Control how exit cases move through stages.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/60 divide-y divide-border/60">
            <SwitchRow label="Allow Stage Customization" description="Per-case stage overrides allowed" checked={f.allowStageCustomization} onChange={(v) => set({ allowStageCustomization: v })} />
            <SwitchRow label="Allow HR Manual Stage Movement" description="HR can manually move cards between stages" checked={f.allowHrManualMovement} onChange={(v) => set({ allowHrManualMovement: v })} />
            <SwitchRow label="Allow Auto Stage Movement" description="System auto-advances based on stage completion" checked={f.allowAutoMovement} onChange={(v) => set({ allowAutoMovement: v })} />
            <SwitchRow label="Require Reason for Manual Movement" description="Captures reason when HR manually moves a card" checked={f.requireReasonForMovement} onChange={(v) => set({ requireReasonForMovement: v })} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StepExitRequestRules({ f, set }: { f: WorkflowFormState; set: (patch: Partial<WorkflowFormState>) => void }) {
  const rules: { key: string; label: string; desc?: string }[] = [
    { key: "allowEmployeeResignation", label: "Allow Employee Resignation", desc: "Employees can submit resignation via portal" },
    { key: "allowManagerInitiated", label: "Allow Manager Initiated Exit", desc: "Managers can initiate exit on behalf" },
    { key: "allowHrInitiated", label: "Allow HR Initiated Exit", desc: "HR can initiate exit directly" },
    { key: "allowBulk", label: "Allow Bulk Exit Initiation", desc: "Initiate exits for multiple employees at once" },
    { key: "allowFutureDated", label: "Allow Future-Dated Resignation", desc: "Resignation with future date allowed" },
    { key: "allowBackdated", label: "Allow Backdated Resignation", desc: "Backdated resignation allowed (with approval)" },
    { key: "minimumNotice", label: "Minimum Notice Required", desc: "Enforce statutory/contractual notice period" },
    { key: "allowWithdrawalBefore", label: "Allow Withdrawal Before Approval", desc: "Employee can withdraw before manager approves" },
    { key: "allowWithdrawalAfter", label: "Allow Withdrawal After Approval", desc: "Withdrawal allowed post-approval (with HR consent)" },
    { key: "withdrawalRequiresApproval", label: "Withdrawal Requires Approval" },
    { key: "allowLwdChange", label: "Allow LWD Change", desc: "Allow LWD revision during notice" },
    { key: "lwdChangeRequiresApproval", label: "LWD Change Requires Approval" },
    { key: "requireExitReason", label: "Require Exit Reason", desc: "Mandatory exit reason selection" },
    { key: "requireDetailedReason", label: "Require Detailed Reason", desc: "Free-text detailed reason mandatory" },
    { key: "requireAttachment", label: "Require Attachment", desc: "Resignation letter attachment mandatory" },
    { key: "requireManagerDiscussion", label: "Require Manager Discussion", desc: "Manager retention discussion mandatory" },
  ]
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <FileEdit className="h-4 w-4 text-rose-500" /> Exit Request / Resignation Rules
        </CardTitle>
        <CardDescription className="text-xs">Controls who can initiate exits and what is required during resignation.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
          {rules.map((r) => (
            <SwitchRow
              key={r.key}
              label={r.label}
              description={r.desc}
              checked={!!f.resignationRules[r.key]}
              onChange={(v) => set({ resignationRules: { ...f.resignationRules, [r.key]: v } })}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function StepClearanceChecklists({ f, set }: { f: WorkflowFormState; set: (patch: Partial<WorkflowFormState>) => void }) {
  const rules: { key: string; label: string; desc?: string }[] = [
    { key: "mandatoryTask", label: "Mandatory Task" },
    { key: "blockingTask", label: "Blocking Task", desc: "Blocks stage exit until completed" },
    { key: "requiresAttachment", label: "Requires Attachment" },
    { key: "requiresComment", label: "Requires Comment" },
    { key: "requiresApproval", label: "Requires Approval" },
    { key: "financialImpact", label: "Financial Impact" },
    { key: "recoveryAllowed", label: "Recovery Allowed" },
    { key: "blockStageExit", label: "Block Stage Exit Until Completed" },
  ]
  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <ClipboardCheck className="h-4 w-4 text-rose-500" /> Clearance Configuration
          </CardTitle>
          <CardDescription className="text-xs">Select checklist and stage mapping.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Clearance Checklist">
              <Select value={f.clearanceChecklistId} onValueChange={(v) => set({ clearanceChecklistId: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXIT_CHECKLISTS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.tasks.length} tasks)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Stage Mapping">
              <Select value={f.stageMapping} onValueChange={(v) => set({ stageMapping: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEFAULT_EXIT_STAGES.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Task Owner">
              <Select value={f.taskOwner} onValueChange={(v) => set({ taskOwner: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Reporting Manager", "HR Owner", "IT Admin", "Asset Team", "Finance", "Department Head"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Due Date Rule">
              <Select value={f.dueDateRule} onValueChange={(v) => set({ dueDateRule: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["On Exit Initiation", "Before LWD - 1 Days", "Before LWD - 3 Days", "Before LWD - 7 Days", "On LWD", "After LWD + 7 Days"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="rounded-lg border border-border/60">
            <SwitchRow label="Auto Create Clearance Tasks" description="Auto-create tasks when exit case enters mapped stage" checked={f.autoCreateTasks} onChange={(v) => set({ autoCreateTasks: v })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Task Configuration Defaults</CardTitle>
          <CardDescription className="text-xs">Default rules applied to all tasks created from this workflow.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            {rules.map((r) => (
              <SwitchRow
                key={r.key}
                label={r.label}
                description={r.desc}
                checked={!!f.clearanceTaskRules[r.key]}
                onChange={(v) => set({ clearanceTaskRules: { ...f.clearanceTaskRules, [r.key]: v } })}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StepAssetRecoveryRules({ f, set }: { f: WorkflowFormState; set: (patch: Partial<WorkflowFormState>) => void }) {
  const rules: { key: string; label: string; desc?: string }[] = [
    { key: "assetRecoveryRequired", label: "Asset Recovery Required" },
    { key: "autoFetchAssets", label: "Auto Fetch Assigned Assets", desc: "Pull list from asset management" },
    { key: "requireReturnBeforeExit", label: "Require Asset Return Before Exit", desc: "Block exit closure until all assets returned" },
    { key: "allowWaiver", label: "Allow Asset Waiver", desc: "Waiver approval permitted for unreturned assets" },
    { key: "allowDamageRecovery", label: "Allow Damage Recovery", desc: "Recover cost for damaged assets" },
    { key: "allowLostRecovery", label: "Allow Lost Asset Recovery", desc: "Recover cost for lost assets" },
    { key: "pushToFnf", label: "Push Recovery Amount to FnF", desc: "Auto-add recovery as FnF deduction" },
  ]
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Package className="h-4 w-4 text-rose-500" /> Asset Recovery Rules
        </CardTitle>
        <CardDescription className="text-xs">Define how company assets are recovered during exit.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Asset Owner">
            <Select value={f.assetOwner} onValueChange={(v) => set({ assetOwner: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Asset Team", "IT Admin", "Admin / Facilities", "Reporting Manager"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Reminder Rule">
            <Select defaultValue="Every 2 Days">
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{["Daily", "Every 2 Days", "Weekly"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <div className="rounded-lg border border-border/60 divide-y divide-border/60">
          {rules.map((r) => (
            <SwitchRow
              key={r.key}
              label={r.label}
              description={r.desc}
              checked={!!f.assetRules[r.key]}
              onChange={(v) => set({ assetRules: { ...f.assetRules, [r.key]: v } })}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function StepITRevocationRules({ f, set }: { f: WorkflowFormState; set: (patch: Partial<WorkflowFormState>) => void }) {
  const rules: { key: string; label: string; desc?: string }[] = [
    { key: "itRevocationRequired", label: "IT Revocation Required" },
    { key: "autoFetchAccess", label: "Auto Fetch Access List", desc: "Pull assigned access from IT inventory" },
    { key: "dataBackupRequired", label: "Data Backup Required" },
    { key: "ownershipTransferRequired", label: "Ownership Transfer Required", desc: "Transfer ownership of code/docs/emails" },
    { key: "disableHrmsLogin", label: "Disable HRMS Login" },
    { key: "disableEmail", label: "Disable Email" },
    { key: "disableSsoVpn", label: "Disable SSO / VPN / Tools" },
    { key: "disableBiometric", label: "Disable Biometric Access" },
    { key: "allowLimitedAlumniAccess", label: "Allow Limited Alumni Access", desc: "Restricted portal access post-exit" },
    { key: "blockExitClosureUntilRevoked", label: "Block Exit Closure Until Revoked" },
  ]
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Lock className="h-4 w-4 text-rose-500" /> IT Revocation Rules
        </CardTitle>
        <CardDescription className="text-xs">Control when and how IT access is revoked during exit.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Revoke Timing">
          <RadioGroup
            value={f.revokeTiming}
            onValueChange={(v) => set({ revokeTiming: v as WorkflowFormState["revokeTiming"] })}
            className="grid grid-cols-1 md:grid-cols-4 gap-2"
          >
            {(["Immediately", "On LWD End of Day", "After Clearance", "Manual"] as const).map((opt) => (
              <label
                key={opt}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer text-xs transition-all",
                  f.revokeTiming === opt
                    ? "border-rose-300 bg-rose-50/50 dark:bg-rose-500/5 dark:border-rose-500/40"
                    : "border-border/60 hover:border-rose-200",
                )}
              >
                <RadioGroupItem value={opt} id={`rt-${opt}`} />
                <span className="font-medium">{opt}</span>
              </label>
            ))}
          </RadioGroup>
        </Field>
        <div className="rounded-lg border border-border/60 divide-y divide-border/60">
          {rules.map((r) => (
            <SwitchRow
              key={r.key}
              label={r.label}
              description={r.desc}
              checked={!!f.itRules[r.key]}
              onChange={(v) => set({ itRules: { ...f.itRules, [r.key]: v } })}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function StepExitInterviewRules({ f, set }: { f: WorkflowFormState; set: (patch: Partial<WorkflowFormState>) => void }) {
  const rules: { key: string; label: string; desc?: string }[] = [
    { key: "interviewRequired", label: "Exit Interview Required" },
    { key: "sendToEmployee", label: "Send To Employee", desc: "Auto-send interview form to employee" },
    { key: "anonymousAllowed", label: "Anonymous Allowed" },
    { key: "hrReviewRequired", label: "HR Review Required", desc: "HR must review submissions" },
    { key: "blockExitClosureUntilSubmitted", label: "Block Exit Closure Until Submitted" },
    { key: "allowHrWaiver", label: "Allow HR Waiver", desc: "HR can waive the interview requirement" },
  ]
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-rose-500" /> Exit Interview Rules
        </CardTitle>
        <CardDescription className="text-xs">Configure exit interview behavior for this workflow.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Exit Interview Form">
            <Select value={f.interviewFormId} onValueChange={(v) => set({ interviewFormId: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ei-1">Standard HR Exit Interview</SelectItem>
                <SelectItem value="ei-2">Anonymous Exit Survey</SelectItem>
                <SelectItem value="ei-3">Manager Exit Discussion</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Due Date Rule">
            <Select value={f.interviewDueDateRule} onValueChange={(v) => set({ interviewDueDateRule: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Before LWD - 3 Days", "Before LWD - 7 Days", "On LWD", "After LWD + 3 Days"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="rounded-lg border border-border/60 divide-y divide-border/60">
          {rules.map((r) => (
            <SwitchRow
              key={r.key}
              label={r.label}
              description={r.desc}
              checked={!!f.interviewRules[r.key]}
              onChange={(v) => set({ interviewRules: { ...f.interviewRules, [r.key]: v } })}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function StepFnFRules({ f, set }: { f: WorkflowFormState; set: (patch: Partial<WorkflowFormState>) => void }) {
  const rules: { key: string; label: string; desc?: string }[] = [
    { key: "fnfRequired", label: "FnF Required" },
    { key: "autoFetchPayroll", label: "Auto Fetch Payroll Inputs" },
    { key: "autoFetchLeaveEncashment", label: "Auto Fetch Leave Encashment" },
    { key: "autoFetchNoticeRecovery", label: "Auto Fetch Notice Recovery" },
    { key: "autoFetchLoanRecovery", label: "Auto Fetch Loan Recovery" },
    { key: "autoFetchAssetRecovery", label: "Auto Fetch Asset Recovery" },
    { key: "allowManualEarnings", label: "Allow Manual Earnings" },
    { key: "allowManualDeductions", label: "Allow Manual Deductions" },
    { key: "fnfApprovalRequired", label: "FnF Approval Required" },
    { key: "fnfMustCompleteBeforeExit", label: "FnF Must Be Completed Before Exit Closure" },
    { key: "allowFnfAfterExit", label: "Allow FnF After Exit" },
    { key: "generateFnfLetter", label: "Generate FnF Letter" },
  ]
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Wallet className="h-4 w-4 text-rose-500" /> FnF Rules
        </CardTitle>
        <CardDescription className="text-xs">Configure Full & Final settlement behavior.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="FnF Rule">
          <Select value={f.fnfRuleId} onValueChange={(v) => set({ fnfRuleId: v })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fnf-1">Standard FnF Rule</SelectItem>
              <SelectItem value="fnf-2">India FnF Rule (Gratuity + PF)</SelectItem>
              <SelectItem value="fnf-3">UAE FnF Rule (EOS Gratuity)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
          {rules.map((r) => (
            <SwitchRow
              key={r.key}
              label={r.label}
              description={r.desc}
              checked={!!f.fnfRules[r.key]}
              onChange={(v) => set({ fnfRules: { ...f.fnfRules, [r.key]: v } })}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function StepDocumentLetterRules({ f, set }: { f: WorkflowFormState; set: (patch: Partial<WorkflowFormState>) => void }) {
  const rules: { key: string; label: string }[] = [
    { key: "generateResignationAcceptance", label: "Generate Resignation Acceptance Letter" },
    { key: "generateRelieving", label: "Generate Relieving Letter" },
    { key: "generateExperience", label: "Generate Experience Letter" },
    { key: "generateNdc", label: "Generate No Dues Certificate" },
    { key: "generateFnfLetter", label: "Generate FnF Settlement Letter" },
    { key: "generateTerminationLetter", label: "Generate Termination Letter" },
    { key: "approvalRequiredBeforeIssue", label: "Approval Required Before Issue" },
    { key: "digitalSignatureRequired", label: "Digital Signature Required" },
    { key: "emailLetterToEmployee", label: "Email Letter To Employee" },
    { key: "blockClosureUntilLetterGenerated", label: "Block Closure Until Letter Generated" },
  ]
  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-rose-500" /> Document / Letter Configuration
          </CardTitle>
          <CardDescription className="text-xs">Select templates and stage mapping for letters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Letter Template">
              <Select value={f.letterTemplateId} onValueChange={(v) => set({ letterTemplateId: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXIT_DOCUMENT_TEMPLATES.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Stage Mapping">
              <Select value={f.letterStageMapping} onValueChange={(v) => set({ letterStageMapping: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEFAULT_EXIT_STAGES.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Letter Generation Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            {rules.map((r) => (
              <SwitchRow
                key={r.key}
                label={r.label}
                checked={!!f.documentRules[r.key]}
                onChange={(v) => set({ documentRules: { ...f.documentRules, [r.key]: v } })}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StepApprovalRules({ f, set }: { f: WorkflowFormState; set: (patch: Partial<WorkflowFormState>) => void }) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-rose-500" /> Approval Rules
        </CardTitle>
        <CardDescription className="text-xs">Define multi-level approvals for this workflow.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/60">
          <SwitchRow
            label="Approval Required"
            description="Enable approval workflow for this exit type"
            checked={!!f.approvalRules.approvalRequired}
            onChange={(v) => set({ approvalRules: { ...f.approvalRules, approvalRequired: v } })}
          />
          <SwitchRow
            label="Auto Approve If Approver Missing"
            description="Skip step if approver is unavailable"
            checked={!!f.approvalRules.autoApproveIfMissing}
            onChange={(v) => set({ approvalRules: { ...f.approvalRules, autoApproveIfMissing: v } })}
          />
          <SwitchRow
            label="Escalation Required"
            checked={!!f.approvalRules.escalationRequired}
            onChange={(v) => set({ approvalRules: { ...f.approvalRules, escalationRequired: v } })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Approval Type">
            <Select value={f.approvalType} onValueChange={(v) => set({ approvalType: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {APPROVAL_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Approver Type">
            <Select value={f.approverType} onValueChange={(v) => set({ approverType: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {APPROVER_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Approver (Specific User)">
            <Input value={f.approver} onChange={(e) => set({ approver: e.target.value })} placeholder="e.g. Anita Desai" />
          </Field>
          <Field label="Approval Level">
            <Select value={f.approvalLevel} onValueChange={(v) => set({ approvalLevel: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["1", "2", "3", "4"].map((l) => <SelectItem key={l} value={l}>Level {l}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sequential / Parallel">
            <RadioGroup
              value={f.sequentialOrParallel}
              onValueChange={(v) => set({ sequentialOrParallel: v as "Sequential" | "Parallel" })}
              className="grid grid-cols-2 gap-2"
            >
              {(["Sequential", "Parallel"] as const).map((opt) => (
                <label
                  key={opt}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer text-xs transition-all",
                    f.sequentialOrParallel === opt
                      ? "border-rose-300 bg-rose-50/50 dark:bg-rose-500/5 dark:border-rose-500/40"
                      : "border-border/60 hover:border-rose-200",
                  )}
                >
                  <RadioGroupItem value={opt} />
                  <span className="font-medium">{opt}</span>
                </label>
              ))}
            </RadioGroup>
          </Field>
          <Field label="Block Stage Until Approved">
            <Select value={f.blockStage} onValueChange={(v) => set({ blockStage: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEFAULT_EXIT_STAGES.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Escalation After (Days)">
            <Input type="number" min={1} value={f.escalationDays} onChange={(e) => set({ escalationDays: e.target.value })} />
          </Field>
          <Field label="Reminder Frequency">
            <Select value={f.reminderFrequency} onValueChange={(v) => set({ reminderFrequency: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REMINDER_FREQUENCIES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </CardContent>
    </Card>
  )
}

function StepEmailRules({ f, set }: { f: WorkflowFormState; set: (patch: Partial<WorkflowFormState>) => void }) {
  const addRule = () => {
    const newRule: EmailRule = {
      id: `er-${Date.now()}`, stage: "Notice Period", triggerEvent: "Employee enters stage",
      template: EXIT_EMAIL_TEMPLATES[0]?.name || "", sendTo: "Employee", cc: "HR Owner", bcc: "",
      sendTiming: "Immediately", delay: "", repeatReminder: false, reminderFrequency: "Daily",
      maxCount: "3", escalation: false, escalateTo: "", condition: "", status: "Active",
    }
    set({ emailRules: [...f.emailRules, newRule] })
  }
  const removeRule = (id: string) => set({ emailRules: f.emailRules.filter((r) => r.id !== id) })
  const updateRule = (id: string, patch: Partial<EmailRule>) =>
    set({ emailRules: f.emailRules.map((r) => (r.id === id ? { ...r, ...patch } : r)) })

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-rose-500" /> Email Rules
            </CardTitle>
            <CardDescription className="text-xs">Define what email goes when. {f.emailRules.length} rule(s) configured.</CardDescription>
          </div>
          <Button size="sm" onClick={addRule} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Email Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {f.emailRules.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
            <Mail className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No email rules yet. Click "Add Email Rule" to begin.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {f.emailRules.map((r, i) => (
              <div key={r.id} className="rounded-lg border border-border/60 bg-background p-3">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 text-xs font-bold">{i + 1}</span>
                    <span className="text-sm font-medium">{r.template || "Untitled Rule"}</span>
                    <StatusPill status={r.status} />
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => removeRule(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <Field label="Stage">
                    <Select value={r.stage} onValueChange={(v) => updateRule(r.id, { stage: v })}>
                      <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEFAULT_EXIT_STAGES.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Trigger Event">
                    <Select value={r.triggerEvent} onValueChange={(v) => updateRule(r.id, { triggerEvent: v })}>
                      <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRIGGER_EVENTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Email Template">
                    <Select value={r.template} onValueChange={(v) => updateRule(r.id, { template: v })}>
                      <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXIT_EMAIL_TEMPLATES.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Send To">
                    <Input className="h-8 text-xs" value={r.sendTo} onChange={(e) => updateRule(r.id, { sendTo: e.target.value })} />
                  </Field>
                  <Field label="CC">
                    <Input className="h-8 text-xs" value={r.cc} onChange={(e) => updateRule(r.id, { cc: e.target.value })} />
                  </Field>
                  <Field label="BCC">
                    <Input className="h-8 text-xs" value={r.bcc} onChange={(e) => updateRule(r.id, { bcc: e.target.value })} />
                  </Field>
                  <Field label="Send Timing">
                    <Select value={r.sendTiming} onValueChange={(v) => updateRule(r.id, { sendTiming: v })}>
                      <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EMAIL_TIMINGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Delay (hours)">
                    <Input className="h-8 text-xs" type="number" min={0} value={r.delay} onChange={(e) => updateRule(r.id, { delay: e.target.value })} placeholder="0" />
                  </Field>
                  <Field label="Condition">
                    <Input className="h-8 text-xs" value={r.condition} onChange={(e) => updateRule(r.id, { condition: e.target.value })} placeholder="e.g. Pending for 2 days" />
                  </Field>
                </div>
                <Separator className="my-2.5" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <SwitchRow
                    label="Repeat Reminder"
                    checked={r.repeatReminder}
                    onChange={(v) => updateRule(r.id, { repeatReminder: v })}
                  />
                  {r.repeatReminder && (
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Reminder Frequency">
                        <Select value={r.reminderFrequency} onValueChange={(v) => updateRule(r.id, { reminderFrequency: v })}>
                          <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {REMINDER_FREQUENCIES.map((rm) => <SelectItem key={rm} value={rm}>{rm}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Max Count">
                        <Input className="h-8 text-xs" type="number" min={1} value={r.maxCount} onChange={(e) => updateRule(r.id, { maxCount: e.target.value })} />
                      </Field>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 mt-1">
                  <SwitchRow
                    label="Escalation Required"
                    checked={r.escalation}
                    onChange={(v) => updateRule(r.id, { escalation: v })}
                  />
                  {r.escalation && (
                    <Field label="Escalate To">
                      <Input className="h-8 text-xs" value={r.escalateTo} onChange={(e) => updateRule(r.id, { escalateTo: e.target.value })} placeholder="HR Manager" />
                    </Field>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StepAlumniRules({ f, set }: { f: WorkflowFormState; set: (patch: Partial<WorkflowFormState>) => void }) {
  const rules: { key: string; label: string; desc?: string }[] = [
    { key: "deactivateProfile", label: "Deactivate Employee Profile" },
    { key: "deactivateLogin", label: "Deactivate Login" },
    { key: "keepLimitedPortalAccess", label: "Keep Limited Exit Portal Access", desc: "Restricted access for documents" },
    { key: "createAlumniProfile", label: "Create Alumni Profile", desc: "Auto-create alumni record on exit" },
    { key: "allowRehire", label: "Allow Rehire", desc: "Mark as eligible for rehire" },
    { key: "blacklistOption", label: "Blacklist / No-Rehire Option", desc: "Allow flagging as no-rehire" },
  ]
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Users className="h-4 w-4 text-rose-500" /> Employee Status / Alumni Rules
        </CardTitle>
        <CardDescription className="text-xs">Control post-exit employee status and alumni conversion.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Mark Employee Exited On">
          <RadioGroup
            value={f.markExitedOn}
            onValueChange={(v) => set({ markExitedOn: v as WorkflowFormState["markExitedOn"] })}
            className="grid grid-cols-1 md:grid-cols-3 gap-2"
          >
            {(["Actual LWD", "Exit Closure", "Manual HR Action"] as const).map((opt) => (
              <label
                key={opt}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer text-xs transition-all",
                  f.markExitedOn === opt
                    ? "border-rose-300 bg-rose-50/50 dark:bg-rose-500/5 dark:border-rose-500/40"
                    : "border-border/60 hover:border-rose-200",
                )}
              >
                <RadioGroupItem value={opt} />
                <span className="font-medium">{opt}</span>
              </label>
            ))}
          </RadioGroup>
        </Field>
        <div className="rounded-lg border border-border/60 divide-y divide-border/60">
          {rules.map((r) => (
            <SwitchRow
              key={r.key}
              label={r.label}
              description={r.desc}
              checked={!!f.alumniRules[r.key]}
              onChange={(v) => set({ alumniRules: { ...f.alumniRules, [r.key]: v } })}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Default Rehire Eligibility">
            <Select value={f.defaultRehireEligibility} onValueChange={(v) => set({ defaultRehireEligibility: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Eligible", "Not Eligible", "Case by Case"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data Retention Rule">
            <Select value={f.dataRetentionRule} onValueChange={(v) => set({ dataRetentionRule: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["3 Years", "5 Years", "7 Years", "10 Years", "Indefinite"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </CardContent>
    </Card>
  )
}

function StepReviewPublish({ f }: { f: WorkflowFormState }) {
  const sections = [
    {
      title: "Basic Details", icon: FileText, items: [
        ["Name", f.name || "—"],
        ["Code", f.code || "—"],
        ["Scope Type", f.scopeType],
        ["Entity", f.entity || "—"],
        ["Country", f.country],
        ["Priority", `P${f.priority}`],
        ["Status", f.status],
        ["Version", `v${f.version}`],
        ["Default", f.isDefault ? "Yes" : "No"],
        ["Effective", `${f.effectiveFrom || "..."} → ${f.effectiveTo || "..."}`],
      ],
    },
    {
      title: "Applicability", icon: Filter, items: [
        ["Applies To", Object.keys(f.appliesTo).filter((k) => f.appliesTo[k]).join(", ") || "—"],
      ],
    },
    {
      title: "Kanban Board", icon: KanbanSquare, items: [
        ["Use Default Board", f.useDefaultBoard ? "Yes" : "No"],
        ["Board ID", f.useDefaultBoard ? "default" : f.kanbanBoardId],
        ["Stage Customization", f.allowStageCustomization ? "Yes" : "No"],
        ["HR Manual Movement", f.allowHrManualMovement ? "Yes" : "No"],
        ["Auto Movement", f.allowAutoMovement ? "Yes" : "No"],
        ["Require Reason", f.requireReasonForMovement ? "Yes" : "No"],
      ],
    },
    {
      title: "Exit Request Rules", icon: FileEdit, items: Object.entries(f.resignationRules)
        .filter(([, v]) => v).map(([k]) => [k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), "Enabled"] as [string, string]),
    },
    {
      title: "Clearance & Checklists", icon: ClipboardCheck, items: [
        ["Checklist", EXIT_CHECKLISTS.find((c) => c.id === f.clearanceChecklistId)?.name || f.clearanceChecklistId],
        ["Stage Mapping", f.stageMapping],
        ["Task Owner", f.taskOwner],
        ["Due Date Rule", f.dueDateRule],
        ["Auto Create Tasks", f.autoCreateTasks ? "Yes" : "No"],
      ],
    },
    {
      title: "Asset Recovery", icon: Package, items: [
        ["Asset Owner", f.assetOwner],
        ...Object.entries(f.assetRules).filter(([, v]) => v).map(([k]) => [k, "Enabled"] as [string, string]),
      ],
    },
    {
      title: "IT Revocation", icon: Lock, items: [
        ["Revoke Timing", f.revokeTiming],
        ...Object.entries(f.itRules).filter(([, v]) => v).map(([k]) => [k, "Enabled"] as [string, string]),
      ],
    },
    {
      title: "Exit Interview", icon: MessageSquare, items: [
        ["Interview Form", f.interviewFormId === "ei-1" ? "Standard HR Exit Interview" : f.interviewFormId === "ei-2" ? "Anonymous Exit Survey" : "Manager Exit Discussion"],
        ["Due Date Rule", f.interviewDueDateRule],
        ...Object.entries(f.interviewRules).filter(([, v]) => v).map(([k]) => [k, "Enabled"] as [string, string]),
      ],
    },
    {
      title: "FnF Rules", icon: Wallet, items: [
        ["FnF Rule", f.fnfRuleId],
        ...Object.entries(f.fnfRules).filter(([, v]) => v).map(([k]) => [k, "Enabled"] as [string, string]),
      ],
    },
    {
      title: "Document / Letter Rules", icon: FileText, items: [
        ["Letter Template", EXIT_DOCUMENT_TEMPLATES.find((d) => d.id === f.letterTemplateId)?.name || f.letterTemplateId],
        ["Stage Mapping", f.letterStageMapping],
        ...Object.entries(f.documentRules).filter(([, v]) => v).map(([k]) => [k, "Enabled"] as [string, string]),
      ],
    },
    {
      title: "Approval Rules", icon: ShieldCheck, items: [
        ["Approval Required", f.approvalRules.approvalRequired ? "Yes" : "No"],
        ["Approval Type", f.approvalType],
        ["Approver Type", f.approverType],
        ["Approver", f.approver || "—"],
        ["Approval Level", `Level ${f.approvalLevel}`],
        ["Sequential/Parallel", f.sequentialOrParallel],
        ["Escalation After", `${f.escalationDays} days`],
        ["Reminder Frequency", f.reminderFrequency],
        ["Block Stage", f.blockStage],
      ],
    },
    {
      title: "Email Rules", icon: Mail, items: [
        ["Total Rules", String(f.emailRules.length)],
        ["Active Rules", String(f.emailRules.filter((r) => r.status === "Active").length)],
        ...f.emailRules.slice(0, 3).map((r, i) => [`Rule #${i + 1}`, `${r.triggerEvent} → ${r.template || "Untitled"}`] as [string, string]),
      ],
    },
    {
      title: "Employee Status / Alumni", icon: Users, items: [
        ["Mark Exited On", f.markExitedOn],
        ["Default Rehire Eligibility", f.defaultRehireEligibility],
        ["Data Retention Rule", f.dataRetentionRule],
        ...Object.entries(f.alumniRules).filter(([, v]) => v).map(([k]) => [k, "Enabled"] as [string, string]),
      ],
    },
  ]

  return (
    <div className="space-y-3">
      <Card className="border-rose-300 bg-rose-50/40 dark:bg-rose-500/5 dark:border-rose-500/30 shadow-sm">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-rose-500 text-white shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Ready to publish</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review the configuration below. You can publish to make the workflow live, or save as draft to come back later.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map((s) => (
          <Card key={s.title} className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <s.icon className="h-3.5 w-3.5 text-rose-500" /> {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="space-y-1">
                {s.items.map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-2 text-xs">
                    <dt className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</dt>
                    <dd className="text-foreground font-medium text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
//  Workflow Wizard Dialog
// ============================================================================

function WorkflowWizardDialog({
  open, onOpenChange, editWorkflow,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editWorkflow?: ExitWorkflow | null
}) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<WorkflowFormState>(createInitialForm)
  const [completed, setCompleted] = useState<Set<number>>(new Set())

  // When opening, seed form from edit target (or fresh defaults)
  React.useEffect(() => {
    if (!open) return
    if (editWorkflow) {
      const seed = createInitialForm()
      seed.name = editWorkflow.name
      seed.code = editWorkflow.code
      seed.description = editWorkflow.description || ""
      seed.scopeType = editWorkflow.scopeType
      seed.entity = editWorkflow.entity || ""
      seed.isDefault = editWorkflow.isDefault
      seed.priority = editWorkflow.priority
      seed.status = editWorkflow.status === "Active" ? "Active" : editWorkflow.status
      seed.version = editWorkflow.version
      seed.kanbanBoardId = editWorkflow.kanbanBoardId
      seed.useDefaultBoard = editWorkflow.kanbanBoardId === "board-1"
      seed.clearanceChecklistId = editWorkflow.clearanceChecklistId || "cl-1"
      seed.fnfRuleId = editWorkflow.fnfRuleId || "fnf-1"
      setForm(seed)
      // Pre-mark complete steps from workflow.steps array
      const comp = new Set<number>()
      editWorkflow.steps.forEach((s, i) => { if (s.status === "complete") comp.add(i) })
      setCompleted(comp)
    } else {
      setForm(createInitialForm())
      setCompleted(new Set())
    }
    setStep(0)
  }, [open, editWorkflow])

  const set = (patch: Partial<WorkflowFormState>) => setForm((prev) => ({ ...prev, ...patch }))

  const markComplete = (i: number) =>
    setCompleted((prev) => { const n = new Set(prev); n.add(i); return n })

  const next = () => {
    markComplete(step)
    if (step < WIZARD_STEPS.length - 1) setStep(step + 1)
  }
  const back = () => { if (step > 0) setStep(step - 1) }
  const goTo = (i: number) => setStep(i)

  const handlePublish = () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Workflow name and code are required")
      setStep(0)
      return
    }
    toast.success(`Workflow "${form.name}" published successfully`)
    onOpenChange(false)
  }
  const handleSaveDraft = () => {
    if (!form.name.trim()) {
      toast.error("Workflow name is required to save as draft")
      setStep(0)
      return
    }
    toast.success(`Workflow "${form.name}" saved as draft`)
    onOpenChange(false)
  }

  const steps: WorkflowStep[] = WIZARD_STEPS.map((w, i) => ({
    id: w.id, title: w.title, description: "", icon: w.icon.name,
    status: completed.has(i) ? "complete" : "incomplete",
  }))

  const renderStep = () => {
    switch (step) {
      case 0: return <StepBasicDetails f={form} set={set} />
      case 1: return <StepApplicability f={form} set={set} />
      case 2: return <StepKanbanBoard f={form} set={set} />
      case 3: return <StepExitRequestRules f={form} set={set} />
      case 4: return <StepClearanceChecklists f={form} set={set} />
      case 5: return <StepAssetRecoveryRules f={form} set={set} />
      case 6: return <StepITRevocationRules f={form} set={set} />
      case 7: return <StepExitInterviewRules f={form} set={set} />
      case 8: return <StepFnFRules f={form} set={set} />
      case 9: return <StepDocumentLetterRules f={form} set={set} />
      case 10: return <StepApprovalRules f={form} set={set} />
      case 11: return <StepEmailRules f={form} set={set} />
      case 12: return <StepAlumniRules f={form} set={set} />
      case 13: return <StepReviewPublish f={form} />
      default: return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl h-[92vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border/60 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-rose-500" />
            {editWorkflow ? "Edit Workflow" : "Create Workflow"}
            <Badge variant="outline" className="ml-2 font-mono text-[10px]">
              Step {step + 1} of {WIZARD_STEPS.length}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {editWorkflow ? `Editing "${editWorkflow.name}"` : "Configure a comprehensive exit workflow through 14 guided steps."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="px-6 py-3 border-b border-border/60 bg-muted/30 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            {(() => {
              const CurrentIcon = WIZARD_STEPS[step]?.icon
              return CurrentIcon ? <CurrentIcon className="h-4 w-4 text-rose-500" /> : null
            })()}
            <span className="text-sm font-semibold text-foreground">{WIZARD_STEPS[step].title}</span>
            <Badge variant="secondary" className="text-[10px] ml-auto">
              {completed.size}/{WIZARD_STEPS.length} complete
            </Badge>
          </div>
          <StepIndicator steps={steps} current={step} completed={completed} />
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-background">
          {renderStep()}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t border-border/60 bg-muted/30 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={back}
              disabled={step === 0}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goTo(0)}
              disabled={step === 0}
              className="text-xs"
            >
              Start
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {step < WIZARD_STEPS.length - 1 ? (
              <>
                <Button variant="outline" size="sm" onClick={handleSaveDraft} className="gap-1.5">
                  <Save className="h-4 w-4" /> Save as Draft
                </Button>
                <Button size="sm" onClick={next} className="gap-1.5 bg-rose-600 hover:bg-rose-700">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleSaveDraft} className="gap-1.5">
                  <Save className="h-4 w-4" /> Save as Draft
                </Button>
                <Button size="sm" onClick={handlePublish} className="gap-1.5 bg-rose-600 hover:bg-rose-700">
                  <Send className="h-4 w-4" /> Publish Workflow
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Workflow Preview Dialog (read-only stage pipeline)
// ============================================================================

function WorkflowPreviewDialog({ workflow, open, onOpenChange }: {
  workflow: ExitWorkflow | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!workflow) return null
  const stages = workflow.stages || DEFAULT_EXIT_STAGES

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[88vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border/60 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4 text-rose-500" /> Workflow Preview
            <Badge variant="outline" className="font-mono text-[10px] ml-2">{workflow.code}</Badge>
            <StatusPill status={workflow.status} />
          </DialogTitle>
          <DialogDescription className="text-xs">{workflow.name} — {workflow.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Quick facts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Scope", value: workflow.scopeType, icon: Filter },
              { label: "Kanban Board", value: workflow.kanbanBoardName, icon: KanbanSquare },
              { label: "Priority", value: `P${workflow.priority}`, icon: Star },
              { label: "Version", value: `v${workflow.version}`, icon: GitBranch },
            ].map((s) => (
              <Card key={s.label} className="border-border/60 shadow-sm">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <s.icon className="h-3 w-3" /> {s.label}
                  </p>
                  <p className="text-sm font-semibold mt-0.5 truncate">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stage pipeline */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-rose-500" /> Stage Pipeline
              <Badge variant="secondary" className="text-[10px] ml-1">{stages.length} stages</Badge>
            </h3>
            <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
              {stages.map((s, i) => (
                <div key={s.id} className="flex items-stretch shrink-0">
                  <div
                    className="w-44 rounded-lg border bg-background shadow-sm flex flex-col"
                    style={{ borderColor: `${s.color}55` }}
                  >
                    <div className="h-1.5 rounded-t-lg" style={{ backgroundColor: s.color }} />
                    <div className="p-3 flex-1 flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: s.color }}
                        >{i + 1}</span>
                        <span className="text-xs font-semibold text-foreground truncate">{s.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-mono py-0 h-4 w-fit mb-1.5">{s.code}</Badge>
                      {s.description && (
                        <p className="text-[10px] text-muted-foreground leading-snug line-clamp-3">{s.description}</p>
                      )}
                      <div className="mt-auto pt-2 flex items-center gap-1 flex-wrap">
                        {s.isInitial && <Badge variant="secondary" className="text-[9px] py-0 h-4">Initial</Badge>}
                        {s.isFinal && <Badge variant="secondary" className="text-[9px] py-0 h-4">Final</Badge>}
                        {s.isMandatory && <Badge className="text-[9px] py-0 h-4 bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">Mandatory</Badge>}
                        {typeof s.slaDays === "number" && (
                          <Badge variant="outline" className="text-[9px] py-0 h-4 gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> {s.slaDays}d
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {i < stages.length - 1 && (
                    <div className="flex items-center px-1">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Wizard step completion */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-rose-500" /> Wizard Step Completion
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {workflow.steps.map((s, i) => (
                <div
                  key={s.id}
                  className={cn(
                    "rounded-lg border p-2.5 flex items-center gap-2",
                    s.status === "complete"
                      ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-500/5 dark:border-emerald-500/30"
                      : "border-amber-300 bg-amber-50/40 dark:bg-amber-500/5 dark:border-amber-500/30",
                  )}
                >
                  {s.status === "complete"
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Step {i + 1}</p>
                    <p className="text-xs font-medium truncate">{s.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border/60 bg-muted/30 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Version History Dialog
// ============================================================================

function VersionHistoryDialog({ workflow, open, onOpenChange }: {
  workflow: ExitWorkflow | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!workflow) return null
  // Mock version history
  const versions = Array.from({ length: workflow.version }, (_, i) => ({
    version: i + 1,
    isCurrent: i + 1 === workflow.version,
    publishedAt: workflow.createdAt,
    publishedBy: "Anita Desai",
    notes: i === 0 ? "Initial version" : `Revision ${i + 1} — refinements to clearance tasks and FnF rules`,
  })).reverse()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border/60 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-rose-500" /> Version History
            <Badge variant="outline" className="font-mono text-[10px] ml-2">{workflow.code}</Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">{workflow.name} — {versions.length} version(s) published.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {versions.map((v) => (
              <Card key={v.version} className={cn(
                "border-border/60 shadow-sm",
                v.isCurrent && "border-rose-300 dark:border-rose-500/40",
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "grid h-9 w-9 place-items-center rounded-full text-white shrink-0",
                        v.isCurrent ? "bg-rose-500" : "bg-muted-foreground",
                      )}>
                        <GitBranch className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">Version {v.version}</span>
                          {v.isCurrent && <Badge className="text-[10px] py-0 h-5 bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">Current</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{v.notes}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Published {formatDate(v.publishedAt)} by {v.publishedBy}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs">View</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <DialogFooter className="px-6 py-3 border-t border-border/60 bg-muted/30 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Assigned Exit Cases Dialog
// ============================================================================

function AssignedCasesDialog({ workflow, open, onOpenChange }: {
  workflow: ExitWorkflow | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!workflow) return null
  const cases = EXIT_CASES.filter((c) => c.workflowId === workflow.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border/60 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-rose-500" /> Assigned Exit Cases
            <Badge variant="secondary" className="text-[10px] ml-2">{cases.length} case(s)</Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">Exit cases currently using "{workflow.name}".</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cases.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No exit cases are currently assigned to this workflow.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Exit Case</TableHead>
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs">Stage</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Approved LWD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((c) => {
                  const stage = (workflow.stages || DEFAULT_EXIT_STAGES).find((s) => s.id === c.currentStageId)
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-mono">{c.exitCaseId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: c.avatarColor }}>
                            {initialsLocal(c.employeeName)}
                          </span>
                          <div>
                            <p className="text-xs font-medium">{c.employeeName}</p>
                            <p className="text-[10px] text-muted-foreground">{c.employeeCode}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {stage && (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                            {stage.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell><StatusPill status={c.exitStatus} /></TableCell>
                      <TableCell className="text-xs">{formatDate(c.approvedLwd)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter className="px-6 py-3 border-t border-border/60 bg-muted/30 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function initialsLocal(name: string): string {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
}

// ============================================================================
//  Main section
// ============================================================================

export function WorkflowsSection() {
  const [workflows, setWorkflows] = useState<ExitWorkflow[]>(EXIT_WORKFLOWS)
  const [search, setSearch] = useState("")
  const [scopeFilter, setScopeFilter] = useState<string>("All")
  const [statusFilter, setStatusFilter] = useState<string>("All")

  const [wizardOpen, setWizardOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ExitWorkflow | null>(null)

  const [previewTarget, setPreviewTarget] = useState<ExitWorkflow | null>(null)
  const [versionTarget, setVersionTarget] = useState<ExitWorkflow | null>(null)
  const [casesTarget, setCasesTarget] = useState<ExitWorkflow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExitWorkflow | null>(null)

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return workflows.filter((w) => {
      if (q && !w.name.toLowerCase().includes(q) && !w.code.toLowerCase().includes(q)) return false
      if (scopeFilter !== "All" && w.scopeType !== scopeFilter) return false
      if (statusFilter !== "All" && w.status !== statusFilter) return false
      return true
    })
  }, [workflows, search, scopeFilter, statusFilter])

  const stats = React.useMemo(() => ({
    total: workflows.length,
    published: workflows.filter((w) => w.status === "Published").length,
    draft: workflows.filter((w) => w.status === "Draft").length,
    defaultCount: workflows.filter((w) => w.isDefault).length,
  }), [workflows])

  // -------- Actions --------
  const handleCreate = () => {
    setEditTarget(null)
    setWizardOpen(true)
  }
  const handleEdit = (w: ExitWorkflow) => {
    setEditTarget(w)
    setWizardOpen(true)
  }
  const handleClone = (w: ExitWorkflow) => {
    const clone: ExitWorkflow = {
      ...w,
      id: `wf-${Date.now()}`,
      name: `${w.name} (Clone)`,
      code: `${w.code}_COPY`,
      isDefault: false,
      status: "Draft",
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setWorkflows((prev) => [clone, ...prev])
    toast.success(`Workflow "${w.name}" cloned as "${clone.name}"`)
  }
  const handleValidate = (w: ExitWorkflow) => {
    const incomplete = w.steps.filter((s) => s.status === "incomplete")
    if (incomplete.length === 0) {
      toast.success(`"${w.name}" validation passed — all 14 steps complete`)
    } else {
      toast.error(`"${w.name}" has ${incomplete.length} incomplete step(s): ${incomplete.map((s) => s.title).join(", ")}`)
    }
  }
  const handlePublish = (w: ExitWorkflow) => {
    setWorkflows((prev) => prev.map((x) => x.id === w.id ? { ...x, status: "Published", updatedAt: new Date().toISOString() } : x))
    toast.success(`Workflow "${w.name}" published`)
  }
  const handleDeactivate = (w: ExitWorkflow) => {
    setWorkflows((prev) => prev.map((x) => x.id === w.id ? { ...x, status: "Draft", updatedAt: new Date().toISOString() } : x))
    toast.success(`Workflow "${w.name}" deactivated (reverted to Draft)`)
  }
  const handleArchive = (w: ExitWorkflow) => {
    setWorkflows((prev) => prev.map((x) => x.id === w.id ? { ...x, status: "Archived", updatedAt: new Date().toISOString() } : x))
    toast.success(`Workflow "${w.name}" archived`)
  }
  const handleNewVersion = (w: ExitWorkflow) => {
    setWorkflows((prev) => prev.map((x) => x.id === w.id ? { ...x, version: x.version + 1, status: "Draft", updatedAt: new Date().toISOString() } : x))
    toast.success(`New version (v${w.version + 1}) created for "${w.name}"`)
  }
  const handleDelete = (w: ExitWorkflow) => {
    const inUse = EXIT_CASES.some((c) => c.workflowId === w.id)
    if (inUse) {
      toast.error(`Cannot delete "${w.name}" — assigned to one or more exit cases`)
      return
    }
    setWorkflows((prev) => prev.filter((x) => x.id !== w.id))
    toast.success(`Workflow "${w.name}" deleted`)
    setDeleteTarget(null)
  }

  // -------- Render --------
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <WorkflowIcon className="h-5 w-5 text-rose-500" />
            Workflow Configuration
            <Badge variant="secondary" className="text-xs ml-1">{stats.total} total</Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Design and manage exit workflows — the brain of offboarding. Each workflow drives a Kanban board, clearance tasks, FnF, and letters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("Refreshing workflows…")}>
            <WorkflowIcon className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={handleCreate} className="gap-1.5 bg-rose-600 hover:bg-rose-700">
            <Plus className="h-4 w-4" /> Create Workflow
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Workflows", value: stats.total, icon: WorkflowIcon, color: "#f43f5e" },
          { label: "Published", value: stats.published, icon: CheckCircle2, color: "#10b981" },
          { label: "Drafts", value: stats.draft, icon: FileEdit, color: "#f59e0b" },
          { label: "Default", value: stats.defaultCount, icon: Star, color: "#8b5cf6" },
        ].map((s) => (
          <Card key={s.label} className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg shrink-0" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code…"
            className="pl-9 h-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue placeholder="Scope" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Scopes</SelectItem>
              {SCOPE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              {WORKFLOW_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/60 backdrop-blur z-10">
                <TableRow>
                  <TableHead className="text-xs min-w-[200px]">Workflow</TableHead>
                  <TableHead className="text-xs min-w-[120px]">Scope</TableHead>
                  <TableHead className="text-xs min-w-[120px]">Entity</TableHead>
                  <TableHead className="text-xs min-w-[120px]">Department</TableHead>
                  <TableHead className="text-xs min-w-[120px]">Employee Type</TableHead>
                  <TableHead className="text-xs min-w-[120px]">Exit Type</TableHead>
                  <TableHead className="text-xs min-w-[150px]">Kanban Board</TableHead>
                  <TableHead className="text-xs min-w-[160px]">Clearance Checklist</TableHead>
                  <TableHead className="text-xs min-w-[120px]">FnF Rule</TableHead>
                  <TableHead className="text-xs">Default</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Version</TableHead>
                  <TableHead className="text-xs text-right sticky right-0 bg-muted/60 backdrop-blur">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <WorkflowIcon className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {search || scopeFilter !== "All" || statusFilter !== "All"
                            ? "No workflows match your filters."
                            : "No workflows yet. Click \"Create Workflow\" to begin."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((w) => {
                    const checklist = EXIT_CHECKLISTS.find((c) => c.id === w.clearanceChecklistId)
                    const board = KANBAN_BOARDS.find((b) => b.id === w.kanbanBoardId)
                    const inUse = EXIT_CASES.some((c) => c.workflowId === w.id)
                    return (
                      <TableRow key={w.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300 shrink-0">
                              <WorkflowIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate flex items-center gap-1">
                                {w.name}
                                {w.isDefault && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>Default workflow</TooltipContent>
                                  </Tooltip>
                                )}
                              </p>
                              <p className="text-[10px] font-mono text-muted-foreground">{w.code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] py-0 h-5">{w.scopeType}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{w.entity || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{w.department || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{w.employmentType || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{w.exitType || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <KanbanSquare className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{w.kanbanBoardName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {checklist ? (
                            <div className="flex items-center gap-1.5">
                              <ClipboardCheck className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">{checklist.name}</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] py-0 h-5 font-mono">{w.fnfRuleId || "—"}</Badge>
                        </TableCell>
                        <TableCell>
                          {w.isDefault ? (
                            <Badge className="text-[10px] py-0 h-5 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 gap-0.5">
                              <Star className="h-2.5 w-2.5 fill-current" /> Default
                            </Badge>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] py-0 h-5">P{w.priority}</Badge>
                        </TableCell>
                        <TableCell><StatusPill status={w.status} /></TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] py-0 h-5 font-mono">v{w.version}</Badge>
                        </TableCell>
                        <TableCell className="text-right sticky right-0 bg-background">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Settings2 className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel className="text-xs">Workflow Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={handleCreate}>
                                <Plus className="h-3.5 w-3.5 mr-2" /> Create Workflow
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(w)} disabled={w.status === "Archived"}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Draft
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleClone(w)}>
                                <Copy className="h-3.5 w-3.5 mr-2" /> Clone
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setPreviewTarget(w)}>
                                <Eye className="h-3.5 w-3.5 mr-2" /> Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleValidate(w)}>
                                <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Validate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePublish(w)} disabled={w.status === "Published" || w.status === "Archived"}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Publish
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeactivate(w)} disabled={w.status !== "Published"}>
                                <Power className="h-3.5 w-3.5 mr-2" /> Deactivate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleArchive(w)} disabled={w.status === "Archived"}>
                                <Archive className="h-3.5 w-3.5 mr-2" /> Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleNewVersion(w)}>
                                <GitBranch className="h-3.5 w-3.5 mr-2" /> Create New Version
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setCasesTarget(w)}>
                                <Users className="h-3.5 w-3.5 mr-2" /> View Assigned Exit Cases
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setVersionTarget(w)}>
                                <History className="h-3.5 w-3.5 mr-2" /> View Version History
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (inUse) {
                                    toast.error(`Cannot delete "${w.name}" — assigned to exit cases`)
                                  } else {
                                    setDeleteTarget(w)
                                  }
                                }}
                                disabled={inUse}
                                className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete {inUse ? "(in use)" : ""}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Wizard dialog */}
      <WorkflowWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        editWorkflow={editTarget}
      />

      {/* Preview dialog */}
      <WorkflowPreviewDialog
        workflow={previewTarget}
        open={!!previewTarget}
        onOpenChange={(v) => !v && setPreviewTarget(null)}
      />

      {/* Version history */}
      <VersionHistoryDialog
        workflow={versionTarget}
        open={!!versionTarget}
        onOpenChange={(v) => !v && setVersionTarget(null)}
      />

      {/* Assigned cases */}
      <AssignedCasesDialog
        workflow={casesTarget}
        open={!!casesTarget}
        onOpenChange={(v) => !v && setCasesTarget(null)}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-rose-500" /> Delete Workflow
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button size="sm" onClick={() => deleteTarget && handleDelete(deleteTarget)} className="gap-1.5 bg-rose-600 hover:bg-rose-700">
              <Trash2 className="h-3.5 w-3.5" /> Delete Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default WorkflowsSection
