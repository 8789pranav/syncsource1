"use client"

// =============================================================
// Onboarding Kanban Board
// Task ID: 6 — workflow-driven candidate pipeline view
// =============================================================

import * as React from "react"
import { useState, useMemo, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  KanbanSquare, Clock, AlertTriangle, CheckCircle2, Users,
  Calendar, Flag, Phone, Mail, Building2,
  Circle, PlayCircle, ShieldCheck, Search, Inbox, X,
  StickyNote, Send, ListChecks, ChevronRight, UserCircle2,
  Hash, Briefcase, Loader2, Lock, ArrowRight, UserCog,
  FlagTriangleRight, Inbox as InboxIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/hrms/ui"

import {
  type OnboardingWorkflow, type OnboardingStage, type OnboardingCandidate,
  STAGE_TYPE_META, PRIORITY_COLORS, PRIORITIES,
  useFetch, apiPost, apiPatch, safeParseJson, initials, slaStatus,
  timeAgo, formatDate, formatDateTime,
} from "@/components/hrms/onboarding/shared"

// ---------- helpers ----------

/** Convert a hex color to an rgba string with the given alpha. */
function hexToRgba(hex: string | null | undefined, alpha: number): string {
  let h = (hex || "#64748b").replace("#", "").trim()
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  if (h.length !== 6) return `rgba(100,116,139,${alpha})`
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const STAGE_TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  start: PlayCircle,
  standard: Circle,
  gate: ShieldCheck,
  end: CheckCircle2,
}

function StageTypeIcon({ stageType, className }: { stageType: string; className?: string }) {
  const Icon = STAGE_TYPE_ICON[stageType] || Circle
  return <Icon className={className} />
}

/** Compute completed/total tasks from a candidate instance. */
function taskProgress(instance?: OnboardingCandidate["instance"]) {
  if (!instance?.tasks || instance.tasks.length === 0) {
    return { completed: 0, total: 0, percent: 0 }
  }
  const total = instance.tasks.length
  const completed = instance.tasks.filter((t: any) => t.status === "Completed").length
  return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 }
}

const SLA_PILL_CLASS: Record<string, string> = {
  none: "bg-muted/60 text-muted-foreground",
  ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  breached: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
}

const STATUS_OPTIONS = ["Active", "OnHold", "Withdrawn", "Completed"] as const
const STATUS_BADGE_CLASS: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  OnHold: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  Withdrawn: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  Completed: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
}

const PRIORITY_BADGE_CLASS: Record<string, string> = {
  Low: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  Medium: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  High: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  Critical: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
}

// ---------- main component ----------

