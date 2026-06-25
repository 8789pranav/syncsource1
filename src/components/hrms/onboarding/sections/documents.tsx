"use client"

// =============================================================
// Onboarding — Document Library (spec #8)
// Reusable document templates for offer letters, agreements,
// declarations, etc. 15 categories, full template editor with
// HTML Header/Body/Footer sections, variable picker, preview.
// =============================================================

import * as React from "react"
import { useMemo, useState, useCallback, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  FileText, FileCheck2, ShieldCheck, Briefcase, GraduationCap, ScrollText,
  FilePlus2, Mail, ClipboardCheck, SearchCheck, HeartPulse, Laptop, Landmark,
  Users, FileBox, Layers2,
  Search, Plus, Pencil, Copy, Trash2, Star, Power, History, Eye, MoreHorizontal,
  Save, X, Braces, ChevronDown,
  Inbox, Loader2, PenLine, FileCode2, Tag, Sparkles, RotateCcw,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

import { PageHeader, StatCard, EmptyState } from "@/components/hrms/ui"
import {
  useFetch, apiPost, apiPatch, apiDelete, safeToast,
  timeAgo, formatDate,
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

// =============================================================
// Types
// =============================================================

export interface DocumentTemplate {
  id: string
  tenantId: string
  name: string
  code: string
  documentType: string
  scopeType: string
  entityId?: string | null
  branchId?: string | null
  locationId?: string | null
  departmentId?: string | null
  employeeType?: string | null
  language: string
  version: number
  isDefault: boolean
  status: string
  createdBy?: string | null
  headerHtml?: string | null
  bodyHtml: string
  footerHtml?: string | null
  pageSettings?: string | null
  variablesUsed?: string | null
  effectiveFrom?: string | null
  effectiveTo?: string | null
  createdAt: string
  updatedAt: string
}

// =============================================================
// Constants — categories, scope types, statuses, languages
// =============================================================

interface CategoryDef {
  label: string
  icon: LucideIcon
}

const CATEGORIES: CategoryDef[] = [
  { label: "Offer Letter", icon: FileText },
  { label: "Appointment Letter", icon: FileCheck2 },
  { label: "NDA", icon: ShieldCheck },
  { label: "Employment Agreement", icon: Briefcase },
  { label: "Internship Letter", icon: GraduationCap },
  { label: "Contract Letter", icon: ScrollText },
  { label: "Joining Letter", icon: FilePlus2 },
  { label: "Welcome Letter", icon: Mail },
  { label: "Policy Acknowledgment", icon: ClipboardCheck },
  { label: "Background Verification Form", icon: SearchCheck },
  { label: "Medical Declaration", icon: HeartPulse },
  { label: "Asset Declaration", icon: Laptop },
  { label: "Bank Declaration", icon: Landmark },
  { label: "Nominee Declaration", icon: Users },
  { label: "Custom Document", icon: FileBox },
]

const ALL_DOCS = "All Documents"

const SCOPE_TYPES: { value: string; label: string }[] = [
  { value: "tenant", label: "Tenant (Org-wide)" },
  { value: "entity", label: "Entity" },
  { value: "branch", label: "Branch" },
  { value: "location", label: "Location" },
  { value: "department", label: "Department" },
  { value: "employee_type", label: "Employee Type" },
]

const STATUS_OPTIONS = ["Active", "Draft", "Archived"]
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "kn", label: "Kannada" },
  { value: "mr", label: "Marathi" },
  { value: "bn", label: "Bengali" },
  { value: "gu", label: "Gujarati" },
  { value: "pa", label: "Punjabi" },
]

const STATUS_BADGE: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  Archived: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
}

const SCOPE_BADGE: Record<string, string> = {
  tenant: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  entity: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  branch: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  location: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  department: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  employee_type: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
}

const SCOPE_LABEL: Record<string, string> = {
  tenant: "Tenant",
  entity: "Entity",
  branch: "Branch",
  location: "Location",
  department: "Department",
  employee_type: "Employee Type",
}

// =============================================================
// Slugs / Variables — provided by the shared slug-catalog module
// (single source of truth used by BOTH documents & emails).
// extractVariables() and substituteVariables() are imported above.
// =============================================================

// =============================================================
// Helpers
// =============================================================

function toCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
}

