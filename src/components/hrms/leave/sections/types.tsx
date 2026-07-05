'use client'

import * as React from "react"
import { toast } from "sonner"
import { CalendarDays, Plus, Pencil, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Column, DataTable, EmptyState, ListToolbar, SectionCard } from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { leaveTypeFormSchema } from "@/lib/form-schemas"
import {
  fetchJson, sendJson, useAsync, toNum, toBool, fmtDate,
  LeaveTypeLite,
} from "../shared"

export function TypesSection() {
  const [search, setSearch] = React.useState("")
  const [edit, setEdit] = React.useState<LeaveTypeLite | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [view, setView] = React.useState<LeaveTypeLite | null>(null)
  const [del, setDel] = React.useState<LeaveTypeLite | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const { data, loading, reload } = useAsync<LeaveTypeLite[]>(
    () => fetchJson("/api/leave-types").catch(() => [] as LeaveTypeLite[]),
    [],
  )

  const filtered = (data || []).filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q)
  }).sort((a, b) => (a.displayOrder as number || 0) - (b.displayOrder as number || 0))

  async function submitCreate(v: any) {
    setSubmitting(true)
    try {
      await sendJson("/api/leave-types", normalizePayload(v))
      toast.success("Leave type created")
      setCreateOpen(false); reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create")
    } finally {
      setSubmitting(false)
    }
  }

  async function submitEdit(v: any) {
    if (!edit) return
    setSubmitting(true)
    try {
      await sendJson(`/api/leave-types/${edit.id}`, normalizePayload(v), "PATCH")
      toast.success("Leave type updated")
      setEdit(null); reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!del) return
    setSubmitting(true)
    try {
      await sendJson(`/api/leave-types/${del.id}`, {}, "DELETE")
      toast.success("Leave type deleted")
      setDel(null); reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete")
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<LeaveTypeLite>[] = [
    {
      key: "code", header: "Code",
      render: (t) => (
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded shrink-0" style={{ background: t.color || "#10b981" }} />
          <div>
            <p className="font-mono text-xs font-semibold">{t.code}</p>
            <p className="text-[10px] text-muted-foreground">{typeof t.icon === "string" && t.icon ? t.icon : "CalendarDays"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "name", header: "Name", className: "min-w-[200px]",
      render: (t) => (
        <div>
          <p className="font-medium text-sm">{t.name}</p>
          {typeof t.description === "string" && t.description ? <p className="text-xs text-muted-foreground truncate max-w-[260px]">{t.description}</p> : null}
        </div>
      ),
    },
    { key: "cat", header: "Category", render: (t) => <Badge variant="secondary" className="text-[10px] border-0 bg-muted text-muted-foreground">{t.category || "—"}</Badge> },
    { key: "paid", header: "Paid", render: (t) => <span className="text-xs">{toBool(t.isPaid) ? "✓" : "✗"}</span> },
    { key: "unit", header: "Unit", render: (t) => <span className="text-xs">{t.leaveUnit || "FullDay"}</span> },
    { key: "accrual", header: "Yearly Accrual", render: (t) => <span className="tabular-nums text-sm">{toNum(t.yearlyAccrual)}</span> },
    { key: "cf", header: "Carry Fwd", render: (t) => <span className="text-xs">{toBool(t.carryForward) ? "✓" : "✗"}</span> },
    { key: "enc", header: "Encash", render: (t) => <span className="text-xs">{toBool(t.encashment) ? "✓" : "✗"}</span> },
    {
      key: "cs", header: "Club/Sand", className: "min-w-[110px]",
      render: (t) => {
        const club = toBool(t.allowClubbing)
        const sand = toBool((t as any).sandwichRule)
        return (
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className={`text-[9px] border-0 ${club ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>Club {club ? "On" : "Off"}</Badge>
            <Badge variant="secondary" className={`text-[9px] border-0 ${sand ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>Sand {sand ? "On" : "Off"}</Badge>
          </div>
        )
      },
    },
    { key: "status", header: "Status", render: (t) => <Badge variant="secondary" className={`text-[10px] border-0 ${t.status === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>{t.status || "Active"}</Badge> },
    {
      key: "actions", header: "", width: "120px",
      render: (t) => (
        <div className="flex items-center gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setView(t)}><Eye className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEdit(t)}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500" onClick={() => setDel(t)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Leave Types</h2>
        <p className="text-sm text-muted-foreground">Master configuration for every kind of leave your organisation offers.</p>
      </div>

      <ListToolbar
        search={search}
        onSearch={setSearch}
        onAdd={() => setCreateOpen(true)}
        addLabel="Add Leave Type"
      />

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        emptyState={<EmptyState icon={CalendarDays} title="No leave types" description="Add a leave type to get started." action={<Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add Leave Type</Button>} />}
      />

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-500" /> Add Leave Type</DialogTitle>
            <DialogDescription>Configure identity, classification, eligibility, accrual and rules.</DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={leaveTypeFormSchema}
            initialValues={{}}
            onSubmit={submitCreate}
            onCancel={() => setCreateOpen(false)}
            submitLabel="Create Leave Type"
            loading={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-emerald-500" /> Edit Leave Type</DialogTitle>
            <DialogDescription>{edit?.name} ({edit?.code})</DialogDescription>
          </DialogHeader>
          {edit && (
            <DynamicForm
              schema={leaveTypeFormSchema}
              initialValues={edit as any}
              onSubmit={submitEdit}
              onCancel={() => setEdit(null)}
              submitLabel="Save Changes"
              loading={submitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View */}
      <Sheet open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-emerald-500" /> {view?.name}</SheetTitle>
            <SheetDescription>{view?.code} · {view?.category}</SheetDescription>
          </SheetHeader>
          {view && <TypeDetails t={view} />}
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-rose-500" /> Delete Leave Type?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <b>{del?.name}</b> ({del?.code}). Existing applications and ledger entries will remain but new applications of this type cannot be created.
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

function normalizePayload(v: any): any {
  const out: any = { ...v }
  // Ensure numeric fields are numbers
  for (const k of ["yearlyAccrual", "monthlyAccrual", "openingBalance", "carryForwardLimit", "encashmentLimit", "attachmentThresholdDays", "minDays", "maxDays", "maxContinuous", "backdatedLimit", "futureLimit", "advanceNotice", "displayOrder"]) {
    if (out[k] !== undefined && out[k] !== "") out[k] = Number(out[k])
  }
  return out
}

function TypeDetails({ t }: { t: LeaveTypeLite }) {
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Code", value: <span className="font-mono">{t.code}</span> },
    { label: "Name", value: t.name },
    { label: "Category", value: t.category || "—" },
    { label: "Paid", value: toBool(t.isPaid) ? "Yes" : "No" },
    { label: "Paid Type", value: (t as any).paidType || "—" },
    { label: "Leave Unit", value: t.leaveUnit || "—" },
    { label: "Payroll Impact", value: (t as any).payrollImpact || "—" },
    { label: "Attendance Impact", value: (t as any).attendanceImpact || "—" },
    { label: "Yearly Accrual", value: toNum(t.yearlyAccrual) },
    { label: "Monthly Accrual", value: toNum((t as any).monthlyAccrual) },
    { label: "Opening Balance", value: toNum((t as any).openingBalance) },
    { label: "Carry Forward", value: toBool(t.carryForward) ? "Yes" : "No" },
    { label: "Carry Fwd Limit", value: (t as any).carryForwardLimit ?? "—" },
    { label: "Encashment", value: toBool(t.encashment) ? "Yes" : "No" },
    { label: "Encashment Limit", value: (t as any).encashmentLimit ?? "—" },
    { label: "Allow Clubbing", value: toBool((t as any).allowClubbing) ? "Yes" : "No" },
    { label: "Clubbing With", value: (t as any).clubbingWith || "All types" },
    { label: "Sandwich Rule", value: toBool((t as any).sandwichRule) ? "Yes" : "No" },
    { label: "Sandwich: Weekly Offs", value: toBool((t as any).sandwichIncludeWeeklyOff) ? "Included" : "Excluded" },
    { label: "Sandwich: Holidays", value: toBool((t as any).sandwichIncludeHolidays) ? "Included" : "Excluded" },
    { label: "Gender", value: (t as any).genderApplicability || "All" },
    { label: "Marital", value: (t as any).maritalApplicability || "All" },
    { label: "Employment", value: (t as any).employmentApplicability || "All" },
    { label: "Full Day", value: toBool((t as any).fullDayAllowed) ? "✓" : "✗" },
    { label: "Half Day", value: toBool((t as any).halfDayAllowed) ? "✓" : "✗" },
    { label: "Hourly", value: toBool((t as any).hourlyAllowed) ? "✓" : "✗" },
    { label: "Quarter Day", value: toBool((t as any).quarterDayAllowed) ? "✓" : "✗" },
    { label: "Status", value: t.status || "Active" },
  ]
  return (
    <div className="p-4 space-y-1 text-sm">
      {typeof t.description === "string" && t.description ? (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1">Description</p>
          <p className="text-foreground">{t.description}</p>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 p-3">
        {rows.map((r) => (
          <div key={r.label}>
            <p className="text-xs text-muted-foreground">{r.label}</p>
            <p className="font-medium text-foreground">{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
