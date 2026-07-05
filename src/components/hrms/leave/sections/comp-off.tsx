'use client'

import * as React from "react"
import { toast } from "sonner"
import { Coffee, Plus, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Column, DataTable, EmptyState, ListToolbar, SectionCard, StatusBadge } from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { compOffFormSchema } from "@/lib/form-schemas"
import {
  fetchJson, sendJson, useAsync, empName, empInitials, fmtDate, fmtDateTime, toNum,
  CompOffCredit,
} from "../shared"

const SOURCE_LABEL: Record<string, string> = {
  WeeklyOffWork: "Weekly Off Work",
  HolidayWork: "Holiday Work",
  Overtime: "Overtime",
  OnCall: "On Call",
  Manual: "Manual",
}

export function CompOffSection() {
  const [search, setSearch] = React.useState("")
  const [statusF, setStatusF] = React.useState<string>("all")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [del, setDel] = React.useState<CompOffCredit | null>(null)
  const [view, setView] = React.useState<CompOffCredit | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const { data, loading, reload } = useAsync<CompOffCredit[]>(
    () => fetchJson(`/api/comp-off?status=${statusF === "all" ? "" : statusF}`).catch(() => []),
    [statusF],
  )

  const filtered = (data || []).filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return empName(c.employee).toLowerCase().includes(q) || (c.source || "").toLowerCase().includes(q)
  })

  async function submitCreate(v: any) {
    setSubmitting(true)
    try {
      await sendJson("/api/comp-off", v)
      toast.success("Comp-off granted")
      setCreateOpen(false); reload()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to grant") }
    finally { setSubmitting(false) }
  }

  async function confirmDelete() {
    if (!del) return
    setSubmitting(true)
    try {
      await sendJson(`/api/comp-off/${del.id}`, {}, "DELETE")
      toast.success("Comp-off deleted")
      setDel(null); reload()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete") }
    finally { setSubmitting(false) }
  }

  const columns: Column<CompOffCredit>[] = [
    {
      key: "emp", header: "Employee", className: "min-w-[180px]",
      render: (c) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
            {empInitials(c.employee)}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{empName(c.employee)}</p>
            <p className="text-xs text-muted-foreground">{c.employee?.employeeCode}</p>
          </div>
        </div>
      ),
    },
    { key: "src", header: "Source", render: (c) => <Badge variant="secondary" className="text-[10px] border-0 bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400">{SOURCE_LABEL[c.source] || c.source}</Badge> },
    { key: "sd", header: "Source Date", render: (c) => <span className="text-sm">{fmtDate(c.sourceDate)}</span> },
    { key: "ed", header: "Earned", render: (c) => <span className="text-sm">{fmtDate(c.earnedDate)}</span> },
    { key: "hrs", header: "Hours", render: (c) => <span className="tabular-nums">{toNum(c.hours)}</span> },
    { key: "days", header: "Days", render: (c) => <span className="tabular-nums font-medium">{toNum(c.days).toFixed(1)}</span> },
    { key: "exp", header: "Expiry", render: (c) => <span className="text-xs text-muted-foreground">{fmtDate(c.expiryDate)}</span> },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    {
      key: "actions", header: "", width: "100px",
      render: (c) => (
        <div className="flex items-center gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setView(c)}><Eye className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500" onClick={() => setDel(c)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Comp-Off</h2>
        <p className="text-sm text-muted-foreground">Grant and track compensatory off credits earned by employees.</p>
      </div>

      <ListToolbar
        search={search}
        onSearch={setSearch}
        onAdd={() => setCreateOpen(true)}
        addLabel="Grant Comp-Off"
        extra={
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Used">Used</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        emptyState={<EmptyState icon={Coffee} title="No comp-off credits" description="Grant a comp-off to get started." action={<Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Grant Comp-Off</Button>} />}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-500" /> Grant Comp-Off</DialogTitle>
            <DialogDescription>Credit compensatory off to an employee for working on a holiday or weekly off.</DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={compOffFormSchema}
            initialValues={{}}
            onSubmit={submitCreate}
            onCancel={() => setCreateOpen(false)}
            submitLabel="Grant Comp-Off"
            loading={submitting}
            layout="flat"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Comp-Off Details</DialogTitle>
            <DialogDescription>Earned on {fmtDate(view?.earnedDate)}</DialogDescription>
          </DialogHeader>
          {view && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <KV k="Employee" v={empName(view.employee)} />
              <KV k="Source" v={SOURCE_LABEL[view.source] || view.source} />
              <KV k="Source Date" v={fmtDate(view.sourceDate)} />
              <KV k="Earned Date" v={fmtDate(view.earnedDate)} />
              <KV k="Hours" v={toNum(view.hours)} />
              <KV k="Days" v={toNum(view.days).toFixed(1)} />
              <KV k="Expiry" v={fmtDate(view.expiryDate)} />
              <KV k="Status" v={<StatusBadge status={view.status} />} />
              {view.approvedBy && <KV k="Approved By" v={view.approvedBy} />}
              {view.remarks && <div className="col-span-2"><KV k="Remarks" v={view.remarks} /></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-rose-500" /> Delete Comp-Off?</AlertDialogTitle>
            <AlertDialogDescription>Delete comp-off for <b>{empName(del?.employee)}</b>?</AlertDialogDescription>
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
