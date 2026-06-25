'use client'

import * as React from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import {
  Inbox, Check, X, Eye, CheckCheck, Ban, XCircle, Search,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Column, DataTable, EmptyState, ListToolbar, SectionCard, StatusBadge } from "@/components/hrms/ui"
import {
  fetchJson, sendJson, useAsync, empName, empInitials, fmtDate, fmtDateTime,
  LeaveApplication,
} from "../shared"
import { ApplicationDetails } from "./my-leave"

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "Withdrawn", label: "Withdrawn" },
  { value: "PartiallyApproved", label: "Partially Approved" },
]

export function RequestsSection() {
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  const { data: apps, loading, reload } = useAsync<LeaveApplication[]>(
    () => fetchJson(`/api/leave-applications?status=${status === "all" ? "" : status}`),
    [status],
  )

  const [decision, setDecision] = React.useState<{ app: LeaveApplication; action: "Approved" | "Rejected" } | null>(null)
  const [comment, setComment] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [viewApp, setViewApp] = React.useState<LeaveApplication | null>(null)
  const [bulkAction, setBulkAction] = React.useState<"approve" | "reject" | "cancel" | null>(null)

  const filtered = (apps || []).filter((a) => {
    if (!search) return true
    const n = empName(a.employee).toLowerCase()
    const lt = (a.leaveType?.name || "").toLowerCase()
    return n.includes(search.toLowerCase()) || lt.includes(search.toLowerCase())
  })

  async function submitDecision() {
    if (!decision) return
    setSubmitting(true)
    try {
      await sendJson(`/api/leave-applications/${decision.app.id}`, {
        status: decision.action, action: decision.action === "Approved" ? "Approve" : "Reject",
        comment, decisionComment: comment,
      }, "PATCH")
      toast.success(`Leave ${decision.action.toLowerCase()}`)
      setDecision(null); setComment("")
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setSubmitting(false)
    }
  }

  async function submitBulk() {
    if (!bulkAction || selectedIds.size === 0) return
    setSubmitting(true)
    try {
      const actionMap = { approve: "approve", reject: "reject", cancel: "cancel" } as const
      const res = await sendJson<{ updated: number; errors: any[] }>(
        "/api/leave-bulk",
        { action: actionMap[bulkAction], ids: Array.from(selectedIds), reason: comment },
      )
      toast.success(`Bulk ${bulkAction}: ${res.updated || 0} updated`)
      setBulkAction(null); setComment(""); setSelectedIds(new Set())
      reload()
    } catch (e) {
      // Fallback: do them one-by-one
      if (bulkAction === "approve" || bulkAction === "reject") {
        const status = bulkAction === "approve" ? "Approved" : "Rejected"
        let ok = 0, fail = 0
        for (const id of selectedIds) {
          try {
            await sendJson(`/api/leave-applications/${id}`, { status, action: bulkAction === "approve" ? "Approve" : "Reject", decisionComment: comment }, "PATCH")
            ok++
          } catch { fail++ }
        }
        toast.success(`${ok} ${bulkAction}d${fail ? `, ${fail} failed` : ""}`)
        setBulkAction(null); setComment(""); setSelectedIds(new Set())
        reload()
      } else {
        toast.error(e instanceof Error ? e.message : "Bulk API not available")
      }
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
            {empInitials(a.employee)}
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
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: a.leaveType?.color || "#10b981" }} />
          <div>
            <p className="font-medium">{a.leaveType?.name || "—"}</p>
            <p className="text-xs text-muted-foreground">{a.leaveType?.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: "dates", header: "Dates",
      render: (a) => (
        <div>
          <p className="font-medium text-sm">{fmtDate(a.fromDate)}</p>
          <p className="text-xs text-muted-foreground">→ {fmtDate(a.toDate)}</p>
        </div>
      ),
    },
    { key: "days", header: "Days", render: (a) => <span className="tabular-nums">{a.days}{a.halfDay ? " (½)" : ""}</span> },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
    {
      key: "approvals", header: "Approvals",
      render: (a) => {
        const aps = a.approvals || []
        if (!aps.length) return <span className="text-xs text-muted-foreground">—</span>
        return (
          <div className="flex items-center gap-1">
            {aps.map((ap) => (
              <span
                key={ap.id}
                title={`Step ${ap.stepOrder}: ${ap.action}`}
                className={`h-2 w-2 rounded-full ${ap.action === "Approve" ? "bg-emerald-500" : ap.action === "Reject" ? "bg-rose-500" : "bg-amber-500"}`}
              />
            ))}
          </div>
        )
      },
    },
    { key: "applied", header: "Applied", render: (a) => <span className="text-xs text-muted-foreground">{fmtDate(a.appliedAt)}</span> },
    {
      key: "actions", header: "", width: "180px",
      render: (a) => (
        <div className="flex items-center gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setViewApp(a)} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          {a.status === "Pending" && (
            <>
              <Button size="sm" variant="outline" className="h-8 text-rose-600 hover:text-rose-700" onClick={() => setDecision({ app: a, action: "Rejected" })}>
                <X className="h-3.5 w-3.5" /> Reject
              </Button>
              <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => setDecision({ app: a, action: "Approved" })}>
                <Check className="h-3.5 w-3.5" /> Approve
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Leave Requests</h2>
        <p className="text-sm text-muted-foreground">All leave applications across the organisation. Select rows to perform bulk actions.</p>
      </div>

      <ListToolbar
        search={search}
        onSearch={setSearch}
        extra={
          <Select value={status} onValueChange={(v) => { setStatus(v); setSelectedIds(new Set()) }}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50/95 dark:bg-emerald-950/40 backdrop-blur px-3 py-2 shadow-soft"
          >
            <Badge className="bg-emerald-600 text-primary-foreground">{selectedIds.size} selected</Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">Bulk actions:</span>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-emerald-700 dark:text-emerald-400" onClick={() => setBulkAction("approve")}>
              <CheckCheck className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-rose-600" onClick={() => setBulkAction("reject")}>
              <XCircle className="h-3.5 w-3.5" /> Reject
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setBulkAction("cancel")}>
              <Ban className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button size="sm" variant="ghost" className="h-8 ml-auto" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        emptyState={<EmptyState icon={Inbox} title="No leave requests" description="No applications match your filters." />}
      />

      {/* Single decision */}
      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {decision?.action === "Approved" ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-rose-600" />}
              {decision?.action === "Approved" ? "Approve" : "Reject"} Leave
            </DialogTitle>
            <DialogDescription>
              {decision && (
                <>
                  {empName(decision.app.employee)} · {decision.app.leaveType?.name} · {fmtDate(decision.app.fromDate)} → {fmtDate(decision.app.toDate)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="c">Comment {decision?.action === "Rejected" && <span className="text-rose-500">*</span>}</Label>
            <Textarea id="c" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Optional comment for the employee…" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDecision(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={submitting || (decision?.action === "Rejected" && !comment.trim())}
              onClick={submitDecision}
              className={decision?.action === "Approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
            >
              {submitting ? "Saving…" : decision?.action === "Approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk decision */}
      <Dialog open={!!bulkAction} onOpenChange={(o) => !o && setBulkAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkAction === "approve" && <CheckCheck className="h-5 w-5 text-emerald-600" />}
              {bulkAction === "reject" && <XCircle className="h-5 w-5 text-rose-600" />}
              {bulkAction === "cancel" && <Ban className="h-5 w-5 text-slate-600" />}
              Bulk {bulkAction} · {selectedIds.size} request(s)
            </DialogTitle>
            <DialogDescription>
              This action will be applied to all selected leave requests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bc">Reason / Comment</Label>
            <Textarea id="bc" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Optional reason…" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkAction(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={submitting}
              onClick={submitBulk}
              className={bulkAction === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : bulkAction === "reject" ? "bg-rose-600 hover:bg-rose-700" : ""}
            >
              {submitting ? "Processing…" : `Bulk ${bulkAction}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View sheet */}
      <Sheet open={!!viewApp} onOpenChange={(o) => !o && setViewApp(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Application Details</SheetTitle>
            <SheetDescription>Submitted on {fmtDateTime(viewApp?.appliedAt)}</SheetDescription>
          </SheetHeader>
          {viewApp && <ApplicationDetails app={viewApp} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}
