"use client"

// ============================================================
// RequestsTab — central place for all employee requests.
// API: /api/employees/[id]/requests (GET list, POST create,
// GET/PATCH/DELETE by recordId).
// ------------------------------------------------------------

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Inbox, Plus, Eye, Ban, RefreshCw, Trash2, Filter, X,
  Clock, CheckCircle2, XCircle, ChevronRight,
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

interface RequestRec {
  id: string
  requestType: string
  referenceId?: string | null
  title: string
  description?: string | null
  payload?: string | null
  status: string
  pendingWith?: string | null
  submittedAt: string | Date
  decidedAt?: string | Date | null
  decidedBy?: string | null
  remarks?: string | null
}

// ---------- helpers ----------

const REQUEST_TYPES = [
  "Leave", "Attendance regularization", "Profile update", "Document update",
  "Bank update", "Expense claim", "Asset request", "Travel", "WFH",
  "Shift change", "Resignation",
] as const

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected", "Withdrawn", "Cancelled"] as const

const TYPE_COLORS: Record<string, string> = {
  Leave: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Attendance regularization": "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  "Profile update": "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "Document update": "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "Bank update": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Expense claim": "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
  "Asset request": "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Travel: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  WFH: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "Shift change": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Resignation: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Withdrawn: "bg-muted text-muted-foreground",
  Cancelled: "bg-muted text-muted-foreground",
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

function prettyJson(s?: string | null) {
  if (!s) return null
  try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return s }
}

// ============================================================
// Component
// ============================================================

export default function RequestsTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<RequestRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [search, setSearch] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [view, setView] = React.useState<RequestRec | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<RequestRec | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/requests`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load requests")
      setItems(data?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load requests")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  const counts = React.useMemo(() => {
    return {
      pending: items.filter((i) => i.status === "Pending").length,
      approved: items.filter((i) => i.status === "Approved").length,
      rejected: items.filter((i) => i.status === "Rejected").length,
      withdrawn: items.filter((i) => i.status === "Withdrawn").length,
    }
  }, [items])

  const filtered = items.filter((r) => {
    if (typeFilter !== "all" && r.requestType !== typeFilter) return false
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return r.title.toLowerCase().includes(q)
        || (r.description || "").toLowerCase().includes(q)
        || r.requestType.toLowerCase().includes(q)
    }
    return true
  })

  async function patchStatus(rec: RequestRec, status: string, successMsg: string) {
    try {
      const res = await fetch(`/api/employees/${employeeId}/requests/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to update")
      toast.success(successMsg)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to update")
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/employees/${employeeId}/requests/${deleteTarget.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      toast.success("Request deleted")
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
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Requests</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Central place for all employee requests — leave, attendance regularization, profile/document/bank updates, expense claims, asset requests, travel, WFH, shift changes, and resignations.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> New Request
        </Button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pending" value={counts.pending} icon={Clock} accent="amber" />
        <StatCard label="Approved" value={counts.approved} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Rejected" value={counts.rejected} icon={XCircle} accent="coral" />
        <StatCard label="Withdrawn" value={counts.withdrawn} icon={Ban} accent="cyan" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          <Filter className="h-4 w-4" /> Filters
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[180px]">
            <SelectValue placeholder="Request type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {REQUEST_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search title or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 sm:max-w-xs"
        />
        {(typeFilter !== "all" || statusFilter !== "all" || search) && (
          <Button variant="ghost" size="sm" className="h-9 gap-1.5"
            onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setSearch("") }}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border/60">
          <EmptyState
            icon={Inbox}
            title="No requests found"
            description="Raise a new request or adjust your filters."
            action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Request</Button>}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
          <ScrollArea className="max-h-[640px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[150px]">Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Title</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending with</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Decided</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Decided by</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Remarks</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setView(r)}>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-medium border-0", TYPE_COLORS[r.requestType] || "bg-muted text-muted-foreground")}>
                        {r.requestType}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[280px] truncate" title={r.description || ""}>
                      {r.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[r.status] || "bg-muted text-muted-foreground")}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.pendingWith || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.submittedAt)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.decidedAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{r.decidedBy || "—"}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate" title={r.remarks || ""}>
                      {r.remarks || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setView(r)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {r.status === "Pending" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => patchStatus(r, "Withdrawn", "Request withdrawn")}>
                            <Ban className="h-3.5 w-3.5" /> Withdraw
                          </Button>
                        )}
                        {r.status === "Rejected" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                            onClick={() => patchStatus(r, "Pending", "Request re-submitted")}>
                            <RefreshCw className="h-3.5 w-3.5" /> Re-submit
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10"
                          onClick={() => setDeleteTarget(r)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}

      {/* Create dialog */}
      <CreateRequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employeeId={employeeId}
        onCreated={load}
      />

      {/* View dialog */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {view?.title}
              {view && (
                <Badge variant="secondary" className={cn("font-medium border-0", TYPE_COLORS[view.requestType] || "bg-muted text-muted-foreground")}>
                  {view.requestType}
                </Badge>
              )}
              {view && (
                <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[view.status] || "bg-muted text-muted-foreground")}>
                  {view.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Submitted {fmtDate(view?.submittedAt)} · Pending with {view?.pendingWith || "—"}
            </DialogDescription>
          </DialogHeader>
          {view && (
            <div className="space-y-4">
              <SectionCard title="Description">
                <p className="text-sm whitespace-pre-wrap">{view.description || "—"}</p>
              </SectionCard>
              {view.payload && (
                <SectionCard title="Payload">
                  <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                    {prettyJson(view.payload) || view.payload}
                  </pre>
                </SectionCard>
              )}
              <SectionCard title="Decision">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Decided by</dt>
                    <dd className="font-medium">{view.decidedBy || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Decided at</dt>
                    <dd className="font-medium">{fmtDate(view.decidedAt)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Remarks</dt>
                    <dd className="font-medium">{view.remarks || "—"}</dd>
                  </div>
                </dl>
              </SectionCard>
              <DialogFooter className="gap-2">
                {view.status === "Pending" && (
                  <Button variant="outline" className="gap-1.5"
                    onClick={() => { patchStatus(view, "Withdrawn", "Request withdrawn"); setView(null) }}>
                    <Ban className="h-4 w-4" /> Withdraw
                  </Button>
                )}
                {view.status === "Rejected" && (
                  <Button variant="outline" className="gap-1.5 text-emerald-600 hover:bg-emerald-500/10"
                    onClick={() => { patchStatus(view, "Pending", "Request re-submitted"); setView(null) }}>
                    <RefreshCw className="h-4 w-4" /> Re-submit
                  </Button>
                )}
                <Button variant="outline" className="gap-1.5 text-rose-600 hover:bg-rose-500/10"
                  onClick={() => { setDeleteTarget(view); setView(null) }}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// ============================================================
// Create Request Dialog
// ============================================================

function CreateRequestDialog({
  open, onOpenChange, employeeId, onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  onCreated: () => void
}) {
  const [form, setForm] = React.useState({
    requestType: "Leave",
    title: "",
    description: "",
    payload: "",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setForm({ requestType: "Leave", title: "", description: "", payload: "" })
    }
  }, [open])

  async function handleSubmit() {
    if (!form.title.trim()) {
      toast.error("Title is required")
      return
    }
    // Validate payload JSON if provided
    if (form.payload.trim()) {
      try { JSON.parse(form.payload) } catch {
        toast.error("Payload must be valid JSON")
        return
      }
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: form.requestType,
          title: form.title,
          description: form.description || undefined,
          payload: form.payload || undefined,
          status: "Pending",
          submittedAt: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to create request")
      toast.success("Request submitted")
      onOpenChange(false)
      onCreated()
    } catch (e: any) {
      toast.error(e.message || "Failed to create request")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Request</DialogTitle>
          <DialogDescription>
            Raise a new request. The request will be created in <span className="font-medium">Pending</span> status.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Request type <span className="text-rose-500">*</span></Label>
            <Select value={form.requestType} onValueChange={(v) => setForm({ ...form, requestType: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title <span className="text-rose-500">*</span></Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Short title for this request"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Provide more context..."
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Payload (JSON)</Label>
            <Textarea
              value={form.payload}
              onChange={(e) => setForm({ ...form, payload: e.target.value })}
              placeholder='{\n  "from": "2025-01-20",\n  "to": "2025-01-22"\n}'
              rows={4}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">Optional. Must be valid JSON.</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting ? <ChevronRight className="h-4 w-4 animate-pulse" /> : <Plus className="h-4 w-4" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
