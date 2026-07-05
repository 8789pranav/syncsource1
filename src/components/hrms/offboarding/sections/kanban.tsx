"use client"

// =============================================================
// Offboarding — Kanban Board (spec #7 + #8) — Task ID: 2d
// Drag-and-drop board of exit cases across the 14 default exit
// stages. Includes board selector, configuration dialog (read-only),
// per-card badges and actions.
// =============================================================

import * as React from "react"
import { useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  KanbanSquare, Settings2, Clock, AlertTriangle, CheckCircle2,
  Building2, Hash, MoreVertical,
  Eye, ArrowRight, ThumbsUp, ThumbsDown, CalendarClock, ClipboardCheck,
  UserPlus, Send, Wallet, FileText, CheckCircle2 as CheckCircle,
  XCircle, History, Package, KeyRound, Scale, Pause, Inbox,
  ChevronRight, Flag, Lock, ShieldAlert, Users, Search, X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import {
  type ExitCase, type ExitStage, DEFAULT_EXIT_STAGES,
  initials, formatDate, daysBetween,
  STATUS_COLORS, EXIT_TYPE_COLORS, RISK_COLORS,
} from "../shared"
import {
  EXIT_CASES, KANBAN_BOARDS, ASSET_RECOVERY, IT_ACCESS, CLEARANCE_TASKS,
} from "../data"

// ---------- helpers ----------

function hexToRgba(hex: string | null | undefined, alpha: number): string {
  let h = (hex || "#64748b").replace("#", "").trim()
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  if (h.length !== 6) return `rgba(100,116,139,${alpha})`
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const todayStr = () => new Date().toISOString().slice(0, 10)
const lwdOf = (c: ExitCase): string | undefined => c.actualLwd || c.approvedLwd || c.requestedLwd

const isLwdToday = (c: ExitCase): boolean => {
  const lwd = lwdOf(c)
  return !!lwd && lwd.slice(0, 10) === todayStr()
}

const isLwdThisWeek = (c: ExitCase): boolean => {
  const lwd = lwdOf(c)
  if (!lwd) return false
  const diff = daysBetween(new Date(), lwd)
  return diff >= 0 && diff <= 7
}

const daysRemainingToLwd = (c: ExitCase): number | null => {
  const lwd = lwdOf(c)
  return lwd ? daysBetween(new Date(), lwd) : null
}

function clearanceProgress(exitCaseId: string): { completed: number; total: number; percent: number } {
  const tasks = CLEARANCE_TASKS.filter((t) => t.exitCaseId === exitCaseId)
  if (tasks.length === 0) return { completed: 0, total: 0, percent: 0 }
  const completed = tasks.filter((t) => t.status === "Completed" || t.status === "Approved" || t.status === "Waived").length
  return { completed, total: tasks.length, percent: Math.round((completed / tasks.length) * 100) }
}

const assetPendingCount = (exitCaseId: string): number =>
  ASSET_RECOVERY.filter((a) => a.exitCaseId === exitCaseId && (a.returnStatus === "Pending" || a.returnStatus === "Damaged" || a.returnStatus === "Lost")).length

const itPendingCount = (exitCaseId: string): number =>
  IT_ACCESS.filter((a) => a.exitCaseId === exitCaseId && (a.revocationStatus === "Pending" || a.revocationStatus === "Scheduled" || a.revocationStatus === "Not Started")).length

function pendingWith(c: ExitCase): string {
  switch (c.currentStageId) {
    case "s1": return "Employee"
    case "s2": return "Reporting Manager"
    case "s3": return c.reportingManager
    case "s4": return c.hrOwner
    case "s5": return "Employee (notice)"
    case "s6": return "Clearance Owners"
    case "s7": return "Asset Team"
    case "s8": return "IT Admin"
    case "s9": return "Finance / Payroll"
    case "s10": return "HR Owner"
    case "s11": return "HR Owner"
    case "s12": return "System"
    case "s13": return "HR Owner"
    default: return "—"
  }
}

// ---------- card badges ----------

interface CardBadge { key: string; label: string; className: string }

const BADGE_STYLE: Record<string, string> = {
  lwdToday:        "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  lwdWeek:         "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  clearanceOverdue:"bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  assetPending:    "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  itPending:       "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  fnfPending:      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  legalHold:       "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  highRisk:        "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  noticeShortfall: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  letterPending:   "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
}

function buildBadges(c: ExitCase): CardBadge[] {
  const out: CardBadge[] = []
  if (isLwdToday(c)) out.push({ key: "lwdToday", label: "LWD Today", className: BADGE_STYLE.lwdToday })
  else if (isLwdThisWeek(c)) out.push({ key: "lwdWeek", label: "LWD This Week", className: BADGE_STYLE.lwdWeek })
  if (c.clearanceStatus === "Overdue") out.push({ key: "clearanceOverdue", label: "Clearance Overdue", className: BADGE_STYLE.clearanceOverdue })
  if (assetPendingCount(c.id) > 0) out.push({ key: "assetPending", label: "Asset Pending", className: BADGE_STYLE.assetPending })
  if (itPendingCount(c.id) > 0) out.push({ key: "itPending", label: "IT Pending", className: BADGE_STYLE.itPending })
  if (["Not Started", "Draft", "Inputs Pending", "Calculated", "Under Review"].includes(c.fnfStatus))
    out.push({ key: "fnfPending", label: "FnF Pending", className: BADGE_STYLE.fnfPending })
  if (c.legalHold) out.push({ key: "legalHold", label: "Legal Hold", className: BADGE_STYLE.legalHold })
  if (c.riskFlag === "high") out.push({ key: "highRisk", label: "High Risk", className: BADGE_STYLE.highRisk })
  if ((c.noticeShortfallDays ?? 0) > 0) out.push({ key: "noticeShortfall", label: "Notice Shortfall", className: BADGE_STYLE.noticeShortfall })
  if (c.letterStatus === "Not Started" || c.letterStatus === "Pending") out.push({ key: "letterPending", label: "Letter Pending", className: BADGE_STYLE.letterPending })
  return out
}

// =============================================================
// Main — KanbanSection
// =============================================================

export function KanbanSection() {
  // Selected board (default = first)
  const [selectedBoardId, setSelectedBoardId] = useState<string>(
    KANBAN_BOARDS.find((b) => b.isDefault)?.id ?? KANBAN_BOARDS[0]?.id ?? ""
  )
  const selectedBoard = useMemo(
    () => KANBAN_BOARDS.find((b) => b.id === selectedBoardId) ?? KANBAN_BOARDS[0],
    [selectedBoardId]
  )

  // Local override map of exitCaseId -> new stageId after drag
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({})
  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null)
  // Configure board dialog
  const [configOpen, setConfigOpen] = useState(false)
  // Search
  const [search, setSearch] = useState("")

  // Stages are always DEFAULT_EXIT_STAGES (14 columns)
  const stages: ExitStage[] = DEFAULT_EXIT_STAGES

  // Effective cases: clone + apply stage overrides
  const effectiveCases: ExitCase[] = useMemo(() => {
    return EXIT_CASES.map((c) =>
      stageOverrides[c.id] ? { ...c, currentStageId: stageOverrides[c.id] } : c
    )
  }, [stageOverrides])

  // Apply search filter
  const filteredCases = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return effectiveCases
    return effectiveCases.filter(
      (c) =>
        c.employeeName.toLowerCase().includes(q) ||
        c.employeeCode.toLowerCase().includes(q) ||
        c.exitCaseId.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.designation.toLowerCase().includes(q) ||
        c.exitType.toLowerCase().includes(q)
    )
  }, [effectiveCases, search])

  // Group by current stage id
  const byStage = useMemo(() => {
    const map = new Map<string, ExitCase[]>()
    for (const c of filteredCases) {
      const k = c.currentStageId || "__none__"
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(c)
    }
    return map
  }, [filteredCases])

  // Handle drop: update local stage override + toast
  const handleDrop = useCallback(
    (caseId: string, targetStageId: string) => {
      const ec = effectiveCases.find((c) => c.id === caseId)
      if (!ec) return
      if (ec.currentStageId === targetStageId) {
        setDraggingId(null)
        setDragOverStageId(null)
        return
      }
      const targetStage = stages.find((s) => s.id === targetStageId)
      setStageOverrides((prev) => ({ ...prev, [caseId]: targetStageId }))
      toast.success(`Moved ${ec.employeeName} to ${targetStage?.name ?? "new stage"}`)
      setDraggingId(null)
      setDragOverStageId(null)
    },
    [effectiveCases, stages]
  )

  // Stats
  const totalCases = effectiveCases.length
  const activeCases = effectiveCases.filter((c) => c.exitStatus === "Active").length
  const onHoldCases = effectiveCases.filter((c) => c.exitStatus === "On Hold").length
  const exitedCases = effectiveCases.filter((c) => c.exitStatus === "Exited").length
  const highRiskCount = effectiveCases.filter((c) => c.riskFlag === "high").length
  const lwdTodayCount = effectiveCases.filter(isLwdToday).length

  // ---------- Render ----------
  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* ---------- Top toolbar ---------- */}
      <div className="flex flex-col gap-3 pb-3 border-b border-border/60">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Board selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <KanbanSquare className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground leading-tight">
                  {selectedBoard?.name ?? "Select a board"}
                </h2>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {selectedBoard?.code} · {selectedBoard?.scopeType}
                  {selectedBoard?.entity ? ` · ${selectedBoard.entity}` : ""}
                  {selectedBoard?.exitType ? ` · ${selectedBoard.exitType}` : ""} · {selectedBoard?.stagesCount} stages
                </p>
              </div>
            </div>

            <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
              <SelectTrigger className="h-9 w-[220px] bg-background">
                <KanbanSquare className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Switch board" />
              </SelectTrigger>
              <SelectContent>
                {KANBAN_BOARDS.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          b.status === "Active" ? "bg-emerald-500" : "bg-amber-500"
                        )}
                      />
                      <span className="font-medium">{b.name}</span>
                      {b.isDefault && (
                        <span className="ml-1 inline-flex h-4 items-center rounded bg-rose-100 px-1 text-[9px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                          DEFAULT
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigOpen(true)}
              className="h-9"
            >
              <Settings2 className="mr-1.5 h-3.5 w-3.5" />
              Configure Board
            </Button>
          </div>

          {/* Search + stats */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cases, employee, code..."
                className="h-9 pl-9 pr-8 bg-background"
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

            <div className="hidden md:flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span className="font-semibold text-foreground">{totalCases}</span> cases
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="font-semibold">{activeCases}</span> active
              </span>
              {onHoldCases > 0 && (
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Pause className="h-3.5 w-3.5" />
                  <span className="font-semibold">{onHoldCases}</span> on hold
                </span>
              )}
              {exitedCases > 0 && (
                <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span className="font-semibold">{exitedCases}</span> exited
                </span>
              )}
              {highRiskCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span className="font-semibold">{highRiskCount}</span> high risk
                </span>
              )}
              {lwdTodayCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span className="font-semibold">{lwdTodayCount}</span> LWD today
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Kanban board ---------- */}
      <div className="flex-1 min-h-0">
        {filteredCases.length === 0 && search ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-foreground">No exit cases match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setSearch("")}>
              Clear search
            </Button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto overflow-y-hidden pb-4 kanban-scroll h-full">
            {stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                cards={byStage.get(stage.id) ?? []}
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
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---------- Board config dialog ---------- */}
      <BoardConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        board={selectedBoard ?? null}
        stages={stages}
      />
    </div>
  )
}

