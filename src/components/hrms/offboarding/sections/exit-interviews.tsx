"use client"

// ============================================================================
//  ExitInterviewsSection — Offboarding spec #17
//  Custom exit interview forms with 5 categories (HR Exit Interview, Manager
//  Exit Discussion, Anonymous Exit Survey, Department Exit Feedback, Final HR
//  Call). Per form: name, code, category, scope, status, version. Per form
//  settings: anonymous allowed, mandatory, visible to manager/HR, employee
//  edit after submit, requires HR review, map answers to analytics. Per
//  question: text, type (text/textarea/rating/select/radio/checkbox),
//  options, required. Editor dialog + read-only preview dialog with live
//  input rendering. Rose theme accents.
// ============================================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  MessageSquare, Plus, Search, Pencil, Copy, Trash2, MoreHorizontal,
  Save, X, Hash, Eye, Sparkles, AlertCircle, Inbox, CheckCircle2,
  FileText, User as UserIcon, Layers, Star, Tag, ChevronRight,
  ShieldCheck, Lock, EyeOff, CheckCheck, BarChart3, GripVertical,
  Settings2, Hash as HashIcon, Type, AlignLeft, ListChecks, CircleDot,
  CheckSquare, ListOrdered, Copy as CopyIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"

import { EXIT_INTERVIEW_FORMS } from "@/components/hrms/offboarding/data"
import type {
  ExitInterviewForm, ExitInterviewQuestion, ScopeType,
} from "@/components/hrms/offboarding/shared"
import {
  formatDate, STATUS_COLORS,
} from "@/components/hrms/offboarding/shared"

// ============================================================================
//  Constants
// ============================================================================

type LucideIcon = React.ComponentType<{ className?: string }>

interface CategoryMeta {
  value: string
  label: string
  icon: LucideIcon
  color: string
  short: string
}

const CATEGORIES: CategoryMeta[] = [
  { value: "HR Exit Interview", label: "HR Exit Interview", icon: UserIcon, color: "#f43f5e", short: "HR" },
  { value: "Manager Exit Discussion", label: "Manager Discussion", icon: MessageSquare, color: "#0ea5e9", short: "Mgr" },
  { value: "Anonymous Exit Survey", label: "Anonymous Survey", icon: Lock, color: "#8b5cf6", short: "Anon" },
  { value: "Department Exit Feedback", label: "Dept Feedback", icon: Layers, color: "#10b981", short: "Dept" },
  { value: "Final HR Call", label: "Final HR Call", icon: FileText, color: "#f59e0b", short: "Final" },
]

const CATEGORY_MAP: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c])
)

const SCOPE_TYPES: ScopeType[] = [
  "Tenant Default", "Entity", "Branch", "Location", "Department",
  "Grade", "Employee Type", "Work Mode", "Exit Type", "Specific Employee",
]

type QType = ExitInterviewQuestion["type"]

interface QTypeMeta {
  value: QType
  label: string
  icon: LucideIcon
  hasOptions: boolean
  color: string
}

const Q_TYPES: QTypeMeta[] = [
  { value: "text", label: "Text", icon: Type, hasOptions: false, color: "#0ea5e9" },
  { value: "textarea", label: "Long Text", icon: AlignLeft, hasOptions: false, color: "#06b6d4" },
  { value: "rating", label: "Rating (1-5)", icon: Star, hasOptions: false, color: "#f59e0b" },
  { value: "select", label: "Dropdown", icon: ListChecks, hasOptions: true, color: "#10b981" },
  { value: "radio", label: "Single Choice", icon: CircleDot, hasOptions: true, color: "#8b5cf6" },
  { value: "checkbox", label: "Multiple Choice", icon: CheckSquare, hasOptions: true, color: "#f43f5e" },
]

const Q_TYPE_MAP: Record<QType, QTypeMeta> = Object.fromEntries(
  Q_TYPES.map((q) => [q.value, q])
) as Record<QType, QTypeMeta>

// Default question templates (from spec #17 — Form Fields)
const DEFAULT_QUESTION_TEMPLATES = [
  "Primary Reason for Leaving",
  "Secondary Reason",
  "New Company (optional)",
  "New Role (optional)",
  "Compensation Satisfaction",
  "Manager Relationship Rating",
  "Work Culture Rating",
  "Career Growth Rating",
  "Workload Rating",
  "Would You Rejoin?",
  "Would You Recommend Company?",
  "Suggestions",
  "Final Remarks",
]

