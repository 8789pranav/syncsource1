"use client"

// ============================================================
// HelpdeskTab — CRUD for EmployeeHelpdeskTicket.
//   • Stat strip: Open / In Progress / Resolved / Closed + SLA
//   • Table with category & priority badges, SLA status
//   • Resolve / close / reopen / feedback actions
// ------------------------------------------------------------
// API: /api/employees/[id]/tickets (+ /<recordId>)
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format, differenceInHours } from "date-fns"
import {
  Plus, RefreshCw, Loader2, Eye, CheckCircle2, XCircle, LifeBuoy, Clock,
  AlertTriangle, MessageSquare, Star, RotateCcw, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SectionCard, EmptyState, StatCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- types ----------

interface TicketRec {
  id: string
  ticketCode: string
  subject: string
  category?: string | null
  priority: string
  status: string
  description?: string | null
  assignedTo?: string | null
  slaHours?: number | null
  slaStatus?: string | null
  resolution?: string | null
  resolvedAt?: string | Date | null
  feedback?: string | null
  rating?: number | null
  attachmentUrl?: string | null
  createdAt: string | Date
}

const CATEGORIES = ["HR", "IT", "Payroll", "Finance", "Admin", "Facilities", "POSH", "Whistleblower"]
const PRIORITIES = ["Low", "Medium", "High", "Urgent"]
const STATUSES = ["Open", "In Progress", "Resolved", "Closed", "Reopened"]

const CATEGORY_COLORS: Record<string, string> = {
  HR: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  IT: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Payroll: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Finance: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Admin: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Facilities: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
  POSH: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Whistleblower: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  High: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Urgent: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "In Progress": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Closed: "bg-muted text-muted-foreground",
  Reopened: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
}

const SLA_COLORS: Record<string, string> = {
  "Within SLA": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Breaching: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Breached: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

const STATUS_FILTERS = ["All", "Open", "In Progress", "Resolved", "Closed", "Reopened"]
const PRIORITY_FILTERS = ["All", ...PRIORITIES]

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy HH:mm") } catch { return "—" }
}
function fmtDateShort(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

// Compute live SLA status if not set
function liveSla(rec: TicketRec): string {
  if (rec.slaStatus) return rec.slaStatus
  if (!rec.slaHours) return "Within SLA"
  if (rec.status === "Resolved" || rec.status === "Closed") return "Within SLA"
  const elapsed = differenceInHours(new Date(), new Date(rec.createdAt))
  if (elapsed > rec.slaHours) return "Breached"
  if (elapsed >= rec.slaHours - 4) return "Breaching"
  return "Within SLA"
}

// ============================================================
// Component
// ============================================================

export default function HelpdeskTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<TicketRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState<string>("All")
  const [priorityFilter, setPriorityFilter] = React.useState<string>("All")
  const [search, setSearch] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [view, setView] = React.useState<TicketRec | null>(null)
  const [resolveTarget, setResolveTarget] = React.useState<TicketRec | null>(null)
  const [feedbackTarget, setFeedbackTarget] = React.useState<TicketRec | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<TicketRec | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/tickets`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load tickets")
      setItems(data?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load tickets")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  const counts = React.useMemo(() => ({
    open: items.filter((i) => i.status === "Open" || i.status === "Reopened").length,
    inProgress: items.filter((i) => i.status === "In Progress").length,
    resolved: items.filter((i) => i.status === "Resolved").length,
    closed: items.filter((i) => i.status === "Closed").length,
  }), [items])

  const slaCounts = React.useMemo(() => {
    const c = { within: 0, breaching: 0, breached: 0 }
    for (const i of items) {
      const s = liveSla(i)
      if (s === "Within SLA") c.within++
      else if (s === "Breaching") c.breaching++
      else if (s === "Breached") c.breached++
    }
    return c
  }, [items])

  const filtered = items.filter((r) => {
    if (statusFilter !== "All" && r.status !== statusFilter) return false
    if (priorityFilter !== "All" && r.priority !== priorityFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return r.ticketCode.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q)
    }
    return true
  })

  async function patchTicket(rec: TicketRec, payload: Record<string, unknown>, msg: string) {
    try {
      const res = await fetch(`/api/employees/${employeeId}/tickets/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to update")
      toast.success(msg)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to update")
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/employees/${employeeId}/tickets/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      toast.success("Ticket deleted")
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete")
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-5"
    >
      {/* Heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Helpdesk Tickets</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Raise, track and resolve helpdesk tickets across HR, IT, Payroll, Admin, POSH and more.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Raise Ticket
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Open" value={counts.open} icon={LifeBuoy} accent="cyan" />
        <StatCard label="In Progress" value={counts.inProgress} icon={Clock} accent="amber" />
        <StatCard label="Resolved" value={counts.resolved} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Closed" value={counts.closed} icon={XCircle} accent="coral" />
      </div>

      {/* SLA summary */}
      <SectionCard title="SLA Status" description="Live SLA tracking across all tickets">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/40 dark:bg-emerald-500/5 dark:border-emerald-500/20 p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{slaCounts.within}</p>
            <p className="text-xs text-muted-foreground">Within SLA</p>
          </div>
          <div className="rounded-lg border border-amber-200/60 bg-amber-50/40 dark:bg-amber-500/5 dark:border-amber-500/20 p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{slaCounts.breaching}</p>
            <p className="text-xs text-muted-foreground">Breaching</p>
          </div>
          <div className="rounded-lg border border-rose-200/60 bg-rose-50/40 dark:bg-rose-500/5 dark:border-rose-500/20 p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">{slaCounts.breached}</p>
            <p className="text-xs text-muted-foreground">Breached</p>
          </div>
        </div>
      </SectionCard>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[150px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            {PRIORITY_FILTERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search code, subject, description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 sm:max-w-xs"
        />
        {(statusFilter !== "All" || priorityFilter !== "All" || search) && (
          <Button variant="ghost" size="sm" className="h-9 gap-1.5"
            onClick={() => { setStatusFilter("All"); setPriorityFilter("All"); setSearch("") }}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Tickets table */}
      <SectionCard title="Tickets" description={`${filtered.length} of ${items.length} tickets`}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={LifeBuoy} title="No tickets raised"
            description="Raise a new ticket to get help from HR, IT, Payroll, Admin or other teams."
            action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Raise Ticket</Button>} />
        ) : (
          <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
            <ScrollArea className="max-h-[640px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Code</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Subject</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SLA</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resolved</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => {
                    const sla = liveSla(t)
                    return (
                      <TableRow key={t.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setView(t)}>
                        <TableCell className="font-mono text-xs">{t.ticketCode}</TableCell>
                        <TableCell className="font-medium">{t.subject}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium border-0", CATEGORY_COLORS[t.category || ""] || "bg-muted text-muted-foreground")}>
                            {t.category || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium border-0", PRIORITY_COLORS[t.priority] || "bg-muted text-muted-foreground")}>
                            {t.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[t.status] || "bg-muted text-muted-foreground")}>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium border-0", SLA_COLORS[sla] || "bg-muted text-muted-foreground")}>
                            {sla}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{t.assignedTo || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateShort(t.createdAt)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateShort(t.resolvedAt)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setView(t)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {(t.status === "Open" || t.status === "In Progress" || t.status === "Reopened") && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:bg-emerald-500/10"
                                onClick={() => setResolveTarget(t)}>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                              </Button>
                            )}
                            {t.status === "Resolved" && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-rose-600 hover:bg-rose-500/10"
                                onClick={() => patchTicket(t, { status: "Reopened" }, "Ticket reopened")}>
                                <RotateCcw className="h-3.5 w-3.5" /> Reopen
                              </Button>
                            )}
                            {(t.status === "Resolved" || t.status === "Closed") && !t.feedback && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-cyan-600 hover:bg-cyan-500/10"
                                onClick={() => setFeedbackTarget(t)}>
                                <MessageSquare className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </SectionCard>

      {/* Create dialog */}
      <CreateTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employeeId={employeeId}
        onCreated={load}
      />

      {/* View dialog */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">{view?.ticketCode}</span>
              {view?.subject}
              {view && (
                <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[view.status] || "bg-muted text-muted-foreground")}>
                  {view.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {view?.category} · {view?.priority} priority · Created {fmtDate(view?.createdAt)}
            </DialogDescription>
          </DialogHeader>
          {view && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Assigned To</p>
                  <p className="font-medium">{view.assignedTo || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">SLA</p>
                  <Badge variant="secondary" className={cn("font-medium border-0", SLA_COLORS[liveSla(view)] || "bg-muted text-muted-foreground")}>
                    {liveSla(view)}{view.slaHours ? ` · ${view.slaHours}h` : ""}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Resolved At</p>
                  <p className="font-medium">{fmtDate(view.resolvedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <div className="flex items-center gap-0.5 mt-1">
                    {view.rating ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("h-3.5 w-3.5", i < (view.rating || 0) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/40")} />
                      ))
                    ) : <span className="text-muted-foreground">—</span>}
                  </div>
                </div>
              </div>
              {view.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{view.description}</p>
                </div>
              )}
              {view.resolution && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Resolution</p>
                  <p className="whitespace-pre-wrap bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-3 border border-emerald-200/40 dark:border-emerald-500/20">{view.resolution}</p>
                </div>
              )}
              {view.feedback && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Feedback</p>
                  <p className="whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{view.feedback}</p>
                </div>
              )}
              {view.attachmentUrl && (
                <a href={view.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline">
                  <Eye className="h-3 w-3" /> View attachment
                </a>
              )}
              <DialogFooter className="gap-2 flex-wrap">
                {(view.status === "Open" || view.status === "In Progress" || view.status === "Reopened") && (
                  <Button variant="outline" className="gap-1.5 text-emerald-600 hover:bg-emerald-500/10"
                    onClick={() => { setResolveTarget(view); setView(null) }}>
                    <CheckCircle2 className="h-4 w-4" /> Resolve
                  </Button>
                )}
                {view.status === "Resolved" && (
                  <>
                    <Button variant="outline" className="gap-1.5 text-rose-600 hover:bg-rose-500/10"
                      onClick={() => { patchTicket(view, { status: "Reopened" }, "Ticket reopened"); setView(null) }}>
                      <RotateCcw className="h-4 w-4" /> Reopen
                    </Button>
                    <Button variant="outline" className="gap-1.5"
                      onClick={() => { patchTicket(view, { status: "Closed" }, "Ticket closed"); setView(null) }}>
                      <XCircle className="h-4 w-4" /> Close
                    </Button>
                  </>
                )}
                {(view.status === "Resolved" || view.status === "Closed") && !view.feedback && (
                  <Button variant="outline" className="gap-1.5 text-cyan-600 hover:bg-cyan-500/10"
                    onClick={() => { setFeedbackTarget(view); setView(null) }}>
                    <MessageSquare className="h-4 w-4" /> Add Feedback
                  </Button>
                )}
                <Button variant="outline" className="gap-1.5 text-rose-600 hover:bg-rose-500/10"
                  onClick={() => { setDeleteTarget(view); setView(null) }}>
                  <AlertTriangle className="h-4 w-4" /> Delete
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve dialog */}
      <ResolveDialog
        open={!!resolveTarget}
        onOpenChange={(o) => !o && setResolveTarget(null)}
        rec={resolveTarget}
        onConfirm={(resolution) => {
          if (resolveTarget) {
            patchTicket(resolveTarget, { status: "Resolved", resolution }, "Ticket resolved")
            setResolveTarget(null)
          }
        }}
      />

      {/* Feedback dialog */}
      <FeedbackDialog
        open={!!feedbackTarget}
        onOpenChange={(o) => !o && setFeedbackTarget(null)}
        rec={feedbackTarget}
        onConfirm={(feedback, rating) => {
          if (feedbackTarget) {
            patchTicket(feedbackTarget, { feedback, rating }, "Feedback submitted")
            setFeedbackTarget(null)
          }
        }}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ticket <span className="font-mono">{deleteTarget?.ticketCode}</span> — "{deleteTarget?.subject}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// ============================================================
// Create Ticket Dialog
// ============================================================

function CreateTicketDialog({
  open, onOpenChange, employeeId, onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  onCreated: () => void
}) {
  const [form, setForm] = React.useState({
    subject: "", category: "HR", priority: "Medium",
    description: "", attachmentUrl: "",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) setForm({ subject: "", category: "HR", priority: "Medium", description: "", attachmentUrl: "" })
  }, [open])

  async function handleSubmit() {
    if (!form.subject.trim()) { toast.error("Subject is required"); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject,
          category: form.category,
          priority: form.priority,
          description: form.description || undefined,
          attachmentUrl: form.attachmentUrl || undefined,
          slaHours: form.priority === "Urgent" ? 4 : form.priority === "High" ? 8 : form.priority === "Medium" ? 24 : 48,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to raise ticket")
      toast.success(`Ticket raised — ${data.ticketCode}`)
      onOpenChange(false)
      onCreated()
    } catch (e: any) {
      toast.error(e.message || "Failed to raise ticket")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise Ticket</DialogTitle>
          <DialogDescription>Submit a new helpdesk ticket. A unique code will be auto-generated.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Subject <span className="text-rose-500">*</span></Label>
            <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Short summary of the issue" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4}
              placeholder="Provide details about the issue..." />
          </div>
          <div className="space-y-1.5">
            <Label>Attachment URL</Label>
            <Input value={form.attachmentUrl} onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Raise Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Resolve Dialog
// ============================================================

function ResolveDialog({
  open, onOpenChange, rec, onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  rec: TicketRec | null
  onConfirm: (resolution: string) => void
}) {
  const [resolution, setResolution] = React.useState("")
  React.useEffect(() => { if (open) setResolution(rec?.resolution || "") }, [open, rec])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Resolve Ticket
          </DialogTitle>
          <DialogDescription>{rec?.ticketCode} — {rec?.subject}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Resolution Notes</Label>
          <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={4}
            placeholder="Describe how the ticket was resolved..." />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onConfirm(resolution)}>
            <CheckCircle2 className="h-4 w-4" /> Mark Resolved
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Feedback Dialog
// ============================================================

function FeedbackDialog({
  open, onOpenChange, rec, onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  rec: TicketRec | null
  onConfirm: (feedback: string, rating: number) => void
}) {
  const [feedback, setFeedback] = React.useState("")
  const [rating, setRating] = React.useState(0)
  React.useEffect(() => {
    if (open) {
      setFeedback(rec?.feedback || "")
      setRating(rec?.rating || 0)
    }
  }, [open, rec])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-cyan-600 dark:text-cyan-400" /> Add Feedback
          </DialogTitle>
          <DialogDescription>{rec?.ticketCode} — {rec?.subject}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Rating</Label>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} type="button" onClick={() => setRating(i + 1)} className="p-0.5" aria-label={`${i + 1} star`}>
                  <Star className={cn("h-6 w-6 transition-colors", i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/40 hover:text-amber-300")} />
                </button>
              ))}
              {rating > 0 && <span className="text-sm text-muted-foreground ml-2 tabular-nums">{rating}/5</span>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Feedback</Label>
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3}
              placeholder="Share your experience with the resolution..." />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="gap-1.5" onClick={() => onConfirm(feedback, rating)}>
            <MessageSquare className="h-4 w-4" /> Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
