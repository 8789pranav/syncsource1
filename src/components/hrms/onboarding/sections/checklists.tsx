"use client"

// ============================================================================
//  ChecklistsSection — Onboarding spec #10
//  Reusable task groups assigned per onboarding stage. Each checklist defines
//  who does what, by when. 9 categories (Candidate, HR, Manager, IT, Admin,
//  Payroll, Finance, Training, Compliance). Per checklist: name, code,
//  description, scope, default flag, status, version. Per task: 16 fields
//  (owner, due-date rule with offset, priority, mandatory/blocking/
//  attachment/comment/approval flags, auto-complete condition, reminder/
//  escalation rules, stage mapping, status) and drag-reorder.
// ============================================================================

import * as React from "react"
import { useState, useMemo, useEffect, useCallback } from "react"
import type { DragEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  ListChecks, Plus, Search, Star, Pencil, Copy, Trash2, MoreHorizontal,
  ArrowLeft, GripVertical, ChevronDown, ChevronRight, Save, X, Hash,
  ShieldCheck, Clock, Flag, Paperclip, MessageSquare, CheckCheck,
  User as UserIcon, Building2, Network, Calendar, Layers, Eye, EyeOff,
  Sparkles, AlertCircle, Inbox, CheckCircle2, FileText, Briefcase,
  CreditCard, PiggyBank, GraduationCap, Scale, Settings2, Tag,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { PageHeader, EmptyState, StatusBadge } from "@/components/hrms/ui"
import {
  useFetch, apiPost, apiPatch, apiDelete, safeToast, formatDate, timeAgo,
} from "@/components/hrms/onboarding/shared"

// ============================================================================
//  Types — mirror the Prisma models OnboardingChecklist + OnboardingChecklistTask
// ============================================================================

export interface Checklist {
  id: string
  name: string
  code: string
  description?: string | null
  category: string
  scopeType: string
  entityId?: string | null
  departmentId?: string | null
  employeeType?: string | null
  isDefault: boolean
  status: string
  version: number
  createdAt: string
  updatedAt: string
  _count?: { tasks: number }
  tasks?: ChecklistTask[]
}

export interface ChecklistTask {
  id: string
  checklistId: string
  name: string
  code: string
  description?: string | null
  ownerType: string
  ownerId?: string | null
  dueDateRule: string
  dueDateOffset: number
  priority: string
  isMandatory: boolean
  isBlocking: boolean
  requiresAttachment: boolean
  requiresComment: boolean
  requiresApproval: boolean
  autoCompleteCondition?: string | null
  reminderRule?: string | null
  escalationRule?: string | null
  stageMapping?: string | null
  status: string
  order: number
  createdAt?: string
  updatedAt?: string
}

// ============================================================================
//  Constants
// ============================================================================

type LucideIcon = React.ComponentType<{ className?: string }>

interface CategoryMeta {
  value: string
  label: string
  icon: LucideIcon
  color: ColorName
}

const CATEGORIES: CategoryMeta[] = [
  { value: "Candidate", label: "Candidate", icon: UserIcon, color: "emerald" },
  { value: "HR", label: "HR", icon: Briefcase, color: "teal" },
  { value: "Manager", label: "Manager", icon: Network, color: "cyan" },
  { value: "IT", label: "IT", icon: Settings2, color: "amber" },
  { value: "Admin", label: "Admin", icon: Building2, color: "slate" },
  { value: "Payroll", label: "Payroll", icon: CreditCard, color: "lime" },
  { value: "Finance", label: "Finance", icon: PiggyBank, color: "orange" },
  { value: "Training", label: "Training", icon: GraduationCap, color: "violet" },
  { value: "Compliance", label: "Compliance", icon: Scale, color: "rose" },
]

const CATEGORY_MAP: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c])
)

const SCOPE_TYPES = [
  { value: "tenant", label: "Tenant-wide" },
  { value: "entity", label: "Specific Entity" },
  { value: "department", label: "Specific Department" },
  { value: "employee_type", label: "Employee Type" },
]

interface OwnerTypeMeta {
  value: string
  label: string
  color: ColorName
}

const OWNER_TYPES: OwnerTypeMeta[] = [
  { value: "candidate", label: "Candidate", color: "emerald" },
  { value: "hr_owner", label: "HR Owner", color: "teal" },
  { value: "recruiter", label: "Recruiter", color: "cyan" },
  { value: "reporting_manager", label: "Reporting Manager", color: "amber" },
  { value: "department_head", label: "Department Head", color: "violet" },
  { value: "it_admin", label: "IT Admin", color: "rose" },
  { value: "admin_team", label: "Admin Team", color: "slate" },
  { value: "payroll_admin", label: "Payroll Admin", color: "lime" },
  { value: "finance_admin", label: "Finance Admin", color: "orange" },
  { value: "training_owner", label: "Training Owner", color: "fuchsia" },
  { value: "specific_employee", label: "Specific Employee", color: "pink" },
  { value: "role_based", label: "Role-Based Owner", color: "slate" },
]

const OWNER_TYPE_MAP: Record<string, OwnerTypeMeta> = Object.fromEntries(
  OWNER_TYPES.map((o) => [o.value, o])
)

interface DueDateRuleMeta {
  value: string
  label: string
  hasOffset: boolean
  offsetLabel?: string
}