function defaultTemplateBody(category: string): string {
  // A reasonable starter body for common categories — purely a help to the user.
  const head = `<div style="font-family: Arial, sans-serif; color: #1f2937; padding: 24px;">\n`
  const foot = `\n</div>`
  switch (category) {
    case "Offer Letter":
      return `${head}<h1 style="color:#0f766e;margin:0 0 4px;">Offer of Employment</h1>
<p style="margin:0 0 16px;color:#64748b;">{{CompanyName}} · {{CompanyAddress}}</p>
<p>Dear {{CandidateName}},</p>
<p>We are delighted to offer you the position of <strong>{{Designation}}</strong> at {{EntityName}}, reporting to {{ReportingManager}}. Your joining date will be <strong>{{JoiningDate}}</strong>.</p>
<p>Your annual CTC will be {{CTC}} ({{SalaryCurrency}}), with a probation period of {{ProbationPeriod}}.</p>
<p>Please indicate your acceptance by signing below.</p>
<p style="margin-top:32px;">Sincerely,<br/><strong>{{AuthorizedSignatory}}</strong><br/>{{SignatoryDesignation}}, {{CompanyName}}</p>${foot}`
    case "Welcome Letter":
      return `${head}<h1 style="color:#0f766e;margin:0 0 8px;">Welcome to {{CompanyName}}, {{CandidateFirstName}}!</h1>
<p>We're thrilled to have you join the {{Department}} team as a {{Designation}}. Your first day is {{JoiningDate}} and you'll be based at {{Branch}}, {{Location}}.</p>
<p>If you have any questions before joining, reach out to {{HRManager}} at {{CompanyEmail}}.</p>
<p>Warm regards,<br/>{{HRManager}}<br/>{{CompanyName}}</p>${foot}`
    case "NDA":
      return `${head}<h1 style="color:#0f766e;margin:0 0 8px;">Non-Disclosure Agreement</h1>
<p>This Non-Disclosure Agreement ("Agreement") is entered into on {{LetterDate}} between {{EntityName}} ("Company") and {{CandidateName}} ("Recipient").</p>
<p>The Recipient agrees to hold all confidential information of the Company in strict trust for a period of {{NoticePeriod}} following termination of engagement.</p>
<p>Signed on {{CurrentDate}}:</p>
<p style="margin-top:24px;">_____________________ &nbsp;&nbsp; _____________________<br/>{{CandidateName}} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {{AuthorizedSignatory}}</p>${foot}`
    default:
      return `${head}<h1 style="color:#0f766e;">${category}</h1>
<p>Dear {{CandidateName}},</p>
<p>This document is generated from the <strong>${category}</strong> template.</p>
<p>Issued on {{CurrentDate}} by {{CompanyName}}.</p>${foot}`
  }
}

// =============================================================
// Formatters
// =============================================================

const SCOPE_FALLBACK = "Tenant"

function scopeBadgeClass(scope?: string): string {
  return SCOPE_BADGE[scope || "tenant"] || SCOPE_BADGE.tenant
}
function scopeLabel(scope?: string): string {
  return SCOPE_LABEL[scope || "tenant"] || SCOPE_FALLBACK
}

// =============================================================
// Sub-components
// =============================================================

/** Loading skeleton rows for the templates table. */
function TableSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="p-3 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    </div>
  )
}