export function KanbanSection() {
  // Workflows list
  const workflowsFetch = useFetch<{ items: OnboardingWorkflow[] }>("/api/onboarding-workflows")
  const workflows = workflowsFetch.data?.items ?? []

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)

  // Auto-select default workflow once data is available
  useEffect(() => {
    if (workflows.length > 0 && !selectedWorkflowId) {
      const def = workflows.find((w) => w.isDefault) || workflows[0]
      setSelectedWorkflowId(def.id)
    }
  }, [workflows, selectedWorkflowId])

  // Reset selection if it no longer exists
  useEffect(() => {
    if (selectedWorkflowId && workflows.length > 0 && !workflows.some((w) => w.id === selectedWorkflowId)) {
      setSelectedWorkflowId(workflows[0].id)
    }
  }, [workflows, selectedWorkflowId])

  // Candidates list (depends on selected workflow)
  const candidatesFetch = useFetch<{ items: OnboardingCandidate[] }>(
    selectedWorkflowId ? `/api/onboarding-candidates?workflowId=${selectedWorkflowId}` : null
  )
  const candidates = candidatesFetch.data?.items ?? []

  // Full workflow detail (for stage metadata — slaDays, wipLimit, blockOnOverflow, etc.)
  const detailWfFetch = useFetch<OnboardingWorkflow & { stages: OnboardingStage[] }>(
    selectedWorkflowId ? `/api/onboarding-workflows/${selectedWorkflowId}` : null
  )
  const stages = detailWfFetch.data?.stages ?? []
  const workflowMeta = detailWfFetch.data

  // Filters
  const [search, setSearch] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  // Drag & drop state
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)

  // Detail sheet
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)

  // Client-side filtering
  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    return candidates.filter((c) => {
      if (priorityFilter !== "all" && c.priority !== priorityFilter) return false
      if (!q) return true
      return (
        c.candidateName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.employeeCode?.toLowerCase().includes(q) ||
        c.designation?.toLowerCase().includes(q)
      )
    })
  }, [candidates, search, priorityFilter])

  // Group by current stage
  const byStage = useMemo(() => {
    const map = new Map<string, OnboardingCandidate[]>()
    for (const c of filteredCandidates) {
      const k = c.currentStageId || "__none__"
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(c)
    }
    return map
  }, [filteredCandidates])

  // Drag-and-drop move handler
  const handleDrop = useCallback(
    async (candidateId: string, targetStageId: string) => {
      if (moving) return
      const candidate = candidates.find((c) => c.id === candidateId)
      if (!candidate) return
      // No-op drop on same stage
      if (candidate.currentStageId === targetStageId) {
        setDraggingId(null)
        setDragOverStageId(null)
        return
      }
      setMoving(true)
      try {
        const res: any = await apiPatch(
          `/api/onboarding-candidates/${candidateId}/move`,
          { targetStageId }
        )
        const stageName = res?.currentStage?.name || "new stage"
        toast.success(`Moved "${candidate.candidateName}" to ${stageName}`)
        candidatesFetch.reload()
        if (selectedCandidateId === candidateId) detailFetch.reload()
      } catch (e: any) {
        toast.error(e?.message || "Failed to move candidate")
      } finally {
        setMoving(false)
        setDraggingId(null)
        setDragOverStageId(null)
      }
    },
    [moving, candidates, selectedCandidateId, candidatesFetch]
  )

  // Detail candidate fetch (parent-owned so DnD move can refresh it)
  const detailFetch = useFetch<any>(
    selectedCandidateId ? `/api/onboarding-candidates/${selectedCandidateId}` : null
  )

  // Board-level stats
  const totalCandidates = candidates.length
  const breachedCount = candidates.filter((c) => {
    const s = slaStatus(c.enteredAt, c.currentStage?.slaDays ?? null)
    return s.status === "breached"
  }).length
  const completedCount = candidates.filter((c) => c.status === "Completed").length

  // ---------- Render ----------

  if (workflowsFetch.loading && workflows.length === 0) {
    return <BoardSkeleton />
  }

  if (workflowsFetch.error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Failed to load onboarding boards"
        description={workflowsFetch.error}
      />
    )
  }

  if (workflows.length === 0) {
    return (
      <EmptyState
        icon={KanbanSquare}
        title="No onboarding boards yet"
        description="Create a workflow in the Workflows tab first. Once a workflow has stages, candidates will flow through them on this board."
      />
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---------- Board selector + filters ---------- */}
      <div className="flex flex-col gap-3 pb-3 border-b border-border/60">
        {/* Board tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {workflows.map((w) => {
            const active = w.id === selectedWorkflowId
            const count = w._count?.candidates ?? 0
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWorkflowId(w.id)}
                className={cn(
                  "group inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-foreground/20 bg-foreground text-background shadow-sm"
                    : "border-border/60 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: w.color || "#10b981" }}
                />
                <span>{w.name}</span>
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                    active ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search + filters + stats */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate, email, code..."
                className="h-9 pl-9 bg-background"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 w-[150px] bg-background">
                <Flag className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
                      {p}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mini stats */}
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground">{totalCandidates}</span> candidates
            </span>
            {breachedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-semibold">{breachedCount}</span> SLA breached
              </span>
            )}
            {completedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="font-semibold">{completedCount}</span> done
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Kanban board ---------- */}
      <div className="flex-1 min-h-0 mt-3">
        {stages.length === 0 && detailWfFetch.loading ? (
          <BoardColumnsSkeleton />
        ) : stages.length === 0 ? (
          <EmptyState
            icon={KanbanSquare}
            title="This workflow has no stages"
            description="Add stages in the Workflows tab to see the kanban board."
          />
        ) : candidates.length === 0 && !search && priorityFilter === "all" ? (
          <EmptyState
            icon={Inbox}
            title="No candidates on this board yet"
            description="Add candidates in the Initiate tab. They will appear here in the first stage."
          />
        ) : filteredCandidates.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No candidates match your filters"
            description="Try adjusting your search or priority filter."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("")
                  setPriorityFilter("all")
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 kanban-scroll h-full">
            {stages.map((stage) => {
              const cards = byStage.get(stage.id) ?? []
              return (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  cards={cards}
                  allowBackward={workflowMeta?.allowBackward ?? false}
                  draggingId={draggingId}
                  dragOverStageId={dragOverStageId}
                  onCardDragStart={(id) => setDraggingId(id)}
                  onCardDragEnd={() => {
                    setDraggingId(null)
                    setDragOverStageId(null)
                  }}
                  onColumnDragEnter={(stageId) => setDragOverStageId(stageId)}
                  onColumnDragLeave={(stageId) => {
                    setDragOverStageId((cur) => (cur === stageId ? null : cur))
                  }}
                  onDrop={(candidateId, stageId) => handleDrop(candidateId, stageId)}
                  onCardClick={(id) => setSelectedCandidateId(id)}
                  moving={moving}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* ---------- Candidate detail sheet ---------- */}
      <CandidateDetailSheet
        open={!!selectedCandidateId}
        onOpenChange={(o) => {
          if (!o) setSelectedCandidateId(null)
        }}
        candidate={detailFetch.data}
        loading={detailFetch.loading}
        stages={stages}
        onReload={detailFetch.reload}
        onBoardMutated={candidatesFetch.reload}
      />
    </div>
  )
}

// =============================================================
// Kanban Column
// =============================================================

interface KanbanColumnProps {
  stage: OnboardingStage
  cards: OnboardingCandidate[]
  allowBackward: boolean
  draggingId: string | null
  dragOverStageId: string | null
  moving: boolean
  onCardDragStart: (id: string) => void
  onCardDragEnd: () => void
  onColumnDragEnter: (stageId: string) => void
  onColumnDragLeave: (stageId: string) => void
  onDrop: (candidateId: string, stageId: string) => void
  onCardClick: (id: string) => void
}

const KanbanColumn = React.memo(function KanbanColumn({
  stage, cards, allowBackward, draggingId, dragOverStageId, moving,
  onCardDragStart, onCardDragEnd, onColumnDragEnter, onColumnDragLeave, onDrop, onCardClick,
}: KanbanColumnProps) {
  const meta = STAGE_TYPE_META[stage.stageType] || STAGE_TYPE_META.standard
  const isOver = dragOverStageId === stage.id && draggingId !== null
  const wipCount = cards.length
  const wipExceeded = stage.wipLimit ? wipCount > stage.wipLimit : false
  const wipWarn = stage.wipLimit ? wipCount >= stage.wipLimit : false

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggingId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggingId) return
    e.preventDefault()
    onColumnDragEnter(stage.id)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only fire when leaving the column entirely (not entering a child)
    if (!draggingId) return
    const related = e.relatedTarget as Node | null
    if (!e.currentTarget.contains(related)) {
      onColumnDragLeave(stage.id)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggingId) return
    e.preventDefault()
    const candidateId = e.dataTransfer.getData("text/plain") || draggingId
    onDrop(candidateId, stage.id)
  }

  return (
    <div
      className="min-w-[300px] w-[300px] bg-muted/30 rounded-xl flex flex-col max-h-full"
      style={{ borderTopColor: stage.color || "#64748b" }}
    >
      {/* Color stripe */}
      <div
        className="h-1 rounded-t-xl"
        style={{ backgroundColor: stage.color || "#64748b" }}
      />

      {/* Column header (sticky) */}
      <div className="sticky top-0 z-10 px-3 pt-2.5 pb-2 bg-muted/30 backdrop-blur-sm rounded-t-xl">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
              style={{ backgroundColor: hexToRgba(stage.color, 0.15), color: stage.color }}
            >
              <StageTypeIcon stageType={stage.stageType} className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-foreground truncate">{stage.name}</h3>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: hexToRgba(meta.color, 0.15), color: meta.color }}
                >
                  {meta.label}
                </span>
                {stage.isMilestone && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    <FlagTriangleRight className="h-2.5 w-2.5" /> Milestone
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                wipExceeded
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                  : wipWarn
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                    : "bg-background text-muted-foreground border border-border/60"
              )}
              title={stage.wipLimit ? `WIP limit: ${stage.wipLimit}` : `${wipCount} candidates`}
            >
              {stage.wipLimit ? `${wipCount}/${stage.wipLimit}` : wipCount}
            </span>
          </div>
        </div>

        {/* Stage meta row: SLA + WIP warning */}
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          {stage.slaDays ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              SLA {stage.slaDays}d
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 opacity-60">
              <Clock className="h-3 w-3" /> No SLA
            </span>
          )}
          {stage.wipLimit && stage.blockOnOverflow && (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Lock className="h-3 w-3" /> WIP lock
            </span>
          )}
          {!allowBackward && (
            <span className="inline-flex items-center gap-1 opacity-60 ml-auto">
              <ArrowRight className="h-3 w-3" /> forward only
            </span>
          )}
        </div>
      </div>

      {/* Column body — drop zone + scrollable card list */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex-1 min-h-0 m-2 mt-1 rounded-lg p-1 transition-colors overflow-y-auto",
          isOver
            ? "bg-background/80 outline-dashed outline-2 outline-offset-[-2px]"
            : "outline-transparent"
        )}
        style={
          isOver
            ? ({ "--tw-outline-color": stage.color || "#64748b" } as React.CSSProperties)
            : undefined
        }
      >
        {moving && (
          <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Moving...
          </div>
        )}

        {cards.length === 0 && !moving ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed",
              isOver
                ? "border-transparent"
                : "border-border/50"
            )}
          >
            <InboxIcon className="h-5 w-5 text-muted-foreground/50 mb-1.5" />
            <p className="text-xs text-muted-foreground/70">
              {isOver ? "Drop here" : "Drop candidates here"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 px-1 pb-2">
            <AnimatePresence initial={false}>
              {cards.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <CandidateCard
                    candidate={c}
                    isDragging={draggingId === c.id}
                    onDragStart={() => onCardDragStart(c.id)}
                    onDragEnd={onCardDragEnd}
                    onClick={() => onCardClick(c.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
})

// =============================================================
// Candidate Card
// =============================================================

interface CandidateCardProps {
  candidate: OnboardingCandidate
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onClick: () => void
}

const CandidateCard = React.memo(function CandidateCard({
  candidate, isDragging, onDragStart, onDragEnd, onClick,
}: CandidateCardProps) {
  const priorityColor = PRIORITY_COLORS[candidate.priority] || PRIORITY_COLORS.Medium
  const tags = safeParseJson<string[]>(candidate.tags, [])
  const progress = taskProgress(candidate.instance)
  const sla = slaStatus(candidate.enteredAt, candidate.currentStage?.slaDays ?? null)

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", candidate.id)
    e.dataTransfer.effectAllowed = "move"
    onDragStart()
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "group relative bg-card border border-border/60 rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 ring-2 ring-foreground/20"
      )}
      style={{ borderLeftColor: priorityColor, borderLeftWidth: 3 }}
    >
      {/* Top row: name + avatar */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-semibold text-foreground truncate">{candidate.candidateName}</h4>
            {candidate.priority === "Critical" && (
              <span title="Critical priority">
                <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" />
              </span>
            )}
          </div>
          {candidate.designation && (
            <p className="text-xs text-muted-foreground truncate">{candidate.designation}</p>
          )}
          {candidate.department && (
            <p className="text-[11px] text-muted-foreground/70 truncate flex items-center gap-1 mt-0.5">
              <Building2 className="h-2.5 w-2.5" />
              {candidate.department}
            </p>
          )}
        </div>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback
            className="text-[11px] font-semibold text-white"
            style={{ backgroundColor: candidate.avatarColor || "#10b981" }}
          >
            {initials(candidate.candidateName)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* SLA + status row */}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {sla.status !== "none" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  SLA_PILL_CLASS[sla.status]
                )}
              >
                <Clock className="h-2.5 w-2.5" />
                {sla.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {candidate.enteredAt
                ? `In stage since ${formatDateTime(candidate.enteredAt)}`
                : "No entry timestamp"}
              {candidate.currentStage?.slaDays ? ` • SLA ${candidate.currentStage.slaDays}d` : ""}
            </TooltipContent>
          </Tooltip>
        )}
        {candidate.status !== "Active" && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              STATUS_BADGE_CLASS[candidate.status] || "bg-muted text-muted-foreground"
            )}
          >
            {candidate.status}
          </span>
        )}
        {candidate.employeeCode && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            <Hash className="h-2.5 w-2.5" />
            {candidate.employeeCode}
          </span>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
          {tags.slice(0, 3).map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground/70">+{tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Bottom row: task progress + owner + days in stage */}
      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          {progress.total > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <ListChecks className="h-3 w-3 text-muted-foreground shrink-0" />
                  <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {progress.completed}/{progress.total}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                {progress.completed} of {progress.total} tasks completed
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <ListChecks className="h-3 w-3" /> No tasks
            </div>
          )}
        </div>
        {candidate.ownerId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground">
                <UserCircle2 className="h-3.5 w-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">Owner assigned</TooltipContent>
          </Tooltip>
        )}
        <span className="text-[10px] text-muted-foreground/70 shrink-0">
          {candidate.enteredAt ? timeAgo(candidate.enteredAt) : "—"}
        </span>
      </div>
    </div>
  )
})

