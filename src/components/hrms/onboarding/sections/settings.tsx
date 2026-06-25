"use client"

// ============================================================================
//  SettingsSection — Onboarding module Settings (spec #13) + Entity
//  Configuration (spec #14). 15 vertical tabs on the left; the 3rd tab is a
//  special entity-config table (Add / Edit / Delete dialog). The other 14 are
//  form panels driven by the pre-seeded onboarding-settings JSON.
// ============================================================================

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Settings as SettingsIcon, Users, Building2, KanbanSquare, Workflow as WorkflowIcon,
  FileText, LayoutTemplate, ListChecks, Mail, ShieldCheck, BadgeCheck, Globe,
  UserCog, ArrowUpDown, Lock, Save, Plus, Pencil, Trash2, AlertTriangle, Check, X,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

import { PageHeader, SectionCard, EmptyState, StatusBadge } from "@/components/hrms/ui"
import {
  useFetch, apiPost, apiPatch, apiDelete, safeToast, safeParseJson,
  formatDate,
} from "@/components/hrms/onboarding/shared"

// ============================================================================
//  Types
// ============================================================================

type FieldType = "switch" | "text" | "number" | "select"

interface FieldDef {
  key: string
  label: string
  description?: string
  type: FieldType
  placeholder?: string
  options?: { value: string; label: string }[]
}

interface CategoryDef {
  /** API category key — must match the seeded `OnboardingSetting.category` */
  category: string
  /** Visible tab label */
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  fields: FieldDef[]
}

interface SettingValue {
  [category: string]: Record<string, any>
}

interface EntityOption {
  id: string
  legalName: string
  tradeName?: string | null
  code: string
}

interface EntityConfig {
  id: string
  tenantId: string
  entityId: string
  useTenantDefault: boolean
  defaultWorkflowId: string | null
  defaultKanbanBoardId: string | null
  defaultCandidateFormId: string | null
  defaultDocumentSet: string | null
  defaultChecklistSet: string | null
  defaultEmailGroup: string | null
  defaultVerificationRule: string | null
  defaultApprovalWorkflow: string | null
  defaultCandidatePortalSetting: string | null
  defaultEmployeeConversionRule: string | null
  defaultHrOwner: string | null
  defaultRecruiter: string | null
  defaultReportingManagerRule: string | null
  defaultSetupRule: string | null
  effectiveFrom: string | null
  effectiveTo: string | null
  status: string
  entity: { id: string; name: string; code: string } | null
  createdAt: string
  updatedAt: string
}

// ============================================================================
//  Static field definitions — driven by seed defaults (onboarding-seed/route.ts)
// ============================================================================

const CONFLICT_OPTIONS = [
  { value: "Highest Priority Wins", label: "Highest Priority Wins" },
  { value: "Block Conflict", label: "Block Conflict" },
  { value: "Ask Admin To Resolve", label: "Ask Admin To Resolve" },
]

const SEND_MODE_OPTIONS = [
  { value: "Immediately", label: "Immediately" },
  { value: "Queue", label: "Queue" },
]

