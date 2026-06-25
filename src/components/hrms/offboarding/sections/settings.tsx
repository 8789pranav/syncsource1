"use client"

// =============================================================
// Offboarding — Settings (spec #20, #21, #22) — Task ID 2j
// Module-level controls + per-entity default configuration.
// 7 left-sidebar tabs. Rose theme accents.
// =============================================================

import * as React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Settings as SettingsIcon, UserMinus, Building2, ClipboardCheck,
  Wallet, Mail, Plus, Pencil, ChevronRight, Check,
  Save, X, Lock,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"

import {
  OffboardingSettings, EntityConfiguration,
} from "../shared"
import {
  OFFBOARDING_SETTINGS, ENTITY_CONFIGURATIONS,
  EXIT_WORKFLOWS, KANBAN_BOARDS, EXIT_CHECKLISTS, EXIT_INTERVIEW_FORMS,
  EXIT_EMAIL_TEMPLATES, EXIT_DOCUMENT_TEMPLATES,
} from "../data"

// =============================================================
// Type defs
// =============================================================

type FieldType = "switch" | "text" | "select"

interface FieldDef {
  key: string
  label: string
  description?: string
  type: FieldType
  placeholder?: string
  options?: string[]
  full?: boolean
}

interface CategoryDef {
  key: keyof OffboardingSettings
  label: string
  short: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  fields: FieldDef[]
}

// =============================================================
// Reference option lists — built from seed data
// =============================================================

const HR_OWNERS = ["Anita Desai", "Fatima Hassan", "Priya Patel", "Rajesh Kumar", "Vikram Singh"]
const FNF_RULES = ["India FnF Rule", "UAE FnF Rule", "US FnF Rule", "UK FnF Rule", "Standard FnF Rule"]
const ASSET_RULES = ["Standard Asset Recovery Rule", "India Asset Recovery Rule", "UAE Asset Recovery Rule", "US Asset Recovery Rule"]
const IT_RULES = ["Standard IT Revocation Rule", "India IT Revocation Rule", "UAE IT Revocation Rule", "Immediate Revoke Rule"]
// Build email group options from the seeded email templates (event types)
const EMAIL_GROUPS = Array.from(new Set([
  "India Exit Emails", "UAE Exit Emails", "US Exit Emails", "Standard Exit Emails",
  ...EXIT_EMAIL_TEMPLATES.map((t) => t.name),
]))
const APPROVAL_WORKFLOWS = ["Standard Exit Approval", "India Exit Approval", "UAE Exit Approval", "Termination Approval"]
// Build letter group options from the seeded document templates (document types)
const LETTER_GROUPS = Array.from(new Set([
  "India Exit Letters", "UAE Exit Letters", "Standard Exit Letters", "Termination Letters",
  ...EXIT_DOCUMENT_TEMPLATES.map((t) => t.documentType),
]))
const NOTICE_POLICIES = ["India 60-Day Notice Policy", "UAE 30-Day Notice Policy", "US 14-Day Notice Policy", "UK 30-Day Notice Policy"]
const ENTITIES = ["ACME India Pvt Ltd", "ACME UAE FZ-LLC", "ACME US Inc", "ACME UK Ltd"]

const WORKFLOW_OPTIONS = EXIT_WORKFLOWS.map((w) => w.name)
const BOARD_OPTIONS = KANBAN_BOARDS.map((b) => b.name)
const CHECKLIST_OPTIONS = EXIT_CHECKLISTS.map((c) => c.name)
const INTERVIEW_OPTIONS = EXIT_INTERVIEW_FORMS.map((f) => f.name)

// =============================================================
// Static field definitions per category
// =============================================================

