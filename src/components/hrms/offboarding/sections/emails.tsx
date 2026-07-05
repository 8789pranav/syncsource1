"use client"

// ============================================================================
//  EmailsSection — Offboarding Email Templates (spec #15)
//  Event-driven email content for every exit milestone — resignation,
//  clearance, asset return, FnF, letter generation, alumni. Reuses the shared
//  <SectionedRichEditor> + <SlugPalette> from the onboarding module, seeded
//  with offboarding data and rose-themed.
// ----------------------------------------------------------------------------

import * as React from "react"
import { useMemo, useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Mail, Bell, FileText, Send, CheckCircle2, XCircle, AlertTriangle,
  Clock, Package, Lock, Wallet, ClipboardList, Users,
  Plus, Search, Pencil, Copy, Star, Eye, Trash2, MoreHorizontal,
  Inbox, Code2, Sparkles, ChevronDown, X, AtSign, Type, Languages, Hash,
  Layers, Tag, PlayCircle, PartyPopper, Award, UserMinus,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

import type { ExitEmailTemplate, ScopeType } from "@/components/hrms/offboarding/shared"
import { EXIT_EMAIL_TEMPLATES } from "@/components/hrms/offboarding/data"
import { timeAgo, STATUS_COLORS } from "@/components/hrms/offboarding/shared"
import {
  SectionedRichEditor, type RichEditorHandle, type EditorSection,
} from "@/components/hrms/onboarding/rich-editor"
import {
  SlugPalette, SlugUsageSummary, extractVariables, substituteVariables,
} from "@/components/hrms/onboarding/slug-catalog"

// ============================================================================
//  Constants — 24 email event categories from spec #15
// ============================================================================
interface EventMeta {
  value: string
  icon: React.ComponentType<{ className?: string }>
  hint: string
}
const EVENT_CATEGORIES: EventMeta[] = [
  { value: "Resignation Submitted", icon: Send, hint: "Employee submitted resignation" },
  { value: "Manager Approval Pending", icon: Bell, hint: "Awaiting manager approval" },
  { value: "HR Approval Pending", icon: Bell, hint: "Awaiting HR approval" },
  { value: "Resignation Approved", icon: CheckCircle2, hint: "Resignation approved by HR" },
  { value: "Resignation Rejected", icon: XCircle, hint: "Resignation rejected" },
  { value: "Resignation Withdrawn", icon: UserMinus, hint: "Resignation withdrawn by employee" },
  { value: "Exit Process Initiated", icon: PlayCircle, hint: "Exit case created" },
  { value: "Notice Period Started", icon: Clock, hint: "Notice period has begun" },
  { value: "LWD Changed", icon: AlertTriangle, hint: "Last working day changed" },
  { value: "Clearance Task Assigned", icon: ClipboardList, hint: "New clearance task assigned" },
  { value: "Clearance Task Reminder", icon: Bell, hint: "Reminder for pending clearance task" },
  { value: "Clearance Task Overdue", icon: AlertTriangle, hint: "Clearance task overdue" },
  { value: "Asset Return Pending", icon: Package, hint: "Asset return reminder" },
  { value: "IT Revocation Pending", icon: Lock, hint: "IT access revocation pending" },
  { value: "Exit Interview Request", icon: FileText, hint: "Exit interview invitation" },
  { value: "Exit Interview Reminder", icon: Bell, hint: "Exit interview reminder" },
  { value: "FnF Inputs Pending", icon: Wallet, hint: "FnF inputs pending from owners" },
  { value: "FnF Calculated", icon: Wallet, hint: "FnF has been calculated" },
  { value: "FnF Approved", icon: CheckCircle2, hint: "FnF approved" },
  { value: "FnF Paid", icon: Wallet, hint: "FnF payment released" },
  { value: "Relieving Letter Generated", icon: FileText, hint: "Relieving letter ready" },
  { value: "Experience Letter Generated", icon: Award, hint: "Experience letter ready" },
  { value: "Employee Marked Exited", icon: UserMinus, hint: "Employee officially exited" },
  { value: "Alumni Profile Created", icon: PartyPopper, hint: "Alumni profile created" },
]

// ============================================================================
//  Recipient types — 14 from spec #15 (no indigo / blue)
// ============================================================================
interface RecipientMeta {
  type: string
  label: string
  chip: string
  dot: string
  needsValue: boolean
  valueLabel?: string
  valuePlaceholder?: string
  valueType?: "email" | "text"
}
const RECIPIENT_TYPES: RecipientMeta[] = [
  { type: "Employee", label: "Employee", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", dot: "bg-emerald-500", needsValue: false },
  { type: "Reporting Manager", label: "Reporting Manager", chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", dot: "bg-amber-500", needsValue: false },
  { type: "Manager of Manager", label: "Manager of Manager", chip: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300", dot: "bg-teal-500", needsValue: false },
  { type: "HR Owner", label: "HR Owner", chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300", dot: "bg-cyan-500", needsValue: false },
  { type: "Department Head", label: "Department Head", chip: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300", dot: "bg-violet-500", needsValue: false },
  { type: "IT Admin", label: "IT Admin", chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300", dot: "bg-rose-500", needsValue: false },
  { type: "Admin Team", label: "Admin Team", chip: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300", dot: "bg-slate-500", needsValue: false },
  { type: "Finance Admin", label: "Finance Admin", chip: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300", dot: "bg-orange-500", needsValue: false },
  { type: "Payroll Admin", label: "Payroll Admin", chip: "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300", dot: "bg-lime-500", needsValue: false },
  { type: "Asset Owner", label: "Asset Owner", chip: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300", dot: "bg-fuchsia-500", needsValue: false },
  { type: "Legal Team", label: "Legal Team", chip: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300", dot: "bg-pink-500", needsValue: false },
  { type: "Specific Role", label: "Specific Role", chip: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300", dot: "bg-slate-400", needsValue: true, valueLabel: "Role name", valuePlaceholder: "e.g. IT Support Lead", valueType: "text" },
  { type: "Specific Employee", label: "Specific Employee", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", dot: "bg-emerald-400", needsValue: true, valueLabel: "Employee name / ID", valuePlaceholder: "e.g. Aarav Sharma (EMP-0001)", valueType: "text" },
  { type: "Specific Email", label: "Specific Email", chip: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300", dot: "bg-slate-400", needsValue: true, valueLabel: "Email address", valuePlaceholder: "name@company.com", valueType: "email" },
]
const RECIPIENT_META: Record<string, RecipientMeta> = RECIPIENT_TYPES.reduce(
  (acc, r) => { acc[r.type] = r; return acc }, {} as Record<string, RecipientMeta>,
)

// ============================================================================
//  Other constants
// ============================================================================
const SCOPE_TYPES: { value: ScopeType; label: string }[] = [
  { value: "Tenant Default", label: "Tenant (Global)" },
  { value: "Entity", label: "Entity" },
  { value: "Branch", label: "Branch" },
  { value: "Department", label: "Department" },
  { value: "Exit Type", label: "Exit Type" },
]
const LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Marathi", "Bengali"]
const STATUS_OPTIONS = ["Active", "Draft"] as const

function EventIconView({ eventType, className }: { eventType: string; className?: string }) {
  const Icon = EVENT_CATEGORIES.find((e) => e.value === eventType)?.icon || Mail
  return <Icon className={className} />
}

// ============================================================================
//  Email preview (mini email client card)
// ============================================================================
function EmailPreview({ subject, html, fromEmail, toLabels }: {
  subject: string; html: string; fromEmail: string; toLabels: string
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background overflow-hidden shadow-soft max-w-3xl">
      <div className="px-4 py-2 bg-muted/60 border-b border-border/60 flex items-center gap-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="text-xs text-muted-foreground ml-2">Email Preview</span>
      </div>
      <div className="px-4 py-3 border-b border-border/60">
        <div className="text-sm font-semibold text-foreground">{subject || "(no subject)"}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="font-medium text-foreground/70">From:</span><span>{fromEmail || "hr@acme.com"}</span></span>
          <span className="inline-flex items-center gap-1"><span className="font-medium text-foreground/70">To:</span><span>{toLabels || "Employee"}</span></span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /><span>just now</span></span>
        </div>
      </div>
      <div className="px-5 py-4 text-sm leading-relaxed text-foreground/90"
        dangerouslySetInnerHTML={{ __html: html || "<p class='text-muted-foreground italic'>(empty body)</p>" }} />
    </div>
  )
}

// ============================================================================
//  Standalone preview dialog (opens from row action)
// ============================================================================
function PreviewDialog({ template, onOpenChange }: {
  template: ExitEmailTemplate | null; onOpenChange: (o: boolean) => void
}) {
  const subject = template ? substituteVariables(template.subject) : ""
  const html = template ? substituteVariables(`${template.headerHtml || ""}\n${template.bodyHtml || ""}\n${template.footerHtml || ""}`) : ""
  const toLabels = template ? (template.recipients || []).map((r) => RECIPIENT_META[r]?.label || r).join(", ") : "Employee"
  const used = template ? extractVariables(`${template.subject}\n${template.headerHtml || ""}\n${template.bodyHtml || ""}\n${template.footerHtml || ""}`) : []
  return (
    <Dialog open={!!template} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[calc(100%-2rem)] max-h-[90vh] p-0 gap-0 overflow-hidden">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
          className="px-5 py-3.5 border-b border-border/60 flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            {template ? <EventIconView eventType={template.eventType} className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-semibold truncate">{template?.name}</DialogTitle>
            <DialogDescription className="text-xs">{template?.code} · {template?.eventType} · {template?.language}</DialogDescription>
          </div>
          <div className="flex items-center gap-1.5">
            {template?.isDefault && <Badge className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><Star className="h-3 w-3 fill-current" /> Default</Badge>}
            {template?.status && <Badge variant="outline" className="border-current/30">{template.status}</Badge>}
          </div>
        </motion.div>
        <ScrollArea className="flex-1 max-h-[calc(90vh-80px)]">
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                { l: "Scope", v: template?.scopeType || "—" },
                { l: "Version", v: `v${template?.version || 1}` },
                { l: "Recipients", v: `${(template?.recipients || []).length} To` },
                { l: "CC", v: `${(template?.cc || []).length}` },
              ].map((m) => (
                <div key={m.l}>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{m.l}</div>
                  <div className="text-sm text-foreground/90 truncate">{m.v}</div>
                </div>
              ))}
            </div>
            <EmailPreview subject={subject} html={html} fromEmail="hr@acme.com" toLabels={toLabels} />
            {used.length > 0 && (
              <div className="rounded-lg border border-border/60 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Variables Used</div>
                <div className="flex flex-wrap gap-1">
                  {used.map((v) => <code key={v} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-foreground/70">{`{{${v}}}`}</code>)}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Field wrapper for the editor dialog
// ============================================================================
function Field({ label, required, icon: Icon, children }: {
  label: string; required?: boolean; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
        {label}{required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  )
}

// ============================================================================
//  Recipient row (To / CC) — multi-select chips
// ============================================================================
function RecipientRow({ label, bucket, items, onAdd, onRemove }: {
  label: string; bucket: "recipients" | "cc"; items: string[]
  onAdd: (bucket: "recipients" | "cc", type: string) => void
  onRemove: (bucket: "recipients" | "cc", idx: number) => void
}) {
  const labelClass = bucket === "recipients"
    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
    : "text-teal-700 dark:text-teal-300 bg-teal-500/10"
  return (
    <div className="rounded-lg border border-border/60 p-2.5 bg-background">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn("inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded-md min-w-[44px]", labelClass)}>{label}</span>
        {items.length === 0 && <span className="text-xs text-muted-foreground italic py-1">No recipients yet — use + to add</span>}
        {items.map((rType, idx) => {
          const meta = RECIPIENT_META[rType]
          return (
            <span key={`${rType}-${idx}`} className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium", meta?.chip || "bg-muted text-muted-foreground")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", meta?.dot || "bg-muted-foreground")} />
              {meta?.label || rType}
              <button onClick={() => onRemove(bucket, idx)} className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10" aria-label={`Remove ${meta?.label || rType}`}><X className="h-3 w-3" /></button>
            </span>
          )
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"><Plus className="h-3 w-3" /> Add<ChevronDown className="h-3 w-3" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Recipient type</DropdownMenuLabel>
            {RECIPIENT_TYPES.map((r) => (
              <DropdownMenuItem key={r.type} onClick={() => onAdd(bucket, r.type)} disabled={items.includes(r.type)}>
                <span className={cn("h-1.5 w-1.5 rounded-full mr-2", r.dot)} />
                <span className="flex-1">{r.label}</span>
                {items.includes(r.type) && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ============================================================================
//  Editor Dialog
// ============================================================================
function EditorDialog({ open, onOpenChange, form, setForm, onSubmit }: {
  open: boolean; onOpenChange: (o: boolean) => void
  form: ExitEmailTemplate
  // Parent keeps `ExitEmailTemplate | null`; the updater is wrapped to assert non-null prev.
  setForm: React.Dispatch<React.SetStateAction<ExitEmailTemplate | null>>
  onSubmit: () => void
}) {
  const [showPreview, setShowPreview] = useState(true)
  const [subjectFocused, setSubjectFocused] = useState(false)
  const editorRef = useRef<RichEditorHandle | null>(null)
  const subjectRef = useRef<HTMLInputElement | null>(null)
  const subjectSel = useRef<{ start: number; end: number } | null>(null)

  const field = useCallback(<K extends keyof ExitEmailTemplate>(key: K, value: ExitEmailTemplate[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }, [setForm])

  const onSubjectFocus = useCallback(() => setSubjectFocused(true), [])
  const onSubjectBlur = useCallback(() => {
    const el = subjectRef.current
    if (el) subjectSel.current = { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
    setTimeout(() => setSubjectFocused(false), 150)
  }, [])

  const insertVariable = useCallback((slug: string) => {
    const token = `{{${slug}}}`
    if (subjectFocused && subjectRef.current) {
      const el = subjectRef.current
      const sel = subjectSel.current ?? { start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.value.length }
      const next = el.value.slice(0, sel.start) + token + el.value.slice(sel.end)
      field("subject", next)
      const pos = sel.start + token.length
      subjectSel.current = { start: pos, end: pos }
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(pos, pos) })
      return
    }
    editorRef.current?.insertSlug(slug)
  }, [subjectFocused, field])

  const handleSectionChange = useCallback((section: EditorSection, html: string) => {
    if (section === "header") field("headerHtml", html)
    else if (section === "body") field("bodyHtml", html)
    else field("footerHtml", html)
  }, [field])

  const addRecipient = useCallback((bucket: "recipients" | "cc", type: string) => {
    setForm((f) => ({ ...f, [bucket]: [...(f[bucket] as string[]), type] }))
  }, [setForm])

  const removeRecipient = useCallback((bucket: "recipients" | "cc", idx: number) => {
    setForm((f) => ({ ...f, [bucket]: (f[bucket] as string[]).filter((_, i) => i !== idx) }))
  }, [setForm])

  const previewSubject = useMemo(() => substituteVariables(form.subject), [form.subject])
  const previewHtml = useMemo(
    () => substituteVariables(`${form.headerHtml || ""}\n${form.bodyHtml || ""}\n${form.footerHtml || ""}`),
    [form.headerHtml, form.bodyHtml, form.footerHtml],
  )
  const usedVariables = useMemo(
    () => extractVariables(`${form.subject}\n${form.headerHtml || ""}\n${form.bodyHtml || ""}\n${form.footerHtml || ""}`),
    [form.subject, form.headerHtml, form.bodyHtml, form.footerHtml],
  )

  const isEdit = !!form.id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-w-[calc(100%-2rem)] w-[calc(100%-2rem)] h-[92vh] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col" showCloseButton>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
          className="px-5 py-3.5 border-b border-border/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold truncate">{isEdit ? "Edit Email Template" : "New Email Template"}</DialogTitle>
              <DialogDescription className="text-xs">{isEdit ? `${form.code} · v${form.version}` : "Define content, recipients, and variables"}</DialogDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowPreview((s) => !s)}>
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{showPreview ? "Hide Preview" : "Show Preview"}</span>
          </Button>
        </motion.div>

        {/* Body — scrollable; main 2-pane area: editor (hero) + slug palette (sticky self-scrolling) */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-0">
            {/* LEFT: form fields + recipients + HTML editor */}
            <div className="p-5 space-y-5 min-w-0">
              {/* Top metadata bar */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Field label="Template Name" required icon={Type}>
                  <Input value={form.name} onChange={(e) => field("name", e.target.value)} placeholder="e.g. Resignation Submitted — Default" className="h-9" />
                </Field>
                <Field label="Template Code" required icon={Hash}>
                  <Input value={form.code} onChange={(e) => field("code", e.target.value.toUpperCase().replace(/\s+/g, "_"))} placeholder="EMAIL_RESIG_SUB" className="h-9 font-mono text-sm" />
                </Field>
                <Field label="Event Type" required icon={Bell}>
                  <Select value={form.eventType} onValueChange={(v) => field("eventType", v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {EVENT_CATEGORIES.map((e) => (
                        <SelectItem key={e.value} value={e.value}>
                          <span className="flex items-center gap-2"><EventIconView eventType={e.value} className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />{e.value}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Scope Type" icon={Layers}>
                  <Select value={form.scopeType} onValueChange={(v) => field("scopeType", v as ScopeType)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{SCOPE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Language" icon={Languages}>
                  <Select value={form.language} onValueChange={(v) => field("language", v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Status" icon={Tag}>
                  <Select value={form.status} onValueChange={(v) => field("status", v as "Active" | "Draft")}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 lg:col-span-1">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <div>
                      <Label className="text-xs font-medium">Default Template</Label>
                      <p className="text-[10px] text-muted-foreground">For this event type</p>
                    </div>
                  </div>
                  <Switch checked={form.isDefault} onCheckedChange={(v) => field("isDefault", v)} />
                </div>
                <Field label="Version" icon={Hash}>
                  <Input type="number" min={1} value={form.version} onChange={(e) => field("version", Math.max(1, Number(e.target.value) || 1))} className="h-9" />
                </Field>
                <Field label="Entity (optional)" icon={AtSign}>
                  <Input value={form.entity || ""} onChange={(e) => field("entity", e.target.value)} placeholder="ACME India Pvt Ltd" className="h-9" />
                </Field>
              </section>

              {/* Subject */}
              <Field label="Subject" required icon={Type}>
                <Input ref={subjectRef} value={form.subject} onChange={(e) => field("subject", e.target.value)} onFocus={onSubjectFocus} onBlur={onSubjectBlur} placeholder="Resignation Submitted — {{EmployeeName}}" className="h-9" />
              </Field>
              <SlugUsageSummary used={usedVariables} />

              <Separator />

              {/* Recipients builder */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h3 className="text-sm font-semibold">Recipients</h3>
                  <span className="text-xs text-muted-foreground">— default To / CC for every send using this template</span>
                </div>
                <div className="space-y-2">
                  <RecipientRow label="To" bucket="recipients" items={form.recipients} onAdd={addRecipient} onRemove={removeRecipient} />
                  <RecipientRow label="CC" bucket="cc" items={form.cc} onAdd={addRecipient} onRemove={removeRecipient} />
                </div>
              </section>

              <Separator />

              {/* WYSIWYG editor */}
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <h3 className="text-sm font-semibold">Email Content</h3>
                    <Badge variant="secondary" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-0 text-[10px]">WYSIWYG</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Tip: click variables on the right to insert into the focused field</span>
                </div>
                <div className="min-h-[460px]">
                  <SectionedRichEditor ref={editorRef} header={form.headerHtml || ""} body={form.bodyHtml} footer={form.footerHtml || ""} onChange={handleSectionChange} initialSection="body" minHeight={320} placeholders={{
                    header: "<div style='text-align:center; padding:16px;'><img src='{{CompanyLogo}}' alt='logo' height='40' /></div>",
                    body: "<p>Dear {{EmployeeName}},</p><p>This is to inform you that…</p>",
                    footer: "<p style='color:#888; font-size:12px;'>© {{CompanyName}}. This is an automated email.</p>",
                  }} />
                </div>
              </section>
            </div>

            {/* RIGHT: shared slug library (sticky + self-scrolling) */}
            <aside className="border-l border-border/60 bg-background min-w-0 lg:sticky lg:top-0 lg:h-[calc(92vh-128px)] lg:self-start lg:overflow-hidden flex flex-col min-h-[480px]">
              <SlugPalette onInsert={insertVariable} usedVariables={usedVariables} context="email" title="Slug Library" className="h-full" />
            </aside>
          </div>

          {/* Live preview (toggleable, full width below) */}
          <AnimatePresence initial={false}>
            {showPreview && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-border/60">
                <div className="p-5 bg-muted/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-fuchsia-500" />
                    <h3 className="text-sm font-semibold">Live Preview</h3>
                    <span className="text-xs text-muted-foreground">— rendered with sample data (Aarav Sharma · ACME Corp)</span>
                  </div>
                  <EmailPreview subject={previewSubject} html={previewHtml} fromEmail="hr@acme.com" toLabels={form.recipients.map((r) => RECIPIENT_META[r]?.label || r).join(", ") || "Employee"} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between gap-2 bg-background shrink-0">
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />{form.recipients.length} To · {form.cc.length} CC
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={onSubmit} className="gap-1.5 gradient-rose text-primary-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />{isEdit ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Event sidebar
// ============================================================================
function EventSidebar({ activeEvent, onSelect, counts, totalCount }: {
  activeEvent: string; onSelect: (v: string) => void; counts: Record<string, number>; totalCount: number
}) {
  const itemCls = (active: boolean) => cn(
    "group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left",
    active ? "bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 font-medium"
           : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
  )
  const iconCls = (active: boolean) => cn("h-4 w-4 shrink-0",
    active ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground group-hover:text-foreground")
  const badgeCls = (active: boolean) => cn("h-5 px-1.5 text-[10px] tabular-nums",
    active ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" : "text-muted-foreground")
  const allActive = activeEvent === "__all__"
  return (
    <Card className="bg-card border border-border/60 rounded-xl shadow-sm h-fit lg:sticky lg:top-2">
      <CardContent className="p-3">
        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event Types</span>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 tabular-nums">{EVENT_CATEGORIES.length}</Badge>
        </div>
        <ScrollArea className="max-h-[70vh] pr-1">
          <div className="flex flex-col gap-0.5">
            <button onClick={() => onSelect("__all__")} className={itemCls(allActive)}>
              <Layers className={iconCls(allActive)} />
              <span className="flex-1 truncate">All Templates</span>
              <Badge variant="outline" className={badgeCls(allActive)}>{totalCount}</Badge>
            </button>
            <div className="my-1.5 h-px bg-border/60" />
            {EVENT_CATEGORIES.map((e) => {
              const Icon = e.icon
              const count = counts[e.value] || 0
              const active = activeEvent === e.value
              return (
                <button key={e.value} onClick={() => onSelect(e.value)} className={itemCls(active)}>
                  <Icon className={iconCls(active)} />
                  <span className="flex-1 truncate">{e.value}</span>
                  {count > 0 && <Badge variant="outline" className={badgeCls(active)}>{count}</Badge>}
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ============================================================================
//  Templates table
// ============================================================================
function TemplatesTable({ items, onEdit, onClone, onPreview, onDelete }: {
  items: ExitEmailTemplate[]
  onEdit: (t: ExitEmailTemplate) => void
  onClone: (t: ExitEmailTemplate) => void
  onPreview: (t: ExitEmailTemplate) => void
  onDelete: (t: ExitEmailTemplate) => void
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium text-foreground">No templates match</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different event type or clear the search.</p>
        </div>
      </div>
    )
  }
  const th = "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b border-border/60">
              {[
                { l: "Template Name", c: "min-w-[200px]" },
                { l: "Event Type" }, { l: "Scope" }, { l: "Lang" }, { l: "Recipients" },
                { l: "Default", c: "text-center" }, { l: "Status" }, { l: "Ver" }, { l: "Updated" },
                { l: "Actions", c: "text-right" },
              ].map((h) => <th key={h.l} className={cn(th, h.c)}>{h.l}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.map((t) => {
              const statusColor = STATUS_COLORS[t.status] || "#94a3b8"
              return (
                <tr key={t.id} className="border-b border-border/40 last:border-0 hover:bg-rose-50/40 dark:hover:bg-rose-950/10 transition-colors">
                  {/* Name + code */}
                  <td className="px-3 py-2.5 align-middle">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <EventIconView eventType={t.eventType} className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{t.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-foreground/80">{t.code}</code>
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">{t.subject}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <Badge variant="outline" className="gap-1.5 font-medium border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300">
                      <EventIconView eventType={t.eventType} className="h-3 w-3" />
                      <span className="text-xs">{t.eventType}</span>
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{t.scopeType}</span>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Languages className="h-3.5 w-3.5" />{t.language}</span>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {t.recipients.length === 0 && t.cc.length === 0 && <span className="text-xs text-muted-foreground italic">—</span>}
                      {t.recipients.slice(0, 2).map((r, i) => {
                        const meta = RECIPIENT_META[r]
                        return (
                          <span key={`to-${i}`} className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium", meta?.chip || "bg-muted text-muted-foreground")}>
                            <span className={cn("h-1 w-1 rounded-full", meta?.dot || "bg-muted-foreground")} />{meta?.label || r}
                          </span>
                        )
                      })}
                      {t.recipients.length > 2 && <span className="text-[10px] text-muted-foreground self-center">+{t.recipients.length - 2} more</span>}
                      {t.cc.length > 0 && <span className="text-[10px] text-muted-foreground self-center">· {t.cc.length} CC</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-middle text-center">
                    {t.isDefault ? <Star className="h-4 w-4 inline fill-amber-400 text-amber-500" /> : <Star className="h-4 w-4 inline text-muted-foreground/30" />}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: `${statusColor}1a`, color: statusColor }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />{t.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-middle"><Badge variant="outline" className="font-mono text-[10px]">v{t.version}</Badge></td>
                  <td className="px-3 py-2.5 align-middle"><span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(t.updatedAt)}</span></td>
                  <td className="px-3 py-2.5 align-middle text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview(t)} aria-label="Preview"><Eye className="h-3.5 w-3.5" /></Button>
                      </TooltipTrigger><TooltipContent>Preview</TooltipContent></Tooltip>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">{t.code}</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onEdit(t)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onClone(t)}><Copy className="h-3.5 w-3.5 mr-2" /> Clone</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onPreview(t)}><Eye className="h-3.5 w-3.5 mr-2" /> Preview</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDelete(t)} className="text-rose-600 dark:text-rose-400 focus:text-rose-700 focus:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
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

// ============================================================================
//  Main section
// ============================================================================
export function EmailsSection() {
  const [items, setItems] = useState<ExitEmailTemplate[]>(EXIT_EMAIL_TEMPLATES)
  const [activeEvent, setActiveEvent] = useState<string>("__all__")
  const [search, setSearch] = useState("")
  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState<ExitEmailTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<ExitEmailTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExitEmailTemplate | null>(null)

  const stats = useMemo(() => {
    const total = items.length
    const active = items.filter((t) => t.status === "Active").length
    const defaults = items.filter((t) => t.isDefault).length
    const drafts = items.filter((t) => t.status === "Draft").length
    return { total, active, defaults, drafts }
  }, [items])

  const eventCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const t of items) m[t.eventType] = (m[t.eventType] || 0) + 1
    return m
  }, [items])

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

  // Build a fresh empty form
  const emptyForm = useCallback((eventType: string): ExitEmailTemplate => ({
    id: "",
    name: "", code: "", eventType,
    scopeType: "Tenant Default", entity: undefined, language: "English",
    subject: "", headerHtml: "", bodyHtml: "", footerHtml: "",
    isDefault: false, status: "Active", version: 1,
    recipients: [], cc: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }), [])

  const openNew = useCallback(() => {
    setForm(emptyForm(activeEvent !== "__all__" ? activeEvent : "Resignation Submitted"))
    setEditorOpen(true)
  }, [activeEvent, emptyForm])

  const openEdit = useCallback((t: ExitEmailTemplate) => {
    setForm({ ...t })
    setEditorOpen(true)
  }, [])

  const openClone = useCallback((t: ExitEmailTemplate) => {
    setForm({ ...t, id: "", name: `${t.name} (Copy)`, code: `${t.code}_COPY`, isDefault: false, version: 1 })
    setEditorOpen(true)
  }, [])

  const submitForm = useCallback(() => {
    if (!form) return
    if (!form.name.trim()) { toast.error("Template name is required"); return }
    if (!form.code.trim()) { toast.error("Template code is required"); return }
    if (!form.subject.trim()) { toast.error("Subject is required"); return }
    if (!form.bodyHtml.trim()) { toast.error("Email body is required"); return }
    const now = new Date().toISOString()
    const tpl: ExitEmailTemplate = {
      ...form, name: form.name.trim(), code: form.code.trim(),
      id: form.id || `et-${Date.now()}`, createdAt: form.createdAt || now, updatedAt: now,
    }
    setItems((prev) => {
      const idx = prev.findIndex((t) => t.id === tpl.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = tpl; toast.success(`Template "${tpl.name}" updated`); return next }
      toast.success(`Template "${tpl.name}" created`)
      return [tpl, ...prev]
    })
    setEditorOpen(false)
  }, [form])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    setItems((prev) => prev.filter((t) => t.id !== deleteTarget.id))
    toast.success(`Template "${deleteTarget.name}" deleted`)
    setDeleteTarget(null)
  }, [deleteTarget])

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-5">
        {/* Section header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl gradient-rose text-primary-foreground shadow-soft">
              <Mail className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Email Templates</h2>
              <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
                Event-driven email content for every exit milestone — resignation, clearance, asset return, FnF, letters, and alumni.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={openNew} className="gap-1.5 gradient-rose text-primary-foreground shadow-soft">
            <Plus className="h-4 w-4" /> New Email Template
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Templates", value: stats.total, icon: Mail, tint: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" },
            { label: "Active", value: stats.active, icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" },
            { label: "Defaults", value: stats.defaults, icon: Star, tint: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" },
            { label: "Drafts", value: stats.drafts, icon: FileText, tint: "bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300" },
          ].map((s) => (
            <Card key={s.label} className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</div>
                  <div className="text-2xl font-bold mt-1">{s.value}</div>
                </div>
                <div className={cn("grid h-9 w-9 place-items-center rounded-lg", s.tint)}><s.icon className="h-4 w-4" /></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <EventSidebar activeEvent={activeEvent} onSelect={setActiveEvent} counts={eventCounts} totalCount={items.length} />

          <Card className="bg-card border border-border/60 rounded-xl shadow-sm">
            <CardContent className="p-4">
              {/* Toolbar */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, code, subject…" className="pl-9 h-9 bg-background" />
                </div>
                <div className="flex items-center gap-2">
                  {activeEvent !== "__all__" && (
                    <Badge variant="outline" className="gap-1.5 py-1 pl-2.5 pr-2">
                      <span className="text-muted-foreground">Filtered:</span>
                      <span className="font-medium">{activeEvent}</span>
                      <button onClick={() => setActiveEvent("__all__")} className="ml-1 rounded-full hover:bg-muted p-0.5" aria-label="Clear filter"><X className="h-3 w-3" /></button>
                    </Badge>
                  )}
                  <Button size="sm" onClick={openNew} className="gap-1.5 gradient-rose text-primary-foreground"><Plus className="h-4 w-4" /> New Template</Button>
                </div>
              </div>

              <TemplatesTable items={filtered} onEdit={openEdit} onClone={openClone} onPreview={(t) => setPreviewTemplate(t)} onDelete={(t) => setDeleteTarget(t)} />

              <p className="text-[11px] text-muted-foreground/70 px-1 mt-3"><Sparkles className="inline h-3 w-3 mr-1 text-rose-500" />Click the eye icon to preview, or the actions menu to edit / clone / delete.</p>
            </CardContent>
          </Card>
        </div>

        {/* Editor dialog */}
        {form && (
          <EditorDialog open={editorOpen} onOpenChange={setEditorOpen} form={form} setForm={setForm} onSubmit={submitForm} />
        )}

        {/* Preview dialog */}
        <PreviewDialog template={previewTemplate} onOpenChange={(o) => { if (!o) setPreviewTemplate(null) }} />

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="h-4 w-4 text-rose-500" /> Delete email template?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>{" "}
                (<code className="text-xs font-mono">{deleteTarget?.code}</code>). Workflows using this template will fall back to the next default. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-white">
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}

export default EmailsSection
