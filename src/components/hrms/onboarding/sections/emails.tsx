"use client"

// ============================================================================
//  EmailsSection — Onboarding Email Templates (spec #9)
//  Admins create reusable email content for every onboarding event.
//  The workflow engine decides *when* each template fires.
//
//  Layout:
//   • PageHeader with Mail icon
//   • 4 mini stat cards (Total / Active / Default / Drafts)
//   • Two-column layout: event-type sidebar (21 categories) + templates table
//   • Editor dialog (max-w-6xl) — form fields, recipient builder, HTML editor
//     with variable picker + live preview
//   • Preview dialog — full email preview with sample data
//
//  Palette: emerald / teal / cyan / amber / violet / rose / lime / orange /
//  slate / fuchsia / pink only. NO indigo, NO blue.
// ============================================================================

import * as React from "react"
import { useMemo, useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Mail, Bell, FileText, FileCheck, FileQuestion, Upload,
  FileCheck2, FileX, Send, CheckCircle2, XCircle, ListTodo, AlertTriangle,
  ShieldCheck, CalendarClock, PartyPopper, PlayCircle, Award, UserMinus,
  Plus, Search, Pencil, Copy, Star, Eye, Trash2, MoreHorizontal,
  Loader2, Inbox, Code2, Sparkles, ChevronDown, X, AtSign, Users,
  Type, Languages, Hash,
  Clock, Layers, Tag,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip"

import {
  PageHeader, StatCard, EmptyState,
} from "@/components/hrms/ui"

import {
  useFetch, apiPost, apiPatch, apiDelete, safeToast, safeParseJson, timeAgo,
} from "@/components/hrms/onboarding/shared"
import {
  SectionedRichEditor,
  type RichEditorHandle,
  type EditorSection,
} from "@/components/hrms/onboarding/rich-editor"
import {
  SlugPalette, SlugUsageSummary,
  extractVariables, substituteVariables,
} from "@/components/hrms/onboarding/slug-catalog"

// ============================================================================
//  Types
// ============================================================================

export interface EmailTemplate {
  id: string
  name: string
  code: string
  eventType: string
  scopeType: string
  entityId?: string | null
  workflowId?: string | null
  language: string
  subject: string
  headerHtml?: string | null
  bodyHtml: string
  footerHtml?: string | null
  isDefault: boolean
  status: string
  version: number
  createdBy?: string | null
  recipients?: string | null // JSON: { to: Recipient[], cc: Recipient[], bcc: Recipient[] }
  fromEmail?: string | null
  replyToEmail?: string | null
  variablesUsed?: string | null
  effectiveFrom?: string | null
  effectiveTo?: string | null
  createdAt: string
  updatedAt: string
}

interface Recipient {
  type: string
  value?: string
}

interface RecipientGroup {
  to: Recipient[]
  cc: Recipient[]
  bcc: Recipient[]
}

// ============================================================================
//  Constants — 21 event categories (20 from spec + "Onboarding Started")
// ============================================================================

interface EventMeta {
  value: string
  icon: React.ComponentType<{ className?: string }>
  hint: string
}

const EVENT_CATEGORIES: EventMeta[] = [
  { value: "Candidate Invite", icon: Mail, hint: "Sent when a candidate is added to the portal" },
  { value: "Invite Reminder", icon: Bell, hint: "Follow-up if the invite goes unanswered" },
  { value: "Candidate Form Pending", icon: FileText, hint: "Reminder to complete the onboarding form" },
  { value: "Candidate Form Submitted", icon: FileCheck, hint: "Acknowledgement after form submission" },
  { value: "Document Pending", icon: FileQuestion, hint: "Request to upload a pending document" },
  { value: "Document Uploaded", icon: Upload, hint: "Acknowledgement after a document is uploaded" },
  { value: "Document Approved", icon: FileCheck2, hint: "Notification that a document was approved" },
  { value: "Document Rejected", icon: FileX, hint: "Notification that a document was rejected" },
  { value: "Offer Letter Sent", icon: Send, hint: "Confirmation that the offer letter was sent" },
  { value: "Offer Accepted", icon: CheckCircle2, hint: "Candidate accepted the offer" },
  { value: "Offer Declined", icon: XCircle, hint: "Candidate declined the offer" },
  { value: "Task Assigned", icon: ListTodo, hint: "A new task was assigned to the owner" },
  { value: "Task Reminder", icon: Bell, hint: "Reminder for an upcoming task due date" },
  { value: "Task Overdue", icon: AlertTriangle, hint: "A task is past its due date" },
  { value: "Approval Required", icon: ShieldCheck, hint: "An approval step is awaiting action" },
  { value: "Approval Completed", icon: CheckCircle2, hint: "An approval was completed" },
  { value: "Joining Reminder", icon: CalendarClock, hint: "Reminder before the joining date" },
  { value: "Welcome Email", icon: PartyPopper, hint: "Welcome message on day 1" },
  { value: "Onboarding Started", icon: PlayCircle, hint: "Candidate has entered the onboarding pipeline" },
  { value: "Onboarding Completed", icon: Award, hint: "Onboarding pipeline is complete" },
  { value: "Candidate Dropped", icon: UserMinus, hint: "Candidate withdrew or was dropped" },
]

// ============================================================================
//  Constants — 12 recipient types with assigned colors (NO indigo / blue)
// ============================================================================

interface RecipientMeta {
  type: string
  label: string
  // tailwind chip classes
  chip: string
  dot: string
  needsValue: boolean
  valueLabel?: string
  valuePlaceholder?: string
  valueType?: "email" | "text"
}

const RECIPIENT_TYPES: RecipientMeta[] = [
  { type: "candidate", label: "Candidate", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", dot: "bg-emerald-500", needsValue: false },
  { type: "hr_owner", label: "HR Owner", chip: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300", dot: "bg-teal-500", needsValue: false },
  { type: "recruiter", label: "Recruiter", chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300", dot: "bg-cyan-500", needsValue: false },
  { type: "reporting_manager", label: "Reporting Manager", chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", dot: "bg-amber-500", needsValue: false },
  { type: "department_head", label: "Department Head", chip: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300", dot: "bg-violet-500", needsValue: false },
  { type: "it_admin", label: "IT Admin", chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300", dot: "bg-rose-500", needsValue: false },
  { type: "admin_team", label: "Admin Team", chip: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300", dot: "bg-slate-500", needsValue: false },
  { type: "payroll_admin", label: "Payroll Admin", chip: "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300", dot: "bg-lime-500", needsValue: false },
  { type: "finance_admin", label: "Finance Admin", chip: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300", dot: "bg-orange-500", needsValue: false },
  { type: "specific_role", label: "Specific Role", chip: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300", dot: "bg-fuchsia-500", needsValue: true, valueLabel: "Role name", valuePlaceholder: "e.g. IT Support Lead", valueType: "text" },
  { type: "specific_employee", label: "Specific Employee", chip: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300", dot: "bg-pink-500", needsValue: true, valueLabel: "Employee name / ID", valuePlaceholder: "e.g. Aarav Sharma (EMP-0001)", valueType: "text" },
  { type: "specific_email", label: "Specific Email", chip: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300", dot: "bg-slate-400", needsValue: true, valueLabel: "Email address", valuePlaceholder: "name@company.com", valueType: "email" },
]

const RECIPIENT_META: Record<string, RecipientMeta> = RECIPIENT_TYPES.reduce(
  (acc, r) => { acc[r.type] = r; return acc },
  {} as Record<string, RecipientMeta>,
)

// ============================================================================
//  Slugs / Variables — provided by the shared slug-catalog module
//  (single source of truth used by BOTH emails & documents). The
//  extractVariables() and substituteVariables() helpers are imported
//  above; the <SlugPalette> panel is rendered in the editor's right rail.
// ============================================================================

// ============================================================================
//  Constants — select options
// ============================================================================

const SCOPE_TYPES = [
  { value: "tenant", label: "Tenant (Global)" },
  { value: "entity", label: "Entity" },
  { value: "workflow", label: "Workflow" },
  { value: "department", label: "Department" },
]

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "kn", label: "Kannada" },
  { value: "mr", label: "Marathi" },
  { value: "bn", label: "Bengali" },
]

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Draft", label: "Draft" },
  { value: "Inactive", label: "Inactive" },
]

const STATUS_BADGE_CLASS: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  Inactive: "bg-muted text-muted-foreground",
}

const SCOPE_BADGE_CLASS: Record<string, string> = {
  tenant: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  entity: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  workflow: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  department: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
}

// ============================================================================
//  Helpers
// ============================================================================

/** Render the icon for an event type. Component, safe to use directly in JSX. */
function EventIconView({ eventType, className }: { eventType: string; className?: string }) {
  const Icon = EVENT_CATEGORIES.find((e) => e.value === eventType)?.icon || Mail
  return <Icon className={className} />
}

function emptyRecipients(): RecipientGroup {
  return { to: [], cc: [], bcc: [] }
}

function parseRecipients(raw?: string | null): RecipientGroup {
  if (!raw) return emptyRecipients()
  const parsed = safeParseJson<Partial<RecipientGroup>>(raw, {})
  return {
    to: Array.isArray(parsed.to) ? parsed.to : [],
    cc: Array.isArray(parsed.cc) ? parsed.cc : [],
    bcc: Array.isArray(parsed.bcc) ? parsed.bcc : [],
  }
}

// extractVariables() and substituteVariables() are imported from
// the shared slug-catalog module (single source of truth).

function emptyForm(): EmailFormState {
  return {
    id: null,
    name: "",
    code: "",
    eventType: "Candidate Invite",
    scopeType: "tenant",
    entityId: "",
    workflowId: "",
    language: "en",
    subject: "",
    headerHtml: "",
    bodyHtml: "",
    footerHtml: "",
    isDefault: false,
    status: "Active",
    version: 1,
    fromEmail: "",
    replyToEmail: "",
    recipients: emptyRecipients(),
  }
}

function templateToForm(t: EmailTemplate): EmailFormState {
  return {
    id: t.id,
    name: t.name,
    code: t.code,
    eventType: t.eventType,
    scopeType: t.scopeType || "tenant",
    entityId: t.entityId || "",
    workflowId: t.workflowId || "",
    language: t.language || "en",
    subject: t.subject || "",
    headerHtml: t.headerHtml || "",
    bodyHtml: t.bodyHtml || "",
    footerHtml: t.footerHtml || "",
    isDefault: !!t.isDefault,
    status: t.status || "Active",
    version: t.version || 1,
    fromEmail: t.fromEmail || "",
    replyToEmail: t.replyToEmail || "",
    recipients: parseRecipients(t.recipients),
  }
}

interface EmailFormState {
  id: string | null
  name: string
  code: string
  eventType: string
  scopeType: string
  entityId: string
  workflowId: string
  language: string
  subject: string
  headerHtml: string
  bodyHtml: string
  footerHtml: string
  isDefault: boolean
  status: string
  version: number
  fromEmail: string
  replyToEmail: string
  recipients: RecipientGroup
}

// ============================================================================
//  Main component
// ============================================================================

export function EmailsSection() {
  // ----- Data -----
  const listFetch = useFetch<{ items: EmailTemplate[] }>("/api/onboarding-emails")
  const items = listFetch.data?.items ?? []

  // ----- Filters -----
  const [activeEvent, setActiveEvent] = useState<string>("__all__")
  const [search, setSearch] = useState("")

  // ----- Dialogs -----
  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState<EmailFormState>(emptyForm())
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  // ----- Derived stats -----
  const stats = useMemo(() => {
    const total = items.length
    const active = items.filter((t) => t.status === "Active").length
    const defaults = items.filter((t) => t.isDefault).length
    const drafts = items.filter((t) => t.status === "Draft").length
    return { total, active, defaults, drafts }
  }, [items])

  // ----- Per-event counts -----
  const eventCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of items) {
      map[t.eventType] = (map[t.eventType] || 0) + 1
    }
    return map
  }, [items])

  // ----- Filtered list -----
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((t) => {
      if (activeEvent !== "__all__" && t.eventType !== activeEvent) return false
      if (!q) return true
      return (
        t.name?.toLowerCase().includes(q) ||
        t.code?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q) ||
        t.eventType?.toLowerCase().includes(q)
      )
    })
  }, [items, activeEvent, search])

  // ----- Handlers -----
  const openNew = useCallback(() => {
    setForm({
      ...emptyForm(),
      eventType: activeEvent !== "__all__" ? activeEvent : "Candidate Invite",
    })
    setEditorOpen(true)
  }, [activeEvent])

  const openEdit = useCallback((t: EmailTemplate) => {
    setForm(templateToForm(t))
    setEditorOpen(true)
  }, [])

  const openClone = useCallback((t: EmailTemplate) => {
    const f = templateToForm(t)
    setForm({
      ...f,
      id: null,
      name: `${t.name} (Copy)`,
      code: `${t.code}_COPY`,
      isDefault: false,
      version: 1,
    })
    setEditorOpen(true)
  }, [])

  const setDefault = useCallback(async (t: EmailTemplate) => {
    const p = apiPatch(`/api/onboarding-emails/${t.id}`, { isDefault: true })
    await safeToast(p, `“${t.name}” is now the default for ${t.eventType}`, "Failed to set default")
    listFetch.reload()
  }, [listFetch])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const p = apiDelete(`/api/onboarding-emails/${deleteTarget.id}`)
    await safeToast(p, `“${deleteTarget.name}” deleted`, "Failed to delete")
    setDeleteTarget(null)
    listFetch.reload()
  }, [deleteTarget, listFetch])

  const submitForm = useCallback(async () => {
    if (!form.name.trim()) { toast.error("Template name is required"); return }
    if (!form.code.trim()) { toast.error("Template code is required"); return }
    if (!form.subject.trim()) { toast.error("Subject is required"); return }
    if (!form.bodyHtml.trim()) { toast.error("Email body is required"); return }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      code: form.code.trim(),
      eventType: form.eventType,
      scopeType: form.scopeType,
      entityId: form.entityId || null,
      workflowId: form.workflowId || null,
      language: form.language,
      subject: form.subject,
      headerHtml: form.headerHtml || null,
      bodyHtml: form.bodyHtml,
      footerHtml: form.footerHtml || null,
      isDefault: form.isDefault,
      status: form.status,
      version: form.version,
      fromEmail: form.fromEmail || null,
      replyToEmail: form.replyToEmail || null,
      recipients: JSON.stringify(form.recipients),
      variablesUsed: extractVariables(`${form.subject}\n${form.headerHtml}\n${form.bodyHtml}\n${form.footerHtml}`).join(","),
    }

    setSaving(true)
    try {
      const isEdit = !!form.id
      const p = isEdit
        ? apiPatch(`/api/onboarding-emails/${form.id}`, payload)
        : apiPost("/api/onboarding-emails", payload)
      await safeToast(
        p,
        isEdit ? "Email template updated" : "Email template created",
        isEdit ? "Failed to update" : "Failed to create",
      )
      setEditorOpen(false)
      listFetch.reload()
    } finally {
      setSaving(false)
    }
  }, [form, listFetch])

  // ----- Render -----
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Email Templates"
          description="Reusable email content for every onboarding event. Workflows decide when each template fires."
          icon={Mail}
          actions={
            <Button size="sm" onClick={openNew} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Email Template
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Templates" value={stats.total} icon={Mail} accent="emerald" />
          <StatCard label="Active" value={stats.active} icon={CheckCircle2} accent="cyan" />
          <StatCard label="Default" value={stats.defaults} icon={Star} accent="amber" />
          <StatCard label="Drafts" value={stats.drafts} icon={FileText} accent="coral" />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Sidebar — event categories */}
          <EventSidebar
            activeEvent={activeEvent}
            onSelect={setActiveEvent}
            counts={eventCounts}
            totalCount={items.length}
          />

          {/* Templates table */}
          <Card className="bg-card border border-border/60 rounded-xl shadow-soft">
            <CardContent className="p-4">
              {/* Toolbar */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, code, subject…"
                    className="pl-9 h-9 bg-background"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {activeEvent !== "__all__" && (
                    <Badge variant="outline" className="gap-1.5 py-1 pl-2.5 pr-2">
                      <span className="text-muted-foreground">Filtered:</span>
                      <span className="font-medium">{activeEvent}</span>
                      <button
                        onClick={() => setActiveEvent("__all__")}
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                        aria-label="Clear filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  <Button size="sm" onClick={openNew} className="gap-1.5">
                    <Plus className="h-4 w-4" /> New Template
                  </Button>
                </div>
              </div>

              {/* Table or empty / loading */}
              {listFetch.loading ? (
                <div className="rounded-xl border border-border/60 overflow-hidden">
                  <div className="p-3 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-border/60">
                  <EmptyState
                    icon={Inbox}
                    title={items.length === 0 ? "No email templates yet" : "No templates match your filter"}
                    description={
                      items.length === 0
                        ? "Create your first email template to start sending onboarding communications."
                        : "Try clearing the search or selecting a different event type."
                    }
                    action={
                      <Button size="sm" onClick={openNew} className="gap-1.5">
                        <Plus className="h-4 w-4" /> New Template
                      </Button>
                    }
                  />
                </div>
              ) : (
                <TemplatesTable
                  items={filtered}
                  onEdit={openEdit}
                  onClone={openClone}
                  onSetDefault={setDefault}
                  onPreview={(t) => setPreviewTemplate(t)}
                  onDelete={(t) => setDeleteTarget(t)}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Editor dialog */}
        <EditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          form={form}
          setForm={setForm}
          onSubmit={submitForm}
          saving={saving}
        />

        {/* Preview dialog */}
        <PreviewDialog
          template={previewTemplate}
          onOpenChange={(o) => { if (!o) setPreviewTemplate(null) }}
        />

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete email template?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <span className="font-medium text-foreground">{deleteTarget?.name}</span> ({deleteTarget?.code}).
                Workflows using this template will fall back to the next default. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}

// ============================================================================
//  Event sidebar
// ============================================================================

function EventSidebar({
  activeEvent, onSelect, counts, totalCount,
}: {
  activeEvent: string
  onSelect: (v: string) => void
  counts: Record<string, number>
  totalCount: number
}) {
  return (
    <Card className="bg-card border border-border/60 rounded-xl shadow-soft h-fit lg:sticky lg:top-2">
      <CardContent className="p-3">
        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Event Types
          </span>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 tabular-nums">
            {EVENT_CATEGORIES.length}
          </Badge>
        </div>

        <ScrollArea className="max-h-[70vh] pr-1">
          <div className="flex flex-col gap-0.5">
            <SidebarItem
              label="All Templates"
              icon={Layers}
              count={totalCount}
              active={activeEvent === "__all__"}
              onClick={() => onSelect("__all__")}
              accent="emerald"
            />
            <div className="my-1.5 h-px bg-border/60" />
            {EVENT_CATEGORIES.map((e) => {
              const Icon = e.icon
              const count = counts[e.value] || 0
              const active = activeEvent === e.value
              return (
                <button
                  key={e.value}
                  onClick={() => onSelect(e.value)}
                  className={cn(
                    "group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left",
                    active
                      ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground group-hover:text-foreground",
                  )} />
                  <span className="flex-1 truncate">{e.value}</span>
                  {count > 0 ? (
                    <Badge variant="outline" className={cn(
                      "h-5 px-1.5 text-[10px] tabular-nums",
                      active
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "text-muted-foreground",
                    )}>
                      {count}
                    </Badge>
                  ) : null}
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function SidebarItem({
  label, icon: Icon, count, active, onClick, accent = "emerald",
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  count: number
  active: boolean
  onClick: () => void
  accent?: "emerald" | "teal" | "cyan"
}) {
  const accentText: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    teal: "text-teal-600 dark:text-teal-400",
    cyan: "text-cyan-600 dark:text-cyan-400",
  }
  const accentBg: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    teal: "bg-teal-500/10 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
    cyan: "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left font-medium",
        active ? accentBg[accent] : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? accentText[accent] : "text-muted-foreground group-hover:text-foreground")} />
      <span className="flex-1 truncate">{label}</span>
      <Badge variant="outline" className={cn(
        "h-5 px-1.5 text-[10px] tabular-nums",
        active ? "border-current/30 bg-current/10" : "text-muted-foreground",
      )}>
        {count}
      </Badge>
    </button>
  )
}

// ============================================================================
//  Templates table
// ============================================================================

function TemplatesTable({
  items, onEdit, onClone, onSetDefault, onPreview, onDelete,
}: {
  items: EmailTemplate[]
  onEdit: (t: EmailTemplate) => void
  onClone: (t: EmailTemplate) => void
  onSetDefault: (t: EmailTemplate) => void
  onPreview: (t: EmailTemplate) => void
  onDelete: (t: EmailTemplate) => void
}) {
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b border-border/60">
              <Th className="min-w-[200px]">Template Name</Th>
              <Th>Code</Th>
              <Th>Event Type</Th>
              <Th>Scope</Th>
              <Th>Lang</Th>
              <Th className="text-center">Default</Th>
              <Th>Status</Th>
              <Th>Updated</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => {
              return (
                <tr
                  key={t.id}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  {/* Name */}
                  <td className="px-3 py-2.5 align-middle">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <EventIconView eventType={t.eventType} className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{t.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[280px]">{t.subject}</div>
                      </div>
                    </div>
                  </td>

                  {/* Code */}
                  <td className="px-3 py-2.5 align-middle">
                    <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-foreground/80">
                      {t.code}
                    </code>
                  </td>

                  {/* Event Type */}
                  <td className="px-3 py-2.5 align-middle">
                    <Badge variant="outline" className="gap-1.5 font-medium">
                      <EventIconView eventType={t.eventType} className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs">{t.eventType}</span>
                    </Badge>
                  </td>

                  {/* Scope */}
                  <td className="px-3 py-2.5 align-middle">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize",
                      SCOPE_BADGE_CLASS[t.scopeType] || SCOPE_BADGE_CLASS.tenant,
                    )}>
                      {t.scopeType}
                    </span>
                  </td>

                  {/* Language */}
                  <td className="px-3 py-2.5 align-middle">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground uppercase">
                      <Languages className="h-3.5 w-3.5" />
                      {t.language || "en"}
                    </span>
                  </td>

                  {/* Default */}
                  <td className="px-3 py-2.5 align-middle text-center">
                    {t.isDefault ? (
                      <Star className="h-4 w-4 inline fill-amber-400 text-amber-500" />
                    ) : (
                      <Star className="h-4 w-4 inline text-muted-foreground/30" />
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2.5 align-middle">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
                      STATUS_BADGE_CLASS[t.status] || STATUS_BADGE_CLASS.Inactive,
                    )}>
                      {t.status}
                    </span>
                  </td>

                  {/* Updated */}
                  <td className="px-3 py-2.5 align-middle">
                    <span className="text-xs text-muted-foreground">{timeAgo(t.updatedAt)}</span>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5 align-middle text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onPreview(t)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Preview</TooltipContent>
                      </Tooltip>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onEdit(t)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onClone(t)}>
                            <Copy className="h-3.5 w-3.5 mr-2" /> Clone
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onSetDefault(t)}
                            disabled={t.isDefault}
                          >
                            <Star className="h-3.5 w-3.5 mr-2" />
                            {t.isDefault ? "Already default" : "Set as default"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onPreview(t)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> Preview
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(t)}
                            className="text-rose-600 dark:text-rose-400 focus:text-rose-700 focus:bg-rose-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn(
      "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
      className,
    )}>
      {children}
    </th>
  )
}

// ============================================================================
//  Editor dialog — form fields, recipient builder, HTML editor, variable picker
// ============================================================================

function EditorDialog({
  open, onOpenChange, form, setForm, onSubmit, saving,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  form: EmailFormState
  setForm: React.Dispatch<React.SetStateAction<EmailFormState>>
  onSubmit: () => void
  saving: boolean
}) {
  const [showPreview, setShowPreview] = useState(true)
  const [subjectFocused, setSubjectFocused] = useState(false)

  // Ref to the shared WYSIWYG editor — exposes insertSlug(slug) so the
  // variable picker can inject {{slugs}} at the cursor of whichever
  // section (Header/Body/Footer) was last focused.
  const editorRef = useRef<RichEditorHandle | null>(null)
  // Ref to the subject <Input> — variables can also be inserted there.
  const subjectRef = useRef<HTMLInputElement | null>(null)
  // Saved selection in the subject input (so chip clicks preserve cursor)
  const subjectSel = useRef<{ start: number; end: number } | null>(null)

  const field = useCallback(<K extends keyof EmailFormState>(key: K, value: EmailFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }, [setForm])

  // Track subject focus so variable clicks know to insert into the subject
  const onSubjectFocus = useCallback(() => {
    setSubjectFocused(true)
  }, [])
  const onSubjectBlur = useCallback(() => {
    const el = subjectRef.current
    if (el) subjectSel.current = { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
    // Delay to allow chip click to read subjectFocused=true
    setTimeout(() => setSubjectFocused(false), 150)
  }, [])

  // Insert a {{Variable}} token — at subject cursor if subject is focused,
  // otherwise at the cursor of the focused WYSIWYG section.
  const insertVariable = useCallback((slug: string) => {
    const token = `{{${slug}}}`

    // If subject was most recently focused, insert into the subject line
    if (subjectFocused && subjectRef.current) {
      const el = subjectRef.current
      const sel = subjectSel.current ?? { start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.value.length }
      const next = el.value.slice(0, sel.start) + token + el.value.slice(sel.end)
      field("subject", next)
      const pos = sel.start + token.length
      subjectSel.current = { start: pos, end: pos }
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(pos, pos)
      })
      return
    }

    // Otherwise route into the WYSIWYG editor (header/body/footer)
    editorRef.current?.insertSlug(slug)
  }, [subjectFocused, field])

  // ---- Section change handler for the WYSIWYG editor ----
  const handleSectionChange = useCallback((section: EditorSection, html: string) => {
    if (section === "header") field("headerHtml", html)
    else if (section === "body") field("bodyHtml", html)
    else field("footerHtml", html)
  }, [field])

  // ----- Recipients manipulation -----
  const addRecipient = useCallback((bucket: "to" | "cc" | "bcc", type: string) => {
    setForm((f) => {
      const meta = RECIPIENT_META[type]
      const newR: Recipient = { type, value: meta?.needsValue ? "" : undefined }
      return {
        ...f,
        recipients: {
          ...f.recipients,
          [bucket]: [...f.recipients[bucket], newR],
        },
      }
    })
  }, [setForm])

  const removeRecipient = useCallback((bucket: "to" | "cc" | "bcc", idx: number) => {
    setForm((f) => ({
      ...f,
      recipients: {
        ...f.recipients,
        [bucket]: f.recipients[bucket].filter((_, i) => i !== idx),
      },
    }))
  }, [setForm])

  const updateRecipientValue = useCallback((bucket: "to" | "cc" | "bcc", idx: number, value: string) => {
    setForm((f) => ({
      ...f,
      recipients: {
        ...f.recipients,
        [bucket]: f.recipients[bucket].map((r, i) => (i === idx ? { ...r, value } : r)),
      },
    }))
  }, [setForm])

  // ----- Live preview substitution -----
  const previewSubject = useMemo(() => substituteVariables(form.subject), [form.subject])
  const previewHtml = useMemo(
    () => substituteVariables(`${form.headerHtml || ""}\n${form.bodyHtml || ""}\n${form.footerHtml || ""}`),
    [form.headerHtml, form.bodyHtml, form.footerHtml],
  )

  // ----- Slugs currently used across subject + all sections (for the palette + summary) -----
  const usedVariables = useMemo(
    () => extractVariables(`${form.subject}\n${form.headerHtml || ""}\n${form.bodyHtml || ""}\n${form.footerHtml || ""}`),
    [form.subject, form.headerHtml, form.bodyHtml, form.footerHtml],
  )

  const isEdit = !!form.id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-6xl max-w-[calc(100%-2rem)] w-[calc(100%-2rem)] max-h-[90vh] p-0 gap-0 overflow-hidden"
        showCloseButton
      >
        {/* Animated header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="px-5 py-3.5 border-b border-border/60 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold truncate">
                {isEdit ? "Edit Email Template" : "New Email Template"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEdit ? `${form.code} · v${form.version}` : "Define content, recipients, and variables"}
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowPreview((s) => !s)}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{showPreview ? "Hide Preview" : "Show Preview"}</span>
            </Button>
          </div>
        </motion.div>

        {/* Body — scrollable */}
        <ScrollArea className="flex-1 max-h-[calc(90vh-128px)]">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-0">
            {/* ----- Left: form + recipients + HTML editor ----- */}
            <div className="p-5 space-y-5 min-w-0">

              {/* Top form fields */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Field label="Template Name" required icon={Type}>
                  <Input
                    value={form.name}
                    onChange={(e) => field("name", e.target.value)}
                    placeholder="e.g. Candidate Invite — Default"
                    className="h-9"
                  />
                </Field>
                <Field label="Template Code" required icon={Hash}>
                  <Input
                    value={form.code}
                    onChange={(e) => field("code", e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                    placeholder="EMAIL_INVITE"
                    className="h-9 font-mono text-sm"
                  />
                </Field>
                <Field label="Event Type" required icon={Bell}>
                  <Select value={form.eventType} onValueChange={(v) => field("eventType", v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {EVENT_CATEGORIES.map((e) => {
                        const Icon = e.icon
                        return (
                          <SelectItem key={e.value} value={e.value}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              {e.value}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Scope Type" icon={Layers}>
                  <Select value={form.scopeType} onValueChange={(v) => field("scopeType", v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SCOPE_TYPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Language" icon={Languages}>
                  <Select value={form.language} onValueChange={(v) => field("language", v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Status" icon={Tag}>
                  <Select value={form.status} onValueChange={(v) => field("status", v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="From Email (override)" icon={AtSign}>
                  <Input
                    type="email"
                    value={form.fromEmail}
                    onChange={(e) => field("fromEmail", e.target.value)}
                    placeholder="hr@company.com"
                    className="h-9"
                  />
                </Field>
                <Field label="Reply-To Email (override)" icon={AtSign}>
                  <Input
                    type="email"
                    value={form.replyToEmail}
                    onChange={(e) => field("replyToEmail", e.target.value)}
                    placeholder="no-reply@company.com"
                    className="h-9"
                  />
                </Field>

                {/* Default switch */}
                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <div>
                      <Label className="text-xs font-medium">Default Template</Label>
                      <p className="text-[10px] text-muted-foreground">For this event type</p>
                    </div>
                  </div>
                  <Switch
                    checked={form.isDefault}
                    onCheckedChange={(v) => field("isDefault", v)}
                  />
                </div>
              </section>

              {/* Subject */}
              <Field label="Subject" required icon={Type}>
                <Input
                  ref={subjectRef}
                  value={form.subject}
                  onChange={(e) => field("subject", e.target.value)}
                  onFocus={onSubjectFocus}
                  onBlur={onSubjectBlur}
                  placeholder="Welcome to {{CompanyName}} — complete your onboarding"
                  className="h-9"
                />
              </Field>
              <SlugUsageSummary used={usedVariables} />

              <Separator />

              {/* Recipient builder */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-semibold">Recipients</h3>
                  <span className="text-xs text-muted-foreground">
                    — default To / CC / BCC for every send using this template
                  </span>
                </div>
                <div className="space-y-2">
                  <RecipientRow
                    label="To"
                    bucket="to"
                    recipients={form.recipients.to}
                    onAdd={addRecipient}
                    onRemove={removeRecipient}
                    onUpdate={updateRecipientValue}
                  />
                  <RecipientRow
                    label="CC"
                    bucket="cc"
                    recipients={form.recipients.cc}
                    onAdd={addRecipient}
                    onRemove={removeRecipient}
                    onUpdate={updateRecipientValue}
                  />
                  <RecipientRow
                    label="BCC"
                    bucket="bcc"
                    recipients={form.recipients.bcc}
                    onAdd={addRecipient}
                    onRemove={removeRecipient}
                    onUpdate={updateRecipientValue}
                  />
                </div>
              </section>

              <Separator />

              {/* WYSIWYG editor — Header / Body / Footer tabs */}
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-semibold">Email Content</h3>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-0 text-[10px]">
                      WYSIWYG
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Tip: click variables on the right to insert into the focused field
                  </span>
                </div>

                <SectionedRichEditor
                  ref={editorRef}
                  header={form.headerHtml}
                  body={form.bodyHtml}
                  footer={form.footerHtml}
                  onChange={handleSectionChange}
                  initialSection="body"
                  minHeight={300}
                  compact
                  placeholders={{
                    header: "<div style='text-align:center; padding:16px;'><img src='{{CompanyLogo}}' alt='logo' height='40' /></div>",
                    body: "<p>Hi {{CandidateName}},</p><p>Welcome to {{CompanyName}}! …</p>",
                    footer: "<p style='color:#888; font-size:12px;'>© {{CompanyName}}. This is an automated email.</p>",
                  }}
                />
              </section>
            </div>

            {/* ----- Right: shared slug library (always visible, sticky + self-scrolling) ----- */}
            <aside className="border-l border-border/60 bg-background min-w-0 lg:sticky lg:top-0 lg:h-[calc(90vh-128px)] lg:self-start lg:overflow-hidden flex flex-col">
              <SlugPalette
                onInsert={insertVariable}
                usedVariables={usedVariables}
                context="email"
                title="Slug Library"
                className="h-full"
              />
            </aside>
          </div>

          {/* Live preview (toggleable, full width below) */}
          <AnimatePresence initial={false}>
            {showPreview && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-border/60"
              >
                <div className="p-5 bg-muted/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-fuchsia-500" />
                    <h3 className="text-sm font-semibold">Live Preview</h3>
                    <span className="text-xs text-muted-foreground">
                      — rendered with sample data (Priya Sharma · ACME Corp)
                    </span>
                  </div>
                  <EmailPreview
                    subject={previewSubject}
                    html={previewHtml}
                    fromEmail={form.fromEmail || "hr@acme.com"}
                    recipients={form.recipients}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between gap-2 bg-background">
          <div className="text-xs text-muted-foreground">
            {form.recipients.to.length > 0 || form.recipients.cc.length > 0 || form.recipients.bcc.length > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {form.recipients.to.length} To · {form.recipients.cc.length} CC · {form.recipients.bcc.length} BCC
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">No recipients configured</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={onSubmit} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {isEdit ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Field wrapper
// ============================================================================

function Field({
  label, required, icon: Icon, children,
}: {
  label: string
  required?: boolean
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
        {label}
        {required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  )
}

// ============================================================================
//  Recipient row (To / CC / BCC)
// ============================================================================

function RecipientRow({
  label, bucket, recipients, onAdd, onRemove, onUpdate,
}: {
  label: string
  bucket: "to" | "cc" | "bcc"
  recipients: Recipient[]
  onAdd: (bucket: "to" | "cc" | "bcc", type: string) => void
  onRemove: (bucket: "to" | "cc" | "bcc", idx: number) => void
  onUpdate: (bucket: "to" | "cc" | "bcc", idx: number, value: string) => void
}) {
  const labelClass =
    bucket === "to" ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
    : bucket === "cc" ? "text-teal-700 dark:text-teal-300 bg-teal-500/10"
    : "text-amber-700 dark:text-amber-300 bg-amber-500/10"

  return (
    <div className="rounded-lg border border-border/60 p-2.5 bg-background">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn(
          "inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded-md min-w-[44px]",
          labelClass,
        )}>
          {label}
        </span>

        {recipients.length === 0 ? (
          <span className="text-xs text-muted-foreground italic py-1">No recipients yet — use + to add</span>
        ) : null}

        {/* Recipient chips */}
        {recipients.map((r, idx) => {
          const meta = RECIPIENT_META[r.type]
          return (
            <div key={`${r.type}-${idx}`} className="inline-flex items-center gap-1.5">
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                meta?.chip || "bg-muted text-muted-foreground",
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full", meta?.dot || "bg-muted-foreground")} />
                {meta?.label || r.type}
                <button
                  onClick={() => onRemove(bucket, idx)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                  aria-label={`Remove ${meta?.label || r.type}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
              {meta?.needsValue && (
                <Input
                  type={meta.valueType === "email" ? "email" : "text"}
                  value={r.value || ""}
                  onChange={(e) => onUpdate(bucket, idx, e.target.value)}
                  placeholder={meta.valuePlaceholder}
                  className="h-7 w-52 text-xs"
                />
              )}
            </div>
          )
        })}

        {/* Add recipient dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Add
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Recipient type</DropdownMenuLabel>
            {RECIPIENT_TYPES.map((r) => (
              <DropdownMenuItem
                key={r.type}
                onClick={() => onAdd(bucket, r.type)}
                disabled={recipients.some((x) => x.type === r.type && !r.needsValue)}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full mr-2", r.dot)} />
                <span className="flex-1">{r.label}</span>
                {recipients.some((x) => x.type === r.type && !r.needsValue) && (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ============================================================================
//  Email preview (mini email client card)
// ============================================================================

function EmailPreview({
  subject, html, fromEmail, recipients,
}: {
  subject: string
  html: string
  fromEmail: string
  recipients: RecipientGroup
}) {
  const toLabels = recipients.to.map((r) => RECIPIENT_META[r.type]?.label || r.type).join(", ") || "Candidate"
  return (
    <div className="rounded-xl border border-border/60 bg-background overflow-hidden shadow-soft max-w-3xl">
      {/* Email client top bar */}
      <div className="px-4 py-2 bg-muted/60 border-b border-border/60 flex items-center gap-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="text-xs text-muted-foreground ml-2">Email Preview</span>
      </div>
      {/* Subject + meta */}
      <div className="px-4 py-3 border-b border-border/60">
        <div className="text-sm font-semibold text-foreground">{subject || "(no subject)"}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="font-medium text-foreground/70">From:</span>
            <span>{fromEmail || "hr@acme.com"}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="font-medium text-foreground/70">To:</span>
            <span>{toLabels}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>just now</span>
          </span>
        </div>
      </div>
      {/* Body */}
      <div
        className="px-5 py-4 text-sm leading-relaxed text-foreground/90"
        dangerouslySetInnerHTML={{ __html: html || "<p class='text-muted-foreground italic'>(empty body)</p>" }}
      />
    </div>
  )
}

// ============================================================================
//  Standalone preview dialog (opens from row action)
// ============================================================================

function PreviewDialog({
  template, onOpenChange,
}: {
  template: EmailTemplate | null
  onOpenChange: (o: boolean) => void
}) {
  const subject = template ? substituteVariables(template.subject) : ""
  const html = template
    ? substituteVariables(`${template.headerHtml || ""}\n${template.bodyHtml || ""}\n${template.footerHtml || ""}`)
    : ""
  const recipients = template ? parseRecipients(template.recipients) : emptyRecipients()

  return (
    <Dialog open={!!template} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[calc(100%-2rem)] max-h-[90vh] p-0 gap-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="px-5 py-3.5 border-b border-border/60 flex items-center gap-3"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            {template ? (
              <EventIconView eventType={template.eventType} className="h-4 w-4" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-semibold truncate">{template?.name}</DialogTitle>
            <DialogDescription className="text-xs">
              {template?.code} · {template?.eventType} · {template?.language?.toUpperCase()}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-1.5">
            {template?.isDefault && (
              <Badge className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <Star className="h-3 w-3 fill-current" /> Default
              </Badge>
            )}
            {template?.status && (
              <Badge variant="outline" className={STATUS_BADGE_CLASS[template.status]}>
                {template.status}
              </Badge>
            )}
          </div>
        </motion.div>

        <ScrollArea className="flex-1 max-h-[calc(90vh-80px)]">
          <div className="p-5 space-y-4">
            {/* Meta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <Meta label="Scope" value={template?.scopeType || "—"} />
              <Meta label="Version" value={`v${template?.version || 1}`} />
              <Meta label="From" value={template?.fromEmail || "Default HR inbox"} />
              <Meta label="Reply-To" value={template?.replyToEmail || "Default"} />
            </div>

            {/* Recipients summary */}
            <div className="rounded-lg border border-border/60 p-3 bg-muted/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recipients</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {recipients.to.length === 0 && recipients.cc.length === 0 && recipients.bcc.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No recipients configured</span>
                ) : null}
                {recipients.to.map((r, i) => (
                  <RecipientChip key={`to-${i}`} type={r.type} value={r.value} bucket="To" />
                ))}
                {recipients.cc.map((r, i) => (
                  <RecipientChip key={`cc-${i}`} type={r.type} value={r.value} bucket="CC" />
                ))}
                {recipients.bcc.map((r, i) => (
                  <RecipientChip key={`bcc-${i}`} type={r.type} value={r.value} bucket="BCC" />
                ))}
              </div>
            </div>

            {/* Preview */}
            <EmailPreview
              subject={subject}
              html={html}
              fromEmail={template?.fromEmail || "hr@acme.com"}
              recipients={recipients}
            />

            {/* Variables used */}
            {template?.variablesUsed && (
              <div className="rounded-lg border border-border/60 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Variables Used
                </div>
                <div className="flex flex-wrap gap-1">
                  {template.variablesUsed.split(",").filter(Boolean).map((v) => (
                    <code key={v} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-foreground/70">
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm text-foreground/90 truncate">{value}</div>
    </div>
  )
}

function RecipientChip({
  type, value, bucket,
}: {
  type: string
  value?: string
  bucket: string
}) {
  const meta = RECIPIENT_META[type]
  const bucketClass =
    bucket === "To" ? "text-emerald-700 dark:text-emerald-300"
    : bucket === "CC" ? "text-teal-700 dark:text-teal-300"
    : "text-amber-700 dark:text-amber-300"
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("text-[10px] font-semibold uppercase", bucketClass)}>{bucket[0]}:</span>
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
        meta?.chip || "bg-muted text-muted-foreground",
      )}>
        <span className={cn("h-1.5 w-1.5 rounded-full", meta?.dot || "bg-muted-foreground")} />
        {meta?.label || type}
        {value ? <span className="opacity-70">· {value}</span> : null}
      </span>
    </span>
  )
}

export default EmailsSection
