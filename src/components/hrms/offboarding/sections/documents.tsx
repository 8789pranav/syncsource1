"use client"

// ============================================================================
//  DocumentsSection — Offboarding Document Library (spec #14)
//  Reusable templates for relieving / experience / NDC / FnF / termination
//  letters. Reuses the shared <SectionedRichEditor> + <SlugPalette> from the
//  onboarding module, seeded with offboarding data and rose-themed.
// ----------------------------------------------------------------------------

import * as React from "react"
import { useMemo, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  FileText, FileCheck2, ScrollText, Award, ShieldX, CheckSquare, Wallet,
  IndianRupee, ClipboardList, Users2, FileBox, Layers2,
  Search, Plus, Pencil, Copy, Trash2, Star, Eye,
  Save, X, Braces, ChevronDown, Inbox, PenLine, FileCode2, Sparkles,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import type { ExitDocumentTemplate, ScopeType } from "@/components/hrms/offboarding/shared"
import { EXIT_DOCUMENT_TEMPLATES } from "@/components/hrms/offboarding/data"
import { formatDate, timeAgo, STATUS_COLORS } from "@/components/hrms/offboarding/shared"
import {
  SectionedRichEditor, type RichEditorHandle, type EditorSection,
} from "@/components/hrms/onboarding/rich-editor"
import {
  SlugPalette, SlugUsageSummary, extractVariables, substituteVariables,
} from "@/components/hrms/onboarding/slug-catalog"

// ---------- Constants — 11 document categories from spec #14 ----------
interface CategoryDef { label: string; icon: LucideIcon }
const CATEGORIES: CategoryDef[] = [
  { label: "Resignation Acceptance Letter", icon: FileText },
  { label: "Relieving Letter", icon: FileCheck2 },
  { label: "Experience Letter", icon: ScrollText },
  { label: "Service Certificate", icon: Award },
  { label: "Termination Letter", icon: ShieldX },
  { label: "No Dues Certificate", icon: CheckSquare },
  { label: "FnF Settlement Letter", icon: Wallet },
  { label: "Recovery Letter", icon: IndianRupee },
  { label: "Exit Interview Form", icon: ClipboardList },
  { label: "Alumni Welcome Letter", icon: Users2 },
  { label: "Custom Exit Document", icon: FileBox },
]
const ALL_DOCS = "All Documents"

const SCOPE_TYPES: { value: ScopeType; label: string }[] = [
  { value: "Tenant Default", label: "Tenant (Org-wide)" },
  { value: "Entity", label: "Entity" },
  { value: "Branch", label: "Branch" },
  { value: "Location", label: "Location" },
  { value: "Department", label: "Department" },
  { value: "Grade", label: "Grade" },
  { value: "Employee Type", label: "Employee Type" },
  { value: "Exit Type", label: "Exit Type" },
]
const STATUS_OPTIONS = ["Draft", "Active", "Published"] as const
const LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Marathi", "Bengali", "Gujarati"]

// ---------- Helpers ----------
function toCode(name: string): string {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40)
}

