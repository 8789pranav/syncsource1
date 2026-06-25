'use client'

import * as React from "react"
import { toast } from "sonner"
import { Sliders, Plus, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Column, DataTable, EmptyState, ListToolbar, StatusBadge } from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { leaveAdjustmentFormSchema } from "@/lib/form-schemas"
import {
  fetchJson, sendJson, useAsync, empName, empInitials, fmtDate, fmtDateTime, toNum,
  LeaveAdjustment,
} from "../shared"

export function AdjustmentSection() {
  const [search, setSearch] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [del, setDel] = React.useState<LeaveAdjustment | null>(null)
  const [view, setView] = React.useState<LeaveAdjustment | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const { data, loading, reload } = useAsync<LeaveAdjustment[]>(
    () => fetchJson("/api/leave-adjustments").catch(() => []),
    [],
  )

  const filtered = (data || []).filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return empName(a.employee).toLowerCase().includes(q) || (a.leaveType?.name || "").toLowerCase().includes(q) || (a.reason || "").toLowerCase().includes(q)
  })

  async function submitCreate(v: any) {
    setSubmitting(true)
    try {
      await sendJson("/api/leave-adjustments", v)
      toast.success("Adjustment created")
      setCreateOpen(false); reload()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to create") }
    finally { setSubmitting(false) }
  }

  async function confirmDelete() {
    if (!del) return
    setSubmitting(true)
    try {
      await sendJson(`/api/leave-adjustments/${del.id}`, {}, "DELETE")
      toast.success("Adjustment deleted (ledger reversed)")
      setDel(null); reload()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete") }
    finally { setSubmitting(false) }
  }

  const columns: Column<LeaveAdjustment>[] = [
    {
      key: "emp", header: "Employee", className: "min-w-[180px]",
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
      key: "lt", header: "Leave Type",
      render: (a) => (
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.leaveType?.color || "#10b981" }} />
          <span className="text-sm">{a.leaveType?.name || "—"}</span>
        </div>
      ),
    },
    {
      key: "type", header: "Type",
      render: (a) => (
        <Badge variant="secondary" className={`text-[10px] border-0 ${a.adjustmentType === "Credit" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"}`}>
          {a.adjustmentType}
        </Badge>
      ),
    },
    {
      key: "amt", header: "Amount",
      render: (a) => <span className={`tabular-nums font-medium ${a.adjustmentType === "Credit" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
        {a.adjustmentType === "Credit" ? "+" : "−"}{toNum(a.amount).toFixed(1)}
      </span>,
    },
    { key: "eff", header: "Effective", render: (a) => <span className="text-sm">{fmtDate(a.effectiveDate)}</span> },
    { key: "reason", header: "Reason", render: (a) => <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{a.reason || "—"}</span> },
    { key: "by", header: "Created By", render: (a) => <span className="text-xs text-muted-foreground">{a.createdBy || "—"}</span> },
    {
      key: "actions", header: "", width: "100px",
      render: (a) => (
        <div className="flex items-center gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setView(a)}><Eye className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500" onClick={() => setDel(a)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Leave Adjustment</h2>
        <p className="text-sm text-muted-foreground">Manual balance credits/debits. Deleting an adjustment reverses the ledger entry.</p>
      </div>

      <ListToolbar
        search={search}
        onSearch={setSearch}
        onAdd={() => setCreateOpen(true)}
        addLabel="New Adjustment"
      />

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        emptyState={<EmptyState icon={Sliders} title="No adjustments" description="Create a manual adjustment to credit or debit leave balance." action={<Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Adjustment</Button>} />}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-500" /> New Leave Adjustment</DialogTitle>
            <DialogDescription>Manually credit or debit an employee&apos;s leave balance.</DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={leaveAdjustmentFormSchema}
            initialValues={{}}
            onSubmit={submitCreate}
            onCancel={() => setCreateOpen(false)}
            submitLabel="Create Adjustment"
            loading={submitting}
            layout="flat"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjustment Details</DialogTitle>
            <DialogDescription>Created on {fmtDateTime(view?.createdAt)}</DialogDescription>
          </DialogHeader>
          {view && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <KV k="Employee" v={empName(view.employee)} />
              <KV k="Leave Type" v={view.leaveType?.name || "—"} />
              <KV k="Type" v={view.adjustmentType} />
              <KV k="Amount" v={`${toNum(view.amount).toFixed(1)} days`} />
              <KV k="Effective" v={fmtDate(view.effectiveDate)} />
              <KV k="Created By" v={view.createdBy || "—"} />
              {view.reason && <div className="col-span-2"><KV k="Reason" v={view.reason} /></div>}
              {view.remarks && <div className="col-span-2"><KV k="Remarks" v={view.remarks} /></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-rose-500" /> Delete Adjustment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse the ledger entry for <b>{empName(del?.employee)}</b> ({del?.adjustmentType} {toNum(del?.amount).toFixed(1)}d).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={submitting} className="bg-rose-600 hover:bg-rose-700">
              {submitting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