const DUE_DATE_RULES: DueDateRuleMeta[] = [
  { value: "on_start", label: "On Onboarding Start Date", hasOffset: false },
  { value: "before_joining_X", label: "Before Joining Date - X Days", hasOffset: true, offsetLabel: "Days before" },
  { value: "on_joining", label: "On Joining Date", hasOffset: false },
  { value: "after_joining_X", label: "After Joining Date + X Days", hasOffset: true, offsetLabel: "Days after" },
  { value: "after_previous_X", label: "After Previous Task Completion + X Days", hasOffset: true, offsetLabel: "Days after previous" },
  { value: "manual", label: "Manual Date", hasOffset: false },
]

const DUE_DATE_RULE_MAP: Record<string, DueDateRuleMeta> = Object.fromEntries(
  DUE_DATE_RULES.map((r) => [r.value, r])
)

interface PriorityMeta {
  value: string
  color: ColorName
}

const PRIORITIES: PriorityMeta[] = [
  { value: "Low", color: "slate" },
  { value: "Medium", color: "cyan" },
  { value: "High", color: "amber" },
  { value: "Critical", color: "rose" },
]

const PRIORITY_MAP: Record<string, PriorityMeta> = Object.fromEntries(
  PRIORITIES.map((p) => [p.value, p])
)

const CHECKLIST_STATUSES = ["Active", "Draft", "Archived"]
const TASK_STATUSES = ["Active", "Inactive", "Optional"]

// ============================================================================
//  Color system — only emerald/teal/cyan/amber/violet/rose/slate/lime/
//  orange/fuchsia/pink. NO indigo. NO blue.
// ============================================================================

type ColorName =
  | "emerald" | "teal" | "cyan" | "amber" | "violet" | "rose"
  | "slate" | "lime" | "orange" | "fuchsia" | "pink"

const COLOR_BADGE: Record<ColorName, string> = {
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400 border-teal-200 dark:border-teal-500/20",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400 border-violet-200 dark:border-violet-500/20",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200 dark:border-rose-500/20",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 border-slate-200 dark:border-slate-500/20",
  lime: "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-400 border-lime-200 dark:border-lime-500/20",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400 border-orange-200 dark:border-orange-500/20",
  fuchsia: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-500/20",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400 border-pink-200 dark:border-pink-500/20",
}

const COLOR_DOT: Record<ColorName, string> = {
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500",
  lime: "bg-lime-500",
  orange: "bg-orange-500",
  fuchsia: "bg-fuchsia-500",
  pink: "bg-pink-500",
}

const COLOR_SOFT_BG: Record<ColorName, string> = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  lime: "bg-lime-500/10 text-lime-600 dark:text-lime-400",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  fuchsia: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  pink: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
}

// ============================================================================
//  Helpers
// ============================================================================

function toCode(name: string): string {
  const v = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().replace(/\s+/g, "_")
  return v.slice(0, 32) || `CHK_${Date.now().toString().slice(-4)}`
}

function categoryMeta(cat: string): CategoryMeta {
  return CATEGORY_MAP[cat] || { value: cat, label: cat, icon: Tag, color: "slate" }
}

function ownerTypeMeta(t: string): OwnerTypeMeta {
  return OWNER_TYPE_MAP[t] || { value: t, label: t.replace(/_/g, " "), color: "slate" }
}

function dueDateRuleMeta(r: string): DueDateRuleMeta {
  return DUE_DATE_RULE_MAP[r] || { value: r, label: r.replace(/_/g, " "), hasOffset: false }
}

function dueDateRuleLabel(r: string, offset: number): string {
  const meta = dueDateRuleMeta(r)
  if (!meta.hasOffset) return meta.label
  return meta.label.replace("X", String(offset ?? 0))
}

// ============================================================================
//  Small reusable badge components
// ============================================================================

function ColorBadge({ color, children, className }: { color: ColorName; children: React.ReactNode; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("font-medium border", COLOR_BADGE[color], className)}>
      {children}
    </Badge>
  )
}

function FlagChip({ active, color, icon: Icon, label }: {
  active: boolean
  color: ColorName
  icon: LucideIcon
  label: string
}) {
  if (!active) return null
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border", COLOR_BADGE[color])}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  )
}

// ============================================================================
//  Inline-editable text — click to edit, Enter to save, Esc to cancel
// ============================================================================

function InlineEditableText({
  value, onSave, className, inputClassName,
}: {
  value: string
  onSave: (v: string) => void
  className?: string
  inputClassName?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  // Sync external value -> draft when the parent value changes (React's
  // "adjusting state during render" pattern — avoids useEffect).
  const [lastExternal, setLastExternal] = useState(value)
  if (value !== lastExternal) {
    setLastExternal(value)
    setDraft(value)
  }

  const commit = () => {
    const v = draft.trim()
    if (!v) {
      setDraft(value)
      setEditing(false)
      return
    }
    if (v !== value) onSave(v)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit() }
          if (e.key === "Escape") { setDraft(value); setEditing(false) }
        }}
        className={cn(
          "bg-background border border-emerald-400/60 rounded-md px-2 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
          inputClassName
        )}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -mx-1.5 hover:bg-muted/60 transition-colors text-left",
        className
      )}
      title="Click to edit"
    >
      <span className="truncate">{value}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  )
}

// ============================================================================
//  Category sidebar
// ============================================================================