// ============================================================================
//  Helpers
// ============================================================================

function toCode(name: string): string {
  const v = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().replace(/\s+/g, "_")
  return v.slice(0, 32) || `EXIT_INT_${Date.now().toString().slice(-4)}`
}

function parseOptions(raw: string): string[] {
  if (!raw.trim()) return []
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

function optionsToRaw(opts?: string[]): string {
  return (opts || []).join(", ")
}

// ============================================================================
//  Small reusable presentational components
// ============================================================================

function ColorDot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
}

function TintedBadge({
  bg, fg, children, className,
}: { bg: string; fg: string; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        className
      )}
      style={{ backgroundColor: bg, color: fg }}
    >
      {children}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "#94a3b8"
  return (
    <TintedBadge bg={`${color}1a`} fg={color}>
      <ColorDot color={color} />
      {status}
    </TintedBadge>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY_MAP[category] || { value: category, label: category, icon: Tag, color: "#64748b", short: "?" }
  const Icon = meta.icon
  return (
    <TintedBadge bg={`${meta.color}1a`} fg={meta.color}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </TintedBadge>
  )
}

function QTypeBadge({ type }: { type: QType }) {
  const meta = Q_TYPE_MAP[type] || Q_TYPE_MAP["text"]
  const Icon = meta.icon
  return (
    <TintedBadge bg={`${meta.color}1a`} fg={meta.color}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </TintedBadge>
  )
}

function YesNoBadge({ yes, yesLabel = "Yes", noLabel = "No" }: { yes: boolean; yesLabel?: string; noLabel?: string }) {
  return yes ? (
    <TintedBadge bg="#ecfdf5" fg="#059669">
      <CheckCircle2 className="h-3 w-3" /> {yesLabel}
    </TintedBadge>
  ) : (
    <span className="text-xs text-muted-foreground">{noLabel}</span>
  )
}

function FieldLabel({ children, icon: Icon }: { children: React.ReactNode; icon?: LucideIcon }) {
  return (
    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
      {Icon && <Icon className="h-3 w-3 text-rose-500" />}
      {children}
    </Label>
  )
}

// ============================================================================
//  Category sidebar
// ============================================================================

function CategorySidebar({
  active, onSelect, counts, total,
}: {
  active: string | "all"
  onSelect: (v: string | "all") => void
  counts: Record<string, number>
  total: number
}) {
  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-rose-600" />
          Form Categories
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <nav className="flex flex-col gap-1">
          <button
            onClick={() => onSelect("all")}
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
              active === "all"
                ? "bg-rose-50 text-rose-700 font-semibold dark:bg-rose-950/40 dark:text-rose-300"
                : "hover:bg-muted/60 text-foreground/80"
            )}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              All Categories
            </span>
            <Badge variant="secondary" className="font-mono text-[10px] h-5 min-w-[20px] justify-center">{total}</Badge>
          </button>
          <Separator className="my-1" />
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isActive = active === cat.value
            const count = counts[cat.value] || 0
            return (
              <button
                key={cat.value}
                onClick={() => onSelect(cat.value)}
                className={cn(
                  "group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all w-full text-left",
                  isActive
                    ? "bg-rose-50 text-rose-700 font-semibold dark:bg-rose-950/40 dark:text-rose-300"
                    : "hover:bg-muted/60 text-foreground/80"
                )}
                style={isActive ? { boxShadow: `inset 2px 0 0 ${cat.color}` } : undefined}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
                    style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{cat.label}</span>
                </span>
                <Badge variant="outline" className="font-mono text-[10px] h-5 min-w-[20px] justify-center shrink-0">
                  {count}
                </Badge>
              </button>
            )
          })}
        </nav>
      </CardContent>
    </Card>
  )
}

// ============================================================================
//  Form editor dialog
// ============================================================================

type DraftQuestion = ExitInterviewQuestion

function blankQuestion(idx: number): DraftQuestion {
  return {
    id: `q-${Date.now()}-${idx}`,
    question: "",
    type: "text",
    options: [],
    required: false,
  }
}