const CATEGORIES: CategoryDef[] = [
  {
    category: "general",
    label: "General",
    icon: SettingsIcon,
    description: "Master switches for the onboarding module.",
    fields: [
      { key: "enableOnboardingModule", label: "Enable onboarding module", description: "Master switch for the entire module.", type: "switch" },
      { key: "enableCandidateOnboarding", label: "Candidate onboarding", description: "Allow new candidates to be initiated.", type: "switch" },
      { key: "enableEmployeeOnboarding", label: "Employee onboarding", description: "Allow candidates to convert to employees.", type: "switch" },
      { key: "enableBulkCandidateUpload", label: "Bulk candidate upload", description: "Allow importing candidates via CSV.", type: "switch" },
      { key: "enableRehireOnboarding", label: "Rehire onboarding", description: "Re-onboard ex-employees through a faster pipeline.", type: "switch" },
      { key: "enableInternalTransferOnboarding", label: "Internal transfer onboarding", description: "Onboard employees transferring between entities.", type: "switch" },
      { key: "allowSaveAsDraft", label: "Allow save as draft", description: "Let HR save candidate records as drafts.", type: "switch" },
      { key: "allowDeleteDraftCandidate", label: "Allow delete draft candidate", description: "Permit deletion of draft candidates.", type: "switch" },
    ],
  },
  {
    category: "candidate",
    label: "Candidate",
    icon: Users,
    description: "Candidate ID, duplicate detection and edit rules.",
    fields: [
      { key: "candidateIdAutoGenerate", label: "Auto-generate candidate ID", type: "switch" },
      { key: "candidateIdPrefix", label: "Candidate ID prefix", description: "Prefix used when generating candidate IDs.", type: "text", placeholder: "CAND" },
      { key: "candidateIdFormat", label: "Candidate ID format", description: "Use {YYYY} for year and {####} for running number.", type: "text", placeholder: "CAND-{YYYY}-{####}" },
      { key: "duplicateCheckByEmail", label: "Duplicate check by email", type: "switch" },
      { key: "duplicateCheckByMobile", label: "Duplicate check by mobile", type: "switch" },
      { key: "allowCandidateEditAfterSubmit", label: "Allow candidate edit after submit", type: "switch" },
      { key: "allowHrEditCandidateData", label: "Allow HR to edit candidate data", type: "switch" },
      { key: "candidatePortalExpiryDays", label: "Portal expiry (days)", description: "How long the candidate portal link stays valid.", type: "number", placeholder: "30" },
    ],
  },
  {
    category: "kanban",
    label: "Kanban",
    icon: KanbanSquare,
    description: "Board customisation and stage movement rules.",
    fields: [
      { key: "allowCustomKanbanBoard", label: "Allow custom boards", type: "switch" },
      { key: "allowEntityWiseBoard", label: "Entity-wise boards", type: "switch" },
      { key: "allowWorkflowWiseBoard", label: "Workflow-wise boards", type: "switch" },
      { key: "allowStageRename", label: "Allow stage rename", type: "switch" },
      { key: "allowStageReorder", label: "Allow stage reorder", type: "switch" },
      { key: "allowMandatoryStage", label: "Allow mandatory stage", type: "switch" },
      { key: "allowStageSkip", label: "Allow stage skip", type: "switch" },
      { key: "allowStageSla", label: "Allow stage SLA", type: "switch" },
      { key: "allowAutoStageMovement", label: "Allow auto stage movement", type: "switch" },
      { key: "allowManualStageMovement", label: "Allow manual stage movement", type: "switch" },
      { key: "allowDragAndDrop", label: "Allow drag-and-drop", type: "switch" },
      { key: "requireReasonForManualStageMove", label: "Require reason for manual move", type: "switch" },
    ],
  },
  {
    category: "workflow",
    label: "Workflow",
    icon: WorkflowIcon,
    description: "Workflow authoring, versioning and conflict handling.",
    fields: [
      { key: "allowMultipleWorkflows", label: "Allow multiple workflows", type: "switch" },
      { key: "allowEntityWiseWorkflow", label: "Entity-wise workflows", type: "switch" },
      { key: "allowDepartmentWiseWorkflow", label: "Department-wise workflows", type: "switch" },
      { key: "allowEmployeeTypeWiseWorkflow", label: "Employee-type-wise workflows", type: "switch" },
      { key: "allowWorkModeWiseWorkflow", label: "Work-mode-wise workflows", type: "switch" },
      { key: "allowWorkflowPriority", label: "Allow workflow priority", type: "switch" },
      { key: "allowWorkflowVersioning", label: "Allow workflow versioning", type: "switch" },
      { key: "allowCloneWorkflow", label: "Allow cloning workflows", type: "switch" },
      { key: "allowArchiveWorkflow", label: "Allow archiving workflows", type: "switch" },
      { key: "allowWorkflowPublishApproval", label: "Publish approval required", type: "switch" },
      {
        key: "conflictHandling", label: "Conflict handling", type: "select",
        description: "Behaviour when a candidate matches more than one workflow.",
        options: CONFLICT_OPTIONS,
      },
    ],
  },
  {
    category: "document",
    label: "Document",
    icon: FileText,
    description: "Document templates, e-sign, file types and verification rules.",
    fields: [
      { key: "allowDocumentLibrary", label: "Document library", type: "switch" },
      { key: "allowEntityWiseDocumentTemplate", label: "Entity-wise templates", type: "switch" },
      { key: "allowWorkflowWiseDocumentTemplate", label: "Workflow-wise templates", type: "switch" },
      { key: "allowCustomDocumentType", label: "Allow custom document types", type: "switch" },
      { key: "allowESign", label: "Allow e-sign", type: "switch" },
      { key: "allowTemplateVersioning", label: "Template versioning", type: "switch" },
      { key: "allowedFileTypes", label: "Allowed file types", description: "Comma-separated list of extensions.", type: "text", placeholder: "pdf,docx,jpg,png" },
      { key: "maximumFileSize", label: "Max file size (MB)", type: "number", placeholder: "10" },
      { key: "documentVerificationRequired", label: "Verification required", type: "switch" },
      { key: "documentExpiryTracking", label: "Expiry tracking", type: "switch" },
      { key: "blockOnboardingIfMandatoryDocumentMissing", label: "Block if mandatory missing", type: "switch" },
    ],
  },
  {
    category: "template",
    label: "Template",
    icon: LayoutTemplate,
    description: "Document/email template versioning and language defaults.",
    fields: [
      { key: "allowTemplateVersioning", label: "Template versioning", type: "switch" },
      { key: "allowTemplateSharing", label: "Allow template sharing", type: "switch" },
      { key: "defaultLanguage", label: "Default language", description: "ISO language code (e.g. en, hi, ta).", type: "text", placeholder: "en" },
    ],
  },
  {
    category: "checklist",
    label: "Checklist",
    icon: ListChecks,
    description: "Checklist authoring rules and scoping.",
    fields: [
      { key: "allowCustomChecklist", label: "Allow custom checklists", type: "switch" },
      { key: "allowEntityWiseChecklist", label: "Entity-wise checklists", type: "switch" },
      { key: "allowDepartmentWiseChecklist", label: "Department-wise checklists", type: "switch" },
      { key: "allowChecklistVersioning", label: "Checklist versioning", type: "switch" },
    ],
  },
  {
    category: "email",
    label: "Email",
    icon: Mail,
    description: "Email notifications, retry behaviour and default sender.",
    fields: [
      { key: "enableEmailNotifications", label: "Enable notifications", type: "switch" },
      { key: "enableEntityWiseEmailTemplates", label: "Entity-wise templates", type: "switch" },
      { key: "enableWorkflowWiseEmailTemplates", label: "Workflow-wise templates", type: "switch" },
      { key: "enableStageWiseEmailRules", label: "Stage-wise rules", type: "switch" },
      { key: "enableReminderEmails", label: "Reminder emails", type: "switch" },
      { key: "enableEscalationEmails", label: "Escalation emails", type: "switch" },
      { key: "enableEmailLogs", label: "Email logs", type: "switch" },
      { key: "enableRetryFailedEmails", label: "Retry failed emails", type: "switch" },
      { key: "defaultFromEmail", label: "Default from email", type: "text", placeholder: "onboarding@acme.com" },
      { key: "defaultReplyToEmail", label: "Default reply-to email", type: "text", placeholder: "hr@acme.com" },
      {
        key: "sendMode", label: "Send mode", type: "select",
        description: "Immediately sends on event; Queue batches for delivery.",
        options: SEND_MODE_OPTIONS,
      },
      { key: "retryCount", label: "Retry count", type: "number", placeholder: "3" },
      { key: "retryInterval", label: "Retry interval (seconds)", type: "number", placeholder: "60" },
    ],
  },
  {
    category: "verification",
    label: "Verification",
    icon: ShieldCheck,
    description: "Background, identity, education and bank verification rules.",
    fields: [
      { key: "enableDocumentVerification", label: "Document verification", type: "switch" },
      { key: "enableFormVerification", label: "Form verification", type: "switch" },
      { key: "enableBankVerification", label: "Bank verification", type: "switch" },
      { key: "enableIdentityVerification", label: "Identity verification", type: "switch" },
      { key: "enableBackgroundVerification", label: "Background verification", type: "switch" },
      { key: "enableEducationVerification", label: "Education verification", type: "switch" },
      { key: "enableExperienceVerification", label: "Experience verification", type: "switch" },
      { key: "allowSendBackForCorrection", label: "Allow send-back for correction", type: "switch" },
      { key: "requireVerificationRemarks", label: "Require verification remarks", type: "switch" },
      { key: "correctionAttemptLimit", label: "Correction attempt limit", type: "number", placeholder: "2" },
    ],
  },
  {
    category: "approval",
    label: "Approval",
    icon: BadgeCheck,
    description: "Approval workflows for offers, documents, salary and conversion.",
    fields: [
      { key: "enableApprovalWorkflow", label: "Enable approval workflow", type: "switch" },
      { key: "offerApprovalRequired", label: "Offer approval required", type: "switch" },
      { key: "documentApprovalRequired", label: "Document approval required", type: "switch" },
      { key: "formApprovalRequired", label: "Form approval required", type: "switch" },
      { key: "salaryApprovalRequired", label: "Salary approval required", type: "switch" },
      { key: "employeeConversionApprovalRequired", label: "Employee conversion approval", type: "switch" },
      { key: "allowRoleBasedApprover", label: "Role-based approver", type: "switch" },
      { key: "allowMultiLevelApproval", label: "Multi-level approval", type: "switch" },
      { key: "allowParallelApproval", label: "Parallel approval", type: "switch" },
      { key: "allowDelegation", label: "Allow delegation", type: "switch" },
      { key: "allowEscalation", label: "Allow escalation", type: "switch" },
    ],
  },
  {
    category: "candidate_portal",
    label: "Candidate Portal",
    icon: Globe,
    description: "What candidates see and can do in their self-service portal.",
    fields: [
      { key: "enableCandidatePortal", label: "Enable candidate portal", type: "switch" },
      { key: "requireOtpLogin", label: "Require OTP login", type: "switch" },
      { key: "requireEmailVerification", label: "Require email verification", type: "switch" },
      { key: "requireMobileVerification", label: "Require mobile verification", type: "switch" },
      { key: "showProgressTracker", label: "Show progress tracker", type: "switch" },
      { key: "showDocuments", label: "Show documents", type: "switch" },
      { key: "showForms", label: "Show forms", type: "switch" },
      { key: "showOfferLetter", label: "Show offer letter", type: "switch" },
      { key: "showChecklist", label: "Show checklist", type: "switch" },
      { key: "showHrContact", label: "Show HR contact", type: "switch" },
      { key: "showFaq", label: "Show FAQ", type: "switch" },
      { key: "allowCandidateDownloadDocuments", label: "Allow document download", type: "switch" },
      { key: "allowCandidateSaveAsDraft", label: "Allow save as draft", type: "switch" },
      { key: "allowCandidateCorrectionAfterRejection", label: "Allow correction after rejection", type: "switch" },
    ],
  },
  {
    category: "employee_conversion",
    label: "Employee Conversion",
    icon: UserCog,
    description: "What happens when a candidate is converted to an employee.",
    fields: [
      { key: "generateEmployeeCode", label: "Generate employee code", type: "switch" },
      { key: "createEmployeeProfile", label: "Create employee profile", type: "switch" },
      { key: "createEmployeeDraftFirst", label: "Create draft first", type: "switch" },
      { key: "createLogin", label: "Create login", type: "switch" },
      { key: "activateLoginOnJoiningDate", label: "Activate login on joining date", type: "switch" },
      { key: "assignRole", label: "Assign role", type: "switch" },
      { key: "assignReportingManager", label: "Assign reporting manager", type: "switch" },
      { key: "assignLeaveRule", label: "Assign leave rule", type: "switch" },
      { key: "assignAttendancePolicy", label: "Assign attendance policy", type: "switch" },
      { key: "assignShift", label: "Assign shift", type: "switch" },
      { key: "assignWeeklyOff", label: "Assign weekly off", type: "switch" },
      { key: "assignHolidayCalendar", label: "Assign holiday calendar", type: "switch" },
      { key: "assignPayrollGroup", label: "Assign payroll group", type: "switch" },
      { key: "assignSalaryStructure", label: "Assign salary structure", type: "switch" },
      { key: "assignAssets", label: "Assign assets", type: "switch" },
      { key: "blockConversionIfMandatoryDataMissing", label: "Block if mandatory data missing", type: "switch" },
      { key: "blockConversionIfVerificationPending", label: "Block if verification pending", type: "switch" },
      { key: "blockConversionIfApprovalPending", label: "Block if approval pending", type: "switch" },
    ],
  },
  {
    category: "import_export",
    label: "Import / Export",
    icon: ArrowUpDown,
    description: "Bulk data movement and template defaults.",
    fields: [
      { key: "allowBulkImport", label: "Allow bulk import", type: "switch" },
      { key: "allowBulkExport", label: "Allow bulk export", type: "switch" },
      { key: "importTemplate", label: "Import template", description: "Name of the default import template.", type: "text", placeholder: "Standard" },
    ],
  },
  {
    category: "audit",
    label: "Audit & Security",
    icon: Lock,
    description: "Audit trail, IP/device logging and retention rules.",
    fields: [
      { key: "logAllActions", label: "Log all actions", type: "switch" },
      { key: "logIpAndDevice", label: "Log IP and device", type: "switch" },
      { key: "enableAuditTrailExport", label: "Allow audit trail export", type: "switch" },
      { key: "retainLogsForDays", label: "Retain logs (days)", type: "number", placeholder: "365" },
    ],
  },
]