function defaultTemplateBody(category: string): string {
  const head = `<div style="font-family: Arial, sans-serif; color: #1f2937; padding: 24px;">\n`
  const foot = `\n</div>`
  switch (category) {
    case "Relieving Letter":
      return `${head}<h2 style="color:#9f1239;text-align:center;">Relieving Letter</h2>
<p style="text-align:right;">Date: {{LetterDate}}</p>
<p>Dear {{EmployeeName}},</p>
<p>This is to formally confirm that you have been relieved from your duties as <strong>{{Designation}}</strong> in the <strong>{{Department}}</strong> department at <strong>{{CompanyName}}</strong>, with effect from <strong>{{LastWorkingDay}}</strong>.</p>
<p>We thank you for your contributions during your tenure from {{DateOfJoining}} to {{LastWorkingDay}} and wish you success in your future endeavors.</p>
<p>Yours sincerely,<br/><strong>{{AuthorizedSignatory}}</strong><br/>{{CompanyName}}</p>${foot}`
    case "Experience Letter":
      return `${head}<h2 style="color:#9f1239;text-align:center;">Certificate of Experience</h2>
<p style="text-align:right;">Date: {{LetterDate}}</p>
<p>To Whom It May Concern,</p>
<p>This is to certify that <strong>{{EmployeeName}}</strong> (Employee Code: {{EmployeeCode}}) was employed with <strong>{{CompanyName}}</strong> from <strong>{{DateOfJoining}}</strong> to <strong>{{LastWorkingDay}}</strong>, holding the position of <strong>{{Designation}}</strong>.</p>
<p>For {{CompanyName}},<br/><strong>{{AuthorizedSignatory}}</strong></p>${foot}`
    case "Resignation Acceptance Letter":
      return `${head}<h2 style="color:#9f1239;">Resignation Acceptance</h2>
<p>Dear {{EmployeeName}},</p>
<p>We acknowledge receipt of your resignation dated {{ResignationDate}}. Your resignation has been accepted and your last working day will be <strong>{{LastWorkingDay}}</strong>.</p>
<p>Please complete the clearance process as per company policy.</p>
<p>Regards,<br/>{{HRName}}<br/>{{CompanyName}}</p>${foot}`
    case "No Dues Certificate":
      return `${head}<h2 style="color:#9f1239;text-align:center;">No Dues Certificate</h2>
<p>This is to certify that <strong>{{EmployeeName}}</strong> ({{EmployeeCode}}) has cleared all dues payable to <strong>{{CompanyName}}</strong> as on {{LetterDate}}.</p>
<p>For {{CompanyName}},<br/><strong>{{AuthorizedSignatory}}</strong></p>${foot}`
    case "FnF Settlement Letter":
      return `${head}<h2 style="color:#9f1239;">Full &amp; Final Settlement</h2>
<p>Dear {{EmployeeName}},</p>
<p>Your Full &amp; Final settlement has been processed. The details are as follows:</p>
<p><strong>Net Payable:</strong> {{FnFAmount}}<br/><strong>Recovery Amount:</strong> {{RecoveryAmount}}</p>
<p>Regards,<br/>{{HRName}}<br/>{{CompanyName}}</p>${foot}`
    case "Termination Letter":
      return `${head}<h2 style="color:#9f1239;">Notice of Termination</h2>
<p>Dear {{EmployeeName}},</p>
<p>This letter is to inform you that your employment with {{CompanyName}} is being terminated effective <strong>{{LastWorkingDay}}</strong> due to {{ExitReason}}.</p>
<p>Please return all company property and complete the clearance process.</p>
<p>Regards,<br/>{{HRName}}</p>${foot}`
    default:
      return `${head}<h2 style="color:#9f1239;">${category}</h2>
<p>Dear {{EmployeeName}},</p>
<p>This document is generated from the <strong>${category}</strong> template.</p>
<p>Issued on {{LetterDate}} by {{CompanyName}}.</p>${foot}`
  }
}

// ---------- Small UI atoms ----------
function StatCard({ icon, label, value, accent, tint }: {
  icon: React.ReactNode; label: string; value: number | string; accent: string; tint: string
}) {
  return (
    <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ backgroundColor: tint, color: accent }}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function VariablesBadge({ count }: { count: number }) {
  if (!count) return <span className="text-[10px] text-muted-foreground/60 italic">No slugs</span>
  return (
    <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300 font-medium border-0">
      <Braces className="h-3 w-3 mr-1" />
      {count} slug{count !== 1 ? "s" : ""}
    </Badge>
  )
}

function CategoryPill({ icon: Icon, label, count, active, onClick }: {
  icon: React.ComponentType<{ className?: string }>; label: string; count: number; active: boolean; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn(
        "group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-transparent",
        active ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
               : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}>
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground/80")} />
      <span className="flex-1 text-left truncate">{label}</span>
      <span className={cn(
        "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums",
        active ? "bg-rose-500/20 text-rose-700 dark:text-rose-300" : "bg-muted text-muted-foreground",
      )}>{count}</span>
    </button>
  )
}

// ---------- Preview Dialog (renders HTML with sample substitution) ----------
function PreviewDialog({ open, onOpenChange, template }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  template: { name?: string; headerHtml?: string; bodyHtml?: string; footerHtml?: string } | null
}) {
  if (!template) return null
  const header = substituteVariables(template.headerHtml || "")
  const body = substituteVariables(template.bodyHtml || "")
  const footer = substituteVariables(template.footerHtml || "")
  const combined = `<html><head><meta charset="utf-8" /><style>
    body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; padding: 32px; }
    .doc-header { border-bottom: 2px solid #9f1239; padding-bottom: 12px; margin-bottom: 16px; }
    .doc-footer { border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 24px; font-size: 11px; color: #64748b; }
    .doc-body { min-height: 60vh; } h1, h2, h3 { color: #9f1239; }
    table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #e5e7eb; padding: 6px 10px; }
  </style></head><body>
    ${header ? `<div class="doc-header">${header}</div>` : ""}
    <div class="doc-body">${body}</div>
    ${footer ? `<div class="doc-footer">${footer}</div>` : ""}
  </body></html>`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            Preview · {template.name || "Untitled Template"}
          </DialogTitle>
          <DialogDescription>
            Rendered HTML with sample variable substitution (e.g. <code>{"{{EmployeeName}}"}</code> → "Aarav Sharma").
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border/60 overflow-hidden bg-white">
          <iframe title="Document Preview" srcDoc={combined} className="w-full h-[60vh] bg-white" sandbox="allow-same-origin" />
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Template Editor Dialog ----------
function TemplateEditorDialog({ open, onOpenChange, template, defaultCategory, onSave }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  template: ExitDocumentTemplate | null
  defaultCategory: string
  onSave: (tpl: ExitDocumentTemplate) => void
}) {
  const isEdit = !!template
  // Initialize state directly from the template prop (lazy initializers).
  // The parent forces a remount via the `key` prop whenever the template changes,
  // so these only run once per editing session — no useEffect needed.
  const [name, setName] = useState(template?.name || "")
  const [code, setCode] = useState(template?.code || "")
  const [codeTouched, setCodeTouched] = useState(!!template)
  const [documentType, setDocumentType] = useState(template?.documentType || defaultCategory)
  const [scopeType, setScopeType] = useState<ScopeType>(template?.scopeType || "Tenant Default")
  const [entity, setEntity] = useState(template?.entity || "")
  const [language, setLanguage] = useState(template?.language || "English")
  const [status, setStatus] = useState<typeof STATUS_OPTIONS[number]>(template?.status || "Draft")
  const [isDefault, setIsDefault] = useState(template?.isDefault || false)
  const [version, setVersion] = useState(template?.version || 1)
  const [effectiveFrom, setEffectiveFrom] = useState("")
  const [effectiveTo, setEffectiveTo] = useState("")
  const [header, setHeader] = useState(template?.headerHtml || "")
  const [body, setBody] = useState(template?.bodyHtml || (template ? "" : defaultTemplateBody(defaultCategory)))
  const [footer, setFooter] = useState(template?.footerHtml || "")
  const [previewOpen, setPreviewOpen] = useState(false)

  const editorRef = useRef<RichEditorHandle | null>(null)

  // When the user types a name and hasn't manually edited the code, auto-generate it.
  const handleNameChange = (v: string) => {
    setName(v)
    if (!codeTouched) setCode(toCode(v))
  }

  // Variables used across all sections
  const usedVariables = useMemo(
    () => extractVariables(`${header}${body}${footer}`),
    [header, body, footer],
  )

  const insertVariable = useCallback((slug: string) => {
    editorRef.current?.insertSlug(slug)
    toast.info(`Inserted {{${slug}}}`)
  }, [])

  const handleSectionChange = useCallback((section: EditorSection, value: string) => {
    if (section === "header") setHeader(value)
    else if (section === "body") setBody(value)
    else setFooter(value)
  }, [])

  const handleSave = () => {
    if (!name.trim()) return toast.error("Template name is required")
    if (!code.trim()) return toast.error("Template code is required")
    if (!documentType) return toast.error("Document type is required")
    if (!body.trim()) return toast.error("Body HTML is required — every template needs content.")
    const now = new Date().toISOString()
    onSave({
      id: template?.id || `dt-${Date.now()}`,
      name: name.trim(), code: code.trim(), documentType, scopeType,
      entity: entity.trim() || undefined, language, version, status, isDefault,
      headerHtml: header || undefined, bodyHtml: body, footerHtml: footer || undefined,
      createdAt: template?.createdAt || now, updatedAt: now,
    })
    onOpenChange(false)
  }

  const previewTemplate = { name, headerHtml: header, bodyHtml: body, footerHtml: footer }

  const lbl = "text-[10px] font-medium text-muted-foreground uppercase tracking-wide"

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton
          className="sm:max-w-6xl max-w-[calc(100%-2rem)] w-full h-[92vh] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b border-border/60 space-y-1">
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              {isEdit ? "Edit Template" : "New Document Template"}
              {isEdit && template && (
                <Badge variant="secondary" className="bg-muted text-muted-foreground font-mono text-[11px] ml-1">v{template.version}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? `Editing "${template?.name}". Slug variables are auto-detected and listed on the right.`
                : "Configure the template metadata, write the HTML content, and insert slugs from the right panel."}
            </DialogDescription>
          </DialogHeader>

          {/* Body — scrollable, editor-first layout with explicit min-heights on each pane */}
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
            {/* Top metadata bar */}
            <div className="border-b border-border/60 bg-muted/20 px-4 py-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="col-span-2 sm:col-span-1 lg:col-span-2">
                  <Label htmlFor="tpl-name" className={lbl}>Name <span className="text-rose-500">*</span></Label>
                  <Input id="tpl-name" value={name} onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Standard Relieving Letter — India" className="mt-0.5 h-8 text-sm bg-background" />
                </div>
                <div>
                  <Label htmlFor="tpl-code" className={lbl}>Code <span className="text-rose-500">*</span></Label>
                  <Input id="tpl-code" value={code}
                    onChange={(e) => { setCode(e.target.value); setCodeTouched(true) }}
                    placeholder="RELIEVE_INDIA" className="mt-0.5 h-8 text-xs font-mono bg-background" />
                </div>
                <div>
                  <Label className={lbl}>Type <span className="text-rose-500">*</span></Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="mt-0.5 h-8 text-sm bg-background w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.label} value={c.label}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={lbl}>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="mt-0.5 h-8 text-sm bg-background w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={lbl}>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as typeof STATUS_OPTIONS[number])}>
                    <SelectTrigger className="mt-0.5 h-8 text-sm bg-background w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Collapsible extra details */}
              <details className="mt-2 group">
                <summary className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground select-none list-none">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                  More details (scope, entity, version, effective dates, default)
                </summary>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 items-end">
                  <div>
                    <Label className={lbl}>Scope</Label>
                    <Select value={scopeType} onValueChange={(v) => setScopeType(v as ScopeType)}>
                      <SelectTrigger className="mt-0.5 h-8 text-sm bg-background w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>{SCOPE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tpl-entity" className={lbl}>Entity</Label>
                    <Input id="tpl-entity" value={entity} onChange={(e) => setEntity(e.target.value)}
                      placeholder="ACME India Pvt Ltd" className="mt-0.5 h-8 text-sm bg-background" />
                  </div>
                  <div>
                    <Label htmlFor="tpl-version" className={lbl}>Version</Label>
                    <Input id="tpl-version" type="number" min={1} value={version}
                      onChange={(e) => setVersion(Math.max(1, Number(e.target.value) || 1))}
                      className="mt-0.5 h-8 text-sm bg-background" />
                  </div>
                  <div>
                    <Label htmlFor="tpl-from" className={lbl}>Effective From</Label>
                    <Input id="tpl-from" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)}
                      className="mt-0.5 h-8 text-sm bg-background" />
                  </div>
                  <div>
                    <Label htmlFor="tpl-to" className={lbl}>Effective To</Label>
                    <Input id="tpl-to" type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)}
                      className="mt-0.5 h-8 text-sm bg-background" />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-between rounded-md border border-border/60 px-3 py-1.5 bg-background h-8">
                    <Label htmlFor="tpl-default" className="text-[10px] font-medium cursor-pointer">Default</Label>
                    <Switch id="tpl-default" checked={isDefault} onCheckedChange={setIsDefault} />
                  </div>
                </div>
              </details>
            </div>

            {/* Slug usage strip */}
            {usedVariables.length > 0 && (
              <div className="px-4 py-1.5 border-b border-border/60 bg-cyan-500/5">
                <SlugUsageSummary used={usedVariables} />
              </div>
            )}

            {/* Main 2-pane area: editor (hero) + slug palette */}
            <div className="flex-1 min-h-[520px] flex flex-col lg:flex-row">
              {/* LEFT: WYSIWYG editor */}
              <div className="flex-1 min-w-0 p-3 flex flex-col min-h-[460px]">
                <div className="flex items-center gap-1.5 mb-1.5 px-0.5 shrink-0">
                  <FileCode2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Template Content</span>
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[9px] bg-rose-500/10 text-rose-700 dark:text-rose-300 border-0">Header · Body · Footer</Badge>
                </div>
                <div className="flex-1 min-h-[400px]">
                  <SectionedRichEditor ref={editorRef} header={header} body={body} footer={footer}
                    onChange={handleSectionChange} initialSection="body" minHeight={320} />
                </div>
              </div>

              {/* RIGHT: shared slug library */}
              <div className="lg:w-[320px] xl:w-[340px] shrink-0 min-w-0 flex flex-col min-h-[480px] border-t lg:border-t-0 lg:border-l border-border/60">
                <SlugPalette onInsert={insertVariable} usedVariables={usedVariables} context="document" title="Slug Library" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-3 border-t border-border/60 bg-muted/20">
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} disabled={!body} className="gap-1.5">
                <Eye className="h-4 w-4" /> Preview
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} className="gap-1.5 gradient-rose text-primary-foreground">
                <Save className="h-4 w-4" />
                {isEdit ? "Save Changes" : "Create Template"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} template={previewTemplate} />
    </>
  )
}

