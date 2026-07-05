'use client'

import * as React from "react"
import { toast } from "sonner"
import { Banknote, Plus, Check, X, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Column, DataTable, EmptyState, ListToolbar, SectionCard, StatusBadge } from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { encashmentFormSchema } from "@/lib/form-schemas"
import {
  fetchJson, sendJson, useAsync, empName, empInitials, fmtDate, fmtDateTime, toNum,
  LeaveEncashmentRequest, LeaveTypeLite,
} from "../shared"

export function EncashmentSection() {
  const [search, setSearch] = React.useState("")
  const [statusF, setStatusF] = React.useState<string>("all")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [decision, setDecision] = React.useState<{ req: LeaveEncashmentRequest; action: "Approve" | "Reject" } | null>(null)
  const [comment, setComment] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [view, setView] = React.useState<LeaveEncashmentRequest | null>(null)

  const { data, loading, reload } = useAsync<LeaveEncashmentRequest[]>(
    () => fetchJson(`/api/leave-encashments?status=${statusF === "all" ? "" : statusF}`).catch(() => []),
    [statusF],
  )

  const filtered = (data || []).filter((e) => {
    if (!search) return true
    const q = search.toLowerCase()
    return empName(e.employee).toLowerCase().includes(q) || (e.leaveType?.name || "").toLowerCase().includes(q)
  })

  async function submitCreate(v: any) {
    setSubmitting(true)
    try {
      await sendJson("/api/leave-encashments", v)
      toast.success("Encashment requested")
      setCreateOpen(false); reload()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to create") }
    finally { setSubmitting(false) }
  }

  async function submitDecision() {
    if (!decision) return
    setSubmitting(true)
    try {
      await sendJson(`/api/leave-encashments/${decision.req.id}`, { action: decision.action, comment }, "PATCH")
      toast.success(`Encashment ${decision.action.toLowerCase()}`)
      setDecision(null); setComment("")
      reload()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
    finally { setSubmitting(false) }
  }

  const columns: Column<LeaveEncashmentRequest>[] = [
    {
      key: "emp", header: "Employee", className: "min-w-[180px]",
      render: (e) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
            {empInitials(e.employee)}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{empName(e.employee)}</p>
            <p className="text-xs text-muted-foreground">{e.employee?.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "lt", header: "Leave Type",
      render: (e) => (
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.leaveType?.color || "#10b981" }} />
          <span className="text-sm">{e.leaveType?.name || "—"}</span>
        </div>
      ),
    },
    { key: "days", header: "Days", render: (e) => <span className="tabular-nums">{toNum(e.days).toFixed(1)}</span> },
    { key: "amt", header: "Amount", render: (e) => <span className="tabular-nums font-medium">₹{toNum(e.amount).toLocaleString()}</span> },
    { key: "pc", header: "Payroll Component", render: (e) => <span className="text-xs text-muted-foreground">{e.payrollComponent || "—"}</span> },
    { key: "status", header: "Status", render: (e) => <StatusBadge status={e.status} /> },
    { key: "req", header: "Requested", render: (e) => <span className="text-xs text-muted-foreground">{fmtDate(e.requestedAt)}</span> },
    {
      key: "actions", header: "", width: "180px",
      render: (e) => (
        <div className="flex items-center gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setView(e)}><Eye className="h-4 w-4" /></Button>
          {e.status === "Pending" && (
            <>
              <Button size="sm" variant="outline" className="h-8 text-rose-600" onClick={() => setDecision({ req: e, action: "Reject" })}>
                <X className="h-3.5 w-3.5" /> Reject
              </Button>
              <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => setDecision({ req: e, action: "Approve" })}>
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
        <h2 className="text-lg font-semibold text-foreground">Leave Encashment</h2>
        <p className="text-sm text-muted-foreground">Process leave encashment requests — convert leave days to payout.</p>
      </div>

      <ListToolbar
        search={search}
        onSearch={setSearch}
        onAdd={() => setCreateOpen(true)}
        addLabel="Request Encashment"
        extra={
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Processed">Processed</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        emptyState={<EmptyState icon={Banknote} title="No encashment requests" description="Submit an encashment request to get started." action={<Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Request Encashment</Button>} />}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-500" /> Request Encashment</DialogTitle>
            <DialogDescription>Convert leave days to a payout. The amount is calculated using the configured formula.</DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={encashmentFormSchema}
            initialValues={{}}
            onSubmit={submitCreate}
            onCancel={() => setCreateOpen(false)}
            submitLabel="Submit Request"
            loading={submitting}
            layout="flat"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {decision?.action === "Approve" ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-rose-600" />}
              {decision?.action} Encashment
            </DialogTitle>
            <DialogDescription>
              {decision && <>{empName(decision.req.employee)} · {decision.req.leaveType?.name} · {toNum(decision.req.days).toFixed(1)} days · ₹{toNum(decision.req.amount).toLocaleString()}</>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium">Comment</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Optional comment…" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDecision(null)}>Cancel</Button>
            <Button size="sm" onClick={submitDecision} disabled={submitting} className={decision?.action === "Approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}>
              {submitting ? "Saving…" : decision?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Encashment Details</DialogTitle>
            <DialogDescription>Requested on {fmtDateTime(view?.requestedAt)}</DialogDescription>
          </DialogHeader>
          {view && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <KV k="Employee" v={empName(view.employee)} />
              <KV k="Leave Type" v={view.leaveType?.name || "—"} />
              <KV k="Days" v={toNum(view.days).toFixed(1)} />
              <KV k="Amount" v={`₹${toNum(view.amount).toLocaleString()}`} />
              <KV k="Formula" v={view.formula || "—"} />
              <KV k="Payroll Component" v={view.payrollComponent || "—"} />
              <KV k="Status" v={<StatusBadge status={view.status} />} />
              <KV k="Decision By" v={view.decisionBy || "—"} />
              {view.decisionComment && <div className="col-span-2"><KV k="Comment" v={view.decisionComment} /></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{k}</p>
      <p className="font-medium text-foreground">{v || "—"}</p>
    </div>
  )
}