// Special "Entity Configuration" pseudo-category. Sits at index 2 (3rd tab) per spec.
const ENTITY_TAB_ID = "__entity__"

interface TabDef {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

function buildTabs(): TabDef[] {
  const tabs: TabDef[] = []
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i]
    tabs.push({ id: c.category, label: c.label, icon: c.icon, description: c.description })
    // Insert the special "Entity Configuration" tab between Candidate (index 1) and Kanban (index 2).
    if (i === 1) {
      tabs.push({ id: ENTITY_TAB_ID, label: "Entity Configuration", icon: Building2, description: "Per-entity onboarding defaults." })
    }
  }
  return tabs
}

const TABS: TabDef[] = buildTabs()

// ============================================================================
//  Main section
// ============================================================================

export function SettingsSection() {
  const [activeTab, setActiveTab] = React.useState<string>(CATEGORIES[0].category)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Settings"
        description="Module-level controls and per-entity default configuration for the entire onboarding pipeline."
        icon={SettingsIcon}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
        {/* ---------- LEFT: vertical tab bar ---------- */}
        <nav
          aria-label="Settings sections"
          className="lg:sticky lg:top-4 lg:self-start"
        >
          <div className="bg-muted/30 rounded-xl p-1.5 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible max-h-none lg:max-h-[calc(100vh-2rem)]">
            {TABS.map((t) => {
              const Icon = t.icon
              const active = activeTab === t.id
              const isEntity = t.id === ENTITY_TAB_ID
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap lg:w-full lg:justify-between",
                    active
                      ? "bg-card shadow-soft text-emerald-700 dark:text-emerald-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/60",
                  )}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground group-hover:text-foreground",
                    )} />
                    <span className="truncate">{t.label}</span>
                  </span>
                  {isEntity && (
                    <Badge variant="outline" className="hidden lg:inline-flex text-[10px] px-1.5 py-0 h-4 border-emerald-300/60 text-emerald-700 dark:text-emerald-300 dark:border-emerald-500/40">
                      Spec #14
                    </Badge>
                  )}
                  {active && (
                    <ChevronRight className="hidden lg:block h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* ---------- RIGHT: tab content ---------- */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {activeTab === ENTITY_TAB_ID ? (
                <EntityConfigurationPanel />
              ) : (
                <SettingsFormPanel category={activeTab} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
//  Settings form panel — for the 14 normal categories
// ============================================================================

function SettingsFormPanel({ category }: { category: string }) {
  const cat = CATEGORIES.find((c) => c.category === category)!
  const { data, loading, error, reload } = useFetch<{ settings: SettingValue }>("/api/onboarding-settings", [])

  // Original loaded values (for dirty detection) and local working copy.
  const [original, setOriginal] = React.useState<Record<string, any>>({})
  const [values, setValues] = React.useState<Record<string, any>>({})
  const [saving, setSaving] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    if (!data) return
    const catValues = data.settings?.[category] || {}
    const normalized: Record<string, any> = {}
    for (const f of cat.fields) {
      normalized[f.key] = catValues[f.key] ?? defaultValueFor(f)
    }
    setOriginal(normalized)
    setValues(normalized)
    setLoaded(true)
  }, [data, category])

  const dirty = React.useMemo(() => {
    for (const f of cat.fields) {
      const o = original[f.key]
      const v = values[f.key]
      if (String(o ?? "") !== String(v ?? "")) return true
    }
    return false
  }, [original, values, cat.fields])

  function setValue(key: string, value: any) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function reset() {
    setValues(original)
  }

  async function handleSave() {
    setSaving(true)
    // Build a minimal patch payload of only changed keys.
    const changed: Record<string, any> = {}
    for (const f of cat.fields) {
      const o = original[f.key]
      const v = values[f.key]
      if (String(o ?? "") !== String(v ?? "")) changed[f.key] = v
    }
    if (Object.keys(changed).length === 0) {
      toast.info("No changes to save.")
      setSaving(false)
      return
    }
    try {
      await apiPatch("/api/onboarding-settings", { settings: { [category]: changed } })
      toast.success("Settings saved")
      setOriginal({ ...values })
    } catch (e: any) {
      toast.error(e.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading && !loaded) {
    return <SettingsFormSkeleton />
  }
  if (error) {
    return (
      <SectionCard title={cat.label} description={cat.description}>
        <EmptyState
          icon={AlertTriangle}
          title="Could not load settings"
          description={error}
          action={<Button size="sm" variant="outline" onClick={reload}>Retry</Button>}
        />
      </SectionCard>
    )
  }

  // Group fields visually: switches get a 2-col grid; text/number/select go full-width below.
  const switches = cat.fields.filter((f) => f.type === "switch")
  const others = cat.fields.filter((f) => f.type !== "switch")

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title={cat.label + " Settings"}
        description={cat.description}
        action={
          dirty ? (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-0">
              Unsaved changes
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-300/60 text-emerald-700 dark:text-emerald-300 dark:border-emerald-500/40">
              <Check className="h-3 w-3 mr-1" /> Saved
            </Badge>
          )
        }
      >
        <div className="flex flex-col gap-6">
          {switches.length > 0 && (
            <div className={cn("grid gap-3", switches.length >= 4 ? "sm:grid-cols-2" : "grid-cols-1")}>
              {switches.map((f) => (
                <SwitchRow
                  key={f.key}
                  field={f}
                  checked={!!values[f.key]}
                  onChange={(v) => setValue(f.key, v)}
                />
              ))}
            </div>
          )}

          {switches.length > 0 && others.length > 0 && <Separator />}

          {others.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {others.map((f) => (
                <FieldRow
                  key={f.key}
                  field={f}
                  value={values[f.key]}
                  onChange={(v) => setValue(f.key, v)}
                />
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Sticky save bar */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className="sticky bottom-4 z-30"
          >
            <div className="rounded-xl border border-emerald-300/60 dark:border-emerald-500/40 bg-card/95 backdrop-blur shadow-card p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-foreground">You have unsaved changes in <span className="font-medium text-emerald-700 dark:text-emerald-300">{cat.label}</span>.</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={reset} disabled={saving}>
                  <X className="h-4 w-4" /> Discard
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function defaultValueFor(f: FieldDef): any {
  switch (f.type) {
    case "switch": return false
    case "number": return 0
    case "select": return f.options?.[0]?.value ?? ""
    default: return ""
  }
}

// ---------- Field row primitives ----------

function SwitchRow({
  field, checked, onChange,
}: {
  field: FieldDef
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      htmlFor={`sw-${field.key}`}
      className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 hover:bg-background p-3 transition-colors cursor-pointer"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{field.label}</div>
        {field.description && (
          <div className="text-xs text-muted-foreground mt-0.5">{field.description}</div>
        )}
      </div>
      <Switch
        id={`sw-${field.key}`}
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:bg-emerald-500 mt-0.5"
      />
    </label>
  )
}

function FieldRow({
  field, value, onChange,
}: {
  field: FieldDef
  value: any
  onChange: (v: any) => void
}) {
  const isFullWidth = field.type === "text" && (field.key === "candidateIdFormat" || field.key === "allowedFileTypes")
  return (
    <div className={cn("flex flex-col gap-1.5", isFullWidth && "sm:col-span-2")}>
      <Label htmlFor={`f-${field.key}`} className="text-xs font-medium text-foreground">
        {field.label}
      </Label>
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
      {field.type === "select" ? (
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger id={`f-${field.key}`} className="w-full">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={`f-${field.key}`}
          type={field.type === "number" ? "number" : "text"}
          value={value ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
          className="h-9"
        />
      )}
    </div>
  )
}

// ---------- Skeleton ----------

function SettingsFormSkeleton() {
  return (
    <SectionCard title="Loading settings" description="Fetching the current configuration...">
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ============================================================================
//  Entity Configuration panel — special tab per spec #14
// ============================================================================

const ENTITY_CONFIG_STATUSES = ["Active", "Inactive", "Draft"]

interface EntityConfigFormState {
  id?: string
  entityId: string
  useTenantDefault: boolean
  defaultWorkflowId: string
  defaultKanbanBoardId: string
  defaultCandidateFormId: string
  defaultDocumentSet: string
  defaultChecklistSet: string
  defaultEmailGroup: string
  defaultVerificationRule: string
  defaultApprovalWorkflow: string
  defaultCandidatePortalSetting: string
  defaultEmployeeConversionRule: string
  defaultHrOwner: string
  defaultRecruiter: string
  defaultReportingManagerRule: string
  defaultSetupRule: string
  effectiveFrom: string
  effectiveTo: string
  status: string
}

const EMPTY_ENTITY_FORM: EntityConfigFormState = {
  entityId: "",
  useTenantDefault: true,
  defaultWorkflowId: "",
  defaultKanbanBoardId: "",
  defaultCandidateFormId: "",
  defaultDocumentSet: "",
  defaultChecklistSet: "",
  defaultEmailGroup: "",
  defaultVerificationRule: "",
  defaultApprovalWorkflow: "",
  defaultCandidatePortalSetting: "",
  defaultEmployeeConversionRule: "",
  defaultHrOwner: "",
  defaultRecruiter: "",
  defaultReportingManagerRule: "",
  defaultSetupRule: "",
  effectiveFrom: "",
  effectiveTo: "",
  status: "Active",
}

function EntityConfigurationPanel() {
  const { data, loading, error, reload } = useFetch<{ items: EntityConfig[] }>("/api/onboarding-entity-config", [])
  const { data: entityData } = useFetch<{ items: EntityOption[] } | { items: any[] }>("/api/entities", [])
  const entities: EntityOption[] = (entityData as any)?.items || []

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<EntityConfig | null>(null)
  const [form, setForm] = React.useState<EntityConfigFormState>(EMPTY_ENTITY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<EntityConfig | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  function openAdd() {
    setEditing(null)
    setForm({ ...EMPTY_ENTITY_FORM })
    setDialogOpen(true)
  }
  function openEdit(item: EntityConfig) {
    setEditing(item)
    setForm({
      id: item.id,
      entityId: item.entityId,
      useTenantDefault: item.useTenantDefault,
      defaultWorkflowId: item.defaultWorkflowId || "",
      defaultKanbanBoardId: item.defaultKanbanBoardId || "",
      defaultCandidateFormId: item.defaultCandidateFormId || "",
      defaultDocumentSet: safeParseJson<string[]>(item.defaultDocumentSet, []).join(", "),
      defaultChecklistSet: safeParseJson<string[]>(item.defaultChecklistSet, []).join(", "),
      defaultEmailGroup: safeParseJson<string[]>(item.defaultEmailGroup, []).join(", "),
      defaultVerificationRule: item.defaultVerificationRule || "",
      defaultApprovalWorkflow: item.defaultApprovalWorkflow || "",
      defaultCandidatePortalSetting: item.defaultCandidatePortalSetting || "",
      defaultEmployeeConversionRule: item.defaultEmployeeConversionRule || "",
      defaultHrOwner: item.defaultHrOwner || "",
      defaultRecruiter: item.defaultRecruiter || "",
      defaultReportingManagerRule: item.defaultReportingManagerRule || "",
      defaultSetupRule: item.defaultSetupRule || "",
      effectiveFrom: item.effectiveFrom ? item.effectiveFrom.slice(0, 10) : "",
      effectiveTo: item.effectiveTo ? item.effectiveTo.slice(0, 10) : "",
      status: item.status || "Active",
    })
    setDialogOpen(true)
  }

  function setField<K extends keyof EntityConfigFormState>(k: K, v: EntityConfigFormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function csvToArray(s: string): string[] {
    return s.split(",").map((x) => x.trim()).filter(Boolean)
  }

  async function handleSubmit() {
    if (!form.entityId) {
      toast.error("Please select an entity.")
      return
    }
    setSaving(true)
    const payload = {
      entityId: form.entityId,
      useTenantDefault: form.useTenantDefault,
      defaultWorkflowId: form.defaultWorkflowId || null,
      defaultKanbanBoardId: form.defaultKanbanBoardId || null,
      defaultCandidateFormId: form.defaultCandidateFormId || null,
      defaultDocumentSet: csvToArray(form.defaultDocumentSet),
      defaultChecklistSet: csvToArray(form.defaultChecklistSet),
      defaultEmailGroup: csvToArray(form.defaultEmailGroup),
      defaultVerificationRule: form.defaultVerificationRule || null,
      defaultApprovalWorkflow: form.defaultApprovalWorkflow || null,
      defaultCandidatePortalSetting: form.defaultCandidatePortalSetting || null,
      defaultEmployeeConversionRule: form.defaultEmployeeConversionRule || null,
      defaultHrOwner: form.defaultHrOwner || null,
      defaultRecruiter: form.defaultRecruiter || null,
      defaultReportingManagerRule: form.defaultReportingManagerRule || null,
      defaultSetupRule: form.defaultSetupRule || null,
      effectiveFrom: form.effectiveFrom || null,
      effectiveTo: form.effectiveTo || null,
      status: form.status,
    }
    try {
      if (editing) {
        await safeToast(
          apiPatch(`/api/onboarding-entity-config/${editing.id}`, payload),
          "Entity config updated",
          "Could not update entity config",
        )
      } else {
        await safeToast(
          apiPost("/api/onboarding-entity-config", payload),
          "Entity config created",
          "Could not create entity config",
        )
      }
      setDialogOpen(false)
      reload()
    } catch {
      // toast already shown
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await safeToast(
        apiDelete(`/api/onboarding-entity-config/${deleteTarget.id}`),
        "Entity config deleted",
        "Could not delete entity config",
      )
      setDeleteTarget(null)
      reload()
    } catch {
      // toast already shown
    } finally {
      setDeleting(false)
    }
  }

  const items = data?.items || []

  return (
    <SectionCard
      title="Entity Configuration"
      description="Override tenant-level onboarding defaults per entity. When 'Use tenant default' is on, the entity inherits all tenant settings."
      action={
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Entity Config
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={AlertTriangle}
          title="Could not load entity configs"
          description={error}
          action={<Button size="sm" variant="outline" onClick={reload}>Retry</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No entity configurations yet"
          description="Add per-entity overrides for workflows, owners, document sets and more."
          action={<Button size="sm" onClick={openAdd} className="gap-1.5"><Plus className="h-4 w-4" /> Add Entity Config</Button>}
        />
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[180px]">Entity</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Use Tenant Default</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Default Workflow</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">HR Owner</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Effective From</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Effective To</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{item.entity?.name || "—"}</span>
                        {item.entity?.code && (
                          <span className="text-xs text-muted-foreground">{item.entity.code}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.useTenantDefault ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-0">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.defaultWorkflowId ? truncate(item.defaultWorkflowId) : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.defaultHrOwner ? truncate(item.defaultHrOwner) : "—"}</TableCell>
                    <TableCell><StatusBadge status={item.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(item.effectiveFrom)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(item.effectiveTo)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => openEdit(item)}
                                aria-label={`Edit ${item.entity?.name || "config"}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
                                onClick={() => setDeleteTarget(item)}
                                aria-label={`Delete ${item.entity?.name || "config"}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ---------- Add / Edit dialog ---------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Entity Configuration" : "Add Entity Configuration"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the default onboarding configuration for this entity."
                : "Configure per-entity onboarding defaults. Toggle 'Use tenant default' to inherit tenant-level settings."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            {/* Entity + use-tenant-default + status row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Entity</Label>
                <Select value={form.entityId} onValueChange={(v) => setField("entityId", v)} disabled={!!editing}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.tradeName || e.legalName} ({e.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Status</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_CONFIG_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Use tenant default — special */}
            <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Use tenant default</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When enabled, this entity inherits all tenant-level onboarding settings and the fields below are ignored.
                </p>
              </div>
              <Switch
                checked={form.useTenantDefault}
                onCheckedChange={(v) => setField("useTenantDefault", v)}
                className="data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:bg-emerald-500 mt-0.5"
              />
            </div>

            {form.useTenantDefault && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                <Check className="h-3.5 w-3.5" />
                Using tenant defaults — fields below are disabled.
              </div>
            )}

            {/* Default fields — disabled when useTenantDefault */}
            <fieldset
              disabled={form.useTenantDefault}
              className={cn(
                "grid gap-4 sm:grid-cols-2 transition-opacity",
                form.useTenantDefault && "opacity-50",
              )}
            >
              <EntityFormField label="Default Workflow ID" description="ID of the default workflow for this entity.">
                <Input value={form.defaultWorkflowId} onChange={(e) => setField("defaultWorkflowId", e.target.value)} placeholder="wf_..." />
              </EntityFormField>
              <EntityFormField label="Default Kanban Board ID" description="Board to show for candidates of this entity.">
                <Input value={form.defaultKanbanBoardId} onChange={(e) => setField("defaultKanbanBoardId", e.target.value)} placeholder="kb_..." />
              </EntityFormField>
              <EntityFormField label="Default Candidate Form ID" description="Form schema used for candidate intake.">
                <Input value={form.defaultCandidateFormId} onChange={(e) => setField("defaultCandidateFormId", e.target.value)} placeholder="form_..." />
              </EntityFormField>
              <EntityFormField label="Default HR Owner" description="Employee ID or name of the default HR owner.">
                <Input value={form.defaultHrOwner} onChange={(e) => setField("defaultHrOwner", e.target.value)} placeholder="emp_..." />
              </EntityFormField>
              <EntityFormField label="Default Recruiter" description="Employee ID or name of the default recruiter.">
                <Input value={form.defaultRecruiter} onChange={(e) => setField("defaultRecruiter", e.target.value)} placeholder="emp_..." />
              </EntityFormField>
              <EntityFormField label="Default Reporting Manager Rule" description="Rule for picking the reporting manager.">
                <Input value={form.defaultReportingManagerRule} onChange={(e) => setField("defaultReportingManagerRule", e.target.value)} placeholder="department_head" />
              </EntityFormField>
              <EntityFormField label="Default Verification Rule" description="Verification rule identifier.">
                <Input value={form.defaultVerificationRule} onChange={(e) => setField("defaultVerificationRule", e.target.value)} placeholder="strict_v1" />
              </EntityFormField>
              <EntityFormField label="Default Approval Workflow" description="Approval workflow identifier.">
                <Input value={form.defaultApprovalWorkflow} onChange={(e) => setField("defaultApprovalWorkflow", e.target.value)} placeholder="appr_std" />
              </EntityFormField>
              <EntityFormField label="Default Candidate Portal Setting" description="Portal setting identifier.">
                <Input value={form.defaultCandidatePortalSetting} onChange={(e) => setField("defaultCandidatePortalSetting", e.target.value)} placeholder="portal_std" />
              </EntityFormField>
              <EntityFormField label="Default Employee Conversion Rule" description="Conversion rule identifier.">
                <Input value={form.defaultEmployeeConversionRule} onChange={(e) => setField("defaultEmployeeConversionRule", e.target.value)} placeholder="conv_std" />
              </EntityFormField>
              <EntityFormField label="Default Setup Rule" description="Setup rule identifier (IT/HR provisioning).">
                <Input value={form.defaultSetupRule} onChange={(e) => setField("defaultSetupRule", e.target.value)} placeholder="setup_std" />
              </EntityFormField>
              <EntityFormField label="Default Document Set" description="Comma-separated document template IDs.">
                <Input value={form.defaultDocumentSet} onChange={(e) => setField("defaultDocumentSet", e.target.value)} placeholder="doc_1, doc_2" />
              </EntityFormField>
              <EntityFormField label="Default Checklist Set" description="Comma-separated checklist IDs.">
                <Input value={form.defaultChecklistSet} onChange={(e) => setField("defaultChecklistSet", e.target.value)} placeholder="chk_1, chk_2" />
              </EntityFormField>
              <EntityFormField label="Default Email Group" description="Comma-separated email template IDs.">
                <Input value={form.defaultEmailGroup} onChange={(e) => setField("defaultEmailGroup", e.target.value)} placeholder="eml_1, eml_2" />
              </EntityFormField>
              <EntityFormField label="Effective From" description="When this config becomes effective.">
                <Input type="date" value={form.effectiveFrom} onChange={(e) => setField("effectiveFrom", e.target.value)} />
              </EntityFormField>
              <EntityFormField label="Effective To" description="When this config stops being effective.">
                <Input type="date" value={form.effectiveTo} onChange={(e) => setField("effectiveTo", e.target.value)} />
              </EntityFormField>
            </fieldset>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
              {saving ? "Saving..." : editing ? "Update Config" : "Create Config"}
              {!saving && <Save className="h-4 w-4" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Delete confirm ---------- */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entity configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the configuration for <span className="font-medium text-foreground">{deleteTarget?.entity?.name || "this entity"}</span>. The entity will fall back to tenant defaults.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  )
}

function EntityFormField({
  label, description, children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {children}
    </div>
  )
}

function truncate(s: string, n = 24): string {
  if (s.length <= n) return s
  return s.slice(0, n) + "…"
}

export default SettingsSection