const CATEGORIES: CategoryDef[] = [
  {
    key: "general",
    label: "General Settings",
    short: "General",
    icon: SettingsIcon,
    description: "Master switches and tenant defaults for the offboarding module.",
    fields: [
      { key: "enableModule", label: "Enable Offboarding Module", description: "Master switch for the entire offboarding module.", type: "switch" },
      { key: "allowEmployeeResignation", label: "Allow Employee Resignation", description: "Let employees submit resignations via self-service portal.", type: "switch" },
      { key: "allowManagerInitiatedExit", label: "Allow Manager Initiated Exit", description: "Managers can initiate exits for their team members.", type: "switch" },
      { key: "allowHrInitiatedExit", label: "Allow HR Initiated Exit", description: "HR admins can initiate exits directly.", type: "switch" },
      { key: "allowBulkExitInitiation", label: "Allow Bulk Exit", description: "Initiate exits for multiple employees at once.", type: "switch" },
      { key: "allowResignationWithdrawal", label: "Allow Resignation Withdrawal", description: "Employees can withdraw a submitted resignation.", type: "switch" },
      { key: "allowExitCancellation", label: "Allow Exit Cancellation", description: "HR can cancel an in-progress exit case.", type: "switch" },
      { key: "allowRehire", label: "Allow Rehire", description: "Track rehire eligibility and re-onboard ex-employees.", type: "switch" },
      { key: "defaultExitWorkflow", label: "Default Exit Workflow", description: "Used when no entity or exit-type override applies.", type: "select", options: WORKFLOW_OPTIONS, full: true },
      { key: "defaultKanbanBoard", label: "Default Kanban Board", description: "Default board for tracking exit case stage movement.", type: "select", options: BOARD_OPTIONS, full: true },
      { key: "defaultHrOwner", label: "Default HR Owner", description: "Fallback HR owner assigned to new exit cases.", type: "select", options: HR_OWNERS, full: true },
    ],
  },
  {
    key: "employeeExit",
    label: "Employee Exit Settings",
    short: "Employee Exit",
    icon: UserMinus,
    description: "Exit ID generation, duplicate detection and edit rules.",
    fields: [
      { key: "exitIdAutoGenerate", label: "Exit ID Auto Generate", description: "Automatically generate exit case IDs on creation.", type: "switch" },
      { key: "exitIdPrefix", label: "Exit ID Prefix", description: "Prefix used when generating exit case IDs.", type: "text", placeholder: "EXIT" },
      { key: "exitIdFormat", label: "Exit ID Format", description: "Use {YYYY} for year and {####} for running number.", type: "text", placeholder: "EXIT-{YYYY}-{####}", full: true },
      { key: "duplicateCheck", label: "Duplicate Active Exit Case Check", description: "Prevent creating a second active exit for the same employee.", type: "switch" },
      { key: "allowBackdated", label: "Allow Backdated Exit Initiation", description: "Allow initiating exits with a past resignation date.", type: "switch" },
      { key: "allowFutureDated", label: "Allow Future-Dated Exit", description: "Allow initiating exits with a future resignation date.", type: "switch" },
      { key: "allowLwdChange", label: "Allow LWD Change", description: "Allow updating the last working day after exit is initiated.", type: "switch" },
      { key: "allowExitHold", label: "Allow Exit Hold", description: "Allow putting an exit case on hold temporarily.", type: "switch" },
      { key: "allowExitReopen", label: "Allow Exit Reopen", description: "Allow reopening a closed or cancelled exit case.", type: "switch" },
    ],
  },
  {
    key: "clearance",
    label: "Clearance Settings",
    short: "Clearance",
    icon: ClipboardCheck,
    description: "Department-wise clearance task configuration and blocking rules.",
    fields: [
      { key: "enableClearance", label: "Enable Clearance", description: "Master switch for the clearance process.", type: "switch" },
      { key: "allowEntityWise", label: "Allow Entity-Wise", description: "Per-entity clearance checklists.", type: "switch" },
      { key: "allowDeptWise", label: "Allow Department-Wise", description: "Per-department clearance checklists.", type: "switch" },
      { key: "allowMandatoryTask", label: "Allow Mandatory Task", description: "Allow marking clearance tasks as mandatory.", type: "switch" },
      { key: "allowBlockingTask", label: "Allow Blocking Task", description: "Blocking tasks prevent exit closure until completed.", type: "switch" },
      { key: "allowTaskWaiver", label: "Allow Task Waiver", description: "Allow waiving clearance tasks with approval.", type: "switch" },
      { key: "allowRecoveryAmount", label: "Allow Recovery Amount", description: "Allow raising recovery amounts on clearance tasks.", type: "switch" },
      { key: "requireBeforeFnf", label: "Require Before FnF", description: "Block FnF until clearance is complete.", type: "switch" },
      { key: "requireBeforeExitClosure", label: "Require Before Exit Closure", description: "Block exit closure until clearance is complete.", type: "switch" },
    ],
  },
  {
    key: "fnf",
    label: "FnF Settings",
    short: "FnF",
    icon: Wallet,
    description: "Full & Final settlement calculation, approval and tracking.",
    fields: [
      { key: "enableFnf", label: "Enable FnF", description: "Master switch for the FnF settlement process.", type: "switch" },
      { key: "allowEntityWise", label: "Allow Entity-Wise", description: "Per-entity FnF rules.", type: "switch" },
      { key: "allowPayrollGroupWise", label: "Allow Payroll Group-Wise", description: "Per-payroll-group FnF rules.", type: "switch" },
      { key: "autoFetchPayroll", label: "Auto Fetch Payroll Inputs", description: "Automatically pull payroll inputs into FnF.", type: "switch" },
      { key: "autoFetchLeaveEncashment", label: "Auto Fetch Leave Encashment", description: "Auto-calculate leave encashment from leave balance.", type: "switch" },
      { key: "autoFetchAssetRecovery", label: "Auto Fetch Asset Recovery", description: "Auto-pull asset damage/loss recovery amounts.", type: "switch" },
      { key: "autoFetchLoanRecovery", label: "Auto Fetch Loan Recovery", description: "Auto-pull outstanding loan recovery amounts.", type: "switch" },
      { key: "allowManualEarnings", label: "Allow Manual Earnings", description: "Let HR add manual earning line items.", type: "switch" },
      { key: "allowManualDeductions", label: "Allow Manual Deductions", description: "Let HR add manual deduction line items.", type: "switch" },
      { key: "fnfApprovalRequired", label: "Approval Required", description: "FnF requires finance approval before payment.", type: "switch" },
      { key: "fnfPaymentTracking", label: "Payment Tracking", description: "Track FnF payment status and date.", type: "switch" },
    ],
  },
  {
    key: "email",
    label: "Email Settings",
    short: "Email",
    icon: Mail,
    description: "Notification triggers, templates, retries and default sender.",
    fields: [
      { key: "enableNotifications", label: "Enable Notifications", description: "Master switch for exit email notifications.", type: "switch" },
      { key: "enableEntityWise", label: "Enable Entity-Wise", description: "Per-entity email templates.", type: "switch" },
      { key: "enableWorkflowWise", label: "Enable Workflow-Wise", description: "Per-workflow email templates.", type: "switch" },
      { key: "enableStageWise", label: "Enable Stage-Wise", description: "Trigger emails on stage transitions.", type: "switch" },
      { key: "enableReminders", label: "Enable Reminders", description: "Send reminder emails for pending tasks.", type: "switch" },
      { key: "enableEscalations", label: "Enable Escalations", description: "Escalate overdue tasks via email.", type: "switch" },
      { key: "enableEmailLogs", label: "Enable Logs", description: "Log every email sent for audit.", type: "switch" },
      { key: "enableRetry", label: "Enable Retry", description: "Retry failed emails automatically.", type: "switch" },
      { key: "defaultFromEmail", label: "Default From Email", type: "text", placeholder: "hr@acmecorp.com", full: true },
      { key: "defaultReplyTo", label: "Default Reply-To Email", type: "text", placeholder: "hr-support@acmecorp.com", full: true },
    ],
  },
  {
    key: "audit",
    label: "Audit & Security",
    short: "Audit & Security",
    icon: Lock,
    description: "Audit trail, change tracking and access controls.",
    fields: [
      { key: "enableAuditLog", label: "Enable Audit Log", description: "Master switch for the audit trail.", type: "switch" },
      { key: "trackExitDetails", label: "Track Exit Details Changes", type: "switch" },
      { key: "trackWorkflowChanges", label: "Track Workflow Changes", type: "switch" },
      { key: "trackStageMovement", label: "Track Stage Movement", type: "switch" },
      { key: "trackClearance", label: "Track Clearance Changes", type: "switch" },
      { key: "trackAssetRecovery", label: "Track Asset Recovery Changes", type: "switch" },
      { key: "trackItRevocation", label: "Track IT Revocation Changes", type: "switch" },
      { key: "trackFnf", label: "Track FnF Changes", type: "switch" },
      { key: "trackLetterGeneration", label: "Track Letter Generation", type: "switch" },
      { key: "trackEmployeeStatus", label: "Track Employee Status Change", type: "switch" },
      { key: "softDeleteOnly", label: "Soft Delete Only", description: "Never hard-delete records; mark them as deleted.", type: "switch" },
      { key: "rbac", label: "Role-Based Access Control", description: "Enforce role-based permissions on offboarding actions.", type: "switch" },
    ],
  },
]