// =============================================================
// Kanban Column
// =============================================================

interface KanbanColumnProps {
  stage: ExitStage
  cards: ExitCase[]
  draggingId: string | null
  dragOverStageId: string | null
  onCardDragStart: (id: string) => void
  onCardDragEnd: () => void
  onColumnDragEnter: (stageId: string) => void
  onColumnDragLeave: (stageId: string) => void
  onDrop: (caseId: string, stageId: string) => void
}

const KanbanColumn = React.memo(function KanbanColumn({
  stage, cards, draggingId, dragOverStageId,
  onCardDragStart, onCardDragEnd, onColumnDragEnter, onColumnDragLeave, onDrop,
}: KanbanColumnProps) {
  const isOver = dragOverStageId === stage.id && draggingId !== null

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
    if (!draggingId) return
    const related = e.relatedTarget as Node | null
    if (!e.currentTarget.contains(related)) onColumnDragLeave(stage.id)
  }
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggingId) return
    e.preventDefault()
    const caseId = e.dataTransfer.getData("text/plain") || draggingId
    onDrop(caseId, stage.id)
  }

  return (
    <div
      className="min-w-[290px] w-[290px] bg-muted/30 rounded-xl flex flex-col max-h-full border border-border/40"
      style={{ borderTopColor: stage.color, borderTopWidth: 3 }}
    >
      {/* Column header */}
      <div className="sticky top-0 z-10 px-3 pt-2.5 pb-2 bg-muted/30 backdrop-blur-sm rounded-t-xl">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate leading-tight">
                {stage.name}
              </h3>
              <p className="text-[10px] text-muted-foreground font-mono leading-tight mt-0.5">
                {stage.code}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold shrink-0",
              cards.length === 0
                ? "bg-background text-muted-foreground border border-border/60"
                : "bg-foreground text-background"
            )}
            title={`${cards.length} case(s) in this stage`}
          >
            {cards.length}
          </span>
        </div>

        {/* Meta row: SLA + flags */}
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
          {stage.slaDays ? (
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium"
              style={{ backgroundColor: hexToRgba(stage.color, 0.12), color: stage.color }}
            >
              <Clock className="h-2.5 w-2.5" />
              SLA {stage.slaDays}d
            </span>
          ) : null}
          {stage.isInitial && (
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
              Initial
            </span>
          )}
          {stage.isFinal && (
            <span className="inline-flex items-center gap-0.5 rounded bg-rose-500/10 px-1.5 py-0.5 font-medium text-rose-600 dark:text-rose-400">
              Final
            </span>
          )}
          {stage.isMandatory && (
            <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-600 dark:text-amber-400">
              Mandatory
            </span>
          )}
          {!stage.allowManualMove && (
            <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
              <Lock className="h-2.5 w-2.5" />
              Auto
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
          "flex-1 min-h-0 m-2 mt-1 rounded-lg p-1 transition-colors overflow-y-auto kanban-col-scroll",
          isOver
            ? "bg-background/80 outline-dashed outline-2 outline-offset-[-2px]"
            : "outline-transparent"
        )}
        style={
          isOver
            ? ({ "--tw-outline-color": stage.color } as React.CSSProperties)
            : undefined
        }
      >
        {cards.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed",
              isOver ? "border-transparent" : "border-border/50"
            )}
          >
            <Inbox className="h-5 w-5 text-muted-foreground/50 mb-1.5" />
            <p className="text-xs text-muted-foreground/70">
              {isOver ? "Drop here" : "No cases"}
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
                  <ExitCaseCard
                    exitCase={c}
                    isDragging={draggingId === c.id}
                    onDragStart={() => onCardDragStart(c.id)}
                    onDragEnd={onCardDragEnd}
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
// Exit Case Card
// =============================================================

