"use client"

// ============================================================================
//  WorkflowsSection — Onboarding Workflow Builder
//  Admins create/edit onboarding pipelines (boards) with deeply
//  customizable stages. The "engine" that drives the Kanban board.
// ============================================================================

import { useState, useMemo, useEffect } from "react"
import type { ReactNode, DragEvent } from "react"
import {
  Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  Circle, PlayCircle, CheckCircle2, ShieldCheck, Clock, Users, FileText,
  Zap, Star, ArrowLeft, LayoutGrid, Sparkles, Save, Hash, Calendar,
  Layers, AlertTriangle, Workflow as WorkflowIcon, Pencil, Search,
  Check, Loader2, Settings2,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PageHeader, StatCard, EmptyState, StatusBadge } from "@/components/hrms/ui"
import {
  OnboardingWorkflow, OnboardingStage, OnboardingTaskTemplate,
  STAGE_COLORS, STAGE_TYPE_META, STAGE_CATEGORIES, WORKFLOW_CATEGORIES,
  useFetch, apiPost, apiPatch, apiDelete, safeToast, safeParseJson,
} from "@/components/hrms/onboarding/shared"
import { cn } from "@/lib/utils"

// ============================================================================
//  Constants
// ============================================================================

const WORKFLOW_STATUSES = ["Active", "Draft", "Archived"]

const STAGE_TYPES = [
  { value: "start", label: "Start" },
  { value: "standard", label: "Standard" },
  { value: "gate", label: "Gate" },
  { value: "end", label: "End" },
]

const OWNER_TYPES = [
  { value: "assignee", label: "Assignee" },
  { value: "default", label: "Default Owner" },
  { value: "role", label: "By Role" },
  { value: "dynamic", label: "Dynamic" },
]

const CARD_COLOR_BY_OPTIONS = [
  { value: "stage", label: "Stage Color" },
  { value: "candidateType", label: "Candidate Type" },
  { value: "priority", label: "Priority" },
]

const TASK_PRIORITIES = ["Low", "Medium", "High", "Critical"]
const TASK_CATEGORIES = ["General", "Documentation", "IT Setup", "HR", "Admin", "Compliance", "Orientation"]

const PRESET_STAGES = [
  { name: "Application Received", code: "APP_RECV", color: "#22c55e", icon: "FileText", stageType: "start", category: "intake", slaDays: 1, isMilestone: false, isRequired: true },
  { name: "Document Verification", code: "DOC_VERIFY", color: "#0ea5e9", icon: "ShieldCheck", stageType: "standard", category: "process", slaDays: 3, isMilestone: false, isRequired: true },
  { name: "Offer Rollout", code: "OFFER", color: "#f59e0b", icon: "FileText", stageType: "gate", category: "review", slaDays: 2, isMilestone: true, isRequired: true },
  { name: "Day 1 Onboarding", code: "DAY1", color: "#10b981", icon: "CheckCircle2", stageType: "end", category: "completion", slaDays: 1, isMilestone: true, isRequired: true },
]

// ============================================================================
//  Helpers
// ============================================================================

function toCode(name: string): string {
  return (
    name.trim()
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 32) || `WF_${Date.now().toString().slice(-4)}`
  )
}

function docsToText(docs?: string | null): string {
  const arr = safeParseJson<string[]>(docs, [])
  return Array.isArray(arr) ? arr.join(", ") : ""
}

function textToDocs(text: string): string[] {
  return text.split(",").map((s) => s.trim()).filter(Boolean)
}

function jsonToText<T>(str: string | null | undefined, fallback: T): string {
  const v = safeParseJson<T>(str, fallback)
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return ""
  }
}

function tryParseJsonText(text: string): { ok: true; value: any } | { ok: false; error: string } {
  if (!text.trim()) return { ok: true, value: null }
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (e: any) {
    return { ok: false, error: e?.message || "Invalid JSON" }
  }
}

// ============================================================================
//  Small UI primitives
// ============================================================================

function ColorSwatch({ color, selected, onClick, size = "md" }: {
  color: string
  selected?: boolean
  onClick?: (c: string) => void
  size?: "sm" | "md"
}) {
  const dim = size === "sm" ? "h-5 w-5" : "h-7 w-7"
  return (
    <button
      type="button"
      onClick={() => onClick?.(color)}
      className={cn(
        "rounded-full border-2 transition-all hover:scale-110 cursor-pointer",
        dim,
        selected
          ? "border-foreground ring-2 ring-foreground/20"
          : "border-white/60 dark:border-background/60 shadow-sm"
      )}
      style={{ backgroundColor: color }}
      aria-label={`Color ${color}`}
    />
  )
}

function ColorSwatches({ value, onChange, size = "md" }: {
  value?: string
  onChange: (c: string) => void
  size?: "sm" | "md"
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {STAGE_COLORS.map((c) => (
        <ColorSwatch
          key={c.value}
          color={c.value}
          selected={value === c.value}
          onClick={onChange}
          size={size}
        />
      ))}
    </div>
  )
}

