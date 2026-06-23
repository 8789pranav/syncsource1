"use client"

// ============================================================
// Task 7 — Onboarding > Candidate Initiation Section
// Where HR adds a new candidate and selects which board (workflow)
// to put them on. The selected workflow's stages become the
// candidate's onboarding pipeline (instantiated via POST /api/onboarding-candidates).
// ============================================================

import * as React from "react"
import {
  UserPlus, Search, Pencil, Trash2, Mail, Building2, Calendar,
  Flag, KanbanSquare, CheckCircle2, Clock, AlertTriangle, Eye, X,
  Sparkles, ArrowRight, Users, Activity, Gauge, Plus,
  CircleDot, ShieldCheck, MoreHorizontal,
} from "lucide-react"
import { toast } from "sonner"

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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import {
  PageHeader, StatCard, EmptyState, Column, DataTable,
} from "@/components/hrms/ui"

import {
  useFetch, apiPost, apiPatch, apiDelete, safeToast, safeParseJson,
  formatDate, initials,
  STAGE_COLORS, EMPLOYMENT_TYPES, PRIORITIES,
  type OnboardingWorkflow, type OnboardingCandidate,
} from "@/components/hrms/onboarding/shared"

// ============================================================
// Local constants
// ============================================================

const STATUS_OPTIONS = ["All", "Active", "OnHold", "Completed", "Withdrawn"] as const
type StatusFilter = typeof STATUS_OPTIONS[number]

const PRIORITY_BADGE: Record<string, string> = {
  Low: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  Medium: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  High: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  Critical: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
}

const STATUS_BADGE: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  OnHold: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  Completed: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  Withdrawn: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
}

// Maps a lucide icon name (from workflow.icon) → component. Falls back to KanbanSquare.
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  KanbanSquare, Users, Activity, ShieldCheck, CheckCircle2, Clock, CircleDot, Sparkles,
}

function iconFor(name?: string | null) {
  if (!name) return KanbanSquare
  return ICON_MAP[name] || KanbanSquare
}

// ============================================================
// Form state shape
// ============================================================

interface CandidateForm {
  workflowId: string
  candidateName: string
  email: string
  phone: string
  employeeCode: string
  designation: string
  department: string
  grade: string
  employmentType: string
  joinDate: string // yyyy-mm-dd from <input type="date">
  reportTo: string
  priority: string
  avatarColor: string
  tags: string // comma-separated string in the UI
  ownerId: string
}

const EMPTY_FORM: CandidateForm = {
  workflowId: "",
  candidateName: "",
  email: "",
  phone: "",
  employeeCode: "",
  designation: "",
  department: "",
  grade: "",
  employmentType: "Full-time",
  joinDate: "",
  reportTo: "",
  priority: "Medium",
  avatarColor: "#10b981",
  tags: "",
  ownerId: "",
}

// ============================================================
// Main component
// ============================================================

