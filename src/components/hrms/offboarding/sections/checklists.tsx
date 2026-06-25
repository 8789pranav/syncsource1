"use client"

// ============================================================================
//  ChecklistsSection — Offboarding spec #16
//  Reusable task groups assigned per exit stage. 11 categories (Employee Exit,
//  Manager Clearance, HR, IT, Admin, Payroll, Finance, Asset, Legal, Knowledge
//  Transfer, Exit Interview). Per checklist: name, code, category, scope, entity,
//  department, employee type, exit type, default flag, status, version. Per
//  task: 16 fields (owner, due-date rule with offset, priority, mandatory/
//  blocking/attachment/comment/approval flags, financial impact, recovery,
//  stage mapping, status). 7 due-date rules. Editor dialog with task rows +
//  add task button. Rose theme accents.
// ============================================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  ListChecks, Plus, Search, Pencil, Copy, Trash2, MoreHorizontal,
  Save, X, Hash, ShieldCheck, Clock, Flag, Paperclip, MessageSquare,
  CheckCheck, User as UserIcon, Building2, Network, Calendar, Layers,
  Eye, Sparkles, AlertCircle, Inbox, CheckCircle2, FileText, Briefcase,
  CreditCard, PiggyBank, Scale, Settings2, Tag, ChevronRight, Star,
  IndianRupee, RefreshCw, Ban, GripVertical,
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

import { EXIT_CHECKLISTS } from "@/components/hrms/offboarding/data"
import type {
  ExitChecklist, ExitChecklistTask, ScopeType,
} from "@/components/hrms/offboarding/shared"
import {
  formatDate, STATUS_COLORS, EXIT_TYPES,
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
}

const CATEGORIES: CategoryMeta[] = [
  { value: "Employee Exit Checklist", label: "Employee Exit", icon: UserIcon, color: "#f43f5e" },
  { value: "Manager Clearance Checklist", label: "Manager Clearance", icon: Network, color: "#0ea5e9" },
  { value: "HR Checklist", label: "HR", icon: Briefcase, color: "#10b981" },
  { value: "IT Checklist", label: "IT", icon: Settings2, color: "#8b5cf6" },
  { value: "Admin Checklist", label: "Admin", icon: Building2, color: "#f59e0b" },
  { value: "Payroll Checklist", label: "Payroll", icon: CreditCard, color: "#06b6d4" },
  { value: "Finance Checklist", label: "Finance", icon: PiggyBank, color: "#14b8a6" },
  { value: "Asset Checklist", label: "Asset", icon: Layers, color: "#f97316" },
  { value: "Legal Checklist", label: "Legal", icon: Scale, color: "#a855f7" },
  { value: "Knowledge Transfer Checklist", label: "Knowledge Transfer", icon: MessageSquare, color: "#84cc16" },
  { value: "Exit Interview Checklist", label: "Exit Interview", icon: FileText, color: "#ec4899" },
]

const CATEGORY_MAP: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c])
)

const SCOPE_TYPES: ScopeType[] = [
  "Tenant Default", "Entity", "Branch", "Location", "Department",
  "Grade", "Employee Type", "Work Mode", "Exit Type", "Specific Employee",
]

const OWNER_TYPES = [
  "Employee", "Manager", "HR", "IT Admin", "Admin", "Finance", "Payroll",
  "Legal", "Asset Team", "Reporting Manager", "Department Head", "Specific User",
]

interface DueDateRuleMeta {
  value: string
  label: string
  hasOffset: boolean
  sign: "before" | "after" | "none"
}

// Rule keys used internally; the seed data stores fully formatted strings.
const DUE_DATE_RULES: DueDateRuleMeta[] = [
  { value: "on_exit_init", label: "On Exit Initiation", hasOffset: false, sign: "none" },
  { value: "on_resignation", label: "On Resignation Approval", hasOffset: false, sign: "none" },
  { value: "before_lwd", label: "Before LWD - X Days", hasOffset: true, sign: "before" },
  { value: "on_lwd", label: "On LWD", hasOffset: false, sign: "none" },
  { value: "after_lwd", label: "After LWD + X Days", hasOffset: true, sign: "after" },
  { value: "after_prev", label: "After Previous Task + X Days", hasOffset: true, sign: "after" },
  { value: "manual", label: "Manual Date", hasOffset: false, sign: "none" },
]