// Insert Entity Configuration as the 3rd tab (after Employee Exit, before Clearance)
const ENTITY_TAB_ID = "__entity__"

interface TabDef {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  isEntity?: boolean
}

function buildTabs(): TabDef[] {
  const tabs: TabDef[] = []
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i]
    tabs.push({ id: c.key, label: c.short, icon: c.icon, description: c.description })
    if (i === 1) {
      tabs.push({ id: ENTITY_TAB_ID, label: "Entity Configuration", icon: Building2, description: "Per-entity offboarding defaults.", isEntity: true })
    }
  }
  return tabs
}

const TABS = buildTabs()

// =============================================================
// Main Section
// =============================================================

export function SettingsSection() {
  const [activeTab, setActiveTab] = useState<string>("general")

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Module-level controls and per-entity default configuration for offboarding.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
        {/* LEFT: vertical tab bar */}
        <nav aria-label="Settings sections" className="lg:sticky lg:top-4 lg:self-start">
          <div className="bg-muted/30 rounded-xl p-1.5 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:max-h-[calc(100vh-2rem)]">
            {TABS.map((t) => {
              const Icon = t.icon
              const active = activeTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap lg:w-full lg:justify-between",
                    active
                      ? "bg-card shadow-soft text-rose-700 dark:text-rose-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/60",
                  )}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground group-hover:text-foreground",
                    )} />
                    <span className="truncate">{t.label}</span>
                  </span>
                  {t.isEntity && (
                    <Badge variant="outline" className="hidden lg:inline-flex text-[10px] px-1.5 py-0 h-4 border-rose-300/60 text-rose-700 dark:text-rose-300 dark:border-rose-500/40">
                      Spec #21
                    </Badge>
                  )}
                  {active && <ChevronRight className="hidden lg:block h-3.5 w-3.5 text-rose-500 shrink-0" />}
                </button>
              )
            })}
          </div>
        </nav>

        {/* RIGHT: tab content */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {activeTab === ENTITY_TAB_ID ? <EntityConfigurationPanel /> : <SettingsFormPanel tabId={activeTab} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// =============================================================
// Settings Form Panel (for the 6 normal categories)
// =============================================================

function SettingsFormPanel({ tabId }: { tabId: string }) {
  const cat = CATEGORIES.find((c) => c.key === tabId)!
  const [values, setValues] = useState<Record<string, any>>(() => {
    const v: Record<string, any> = {}
    const seed = OFFBOARDING_SETTINGS[cat.key] as any
    for (const f of cat.fields) v[f.key] = seed?.[f.key] ?? defaultFor(f)
    return v
  })

  function setValue(key: string, value: any) {
    setValues((prev) => ({ ...prev, [key]: value }))
    const field = cat.fields.find((f) => f.key === key)
    if (field?.type === "switch") {
      toast.success(`${field.label}: ${value ? "Enabled" : "Disabled"}`, {
        description: `${cat.label} updated locally.`,
      })
    } else {
      toast.success(`${field?.label || key} updated`, { description: `${cat.label} updated locally.` })
    }
  }

  const switches = cat.fields.filter((f) => f.type === "switch")
  const others = cat.fields.filter((f) => f.type !== "switch")

  return (
    <Card className="rounded-xl border-border/60 shadow-soft">
      <CardContent className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-border/60">
          <div className="flex items-start gap-3 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20">
              <cat.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">{cat.label}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
            </div>
          </div>
          <Badge variant="outline" className="border-rose-300/60 text-rose-700 dark:text-rose-300 dark:border-rose-500/40 shrink-0">
            <Check className="h-3 w-3 mr-1" /> Saved
          </Badge>
        </div>

        {/* Switches */}
        {switches.length > 0 && (
          <div className={cn("grid gap-3 pt-4", switches.length >= 4 ? "sm:grid-cols-2" : "grid-cols-1")}>
            {switches.map((f) => (
              <SwitchRow key={f.key} field={f} checked={!!values[f.key]} onChange={(v) => setValue(f.key, v)} />
            ))}
          </div>
        )}

        {switches.length > 0 && others.length > 0 && <Separator className="my-4" />}

        {/* Text/Select fields */}
        {others.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {others.map((f) => (
              <FieldRow key={f.key} field={f} value={values[f.key]} onChange={(v) => setValue(f.key, v)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function defaultFor(f: FieldDef): any {
  switch (f.type) {
    case "switch": return false
    case "select": return f.options?.[0] ?? ""
    default: return ""
  }
}

// ---------- Field primitives ----------

function SwitchRow({ field, checked, onChange }: { field: FieldDef; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      htmlFor={`sw-${field.key}`}
      className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 hover:bg-background p-3 transition-colors cursor-pointer"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{field.label}</div>
        {field.description && <div className="text-xs text-muted-foreground mt-0.5">{field.description}</div>}
      </div>
      <Switch
        id={`sw-${field.key}`}
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-rose-600 dark:data-[state=checked]:bg-rose-500 mt-0.5"
      />
    </label>
  )
}

function FieldRow({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  return (
    <div className={cn("flex flex-col gap-1.5", field.full && "sm:col-span-2")}>
      <Label htmlFor={`f-${field.key}`} className="text-xs font-medium text-foreground">{field.label}</Label>
      {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
      {field.type === "select" ? (
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger id={`f-${field.key}`} className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {(field.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={`f-${field.key}`}
          value={value ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-9"
        />
      )}
    </div>
  )
}

// =============================================================
// Entity Configuration Panel
// =============================================================

const ENTITY_CONFIG_STATUSES = ["Active", "Inactive"] as const

interface EntityConfigFormState {
  id?: string
  entity: string
  useTenantDefault: boolean
  defaultExitWorkflow: string
  defaultKanbanBoard: string
  defaultClearanceChecklist: string
  defaultAssetRecoveryRule: string
  defaultItRevocationRule: string
  defaultFnfRule: string
  defaultExitInterviewForm: string
  defaultEmailGroup: string
  defaultApprovalWorkflow: string
  defaultLetterGroup: string
  defaultHrOwner: string
  defaultNoticePolicy: string
  effectiveFrom: string
  effectiveTo: string
  status: "Active" | "Inactive"
}

const EMPTY_FORM: EntityConfigFormState = {
  entity: "",
  useTenantDefault: true,
  defaultExitWorkflow: "",
  defaultKanbanBoard: "",
  defaultClearanceChecklist: "",
  defaultAssetRecoveryRule: "",
  defaultItRevocationRule: "",
  defaultFnfRule: "",
  defaultExitInterviewForm: "",
  defaultEmailGroup: "",
  defaultApprovalWorkflow: "",
  defaultLetterGroup: "",
  defaultHrOwner: "",
  defaultNoticePolicy: "",
  effectiveFrom: "",
  effectiveTo: "",
  status: "Active",
}

function toForm(ec: EntityConfiguration): EntityConfigFormState {
  return {
    id: ec.id,
    entity: ec.entity,
    useTenantDefault: ec.useTenantDefault,
    defaultExitWorkflow: ec.defaultExitWorkflow || "",
    defaultKanbanBoard: ec.defaultKanbanBoard || "",
    defaultClearanceChecklist: ec.defaultClearanceChecklist || "",
    defaultAssetRecoveryRule: ec.defaultAssetRecoveryRule || "",
    defaultItRevocationRule: ec.defaultItRevocationRule || "",
    defaultFnfRule: ec.defaultFnfRule || "",
    defaultExitInterviewForm: ec.defaultExitInterviewForm || "",
    defaultEmailGroup: ec.defaultEmailGroup || "",
    defaultApprovalWorkflow: ec.defaultApprovalWorkflow || "",
    defaultLetterGroup: ec.defaultLetterGroup || "",
    defaultHrOwner: ec.defaultHrOwner || "",
    defaultNoticePolicy: ec.defaultNoticePolicy || "",
    effectiveFrom: ec.effectiveFrom || "",
    effectiveTo: ec.effectiveTo || "",
    status: ec.status,
  }
}

function EntityConfigurationPanel() {
  const [configs, setConfigs] = useState<EntityConfiguration[]>(ENTITY_CONFIGURATIONS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<EntityConfigFormState>(EMPTY_FORM)

  function openAdd() {
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }
  function openEdit(ec: EntityConfiguration) {
    setForm(toForm(ec))
    setDialogOpen(true)
  }

  function setField<K extends keyof EntityConfigFormState>(k: K, v: EntityConfigFormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function handleSave() {
    if (!form.entity) {
      toast.error("Please select an entity / company.")
      return
    }
    const isEdit = !!form.id
    const newConfig: EntityConfiguration = {
      id: form.id || `ec-${Date.now()}`,
      entity: form.entity,
      useTenantDefault: form.useTenantDefault,
      defaultExitWorkflow: form.useTenantDefault ? undefined : form.defaultExitWorkflow || undefined,
      defaultKanbanBoard: form.useTenantDefault ? undefined : form.defaultKanbanBoard || undefined,
      defaultClearanceChecklist: form.useTenantDefault ? undefined : form.defaultClearanceChecklist || undefined,
      defaultAssetRecoveryRule: form.useTenantDefault ? undefined : form.defaultAssetRecoveryRule || undefined,
      defaultItRevocationRule: form.useTenantDefault ? undefined : form.defaultItRevocationRule || undefined,
      defaultFnfRule: form.useTenantDefault ? undefined : form.defaultFnfRule || undefined,
      defaultExitInterviewForm: form.useTenantDefault ? undefined : form.defaultExitInterviewForm || undefined,
      defaultEmailGroup: form.useTenantDefault ? undefined : form.defaultEmailGroup || undefined,
      defaultApprovalWorkflow: form.useTenantDefault ? undefined : form.defaultApprovalWorkflow || undefined,
      defaultLetterGroup: form.useTenantDefault ? undefined : form.defaultLetterGroup || undefined,
      defaultHrOwner: form.useTenantDefault ? undefined : form.defaultHrOwner || undefined,
      defaultNoticePolicy: form.useTenantDefault ? undefined : form.defaultNoticePolicy || undefined,
      effectiveFrom: form.effectiveFrom || undefined,
      effectiveTo: form.effectiveTo || undefined,
      status: form.status,
    }
    setConfigs((prev) => isEdit
      ? prev.map((c) => (c.id === newConfig.id ? newConfig : c))
      : [...prev, newConfig])
    setDialogOpen(false)
    toast.success(isEdit ? `Configuration updated for ${newConfig.entity}` : `Configuration added for ${newConfig.entity}`)
  }

  return (
    <Card className="rounded-xl border-border/60 shadow-soft">
      <CardContent className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/60">
          <div className="flex items-start gap-3 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">Entity Configuration</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Per-entity default workflows, checklists, FnF rules, email groups and HR owners.
              </p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shrink-0" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Entity Configuration
          </Button>
        </div>

        {/* Table */}
        <div className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[180px]">Entity</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[110px]">Use Tenant Default</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[180px]">Default Workflow</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[160px]">Kanban Board</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[180px]">Clearance Checklist</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[150px]">FnF Rule</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[160px]">Email Group</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[180px]">Exit Interview Form</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[160px]">Letter Group</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[140px]">HR Owner</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[150px]">Notice Policy</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[90px]">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((ec) => (
                <TableRow key={ec.id} className="border-border/40 hover:bg-rose-50/40 dark:hover:bg-rose-500/5 transition-colors">
                  <TableCell className="text-sm font-medium text-foreground">{ec.entity}</TableCell>
                  <TableCell>
                    {ec.useTenantDefault ? (
                      <Badge variant="outline" className="border-border/60 text-foreground/70">Yes</Badge>
                    ) : (
                      <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-0">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-foreground/90">{ec.defaultExitWorkflow || "—"}</TableCell>
                  <TableCell className="text-xs text-foreground/90">{ec.defaultKanbanBoard || "—"}</TableCell>
                  <TableCell className="text-xs text-foreground/90">{ec.defaultClearanceChecklist || "—"}</TableCell>
                  <TableCell className="text-xs text-foreground/90">{ec.defaultFnfRule || "—"}</TableCell>
                  <TableCell className="text-xs text-foreground/90">{ec.defaultEmailGroup || "—"}</TableCell>
                  <TableCell className="text-xs text-foreground/90">{ec.defaultExitInterviewForm || "—"}</TableCell>
                  <TableCell className="text-xs text-foreground/90">{ec.defaultLetterGroup || "—"}</TableCell>
                  <TableCell className="text-xs text-foreground/90">{ec.defaultHrOwner || "—"}</TableCell>
                  <TableCell className="text-xs text-foreground/90">{ec.defaultNoticePolicy || "—"}</TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "font-medium border-0",
                      ec.status === "Active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
                    )}>
                      {ec.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300" onClick={() => openEdit(ec)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {configs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} className="py-12 text-center text-muted-foreground text-sm">
                    No entity configurations yet. Click &ldquo;Add Entity Configuration&rdquo; to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Add/Edit dialog */}
      <EntityConfigDialog
        open={dialogOpen}
        form={form}
        onFieldChange={setField}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        isEdit={!!form.id}
      />
    </Card>
  )
}

// =============================================================
// Entity Configuration Dialog
// =============================================================

function EntityConfigDialog({
  open, form, onFieldChange, onClose, onSave, isEdit,
}: {
  open: boolean
  form: EntityConfigFormState
  onFieldChange: <K extends keyof EntityConfigFormState>(k: K, v: EntityConfigFormState[K]) => void
  onClose: () => void
  onSave: () => void
  isEdit: boolean
}) {
  const selectField = (key: keyof EntityConfigFormState, label: string, options: string[]) => (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <Select value={String(form[key] ?? "")} onValueChange={(v) => onFieldChange(key, v as any)}>
        <SelectTrigger className="w-full h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-rose-500/8 via-transparent to-transparent">
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            {isEdit ? "Edit Entity Configuration" : "Add Entity Configuration"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure per-entity offboarding defaults. When &ldquo;Use Tenant Default&rdquo; is on, the tenant-level settings apply.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[68vh] px-5 py-4 flex flex-col gap-4">
          {/* Top row: Entity + Use Tenant Default + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Entity / Company *</Label>
              <Select value={form.entity} onValueChange={(v) => onFieldChange("entity", v)}>
                <SelectTrigger className="w-full h-9"><SelectValue placeholder="Select entity..." /></SelectTrigger>
                <SelectContent>
                  {ENTITIES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Use Tenant Default</div>
                <p className="text-xs text-muted-foreground mt-0.5">Inherit tenant-level defaults for this entity.</p>
              </div>
              <Switch
                checked={form.useTenantDefault}
                onCheckedChange={(v) => onFieldChange("useTenantDefault", v)}
                className="data-[state=checked]:bg-rose-600 dark:data-[state=checked]:bg-rose-500"
              />
            </div>
          </div>

          {!form.useTenantDefault && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-4"
            >
              <Separator />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Entity-Specific Defaults
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectField("defaultExitWorkflow", "Default Exit Workflow", WORKFLOW_OPTIONS)}
                {selectField("defaultKanbanBoard", "Default Kanban Board", BOARD_OPTIONS)}
                {selectField("defaultClearanceChecklist", "Default Clearance Checklist", CHECKLIST_OPTIONS)}
                {selectField("defaultAssetRecoveryRule", "Default Asset Recovery Rule", ASSET_RULES)}
                {selectField("defaultItRevocationRule", "Default IT Revocation Rule", IT_RULES)}
                {selectField("defaultFnfRule", "Default FnF Rule", FNF_RULES)}
                {selectField("defaultExitInterviewForm", "Default Exit Interview Form", INTERVIEW_OPTIONS)}
                {selectField("defaultEmailGroup", "Default Email Group", EMAIL_GROUPS)}
                {selectField("defaultApprovalWorkflow", "Default Approval Workflow", APPROVAL_WORKFLOWS)}
                {selectField("defaultLetterGroup", "Default Letter Group", LETTER_GROUPS)}
                {selectField("defaultHrOwner", "Default HR Owner", HR_OWNERS)}
                {selectField("defaultNoticePolicy", "Default Notice Policy", NOTICE_POLICIES)}
              </div>
            </motion.div>
          )}

          <Separator />

          {/* Effective dates + status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="effectiveFrom" className="text-xs font-medium text-foreground">Effective From</Label>
              <Input
                id="effectiveFrom"
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => onFieldChange("effectiveFrom", e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="effectiveTo" className="text-xs font-medium text-foreground">Effective To</Label>
              <Input
                id="effectiveTo"
                type="date"
                value={form.effectiveTo}
                onChange={(e) => onFieldChange("effectiveTo", e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => onFieldChange("status", v as any)}>
                <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITY_CONFIG_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/30 flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onClose}>
            <X className="h-4 w-4" /> Cancel
          </Button>
          <Button size="sm" className="gap-1.5 ml-auto bg-rose-600 hover:bg-rose-700 text-white" onClick={onSave}>
            <Save className="h-4 w-4" /> {isEdit ? "Save Changes" : "Add Configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsSection
