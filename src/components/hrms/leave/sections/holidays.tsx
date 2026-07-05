'use client'

import * as React from "react"
import { toast } from "sonner"
import { CalendarHeart, Plus, Pencil, Trash2, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Column, DataTable, EmptyState, ListToolbar, StatusBadge } from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { holidayFormSchema } from "@/lib/form-schemas"
import {
  fetchJson, sendJson, useAsync, fmtDate, Holiday,
} from "../shared"

const TYPE_COLOR: Record<string, string> = {
  National: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Regional: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Optional: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Restricted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
}

export function HolidaysSection() {
  const year = new Date().getFullYear()
  const [yearF, setYearF] = React.useState<string>(String(year))
  const [search, setSearch] = React.useState("")
  const [edit, setEdit] = React.useState<Holiday | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [del, setDel] = React.useState<Holiday | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const { data, loading, reload } = useAsync<Holiday[]>(
    () => fetchJson("/api/holidays").catch(() => [] as Holiday[]),
    [],
  )

  const filtered = (data || []).filter((h) => {
    try {
      const y = new Date(h.date as string).getFullYear()
      if (y !== Number(yearF)) return false
    } catch { /* skip */ }
    if (!search) return true
    const q = search.toLowerCase()
    return h.name.toLowerCase().includes(q) || (h.country || "").toLowerCase().includes(q) || (h.state || "").toLowerCase().includes(q)
  }).sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime())

  async function submitCreate(v: any) {
    setSubmitting(true)
    try {
      await sendJson("/api/holidays", v)
      toast.success("Holiday created")
      setCreateOpen(false); reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create")
    } finally { setSubmitting(false) }
  }
  async function submitEdit(v: any) {
    if (!edit) return
    setSubmitting(true)
    try {
      await sendJson(`/api/holidays/${edit.id}`, v, "PATCH")
      toast.success("Holiday updated")
      setEdit(null); reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update")
    } finally { setSubmitting(false) }
  }
  async function confirmDelete() {
    if (!del) return
    setSubmitting(true)
    try {
      await sendJson(`/api/holidays/${del.id}`, {}, "DELETE")
      toast.success("Holiday deleted")
      setDel(null); reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete")
    } finally { setSubmitting(false) }
  }

  const columns: Column<Holiday>[] = [
    {
      key: "name", header: "Holiday Name", className: "min-w-[220px]",
      render: (h) => (
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <CalendarHeart className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-sm">{h.name}</p>
            {h.description && <p className="text-xs text-muted-foreground truncate max-w-[260px]">{h.description}</p>}
          </div>
        </div>
      ),
    },
    { key: "date", header: "Date", render: (h) => <span className="text-sm font-medium">{fmtDate(h.date)}</span> },
    {
      key: "type", header: "Type",
      render: (h) => <Badge variant="secondary" className={`text-[10px] border-0 ${TYPE_COLOR[h.type] || "bg-muted"}`}>{h.type}</Badge>,
    },
    { key: "country", header: "Country", render: (h) => <span className="text-sm">{h.country || "—"}</span> },
    { key: "state", header: "State", render: (h) => <span className="text-sm flex items-center gap-1">{h.state ? <><MapPin className="h-3 w-3 text-muted-foreground" /> {h.state}</> : "—"}</span> },
    {
      key: "actions", header: "", width: "120px",
      render: (h) => (
        <div className="flex items-center gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEdit(h)}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500" onClick={() => setDel(h)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Holiday Calendar</h2>
        <p className="text-sm text-muted-foreground">National, regional, optional and restricted holidays for the year.</p>
      </div>

      <ListToolbar
        search={search}
        onSearch={setSearch}
        onAdd={() => setCreateOpen(true)}
        addLabel="Add Holiday"
        extra={
          <Select value={yearF} onValueChange={setYearF}>
            <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[year - 1, year, year + 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        emptyState={<EmptyState icon={CalendarHeart} title="No holidays" description="Add a holiday for the selected year." action={<Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add Holiday</Button>} />}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-500" /> Add Holiday</DialogTitle>
            <DialogDescription>Define a holiday that affects leave calculations.</DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={holidayFormSchema}
            initialValues={{}}
            onSubmit={submitCreate}
            onCancel={() => setCreateOpen(false)}
            submitLabel="Create Holiday"
            loading={submitting}
            layout="flat"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-emerald-500" /> Edit Holiday</DialogTitle>
            <DialogDescription>{edit?.name}</DialogDescription>
          </DialogHeader>
          {edit && (
            <DynamicForm
              schema={holidayFormSchema}
              initialValues={edit as any}
              onSubmit={submitEdit}
              onCancel={() => setEdit(null)}
              submitLabel="Save Changes"
              loading={submitting}
              layout="flat"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-rose-500" /> Delete Holiday?</AlertDialogTitle>
            <AlertDialogDescription>Permanently delete <b>{del?.name}</b>?</AlertDialogDescription>
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
