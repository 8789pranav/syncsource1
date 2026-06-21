'use client'

import * as React from "react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  PageHeader, ListToolbar, DataTable, StatusBadge, EmptyState, SectionCard, Column,
} from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { leaveApplicationFormSchema, leaveTypeFormSchema } from "@/lib/form-schemas"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  CalendarDays, Plus, Check, X, Pencil, Trash2, Eye, FileText, CalendarCheck,
  ShieldCheck,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

// ============================================================
// Types
// ============================================================

interface LeaveType {
  id: string
  code: string
  name: string
  color: string
  isPaid: boolean
  fullDayAllowed: boolean
  halfDayAllowed: boolean
  hourlyAllowed: boolean
  yearlyAccrual: number
  monthlyAccrual: number
  carryForward: boolean
  encashment: boolean
  status: string
}

interface EmployeeLite {
  id: string
  employeeCode: string
  firstName: string
  middleName?: string | null
  lastName?: string | null
  displayName?: string | null
}

interface LeaveApplication {
  id: string
  employeeId: string
  employee?: EmployeeLite
  leaveTypeId: string
  leaveType?: LeaveType
  fromDate: string | Date
  toDate: string | Date
  days: number
  halfDay: boolean
  reason?: string | null
  status: string
  appliedAt: string | Date
  decisionAt?: string | Date | null
  decisionBy?: string | null
  decisionComment?: string | null
}

interface LeavePolicy {
  id: string
  name: string
  code: string
  description?: string | null
  status: string
  items?: Array<{
    id: string
    allocation: number
    leaveType: LeaveType
  }>
}

// ============================================================
// Helpers
// ============================================================