const DUE_DATE_RULE_MAP: Record<string, DueDateRuleMeta> = Object.fromEntries(
  DUE_DATE_RULES.map((r) => [r.value, r])
)

const PRIORITIES = [
  { value: "Low", color: "#64748b", bg: "#f1f5f9" },
  { value: "Medium", color: "#0ea5e9", bg: "#e0f2fe" },
  { value: "High", color: "#f59e0b", bg: "#fef3c7" },
  { value: "Critical", color: "#ef4444", bg: "#fee2e2" },
]

const PRIORITY_MAP: Record<string, { color: string; bg: string }> = Object.fromEntries(
  PRIORITIES.map((p) => [p.value, p])
)

const TASK_STATUSES = ["Active", "Inactive", "Optional"]

// Exit stages available for stage mapping (subset of DEFAULT_EXIT_STAGES)
const STAGE_OPTIONS = [
  "Resignation Submitted", "Manager Review", "HR Review", "Notice Period",
  "Clearance In Progress", "Asset Recovery", "IT Access Revocation",
  "FnF Settlement", "Exit Letters", "Exited", "Alumni",
]

// ============================================================================
//  Helpers — due date rule parsing
// ============================================================================

/** Parse a stored rule string like "Before LWD - 7 Days" into {key, offset}. */
function parseRule(stored: string): { key: string; offset: number } {
  if (!stored) return { key: "on_exit_init", offset: 0 }
  const lower = stored.toLowerCase()
  if (lower.startsWith("on exit initiation")) return { key: "on_exit_init", offset: 0 }
  if (lower.startsWith("on resignation approval")) return { key: "on_resignation", offset: 0 }
  if (lower.startsWith("on lwd")) return { key: "on_lwd", offset: 0 }
  if (lower.startsWith("manual date")) return { key: "manual", offset: 0 }
  const beforeM = stored.match(/Before LWD\s*-\s*(\d+)\s*Days?/i)
  if (beforeM) return { key: "before_lwd", offset: parseInt(beforeM[1], 10) || 0 }
  const afterLwdM = stored.match(/After LWD\s*\+\s*(\d+)\s*Days?/i)
  if (afterLwdM) return { key: "after_lwd", offset: parseInt(afterLwdM[1], 10) || 0 }
  const afterPrevM = stored.match(/After Previous Task\s*\+\s*(\d+)\s*Days?/i)
  if (afterPrevM) return { key: "after_prev", offset: parseInt(afterPrevM[1], 10) || 0 }
  return { key: "on_exit_init", offset: 0 }
}

/** Compose a stored rule string from key + offset. */
function composeRule(key: string, offset: number): string {
  const meta = DUE_DATE_RULE_MAP[key]
  if (!meta) return "On Exit Initiation"
  if (!meta.hasOffset) return meta.label
  return meta.label
    .replace("- X Days", `- ${offset || 0} Day${offset === 1 ? "" : "s"}`)
    .replace("+ X Days", `+ ${offset || 0} Day${offset === 1 ? "" : "s"}`)
}

/** Display-friendly version of a stored rule. */
function ruleDisplay(stored: string): string {
  return stored || "—"
}

/** Color a due date rule badge based on its kind. */
function ruleColor(stored: string): { bg: string; fg: string } {
  const { key } = parseRule(stored)
  switch (key) {
    case "on_exit_init": return { bg: "#fff1f2", fg: "#e11d48" }
    case "on_resignation": return { bg: "#ecfdf5", fg: "#059669" }
    case "before_lwd": return { bg: "#fffbeb", fg: "#d97706" }
    case "on_lwd": return { bg: "#f1f5f9", fg: "#475569" }
    case "after_lwd": return { bg: "#fdf4ff", fg: "#a21caf" }
    case "after_prev": return { bg: "#ecfeff", fg: "#0891b2" }
    case "manual": return { bg: "#f5f5f4", fg: "#57534e" }
    default: return { bg: "#f1f5f9", fg: "#475569" }
  }
}