export function InitiateSection() {
  // ---- data ----
  const workflowsFetch = useFetch<{ items: OnboardingWorkflow[] }>("/api/onboarding-workflows")
  const candidatesFetch = useFetch<{ items: OnboardingCandidate[] }>("/api/onboarding-candidates")

  const workflows = workflowsFetch.data?.items ?? []
  const candidates = candidatesFetch.data?.items ?? []

  // ---- UI state ----
  const [search, setSearch] = React.useState("")
  const [workflowFilter, setWorkflowFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("All")

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<OnboardingCandidate | null>(null)
  const [form, setForm] = React.useState<CandidateForm>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  // ---- derived ----
  const filteredCandidates = React.useMemo(() => {
    let list = candidates
    if (workflowFilter !== "all") list = list.filter((c) => c.workflow?.id === workflowFilter)
    if (statusFilter !== "All") list = list.filter((c) => c.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((c) =>
        (c.candidateName || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.employeeCode || "").toLowerCase().includes(q)
      )
    }
    return list
  }, [candidates, workflowFilter, statusFilter, search])

  const stats = React.useMemo(() => {
    const total = candidates.length
    const active = candidates.filter((c) => c.status === "Active").length
    const completed = candidates.filter((c) => c.status === "Completed").length
    const avg = total > 0
      ? Math.round(candidates.reduce((s, c) => s + (c.progress || 0), 0) / total)
      : 0
    return { total, active, completed, avg }
  }, [candidates])

  const reloadAll = React.useCallback(() => {
    workflowsFetch.reload()
    candidatesFetch.reload()
  }, [workflowsFetch, candidatesFetch])

  // ---- dialog helpers ----
  const setField = <K extends keyof CandidateForm>(k: K, v: CandidateForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const openAdd = () => {
    setEditing(null)
    const defaultWf = workflows.find((w) => w.isDefault) || workflows[0]
    setForm({
      ...EMPTY_FORM,
      workflowId: defaultWf?.id || "",
      avatarColor: defaultWf?.color || "#10b981",
    })
    setDialogOpen(true)
  }

  const openEdit = (c: OnboardingCandidate) => {
    setEditing(c)
    const tagsArr = safeParseJson<string[]>(c.tags, [])
    setForm({
      workflowId: c.workflow?.id || "",
      candidateName: c.candidateName || "",
      email: c.email || "",
      phone: c.phone || "",
      employeeCode: c.employeeCode || "",
      designation: c.designation || "",
      department: c.department || "",
      grade: c.grade || "",
      employmentType: c.employmentType || "Full-time",
      joinDate: c.joinDate ? c.joinDate.slice(0, 10) : "",
      reportTo: c.reportTo || "",
      priority: c.priority || "Medium",
      avatarColor: c.avatarColor || "#10b981",
      tags: tagsArr.join(", "),
      ownerId: c.ownerId || "",
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  // ---- submit ----
  const submit = async () => {
    if (!form.workflowId) {
      toast.error("Please select an onboarding board (workflow) first.")
      return
    }
    if (!form.candidateName.trim()) {
      toast.error("Candidate name is required.")
      return
    }
    setSaving(true)

    const payload = {
      workflowId: form.workflowId,
      candidateName: form.candidateName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      employeeCode: form.employeeCode.trim() || undefined,
      designation: form.designation.trim() || undefined,
      department: form.department.trim() || undefined,
      grade: form.grade.trim() || undefined,
      employmentType: form.employmentType,
      joinDate: form.joinDate ? new Date(form.joinDate).toISOString() : undefined,
      reportTo: form.reportTo.trim() || undefined,
      priority: form.priority,
      avatarColor: form.avatarColor,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      ownerId: form.ownerId.trim() || undefined,
    }

    try {
      if (editing) {
        const p = apiPatch(`/api/onboarding-candidates/${editing.id}`, payload)
        const wfName = editing.workflow?.name || "board"
        await safeToast(p, `Candidate updated on ${wfName} board`, "Failed to update candidate")
        closeDialog()
        reloadAll()
      } else {
        const wf = workflows.find((w) => w.id === form.workflowId)
        const wfName = wf?.name || "board"
        const p = apiPost("/api/onboarding-candidates", payload)
        await safeToast(p, `Candidate added to ${wfName} board`, "Failed to add candidate")
        closeDialog()
        reloadAll()
      }
    } catch {
      // toast handled by safeToast
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    const p = apiDelete(`/api/onboarding-candidates/${deletingId}`)
    await safeToast(p, "Candidate removed", "Failed to remove candidate")
    setDeletingId(null)
    reloadAll()
  }

  // ---- selected workflow (for preview & first stage) ----
  const selectedWorkflow = workflows.find((w) => w.id === form.workflowId) || null
  const firstStage = selectedWorkflow?.stages?.[0] || null

  // ---- table columns ----
  const columns: Column<OnboardingCandidate>[] = [
    {
      key: "candidate",
      header: "Candidate",
      width: "260px",
      render: (c) => (
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white text-xs font-semibold shadow-sm"
            style={{ backgroundColor: c.avatarColor || "#10b981" }}
          >
            {initials(c.candidateName || "?")}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{c.candidateName}</p>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {c.email || "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "designation",
      header: "Designation / Dept",
      width: "200px",
      render: (c) => (
        <div className="min-w-0">
          <p className="text-sm text-foreground truncate">{c.designation || "—"}</p>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {c.department || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "board",
      header: "Board",
      width: "180px",
      render: (c) => (
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: c.workflow?.color || "#64748b" }}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{c.workflow?.name || "—"}</p>
            <p className="text-xs text-muted-foreground truncate">{c.workflow?.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: "stage",
      header: "Current Stage",
      width: "170px",
      render: (c) => {
        const s = c.currentStage
        if (!s) return <span className="text-sm text-muted-foreground/60 italic">—</span>
        return (
          <Badge
            variant="secondary"
            className="font-medium border-0 gap-1.5"
            style={{
              backgroundColor: `${s.color}1a`,
              color: s.color,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </Badge>
        )
      },
    },
    {
      key: "progress",
      header: "Progress",
      width: "160px",
      render: (c) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <Progress
            value={c.progress || 0}
            className="h-1.5 flex-1 bg-muted"
          />
          <span className="text-xs font-medium tabular-nums text-muted-foreground w-9 text-right">
            {c.progress || 0}%
          </span>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      width: "110px",
      render: (c) => (
        <Badge
          variant="secondary"
          className={cn("font-medium border-0", PRIORITY_BADGE[c.priority] || PRIORITY_BADGE.Medium)}
        >
          {c.priority || "Medium"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (c) => (
        <Badge
          variant="secondary"
          className={cn("font-medium border-0", STATUS_BADGE[c.status] || "bg-muted text-muted-foreground")}
        >
          {c.status || "Active"}
        </Badge>
      ),
    },
    {
      key: "joinDate",
      header: "Join Date",
      width: "120px",
      render: (c) => (
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3 opacity-60" />
          {formatDate(c.joinDate)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "80px",
      render: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => openEdit(c)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View / Edit</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => openEdit(c)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-500/10"
                onClick={() => setDeletingId(c.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-5">
      <PageHeader
        title="Candidate Initiation"
        description="Add new hires and place them on the right onboarding board. The selected workflow becomes their pipeline."
        icon={UserPlus}
        badge={
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            {candidates.length} candidate{candidates.length === 1 ? "" : "s"}
          </Badge>
        }
        actions={
          <Button onClick={openAdd} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <UserPlus className="h-4 w-4" /> Add Candidate
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Candidates"
          value={stats.total}
          icon={Users}
          accent="emerald"
          sub={`${workflows.length} board${workflows.length === 1 ? "" : "s"} available`}
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={Activity}
          accent="cyan"
          sub="Currently in pipeline"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          accent="emerald"
          sub="Onboarding finished"
        />
        <StatCard
          label="Avg Progress"
          value={`${stats.avg}%`}
          icon={Gauge}
          accent="amber"
          sub="Across all candidates"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, code..."
            className="pl-9 h-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
            <SelectTrigger className="h-9 w-[180px] bg-background">
              <SelectValue placeholder="All boards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All boards</SelectItem>
              {workflows.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: w.color }} />
                    {w.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-9 w-[140px] bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "All" ? "All statuses" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openAdd} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {/* Table */}
      <DataTable<OnboardingCandidate>
        columns={columns}
        rows={filteredCandidates}
        loading={candidatesFetch.loading}
        onRowClick={(c) => openEdit(c)}
        emptyState={
          <EmptyState
            icon={UserPlus}
            title={search || workflowFilter !== "all" || statusFilter !== "All"
              ? "No candidates match your filters"
              : "No candidates yet"}
            description={search || workflowFilter !== "all" || statusFilter !== "All"
              ? "Try adjusting your search or filters."
              : "Add your first candidate to kick off an onboarding pipeline."}
            action={
              !search && workflowFilter === "all" && statusFilter === "All" ? (
                <Button onClick={openAdd} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <UserPlus className="h-4 w-4" /> Add Candidate
                </Button>
              ) : undefined
            }
          />
        }
      />

      {/* Add / Edit Dialog */}
      <CandidateDialog
        open={dialogOpen}
        onOpenChange={(o) => (o ? setDialogOpen(true) : closeDialog())}
        editing={editing}
        form={form}
        setField={setField}
        workflows={workflows}
        saving={saving}
        onSubmit={submit}
        selectedWorkflow={selectedWorkflow}
        firstStage={firstStage}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              The candidate record, their onboarding instance, and all stage progress will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// Candidate Add/Edit Dialog (with board selection)
// ============================================================

interface DialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: OnboardingCandidate | null
  form: CandidateForm
  setField: <K extends keyof CandidateForm>(k: K, v: CandidateForm[K]) => void
  workflows: OnboardingWorkflow[]
  saving: boolean
  onSubmit: () => void
  selectedWorkflow: OnboardingWorkflow | null
  firstStage: { id: string; name: string; order: number; color: string } | null
}

function CandidateDialog({
  open, onOpenChange, editing, form, setField, workflows, saving, onSubmit,
  selectedWorkflow, firstStage,
}: DialogProps) {
  const noWorkflows = workflows.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/60">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            {editing ? "Edit Candidate" : "Initiate Onboarding"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update candidate details. Workflow (board) cannot be changed after creation."
              : "Select an onboarding board, then fill in the candidate's information. The board's stages will become their pipeline."}
          </DialogDescription>
        </DialogHeader>

        {/* Body — scrollable */}
        <ScrollArea className="flex-1 max-h-[calc(92vh-180px)]">
          <div className="px-6 py-5 space-y-7">
            {/* ---------- Step 1: Select Board ---------- */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="grid h-6 w-6 place-items-center rounded-md bg-emerald-600 text-white text-xs font-bold">
                  1
                </div>
                <h3 className="text-sm font-semibold text-foreground">Select Onboarding Board</h3>
                <span className="text-xs text-muted-foreground">
                  · The board defines the pipeline stages
                </span>
              </div>

              {noWorkflows ? (
                <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      No workflows available
                    </p>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                      Please create a workflow first in the <span className="font-medium">Workflows</span> tab.
                      A candidate must be placed on a board to start onboarding.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {workflows.map((w) => {
                    const Icon = iconFor(w.icon)
                    const isSelected = form.workflowId === w.id
                    const stages = w.stages || []
                    return (
                      <button
                        key={w.id}
                        type="button"
                        disabled={!!editing}
                        onClick={() => {
                          if (editing) return
                          setField("workflowId", w.id)
                        }}
                        className={cn(
                          "group relative text-left rounded-xl border bg-card overflow-hidden",
                          "border-border/60 shadow-soft hover:shadow-card transition-all",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                          editing && "cursor-not-allowed opacity-70",
                        )}
                        style={isSelected ? { boxShadow: `0 0 0 2px ${w.color}, 0 4px 14px rgba(0,0,0,0.08)` } : undefined}
                      >
                        {/* Color stripe */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: w.color }} />

                        <div className="p-4 pl-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                                style={{ backgroundColor: `${w.color}1a`, color: w.color }}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                                  {w.name}
                                  {w.isDefault && (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1 h-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                                      DEFAULT
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {w.code} · {w.category}
                                </p>
                              </div>
                            </div>
                            {isSelected ? (
                              <span
                                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-white"
                                style={{ backgroundColor: w.color }}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border/60 text-transparent group-hover:border-foreground/30" />
                            )}
                          </div>

                          {/* Meta */}
                          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <KanbanSquare className="h-3 w-3" />
                              {w._count?.stages ?? stages.length} stage{(w._count?.stages ?? stages.length) === 1 ? "" : "s"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {w._count?.candidates ?? 0} candidate{(w._count?.candidates ?? 0) === 1 ? "" : "s"}
                            </span>
                          </div>

                          {/* Stage preview dots */}
                          {stages.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/40">
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground/80 mb-2 font-medium">
                                Pipeline
                              </p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {stages.slice(0, 8).map((s, i) => (
                                  <div key={s.id} className="flex items-center gap-1.5">
                                    {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: s.color }}
                                      title={s.name}
                                    />
                                  </div>
                                ))}
                                {stages.length > 8 && (
                                  <span className="text-[10px] text-muted-foreground ml-1">+{stages.length - 8}</span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1.5 truncate">
                                {stages.map((s) => s.name).join(" → ")}
                              </p>
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {editing && selectedWorkflow && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Workflow cannot be changed after creation. This candidate is on the
                  <span className="font-medium">{selectedWorkflow.name}</span> board.
                </p>
              )}
            </section>

            <Separator />

            {/* ---------- Step 2: Candidate Information ---------- */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="grid h-6 w-6 place-items-center rounded-md bg-emerald-600 text-white text-xs font-bold">
                  2
                </div>
                <h3 className="text-sm font-semibold text-foreground">Candidate Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Candidate Name" required>
                  <Input
                    value={form.candidateName}
                    onChange={(e) => setField("candidateName", e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="bg-background"
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="priya.sharma@company.com"
                    className="bg-background"
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                    className="bg-background"
                  />
                </Field>
                <Field label="Employee Code (proposed)">
                  <Input
                    value={form.employeeCode}
                    onChange={(e) => setField("employeeCode", e.target.value)}
                    placeholder="EMP-0042"
                    className="bg-background"
                  />
                </Field>
                <Field label="Designation">
                  <Input
                    value={form.designation}
                    onChange={(e) => setField("designation", e.target.value)}
                    placeholder="e.g. Senior Software Engineer"
                    className="bg-background"
                  />
                </Field>
                <Field label="Department">
                  <Input
                    value={form.department}
                    onChange={(e) => setField("department", e.target.value)}
                    placeholder="e.g. Engineering"
                    className="bg-background"
                  />
                </Field>
                <Field label="Grade">
                  <Input
                    value={form.grade}
                    onChange={(e) => setField("grade", e.target.value)}
                    placeholder="e.g. L4"
                    className="bg-background"
                  />
                </Field>
                <Field label="Employment Type">
                  <Select value={form.employmentType} onValueChange={(v) => setField("employmentType", v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Join Date">
                  <Input
                    type="date"
                    value={form.joinDate}
                    onChange={(e) => setField("joinDate", e.target.value)}
                    className="bg-background"
                  />
                </Field>
                <Field label="Reporting Manager">
                  <Input
                    value={form.reportTo}
                    onChange={(e) => setField("reportTo", e.target.value)}
                    placeholder="e.g. Anil Verma"
                    className="bg-background"
                  />
                </Field>
              </div>
            </section>

            <Separator />

            {/* ---------- Step 3: Card Display & Priority ---------- */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="grid h-6 w-6 place-items-center rounded-md bg-emerald-600 text-white text-xs font-bold">
                  3
                </div>
                <h3 className="text-sm font-semibold text-foreground">Card Display & Priority</h3>
                <span className="text-xs text-muted-foreground">· How the candidate appears on the board</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Priority">
                  <Select value={form.priority} onValueChange={(v) => setField("priority", v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          <span className="inline-flex items-center gap-2">
                            <Flag className="h-3 w-3" style={{ color: PRIORITY_BADGE[p] ? undefined : undefined }} />
                            {p}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="HR BP / Owner ID">
                  <Input
                    value={form.ownerId}
                    onChange={(e) => setField("ownerId", e.target.value)}
                    placeholder="Employee ID of HR BP (optional)"
                    className="bg-background"
                  />
                </Field>
                <Field label="Avatar Color" className="md:col-span-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {STAGE_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setField("avatarColor", c.value)}
                        title={c.name}
                        className={cn(
                          "h-7 w-7 rounded-full border-2 transition-all hover:scale-110",
                          form.avatarColor === c.value
                            ? "border-foreground ring-2 ring-offset-1 ring-offset-background"
                            : "border-transparent",
                        )}
                        style={{ backgroundColor: c.value, boxShadow: form.avatarColor === c.value ? `0 0 0 2px ${c.value}` : undefined }}
                      />
                    ))}
                  </div>
                </Field>
                <Field label="Tags (comma-separated)" className="md:col-span-2">
                  <Textarea
                    value={form.tags}
                    onChange={(e) => setField("tags", e.target.value)}
                    placeholder="e.g. lateral-hire, leadership, relocating"
                    className="bg-background min-h-[60px] resize-y"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Tags help you filter candidates on the board. Separate multiple tags with commas.
                  </p>
                </Field>
              </div>
            </section>

            <Separator />

            {/* ---------- Live Preview ---------- */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-foreground">Live Preview</h3>
                <span className="text-xs text-muted-foreground">· How this candidate will appear on the kanban board</span>
              </div>

              <PreviewCard
                form={form}
                workflow={selectedWorkflow}
                firstStage={firstStage}
              />
            </section>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground hidden sm:block">
            {firstStage
              ? <>Candidate will start at <span className="font-medium text-foreground">{firstStage.name}</span></>
              : <>Select a board to see the starting stage</>}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              <X className="h-4 w-4 mr-1.5" /> Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={saving || noWorkflows || !form.candidateName.trim() || !form.workflowId}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {editing ? "Saving..." : "Starting..."}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {editing ? "Save Changes" : "Start Onboarding"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Preview Card — mini kanban card representation
// ============================================================

function PreviewCard({
  form, workflow, firstStage,
}: {
  form: CandidateForm
  workflow: OnboardingWorkflow | null
  firstStage: { id: string; name: string; order: number; color: string } | null
}) {
  const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean)
  const name = form.candidateName.trim() || "Candidate Name"
  const designation = form.designation.trim() || "Designation"
  const wfName = workflow?.name || "No board selected"
  const wfColor = workflow?.color || "#64748b"

  return (
    <Card className="border-border/60 shadow-soft bg-card overflow-hidden">
      {/* Board header bar */}
      <div className="h-1" style={{ backgroundColor: wfColor }} />
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white text-sm font-semibold shadow-sm"
            style={{ backgroundColor: form.avatarColor }}
          >
            {initials(name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-foreground truncate">{name}</p>
              {form.priority && (
                <Badge
                  variant="secondary"
                  className={cn("text-[10px] py-0 px-1.5 h-5 border-0", PRIORITY_BADGE[form.priority] || PRIORITY_BADGE.Medium)}
                >
                  {form.priority}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{designation}</p>

            {/* Board badge */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: wfColor }} />
              <span className="text-[11px] text-muted-foreground">{wfName}</span>
            </div>

            {/* First stage hint */}
            {firstStage ? (
              <div className="mt-2.5 flex items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="text-[10px] py-0 px-1.5 h-5 border-0 gap-1"
                  style={{ backgroundColor: `${firstStage.color}1a`, color: firstStage.color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: firstStage.color }} />
                  First stage: {firstStage.name}
                </Badge>
              </div>
            ) : (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Select a board to see the starting stage
              </p>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap mt-2.5">
                {tags.slice(0, 4).map((t, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 h-5 font-normal border-border/60 text-muted-foreground">
                    {t}
                  </Badge>
                ))}
                {tags.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">+{tags.length - 4}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Field wrapper
// ============================================================

function Field({
  label, required, children, className,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}