interface ExitCaseCardProps {
  exitCase: ExitCase
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}

const ExitCaseCard = React.memo(function ExitCaseCard({
  exitCase, isDragging, onDragStart, onDragEnd,
}: ExitCaseCardProps) {
  const exitTypeColor = EXIT_TYPE_COLORS[exitCase.exitType] || "#64748b"
  const riskColor = RISK_COLORS[exitCase.riskFlag ?? "low"] || "#10b981"
  const lwd = lwdOf(exitCase)
  const daysRem = daysRemainingToLwd(exitCase)
  const clr = clearanceProgress(exitCase.id)
  const assetPending = assetPendingCount(exitCase.id)
  const itPending = itPendingCount(exitCase.id)
  const badges = buildBadges(exitCase)
  const fnfColor = STATUS_COLORS[exitCase.fnfStatus] || "#94a3b8"
  const letterColor = STATUS_COLORS[exitCase.letterStatus] || "#94a3b8"

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", exitCase.id)
    e.dataTransfer.effectAllowed = "move"
    onDragStart()
  }

  const onAction = (action: string) => {
    toast.success(`${action} — ${exitCase.employeeName} (${exitCase.exitCaseId})`, {
      description: "Demo action — backend not wired in this build.",
    })
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative bg-card border border-border/60 rounded-lg shadow-sm hover:shadow-md transition-shadow p-2.5 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 ring-2 ring-rose-400/40"
      )}
      style={{ borderLeftColor: riskColor, borderLeftWidth: 3 }}
    >
      {/* Header: avatar + name + code + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-[11px] font-semibold text-white" style={{ backgroundColor: exitCase.avatarColor }}>
              {initials(exitCase.employeeName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h4 className="text-sm font-semibold text-foreground truncate leading-tight">{exitCase.employeeName}</h4>
              {exitCase.legalHold && (
                <Tooltip><TooltipTrigger asChild><Scale className="h-3 w-3 text-purple-500 shrink-0" /></TooltipTrigger><TooltipContent side="top">Legal hold active</TooltipContent></Tooltip>
              )}
              {exitCase.confidential && (
                <Tooltip><TooltipTrigger asChild><Lock className="h-3 w-3 text-amber-500 shrink-0" /></TooltipTrigger><TooltipContent side="top">Confidential case</TooltipContent></Tooltip>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center gap-0.5 rounded bg-muted/70 px-1 py-0 text-[10px] font-mono text-muted-foreground">
                <Hash className="h-2.5 w-2.5" />{exitCase.employeeCode}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">{exitCase.exitCaseId}</span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
              aria-label="Card actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">{exitCase.employeeName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction("View Exit Case")}>
              <Eye className="mr-2 h-3.5 w-3.5" /> View Exit Case
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRight className="mr-2 h-3.5 w-3.5" /> Move Stage
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-56 max-h-72 overflow-y-auto">
                  {DEFAULT_EXIT_STAGES.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      disabled={s.id === exitCase.currentStageId}
                      onClick={() => toast.success(`Moved ${exitCase.employeeName} to ${s.name}`)}
                    >
                      <span className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.name}</span>
                      {s.id === exitCase.currentStageId && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            {([
              ["Approve Resignation", ThumbsUp], ["Reject Resignation", ThumbsDown],
              ["Change LWD", CalendarClock], ["Start Clearance", ClipboardCheck],
              ["Assign Task", UserPlus], ["Send Reminder", Send],
              ["Initiate FnF", Wallet], ["Generate Letter", FileText],
              ["Mark Exited", CheckCircle],
            ] as Array<[string, React.ComponentType<{ className?: string }>]>).map(([label, Icon]) => (
              <DropdownMenuItem key={label} onClick={() => onAction(label)}>
                <Icon className="mr-2 h-3.5 w-3.5" /> {label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => onAction("Cancel Exit")} className="text-rose-600 dark:text-rose-400 focus:text-rose-600">
              <XCircle className="mr-2 h-3.5 w-3.5" /> Cancel Exit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction("View Timeline")}>
              <History className="mr-2 h-3.5 w-3.5" /> View Timeline
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Entity + dept · designation */}
      <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Building2 className="h-3 w-3 shrink-0" />
        <span className="truncate">{exitCase.entity}</span>
      </div>
      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
        {exitCase.department} · {exitCase.designation}
      </p>

      {/* Exit type + reason */}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: hexToRgba(exitTypeColor, 0.14), color: exitTypeColor }}>
          {exitCase.exitType}
        </span>
        <span className="text-[10px] text-muted-foreground truncate flex-1 min-w-0" title={exitCase.exitReason}>
          {exitCase.exitReason}
        </span>
      </div>

      {/* LWD + days remaining */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-md bg-muted/40 px-1.5 py-1">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">Last Working Day</p>
          <p
            className={cn(
              "text-[11px] font-semibold truncate",
              isLwdToday(exitCase) && "text-rose-600 dark:text-rose-400",
              !isLwdToday(exitCase) && isLwdThisWeek(exitCase) && "text-amber-600 dark:text-amber-400",
              !isLwdToday(exitCase) && !isLwdThisWeek(exitCase) && "text-foreground"
            )}
            title={lwd ? formatDate(lwd) : "Not set"}
          >
            {lwd ? formatDate(lwd) : "—"}
          </p>
        </div>
        <div className="rounded-md bg-muted/40 px-1.5 py-1">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">Days Remaining</p>
          <p
            className={cn(
              "text-[11px] font-semibold truncate",
              (daysRem === null || daysRem < 0) && "text-muted-foreground",
              daysRem === 0 && "text-rose-600 dark:text-rose-400",
              daysRem !== null && daysRem > 0 && daysRem <= 7 && "text-amber-600 dark:text-amber-400",
              daysRem !== null && daysRem > 7 && "text-foreground"
            )}
          >
            {daysRem === null ? "—" : daysRem < 0 ? `${Math.abs(daysRem)}d ago` : daysRem === 0 ? "Today" : `${daysRem}d`}
          </p>
        </div>
      </div>

      {/* Clearance progress */}
      {clr.total > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Clearance</span>
            <span className={cn("text-[10px] font-semibold", clr.percent === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
              {clr.completed}/{clr.total} · {clr.percent}%
            </span>
          </div>
          <Progress value={clr.percent} className="h-1.5" style={{ ["--progress-background" as any]: hexToRgba(clr.percent === 100 ? "#10b981" : "#0ea5e9", 0.2) }} />
        </div>
      )}

      {/* Status badges row (asset, it, fnf, letter) */}
      <div className="mt-2 flex items-center gap-1 flex-wrap">
        <StatusMiniBadge icon={<Package className="h-2.5 w-2.5" />} label={exitCase.assetStatus} count={assetPending} color={STATUS_COLORS[exitCase.assetStatus] || "#94a3b8"} />
        <StatusMiniBadge icon={<KeyRound className="h-2.5 w-2.5" />} label={exitCase.itAccessStatus} count={itPending} color={STATUS_COLORS[exitCase.itAccessStatus] || "#94a3b8"} />
        <StatusMiniBadge icon={<Wallet className="h-2.5 w-2.5" />} label={exitCase.fnfStatus} color={fnfColor} />
        <StatusMiniBadge icon={<FileText className="h-2.5 w-2.5" />} label={exitCase.letterStatus} color={letterColor} />
      </div>

      {/* Card badges (spec — Card Badges) */}
      {badges.length > 0 && (
        <div className="mt-2 flex items-center gap-1 flex-wrap">
          {badges.map((b) => (
            <span key={b.key} className={cn("inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium leading-none", b.className)}>
              {b.label}
            </span>
          ))}
        </div>
      )}

      <Separator className="my-2 bg-border/50" />

      {/* Footer: risk + pending with */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: hexToRgba(riskColor, 0.15), color: riskColor }}>
                <Flag className="h-2.5 w-2.5" />
                {(exitCase.riskFlag ?? "low").toUpperCase()} RISK
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Risk flag: {exitCase.riskFlag ?? "low"}{exitCase.regrettable ? " · Regrettable" : ""}{exitCase.eligibleRehire ? " · Rehire eligible" : " · Not rehire eligible"}
            </TooltipContent>
          </Tooltip>
          {exitCase.noticeShortfallDays ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] text-orange-600 dark:text-orange-400 font-medium">
              <AlertTriangle className="h-2.5 w-2.5" />{exitCase.noticeShortfallDays}d shortfall
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground min-w-0">
          <span className="truncate" title={pendingWith(exitCase)}>
            Pending: <span className="font-medium text-foreground">{pendingWith(exitCase)}</span>
          </span>
        </div>
      </div>
    </div>
  )
})

// =============================================================
// Mini status badge with optional count
// =============================================================

interface StatusMiniBadgeProps {
  icon: React.ReactNode
  label: string
  count?: number
  color: string
}

function StatusMiniBadge({ icon, label, count, color }: StatusMiniBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium leading-none" style={{ backgroundColor: hexToRgba(color, 0.14), color }}>
          {icon}
          <span className="truncate max-w-[60px]">{label}</span>
          {count !== undefined && count > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[8px] font-bold h-3 min-w-3 px-0.5">{count}</span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}{count !== undefined && count > 0 ? ` · ${count} pending` : ""}</TooltipContent>
    </Tooltip>
  )
}

// =============================================================
// Board Configuration Dialog (spec #8 — read-only)
// =============================================================

type BoardSummary = {
  id: string; name: string; code: string; scopeType: string;
  entity?: string; exitType?: string; workflow: string;
  stagesCount: number; isDefault: boolean; status: string;
  version: number; createdBy: string; updatedAt: string;
}

interface BoardConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  board: BoardSummary | null
  stages: ExitStage[]
}

function BoardConfigDialog({ open, onOpenChange, board, stages }: BoardConfigDialogProps) {
  if (!board) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KanbanSquare className="h-5 w-5 text-rose-500" />
            {board.name}
          </DialogTitle>
          <DialogDescription>
            Read-only stage configuration. Use the “Edit Board” button to open the workflow builder.
          </DialogDescription>
        </DialogHeader>

        {/* Board summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-y border-border/60">
          <Field label="Board Code" value={board.code} />
          <Field label="Scope Type" value={board.scopeType} />
          <Field
            label="Entity / Exit Type"
            value={board.entity ?? board.exitType ?? "—"}
          />
          <Field label="Workflow" value={board.workflow} />
          <Field label="Stages" value={`${board.stagesCount}`} />
          <Field label="Default" value={board.isDefault ? "Yes" : "No"} />
          <Field label="Status" value={board.status} />
          <Field label="Version" value={`v${board.version}`} />
          <Field label="Created By" value={board.createdBy} />
          <Field label="Updated At" value={formatDate(board.updatedAt)} />
        </div>

        {/* Stages table (read-only) */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 py-3">
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <ChevronRight className="h-4 w-4 text-rose-500" />
            Stages ({stages.length})
          </h4>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  {([
                    ["Stage", "text-left"], ["Code", "text-left"], ["Color", "text-left"],
                    ["SLA", "text-center"], ["Initial", "text-center"], ["Final", "text-center"],
                    ["Mandatory", "text-center"], ["Manual Move", "text-center"], ["Allow Skip", "text-center"],
                  ] as Array<[string, string]>).map(([h, align]) => (
                    <th key={h} className={cn("font-medium px-2.5 py-2", align)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {stages.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-2.5 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="font-medium text-foreground truncate">{s.name}</span>
                      </div>
                      {s.description && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5 max-w-[200px]">{s.description}</p>
                      )}
                    </td>
                    <td className="px-2.5 py-2 font-mono text-[10px] text-muted-foreground">{s.code}</td>
                    <td className="px-2.5 py-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-3 w-3 rounded border border-border/60" style={{ backgroundColor: s.color }} />
                        <span className="text-[10px] text-muted-foreground font-mono">{s.color}</span>
                      </span>
                    </td>
                    <td className="px-2.5 py-2 text-center">
                      {s.slaDays ? (
                        <span className="inline-flex items-center gap-0.5 text-foreground">
                          <Clock className="h-3 w-3 text-muted-foreground" />{s.slaDays}d
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-2.5 py-2 text-center"><BoolCell ok={!!s.isInitial} color="emerald" /></td>
                    <td className="px-2.5 py-2 text-center"><BoolCell ok={!!s.isFinal} color="rose" /></td>
                    <td className="px-2.5 py-2 text-center"><BoolCell ok={!!s.isMandatory} color="amber" /></td>
                    <td className="px-2.5 py-2 text-center"><BoolCell ok={!!s.allowManualMove} color="emerald" showCross /></td>
                    <td className="px-2.5 py-2 text-center"><BoolCell ok={!!s.allowSkip} color="emerald" showCross /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => toast.info("Edit Board is disabled in this build.", {
              description: "Open the Workflow Builder to modify stages.",
            })}
          >
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            Edit Board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className="text-xs font-medium text-foreground truncate" title={value}>{value}</p>
    </div>
  )
}

function BoolCell({ ok, color, showCross }: { ok: boolean; color: string; showCross?: boolean }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-500", rose: "text-rose-500", amber: "text-amber-500",
  }
  if (ok) return <CheckCircle2 className={cn("h-3.5 w-3.5 inline", colorMap[color])} />
  if (showCross) return <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 inline" />
  return <span className="text-muted-foreground">—</span>
}