// =============================================================
// Candidate Detail Sheet (right drawer)
// =============================================================

interface CandidateDetailSheetProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  candidate: any
  loading: boolean
  stages: OnboardingStage[]
  onReload: () => void
  onBoardMutated: () => void
}

function CandidateDetailSheet({
  open, onOpenChange, candidate, loading, stages, onReload, onBoardMutated,
}: CandidateDetailSheetProps) {
  const [noteText, setNoteText] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Reset note text when sheet closes / candidate changes
  useEffect(() => {
    if (!open) setNoteText("")
  }, [open])

  const tags = safeParseJson<string[]>(candidate?.tags, [])
  const progress = taskProgress(candidate?.instance)

  // Move candidate to a different stage
  const handleMoveStage = async (targetStageId: string) => {
    if (!candidate || actionLoading) return
    if (candidate.currentStageId === targetStageId) return
    setActionLoading(true)
    try {
      const res: any = await apiPatch(
        `/api/onboarding-candidates/${candidate.id}/move`,
        { targetStageId }
      )
      toast.success(`Moved to ${res?.currentStage?.name || "new stage"}`)
      onReload()
      onBoardMutated()
    } catch (e: any) {
      toast.error(e?.message || "Failed to move candidate")
    } finally {
      setActionLoading(false)
    }
  }

  // Update candidate meta (priority / status)
  const handleUpdateMeta = async (patch: Record<string, any>) => {
    if (!candidate || actionLoading) return
    setActionLoading(true)
    try {
      await apiPatch(`/api/onboarding-candidates/${candidate.id}`, patch)
      toast.success("Candidate updated")
      onReload()
      onBoardMutated()
    } catch (e: any) {
      toast.error(e?.message || "Failed to update candidate")
    } finally {
      setActionLoading(false)
    }
  }

  // Add note
  const handleAddNote = async () => {
    if (!candidate || !noteText.trim() || savingNote) return
    setSavingNote(true)
    try {
      await apiPost(`/api/onboarding-candidates/${candidate.id}/notes`, {
        body: noteText.trim(),
        stageId: candidate.currentStageId,
      })
      toast.success("Note added")
      setNoteText("")
      onReload()
    } catch (e: any) {
      toast.error(e?.message || "Failed to add note")
    } finally {
      setSavingNote(false)
    }
  }

  // Pipeline stepper data: pair workflow stages with instance stage statuses
  const pipelineStages = useMemo(() => {
    if (!candidate) return []
    const wfStages: any[] = candidate.workflow?.stages || stages
    const instanceStages: any[] = candidate.instance?.stages || []
    return wfStages
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((s) => {
        const inst = instanceStages.find((is: any) => is.stageId === s.id)
        return {
          ...s,
          status: inst?.status || "Pending",
          enteredAt: inst?.enteredAt,
          completedAt: inst?.completedAt,
          slaDueAt: inst?.slaDueAt,
          isCurrent: candidate.currentStageId === s.id,
        }
      })
  }, [candidate, stages])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col gap-0"
      >
        {/* Header */}
        <SheetHeader className="p-5 pb-3 border-b border-border/60">
          <div className="flex items-start gap-3 pr-6">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback
                className="text-sm font-semibold text-white"
                style={{ backgroundColor: candidate?.avatarColor || "#10b981" }}
              >
                {candidate ? initials(candidate.candidateName) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg">{candidate?.candidateName || "Loading..."}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 flex-wrap mt-1">
                {candidate?.designation && <span>{candidate.designation}</span>}
                {candidate?.department && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {candidate.department}
                  </span>
                )}
              </SheetDescription>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {candidate?.status && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_BADGE_CLASS[candidate.status] || "bg-muted text-muted-foreground"
                    )}
                  >
                    {candidate.status}
                  </span>
                )}
                {candidate?.priority && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      PRIORITY_BADGE_CLASS[candidate.priority] || "bg-muted text-muted-foreground"
                    )}
                  >
                    <Flag className="h-3 w-3" /> {candidate.priority}
                  </span>
                )}
                {candidate?.employmentType && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                    <Briefcase className="h-3 w-3" /> {candidate.employmentType}
                  </span>
                )}
                {tags.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && !candidate ? (
            <div className="p-5 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !candidate ? (
            <EmptyState icon={Inbox} title="Candidate not found" />
          ) : (
            <div className="p-5 space-y-6">
              {/* Contact info */}
              <Section title="Contact" icon={UserCircle2}>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoField icon={Mail} label="Email" value={candidate.email} />
                  <InfoField icon={Phone} label="Phone" value={candidate.phone} />
                  <InfoField icon={Hash} label="Employee code" value={candidate.employeeCode} />
                  <InfoField icon={Calendar} label="Join date" value={candidate.joinDate ? formatDate(candidate.joinDate) : null} />
                  <InfoField icon={UserCog} label="Reports to" value={candidate.reportTo} />
                  <InfoField icon={Building2} label="Grade" value={candidate.grade} />
                </div>
              </Section>

              {/* Pipeline stepper */}
              <Section title="Pipeline progress" icon={KanbanSquare} action={
                <span className="text-xs text-muted-foreground">
                  {progress.completed}/{progress.total} tasks • {candidate.instance?.overallProgress ?? candidate.progress ?? 0}% overall
                </span>
              }>
                <PipelineStepper stages={pipelineStages} currentStageId={candidate.currentStageId} />
              </Section>

              {/* Tasks */}
              <Section
                title="Tasks"
                icon={ListChecks}
                action={
                  <span className="text-xs text-muted-foreground">
                    {progress.completed}/{progress.total} done
                  </span>
                }
              >
                <TasksList tasks={candidate.instance?.tasks || []} />
              </Section>

              {/* Notes */}
              <Section title="Notes" icon={StickyNote}>
                <NotesList notes={candidate.notes || []} />
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note about this candidate..."
                    className="resize-none bg-background text-sm"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      disabled={!noteText.trim() || savingNote}
                      className="gap-1.5"
                    >
                      {savingNote ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Add note
                    </Button>
                  </div>
                </div>
              </Section>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {candidate && (
          <div className="border-t border-border/60 p-4 bg-muted/30">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Priority */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={actionLoading}>
                    <Flag className="h-3.5 w-3.5" />
                    Priority
                    <ChevronRight className="h-3 w-3 rotate-90 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Change priority</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {PRIORITIES.map((p) => (
                    <DropdownMenuItem
                      key={p}
                      onClick={() => handleUpdateMeta({ priority: p })}
                      className={candidate.priority === p ? "bg-muted/60" : ""}
                    >
                      <span
                        className="h-2 w-2 rounded-full mr-2"
                        style={{ backgroundColor: PRIORITY_COLORS[p] }}
                      />
                      {p}
                      {candidate.priority === p && <CheckCircle2 className="h-3.5 w-3.5 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Status */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={actionLoading}>
                    <UserCog className="h-3.5 w-3.5" />
                    Status
                    <ChevronRight className="h-3 w-3 rotate-90 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Change status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {STATUS_OPTIONS.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => handleUpdateMeta({ status: s })}
                      className={candidate.status === s ? "bg-muted/60" : ""}
                    >
                      {s}
                      {candidate.status === s && <CheckCircle2 className="h-3.5 w-3.5 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Move to stage */}
              <div className="ml-auto flex items-center gap-2 min-w-[200px]">
                <Select
                  value={candidate.currentStageId || ""}
                  onValueChange={handleMoveStage}
                  disabled={actionLoading}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <ArrowRight className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Move to stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelineStages.map((s: any) => (
                      <SelectItem key={s.id} value={s.id} disabled={s.id === candidate.currentStageId}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: s.color || "#64748b" }}
                          />
                          {s.name}
                          {s.id === candidate.currentStageId && (
                            <span className="text-xs text-muted-foreground">(current)</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ---------- sheet sub-components ----------

function Section({
  title, icon: Icon, action, children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function InfoField({
  icon: Icon, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string | null
}) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{label}</p>
        <p className="text-sm text-foreground truncate">{value || "—"}</p>
      </div>
    </div>
  )
}

function PipelineStepper({
  stages, currentStageId,
}: {
  stages: any[]
  currentStageId?: string | null
}) {
  if (stages.length === 0) {
    return <p className="text-sm text-muted-foreground">No stages defined.</p>
  }
  return (
    <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
      {stages.map((s, i) => {
        const isDone = s.status === "Completed"
        const isActive = s.isCurrent || s.status === "Active"
        const isPending = !isDone && !isActive

        // Compute SLA status from slaDueAt for active stages
        let slaLabel: string | null = null
        let slaStatus_: "ok" | "warning" | "breached" | null = null
        if (s.slaDueAt && isActive) {
          const daysLeft = Math.ceil((new Date(s.slaDueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          if (daysLeft < 0) {
            slaLabel = `${Math.abs(daysLeft)}d overdue`
            slaStatus_ = "breached"
          } else if (daysLeft <= 1) {
            slaLabel = daysLeft === 0 ? "Due today" : "1d left"
            slaStatus_ = "breached"
          } else if (daysLeft <= 2) {
            slaLabel = `${daysLeft}d left`
            slaStatus_ = "warning"
          } else {
            slaLabel = `${daysLeft}d left`
            slaStatus_ = "ok"
          }
        }

        return (
          <React.Fragment key={s.id}>
            <div
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-lg border min-w-[110px] max-w-[140px] flex-1",
                isActive && "bg-foreground/[0.04] border-foreground/30",
                isDone && "bg-emerald-500/[0.06] border-emerald-500/30",
                isPending && "bg-muted/30 border-border/60"
              )}
              style={isActive ? { boxShadow: `inset 0 2px 0 0 ${s.color}` } : undefined}
            >
              <span
                className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold shrink-0"
                style={{
                  backgroundColor: isDone
                    ? "#10b981"
                    : isActive
                      ? s.color || "#64748b"
                      : hexToRgba(s.color, 0.15),
                  color: isDone || isActive ? "#fff" : s.color || "#64748b",
                }}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : isActive ? (
                  <span className="text-[10px]">{i + 1}</span>
                ) : (
                  <span className="text-[10px] opacity-60">{i + 1}</span>
                )}
              </span>
              <p
                className={cn(
                  "text-[11px] font-medium text-center leading-tight",
                  isPending ? "text-muted-foreground/70" : "text-foreground"
                )}
              >
                {s.name}
              </p>
              {s.slaDays ? (
                <p className="text-[9px] text-muted-foreground/70">SLA {s.slaDays}d</p>
              ) : null}
              {isActive && slaLabel && (
                <p
                  className={cn(
                    "text-[9px] font-medium",
                    slaStatus_ === "breached" && "text-rose-600 dark:text-rose-400",
                    slaStatus_ === "warning" && "text-amber-600 dark:text-amber-400",
                    slaStatus_ === "ok" && "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {slaLabel}
                </p>
              )}
              {isDone && s.completedAt && (
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400">
                  {formatDate(s.completedAt)}
                </p>
              )}
            </div>
            {i < stages.length - 1 && (
              <div className="flex items-center self-start mt-5 px-0.5 shrink-0">
                <ChevronRight
                  className={cn(
                    "h-3 w-3",
                    isDone ? "text-emerald-500" : "text-muted-foreground/40"
                  )}
                />
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function TasksList({ tasks }: { tasks: any[] }) {
  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground/70">
        <ListChecks className="mr-1.5 h-4 w-4" /> No tasks yet for this stage.
      </div>
    )
  }
  const TASK_STATUS_CLASS: Record<string, string> = {
    Pending: "bg-muted text-muted-foreground",
    InProgress: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    Skipped: "bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400",
  }
  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/60 bg-background"
        >
          <span
            className={cn(
              "mt-0.5 grid h-4 w-4 place-items-center rounded shrink-0",
              t.status === "Completed"
                ? "bg-emerald-500 text-white"
                : "border border-border"
            )}
          >
            {t.status === "Completed" && <CheckCircle2 className="h-3 w-3" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={cn(
                "text-sm font-medium",
                t.status === "Completed" ? "text-muted-foreground line-through" : "text-foreground"
              )}>
                {t.title}
              </p>
              {t.isBlocking && (
                <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1 py-0.5 text-[9px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                  <Lock className="h-2.5 w-2.5" /> Blocking
                </span>
              )}
            </div>
            {t.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                  TASK_STATUS_CLASS[t.status] || TASK_STATUS_CLASS.Pending
                )}
              >
                {t.status}
              </span>
              {t.priority && t.priority !== "Medium" && (
                <span
                  className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: hexToRgba(PRIORITY_COLORS[t.priority], 0.15),
                    color: PRIORITY_COLORS[t.priority],
                  }}
                >
                  <Flag className="h-2.5 w-2.5" /> {t.priority}
                </span>
              )}
              {t.dueDate && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Calendar className="h-2.5 w-2.5" /> {formatDate(t.dueDate)}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function NotesList({ notes }: { notes: any[] }) {
  if (notes.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-muted-foreground/70">
        <StickyNote className="mr-1.5 h-4 w-4" /> No notes yet.
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {notes.map((n) => (
        <div
          key={n.id}
          className="rounded-lg border border-border/60 bg-muted/30 p-2.5"
        >
          <p className="text-sm text-foreground whitespace-pre-wrap">{n.body}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {n.authorName && <span className="font-medium">{n.authorName}</span>}
            {n.authorName && <span>•</span>}
            <span>{formatDateTime(n.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// =============================================================
// Skeletons
// =============================================================

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-32 rounded-full" />
        ))}
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="min-w-[300px] w-[300px]">
            <Skeleton className="h-16 w-full rounded-xl mb-2" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BoardColumnsSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden pb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="min-w-[300px] w-[300px]">
          <Skeleton className="h-16 w-full rounded-xl mb-2" />
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, j) => (
              <Skeleton key={j} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