/** Category sidebar pill. */
function CategoryPill({
  icon: Icon, label, count, active, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-transparent",
        active
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/80")} />
      <span className="flex-1 text-left truncate">{label}</span>
      <span
        className={cn(
          "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums",
          active
            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
            : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  )
}

/** A small badge that shows the variable count used in a template. */
function VariablesBadge({ count }: { count: number }) {
  if (!count) return <span className="text-xs text-muted-foreground/60 italic">No slugs</span>
  return (
    <Badge
      variant="secondary"
      className="bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300 font-medium border-0"
    >
      <Braces className="h-3 w-3 mr-1" />
      {count} slug{count !== 1 ? "s" : ""}
    </Badge>
  )
}

// =============================================================
// HTML Editor panel — provided by the shared <SectionedRichEditor> in
// ./rich-editor (real WYSIWYG contentEditable editor with formatting
// toolbar + Header/Body/Footer tabs). The slug library on the right
// is the shared <SlugPalette> from ./slug-catalog (single source of
// truth used by both documents and emails).
// =============================================================

// (no local declarations — kept for reference)

// =============================================================
// Preview Dialog (renders HTML with sample substitution)
// =============================================================

interface PreviewDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  template: {
    name?: string
    headerHtml?: string | null
    bodyHtml?: string
    footerHtml?: string | null
  } | null
}

function PreviewDialog({ open, onOpenChange, template }: PreviewDialogProps) {
  if (!template) return null
  const header = substituteVariables(template.headerHtml || "")
  const body = substituteVariables(template.bodyHtml || "")
  const footer = substituteVariables(template.footerHtml || "")
  const combined = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; padding: 32px; }
          .doc-header { border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px; }
          .doc-footer { border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 24px; font-size: 11px; color: #64748b; }
          .doc-body { min-height: 60vh; }
          h1, h2, h3 { color: #0f766e; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #e5e7eb; padding: 6px 10px; }
        </style>
      </head>
      <body>
        ${header ? `<div class="doc-header">${header}</div>` : ""}
        <div class="doc-body">${body}</div>
        ${footer ? `<div class="doc-footer">${footer}</div>` : ""}
      </body>
    </html>
  `

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Preview · {template.name || "Untitled Template"}
          </DialogTitle>
          <DialogDescription>
            Rendered HTML with sample variable substitution (e.g., {"{{CandidateName}}"} → "Priya Sharma").
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border/60 overflow-hidden bg-white">
          <iframe
            title="Document Preview"
            srcDoc={combined}
            className="w-full h-[60vh] bg-white"
            sandbox="allow-same-origin"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================
// Version History Dialog (read-only — current version + audit note)
// =============================================================

interface VersionHistoryDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  template: DocumentTemplate | null
}

function VersionHistoryDialog({ open, onOpenChange, template }: VersionHistoryDialogProps) {
  if (!template) return null
  const used = template.variablesUsed
    ? template.variablesUsed.split(",").map((s) => s.trim()).filter(Boolean)
    : extractVariables(`${template.headerHtml || ""}${template.bodyHtml || ""}${template.footerHtml || ""}`)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            Version History
          </DialogTitle>
          <DialogDescription>
            {template.name} · <span className="font-mono">{template.code}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Current Version · v{template.version}
              </p>
              <p className="text-xs text-muted-foreground">Last updated {timeAgo(template.updatedAt)}</p>
            </div>
            {template.isDefault && (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-0">
                <Star className="h-3 w-3 mr-1 fill-current" /> Default
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-border/60 px-3 py-2">
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium text-foreground">{template.status}</p>
            </div>
            <div className="rounded-md border border-border/60 px-3 py-2">
              <p className="text-muted-foreground">Language</p>
              <p className="font-medium text-foreground uppercase">{template.language}</p>
            </div>
            <div className="rounded-md border border-border/60 px-3 py-2">
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium text-foreground">{formatDate(template.createdAt)}</p>
            </div>
            <div className="rounded-md border border-border/60 px-3 py-2">
              <p className="text-muted-foreground">Last Updated</p>
              <p className="font-medium text-foreground">{formatDate(template.updatedAt)}</p>
            </div>
          </div>

          <div className="rounded-md border border-border/60 px-3 py-2">
            <p className="text-xs text-muted-foreground mb-1.5">Variables used ({used.length})</p>
            {used.length === 0 ? (
              <p className="text-xs italic text-muted-foreground/60">No slugs detected in this template.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {used.map((v) => (
                  <code key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono text-foreground/80">
                    {`{{${v}}}`}
                  </code>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex gap-2">
            <History className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Each save increments the version number. Prior versions are retained in the audit log
              for compliance — contact your administrator to restore an earlier version.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================
// Template Editor Dialog
// =============================================================

interface TemplateEditorDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** When editing/previewing — the existing template. null = creating new. */
  template: DocumentTemplate | null
  /** Pre-selected category (used as default for new templates). */
  defaultCategory: string
  onSaved: () => void
}

function TemplateEditorDialog({
  open, onOpenChange, template, defaultCategory, onSaved,
}: TemplateEditorDialogProps) {
  const isEdit = !!template
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [documentType, setDocumentType] = useState(defaultCategory)
  const [scopeType, setScopeType] = useState("tenant")
  const [language, setLanguage] = useState("en")
  const [status, setStatus] = useState("Draft")
  const [isDefault, setIsDefault] = useState(false)
  const [version, setVersion] = useState(1)
  const [effectiveFrom, setEffectiveFrom] = useState("")
  const [effectiveTo, setEffectiveTo] = useState("")
  const [header, setHeader] = useState("")
  const [body, setBody] = useState("")
  const [footer, setFooter] = useState("")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Ref to the shared WYSIWYG editor — exposes insertSlug(slug) so the
  // variable picker can inject {{slugs}} at the cursor of whichever
  // section (Header/Body/Footer) was last focused.
  const editorRef = useRef<RichEditorHandle | null>(null)

  // Sync state when template changes / dialog opens
  useEffect(() => {
    if (!open) return
    if (template) {
      setName(template.name)
      setCode(template.code)
      setDocumentType(template.documentType)
      setScopeType(template.scopeType || "tenant")
      setLanguage(template.language || "en")
      setStatus(template.status || "Draft")
      setIsDefault(template.isDefault || false)
      setVersion(template.version || 1)
      setEffectiveFrom(template.effectiveFrom ? template.effectiveFrom.slice(0, 10) : "")
      setEffectiveTo(template.effectiveTo ? template.effectiveTo.slice(0, 10) : "")
      setHeader(template.headerHtml || "")
      setBody(template.bodyHtml || "")
      setFooter(template.footerHtml || "")
    } else {
      setName("")
      setCode("")
      setDocumentType(defaultCategory)
      setScopeType("tenant")
      setLanguage("en")
      setStatus("Draft")
      setIsDefault(false)
      setVersion(1)
      setEffectiveFrom("")
      setEffectiveTo("")
      setHeader("")
      setBody(defaultTemplateBody(defaultCategory))
      setFooter("")
    }
  }, [open, template, defaultCategory])

  // Auto-generate code from name (only on create, when user hasn't manually edited code)
  const codeTouchedRef = useRef(false)
  useEffect(() => {
    if (!open) {
      codeTouchedRef.current = false
      return
    }
    if (!isEdit && !codeTouchedRef.current) {
      setCode(toCode(name))
    }
  }, [name, open, isEdit])

  // Variables used across all sections (for picker highlight)
  const usedVariables = useMemo(
    () => extractVariables(`${header}${body}${footer}`),
    [header, body, footer],
  )

  // Insert a {{slug}} token at the cursor of the focused editor section
  const insertVariable = useCallback((slug: string) => {
    editorRef.current?.insertSlug(slug)
    toast.info(`Inserted {{${slug}}}`)
  }, [])

  const handleSectionChange = useCallback((section: EditorSection, value: string) => {
    if (section === "header") setHeader(value)
    else if (section === "body") setBody(value)
    else setFooter(value)
  }, [])

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Template name is required")
    if (!code.trim()) return toast.error("Template code is required")
    if (!documentType) return toast.error("Document type is required")
    if (!body.trim()) return toast.error("Body HTML is required — every template needs content.")

    const payload: Record<string, unknown> = {
      name: name.trim(),
      code: code.trim(),
      documentType,
      scopeType,
      language,
      status,
      isDefault,
      version,
      effectiveFrom: effectiveFrom || null,
      effectiveTo: effectiveTo || null,
      headerHtml: header || null,
      bodyHtml: body,
      footerHtml: footer || null,
      variablesUsed: usedVariables.join(",") || null,
    }

    setSaving(true)
    try {
      if (isEdit && template) {
        await safeToast(
          apiPatch(`/api/onboarding-documents/${template.id}`, payload),
          "Template updated",
          "Failed to update template",
        )
      } else {
        await safeToast(
          apiPost("/api/onboarding-documents", payload),
          "Template created",
          "Failed to create template",
        )
      }
      onSaved()
      onOpenChange(false)
    } catch {
      // safeToast already displayed the error
    } finally {
      setSaving(false)
    }
  }

  const previewTemplate = {
    name, headerHtml: header, bodyHtml: body, footerHtml: footer,
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v) }}>
        <DialogContent
          showCloseButton
          className="sm:max-w-6xl max-w-[calc(100%-2rem)] w-full max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b border-border/60 space-y-1">
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {isEdit ? "Edit Template" : "New Document Template"}
              {isEdit && template && (
                <Badge variant="secondary" className="bg-muted text-muted-foreground font-mono text-[11px] ml-1">
                  v{template.version}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? `Editing "${template?.name}". Slug variables are auto-detected and listed on the right.`
                : "Configure the template metadata, write the HTML content, and insert slugs from the right panel."}
            </DialogDescription>
          </DialogHeader>

          {/* Body — 3 column grid */}
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-7 h-full">
              {/* LEFT: metadata form (col-span-2) */}
              <div className="lg:col-span-2 border-r border-border/60 bg-muted/20 p-4 overflow-y-auto max-h-[68vh]">
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Tag className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Template Details
                    </span>
                  </div>
                  <div>
                    <Label htmlFor="tpl-name" className="text-xs font-medium">Template Name <span className="text-rose-500">*</span></Label>
                    <Input
                      id="tpl-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Standard Offer Letter — Engineering"
                      className="mt-1 h-8 text-sm bg-background"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tpl-code" className="text-xs font-medium">Template Code <span className="text-rose-500">*</span></Label>
                    <Input
                      id="tpl-code"
                      value={code}
                      onChange={(e) => { setCode(e.target.value); codeTouchedRef.current = true }}
                      placeholder="e.g. OFFER_ENG_2025"
                      className="mt-1 h-8 text-sm font-mono bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Auto-generated from name. Must be unique.</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Document Type <span className="text-rose-500">*</span></Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger className="mt-1 h-8 text-sm bg-background w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.label} value={c.label}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Scope Type</Label>
                    <Select value={scopeType} onValueChange={setScopeType}>
                      <SelectTrigger className="mt-1 h-8 text-sm bg-background w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCOPE_TYPES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-medium">Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="mt-1 h-8 text-sm bg-background w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((l) => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tpl-version" className="text-xs font-medium">Version</Label>
                      <Input
                        id="tpl-version"
                        type="number"
                        min={1}
                        value={version}
                        onChange={(e) => setVersion(Math.max(1, Number(e.target.value) || 1))}
                        className="mt-1 h-8 text-sm bg-background"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="mt-1 h-8 text-sm bg-background w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="tpl-from" className="text-xs font-medium">Effective From</Label>
                      <Input
                        id="tpl-from"
                        type="date"
                        value={effectiveFrom}
                        onChange={(e) => setEffectiveFrom(e.target.value)}
                        className="mt-1 h-8 text-sm bg-background"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tpl-to" className="text-xs font-medium">Effective To</Label>
                      <Input
                        id="tpl-to"
                        type="date"
                        value={effectiveTo}
                        onChange={(e) => setEffectiveTo(e.target.value)}
                        className="mt-1 h-8 text-sm bg-background"
                      />
                    </div>
                  </div>
                  <Separator className="my-2 bg-border/60" />
                  <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 bg-background">
                    <div>
                      <Label htmlFor="tpl-default" className="text-xs font-medium cursor-pointer">Default Template</Label>
                      <p className="text-[10px] text-muted-foreground">Use as the default for this document type</p>
                    </div>
                    <Switch
                      id="tpl-default"
                      checked={isDefault}
                      onCheckedChange={setIsDefault}
                    />
                  </div>

                  <SlugUsageSummary used={usedVariables} className="mt-2" />
                </div>
              </div>

              {/* CENTER: WYSIWYG editor (col-span-3) */}
              <div className="lg:col-span-3 min-w-0 border-r border-border/60 p-4 flex flex-col min-h-0 max-h-[68vh]">
                <div className="flex items-center gap-1.5 mb-2">
                  <FileCode2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Template Content (WYSIWYG)
                  </span>
                </div>
                <div className="flex-1 min-h-0">
                  <SectionedRichEditor
                    ref={editorRef}
                    header={header}
                    body={body}
                    footer={footer}
                    onChange={handleSectionChange}
                    initialSection="body"
                    minHeight={320}
                  />
                </div>
              </div>

              {/* RIGHT: shared slug library (col-span-2) */}
              <div className="lg:col-span-2 min-w-0 flex flex-col min-h-0 max-h-[68vh] border-l border-border/60">
                <SlugPalette
                  onInsert={insertVariable}
                  usedVariables={usedVariables}
                  context="document"
                  title="Slug Library"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-3 border-t border-border/60 bg-muted/20">
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewOpen(true)}
                disabled={!body}
                className="gap-1.5"
              >
                <Eye className="h-4 w-4" /> Preview
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="gap-1.5 gradient-emerald text-primary-foreground"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isEdit ? "Save Changes" : "Create Template"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        template={previewTemplate}
      />
    </>
  )
}

// =============================================================
// Row actions dropdown
// =============================================================

interface RowActionsCallbacks {
  onEdit: (t: DocumentTemplate) => void
  onClone: (t: DocumentTemplate) => void
  onPreview: (t: DocumentTemplate) => void
  onSetDefault: (t: DocumentTemplate) => void
  onToggleStatus: (t: DocumentTemplate) => void
  onVersionHistory: (t: DocumentTemplate) => void
  onDelete: (t: DocumentTemplate) => void
}

interface RowActionsProps extends RowActionsCallbacks {
  template: DocumentTemplate
}

function RowActions({
  template, onEdit, onClone, onPreview, onSetDefault, onToggleStatus, onVersionHistory, onDelete,
}: RowActionsProps) {
  const isActive = template.status !== "Active"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Template actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onEdit(template)}>
          <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPreview(template)}>
          <Eye className="h-3.5 w-3.5 mr-2" /> Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onClone(template)}>
          <Copy className="h-3.5 w-3.5 mr-2" /> Clone
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSetDefault(template)}
          disabled={template.isDefault}
        >
          <Star className={`h-3.5 w-3.5 mr-2 ${template.isDefault ? "fill-current text-amber-500" : ""}`} />
          {template.isDefault ? "Default (set)" : "Set as Default"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleStatus(template)}>
          <Power className="h-3.5 w-3.5 mr-2" />
          {isActive ? "Publish / Activate" : "Deactivate"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onVersionHistory(template)}>
          <History className="h-3.5 w-3.5 mr-2" /> Version History
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(template)}
          disabled={template.isDefault}
          className="text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:focus:text-rose-300 focus:bg-rose-500/10"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          {template.isDefault ? "Delete (disabled — default)" : "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// =============================================================
// Templates table
// =============================================================

interface TemplatesTableProps {
  rows: DocumentTemplate[]
  loading: boolean
  onRowClick: (t: DocumentTemplate) => void
  actions: RowActionsCallbacks
}

function TemplatesTable({ rows, loading, onRowClick, actions }: TemplatesTableProps) {
  if (loading) return <TableSkeleton />
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card">
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Create your first template to standardize this document type."
        />
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[220px]">Template Name</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Code</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Document Type</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scope</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lang</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ver</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Default</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Updated</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow
                key={t.id}
                onClick={() => onRowClick(t)}
                className="cursor-pointer hover:bg-muted/30"
              >
                <TableCell className="text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground truncate max-w-[260px]">{t.name}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <VariablesBadge count={extractVariables(`${t.headerHtml || ""}${t.bodyHtml || ""}${t.footerHtml || ""}`).length} />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-foreground/80">
                    {t.code}
                  </code>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{t.documentType}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={cn("font-medium border-0", scopeBadgeClass(t.scopeType))}>
                    {scopeLabel(t.scopeType)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground uppercase">{t.language}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[11px]">v{t.version}</Badge>
                </TableCell>
                <TableCell>
                  {t.isDefault ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span><Star className="h-4 w-4 fill-amber-400 text-amber-500" /></span>
                      </TooltipTrigger>
                      <TooltipContent>Default for {t.documentType}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={cn("font-medium border-0", STATUS_BADGE[t.status] || "bg-muted text-muted-foreground")}>
                    {t.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {timeAgo(t.updatedAt)}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end">
                    <RowActions template={t} {...actions} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// =============================================================
// Main section
// =============================================================

export function DocumentsSection() {
  // Data: fetch ALL templates once, filter client-side per category
  const { data, loading, error, reload } = useFetch<{ items: DocumentTemplate[] }>(
    "/api/onboarding-documents",
    [],
  )
  const allTemplates = data?.items ?? []

  // UI state
  const [activeCategory, setActiveCategory] = useState<string>(ALL_DOCS)
  const [search, setSearch] = useState("")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [historyTemplate, setHistoryTemplate] = useState<DocumentTemplate | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DocumentTemplate | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Derived: counts per category + filtered list
  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of CATEGORIES) m[c.label] = 0
    for (const t of allTemplates) {
      m[t.documentType] = (m[t.documentType] ?? 0) + 1
    }
    return m
  }, [allTemplates])

  const stats = useMemo(() => {
    const active = allTemplates.filter((t) => t.status === "Active").length
    const drafts = allTemplates.filter((t) => t.status === "Draft").length
    const defaults = allTemplates.filter((t) => t.isDefault).length
    return { total: allTemplates.length, active, drafts, defaults }
  }, [allTemplates])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allTemplates.filter((t) => {
      if (activeCategory !== ALL_DOCS && t.documentType !== activeCategory) return false
      if (q) {
        return (
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [allTemplates, activeCategory, search])

  // Actions
  const openCreate = useCallback(() => {
    setEditingTemplate(null)
    setEditorOpen(true)
  }, [])

  const openEdit = useCallback((t: DocumentTemplate) => {
    setEditingTemplate(t)
    setEditorOpen(true)
  }, [])

  const openPreview = useCallback((t: DocumentTemplate) => {
    setPreviewTemplate(t)
    setPreviewOpen(true)
  }, [])

  const openHistory = useCallback((t: DocumentTemplate) => {
    setHistoryTemplate(t)
    setHistoryOpen(true)
  }, [])

  const handleClone = useCallback(async (t: DocumentTemplate) => {
    setBusyId(t.id)
    try {
      await safeToast(
        apiPost("/api/onboarding-documents", {
          name: `${t.name} (Copy)`,
          code: `${t.code}_COPY_${Math.floor(Math.random() * 1000)}`,
          documentType: t.documentType,
          scopeType: t.scopeType,
          language: t.language,
          status: "Draft",
          isDefault: false,
          version: 1,
          headerHtml: t.headerHtml,
          bodyHtml: t.bodyHtml,
          footerHtml: t.footerHtml,
          variablesUsed: t.variablesUsed,
          effectiveFrom: t.effectiveFrom ? t.effectiveFrom.slice(0, 10) : null,
          effectiveTo: t.effectiveTo ? t.effectiveTo.slice(0, 10) : null,
        }),
        "Template cloned",
        "Failed to clone template",
      )
      reload()
    } catch {
      // safeToast handles
    } finally {
      setBusyId(null)
    }
  }, [reload])

  const handleSetDefault = useCallback(async (t: DocumentTemplate) => {
    if (t.isDefault) return
    setBusyId(t.id)
    try {
      await safeToast(
        apiPatch(`/api/onboarding-documents/${t.id}`, {
          isDefault: true,
          documentType: t.documentType,
        }),
        `Set as default for ${t.documentType}`,
        "Failed to set default",
      )
      reload()
    } catch {
      // safeToast handles
    } finally {
      setBusyId(null)
    }
  }, [reload])

  const handleToggleStatus = useCallback(async (t: DocumentTemplate) => {
    const next = t.status === "Active" ? "Archived" : "Active"
    setBusyId(t.id)
    try {
      await safeToast(
        apiPatch(`/api/onboarding-documents/${t.id}`, { status: next }),
        next === "Active" ? "Template published" : "Template deactivated",
        "Failed to update status",
      )
      reload()
    } catch {
      // safeToast handles
    } finally {
      setBusyId(null)
    }
  }, [reload])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await safeToast(
        apiDelete(`/api/onboarding-documents/${deleteTarget.id}`),
        "Template deleted",
        "Failed to delete template",
      )
      setDeleteOpen(false)
      setDeleteTarget(null)
      reload()
    } catch {
      // safeToast handles
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, reload])

  const rowActions: RowActionsCallbacks = {
    onEdit: openEdit,
    onClone: handleClone,
    onPreview: openPreview,
    onSetDefault: handleSetDefault,
    onToggleStatus: handleToggleStatus,
    onVersionHistory: openHistory,
    onDelete: (t) => {
      if (t.isDefault) {
        toast.error("Cannot delete the default template — assign default to another template first.")
        return
      }
      setDeleteTarget(t)
      setDeleteOpen(true)
    },
  }

  const activeCategoryDef = CATEGORIES.find((c) => c.label === activeCategory)
  const activeIcon: LucideIcon = activeCategoryDef?.icon ?? Layers2

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Document Library"
          description="Reusable document templates for offer letters, agreements, and declarations."
          icon={FileText}
          badge={
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              {stats.total} template{stats.total !== 1 ? "s" : ""}
            </Badge>
          }
          actions={
            <Button
              size="sm"
              onClick={openCreate}
              className="gap-1.5 gradient-emerald text-primary-foreground shadow-soft"
            >
              <Plus className="h-4 w-4" /> New Template
            </Button>
          }
        />

        {/* Stat strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Templates" value={stats.total} icon={FileText} accent="emerald" />
          <StatCard label="Active" value={stats.active} icon={FileCheck2} accent="cyan" />
          <StatCard label="Defaults" value={stats.defaults} icon={Star} accent="amber" sub="One per type" />
          <StatCard label="Drafts" value={stats.drafts} icon={PenLine} accent="fuchsia" />
        </div>

        {/* Error banner */}
        {error && !loading && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/5 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <Inbox className="h-4 w-4 shrink-0" />
            <span>Failed to load templates: {error}</span>
            <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={reload}>
              <RotateCcw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          {/* LEFT: categories sidebar */}
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-xl border border-border/60 bg-card shadow-soft p-2">
              <div className="px-2 py-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Categories
                </span>
                <span className="text-[10px] text-muted-foreground/70">{CATEGORIES.length}</span>
              </div>
              <ScrollArea className="h-[calc(100vh-280px)] min-h-[300px]">
                <div className="space-y-0.5 pr-1">
                  <CategoryPill
                    icon={Layers2}
                    label={ALL_DOCS}
                    count={stats.total}
                    active={activeCategory === ALL_DOCS}
                    onClick={() => setActiveCategory(ALL_DOCS)}
                  />
                  <Separator className="my-1.5 bg-border/40" />
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon
                    return (
                      <CategoryPill
                        key={c.label}
                        icon={Icon}
                        label={c.label}
                        count={categoryCounts[c.label] || 0}
                        active={activeCategory === c.label}
                        onClick={() => setActiveCategory(c.label)}
                      />
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </aside>

          {/* RIGHT: templates list */}
          <section className="flex flex-col gap-3 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  {React.createElement(activeIcon, { className: "h-4 w-4" })}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground truncate">{activeCategory}</h2>
                  <p className="text-xs text-muted-foreground">
                    {filteredRows.length} template{filteredRows.length !== 1 ? "s" : ""}
                    {search && ` matching "${search}"`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or code…"
                    className="pl-9 h-9 bg-background"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={openCreate}
                  className="gap-1.5 gradient-emerald text-primary-foreground shadow-soft shrink-0"
                >
                  <Plus className="h-4 w-4" /> New Template
                </Button>
              </div>
            </div>

            {/* Table or empty state */}
            {loading ? (
              <TableSkeleton />
            ) : filteredRows.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-card">
                <EmptyState
                  icon={activeCategory === ALL_DOCS ? FileText : activeIcon}
                  title={
                    search
                      ? "No templates match your search"
                      : `No templates in ${activeCategory} yet`
                  }
                  description={
                    search
                      ? `Try a different search term, or clear the search to see all templates in ${activeCategory}.`
                      : `Create a ${activeCategory} template to standardize this document across your organization.`
                  }
                  action={
                    <div className="flex items-center gap-2">
                      {search && (
                        <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                          Clear search
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={openCreate}
                        className="gap-1.5 gradient-emerald text-primary-foreground"
                      >
                        <Plus className="h-4 w-4" /> Create Template
                      </Button>
                    </div>
                  }
                />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCategory + search}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  <TemplatesTable
                    rows={filteredRows}
                    loading={false}
                    onRowClick={openEdit}
                    actions={rowActions}
                  />
                </motion.div>
              </AnimatePresence>
            )}

            {/* Footer note */}
            <p className="text-[11px] text-muted-foreground/70 px-1">
              <Sparkles className="inline h-3 w-3 mr-1 text-emerald-500" />
              Click a row to edit. Use the actions menu to clone, preview, set as default, or delete.
              {busyId && <span className="text-amber-600 dark:text-amber-400 ml-1">· Working…</span>}
            </p>
          </section>
        </div>

        {/* Editor dialog */}
        <TemplateEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          template={editingTemplate}
          defaultCategory={activeCategory === ALL_DOCS ? "Offer Letter" : activeCategory}
          onSaved={reload}
        />

        {/* Standalone preview dialog (from row action) */}
        <PreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          template={previewTemplate}
        />

        {/* Version history dialog */}
        <VersionHistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          template={historyTemplate}
        />

        {/* Delete confirmation */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-rose-500" />
                Delete template?
              </AlertDialogTitle>
              <AlertDialogDescription>
                You are about to permanently delete <strong className="text-foreground">{deleteTarget?.name}</strong>{" "}
                (<code className="text-xs font-mono">{deleteTarget?.code}</code>).
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Delete Template
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}

export default DocumentsSection