function empName(e?: EmployeeLite) {
  if (!e) return "—"
  return e.displayName || [e.firstName, e.lastName].filter(Boolean).join(" ") || e.employeeCode
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

function fmtDateTime(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy, hh:mm a") } catch { return "—" }
}

// ============================================================
// Main Module
// ============================================================

export function LeaveModule() {
  const [tab, setTab] = React.useState("applications")

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leave Management"
        description="Configure leave types & policies, apply and approve leave requests."
        icon={CalendarDays}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="applications" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Applications
          </TabsTrigger>
          <TabsTrigger value="types" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Leave Types
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Policies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="mt-4">
          <ApplicationsTab />
        </TabsContent>
        <TabsContent value="types" className="mt-4">
          <LeaveTypesTab />
        </TabsContent>
        <TabsContent value="policies" className="mt-4">
          <PoliciesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// Applications Tab
// ============================================================

function ApplicationsTab() {
  const [items, setItems] = React.useState<LeaveApplication[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [applyOpen, setApplyOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<LeaveApplication | null>(null)
  const [decision, setDecision] = React.useState<{ app: LeaveApplication; action: "Approved" | "Rejected" } | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leave-applications?status=${statusFilter === "all" ? "" : statusFilter}`)
      const data = await res.json()
      setItems(data?.items || [])
    } catch {
      toast.error("Failed to load leave applications")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  React.useEffect(() => { load() }, [load])

  const filtered = items.filter((a) => {
    if (!search) return true
    const name = empName(a.employee).toLowerCase()
    const lt = (a.leaveType?.name || "").toLowerCase()
    const code = (a.leaveType?.code || "").toLowerCase()
    return name.includes(search.toLowerCase()) || lt.includes(search.toLowerCase()) || code.includes(search.toLowerCase())
  })

  async function handleApply(v: any) {
    setSubmitting(true)
    try {
      const res = await fetch("/api/leave-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to apply leave")
      }
      toast.success("Leave application submitted")
      setApplyOpen(false)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to apply leave")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDecision(comment: string) {
    if (!decision) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/leave-applications/${decision.app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision.action, decisionComment: comment }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to update")
      }
      toast.success(`Leave ${decision.action.toLowerCase()}`)
      setDecision(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to update")
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<LeaveApplication>[] = [
    {
      key: "employee", header: "Employee",
      render: (a) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
            {empName(a.employee).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{empName(a.employee)}</p>
            <p className="text-xs text-muted-foreground">{a.employee?.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "leaveType", header: "Leave Type",
      render: (a) => (
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.leaveType?.color || "#10b981" }} />
          <span className="font-medium">{a.leaveType?.name || "—"}</span>
          <span className="text-xs text-muted-foreground">({a.leaveType?.code})</span>
        </div>
      ),
    },
    {
      key: "dates", header: "From — To",
      render: (a) => (
        <div className="text-sm">
          <span>{fmtDate(a.fromDate)}</span>
          <span className="mx-1 text-muted-foreground">→</span>
          <span>{fmtDate(a.toDate)}</span>
        </div>
      ),
    },
    {
      key: "days", header: "Days",
      render: (a) => (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
          {a.days} {a.halfDay && <Badge variant="outline" className="text-[10px] px-1 py-0">½</Badge>}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
    { key: "appliedAt", header: "Applied", render: (a) => <span className="text-xs text-muted-foreground">{fmtDate(a.appliedAt)}</span> },
    {
      key: "actions", header: "", className: "text-right",
      render: (a) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {a.status === "Pending" && (
            <>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                onClick={() => setDecision({ app: a, action: "Approved" })}>
                <Check className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                onClick={() => setDecision({ app: a, action: "Rejected" })}>
                <X className="h-3.5 w-3.5" /> Reject
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetail(a)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-2">
      <ListToolbar
        search={search}
        onSearch={setSearch}
        onAdd={() => setApplyOpen(true)}
        addLabel="Apply Leave"
        extra={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
              <SelectItem value="Withdrawn">Withdrawn</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        onRowClick={(a) => setDetail(a)}
        emptyState={
          <EmptyState
            icon={CalendarCheck}
            title="No leave applications"
            description="Apply for leave using the 'Apply Leave' button."
            action={<Button size="sm" onClick={() => setApplyOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Apply Leave</Button>}
          />
        }
      />

      {/* Apply Leave Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>Fill in the details below to submit a leave request.</DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={leaveApplicationFormSchema}
            onSubmit={handleApply}
            onCancel={() => setApplyOpen(false)}
            submitLabel="Submit"
            loading={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* Application Detail Sheet */}
      <ApplicationDetailSheet app={detail} onClose={() => setDetail(null)} onDecision={(action) => { setDetail(null); setDecision({ app: detail!, action }) }} />

      {/* Approve / Reject comment Dialog */}
      <DecisionDialog
        open={!!decision}
        action={decision?.action}
        onClose={() => setDecision(null)}
        onSubmit={handleDecision}
        loading={submitting}
      />
    </div>
  )
}

// ============================================================
// Application Detail Sheet
// ============================================================

function ApplicationDetailSheet({
  app, onClose, onDecision,
}: {
  app: LeaveApplication | null
  onClose: () => void
  onDecision: (action: "Approved" | "Rejected") => void
}) {
  return (
    <Sheet open={!!app} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md w-full" side="right">
        <SheetHeader>
          <SheetTitle>Leave Application</SheetTitle>
          <SheetDescription>Submitted {fmtDateTime(app?.appliedAt)}</SheetDescription>
        </SheetHeader>
        {app && (
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={app.status} />
              <span className="text-xs text-muted-foreground">{app.id.slice(-8).toUpperCase()}</span>
            </div>

            <SectionCard title="Employee">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {empName(app.employee).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{empName(app.employee)}</p>
                  <p className="text-xs text-muted-foreground">{app.employee?.employeeCode}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Leave Details">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Leave Type</dt>
                  <dd className="flex items-center gap-1.5 font-medium">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: app.leaveType?.color }} />
                    {app.leaveType?.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Days</dt>
                  <dd className="font-medium">{app.days} {app.halfDay && "(Half Day)"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">From</dt>
                  <dd className="font-medium">{fmtDate(app.fromDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">To</dt>
                  <dd className="font-medium">{fmtDate(app.toDate)}</dd>
                </div>
              </dl>
            </SectionCard>

            {app.reason && (
              <SectionCard title="Reason">
                <p className="text-sm">{app.reason}</p>
              </SectionCard>
            )}

            {app.decisionAt && (
              <SectionCard title="Decision">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Decided by</dt>
                    <dd className="font-medium">{app.decisionBy || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Decided at</dt>
                    <dd className="font-medium">{fmtDateTime(app.decisionAt)}</dd>
                  </div>
                  {app.decisionComment && (
                    <div>
                      <dt className="text-muted-foreground">Comment</dt>
                      <dd className="mt-1 text-sm">{app.decisionComment}</dd>
                    </div>
                  )}
                </dl>
              </SectionCard>
            )}

            {app.status === "Pending" && (
              <div className="flex gap-2 pt-2">
                <Button className="flex-1 gap-1.5" onClick={() => onDecision("Approved")}>
                  <Check className="h-4 w-4" /> Approve
                </Button>
                <Button variant="outline" className="flex-1 gap-1.5 text-rose-600 hover:bg-rose-500/10" onClick={() => onDecision("Rejected")}>
                  <X className="h-4 w-4" /> Reject
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ============================================================
// Decision Dialog (Approve / Reject with comment)
// ============================================================

function DecisionDialog({
  open, action, onClose, onSubmit, loading,
}: {
  open: boolean
  action?: "Approved" | "Rejected"
  onClose: () => void
  onSubmit: (comment: string) => void
  loading: boolean
}) {
  const [comment, setComment] = React.useState("")
  React.useEffect(() => { if (!open) setComment("") }, [open])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === "Approved" ? (
              <><Check className="h-5 w-5 text-emerald-600" /> Approve Leave</>
            ) : (
              <><X className="h-5 w-5 text-rose-600" /> Reject Leave</>
            )}
          </DialogTitle>
          <DialogDescription>
            {action === "Approved"
              ? "Add an optional comment before approving this leave application."
              : "Please provide a reason for rejecting this leave application."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="comment">Comment {action === "Rejected" && <span className="text-destructive">*</span>}</Label>
          <Textarea
            id="comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={action === "Approved" ? "Approved. Enjoy your time off!" : "Provide a clear reason for rejection..."}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={() => onSubmit(comment)}
            disabled={loading || (action === "Rejected" && !comment.trim())}
            className={cn(action === "Approved" ? "" : "bg-rose-600 hover:bg-rose-700 text-white")}
          >
            {loading ? "Saving..." : action === "Approved" ? "Approve" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Leave Types Tab
// ============================================================

function LeaveTypesTab() {
  const [items, setItems] = React.useState<LeaveType[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<LeaveType | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/leave-types")
      const data = await res.json()
      setItems(data?.items || [])
    } catch {
      toast.error("Failed to load leave types")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const filtered = items.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
  })

  async function handleSubmit(v: any) {
    setSubmitting(true)
    try {
      const url = editing ? `/api/leave-types/${editing.id}` : "/api/leave-types"
      const method = editing ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to save")
      }
      toast.success(editing ? "Leave type updated" : "Leave type created")
      setOpen(false)
      setEditing(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to save")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/leave-types/${deleteId}`, { method: "DELETE" })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to delete")
      }
      toast.success("Leave type deleted")
      setDeleteId(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete")
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<LeaveType>[] = [
    {
      key: "code", header: "Code",
      render: (t) => (
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded ring-1 ring-border" style={{ background: t.color }} />
          <span className="font-mono text-xs font-semibold">{t.code}</span>
        </div>
      ),
    },
    { key: "name", header: "Name", render: (t) => <span className="font-medium">{t.name}</span> },
    {
      key: "paid", header: "Paid",
      render: (t) => (
        <Badge variant="outline" className={cn("text-[11px]", t.isPaid ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
          {t.isPaid ? "Paid" : "Unpaid"}
        </Badge>
      ),
    },
    { key: "yearlyAccrual", header: "Yearly Accrual", render: (t) => <span className="tabular-nums">{t.yearlyAccrual}d</span> },
    { key: "carryForward", header: "Carry Fwd", render: (t) => <span>{t.carryForward ? "Yes" : "No"}</span> },
    { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} /> },
    {
      key: "actions", header: "", className: "text-right",
      render: (t) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditing(t); setOpen(true) }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10" onClick={() => setDeleteId(t.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-2">
      <ListToolbar
        search={search}
        onSearch={setSearch}
        onAdd={() => { setEditing(null); setOpen(true) }}
        addLabel="Add Leave Type"
      />

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        emptyState={
          <EmptyState
            icon={CalendarDays}
            title="No leave types configured"
            description="Create leave types like Casual, Sick, Earned, etc."
            action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Leave Type</Button>}
          />
        }
      />

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Leave Type" : "Add Leave Type"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the configuration of this leave type." : "Configure a new leave type with accrual and rules."}
            </DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={leaveTypeFormSchema}
            initialValues={editing || {}}
            onSubmit={handleSubmit}
            onCancel={() => { setOpen(false); setEditing(null) }}
            submitLabel={editing ? "Update" : "Create"}
            loading={submitting}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Leave Type?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Existing applications referencing this leave type may be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={submitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Policies Tab (lightweight)
// ============================================================

function PoliciesTab() {
  const [items, setItems] = React.useState<LeavePolicy[]>([])
  const [leaveTypes, setLeaveTypes] = React.useState<LeaveType[]>([])
  const [loading, setLoading] = React.useState(true)
  const [open, setOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [form, setForm] = React.useState({ name: "", code: "", description: "" })
  const [allocations, setAllocations] = React.useState<Record<string, string>>({})

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, ltRes] = await Promise.all([
        fetch("/api/leave-policies"),
        fetch("/api/leave-types"),
      ])
      const pData = await pRes.json()
      const ltData = await ltRes.json()
      setItems(pData?.items || [])
      setLeaveTypes(ltData?.items || [])
    } catch {
      toast.error("Failed to load policies")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  async function handleSubmit() {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and code are required")
      return
    }
    setSubmitting(true)
    try {
      const itemsPayload = leaveTypes
        .filter((lt) => allocations[lt.id] && Number(allocations[lt.id]) > 0)
        .map((lt) => ({ leaveTypeId: lt.id, allocation: Number(allocations[lt.id]) }))
      const res = await fetch("/api/leave-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, items: itemsPayload }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to create policy")
      }
      toast.success("Leave policy created")
      setOpen(false)
      setForm({ name: "", code: "", description: "" })
      setAllocations({})
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to create policy")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Policy</Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No leave policies"
          description="Create a policy that bundles leave types with allocation rules."
          action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Policy</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <SectionCard
                title={p.name}
                description={p.code}
                action={<StatusBadge status={p.status} />}
              >
                {p.description && <p className="text-sm text-muted-foreground mb-3">{p.description}</p>}
                {p.items && p.items.length > 0 ? (
                  <div className="space-y-1.5">
                    {p.items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.leaveType.color }} />
                          <span>{it.leaveType.name}</span>
                        </div>
                        <Badge variant="outline" className="text-[11px] tabular-nums">{it.allocation}d</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No leave type allocations</p>
                )}
              </SectionCard>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Leave Policy</DialogTitle>
            <DialogDescription>Define a policy and map leave types with allocations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-name">Name <span className="text-destructive">*</span></Label>
                <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Standard Leave Policy" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-code">Code <span className="text-destructive">*</span></Label>
                <Input id="p-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="STD-LP-2025" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Applies to all full-time employees..." />
            </div>
            <div className="space-y-1.5">
              <Label>Leave Type Allocations (days / year)</Label>
              <div className="rounded-lg border border-border/60 divide-y divide-border/60 max-h-60 overflow-y-auto">
                {leaveTypes.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">No leave types configured</div>
                ) : leaveTypes.map((lt) => (
                  <div key={lt.id} className="flex items-center justify-between p-2.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: lt.color }} />
                      <span className="text-sm truncate">{lt.name}</span>
                      <span className="text-xs text-muted-foreground">({lt.code})</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={allocations[lt.id] || ""}
                      onChange={(e) => setAllocations({ ...allocations, [lt.id]: e.target.value })}
                      className="h-8 w-20 text-right"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creating..." : "Create Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