function FormEditor({
  open, onOpenChange, initial, onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: ExitInterviewForm | null
  onSave: (form: ExitInterviewForm) => void
}) {
  const isEdit = !!initial
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [category, setCategory] = useState<string>("HR Exit Interview")
  const [scopeType, setScopeType] = useState<ScopeType>("Tenant Default")
  const [status, setStatus] = useState<"Draft" | "Active">("Active")
  const [version, setVersion] = useState(1)

  // Form settings
  const [anonymousAllowed, setAnonymousAllowed] = useState(false)
  const [mandatory, setMandatory] = useState(true)
  const [visibleToManager, setVisibleToManager] = useState(false)
  const [visibleToHR, setVisibleToHR] = useState(true)
  const [allowEditAfterSubmit, setAllowEditAfterSubmit] = useState(false)
  const [requiresHRReview, setRequiresHRReview] = useState(true)
  const [mapToAnalytics, setMapToAnalytics] = useState(true)

  const [questions, setQuestions] = useState<DraftQuestion[]>([])

  // Hydrate
  React.useEffect(() => {
    if (!open) return
    if (initial) {
      setName(initial.name)
      setCode(initial.code)
      setCategory(initial.category)
      setScopeType(initial.scopeType)
      setStatus(initial.status)
      setVersion(initial.version)
      setAnonymousAllowed(initial.anonymousAllowed)
      setMandatory(initial.mandatory)
      setVisibleToManager(initial.visibleToManager)
      setVisibleToHR(initial.visibleToHR)
      setAllowEditAfterSubmit(false)
      setRequiresHRReview(initial.requiresHRReview)
      setMapToAnalytics(true)
      setQuestions(initial.questions.map((q) => ({ ...q })))
    } else {
      setName("")
      setCode("")
      setCategory("HR Exit Interview")
      setScopeType("Tenant Default")
      setStatus("Active")
      setVersion(1)
      setAnonymousAllowed(false)
      setMandatory(true)
      setVisibleToManager(false)
      setVisibleToHR(true)
      setAllowEditAfterSubmit(false)
      setRequiresHRReview(true)
      setMapToAnalytics(true)
      setQuestions([blankQuestion(0)])
    }
  }, [open, initial?.id])

  // ---------- Question handlers ----------
  const updateQ = (id: string, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const addQuestion = () => {
    setQuestions((prev) => [...prev, blankQuestion(prev.length)])
  }

  const removeQ = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const duplicateQ = (id: string) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id)
      if (idx === -1) return prev
      const copy: DraftQuestion = { ...prev[idx], id: `q-${Date.now()}` }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
    toast.success("Question duplicated")
  }

  const moveQ = (id: string, dir: -1 | 1) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id)
      if (idx === -1) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  const loadDefaultTemplate = () => {
    const newQs: DraftQuestion[] = DEFAULT_QUESTION_TEMPLATES.map((q, i) => {
      const lower = q.toLowerCase()
      let type: QType = "text"
      let options: string[] | undefined
      if (lower.includes("rating") || lower.includes("satisfaction")) {
        type = "rating"
      } else if (lower.includes("reason")) {
        type = "select"
        options = ["Better Opportunity", "Career Growth", "Compensation", "Work Life Balance", "Relocation", "Health Reasons", "Family Reasons", "Higher Studies", "Management Issues", "Work Culture", "Other"]
      } else if (lower.startsWith("would you")) {
        type = "radio"
        options = ["Yes", "No", "Maybe"]
      } else if (lower.includes("suggestions") || lower.includes("remarks")) {
        type = "textarea"
      } else if (lower.includes("new company") || lower.includes("new role")) {
        type = "text"
      }
      return {
        id: `q-${Date.now()}-${i}`,
        question: q,
        type,
        options,
        required: !lower.includes("optional"),
      }
    })
    setQuestions(newQs)
    toast.success(`Loaded ${newQs.length} default questions`)
  }

  const handleSave = () => {
    if (!name.trim()) { toast.error("Form name is required"); return }
    if (!code.trim()) { toast.error("Form code is required"); return }
    if (questions.length === 0) { toast.error("Add at least one question"); return }
    const emptyQ = questions.find((q) => !q.question.trim())
    if (emptyQ) { toast.error("All questions must have text"); return }
    // Validate options
    for (const q of questions) {
      if (Q_TYPE_MAP[q.type]?.hasOptions && (!q.options || q.options.length === 0)) {
        toast.error(`Question "${q.question || q.id}" needs at least one option`)
        return
      }
    }
    const finalQs: ExitInterviewQuestion[] = questions.map((q) => ({
      id: q.id,
      question: q.question.trim(),
      type: q.type,
      options: Q_TYPE_MAP[q.type]?.hasOptions ? q.options : undefined,
      required: q.required,
    }))
    const payload: ExitInterviewForm = {
      id: initial?.id || `ei-${Date.now()}`,
      name: name.trim(),
      code: code.trim() || toCode(name),
      category,
      scopeType,
      status,
      isDefault: initial?.isDefault || false,
      version,
      anonymousAllowed,
      mandatory,
      visibleToManager,
      visibleToHR,
      requiresHRReview,
      questions: finalQs,
      createdAt: initial?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onSave(payload)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border/60 bg-gradient-to-r from-rose-50/60 to-transparent dark:from-rose-950/20">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5 text-rose-600" />
            {isEdit ? "Edit Exit Interview Form" : "New Exit Interview Form"}
            {isEdit && initial && (
              <Badge variant="outline" className="ml-2 font-mono text-[10px]">{initial.code}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update form details, settings and questions."
              : "Configure a custom exit interview form with questions."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6 pb-2">
            {/* ---------- Header fields ---------- */}
            <section>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-rose-500" />
                Form Details
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2">
                  <FieldLabel icon={Hash}>Form Name</FieldLabel>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Standard HR Exit Interview"
                    onBlur={() => { if (!code && name) setCode(toCode(name)) }}
                  />
                </div>
                <div>
                  <FieldLabel icon={Hash}>Code</FieldLabel>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="HR_EXIT_INT"
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <FieldLabel icon={Tag}>Category</FieldLabel>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel icon={Layers}>Scope Type</FieldLabel>
                  <Select value={scopeType} onValueChange={(v) => setScopeType(v as ScopeType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SCOPE_TYPES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel icon={Hash}>Version</FieldLabel>
                  <Input
                    type="number" min={1}
                    value={version}
                    onChange={(e) => setVersion(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                </div>
                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={status === "Active"}
                      onCheckedChange={(v) => setStatus(v ? "Active" : "Draft")}
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
              </div>
            </section>

            <Separator />

            {/* ---------- Form Settings ---------- */}
            <section>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                <Settings2 className="h-3 w-3 text-rose-500" />
                Form Settings
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 rounded-lg bg-muted/30 p-3 border border-border/40">
                <SettingSwitch label="Anonymous Allowed" desc="Hide employee identity" icon={Lock} checked={anonymousAllowed} onChange={setAnonymousAllowed} tone="violet" />
                <SettingSwitch label="Mandatory" desc="Required for exit" icon={ShieldCheck} checked={mandatory} onChange={setMandatory} tone="rose" />
                <SettingSwitch label="Visible to Manager" desc="Manager can view responses" icon={Eye} checked={visibleToManager} onChange={setVisibleToManager} tone="cyan" />
                <SettingSwitch label="Visible to HR" desc="HR can view responses" icon={Eye} checked={visibleToHR} onChange={setVisibleToHR} tone="emerald" />
                <SettingSwitch label="Allow Edit After Submit" desc="Employee can revise" icon={Pencil} checked={allowEditAfterSubmit} onChange={setAllowEditAfterSubmit} tone="amber" />
                <SettingSwitch label="Requires HR Review" desc="HR approval needed" icon={CheckCheck} checked={requiresHRReview} onChange={setRequiresHRReview} tone="rose" />
                <SettingSwitch label="Map Answers to Analytics" desc="Feed exit analytics" icon={BarChart3} checked={mapToAnalytics} onChange={setMapToAnalytics} tone="cyan" />
              </div>
            </section>

            <Separator />

            {/* ---------- Questions ---------- */}
            <section>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <ListOrdered className="h-3 w-3 text-rose-500" />
                  Questions ({questions.length})
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={loadDefaultTemplate} className="gap-1.5 text-xs">
                    <Sparkles className="h-3.5 w-3.5" /> Load Default Template
                  </Button>
                  <Button size="sm" variant="outline" onClick={addQuestion} className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30">
                    <Plus className="h-3.5 w-3.5" /> Add Question
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {questions.map((q, idx) => {
                    const meta = Q_TYPE_MAP[q.type] || Q_TYPE_MAP["text"]
                    const needsOptions = meta.hasOptions
                    return (
                      <motion.div
                        key={q.id}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="rounded-xl border border-border/60 bg-card hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors shadow-sm"
                      >
                        {/* Q header */}
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-muted/30 rounded-t-xl">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <GripVertical className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-mono">Q{idx + 1}</span>
                          </div>
                          <Input
                            value={q.question}
                            onChange={(e) => updateQ(q.id, { question: e.target.value })}
                            placeholder="Enter question text…"
                            className="h-8 flex-1 border-transparent bg-transparent focus-visible:border-input focus-visible:bg-background"
                          />
                          <div className="flex items-center gap-0.5">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveQ(q.id, -1)} disabled={idx === 0} title="Move up">
                              <ChevronRight className="h-3.5 w-3.5 -rotate-90" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveQ(q.id, 1)} disabled={idx === questions.length - 1} title="Move down">
                              <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-rose-600" onClick={() => duplicateQ(q.id)} title="Duplicate">
                              <CopyIcon className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-rose-600" onClick={() => removeQ(q.id)} title="Remove">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Q body */}
                        <div className="p-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <FieldLabel icon={meta.icon}>Question Type</FieldLabel>
                            <Select value={q.type} onValueChange={(v) => updateQ(q.id, { type: v as QType })}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Q_TYPES.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>
                                    <span className="flex items-center gap-2">
                                      <t.icon className="h-3.5 w-3.5" /> {t.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border/60 px-3 py-2 w-full hover:bg-muted/30 transition-colors">
                              <Switch checked={q.required} onCheckedChange={(v) => updateQ(q.id, { required: v })} />
                              <span className="text-sm">Required answer</span>
                            </label>
                          </div>
                          {needsOptions && (
                            <div className="sm:col-span-2">
                              <FieldLabel icon={ListChecks}>Options (comma-separated)</FieldLabel>
                              <Input
                                value={optionsToRaw(q.options)}
                                onChange={(e) => updateQ(q.id, { options: parseOptions(e.target.value) })}
                                placeholder="Option 1, Option 2, Option 3"
                                className="font-mono text-sm"
                              />
                              {q.options && q.options.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {q.options.map((opt, i) => (
                                    <Badge key={i} variant="outline" className="text-xs font-normal">{opt}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          {/* Live preview of input */}
                          <div className="sm:col-span-2 rounded-lg bg-muted/20 border border-border/40 p-3">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Preview</div>
                            <QuestionPreview q={q} />
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {questions.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                    <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No questions yet. Click <span className="font-medium text-rose-600">Add Question</span> or load the default template.
                  </div>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {questions.length} question{questions.length !== 1 ? "s" : ""} · Version {version} · {status}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-1.5">
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleSave} className="gap-1.5 gradient-rose text-primary-foreground">
              <Save className="h-4 w-4" /> {isEdit ? "Update Form" : "Save Form"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SettingSwitch({
  label, desc, checked, onChange, icon: Icon, tone,
}: {
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
  icon: LucideIcon
  tone: "rose" | "violet" | "cyan" | "emerald" | "amber"
}) {
  const toneRing: Record<string, string> = {
    rose: "data-[state=checked]:bg-rose-600",
    violet: "data-[state=checked]:bg-violet-600",
    cyan: "data-[state=checked]:bg-cyan-600",
    emerald: "data-[state=checked]:bg-emerald-600",
    amber: "data-[state=checked]:bg-amber-500",
  }
  const toneText: Record<string, string> = {
    rose: "text-rose-600 dark:text-rose-400",
    violet: "text-violet-600 dark:text-violet-400",
    cyan: "text-cyan-600 dark:text-cyan-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
  }
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-background/60 transition-colors cursor-pointer">
      <div className="flex items-start gap-2 min-w-0">
        <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", toneText[tone])} />
        <div className="min-w-0">
          <div className="text-xs font-semibold truncate">{label}</div>
          <div className="text-[10px] text-muted-foreground truncate">{desc}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className={cn(toneRing[tone])} />
    </label>
  )
}

// ============================================================================
//  Question preview (used both in editor and form preview dialog)
// ============================================================================

function QuestionPreview({
  q, readonly = false,
}: {
  q: ExitInterviewQuestion
  readonly?: boolean
}) {
  const meta = Q_TYPE_MAP[q.type] || Q_TYPE_MAP["text"]
  const [rating, setRating] = useState(0)
  const [radio, setRadio] = useState<string>("")
  const [checks, setChecks] = useState<string[]>([])
  const [text, setText] = useState("")

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
        {q.question || <span className="italic text-muted-foreground">Untitled question</span>}
        {q.required && <span className="text-rose-600">*</span>}
        <QTypeBadge type={q.type} />
      </div>
      {readonly && (
        <div className="text-[10px] text-muted-foreground mb-1">{meta.label}</div>
      )}

      {q.type === "text" && (
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={readonly}
          placeholder="Enter answer…"
          className="max-w-md"
        />
      )}

      {q.type === "textarea" && (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={readonly}
          placeholder="Enter detailed answer…"
          className="min-h-[80px] max-w-xl"
        />
      )}

      {q.type === "rating" && (
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={readonly}
              onClick={() => setRating(n)}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-lg border transition-all",
                rating >= n
                  ? "bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-300"
                  : "border-border/60 text-muted-foreground hover:border-amber-200 hover:bg-amber-50/40",
                readonly && "cursor-default"
              )}
              title={`${n} star${n > 1 ? "s" : ""}`}
            >
              <Star className={cn("h-4 w-4", rating >= n && "fill-current")} />
            </button>
          ))}
          <span className="text-xs text-muted-foreground ml-2">
            {rating > 0 ? `${rating}/5` : "No rating"}
          </span>
        </div>
      )}

      {q.type === "select" && (
        <Select value="" onValueChange={() => {}} disabled={readonly}>
          <SelectTrigger className="max-w-md"><SelectValue placeholder="Choose…" /></SelectTrigger>
          <SelectContent>
            {(q.options || []).map((opt, i) => (
              <SelectItem key={i} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {q.type === "radio" && (
        <RadioGroup
          value={radio}
          onValueChange={setRadio}
          disabled={readonly}
          className="flex flex-wrap gap-3"
        >
          {(q.options || []).map((opt, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer text-sm">
              <RadioGroupItem value={opt} id={`r-${q.id}-${i}`} />
              <span>{opt}</span>
            </label>
          ))}
        </RadioGroup>
      )}

      {q.type === "checkbox" && (
        <div className="flex flex-wrap gap-3">
          {(q.options || []).map((opt, i) => {
            const id = `c-${q.id}-${i}`
            return (
              <label key={i} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  id={id}
                  checked={checks.includes(opt)}
                  onCheckedChange={(v) => {
                    if (readonly) return
                    setChecks((prev) => v ? [...prev, opt] : prev.filter((x) => x !== opt))
                  }}
                />
                <span>{opt}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================================
//  Form preview dialog (read-only, employee view)
// ============================================================================

function FormPreview({
  open, onOpenChange, form,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  form: ExitInterviewForm | null
}) {
  if (!form) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border/60 bg-gradient-to-r from-rose-50/60 to-transparent dark:from-rose-950/20">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="h-5 w-5 text-rose-600" />
            {form.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {form.code} · v{form.version} · {form.questions.length} questions
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            {/* Meta strip */}
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={form.category} />
              <StatusBadge status={form.status} />
              {form.anonymousAllowed && (
                <TintedBadge bg="#f5f3ff" fg="#7c3aed">
                  <Lock className="h-3 w-3" /> Anonymous
                </TintedBadge>
              )}
              {form.mandatory ? (
                <TintedBadge bg="#fff1f2" fg="#e11d48">
                  <ShieldCheck className="h-3 w-3" /> Mandatory
                </TintedBadge>
              ) : (
                <TintedBadge bg="#f1f5f9" fg="#475569">Optional</TintedBadge>
              )}
              {form.visibleToManager && (
                <TintedBadge bg="#ecfeff" fg="#0891b2">
                  <Eye className="h-3 w-3" /> Visible to Manager
                </TintedBadge>
              )}
              {form.visibleToHR && (
                <TintedBadge bg="#ecfdf5" fg="#059669">
                  <Eye className="h-3 w-3" /> Visible to HR
                </TintedBadge>
              )}
              {form.requiresHRReview && (
                <TintedBadge bg="#fff1f2" fg="#e11d48">
                  <CheckCheck className="h-3 w-3" /> HR Review
                </TintedBadge>
              )}
              <TintedBadge bg="#f1f5f9" fg="#475569">
                <Layers className="h-3 w-3" /> {form.scopeType}
              </TintedBadge>
            </div>

            {form.anonymousAllowed && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-900/40 p-3 flex items-start gap-2">
                <Lock className="h-4 w-4 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
                <div className="text-xs text-violet-700 dark:text-violet-300">
                  <span className="font-semibold">Anonymous Survey.</span> Your responses will not be linked to your identity. Please answer honestly.
                </div>
              </div>
            )}

            <Separator />

            {/* Questions */}
            <div className="space-y-4">
              {form.questions.map((q, idx) => (
                <div key={q.id} className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <QuestionPreview q={q} readonly />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 py-4 border-t border-border/60">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-1.5">
            <X className="h-4 w-4" /> Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Main section component
// ============================================================================

export function ExitInterviewsSection() {
  const [forms, setForms] = useState<ExitInterviewForm[]>(EXIT_INTERVIEW_FORMS)
  const [activeCategory, setActiveCategory] = useState<string | "all">("all")
  const [search, setSearch] = useState("")
  const [scopeFilter, setScopeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<ExitInterviewForm | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewing, setPreviewing] = useState<ExitInterviewForm | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExitInterviewForm | null>(null)

  // ---------- Derived: counts per category ----------
  const counts = useMemo(() => {
    const out: Record<string, number> = {}
    forms.forEach((f) => { out[f.category] = (out[f.category] || 0) + 1 })
    return out
  }, [forms])

  // ---------- Derived: filtered list ----------
  const filtered = useMemo(() => {
    return forms.filter((f) => {
      if (activeCategory !== "all" && f.category !== activeCategory) return false
      if (scopeFilter !== "all" && f.scopeType !== scopeFilter) return false
      if (statusFilter !== "all" && f.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hay = `${f.name} ${f.code} ${f.category}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [forms, activeCategory, scopeFilter, statusFilter, search])

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const total = forms.length
    const active = forms.filter((f) => f.status === "Active").length
    const anonymous = forms.filter((f) => f.anonymousAllowed).length
    const mandatory = forms.filter((f) => f.mandatory).length
    const questions = forms.reduce((sum, f) => sum + f.questions.length, 0)
    return { total, active, anonymous, mandatory, questions }
  }, [forms])

  // ---------- Handlers ----------
  const handleNew = () => {
    setEditing(null)
    setEditorOpen(true)
  }

  const handleEdit = (f: ExitInterviewForm) => {
    setEditing(f)
    setEditorOpen(true)
  }

  const handleClone = (f: ExitInterviewForm) => {
    const copy: ExitInterviewForm = {
      ...f,
      id: `ei-${Date.now()}`,
      name: `${f.name} (Copy)`,
      code: `${f.code}_COPY`,
      isDefault: false,
      version: 1,
      status: "Draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: f.questions.map((q) => ({ ...q, id: `q-${Date.now()}-${q.id}` })),
    }
    setForms((prev) => [copy, ...prev])
    toast.success(`Cloned "${f.name}"`)
  }

  const handlePreview = (f: ExitInterviewForm) => {
    setPreviewing(f)
    setPreviewOpen(true)
  }

  const handleDelete = (f: ExitInterviewForm) => {
    setForms((prev) => prev.filter((x) => x.id !== f.id))
    setDeleteTarget(null)
    toast.success(`Deleted "${f.name}"`)
  }

  const handleSave = (payload: ExitInterviewForm) => {
    setForms((prev) => {
      const idx = prev.findIndex((f) => f.id === payload.id)
      if (idx === -1) return [payload, ...prev]
      const next = [...prev]
      next[idx] = payload
      return next
    })
    toast.success(editing ? "Form updated" : "Form created", {
      description: `${payload.name} (${payload.code})`,
    })
  }

  // ============================================================================
  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Total Forms" value={stats.total} icon={MessageSquare} color="#e11d48" bg="#fff1f2" />
        <MiniStat label="Active" value={stats.active} icon={CheckCircle2} color="#10b981" bg="#ecfdf5" />
        <MiniStat label="Anonymous" value={stats.anonymous} icon={Lock} color="#8b5cf6" bg="#f5f3ff" />
        <MiniStat label="Total Questions" value={stats.questions} icon={ListOrdered} color="#0ea5e9" bg="#e0f2fe" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        {/* Category sidebar */}
        <CategorySidebar
          active={activeCategory}
          onSelect={setActiveCategory}
          counts={counts}
          total={forms.length}
        />

        {/* Main column */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* Filter card */}
          <Card className="shadow-sm border-border/60">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 min-w-0 max-w-md">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search forms, codes, categories…"
                    className="pl-9 h-9 bg-background"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={scopeFilter} onValueChange={setScopeFilter}>
                    <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Scope" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Scopes</SelectItem>
                      {SCOPE_TYPES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleNew} className="gap-1.5 gradient-rose text-primary-foreground">
                    <Plus className="h-4 w-4" /> New Form
                  </Button>
                </div>
              </div>
              {(activeCategory !== "all" || scopeFilter !== "all" || statusFilter !== "all" || search) && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  <span>Showing {filtered.length} of {forms.length} forms</span>
                  <Button
                    variant="ghost" size="sm" className="h-6 px-2 text-xs"
                    onClick={() => { setActiveCategory("all"); setScopeFilter("all"); setStatusFilter("all"); setSearch("") }}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Forms table */}
          <Card className="shadow-sm border-border/60 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-rose-600" />
                Exit Interview Forms
                <Badge variant="secondary" className="ml-1 font-normal">{filtered.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[640px]">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
                    <TableRow>
                      <TableHead className="min-w-[260px]">Form</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead className="text-center">Questions</TableHead>
                      <TableHead className="text-center">Anonymous</TableHead>
                      <TableHead className="text-center">Mandatory</TableHead>
                      <TableHead className="text-center">Default</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Version</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="py-12 text-center text-muted-foreground">
                          <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          No exit interview forms match the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((f) => {
                        const meta = CATEGORY_MAP[f.category] || { value: f.category, label: f.category, icon: Tag, color: "#64748b", short: "?" }
                        const Icon = meta.icon
                        return (
                          <TableRow
                            key={f.id}
                            className="cursor-pointer hover:bg-rose-50/40 dark:hover:bg-rose-950/10 transition-colors"
                            onClick={() => handlePreview(f)}
                          >
                            <TableCell>
                              <div className="flex items-start gap-2.5">
                                <span
                                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                                  style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                                >
                                  <Icon className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                  <div className="font-medium text-sm text-foreground">{f.name}</div>
                                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{f.code}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <CategoryBadge category={f.category} />
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-foreground/80">{f.scopeType}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-mono">{f.questions.length}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {f.anonymousAllowed ? (
                                <TintedBadge bg="#f5f3ff" fg="#7c3aed">
                                  <Lock className="h-3 w-3" /> Yes
                                </TintedBadge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {f.mandatory ? (
                                <TintedBadge bg="#fff1f2" fg="#e11d48">
                                  <ShieldCheck className="h-3 w-3" /> Yes
                                </TintedBadge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Optional</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {f.isDefault ? (
                                <TintedBadge bg="#fffbeb" fg="#d97706">
                                  <Star className="h-3 w-3" /> Yes
                                </TintedBadge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell><StatusBadge status={f.status} /></TableCell>
                            <TableCell className="text-center">
                              <span className="text-xs font-mono">v{f.version}</span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(f.updatedAt)}</TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleEdit(f)}>
                                    <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleClone(f)}>
                                    <Copy className="h-3.5 w-3.5 mr-2" /> Clone
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePreview(f)}>
                                    <Eye className="h-3.5 w-3.5 mr-2" /> Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-rose-600 focus:text-rose-700"
                                    onClick={() => setDeleteTarget(f)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
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
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Question type legend */}
          <Card className="shadow-sm border-border/60 bg-muted/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <ListOrdered className="h-4 w-4 text-rose-600" />
                <span className="text-sm font-semibold">Supported Question Types</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Q_TYPES.map((t) => (
                  <div key={t.value} className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5">
                    <QTypeBadge type={t.value} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Editor */}
      <FormEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editing}
        onSave={handleSave}
      />

      {/* Preview */}
      <FormPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        form={previewing}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              Delete Form?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span> ({deleteTarget?.code})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================================
//  Small sub-components
// ============================================================================

function MiniStat({
  label, value, icon: Icon, color, bg,
}: {
  label: string
  value: number
  icon: LucideIcon
  color: string
  bg: string
}) {
  return (
    <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold mt-0.5 tabular-nums">{value}</div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ backgroundColor: bg, color }}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  )
}

export default ExitInterviewsSection