function toCode(name: string): string {
  const v = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().replace(/\s+/g, "_")
  return v.slice(0, 32) || `CHK_${Date.now().toString().slice(-4)}`
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

function PriorityBadge({ priority }: { priority: string }) {
  const meta = PRIORITY_MAP[priority] || PRIORITY_MAP["Medium"]
  return (
    <TintedBadge bg={meta.bg} fg={meta.color}>
      <Flag className="h-3 w-3" />
      {priority}
    </TintedBadge>
  )
}

function DueDateRuleBadge({ rule }: { rule: string }) {
  const { bg, fg } = ruleColor(rule)
  return (
    <TintedBadge bg={bg} fg={fg}>
      <Clock className="h-3 w-3" />
      {ruleDisplay(rule)}
    </TintedBadge>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY_MAP[category] || { value: category, label: category, icon: Tag, color: "#64748b" }
  const Icon = meta.icon
  return (
    <TintedBadge bg={`${meta.color}1a`} fg={meta.color}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </TintedBadge>
  )
}

function FlagChip({
  active, icon: Icon, label, tone,
}: {
  active: boolean
  icon: LucideIcon
  label: string
  tone: "rose" | "amber" | "emerald" | "slate" | "cyan"
}) {
  if (!active) return null
  const tones: Record<string, string> = {
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-300",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300",
  }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-transparent", tones[tone])}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
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
          <ListChecks className="h-4 w-4 text-rose-600" />
          Categories
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
          <div className="max-h-[420px] overflow-y-auto pr-1 -mr-1">
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
          </div>
        </nav>
      </CardContent>
    </Card>
  )
}

// ============================================================================
//  Checklist editor dialog
// ============================================================================

interface DraftTask extends ExitChecklistTask {
  _status: string
}

function blankTask(idx: number): DraftTask {
  return {
    id: `ct-${Date.now()}-${idx}`,
    name: "",
    code: `TASK_${idx + 1}`,
    description: "",
    ownerType: "Employee",
    owner: "",
    dueDateRule: "On Exit Initiation",
    priority: "Medium",
    mandatory: true,
    blocking: false,
    requiresAttachment: false,
    requiresComment: false,
    requiresApproval: false,
    financialImpact: false,
    recoveryAllowed: false,
    stageMapping: "",
    _status: "Active",
  }
}

function ChecklistEditor({
  open, onOpenChange, initial, onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: ExitChecklist | null
  onSave: (cl: ExitChecklist) => void
}) {
  const isEdit = !!initial
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [category, setCategory] = useState<string>("Employee Exit Checklist")
  const [scopeType, setScopeType] = useState<ScopeType>("Tenant Default")
  const [entity, setEntity] = useState("")
  const [department, setDepartment] = useState("")
  const [employeeType, setEmployeeType] = useState("")
  const [exitType, setExitType] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [status, setStatus] = useState<"Draft" | "Active">("Active")
  const [version, setVersion] = useState(1)
  const [tasks, setTasks] = useState<DraftTask[]>([])

  // Hydrate state when dialog opens / initial changes
  React.useEffect(() => {
    if (!open) return
    if (initial) {
      setName(initial.name)
      setCode(initial.code)
      setCategory(initial.category)
      setScopeType(initial.scopeType)
      setEntity(initial.entity || "")
      setDepartment("")
      setEmployeeType("")
      setExitType(initial.exitType || "")
      setIsDefault(initial.isDefault)
      setStatus(initial.status)
      setVersion(initial.version)
      setTasks(initial.tasks.map((t) => ({ ...t, _status: "Active" })))
    } else {
      setName("")
      setCode("")
      setCategory("Employee Exit Checklist")
      setScopeType("Tenant Default")
      setEntity("")
      setDepartment("")
      setEmployeeType("")
      setExitType("")
      setIsDefault(false)
      setStatus("Active")
      setVersion(1)
      setTasks([blankTask(0)])
    }
  }, [open, initial?.id])

  const updateTask = (id: string, patch: Partial<DraftTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const updateTaskRule = (id: string, key: string, offset: number) => {
    updateTask(id, { dueDateRule: composeRule(key, offset) })
  }

  const addTask = () => {
    setTasks((prev) => [...prev, blankTask(prev.length)])
  }

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const duplicateTask = (id: string) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      if (idx === -1) return prev
      const copy: DraftTask = { ...prev[idx], id: `ct-${Date.now()}`, code: `${prev[idx].code}_COPY` }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
    toast.success("Task duplicated")
  }

  const moveTask = (id: string, dir: -1 | 1) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      if (idx === -1) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  const handleSave = () => {
    if (!name.trim()) { toast.error("Checklist name is required"); return }
    if (!code.trim()) { toast.error("Checklist code is required"); return }
    if (tasks.length === 0) { toast.error("Add at least one task"); return }
    const emptyTask = tasks.find((t) => !t.name.trim())
    if (emptyTask) { toast.error("All tasks must have a name"); return }
    const finalTasks: ExitChecklistTask[] = tasks.map((t, i) => ({
      id: t.id,
      name: t.name.trim(),
      code: t.code.trim() || `TASK_${i + 1}`,
      description: t.description,
      ownerType: t.ownerType,
      owner: t.owner,
      dueDateRule: t.dueDateRule,
      priority: t.priority,
      mandatory: t.mandatory,
      blocking: t.blocking,
      requiresAttachment: t.requiresAttachment,
      requiresComment: t.requiresComment,
      requiresApproval: t.requiresApproval,
      financialImpact: t.financialImpact,
      recoveryAllowed: t.recoveryAllowed,
      stageMapping: t.stageMapping,
    }))
    const payload: ExitChecklist = {
      id: initial?.id || `cl-${Date.now()}`,
      name: name.trim(),
      code: code.trim() || toCode(name),
      category,
      scopeType,
      entity: entity || undefined,
      exitType: exitType || undefined,
      status,
      isDefault,
      version,
      tasks: finalTasks,
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
            <ListChecks className="h-5 w-5 text-rose-600" />
            {isEdit ? "Edit Checklist" : "New Checklist"}
            {isEdit && initial && (
              <Badge variant="outline" className="ml-2 font-mono text-[10px]">{initial.code}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update checklist details and tasks. Changes are versioned."
              : "Configure a reusable exit checklist with task definitions."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6 pb-2">
            {/* ---------- Header fields ---------- */}
            <section>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-rose-500" />
                Checklist Details
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2 lg:col-span-2">
                  <FieldLabel icon={Hash}>Checklist Name</FieldLabel>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Standard Employee Exit Checklist"
                    onBlur={() => { if (!code && name) setCode(toCode(name)) }}
                  />
                </div>
                <div>
                  <FieldLabel icon={Hash}>Code</FieldLabel>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="EXIT_CHK_STD"
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
                  <FieldLabel icon={Building2}>Entity / Company</FieldLabel>
                  <Input value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="All entities" />
                </div>
                <div>
                  <FieldLabel icon={Network}>Department</FieldLabel>
                  <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="All departments" />
                </div>
                <div>
                  <FieldLabel icon={UserIcon}>Employee Type</FieldLabel>
                  <Select value={employeeType} onValueChange={setEmployeeType}>
                    <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel icon={Calendar}>Exit Type</FieldLabel>
                  <Select value={exitType} onValueChange={setExitType}>
                    <SelectTrigger><SelectValue placeholder="All exit types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Exit Types</SelectItem>
                      {EXIT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
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
                    <Switch checked={isDefault} onCheckedChange={setIsDefault} />
                    <span className="text-sm">Default</span>
                  </label>
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

            {/* ---------- Tasks ---------- */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <CheckCheck className="h-3 w-3 text-rose-500" />
                  Tasks ({tasks.length})
                </div>
                <Button size="sm" variant="outline" onClick={addTask} className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30">
                  <Plus className="h-3.5 w-3.5" /> Add Task
                </Button>
              </div>

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {tasks.map((task, idx) => {
                    const { key, offset } = parseRule(task.dueDateRule)
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="rounded-xl border border-border/60 bg-card hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors shadow-sm"
                      >
                        {/* Task header */}
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-muted/30 rounded-t-xl">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <GripVertical className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-mono">#{idx + 1}</span>
                          </div>
                          <Input
                            value={task.name}
                            onChange={(e) => updateTask(task.id, { name: e.target.value })}
                            placeholder="Task name (e.g. Submit resignation letter)"
                            className="h-8 flex-1 border-transparent bg-transparent focus-visible:border-input focus-visible:bg-background"
                          />
                          <Input
                            value={task.code}
                            onChange={(e) => updateTask(task.id, { code: e.target.value })}
                            placeholder="CODE"
                            className="h-8 w-32 font-mono text-xs"
                          />
                          <div className="flex items-center gap-0.5">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveTask(task.id, -1)} disabled={idx === 0} title="Move up">
                              <ChevronRight className="h-3.5 w-3.5 -rotate-90" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveTask(task.id, 1)} disabled={idx === tasks.length - 1} title="Move down">
                              <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-rose-600" onClick={() => duplicateTask(task.id)} title="Duplicate">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-rose-600" onClick={() => removeTask(task.id)} title="Remove">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Task body */}
                        <div className="p-3 space-y-3">
                          <div>
                            <FieldLabel>Description</FieldLabel>
                            <Textarea
                              value={task.description || ""}
                              onChange={(e) => updateTask(task.id, { description: e.target.value })}
                              placeholder="What does this task involve?"
                              className="min-h-[44px] text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <div>
                              <FieldLabel icon={UserIcon}>Owner Type</FieldLabel>
                              <Select value={task.ownerType} onValueChange={(v) => updateTask(task.id, { ownerType: v })}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {OWNER_TYPES.map((o) => (
                                    <SelectItem key={o} value={o}>{o}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <FieldLabel icon={UserIcon}>Owner</FieldLabel>
                              <Input
                                value={task.owner || ""}
                                onChange={(e) => updateTask(task.id, { owner: e.target.value })}
                                placeholder="Specific person / role"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <FieldLabel icon={Flag}>Priority</FieldLabel>
                              <Select value={task.priority} onValueChange={(v) => updateTask(task.id, { priority: v as ExitChecklistTask["priority"] })}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {PRIORITIES.map((p) => (
                                    <SelectItem key={p.value} value={p.value}>{p.value}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <FieldLabel icon={Layers}>Stage Mapping</FieldLabel>
                              <Select value={task.stageMapping || "_none"} onValueChange={(v) => updateTask(task.id, { stageMapping: v === "_none" ? "" : v })}>
                                <SelectTrigger className="h-8"><SelectValue placeholder="No stage" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none">No stage mapping</SelectItem>
                                  {STAGE_OPTIONS.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Due date rule row */}
                          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 items-end">
                            <div className="lg:col-span-2">
                              <FieldLabel icon={Clock}>Due Date Rule</FieldLabel>
                              <Select value={key} onValueChange={(v) => updateTaskRule(task.id, v, offset)}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {DUE_DATE_RULES.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {DUE_DATE_RULE_MAP[key]?.hasOffset && (
                              <div>
                                <FieldLabel icon={Calendar}>Offset (days)</FieldLabel>
                                <Input
                                  type="number" min={0}
                                  value={offset}
                                  onChange={(e) => updateTaskRule(task.id, key, Math.max(0, parseInt(e.target.value, 10) || 0))}
                                  className="h-8"
                                />
                              </div>
                            )}
                            <div className="lg:col-span-1">
                              <FieldLabel>Preview</FieldLabel>
                              <DueDateRuleBadge rule={task.dueDateRule} />
                            </div>
                          </div>

                          {/* Flags grid */}
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 rounded-lg bg-muted/30 p-3 border border-border/40">
                            <FlagSwitch label="Mandatory" tone="rose" checked={task.mandatory} onChange={(v) => updateTask(task.id, { mandatory: v })} icon={ShieldCheck} />
                            <FlagSwitch label="Blocking" tone="amber" checked={task.blocking} onChange={(v) => updateTask(task.id, { blocking: v })} icon={Ban} />
                            <FlagSwitch label="Requires Attachment" tone="emerald" checked={task.requiresAttachment} onChange={(v) => updateTask(task.id, { requiresAttachment: v })} icon={Paperclip} />
                            <FlagSwitch label="Requires Comment" tone="cyan" checked={task.requiresComment} onChange={(v) => updateTask(task.id, { requiresComment: v })} icon={MessageSquare} />
                            <FlagSwitch label="Requires Approval" tone="rose" checked={task.requiresApproval} onChange={(v) => updateTask(task.id, { requiresApproval: v })} icon={CheckCheck} />
                            <FlagSwitch label="Financial Impact" tone="emerald" checked={task.financialImpact} onChange={(v) => updateTask(task.id, { financialImpact: v })} icon={IndianRupee} />
                            <FlagSwitch label="Recovery Allowed" tone="amber" checked={task.recoveryAllowed} onChange={(v) => updateTask(task.id, { recoveryAllowed: v })} icon={RefreshCw} />
                            <FlagSwitch label="Active" tone="slate" checked={task._status === "Active"} onChange={(v) => updateTask(task.id, { _status: v ? "Active" : "Inactive" })} icon={CheckCircle2} />
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {tasks.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                    <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No tasks yet. Click <span className="font-medium text-rose-600">Add Task</span> to begin.
                  </div>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} · Version {version} · {status}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-1.5">
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleSave} className="gap-1.5 gradient-rose text-primary-foreground">
              <Save className="h-4 w-4" /> {isEdit ? "Update Checklist" : "Save Checklist"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FlagSwitch({
  label, checked, onChange, tone, icon: Icon,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  tone: "rose" | "amber" | "emerald" | "slate" | "cyan"
  icon: LucideIcon
}) {
  const toneRing: Record<string, string> = {
    rose: "data-[state=checked]:bg-rose-600",
    amber: "data-[state=checked]:bg-amber-500",
    emerald: "data-[state=checked]:bg-emerald-600",
    slate: "data-[state=checked]:bg-slate-500",
    cyan: "data-[state=checked]:bg-cyan-600",
  }
  const toneText: Record<string, string> = {
    rose: "text-rose-600 dark:text-rose-400",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    slate: "text-slate-500 dark:text-slate-400",
    cyan: "text-cyan-600 dark:text-cyan-400",
  }
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-background/60 transition-colors">
      <span className="flex items-center gap-1.5 text-xs font-medium min-w-0">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", toneText[tone])} />
        <span className="truncate">{label}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} className={cn(toneRing[tone])} />
    </label>
  )
}

// ============================================================================
//  Checklist preview dialog (read-only)
// ============================================================================

function ChecklistPreview({
  open, onOpenChange, checklist,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  checklist: ExitChecklist | null
}) {
  if (!checklist) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border/60 bg-gradient-to-r from-rose-50/60 to-transparent dark:from-rose-950/20">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="h-5 w-5 text-rose-600" />
            {checklist.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {checklist.code} · v{checklist.version} · {checklist.tasks.length} tasks
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            {/* Meta strip */}
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={checklist.category} />
              <StatusBadge status={checklist.status} />
              {checklist.isDefault && (
                <TintedBadge bg="#fff1f2" fg="#e11d48">
                  <Star className="h-3 w-3" /> Default
                </TintedBadge>
              )}
              <TintedBadge bg="#f1f5f9" fg="#475569">
                <Layers className="h-3 w-3" /> {checklist.scopeType}
              </TintedBadge>
              {checklist.entity && (
                <TintedBadge bg="#ecfeff" fg="#0891b2">
                  <Building2 className="h-3 w-3" /> {checklist.entity}
                </TintedBadge>
              )}
              {checklist.exitType && (
                <TintedBadge bg="#fdf4ff" fg="#a21caf">
                  <Calendar className="h-3 w-3" /> {checklist.exitType}
                </TintedBadge>
              )}
            </div>

            {/* Tasks list */}
            <div className="space-y-2">
              {checklist.tasks.map((t, idx) => (
                <div key={t.id} className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-medium text-sm">{t.name}</div>
                        <span className="text-[10px] font-mono text-muted-foreground">{t.code}</span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <PriorityBadge priority={t.priority} />
                        <DueDateRuleBadge rule={t.dueDateRule} />
                        <TintedBadge bg="#f1f5f9" fg="#475569">
                          <UserIcon className="h-3 w-3" /> {t.ownerType}
                        </TintedBadge>
                        {t.owner && (
                          <TintedBadge bg="#ecfeff" fg="#0891b2">{t.owner}</TintedBadge>
                        )}
                        {t.stageMapping && (
                          <TintedBadge bg="#fef3c7" fg="#d97706">
                            <Layers className="h-3 w-3" /> {t.stageMapping}
                          </TintedBadge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap mt-2">
                        <FlagChip active={t.mandatory} icon={ShieldCheck} label="Mandatory" tone="rose" />
                        <FlagChip active={t.blocking} icon={Ban} label="Blocking" tone="amber" />
                        <FlagChip active={t.requiresAttachment} icon={Paperclip} label="Attachment" tone="emerald" />
                        <FlagChip active={t.requiresComment} icon={MessageSquare} label="Comment" tone="cyan" />
                        <FlagChip active={t.requiresApproval} icon={CheckCheck} label="Approval" tone="rose" />
                        <FlagChip active={t.financialImpact} icon={IndianRupee} label="Financial" tone="emerald" />
                        <FlagChip active={t.recoveryAllowed} icon={RefreshCw} label="Recovery" tone="amber" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 py-4 border-t border-border/60">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-1.5">
            <X className="h-4 w-4" /> Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Main section component
// ============================================================================

export function ChecklistsSection() {
  const [checklists, setChecklists] = useState<ExitChecklist[]>(EXIT_CHECKLISTS)
  const [activeCategory, setActiveCategory] = useState<string | "all">("all")
  const [search, setSearch] = useState("")
  const [scopeFilter, setScopeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<ExitChecklist | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewing, setPreviewing] = useState<ExitChecklist | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExitChecklist | null>(null)

  // ---------- Derived: counts per category ----------
  const counts = useMemo(() => {
    const out: Record<string, number> = {}
    checklists.forEach((c) => { out[c.category] = (out[c.category] || 0) + 1 })
    return out
  }, [checklists])

  // ---------- Derived: filtered list ----------
  const filtered = useMemo(() => {
    return checklists.filter((c) => {
      if (activeCategory !== "all" && c.category !== activeCategory) return false
      if (scopeFilter !== "all" && c.scopeType !== scopeFilter) return false
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hay = `${c.name} ${c.code} ${c.category} ${c.entity || ""} ${c.exitType || ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [checklists, activeCategory, scopeFilter, statusFilter, search])

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const total = checklists.length
    const active = checklists.filter((c) => c.status === "Active").length
    const defaultCount = checklists.filter((c) => c.isDefault).length
    const tasks = checklists.reduce((sum, c) => sum + c.tasks.length, 0)
    return { total, active, defaultCount, tasks }
  }, [checklists])

  // ---------- Handlers ----------
  const handleNew = () => {
    setEditing(null)
    setEditorOpen(true)
  }

  const handleEdit = (c: ExitChecklist) => {
    setEditing(c)
    setEditorOpen(true)
  }

  const handleClone = (c: ExitChecklist) => {
    const copy: ExitChecklist = {
      ...c,
      id: `cl-${Date.now()}`,
      name: `${c.name} (Copy)`,
      code: `${c.code}_COPY`,
      isDefault: false,
      version: 1,
      status: "Draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tasks: c.tasks.map((t, i) => ({ ...t, id: `ct-${Date.now()}-${i}` })),
    }
    setChecklists((prev) => [copy, ...prev])
    toast.success(`Cloned "${c.name}"`)
  }

  const handlePreview = (c: ExitChecklist) => {
    setPreviewing(c)
    setPreviewOpen(true)
  }

  const handleDelete = (c: ExitChecklist) => {
    setChecklists((prev) => prev.filter((x) => x.id !== c.id))
    setDeleteTarget(null)
    toast.success(`Deleted "${c.name}"`)
  }

  const handleSave = (payload: ExitChecklist) => {
    setChecklists((prev) => {
      const idx = prev.findIndex((c) => c.id === payload.id)
      if (idx === -1) return [payload, ...prev]
      const next = [...prev]
      next[idx] = payload
      return next
    })
    toast.success(editing ? "Checklist updated" : "Checklist created", {
      description: `${payload.name} (${payload.code})`,
    })
  }

  // ============================================================================
  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Total Checklists" value={stats.total} icon={ListChecks} color="#e11d48" bg="#fff1f2" />
        <MiniStat label="Active" value={stats.active} icon={CheckCircle2} color="#10b981" bg="#ecfdf5" />
        <MiniStat label="Default" value={stats.defaultCount} icon={Star} color="#f59e0b" bg="#fffbeb" />
        <MiniStat label="Total Tasks" value={stats.tasks} icon={CheckCheck} color="#8b5cf6" bg="#f5f3ff" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        {/* Category sidebar */}
        <CategorySidebar
          active={activeCategory}
          onSelect={setActiveCategory}
          counts={counts}
          total={checklists.length}
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
                    placeholder="Search checklists, codes, categories…"
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
                    <Plus className="h-4 w-4" /> New Checklist
                  </Button>
                </div>
              </div>
              {(activeCategory !== "all" || scopeFilter !== "all" || statusFilter !== "all" || search) && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  <span>Showing {filtered.length} of {checklists.length} checklists</span>
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

          {/* Checklists table */}
          <Card className="shadow-sm border-border/60 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="h-4 w-4 text-rose-600" />
                Exit Checklists
                <Badge variant="secondary" className="ml-1 font-normal">{filtered.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[640px]">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
                    <TableRow>
                      <TableHead className="min-w-[260px]">Checklist</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Exit Type</TableHead>
                      <TableHead className="text-center">Tasks</TableHead>
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
                        <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                          <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          No checklists match the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((c) => {
                        const meta = CATEGORY_MAP[c.category] || { value: c.category, label: c.category, icon: Tag, color: "#64748b" }
                        const Icon = meta.icon
                        return (
                          <TableRow
                            key={c.id}
                            className="cursor-pointer hover:bg-rose-50/40 dark:hover:bg-rose-950/10 transition-colors"
                            onClick={() => handlePreview(c)}
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
                                  <div className="font-medium text-sm text-foreground group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">{c.name}</div>
                                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{c.code}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <CategoryBadge category={c.category} />
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-foreground/80">{c.scopeType}</span>
                              {c.entity && (
                                <div className="text-[10px] text-muted-foreground">{c.entity}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {c.exitType ? (
                                <span className="text-xs">{c.exitType}</span>
                              ) : <span className="text-xs text-muted-foreground">All</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-mono">{c.tasks.length}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {c.isDefault ? (
                                <TintedBadge bg="#fffbeb" fg="#d97706">
                                  <Star className="h-3 w-3" /> Yes
                                </TintedBadge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell><StatusBadge status={c.status} /></TableCell>
                            <TableCell className="text-center">
                              <span className="text-xs font-mono">v{c.version}</span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(c.updatedAt)}</TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleEdit(c)}>
                                    <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleClone(c)}>
                                    <Copy className="h-3.5 w-3.5 mr-2" /> Clone
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePreview(c)}>
                                    <Eye className="h-3.5 w-3.5 mr-2" /> Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-rose-600 focus:text-rose-700"
                                    onClick={() => setDeleteTarget(c)}
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

          {/* Due Date Rules legend */}
          <Card className="shadow-sm border-border/60 bg-muted/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-rose-600" />
                <span className="text-sm font-semibold">Due Date Rule Reference</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DUE_DATE_RULES.map((r) => {
                  const sample = composeRule(r.value, r.hasOffset ? 7 : 0)
                  const { bg, fg } = ruleColor(sample)
                  return (
                    <div key={r.value} className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5">
                      <DueDateRuleBadge rule={sample} />
                      <span className="text-[10px] text-muted-foreground">{r.label}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Editor */}
      <ChecklistEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editing}
        onSave={handleSave}
      />

      {/* Preview */}
      <ChecklistPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        checklist={previewing}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              Delete Checklist?
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

export default ChecklistsSection