// ---------- Templates table ----------
function TemplatesTable({ rows, onRowClick, actions }: {
  rows: ExitDocumentTemplate[]
  onRowClick: (t: ExitDocumentTemplate) => void
  actions: {
    onEdit: (t: ExitDocumentTemplate) => void
    onClone: (t: ExitDocumentTemplate) => void
    onPreview: (t: ExitDocumentTemplate) => void
    onDelete: (t: ExitDocumentTemplate) => void
  }
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium text-foreground">No templates match</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different category or clear the search.</p>
        </div>
      </div>
    )
  }
  const th = "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className={cn(th, "min-w-[220px]")}>Template Name</TableHead>
              <TableHead className={th}>Document Type</TableHead>
              <TableHead className={th}>Scope</TableHead>
              <TableHead className={th}>Entity</TableHead>
              <TableHead className={th}>Lang</TableHead>
              <TableHead className={th}>Ver</TableHead>
              <TableHead className={th}>Default</TableHead>
              <TableHead className={th}>Status</TableHead>
              <TableHead className={th}>Updated</TableHead>
              <TableHead className={cn(th, "text-right")}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => {
              const statusColor = STATUS_COLORS[t.status] || "#94a3b8"
              return (
                <TableRow key={t.id} onClick={() => onRowClick(t)}
                  className="cursor-pointer hover:bg-rose-50/40 dark:hover:bg-rose-950/10 transition-colors">
                  <TableCell className="text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground truncate max-w-[260px]">{t.name}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-foreground/80">{t.code}</code>
                        <VariablesBadge count={extractVariables(`${t.headerHtml || ""}${t.bodyHtml || ""}${t.footerHtml || ""}`).length} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-0 font-medium">{t.documentType}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.scopeType}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.entity || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.language}</TableCell>
                  <TableCell><Badge variant="outline" className="font-mono text-[11px]">v{t.version}</Badge></TableCell>
                  <TableCell>
                    {t.isDefault ? (
                      <Tooltip><TooltipTrigger asChild><span><Star className="h-4 w-4 fill-amber-400 text-amber-500" /></span></TooltipTrigger>
                        <TooltipContent>Default for {t.documentType}</TooltipContent></Tooltip>
                    ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${statusColor}1a`, color: statusColor }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                      {t.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(t.updatedAt)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => actions.onEdit(t)} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                      </TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => actions.onPreview(t)} aria-label="Preview"><Eye className="h-3.5 w-3.5" /></Button>
                      </TooltipTrigger><TooltipContent>Preview</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => actions.onClone(t)} aria-label="Clone"><Copy className="h-3.5 w-3.5" /></Button>
                      </TooltipTrigger><TooltipContent>Clone</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                          onClick={() => actions.onDelete(t)} disabled={t.isDefault} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TooltipTrigger><TooltipContent>{t.isDefault ? "Default — cannot delete" : "Delete"}</TooltipContent></Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ============================================================================
//  Main section
// ============================================================================
export function DocumentsSection() {
  const [templates, setTemplates] = useState<ExitDocumentTemplate[]>(EXIT_DOCUMENT_TEMPLATES)
  const [activeCategory, setActiveCategory] = useState<string>(ALL_DOCS)
  const [search, setSearch] = useState("")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ExitDocumentTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<ExitDocumentTemplate | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ExitDocumentTemplate | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of CATEGORIES) m[c.label] = 0
    for (const t of templates) m[t.documentType] = (m[t.documentType] ?? 0) + 1
    return m
  }, [templates])

  const stats = useMemo(() => {
    const active = templates.filter((t) => t.status === "Published" || t.status === "Active").length
    const drafts = templates.filter((t) => t.status === "Draft").length
    const defaults = templates.filter((t) => t.isDefault).length
    return { total: templates.length, active, drafts, defaults }
  }, [templates])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return templates.filter((t) => {
      if (activeCategory !== ALL_DOCS && t.documentType !== activeCategory) return false
      if (q) {
        return (
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          (t.entity?.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
  }, [templates, activeCategory, search])

  // Actions
  const openCreate = useCallback(() => { setEditingTemplate(null); setEditorOpen(true) }, [])
  const openEdit = useCallback((t: ExitDocumentTemplate) => { setEditingTemplate(t); setEditorOpen(true) }, [])
  const openPreview = useCallback((t: ExitDocumentTemplate) => { setPreviewTemplate(t); setPreviewOpen(true) }, [])

  const handleSave = useCallback((tpl: ExitDocumentTemplate) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === tpl.id)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = tpl
        toast.success(`Template "${tpl.name}" updated`)
        return next
      }
      toast.success(`Template "${tpl.name}" created`)
      return [tpl, ...prev]
    })
  }, [])

  const handleClone = useCallback((t: ExitDocumentTemplate) => {
    const clone: ExitDocumentTemplate = {
      ...t, id: `dt-${Date.now()}`, name: `${t.name} (Copy)`, code: `${t.code}_COPY`,
      isDefault: false, version: 1, status: "Draft",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    setTemplates((prev) => [clone, ...prev])
    toast.success(`Cloned "${t.name}" as "${clone.name}"`)
  }, [])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id))
    toast.success(`Template "${deleteTarget.name}" deleted`)
    setDeleteOpen(false); setDeleteTarget(null)
  }, [deleteTarget])

  const rowActions = { onEdit: openEdit, onClone: handleClone, onPreview: openPreview,
    onDelete: (t: ExitDocumentTemplate) => {
      if (t.isDefault) { toast.error("Cannot delete the default template — assign default to another template first."); return }
      setDeleteTarget(t); setDeleteOpen(true)
    } }

  const activeCategoryDef = CATEGORIES.find((c) => c.label === activeCategory)
  const activeIcon: LucideIcon = activeCategoryDef?.icon ?? Layers2

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-4">
        {/* Section header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl gradient-rose text-primary-foreground shadow-soft">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Document Library</h2>
              <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
                Reusable exit document templates — relieving, experience, NDC, FnF, termination, and more.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
              {stats.total} template{stats.total !== 1 ? "s" : ""}
            </Badge>
            <Button size="sm" onClick={openCreate} className="gap-1.5 gradient-rose text-primary-foreground shadow-soft">
              <Plus className="h-4 w-4" /> New Template
            </Button>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Templates" value={stats.total} icon={<FileText className="h-4 w-4" />} accent="#9f1239" tint="#fff1f2" />
          <StatCard label="Active / Published" value={stats.active} icon={<FileCheck2 className="h-4 w-4" />} accent="#10b981" tint="#ecfdf5" />
          <StatCard label="Defaults" value={stats.defaults} icon={<Star className="h-4 w-4" />} accent="#f59e0b" tint="#fffbeb" />
          <StatCard label="Drafts" value={stats.drafts} icon={<PenLine className="h-4 w-4" />} accent="#8b5cf6" tint="#f5f3ff" />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          {/* LEFT: categories sidebar */}
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <Card className="bg-card border border-border/60 rounded-xl shadow-sm p-2">
              <CardContent className="p-0">
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Categories</span>
                  <span className="text-[10px] text-muted-foreground/70">{CATEGORIES.length}</span>
                </div>
                <ScrollArea className="h-[calc(100vh-280px)] min-h-[300px]">
                  <div className="space-y-0.5 pr-1">
                    <CategoryPill icon={Layers2} label={ALL_DOCS} count={stats.total}
                      active={activeCategory === ALL_DOCS} onClick={() => setActiveCategory(ALL_DOCS)} />
                    <Separator className="my-1.5 bg-border/40" />
                    {CATEGORIES.map((c) => (
                      <CategoryPill key={c.label} icon={c.icon} label={c.label}
                        count={categoryCounts[c.label] || 0}
                        active={activeCategory === c.label}
                        onClick={() => setActiveCategory(c.label)} />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          {/* RIGHT: templates list */}
          <section className="flex flex-col gap-3 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
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
                  <Input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, code, entity…" className="pl-9 h-9 bg-background" />
                  {search && (
                    <button type="button" onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"><X className="h-3.5 w-3.5" /></button>
                  )}
                </div>
                <Button size="sm" onClick={openCreate} className="gap-1.5 gradient-rose text-primary-foreground shadow-soft shrink-0">
                  <Plus className="h-4 w-4" /> New Template
                </Button>
              </div>
            </div>

            {/* Table */}
            <AnimatePresence mode="wait">
              <motion.div key={activeCategory + search}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                <TemplatesTable rows={filteredRows} onRowClick={openEdit} actions={rowActions} />
              </motion.div>
            </AnimatePresence>

            <p className="text-[11px] text-muted-foreground/70 px-1">
              <Sparkles className="inline h-3 w-3 mr-1 text-rose-500" />
              Click a row to edit. Use the actions menu to clone, preview, set as default, or delete.
            </p>
          </section>
        </div>

        {/* Editor dialog — `key` forces remount when switching between templates,
            which re-runs the lazy useState initializers and avoids the need for a
            sync-state-in-effect. */}
        <TemplateEditorDialog
          key={editingTemplate?.id || "new-doc-" + (activeCategory === ALL_DOCS ? "Relieving Letter" : activeCategory)}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          template={editingTemplate}
          defaultCategory={activeCategory === ALL_DOCS ? "Relieving Letter" : activeCategory}
          onSave={handleSave} />

        {/* Standalone preview dialog (from row action) */}
        <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} template={previewTemplate} />

        {/* Delete confirmation */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-rose-500" /> Delete template?
              </AlertDialogTitle>
              <AlertDialogDescription>
                You are about to permanently delete <strong className="text-foreground">{deleteTarget?.name}</strong>{" "}
                (<code className="text-xs font-mono">{deleteTarget?.code}</code>). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-white">
                <Trash2 className="h-4 w-4 mr-1" /> Delete Template
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}

export default DocumentsSection