function SwitchRow({ label, description, checked, onChange }: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

const ICON_MAP: Record<string, any> = {
  PlayCircle, Circle, CheckCircle2, ShieldCheck, Clock, Users, FileText,
  Zap, Star, LayoutGrid, Hash, Calendar, Layers, Sparkles,
}

function IconByName({ name, className }: { name?: string | null; className?: string }) {
  const Ic = (name && ICON_MAP[name]) || Circle
  return <Ic className={className} />
}

function StageTypeIcon({ type, className }: { type: string; className?: string }) {
  const meta = STAGE_TYPE_META[type] || STAGE_TYPE_META.standard
  const Ic = ICON_MAP[meta.icon] || Circle
  return <Ic className={className} style={{ color: meta.color }} />
}

function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-xs font-medium text-foreground">{children}</Label>
      {hint && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground cursor-help text-[10px]">ⓘ</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{hint}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

// ============================================================================
//  New Workflow Dialog
// ============================================================================

function NewWorkflowDialog({ open, onOpenChange, onCreated }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (wf: OnboardingWorkflow) => void
}) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("General")
  const [color, setColor] = useState("#10b981")
  const [icon, setIcon] = useState("LayoutGrid")
  const [useTemplate, setUseTemplate] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleNameChange = (v: string) => {
    setName(v)
    setCode(toCode(v))
  }

  const reset = () => {
    setName(""); setCode(""); setDescription(""); setCategory("General")
    setColor("#10b981"); setIcon("LayoutGrid"); setUseTemplate(true)
  }

  const handleCreate = async () => {
    if (!name.trim() || !code.trim()) return
    setSaving(true)
    const payload: any = {
      name: name.trim(),
      code: code.trim(),
      description: description.trim() || undefined,
      category,
      color,
      icon: icon || "LayoutGrid",
    }
    if (useTemplate) payload.stages = PRESET_STAGES
    try {
      const wf = await safeToast(
        apiPost("/api/onboarding-workflows", payload),
        "Workflow created",
        "Could not create workflow"
      )
      reset()
      onOpenChange(false)
      onCreated(wf as OnboardingWorkflow)
    } catch {
      /* toast shown */
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" /> New Onboarding Workflow
          </DialogTitle>
          <DialogDescription>Define a customizable pipeline that drives a Kanban board.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wf-name">Name</Label>
              <Input id="wf-name" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Lateral Onboarding" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wf-code">Code</Label>
              <Input id="wf-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="LATERAL_ONB" className="font-mono text-xs" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wf-desc">Description</Label>
            <Textarea id="wf-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Brief description of this workflow" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORKFLOW_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wf-icon">Icon (lucide name)</Label>
              <Input id="wf-icon" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="LayoutGrid" className="font-mono text-xs" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <ColorSwatches value={color} onChange={setColor} />
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <SwitchRow
              label="Start with default template"
              description="Pre-loads 4 stages: Application → Document Verification → Offer → Day 1"
              checked={useTemplate}
              onChange={setUseTemplate}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim() || !code.trim()} className="gap-1.5">
            <Plus className="h-4 w-4" /> {saving ? "Creating..." : "Create Workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Task Template row + add form
// ============================================================================

function TaskTemplateRow({ task, stageId, workflowId, onChanged }: {
  task: OnboardingTaskTemplate
  stageId: string
  workflowId: string
  onChanged: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  const priorityColor: Record<string, string> = {
    Low: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
    Medium: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    High: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    Critical: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  }

  const handleDelete = async () => {
    setDeleting(true)
    // No dedicated DELETE endpoint per current API surface.
    // Attempt a graceful DELETE on the resource — surface friendly error if unsupported.
    try {
      await safeToast(
        apiDelete(`/api/onboarding-workflows/${workflowId}/stages/${stageId}/tasks/${task.id}`),
        "Task removed",
        "Task deletion is not supported by the current API"
      )
      onChanged()
    } catch {
      /* toast shown */
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-start gap-2 rounded-md border border-border/60 bg-background px-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">{task.title}</span>
          {task.isBlocking && (
            <Badge variant="outline" className="text-[10px] py-0 h-4 border-rose-300 text-rose-600 dark:border-rose-500/40 dark:text-rose-400">
              Blocking
            </Badge>
          )}
          <Badge variant="secondary" className={cn("text-[10px] py-0 h-4", priorityColor[task.priority] || "")}>
            {task.priority}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
          <span className="font-mono">{task.category}</span>
          <span>·</span>
          <span>{task.daysFromStage}d from stage start</span>
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-rose-600"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete task template</TooltipContent>
      </Tooltip>
    </div>
  )
}

function TaskTemplateAddForm({ stageId, workflowId, onAdded }: {
  stageId: string
  workflowId: string
  onAdded: () => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [daysFromStage, setDaysFromStage] = useState(0)
  const [priority, setPriority] = useState("Medium")
  const [isBlocking, setIsBlocking] = useState(false)
  const [category, setCategory] = useState("General")
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setTitle(""); setDaysFromStage(0); setPriority("Medium")
    setIsBlocking(false); setCategory("General")
  }

  const handleAdd = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await safeToast(
        apiPost(`/api/onboarding-workflows/${workflowId}/stages/${stageId}/tasks`, {
          title: title.trim(),
          daysFromStage: Number(daysFromStage) || 0,
          priority,
          isBlocking,
          category,
          order: 0,
        }),
        "Task added",
        "Could not add task"
      )
      reset()
      setOpen(false)
      onAdded()
    } catch {
      /* toast shown */
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="w-full border-dashed gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Add task template
      </Button>
    )
  }

  return (
    <div className="rounded-md border border-emerald-200/60 bg-emerald-500/5 p-3 space-y-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title (e.g. Create email account)"
        className="h-8 text-sm"
        autoFocus
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Days from stage start</Label>
          <Input
            type="number"
            value={daysFromStage}
            onChange={(e) => setDaysFromStage(Number(e.target.value))}
            min={0}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-8 text-sm w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-sm w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Switch checked={isBlocking} onCheckedChange={setIsBlocking} id={`blk-${stageId}`} />
          <Label htmlFor={`blk-${stageId}`} className="text-xs">Blocking</Label>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => { reset(); setOpen(false) }}>Cancel</Button>
        <Button size="sm" onClick={handleAdd} disabled={saving || !title.trim()} className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add task
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
//  Stage Card — deep customization form (collapsed/expanded)
// ============================================================================

interface StageFormState {
  name: string
  code: string
  description: string
  color: string
  icon: string
  stageType: string
  category: string
  slaDays: string
  slaWarningDays: string
  isMilestone: boolean
  wipLimit: string
  blockOnOverflow: boolean
  ownerType: string
  ownerRole: string
  defaultOwnerId: string
  entryGatesText: string
  exitGatesText: string
  automationsText: string
  requiresForm: boolean
  formSchemaId: string
  requiredDocumentsText: string
  isSkippable: boolean
  isRequired: boolean
  autoAdvance: boolean
}

function stageToFormState(s: OnboardingStage): StageFormState {
  return {
    name: s.name || "",
    code: s.code || "",
    description: s.description || "",
    color: s.color || "#64748b",
    icon: s.icon || "Circle",
    stageType: s.stageType || "standard",
    category: s.category || "process",
    slaDays: s.slaDays == null ? "" : String(s.slaDays),
    slaWarningDays: s.slaWarningDays == null ? "" : String(s.slaWarningDays),
    isMilestone: !!s.isMilestone,
    wipLimit: s.wipLimit == null ? "" : String(s.wipLimit),
    blockOnOverflow: !!s.blockOnOverflow,
    ownerType: s.ownerType || "assignee",
    ownerRole: s.ownerRole || "",
    defaultOwnerId: s.defaultOwnerId || "",
    entryGatesText: jsonToText<any[]>(s.entryGates, []),
    exitGatesText: jsonToText<any[]>(s.exitGates, []),
    automationsText: jsonToText<any[]>(s.automations, []),
    requiresForm: !!s.requiresForm,
    formSchemaId: s.formSchemaId || "",
    requiredDocumentsText: docsToText(s.requiredDocuments),
    isSkippable: !!s.isSkippable,
    isRequired: s.isRequired ?? true,
    autoAdvance: !!s.autoAdvance,
  }
}

function StageCard({
  stage, order, total, workflowId, onSaved, onDeleted, onMoveUp, onMoveDown,
}: {
  stage: OnboardingStage
  order: number
  total: number
  workflowId: string
  onSaved: () => void
  onDeleted: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState<StageFormState>(() => stageToFormState(stage))
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [jsonError, setJsonError] = useState<string | null>(null)

  // Re-sync form when stage prop changes (e.g. after reload)
  useEffect(() => {
    setForm(stageToFormState(stage))
  }, [stage.id, stage.updatedAt])

  const set = <K extends keyof StageFormState>(k: K, v: StageFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const typeMeta = STAGE_TYPE_META[form.stageType] || STAGE_TYPE_META.standard

  const handleSave = async () => {
    setSaving(true)
    setJsonError(null)

    // Validate JSON textareas
    const entryParsed = tryParseJsonText(form.entryGatesText)
    if (!entryParsed.ok) {
      setJsonError(`Entry Gates: ${entryParsed.error}`)
      setSaving(false)
      return
    }
    const exitParsed = tryParseJsonText(form.exitGatesText)
    if (!exitParsed.ok) {
      setJsonError(`Exit Gates: ${exitParsed.error}`)
      setSaving(false)
      return
    }
    const autoParsed = tryParseJsonText(form.automationsText)
    if (!autoParsed.ok) {
      setJsonError(`Automations: ${autoParsed.error}`)
      setSaving(false)
      return
    }

    const docs = textToDocs(form.requiredDocumentsText)

    const payload: any = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || null,
      color: form.color,
      icon: form.icon || "Circle",
      stageType: form.stageType,
      category: form.category,
      slaDays: form.slaDays === "" ? null : Number(form.slaDays),
      slaWarningDays: form.slaWarningDays === "" ? null : Number(form.slaWarningDays),
      isMilestone: form.isMilestone,
      wipLimit: form.wipLimit === "" ? null : Number(form.wipLimit),
      blockOnOverflow: form.blockOnOverflow,
      ownerType: form.ownerType,
      ownerRole: form.ownerRole.trim() || null,
      defaultOwnerId: form.defaultOwnerId.trim() || null,
      entryGates: entryParsed.value,
      exitGates: exitParsed.value,
      automations: autoParsed.value,
      requiresForm: form.requiresForm,
      formSchemaId: form.formSchemaId.trim() || null,
      requiredDocuments: docs.length ? docs : null,
      isSkippable: form.isSkippable,
      isRequired: form.isRequired,
      autoAdvance: form.autoAdvance,
    }

    try {
      await safeToast(
        apiPatch(`/api/onboarding-workflows/${workflowId}/stages/${stage.id}`, payload),
        "Stage saved",
        "Could not save stage"
      )
      onSaved()
    } catch {
      /* toast shown */
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await safeToast(
        apiDelete(`/api/onboarding-workflows/${workflowId}/stages/${stage.id}`),
        "Stage deleted",
        "Could not delete stage"
      )
      onDeleted()
    } catch {
      /* toast shown */
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-soft overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex flex-col">
          <Button
            variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground"
            onClick={onMoveUp} disabled={order === 0}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground"
            onClick={onMoveDown} disabled={order === total - 1}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>

        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />

        <span className="text-xs font-mono text-muted-foreground w-6 text-center">{order + 1}</span>

        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: form.color }} />
        <StageTypeIcon type={form.stageType} className="h-4 w-4 shrink-0" />

        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex-1 min-w-0 text-left"
        >
          <span className="text-sm font-semibold text-foreground truncate block">
            {form.name || "(unnamed stage)"}
          </span>
        </button>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <Badge variant="outline" className="text-[10px] py-0 h-5 font-mono" style={{ color: typeMeta.color, borderColor: typeMeta.color + "55" }}>
            {typeMeta.label}
          </Badge>
          {form.slaDays !== "" && (
            <Tooltip><TooltipTrigger asChild>
              <Badge variant="secondary" className="text-[10px] py-0 h-5 gap-0.5">
                <Clock className="h-3 w-3" /> {form.slaDays}d
              </Badge>
            </TooltipTrigger><TooltipContent>SLA: {form.slaDays} days</TooltipContent></Tooltip>
          )}
          {form.wipLimit !== "" && (
            <Tooltip><TooltipTrigger asChild>
              <Badge variant="secondary" className="text-[10px] py-0 h-5 gap-0.5">
                <Layers className="h-3 w-3" /> WIP {form.wipLimit}
              </Badge>
            </TooltipTrigger><TooltipContent>WIP limit: {form.wipLimit}</TooltipContent></Tooltip>
          )}
          {form.isMilestone && (
            <Tooltip><TooltipTrigger asChild>
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            </TooltipTrigger><TooltipContent>Milestone stage</TooltipContent></Tooltip>
          )}
        </div>

        <Button
          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Expanded form */}
      {expanded && (
        <div className="border-t border-border/60 bg-muted/20 p-4 space-y-5">
          {/* Basics */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <Circle className="h-3 w-3" /> Basics
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Code</Label>
                <Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className="h-8 text-sm font-mono" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Stage Type</Label>
                <Select value={form.stageType} onValueChange={(v) => set("stageType", v)}>
                  <SelectTrigger className="h-8 text-sm w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger className="h-8 text-sm w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Icon (lucide)</Label>
                <Input value={form.icon} onChange={(e) => set("icon", e.target.value)} className="h-8 text-sm font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color</Label>
                <ColorSwatches value={form.color} onChange={(c) => set("color", c)} size="sm" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Timing & Capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Timing
              </h4>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">SLA days (blank = none)</Label>
                  <Input type="number" min={0} value={form.slaDays} onChange={(e) => set("slaDays", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SLA warning days</Label>
                  <Input type="number" min={0} value={form.slaWarningDays} onChange={(e) => set("slaWarningDays", e.target.value)} className="h-8 text-sm" />
                </div>
                <SwitchRow label="Milestone" description="Marks a key stage in the journey" checked={form.isMilestone} onChange={(v) => set("isMilestone", v)} />
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Layers className="h-3 w-3" /> Capacity
              </h4>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">WIP limit (blank = unlimited)</Label>
                  <Input type="number" min={0} value={form.wipLimit} onChange={(e) => set("wipLimit", e.target.value)} className="h-8 text-sm" />
                </div>
                <SwitchRow label="Block on overflow" description="Prevent new cards when WIP is exceeded" checked={form.blockOnOverflow} onChange={(v) => set("blockOnOverflow", v)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Ownership */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <Users className="h-3 w-3" /> Ownership
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Owner type</Label>
                <Select value={form.ownerType} onValueChange={(v) => set("ownerType", v)}>
                  <SelectTrigger className="h-8 text-sm w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OWNER_TYPES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Owner role</Label>
                <Input value={form.ownerRole} onChange={(e) => set("ownerRole", e.target.value)} placeholder="e.g. HR_ADMIN" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Default owner ID</Label>
                <Input value={form.defaultOwnerId} onChange={(e) => set("defaultOwnerId", e.target.value)} placeholder="employee id" className="h-8 text-sm font-mono" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Gates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <FieldLabel hint='JSON array of gate rules, e.g. [{"type":"approval","role":"HR"}]'>Entry Gates (JSON)</FieldLabel>
              <Textarea value={form.entryGatesText} onChange={(e) => set("entryGatesText", e.target.value)} rows={4} className="text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <FieldLabel hint="JSON array of gate rules required to leave this stage">Exit Gates (JSON)</FieldLabel>
              <Textarea value={form.exitGatesText} onChange={(e) => set("exitGatesText", e.target.value)} rows={4} className="text-xs font-mono" />
            </div>
          </div>

          <Separator />

          {/* Requirements */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Requirements
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <SwitchRow label="Requires form" checked={form.requiresForm} onChange={(v) => set("requiresForm", v)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Form schema ID</Label>
                <Input value={form.formSchemaId} onChange={(e) => set("formSchemaId", e.target.value)} placeholder="form schema id" className="h-8 text-sm font-mono" disabled={!form.requiresForm} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Required documents (comma-sep)</Label>
                <Input value={form.requiredDocumentsText} onChange={(e) => set("requiredDocumentsText", e.target.value)} placeholder="PAN, Aadhaar, Photo" className="h-8 text-sm" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Automations */}
          <div className="space-y-1">
            <FieldLabel hint='JSON array of automation steps, e.g. [{"trigger":"onEnter","action":"sendEmail","template":"welcome"}]'>
              <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> Automations (JSON)</span>
            </FieldLabel>
            <Textarea value={form.automationsText} onChange={(e) => set("automationsText", e.target.value)} rows={4} className="text-xs font-mono" />
          </div>

          <Separator />

          {/* Behavior */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" /> Behavior
            </h4>
            <div className="grid grid-cols-1 gap-1">
              <SwitchRow label="Skippable" description="Allow candidates to bypass this stage" checked={form.isSkippable} onChange={(v) => set("isSkippable", v)} />
              <SwitchRow label="Required" description="Stage must be completed for onboarding to finish" checked={form.isRequired} onChange={(v) => set("isRequired", v)} />
              <SwitchRow label="Auto-advance" description="Automatically advance to next stage when gates pass" checked={form.autoAdvance} onChange={(v) => set("autoAdvance", v)} />
            </div>
          </div>

          <Separator />

          {/* Task Templates */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" /> Task Templates
            </h4>
            <div className="space-y-2">
              {stage.taskTemplates && stage.taskTemplates.length > 0 ? (
                stage.taskTemplates.map((t) => (
                  <TaskTemplateRow
                    key={t.id}
                    task={t}
                    stageId={stage.id}
                    workflowId={workflowId}
                    onChanged={onSaved}
                  />
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic py-1">No task templates yet.</p>
              )}
              <TaskTemplateAddForm stageId={stage.id} workflowId={workflowId} onAdded={onSaved} />
            </div>
          </div>

          {/* Error + actions */}
          {jsonError && (
            <div className="flex items-center gap-2 rounded-md border border-rose-300 bg-rose-50 dark:bg-rose-500/10 dark:border-rose-500/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-mono">{jsonError}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghost" size="sm"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete stage
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save stage
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete stage "{form.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the stage and its task templates. Candidates currently in this stage may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
    </div>
  )
}

// ============================================================================
//  Workflow Editor — left meta panel + right stages list
// ============================================================================

function WorkflowEditor({ workflow, onBack, onChanged }: {
  workflow: OnboardingWorkflow
  onBack: () => void
  onChanged: () => void
}) {
  const [meta, setMeta] = useState({
    name: workflow.name,
    description: workflow.description || "",
    status: workflow.status,
    category: workflow.category,
    icon: workflow.icon,
    color: workflow.color,
    isDefault: workflow.isDefault,
    cardColorBy: workflow.cardColorBy,
    showSla: workflow.showSla,
    showOwner: workflow.showOwner,
    showTaskCount: workflow.showTaskCount,
    allowBackward: workflow.allowBackward,
  })
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [stages, setStages] = useState<OnboardingStage[]>(workflow.stages || [])
  const [addingStage, setAddingStage] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  // Re-sync when workflow prop changes
  useEffect(() => {
    setMeta({
      name: workflow.name,
      description: workflow.description || "",
      status: workflow.status,
      category: workflow.category,
      icon: workflow.icon,
      color: workflow.color,
      isDefault: workflow.isDefault,
      cardColorBy: workflow.cardColorBy,
      showSla: workflow.showSla,
      showOwner: workflow.showOwner,
      showTaskCount: workflow.showTaskCount,
      allowBackward: workflow.allowBackward,
    })
    setStages(workflow.stages || [])
  }, [workflow.id, workflow.updatedAt])

  const patchMeta = async (partial: Record<string, any>, label?: string) => {
    setSaveState("saving")
    try {
      await safeToast(
        apiPatch(`/api/onboarding-workflows/${workflow.id}`, partial),
        label ? `${label} updated` : "Workflow updated",
        "Could not update workflow"
      )
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 1500)
      onChanged()
    } catch {
      setSaveState("idle")
    }
  }

  const updateMeta = <K extends keyof typeof meta>(k: K, v: (typeof meta)[K]) => {
    setMeta((m) => ({ ...m, [k]: v }))
  }

  // Debounced name/description save on blur
  const saveName = () => {
    if (meta.name.trim() && meta.name !== workflow.name) patchMeta({ name: meta.name.trim() }, "Name")
  }
  const saveDescription = () => {
    if (meta.description !== (workflow.description || "")) patchMeta({ description: meta.description || null }, "Description")
  }
  const saveIcon = () => {
    if (meta.icon !== workflow.icon) patchMeta({ icon: meta.icon || "LayoutGrid" }, "Icon")
  }

  // ---- Stage operations ----
  const handleAddStage = async () => {
    setAddingStage(true)
    const n = (stages.length || 0) + 1
    try {
      await safeToast(
        apiPost(`/api/onboarding-workflows/${workflow.id}/stages`, {
          name: `New Stage ${n}`,
          code: `STAGE_${n}`,
          color: STAGE_COLORS[n % STAGE_COLORS.length].value,
          icon: "Circle",
          stageType: "standard",
          category: "process",
        }),
        "Stage added",
        "Could not add stage"
      )
      onChanged()
    } catch {
      /* toast shown */
    } finally {
      setAddingStage(false)
    }
  }

  const moveStage = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= stages.length) return
    const next = [...stages]
    const [moved] = next.splice(index, 1)
    next.splice(newIndex, 0, moved)
    const orderedIds = next.map((s) => s.id)
    setStages(next) // optimistic
    try {
      await safeToast(
        apiPatch(`/api/onboarding-workflows/${workflow.id}/stages`, { orderedIds }),
        undefined, "Could not reorder stages"
      )
      onChanged()
    } catch {
      /* toast shown */
      onChanged()
    }
  }

  const handleDragStart = (id: string) => setDraggedId(id)
  const handleDragOver = (e: DragEvent, overId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === overId) return
  }
  const handleDrop = async (overId: string) => {
    if (!draggedId || draggedId === overId) { setDraggedId(null); return }
    const fromIdx = stages.findIndex((s) => s.id === draggedId)
    const toIdx = stages.findIndex((s) => s.id === overId)
    if (fromIdx < 0 || toIdx < 0) { setDraggedId(null); return }
    const next = [...stages]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    const orderedIds = next.map((s) => s.id)
    setStages(next)
    setDraggedId(null)
    try {
      await safeToast(
        apiPatch(`/api/onboarding-workflows/${workflow.id}/stages`, { orderedIds }),
        undefined, "Could not reorder stages"
      )
      onChanged()
    } catch {
      onChanged()
    }
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 shrink-0">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
          <Input
            value={meta.name}
            onChange={(e) => updateMeta("name", e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
            className="h-9 text-base font-semibold border-transparent hover:border-input focus-visible:border-input bg-transparent px-1 max-w-md"
          />
          <Badge variant="outline" className="font-mono text-[10px] shrink-0">{workflow.code}</Badge>
          <StatusBadge status={meta.status} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SaveIndicator state={saveState} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => patchMeta({ isDefault: true }, "Default workflow")}>
                <Star className={cn("h-3.5 w-3.5", meta.isDefault ? "fill-amber-400 text-amber-500" : "")} />
                {meta.isDefault ? "Default" : "Set default"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Make this the default workflow for new candidates</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT — workflow properties */}
        <div className="lg:col-span-2">
          <Card className="border-border/60 shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Settings2 className="h-4 w-4 text-emerald-500" /> Workflow Properties
              </CardTitle>
              <CardDescription className="text-xs">Configure how this pipeline behaves and looks.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Accordion type="multiple" defaultValue={["general"]} className="w-full">
                {/* General */}
                <AccordionItem value="general">
                  <AccordionTrigger className="text-sm">General</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={meta.description}
                        onChange={(e) => updateMeta("description", e.target.value)}
                        onBlur={saveDescription}
                        rows={2}
                        className="text-sm"
                        placeholder="What is this workflow for?"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Category</Label>
                        <Select
                          value={meta.category}
                          onValueChange={(v) => { updateMeta("category", v); patchMeta({ category: v }, "Category") }}
                        >
                          <SelectTrigger className="h-8 text-sm w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {WORKFLOW_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Status</Label>
                        <Select
                          value={meta.status}
                          onValueChange={(v) => { updateMeta("status", v); patchMeta({ status: v }, "Status") }}
                        >
                          <SelectTrigger className="h-8 text-sm w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {WORKFLOW_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <SwitchRow
                      label="Default workflow"
                      description="Used when no workflow is explicitly chosen"
                      checked={meta.isDefault}
                      onChange={(v) => { updateMeta("isDefault", v); patchMeta({ isDefault: v }, "Default workflow") }}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Appearance */}
                <AccordionItem value="appearance">
                  <AccordionTrigger className="text-sm">Appearance</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Icon (lucide name)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={meta.icon}
                          onChange={(e) => updateMeta("icon", e.target.value)}
                          onBlur={saveIcon}
                          className="h-8 text-sm font-mono"
                          placeholder="LayoutGrid"
                        />
                        <div className="grid h-8 w-8 place-items-center rounded-md bg-muted">
                          <IconByName name={meta.icon} className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <ColorSwatches
                        value={meta.color}
                        onChange={(c) => { updateMeta("color", c); patchMeta({ color: c }, "Color") }}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Board Settings */}
                <AccordionItem value="board">
                  <AccordionTrigger className="text-sm">Board Settings</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Card color by</Label>
                      <Select
                        value={meta.cardColorBy}
                        onValueChange={(v) => { updateMeta("cardColorBy", v); patchMeta({ cardColorBy: v }, "Card color") }}
                      >
                        <SelectTrigger className="h-8 text-sm w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CARD_COLOR_BY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-lg border border-border/60 divide-y divide-border/60">
                      <SwitchRow label="Show SLA" checked={meta.showSla} onChange={(v) => { updateMeta("showSla", v); patchMeta({ showSla: v }) }} />
                      <SwitchRow label="Show owner" checked={meta.showOwner} onChange={(v) => { updateMeta("showOwner", v); patchMeta({ showOwner: v }) }} />
                      <SwitchRow label="Show task count" checked={meta.showTaskCount} onChange={(v) => { updateMeta("showTaskCount", v); patchMeta({ showTaskCount: v }) }} />
                      <SwitchRow label="Allow backward moves" description="Let candidates move to a previous stage" checked={meta.allowBackward} onChange={(v) => { updateMeta("allowBackward", v); patchMeta({ allowBackward: v }) }} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — stages list */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-emerald-500" /> Stages
                <Badge variant="secondary" className="text-[10px] h-5 ml-1">{stages.length}</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">Drag to reorder, click a stage to customize.</p>
            </div>
            <Button size="sm" onClick={handleAddStage} disabled={addingStage} className="gap-1.5">
              {addingStage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add Stage
            </Button>
          </div>

          {stages.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No stages yet"
              description="Add your first stage to start building the pipeline."
              action={
                <Button size="sm" onClick={handleAddStage} disabled={addingStage} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add first stage
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {stages.map((s, i) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => handleDragStart(s.id)}
                  onDragOver={(e) => handleDragOver(e, s.id)}
                  onDrop={() => handleDrop(s.id)}
                  className={cn(
                    "transition-opacity",
                    draggedId === s.id && "opacity-40"
                  )}
                >
                  <StageCard
                    stage={s}
                    order={i}
                    total={stages.length}
                    workflowId={workflow.id}
                    onSaved={onChanged}
                    onDeleted={onChanged}
                    onMoveUp={() => moveStage(i, -1)}
                    onMoveDown={() => moveStage(i, 1)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "saving") {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-500/40">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </Badge>
    )
  }
  if (state === "saved") {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-500/40">
        <Check className="h-3 w-3" /> Saved
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> All changes saved
    </Badge>
  )
}

// ============================================================================
//  Workflow Card (grid item)
// ============================================================================

function WorkflowCard({ wf, onOpen, onDelete, onSetDefault }: {
  wf: OnboardingWorkflow
  onOpen: () => void
  onDelete: () => void
  onSetDefault: () => void
}) {
  const stageCount = wf._count?.stages ?? wf.stages?.length ?? 0
  const candidateCount = wf._count?.candidates ?? 0
  const stages = wf.stages || []

  return (
    <Card className="group relative overflow-hidden border-border/60 shadow-soft hover:shadow-card transition-all hover:-translate-y-0.5 cursor-pointer" onClick={onOpen}>
      {/* Color stripe */}
      <div className="h-1.5 w-full" style={{ backgroundColor: wf.color }} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white"
            style={{ backgroundColor: wf.color }}
          >
            <IconByName name={wf.icon} className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-foreground truncate">{wf.name}</h3>
              {wf.isDefault && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>Default workflow</TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {wf.description || "No description"}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onOpen}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              {!wf.isDefault && (
                <DropdownMenuItem onClick={onSetDefault}>
                  <Star className="h-3.5 w-3.5 mr-2" /> Set as default
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-500/10">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-[10px] py-0 h-4">{wf.code}</Badge>
          <Badge variant="secondary" className="text-[10px] py-0 h-4">{wf.category}</Badge>
          <StatusBadge status={wf.status} />
        </div>

        {/* Stage mini-preview */}
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
              {stageCount} stage{stageCount === 1 ? "" : "s"} · {candidateCount} candidate{candidateCount === 1 ? "" : "s"}
            </span>
          </div>
          {stages.length > 0 ? (
            <div className="flex items-center gap-1 flex-wrap">
              {stages.slice(0, 12).map((s, i) => (
                <Tooltip key={s.id}>
                  <TooltipTrigger asChild>
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-background"
                      style={{ backgroundColor: s.color }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <span className="text-xs">{i + 1}. {s.name}</span>
                  </TooltipContent>
                </Tooltip>
              ))}
              {stages.length > 12 && (
                <span className="text-[10px] text-muted-foreground ml-1">+{stages.length - 12}</span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">No stages configured</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
//  WorkflowsSection — main exported component
// ============================================================================

export function WorkflowsSection() {
  const { data, loading, error, reload } = useFetch<{ items: OnboardingWorkflow[] }>(
    "/api/onboarding-workflows"
  )

  const [search, setSearch] = useState("")
  const [newOpen, setNewOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OnboardingWorkflow | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Editor detail fetch (only when a workflow is selected)
  const {
    data: detailData,
    loading: detailLoading,
    error: detailError,
    reload: detailReload,
  } = useFetch<OnboardingWorkflow>(
    selectedId ? `/api/onboarding-workflows/${selectedId}` : null
  )

  const workflows = data?.items || []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workflows
    return workflows.filter((w) =>
      w.name.toLowerCase().includes(q) ||
      w.code.toLowerCase().includes(q) ||
      w.category.toLowerCase().includes(q)
    )
  }, [workflows, search])

  const totals = useMemo(() => {
    const active = workflows.filter((w) => w.status === "Active").length
    const stages = workflows.reduce((sum, w) => sum + (w._count?.stages ?? w.stages?.length ?? 0), 0)
    const candidates = workflows.reduce((sum, w) => sum + (w._count?.candidates ?? 0), 0)
    return { total: workflows.length, active, stages, candidates }
  }, [workflows])

  const handleSetDefault = async (wf: OnboardingWorkflow) => {
    try {
      await safeToast(
        apiPatch(`/api/onboarding-workflows/${wf.id}`, { isDefault: true }),
        `${wf.name} set as default`,
        "Could not set default"
      )
      reload()
    } catch { /* toast shown */ }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await safeToast(
        apiDelete(`/api/onboarding-workflows/${deleteTarget.id}`),
        "Workflow deleted",
        "Could not delete workflow"
      )
      setDeleteTarget(null)
      reload()
    } catch { /* toast shown */ }
    finally { setDeleting(false) }
  }

  // ----- Editor view -----
  if (selectedId) {
    if (detailLoading && !detailData) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          <span className="ml-2 text-sm text-muted-foreground">Loading workflow…</span>
        </div>
      )
    }
    if (detailError || !detailData) {
      return (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <EmptyState
            icon={AlertTriangle}
            title="Could not load workflow"
            description={detailError || "Unknown error"}
            action={<Button size="sm" onClick={detailReload}>Retry</Button>}
          />
        </div>
      )
    }
    return (
      <WorkflowEditor
        workflow={detailData}
        onBack={() => setSelectedId(null)}
        onChanged={detailReload}
      />
    )
  }

  // ----- List view -----
  return (
    <div className="space-y-4">
      <PageHeader
        title="Onboarding Workflows"
        description="Design customizable onboarding pipelines that drive Kanban boards"
        icon={WorkflowIcon}
        badge={<Badge variant="secondary" className="text-xs">{totals.total} total</Badge>}
        actions={
          <Button size="sm" onClick={() => setNewOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Workflow
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Workflows" value={totals.total} icon={WorkflowIcon} accent="emerald" />
        <StatCard label="Active" value={totals.active} icon={PlayCircle} accent="cyan" />
        <StatCard label="Total Stages" value={totals.stages} icon={Layers} accent="amber" />
        <StatCard label="Total Candidates" value={totals.candidates} icon={Users} accent="fuchsia" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, category…"
            className="pl-9 h-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={reload} className="gap-1.5">
            <Loader2 className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setNewOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Workflow
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/60 shadow-soft">
              <div className="h-1.5 w-full bg-muted animate-pulse" />
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="h-2 w-full rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={AlertTriangle}
          title="Could not load workflows"
          description={error}
          action={<Button size="sm" onClick={reload}>Retry</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={WorkflowIcon}
          title={search ? "No workflows match your search" : "No workflows yet"}
          description={search ? "Try a different search term." : "Create your first onboarding workflow to get started."}
          action={
            <Button size="sm" onClick={() => setNewOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Workflow
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((wf) => (
            <WorkflowCard
              key={wf.id}
              wf={wf}
              onOpen={() => setSelectedId(wf.id)}
              onDelete={() => setDeleteTarget(wf)}
              onSetDefault={() => handleSetDefault(wf)}
            />
          ))}
        </div>
      )}

      {/* New workflow dialog */}
      <NewWorkflowDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={() => {
          reload()
          // Auto-open the new workflow in the editor
          // (we don't have its id directly here; reload will surface it on next render)
        }}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workflow, all its stages, task templates, and related candidate instances. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? "Deleting…" : "Delete workflow"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default WorkflowsSection