function CategorySidebar({
  categories,
  counts,
  active,
  onSelect,
  total,
}: {
  categories: CategoryMeta[]
  counts: Record<string, number>
  active: string | "all"
  onSelect: (v: string | "all") => void
  total: number
}) {
  return (
    <nav className="flex flex-col gap-1">
      <button
        onClick={() => onSelect("all")}
        className={cn(
          "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active === "all"
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        )}
      >
        <span className="flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          All Checklists
        </span>
        <span className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
          active === "all" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"
        )}>
          {total}
        </span>
      </button>

      <Separator className="my-1" />

      {categories.map((c) => {
        const Icon = c.icon
        const isActive = active === c.value
        const count = counts[c.value] ?? 0
        return (
          <button
            key={c.value}
            onClick={() => onSelect(c.value)}
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className={cn("grid h-5 w-5 place-items-center rounded", COLOR_SOFT_BG[c.color])}>
                <Icon className="h-3 w-3" />
              </span>
              <span className="truncate">{c.label}</span>
            </span>
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
              isActive ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"
            )}>
              {count}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

// ============================================================================
//  Checklist card (list view)
// ============================================================================

function ChecklistCard({
  checklist,
  onOpen,
  onEdit,
  onClone,
  onSetDefault,
  onDelete,
}: {
  checklist: Checklist
  onOpen: () => void
  onEdit: () => void
  onClone: () => void
  onSetDefault: () => void
  onDelete: () => void
}) {
  const cat = categoryMeta(checklist.category)
  const CatIcon = cat.icon
  const taskCount = checklist._count?.tasks ?? checklist.tasks?.length ?? 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="group relative bg-card border border-border/60 rounded-xl shadow-soft hover:shadow-md hover:border-emerald-500/40 transition-all"
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Top row: name + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground truncate">{checklist.name}</h3>
              {checklist.isDefault && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /></span>
                  </TooltipTrigger>
                  <TooltipContent>Default checklist for {checklist.category}</TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
                <Hash className="h-2.5 w-2.5" />
                {checklist.code}
              </span>
              <ColorBadge color={cat.color}>
                <CatIcon className="h-2.5 w-2.5 mr-0.5" />
                {cat.label}
              </ColorBadge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-60 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onClone}><Copy className="h-3.5 w-3.5 mr-2" /> Clone</DropdownMenuItem>
              <DropdownMenuItem
                onClick={onSetDefault}
                disabled={checklist.isDefault}
              >
                <Star className="h-3.5 w-3.5 mr-2" /> {checklist.isDefault ? "Default (set)" : "Set as Default"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:focus:text-rose-300">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
          {checklist.description || "No description provided."}
        </p>

        {/* Task count + meta row */}
        <div className="flex items-end justify-between gap-2 pt-1">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums text-foreground">{taskCount}</span>
              <span className="text-[11px] text-muted-foreground">tasks</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground capitalize">
                <Layers className="h-2.5 w-2.5" />
                {checklist.scopeType.replace(/_/g, " ")}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                v{checklist.version}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={checklist.status} />
            <Button size="sm" variant="default" onClick={onOpen} className="gap-1.5 h-7">
              Open <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
//  Checklist form dialog (Create + Edit)
// ============================================================================

interface ChecklistFormValues {
  name: string
  code: string
  description: string
  category: string
  scopeType: string
  isDefault: boolean
  status: string
  version: number
}

function ChecklistFormDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Checklist | null
  onSaved: () => void
}) {
  const isEdit = !!editing
  const [values, setValues] = useState<ChecklistFormValues>({
    name: "", code: "", description: "", category: "HR",
    scopeType: "tenant", isDefault: false, status: "Active", version: 1,
  })
  const [saving, setSaving] = useState(false)
  const [codeTouched, setCodeTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setCodeTouched(false)
      if (editing) {
        setValues({
          name: editing.name,
          code: editing.code,
          description: editing.description || "",
          category: editing.category,
          scopeType: editing.scopeType,
          isDefault: editing.isDefault,
          status: editing.status,
          version: editing.version,
        })
      } else {
        setValues({
          name: "", code: "", description: "", category: "HR",
          scopeType: "tenant", isDefault: false, status: "Active", version: 1,
        })
      }
    }
  }, [open, editing])

  // Auto-suggest code from name
  useEffect(() => {
    if (!isEdit && !codeTouched && values.name) {
      setValues((v) => ({ ...v, code: toCode(v.name) }))
    }
  }, [values.name, isEdit, codeTouched])

  const handleSave = async () => {
    if (!values.name.trim() || !values.code.trim() || !values.category) {
      toast.error("Name, code and category are required")
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: values.name.trim(),
        code: values.code.trim(),
        description: values.description.trim() || null,
        category: values.category,
        scopeType: values.scopeType,
        isDefault: values.isDefault,
        status: values.status,
        version: values.version,
      }
      if (isEdit && editing) {
        await safeToast(
          apiPatch(`/api/onboarding-checklists/${editing.id}`, payload),
          "Checklist updated",
          "Failed to update checklist"
        )
      } else {
        await safeToast(
          apiPost("/api/onboarding-checklists", payload),
          "Checklist created",
          "Failed to create checklist"
        )
      }
      onOpenChange(false)
      onSaved()
    } catch {
      // toast handled by safeToast
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-emerald-500" />
            {isEdit ? "Edit Checklist" : "New Checklist"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the checklist metadata. Tasks are managed in the detail view."
              : "Define a reusable task group. You can add tasks after creating it."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1 grid gap-1.5">
              <Label htmlFor="chk-name">Checklist Name *</Label>
              <Input
                id="chk-name"
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                placeholder="e.g. HR Day-1 Onboarding"
              />
            </div>
            <div className="col-span-2 sm:col-span-1 grid gap-1.5">
              <Label htmlFor="chk-code">Checklist Code *</Label>
              <Input
                id="chk-code"
                value={values.code}
                onChange={(e) => {
                  setCodeTouched(true)
                  setValues((v) => ({ ...v, code: e.target.value.toUpperCase() }))
                }}
                placeholder="HR_DAY1_ONBOARDING"
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="chk-desc">Description</Label>
            <Textarea
              id="chk-desc"
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              placeholder="What this checklist covers, who it applies to..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Category *</Label>
              <Select
                value={values.category}
                onValueChange={(v) => setValues((s) => ({ ...s, category: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", COLOR_DOT[c.color])} />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Scope Type</Label>
              <Select
                value={values.scopeType}
                onValueChange={(v) => setValues((s) => ({ ...s, scopeType: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCOPE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select
                value={values.status}
                onValueChange={(v) => setValues((s) => ({ ...s, status: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHECKLIST_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="chk-version">Version</Label>
              <Input
                id="chk-version"
                type="number"
                min={1}
                value={values.version}
                onChange={(e) => setValues((v) => ({ ...v, version: Math.max(1, Number(e.target.value) || 1) }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <div>
              <Label className="cursor-pointer">Default Checklist</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Mark as the default for the {values.category} category.
              </p>
            </div>
            <Switch
              checked={values.isDefault}
              onCheckedChange={(v) => setValues((s) => ({ ...s, isDefault: v }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Save className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Save Changes" : "Create Checklist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Task form (inline add / edit)
// ============================================================================

interface TaskFormValues {
  name: string
  code: string
  description: string
  ownerType: string
  dueDateRule: string
  dueDateOffset: number
  priority: string
  isMandatory: boolean
  isBlocking: boolean
  requiresAttachment: boolean
  requiresComment: boolean
  requiresApproval: boolean
  stageMapping: string
  status: string
}

const EMPTY_TASK: TaskFormValues = {
  name: "", code: "", description: "",
  ownerType: "hr_owner",
  dueDateRule: "on_joining",
  dueDateOffset: 0,
  priority: "Medium",
  isMandatory: false, isBlocking: false,
  requiresAttachment: false, requiresComment: false, requiresApproval: false,
  stageMapping: "",
  status: "Active",
}

function taskToForm(t: ChecklistTask): TaskFormValues {
  return {
    name: t.name,
    code: t.code,
    description: t.description || "",
    ownerType: t.ownerType,
    dueDateRule: t.dueDateRule,
    dueDateOffset: t.dueDateOffset ?? 0,
    priority: t.priority,
    isMandatory: t.isMandatory,
    isBlocking: t.isBlocking,
    requiresAttachment: t.requiresAttachment,
    requiresComment: t.requiresComment,
    requiresApproval: t.requiresApproval,
    stageMapping: t.stageMapping || "",
    status: t.status,
  }
}

function TaskForm({
  initial,
  checklistId,
  editingTaskId,
  onSaved,
  onCancel,
  isEdit,
}: {
  initial: TaskFormValues
  checklistId: string
  editingTaskId?: string | null
  onSaved: (task: ChecklistTask) => void
  onCancel: () => void
  isEdit: boolean
}) {
  const [values, setValues] = useState<TaskFormValues>(initial)
  const [saving, setSaving] = useState(false)
  const [codeTouched, setCodeTouched] = useState(false)

  useEffect(() => {
    setValues(initial)
  }, [JSON.stringify(initial)])

  // Auto-suggest code from name (only for new tasks)
  useEffect(() => {
    if (!isEdit && !codeTouched && values.name) {
      setValues((v) => ({ ...v, code: toCode(v.name) }))
    }
  }, [values.name, isEdit, codeTouched])

  const handleSubmit = async () => {
    if (!values.name.trim() || !values.code.trim()) {
      toast.error("Task name and code are required")
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: values.name.trim(),
        code: values.code.trim(),
        description: values.description.trim() || null,
        ownerType: values.ownerType,
        dueDateRule: values.dueDateRule,
        dueDateOffset: Number(values.dueDateOffset) || 0,
        priority: values.priority,
        isMandatory: values.isMandatory,
        isBlocking: values.isBlocking,
        requiresAttachment: values.requiresAttachment,
        requiresComment: values.requiresComment,
        requiresApproval: values.requiresApproval,
        stageMapping: values.stageMapping.trim() || null,
        status: values.status,
      }
      let result: ChecklistTask
      if (isEdit && editingTaskId) {
        result = await safeToast(
          apiPatch(`/api/onboarding-checklists/${checklistId}/tasks/${editingTaskId}`, payload),
          "Task updated",
          "Failed to update task"
        ) as ChecklistTask
      } else {
        result = await safeToast(
          apiPost(`/api/onboarding-checklists/${checklistId}/tasks`, payload),
          "Task added",
          "Failed to add task"
        ) as ChecklistTask
      }
      onSaved(result)
    } catch {
      // handled
    } finally {
      setSaving(false)
    }
  }

  const dueMeta = dueDateRuleMeta(values.dueDateRule)

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.03] p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
          {isEdit ? "Edit Task" : "Add Task"}
        </h4>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs">Task Name *</Label>
          <Input
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            placeholder="e.g. Issue laptop & credentials"
            className="h-8 text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Task Code *</Label>
          <Input
            value={values.code}
            onChange={(e) => {
              setCodeTouched(true)
              setValues((v) => ({ ...v, code: e.target.value.toUpperCase() }))
            }}
            placeholder="ISSUE_LAPTOP"
            className="h-8 text-sm font-mono"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          placeholder="What needs to be done..."
          rows={2}
          className="text-sm"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs">Owner Type</Label>
          <Select
            value={values.ownerType}
            onValueChange={(v) => setValues((s) => ({ ...s, ownerType: v }))}
          >
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {OWNER_TYPES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", COLOR_DOT[o.color])} />
                    {o.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Due Date Rule</Label>
          <Select
            value={values.dueDateRule}
            onValueChange={(v) => setValues((s) => ({ ...s, dueDateRule: v }))}
          >
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DUE_DATE_RULES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dueMeta.hasOffset ? (
          <div className="grid gap-1.5">
            <Label className="text-xs">{dueMeta.offsetLabel || "Offset (days)"}</Label>
            <Input
              type="number"
              value={values.dueDateOffset}
              onChange={(e) => setValues((v) => ({ ...v, dueDateOffset: Number(e.target.value) || 0 }))}
              className="h-8 text-sm"
              min={0}
            />
          </div>
        ) : (
          <div className="grid gap-1.5">
            <Label className="text-xs">Priority</Label>
            <Select
              value={values.priority}
              onValueChange={(v) => setValues((s) => ({ ...s, priority: v }))}
            >
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", COLOR_DOT[p.color])} />
                      {p.value}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {dueMeta.hasOffset && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">Priority</Label>
            <Select
              value={values.priority}
              onValueChange={(v) => setValues((s) => ({ ...s, priority: v }))}
            >
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", COLOR_DOT[p.color])} />
                      {p.value}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 col-span-1 sm:col-span-2">
            <Label className="text-xs">Stage Mapping (optional)</Label>
            <Input
              value={values.stageMapping}
              onChange={(e) => setValues((v) => ({ ...v, stageMapping: e.target.value }))}
              placeholder="e.g. DAY1"
              className="h-8 text-sm"
            />
          </div>
        </div>
      )}

      {!dueMeta.hasOffset && (
        <div className="grid gap-1.5">
          <Label className="text-xs">Stage Mapping (optional)</Label>
          <Input
            value={values.stageMapping}
            onChange={(e) => setValues((v) => ({ ...v, stageMapping: e.target.value }))}
            placeholder="e.g. DAY1"
            className="h-8 text-sm"
          />
        </div>
      )}

      {/* Flags */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
        <FlagSwitch
          label="Mandatory" color="emerald" icon={ShieldCheck}
          checked={values.isMandatory}
          onChange={(v) => setValues((s) => ({ ...s, isMandatory: v }))}
        />
        <FlagSwitch
          label="Blocking" color="rose" icon={AlertCircle}
          checked={values.isBlocking}
          onChange={(v) => setValues((s) => ({ ...s, isBlocking: v }))}
        />
        <FlagSwitch
          label="Attachment" color="amber" icon={Paperclip}
          checked={values.requiresAttachment}
          onChange={(v) => setValues((s) => ({ ...s, requiresAttachment: v }))}
        />
        <FlagSwitch
          label="Comment" color="cyan" icon={MessageSquare}
          checked={values.requiresComment}
          onChange={(v) => setValues((s) => ({ ...s, requiresComment: v }))}
        />
        <FlagSwitch
          label="Approval" color="violet" icon={CheckCheck}
          checked={values.requiresApproval}
          onChange={(v) => setValues((s) => ({ ...s, requiresApproval: v }))}
        />
        <div className="flex items-center justify-between rounded-md border border-border/60 px-2.5 py-1.5">
          <Label className="text-[11px] flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            Status
          </Label>
          <Select
            value={values.status}
            onValueChange={(v) => setValues((s) => ({ ...s, status: v }))}
          >
            <SelectTrigger className="h-6 w-[105px] text-[11px] border-0 px-1 py-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={saving} className="gap-1.5">
          {saving ? <Save className="h-3.5 w-3.5 animate-pulse" /> : <Save className="h-3.5 w-3.5" />}
          {isEdit ? "Save Task" : "Add Task"}
        </Button>
      </div>
    </div>
  )
}

function FlagSwitch({
  label, color, icon: Icon, checked, onChange,
}: {
  label: string
  color: ColorName
  icon: LucideIcon
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className={cn(
      "flex items-center justify-between rounded-md border px-2.5 py-1.5 transition-colors",
      checked ? cn(COLOR_BADGE[color], "border-current/40") : "border-border/60"
    )}>
      <Label className="text-[11px] flex items-center gap-1.5 cursor-pointer">
        <Icon className="h-3 w-3" />
        {label}
      </Label>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-90" />
    </div>
  )
}

// ============================================================================
//  Task card (in detail view, drag-reorderable)
// ============================================================================

function TaskCard({
  task,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  onEdit,
  onDelete,
}: {
  task: ChecklistTask
  index: number
  isDragging: boolean
  isDragOver: boolean
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
  onDrop: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const owner = ownerTypeMeta(task.ownerType)
  const prio = PRIORITY_MAP[task.priority] || PRIORITY_MAP.Medium
  const dueLabel = dueDateRuleLabel(task.dueDateRule, task.dueDateOffset)

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); onDragEnter() }}
      onDrop={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); onDrop() }}
      className={cn(
        "group relative bg-card border rounded-lg shadow-soft transition-all",
        isDragging && "opacity-50 ring-2 ring-emerald-500/50",
        isDragOver && "border-emerald-500 ring-2 ring-emerald-500/40",
        !isDragging && !isDragOver && "border-border/60 hover:border-emerald-500/40"
      )}
    >
      <div className="flex items-start gap-2 p-3">
        {/* Drag handle */}
        <div className="flex flex-col items-center gap-0.5 pt-0.5 shrink-0 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{index + 1}</span>
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <button
                onClick={() => setExpanded((e) => !e)}
                className="flex items-center gap-1.5 text-left"
              >
                {expanded
                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <h4 className="text-sm font-semibold text-foreground truncate hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {task.name}
                </h4>
              </button>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
                  <Hash className="h-2.5 w-2.5" />
                  {task.code}
                </span>
                <ColorBadge color={owner.color}>{owner.label}</ColorBadge>
                <ColorBadge color={prio.color}>{task.priority}</ColorBadge>
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {dueLabel}
                </span>
                {task.stageMapping && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    <Layers className="h-2.5 w-2.5" />
                    {task.stageMapping}
                  </span>
                )}
              </div>
              {/* Flag chips */}
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                <FlagChip active={task.isMandatory} color="emerald" icon={ShieldCheck} label="Mandatory" />
                <FlagChip active={task.isBlocking} color="rose" icon={AlertCircle} label="Blocking" />
                <FlagChip active={task.requiresAttachment} color="amber" icon={Paperclip} label="Attachment" />
                <FlagChip active={task.requiresComment} color="cyan" icon={MessageSquare} label="Comment" />
                <FlagChip active={task.requiresApproval} color="violet" icon={CheckCheck} label="Approval" />
                {!task.isMandatory && !task.isBlocking && !task.requiresAttachment && !task.requiresComment && !task.requiresApproval && (
                  <span className="text-[10px] text-muted-foreground/60 italic">No flags</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <StatusBadge status={task.status} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-60 group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => setExpanded(true)}>
                    <Eye className="h-3.5 w-3.5 mr-2" /> View / Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:focus:text-rose-300">
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Expanded view */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-border/60 space-y-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Description</Label>
                    <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap">
                      {task.description || <span className="italic text-muted-foreground/60">No description provided.</span>}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground text-[11px] uppercase">Owner</span>
                      <p className="text-foreground mt-0.5">{owner.label}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px] uppercase">Due</span>
                      <p className="text-foreground mt-0.5">{dueLabel}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px] uppercase">Priority</span>
                      <p className="text-foreground mt-0.5">{task.priority}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px] uppercase">Status</span>
                      <p className="text-foreground mt-0.5">{task.status}</p>
                    </div>
                  </div>
                  {task.autoCompleteCondition && (
                    <div>
                      <span className="text-muted-foreground text-[11px] uppercase">Auto-complete condition</span>
                      <p className="text-xs text-foreground mt-0.5 font-mono">{task.autoCompleteCondition}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5 h-7">
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setExpanded(false)} className="gap-1.5 h-7">
                      <EyeOff className="h-3 w-3" /> Collapse
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
//  Checklist detail view (replaces the grid)
// ============================================================================

function ChecklistDetailView({
  checklistId,
  onBack,
  onEdit,
  onDeleted,
}: {
  checklistId: string
  onBack: () => void
  onEdit: (c: Checklist) => void
  onDeleted: () => void
}) {
  const { data: checklist, loading, reload, setData } = useFetch<Checklist>(
    `/api/onboarding-checklists/${checklistId}`
  )

  const [tasks, setTasks] = useState<ChecklistTask[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTask, setEditingTask] = useState<ChecklistTask | null>(null)
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (checklist?.tasks) {
      setTasks([...checklist.tasks].sort((a, b) => a.order - b.order))
    } else {
      setTasks([])
    }
  }, [checklist?.tasks])

  const handleRename = async (newName: string) => {
    if (!checklist) return
    try {
      await safeToast(
        apiPatch(`/api/onboarding-checklists/${checklist.id}`, { name: newName }),
        "Checklist renamed",
        "Failed to rename"
      )
      setData({ ...checklist, name: newName })
    } catch { /* handled */ }
  }

  const handleSetDefault = async () => {
    if (!checklist) return
    try {
      await safeToast(
        apiPatch(`/api/onboarding-checklists/${checklist.id}`, { isDefault: true }),
        "Marked as default",
        "Failed to set default"
      )
      setData({ ...checklist, isDefault: true })
    } catch { /* handled */ }
  }

  const handleDelete = async () => {
    if (!checklist) return
    try {
      await safeToast(
        apiDelete(`/api/onboarding-checklists/${checklist.id}`),
        "Checklist deleted",
        "Failed to delete"
      )
      onDeleted()
    } catch { /* handled */ }
  }

  const handleTaskSaved = () => {
    setShowAddForm(false)
    setEditingTask(null)
    reload()
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await safeToast(
        apiDelete(`/api/onboarding-checklists/${checklistId}/tasks/${taskId}`),
        "Task deleted",
        "Failed to delete task"
      )
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      setDeleteTaskId(null)
      reload()
    } catch { /* handled */ }
  }

  // ----- Drag reorder -----
  const handleDragStart = (taskId: string) => {
    setDraggingId(taskId)
  }
  const handleDragEnter = (taskId: string) => {
    if (taskId === draggingId) return
    setDragOverId(taskId)
    setTasks((prev) => {
      const fromIdx = prev.findIndex((t) => t.id === draggingId)
      const toIdx = prev.findIndex((t) => t.id === taskId)
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
  }
  const handleDragEnd = async () => {
    const dragged = draggingId
    setDraggingId(null)
    setDragOverId(null)
    if (!dragged) return
    const orderedIds = tasks.map((t) => t.id)
    setReordering(true)
    try {
      await safeToast(
        apiPatch(`/api/onboarding-checklists/${checklistId}/tasks`, { orderedIds }),
        undefined, // silent success — too noisy otherwise
        "Failed to reorder tasks"
      )
    } catch {
      reload() // revert on failure
    } finally {
      setReordering(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (!checklist) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Checklist not found"
        description="It may have been deleted or you don't have access."
        action={<Button onClick={onBack} variant="outline" size="sm">Back to list</Button>}
      />
    )
  }

  const cat = categoryMeta(checklist.category)
  const CatIcon = cat.icon

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Checklists
        </Button>
        <div className="flex-1" />
        {reordering && (
          <span className="text-[11px] text-muted-foreground animate-pulse">Saving order…</span>
        )}
        <Button variant="outline" size="sm" onClick={() => onEdit(checklist)} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button
          variant="outline" size="sm"
          onClick={() => setConfirmDelete(true)}
          className="gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      {/* Header card */}
      <Card className="bg-card border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3 flex-wrap">
            <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", COLOR_SOFT_BG[cat.color])}>
              <CatIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <InlineEditableText
                  value={checklist.name}
                  onSave={handleRename}
                  className="text-xl font-semibold text-foreground"
                  inputClassName="text-xl font-semibold"
                />
                {checklist.isDefault && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-medium border border-amber-200 dark:border-amber-500/20">
                        <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                        Default
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Default checklist for {checklist.category}</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
                  <Hash className="h-2.5 w-2.5" />
                  {checklist.code}
                </span>
                <ColorBadge color={cat.color}>
                  <CatIcon className="h-2.5 w-2.5 mr-0.5" />
                  {cat.label}
                </ColorBadge>
                <StatusBadge status={checklist.status} />
                {!checklist.isDefault && (
                  <Button
                    variant="ghost" size="sm"
                    onClick={handleSetDefault}
                    className="h-6 px-2 text-[11px] gap-1 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                  >
                    <Star className="h-3 w-3" /> Set as Default
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Meta row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60">
            <MetaItem icon={Layers} label="Scope" value={SCOPE_TYPES.find((s) => s.value === checklist.scopeType)?.label || checklist.scopeType} />
            <MetaItem icon={Tag} label="Version" value={`v${checklist.version}`} />
            <MetaItem icon={Calendar} label="Created" value={formatDate(checklist.createdAt)} />
            <MetaItem icon={Clock} label="Updated" value={timeAgo(checklist.updatedAt)} />
          </div>

          {checklist.description && (
            <div className="pt-2 border-t border-border/60">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Description</Label>
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{checklist.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks section */}
      <div className="rounded-xl border border-border/60 bg-card shadow-soft">
        <div className="flex items-center justify-between p-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <ListChecks className="h-4 w-4 text-emerald-500" />
              Tasks
            </h3>
            <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-semibold tabular-nums">
              {tasks.length}
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              · drag to reorder
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => { setEditingTask(null); setShowAddForm((s) => !s) }}
            className="gap-1.5"
          >
            {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showAddForm ? "Cancel" : "Add Task"}
          </Button>
        </div>

        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <TaskForm
                  initial={EMPTY_TASK}
                  checklistId={checklistId}
                  isEdit={false}
                  onSaved={handleTaskSaved}
                  onCancel={() => setShowAddForm(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {editingTask && (
            <TaskForm
              initial={taskToForm(editingTask)}
              checklistId={checklistId}
              editingTaskId={editingTask.id}
              isEdit
              onSaved={handleTaskSaved}
              onCancel={() => setEditingTask(null)}
              key={`edit-${editingTask.id}`}
            />
          )}

          {tasks.length === 0 && !showAddForm ? (
            <EmptyState
              icon={ListChecks}
              title="No tasks yet"
              description="Add the first task to this checklist. Tasks define who does what, by when."
              action={
                <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add First Task
                </Button>
              }
            />
          ) : (
            tasks.map((task, i) => (
              <TaskCard
                key={task.id}
                task={task}
                index={i}
                isDragging={draggingId === task.id}
                isDragOver={dragOverId === task.id && draggingId !== task.id}
                onDragStart={() => handleDragStart(task.id)}
                onDragEnter={() => handleDragEnter(task.id)}
                onDragEnd={handleDragEnd}
                onDrop={handleDragEnd}
                onEdit={() => {
                  setEditingTask(task)
                  setShowAddForm(false)
                }}
                onDelete={() => { setDeleteTaskId(task.id); setDeleteOpen(true) }}
              />
            ))
          )}
        </div>
      </div>

      {/* Delete checklist confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{checklist.name}</strong> ({checklist.code}) and all {tasks.length} task{tasks.length === 1 ? "" : "s"} inside it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete Checklist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete task confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTaskId && tasks.find((t) => t.id === deleteTaskId)?.name
                ? <>Remove <strong>{tasks.find((t) => t.id === deleteTaskId)?.name}</strong> from this checklist?</>
                : "Remove this task from the checklist?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTaskId && handleDeleteTask(deleteTaskId)}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function MetaItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xs font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  )
}

// ============================================================================
//  Main: ChecklistsSection
// ============================================================================

export function ChecklistsSection() {
  const [selectedCategory, setSelectedCategory] = useState<string | "all">("all")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Checklist | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Fetch all checklists (we filter on the client to compute counts per category)
  const { data, loading, reload } = useFetch<{ items: Checklist[] }>(
    "/api/onboarding-checklists",
    [reloadKey]
  )

  const allItems = data?.items ?? []

  // Counts per category
  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of allItems) m[c.category] = (m[c.category] ?? 0) + 1
    return m
  }, [allItems])

  // Filtered items
  const filtered = useMemo(() => {
    let items = allItems
    if (selectedCategory !== "all") {
      items = items.filter((c) => c.category === selectedCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.description || "").toLowerCase().includes(q)
      )
    }
    return items
  }, [allItems, selectedCategory, search])

  const reloadAll = useCallback(() => {
    setReloadKey((k) => k + 1)
    reload()
  }, [reload])

  // ----- Handlers -----
  const handleOpen = (c: Checklist) => setSelectedId(c.id)
  const handleBack = () => setSelectedId(null)

  const handleEdit = (c: Checklist) => {
    setEditingChecklist(c)
    setFormOpen(true)
  }

  const handleNew = () => {
    setEditingChecklist(null)
    setFormOpen(true)
  }

  const handleClone = async (c: Checklist) => {
    const cat = c.category
    const baseCode = `${c.code}_COPY`
    let code = baseCode
    let n = 1
    const existingCodes = new Set(allItems.map((x) => x.code))
    while (existingCodes.has(code)) {
      code = `${baseCode}_${n++}`
    }
    try {
      await safeToast(
        apiPost("/api/onboarding-checklists", {
          name: `${c.name} (Copy)`,
          code,
          description: c.description,
          category: cat,
          scopeType: c.scopeType,
          isDefault: false,
          status: "Draft",
          version: 1,
          tasks: (c.tasks ?? []).map((t, i) => ({
            name: t.name,
            code: `${t.code}_COPY`,
            description: t.description,
            ownerType: t.ownerType,
            dueDateRule: t.dueDateRule,
            dueDateOffset: t.dueDateOffset,
            priority: t.priority,
            isMandatory: t.isMandatory,
            isBlocking: t.isBlocking,
            requiresAttachment: t.requiresAttachment,
            requiresComment: t.requiresComment,
            requiresApproval: t.requiresApproval,
            stageMapping: t.stageMapping,
            status: t.status,
            order: i,
          })),
        }),
        "Checklist cloned",
        "Failed to clone checklist"
      )
      reloadAll()
    } catch { /* handled */ }
  }

  const handleSetDefault = async (c: Checklist) => {
    try {
      await safeToast(
        apiPatch(`/api/onboarding-checklists/${c.id}`, { isDefault: true }),
        `${c.name} set as default for ${c.category}`,
        "Failed to set default"
      )
      reloadAll()
    } catch { /* handled */ }
  }

  const handleDeleteRequest = (c: Checklist) => {
    setDeleteTarget(c)
    setDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await safeToast(
        apiDelete(`/api/onboarding-checklists/${deleteTarget.id}`),
        "Checklist deleted",
        "Failed to delete checklist"
      )
      setDeleteOpen(false)
      setDeleteTarget(null)
      reloadAll()
    } catch { /* handled */ }
  }

  // ----- Render -----
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Checklists"
        description="Reusable task groups assigned per onboarding stage. Each checklist defines who does what, by when."
        icon={ListChecks}
      />

      <AnimatePresence mode="wait">
        {selectedId ? (
          <motion.div
            key={`detail-${selectedId}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <ChecklistDetailView
              checklistId={selectedId}
              onBack={handleBack}
              onEdit={(c) => { setSelectedId(null); handleEdit(c) }}
              onDeleted={() => { setSelectedId(null); reloadAll() }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4"
          >
            {/* Sidebar */}
            <aside className="lg:sticky lg:top-4 lg:self-start">
              <Card className="bg-card border border-border/60 rounded-xl shadow-soft">
                <CardContent className="p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 pb-2">
                    Categories
                  </p>
                  <CategorySidebar
                    categories={CATEGORIES}
                    counts={counts}
                    active={selectedCategory}
                    onSelect={setSelectedCategory}
                    total={allItems.length}
                  />
                </CardContent>
              </Card>
            </aside>

            {/* Grid */}
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, code, description..."
                    className="pl-9 h-9 bg-background"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {filtered.length} of {allItems.length} checklists
                  </span>
                  <Button size="sm" onClick={handleNew} className="gap-1.5">
                    <Plus className="h-4 w-4" /> New Checklist
                  </Button>
                </div>
              </div>

              {/* Loading skeletons */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-44 w-full rounded-xl" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title={allItems.length === 0 ? "No checklists yet" : "No matches found"}
                  description={
                    allItems.length === 0
                      ? "Create your first reusable checklist to define tasks for onboarding stages."
                      : "Try adjusting your search or category filter."
                  }
                  action={
                    allItems.length === 0 ? (
                      <Button size="sm" onClick={handleNew} className="gap-1.5">
                        <Plus className="h-4 w-4" /> New Checklist
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setSearch(""); setSelectedCategory("all") }}>
                        Clear filters
                      </Button>
                    )
                  }
                />
              ) : (
                <motion.div
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
                >
                  <AnimatePresence>
                    {filtered.map((c) => (
                      <ChecklistCard
                        key={c.id}
                        checklist={c}
                        onOpen={() => handleOpen(c)}
                        onEdit={() => handleEdit(c)}
                        onClone={() => handleClone(c)}
                        onSetDefault={() => handleSetDefault(c)}
                        onDelete={() => handleDeleteRequest(c)}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New / Edit dialog */}
      <ChecklistFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editingChecklist}
        onSaved={reloadAll}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  This will permanently delete <strong>{deleteTarget.name}</strong> ({deleteTarget.code})
                  {deleteTarget._count?.tasks ? (
                    <> and all {deleteTarget._count.tasks} task(s) inside it.</>
                  ) : (
                    <>.</>
                  )}{" "}
                  This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete Checklist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ChecklistsSection
