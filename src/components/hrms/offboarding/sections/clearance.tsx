"use client"

// ============================================================================
//  ClearanceSection — Offboarding spec #10
//  Department-wise clearance tasks across 14 clearance departments.
//  Stats cards, filter bar, tasks table with row actions, task detail dialog
//  with comment thread + attachment upload, and department-wise summary cards.
// ============================================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ShieldCheck, ClipboardList, CheckCircle2, AlertTriangle, Clock,
  Search, MoreHorizontal, Play, Send, Check, X, RotateCcw, CheckCheck,
  Ban, IndianRupee, MessageSquarePlus, Paperclip, UserCog, BellRing,
  FileText, Filter, Inbox,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

import {
  EXIT_CASES, CLEARANCE_TASKS,
} from "@/components/hrms/offboarding/data"
import type {
  ClearanceTask, ClearanceDepartment, ClearanceTaskStatus,
} from "@/components/hrms/offboarding/shared"
import {
  initials, formatDate, formatCurrency, STATUS_COLORS, AVATAR_COLORS,
} from "@/components/hrms/offboarding/shared"

// ---------- Constants ----------
const CLEARANCE_DEPARTMENTS: ClearanceDepartment[] = [
  "Reporting Manager", "HR", "IT", "Admin / Facilities", "Finance", "Payroll",
  "Legal", "Compliance", "Security", "Project Manager", "Training / L&D",
  "Asset Team", "Travel Desk", "Library / Store",
]

const CLEARANCE_STATUSES: ClearanceTaskStatus[] = [
  "Not Started", "Pending", "In Progress", "Submitted", "Approved", "Rejected",
  "Needs Correction", "Completed", "Overdue", "Waived", "Not Applicable",
]

const DEPT_COLORS: Record<ClearanceDepartment, string> = {
  "Reporting Manager": "#0ea5e9",
  "HR": "#10b981",
  "IT": "#8b5cf6",
  "Admin / Facilities": "#f59e0b",
  "Finance": "#14b8a6",
  "Payroll": "#06b6d4",
  "Legal": "#f43f5e",
  "Compliance": "#ec4899",
  "Security": "#ef4444",
  "Project Manager": "#a855f7",
  "Training / L&D": "#84cc16",
  "Asset Team": "#f97316",
  "Travel Desk": "#6366f1",
  "Library / Store": "#64748b",
}

interface CommentEntry { id: string; author: string; at: string; text: string }
interface AttachmentEntry { id: string; name: string; size: string; at: string }

type ActionKey = "start" | "submit" | "approve" | "reject" | "sendback" | "complete" | "waive" | "recovery" | "comment" | "attachment" | "reassign" | "reminder"
interface MenuAction { key: ActionKey; label: string; Icon: React.ComponentType<{ className?: string }> }

const PRIMARY_ACTIONS: MenuAction[] = [
  { key: "start", label: "Start Task", Icon: Play },
  { key: "submit", label: "Submit Task", Icon: Send },
  { key: "approve", label: "Approve Task", Icon: Check },
  { key: "reject", label: "Reject Task", Icon: X },
  { key: "sendback", label: "Send Back", Icon: RotateCcw },
  { key: "complete", label: "Mark Complete", Icon: CheckCheck },
  { key: "waive", label: "Waive Task", Icon: Ban },
]
const SECONDARY_ACTIONS: MenuAction[] = [
  { key: "recovery", label: "Add Recovery Amount", Icon: IndianRupee },
  { key: "comment", label: "Add Comment", Icon: MessageSquarePlus },
  { key: "attachment", label: "Upload Attachment", Icon: Paperclip },
  { key: "reassign", label: "Reassign Owner", Icon: UserCog },
  { key: "reminder", label: "Send Reminder", Icon: BellRing },
]
const FOOTER_ACTIONS: MenuAction[] = [
  { key: "start", label: "Start", Icon: Play },
  { key: "submit", label: "Submit", Icon: Send },
  { key: "approve", label: "Approve", Icon: Check },
  { key: "reject", label: "Reject", Icon: X },
  { key: "complete", label: "Complete", Icon: CheckCheck },
  { key: "waive", label: "Waive", Icon: Ban },
  { key: "reminder", label: "Remind", Icon: BellRing },
]

// ============================================================================
//  Component
// ============================================================================
export function ClearanceSection() {
  const [tasks, setTasks] = useState<ClearanceTask[]>(CLEARANCE_TASKS)
  const [exitCaseFilter, setExitCaseFilter] = useState<string>("all")
  const [deptFilter, setDeptFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [comments, setComments] = useState<Record<string, CommentEntry[]>>({
    "ct-3": [{ id: "c1", author: "Priya Patel", at: "2h ago", text: "Laptop pending return from employee." }],
    "ct-5": [{ id: "c2", author: "Anita Desai", at: "1d ago", text: "Please confirm outstanding dues from travel desk." }],
    "ct-13": [{ id: "c3", author: "IT Team", at: "3d ago", text: "Recovery amount raised against unreturned laptop." }],
  })
  const [attachments, setAttachments] = useState<Record<string, AttachmentEntry[]>>({
    "ct-1": [{ id: "a1", name: "handover-doc.pdf", size: "240 KB", at: "2d ago" }],
    "ct-3": [{ id: "a2", name: "laptop-photo.jpg", size: "1.2 MB", at: "1d ago" }],
  })
  const [newComment, setNewComment] = useState("")

  // ---------- Derived: filter + search ----------
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (exitCaseFilter !== "all" && t.exitCaseId !== exitCaseFilter) return false
      if (deptFilter !== "all" && t.department !== deptFilter) return false
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const ec = EXIT_CASES.find((e) => e.id === t.exitCaseId)
        if (!(
          t.taskName.toLowerCase().includes(q) ||
          t.taskCode.toLowerCase().includes(q) ||
          t.owner.toLowerCase().includes(q) ||
          t.ownerType.toLowerCase().includes(q) ||
          (ec?.employeeName.toLowerCase().includes(q) ?? false) ||
          (ec?.exitCaseId.toLowerCase().includes(q) ?? false)
        )) return false
      }
      return true
    })
  }, [tasks, exitCaseFilter, deptFilter, statusFilter, search])

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === "Completed" || t.status === "Approved" || t.status === "Waived").length
    const pending = tasks.filter((t) => ["Not Started", "Pending", "In Progress", "Submitted", "Needs Correction", "Rejected"].includes(t.status)).length
    const overdue = tasks.filter((t) => t.status === "Overdue").length
    return { total, completed, pending, overdue }
  }, [tasks])

  // ---------- Department-wise summary ----------
  const deptSummary = useMemo(() => {
    return CLEARANCE_DEPARTMENTS.map((dept) => {
      const deptTasks = tasks.filter((t) => t.department === dept)
      const byStatus: Record<string, number> = {}
      deptTasks.forEach((t) => { byStatus[t.status] = (byStatus[t.status] || 0) + 1 })
      return {
        dept,
        total: deptTasks.length,
        completed: deptTasks.filter((t) => t.status === "Completed" || t.status === "Approved" || t.status === "Waived").length,
        pending: deptTasks.filter((t) => ["Not Started", "Pending", "In Progress", "Submitted", "Needs Correction"].includes(t.status)).length,
        overdue: deptTasks.filter((t) => t.status === "Overdue").length,
        byStatus,
      }
    })
  }, [tasks])

  // ---------- Actions ----------
  const updateTask = (id: string, patch: Partial<ClearanceTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const handleAction = (action: string, task: ClearanceTask) => {
    const ec = EXIT_CASES.find((e) => e.id === task.exitCaseId)
    const ecLabel = ec ? `${ec.employeeName} (${ec.exitCaseId})` : task.exitCaseId
    const patch: Partial<ClearanceTask> = {}
    switch (action) {
      case "start": patch.status = "In Progress"; break
      case "submit": patch.status = "Submitted"; break
      case "approve": patch.status = "Approved"; patch.completedAt = new Date().toISOString(); patch.completedBy = "You"; break
      case "reject": patch.status = "Rejected"; break
      case "sendback": patch.status = "Needs Correction"; break
      case "complete": patch.status = "Completed"; patch.completedAt = new Date().toISOString(); patch.completedBy = "You"; break
      case "waive": patch.status = "Waived"; break
      default: break
    }
    if (Object.keys(patch).length > 0) updateTask(task.id, patch)
    const labels: Record<string, string> = {
      start: "Started", submit: "Submitted", approve: "Approved", reject: "Rejected",
      sendback: "Sent back for correction", complete: "Marked complete", waive: "Waived",
      recovery: "Recovery amount dialog opened", comment: "Comment dialog opened",
      attachment: "Attachment dialog opened", reassign: "Reassign owner dialog opened",
      reminder: `Reminder sent to ${task.owner}`,
    }
    toast.success(`${labels[action] || action} — ${task.taskName}`, { description: `Exit case: ${ecLabel}` })
  }

  const addComment = (taskId: string) => {
    if (!newComment.trim()) { toast.error("Comment cannot be empty"); return }
    const entry: CommentEntry = {
      id: `c${Date.now()}`, author: "You", at: "just now", text: newComment.trim(),
    }
    setComments((prev) => ({ ...prev, [taskId]: [...(prev[taskId] || []), entry] }))
    setNewComment("")
    toast.success("Comment added")
  }

  const handleUpload = (taskId: string, file: File) => {
    const entry: AttachmentEntry = {
      id: `a${Date.now()}`, name: file.name,
      size: `${(file.size / 1024).toFixed(0)} KB`, at: "just now",
    }
    setAttachments((prev) => ({ ...prev, [taskId]: [...(prev[taskId] || []), entry] }))
    toast.success(`Uploaded: ${file.name}`)
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null
  const selectedExitCase = selectedTask ? EXIT_CASES.find((e) => e.id === selectedTask.exitCaseId) : null

  const openDetail = (task: ClearanceTask) => {
    setSelectedTaskId(task.id)
    setDetailOpen(true)
  }

  // ---------- Render helpers ----------
  const renderStatusBadge = (status: ClearanceTaskStatus) => {
    const color = STATUS_COLORS[status] || "#94a3b8"
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: `${color}1a`, color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {status}
      </span>
    )
  }
  const renderDeptBadge = (dept: ClearanceDepartment) => {
    const color = DEPT_COLORS[dept]
    return <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${color}1a`, color }}>{dept}</span>
  }

  // ============================================================================
  return (
    <div className="flex flex-col gap-5">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<ClipboardList className="h-4 w-4" />}
          label="Total Tasks"
          value={stats.total}
          accent="#9f1239"
          tint="#fff1f2"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Pending"
          value={stats.pending}
          accent="#f59e0b"
          tint="#fffbeb"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Completed"
          value={stats.completed}
          accent="#10b981"
          tint="#ecfdf5"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Overdue"
          value={stats.overdue}
          accent="#ef4444"
          tint="#fef2f2"
        />
      </div>

      {/* Filter bar */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by task, code, owner, employee…"
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:items-center">
              <Select value={exitCaseFilter} onValueChange={setExitCaseFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[180px]"><SelectValue placeholder="Exit Case" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exit Cases</SelectItem>
                  {EXIT_CASES.map((ec) => (
                    <SelectItem key={ec.id} value={ec.id}>{ec.employeeName} · {ec.exitCaseId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[160px]"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {CLEARANCE_DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {CLEARANCE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(exitCaseFilter !== "all" || deptFilter !== "all" || statusFilter !== "all" || search) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>Showing {filtered.length} of {tasks.length} tasks</span>
              <Button
                variant="ghost" size="sm" className="h-6 px-2 text-xs"
                onClick={() => { setExitCaseFilter("all"); setDeptFilter("all"); setStatusFilter("all"); setSearch("") }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks table */}
      <Card className="shadow-sm border-border/60 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-rose-600" />
            Clearance Tasks
            <Badge variant="secondary" className="ml-1 font-normal">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
                <TableRow>
                  <TableHead className="min-w-[240px]">Task</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Exit Case</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-center">SLA</TableHead>
                  <TableHead className="text-center">Flags</TableHead>
                  <TableHead className="text-center">Recovery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                      <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No clearance tasks match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((task) => {
                    const ec = EXIT_CASES.find((e) => e.id === task.exitCaseId)
                    return (
                      <TableRow key={task.id} className="cursor-pointer hover:bg-rose-50/40 dark:hover:bg-rose-950/10 transition-colors" onClick={() => openDetail(task)}>
                        <TableCell>
                          <button className="text-left group" onClick={(e) => { e.stopPropagation(); openDetail(task) }}>
                            <div className="font-medium text-sm text-foreground group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">{task.taskName}</div>
                            <div className="text-xs text-muted-foreground font-mono mt-0.5">{task.taskCode}</div>
                          </button>
                        </TableCell>
                        <TableCell>{renderDeptBadge(task.department)}</TableCell>
                        <TableCell>
                          <div className="text-sm">{task.owner}</div>
                          <div className="text-xs text-muted-foreground">{task.ownerType}</div>
                        </TableCell>
                        <TableCell>
                          {ec ? (
                            <div className="flex items-center gap-2">
                              <div className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold text-white shrink-0" style={{ backgroundColor: ec.avatarColor }}>{initials(ec.employeeName)}</div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium truncate">{ec.employeeName}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{ec.exitCaseId}</div>
                              </div>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(task.dueDate)}</TableCell>
                        <TableCell className="text-center text-xs">{task.slaDays}d</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 justify-center">
                            {task.mandatory && <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-rose-300 text-rose-700 dark:text-rose-300">M</Badge>}
                            {task.blocking && <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-300 text-amber-700 dark:text-amber-300">B</Badge>}
                            {task.financialImpact && <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-teal-300 text-teal-700 dark:text-teal-300">₹</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {task.recoveryAmount && task.recoveryAmount > 0 ? (
                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(task.recoveryAmount)}</span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{renderStatusBadge(task.status)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel className="text-xs">Task Actions</DropdownMenuLabel>
                              <DropdownMenuGroup>
                                {PRIMARY_ACTIONS.map(({ key, label, Icon }) => (
                                  <DropdownMenuItem key={key} onClick={() => handleAction(key, task)}>
                                    <Icon className="h-3.5 w-3.5 mr-2" /> {label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuGroup>
                                {SECONDARY_ACTIONS.map(({ key, label, Icon }) => (
                                  <DropdownMenuItem
                                    key={key}
                                    onClick={() => key === "comment" || key === "attachment" ? openDetail(task) : handleAction(key, task)}
                                  >
                                    <Icon className="h-3.5 w-3.5 mr-2" /> {label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuGroup>
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

      {/* Department-wise clearance summary */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-rose-600" />
            Department-wise Clearance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {deptSummary.map((d, idx) => (
              <motion.div key={d.dept} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02, duration: 0.2 }} className="rounded-xl border border-border/60 bg-card p-4 hover:shadow-md hover:border-rose-200 dark:hover:border-rose-900/40 transition-all">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white text-xs font-bold" style={{ backgroundColor: DEPT_COLORS[d.dept] }}>{initials(d.dept)}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{d.dept}</div>
                    <div className="text-[11px] text-muted-foreground">{d.total} task{d.total !== 1 ? "s" : ""}</div>
                  </div>
                </div>
                <Separator className="my-3" />
                {d.total === 0 ? (
                  <div className="text-xs text-muted-foreground italic">No tasks assigned</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <SummaryStat value={d.completed} label="Done" tone="emerald" />
                    <SummaryStat value={d.pending} label="Pending" tone="amber" />
                    <SummaryStat value={d.overdue} label="Overdue" tone="rose" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-rose-600" />
              {selectedTask?.taskName}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {selectedTask?.taskCode} · Stage: {selectedTask?.stageMapping || "—"}
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <ScrollArea className="flex-1 max-h-[calc(92vh-180px)] pr-2">
              <div className="space-y-4">
                {/* Top meta strip */}
                <div className="flex flex-wrap items-center gap-2">
                  {renderStatusBadge(selectedTask.status)}
                  {renderDeptBadge(selectedTask.department)}
                  {selectedTask.mandatory && <Badge variant="outline" className="text-rose-700 border-rose-300 dark:text-rose-300">Mandatory</Badge>}
                  {selectedTask.blocking && <Badge variant="outline" className="text-amber-700 border-amber-300 dark:text-amber-300">Blocking</Badge>}
                  {selectedTask.financialImpact && <Badge variant="outline" className="text-teal-700 border-teal-300 dark:text-teal-300">Financial Impact</Badge>}
                  {selectedTask.waiverAllowed && <Badge variant="outline" className="text-slate-600 border-slate-300 dark:text-slate-300">Waiver Allowed</Badge>}
                </div>

                {/* Exit case */}
                {selectedExitCase && (
                  <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full text-white text-xs font-semibold" style={{ backgroundColor: selectedExitCase.avatarColor }}>
                      {initials(selectedExitCase.employeeName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{selectedExitCase.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{selectedExitCase.exitCaseId} · {selectedExitCase.department} · {selectedExitCase.designation}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-muted-foreground uppercase">Exit Type</div>
                      <div className="text-xs font-medium">{selectedExitCase.exitType}</div>
                    </div>
                  </div>
                )}

                {/* Fields grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                  <Field label="Owner Type" value={selectedTask.ownerType} />
                  <Field label="Owner" value={selectedTask.owner} />
                  <Field label="Due Date" value={formatDate(selectedTask.dueDate)} />
                  <Field label="SLA Days" value={`${selectedTask.slaDays} days`} />
                  <Field label="Stage Mapping" value={selectedTask.stageMapping || "—"} />
                  <Field label="Recovery Amount" value={selectedTask.recoveryAmount && selectedTask.recoveryAmount > 0 ? formatCurrency(selectedTask.recoveryAmount) : "—"} />
                  <Field label="Completed At" value={formatDate(selectedTask.completedAt)} />
                  <Field label="Completed By" value={selectedTask.completedBy || "—"} />
                </div>

                {/* Flags row */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <FlagPill label="Requires Comment" active={selectedTask.requiresComment} />
                  <FlagPill label="Requires Attachment" active={selectedTask.requiresAttachment} />
                  <FlagPill label="Requires Approval" active={selectedTask.requiresApproval} />
                  <FlagPill label="Waiver Allowed" active={selectedTask.waiverAllowed} />
                </div>

                {selectedTask.comment && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">Existing Comment</div>
                    <p className="text-sm">{selectedTask.comment}</p>
                  </div>
                )}

                <Separator />

                {/* Attachments */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold flex items-center gap-2"><Paperclip className="h-4 w-4 text-rose-600" /> Attachments</div>
                    <label className="cursor-pointer">
                      <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(selectedTask.id, f); e.target.value = "" }} />
                      <Button variant="outline" size="sm" className="h-7 text-xs" asChild><span><Paperclip className="h-3 w-3 mr-1.5" /> Upload</span></Button>
                    </label>
                  </div>
                  {(attachments[selectedTask.id] || []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">No attachments yet.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {(attachments[selectedTask.id] || []).map((a) => (
                        <div key={a.id} className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-1.5 hover:bg-muted/40">
                          <FileText className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                          <div className="text-xs flex-1 min-w-0 truncate">{a.name}</div>
                          <div className="text-[10px] text-muted-foreground">{a.size}</div>
                          <div className="text-[10px] text-muted-foreground">{a.at}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Comment thread */}
                <div>
                  <div className="text-sm font-semibold flex items-center gap-2 mb-2"><MessageSquarePlus className="h-4 w-4 text-rose-600" /> Comment Thread</div>
                  <div className="space-y-2 mb-3">
                    {(comments[selectedTask.id] || []).length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">No comments yet.</div>
                    ) : (comments[selectedTask.id] || []).map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: AVATAR_COLORS[c.author.length % AVATAR_COLORS.length] }}>{initials(c.author)}</div>
                        <div className="flex-1 rounded-lg bg-muted/40 px-3 py-2">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-semibold">{c.author}</span>
                            <span className="text-[10px] text-muted-foreground">{c.at}</span>
                          </div>
                          <p className="text-xs">{c.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment…" className="min-h-[60px] text-sm" />
                    <Button onClick={() => addComment(selectedTask.id)} className="self-end gradient-rose text-primary-foreground shrink-0">Add Comment</Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="border-t pt-4 flex-wrap gap-2">
            {FOOTER_ACTIONS.map(({ key, label, Icon }) => {
              const tone = key === "approve" ? "text-emerald-700" : key === "reject" ? "text-rose-700" : ""
              return (
                <Button
                  key={key} variant="outline" size="sm" className={tone}
                  onClick={() => selectedTask && handleAction(key, selectedTask)}
                >
                  <Icon className="h-3.5 w-3.5 mr-1.5" /> {label}
                </Button>
              )
            })}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
//  Sub-components
// ============================================================================
function StatCard({ icon, label, value, accent, tint }: {
  icon: React.ReactNode; label: string; value: number; accent: string; tint: string
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  )
}

function FlagPill({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={cn("rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors", active ? "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900" : "border-border/60 bg-muted/30 text-muted-foreground")}>
      <div className="flex items-center justify-center gap-1.5">{active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{label}</div>
    </div>
  )
}

function SummaryStat({ value, label, tone }: { value: number; label: string; tone: "emerald" | "amber" | "rose" }) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300",
    rose: "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300",
  }
  return (
    <div className={cn("rounded-lg py-1.5", tones[tone])}>
      <div className="text-sm font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}

export default ClearanceSection
