"use client"

// ============================================================
// ExpensesTab — CRUD for EmployeeExpense.
//   • Stat strip: Total Claimed / Approved / Pending / Paid
//   • Table with status filter, approve/reject, mark paid
//   • Amount-by-category bar chart (Recharts)
// ------------------------------------------------------------
// API: /api/employees/[id]/expenses (+ /<recordId>)
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts"
import {
  Plus, Pencil, Trash2, RefreshCw, Loader2, Eye, Receipt, CheckCircle2, XCircle,
  IndianRupee, Wallet, Send, Clock, PiggyBank, X,
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
import { apiFetch } from "@/lib/api-client"

// ---------- types ----------

interface ExpenseRec {
  id: string
  category?: string | null
  amount: number
  currency: string
  expenseDate: string | Date
  description?: string | null
  billUrl?: string | null
  project?: string | null
  client?: string | null
  status: string
  paymentStatus?: string | null
  approvedBy?: string | null
  approvedAt?: string | Date | null
  paidAt?: string | Date | null
  remarks?: string | null
}

const CATEGORIES = ["Travel", "Food", "Stay", "Conveyance", "Mobile", "Internet", "Other"]
const STATUS_FILTERS = ["All", "Draft", "Submitted", "Approved", "Rejected", "Paid", "Cancelled"]

const CATEGORY_COLORS: Record<string, string> = {
  Travel: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Food: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Stay: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
  Conveyance: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Mobile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Internet: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Other: "bg-muted text-muted-foreground",
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  Submitted: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Cancelled: "bg-muted text-muted-foreground",
}

const CHART_COLORS = ["#10b981", "#06b6d4", "#f59e0b", "#d946ef", "#84cc16", "#14b8a6", "#94a3b8"]

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}
function inr(v: number) {
  return "₹" + Math.round(v).toLocaleString("en-IN")
}
function inrShort(v: number) {
  if (v >= 100000) return "₹" + (v / 100000).toFixed(2) + " L"
  if (v >= 1000) return "₹" + (v / 1000).toFixed(1) + "K"
  return "₹" + Math.round(v).toLocaleString("en-IN")
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground tabular-nums">{inr(Number(p.value))}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Component
// ============================================================

export default function ExpensesTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<ExpenseRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState<string>("All")
  const [search, setSearch] = React.useState("")
  const [editDialog, setEditDialog] = React.useState<{ open: boolean; target: ExpenseRec | null }>({ open: false, target: null })
  const [view, setView] = React.useState<ExpenseRec | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ExpenseRec | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/expenses`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load expenses")
      setItems(data?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load expenses")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  const stats = React.useMemo(() => {
    const totalClaimed = items.reduce((s, i) => s + (i.amount || 0), 0)
    const approved = items.filter((i) => i.status === "Approved" || i.status === "Paid").reduce((s, i) => s + (i.amount || 0), 0)
    const pending = items.filter((i) => i.status === "Submitted" || i.status === "Pending").reduce((s, i) => s + (i.amount || 0), 0)
    const paid = items.filter((i) => i.status === "Paid").reduce((s, i) => s + (i.amount || 0), 0)
    return { totalClaimed, approved, pending, paid }
  }, [items])

  const chartData = React.useMemo(() => {
    return CATEGORIES.map((cat) => ({
      name: cat,
      amount: items.filter((i) => i.category === cat).reduce((s, i) => s + (i.amount || 0), 0),
    })).filter((d) => d.amount > 0)
  }, [items])

  const filtered = items.filter((r) => {
    if (statusFilter !== "All" && r.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (r.description || "").toLowerCase().includes(q)
        || (r.category || "").toLowerCase().includes(q)
        || (r.project || "").toLowerCase().includes(q)
        || (r.client || "").toLowerCase().includes(q)
    }
    return true
  })

  async function patchStatus(rec: ExpenseRec, status: string, msg: string, extra?: Record<string, unknown>) {
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/expenses/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
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
      const res = await apiFetch(`/api/employees/${employeeId}/expenses/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      toast.success("Expense deleted")
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
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Expenses</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Submit, track and manage expense claims with approval and payment workflow.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setEditDialog({ open: true, target: null })}>
            <Plus className="h-4 w-4" /> Create Expense
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Claimed" value={inrShort(stats.totalClaimed)} icon={Wallet} accent="emerald" sub={inr(stats.totalClaimed)} />
        <StatCard label="Approved" value={inrShort(stats.approved)} icon={CheckCircle2} accent="cyan" sub={inr(stats.approved)} />
        <StatCard label="Pending" value={inrShort(stats.pending)} icon={Clock} accent="amber" sub={inr(stats.pending)} />
        <StatCard label="Paid" value={inrShort(stats.paid)} icon={PiggyBank} accent="emerald" sub={inr(stats.paid)} />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <SectionCard title="Amount by Category" description="Sum of all expense claims per category">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -8, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklch, var(--muted) 50%, transparent)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={(v) => inrShort(Number(v))} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "color-mix(in oklch, var(--muted) 60%, transparent)" }} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search description, category, project..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 sm:max-w-xs"
        />
        {(statusFilter !== "All" || search) && (
          <Button variant="ghost" size="sm" className="h-9 gap-1.5"
            onClick={() => { setStatusFilter("All"); setSearch("") }}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <SectionCard title="Expense Claims" description={`${filtered.length} of ${items.length} records`}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Receipt} title="No expense claims"
            description="Create a new expense to get started."
            action={<Button size="sm" onClick={() => setEditDialog({ open: true, target: null })}><Plus className="h-4 w-4 mr-1.5" /> Create Expense</Button>} />
        ) : (
          <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
            <ScrollArea className="max-h-[560px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project / Client</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Approved By</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setView(r)}>
                      <TableCell>
                        <Badge variant="secondary" className={cn("font-medium border-0", CATEGORY_COLORS[r.category || ""] || "bg-muted text-muted-foreground")}>
                          {r.category || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{inr(r.amount)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.expenseDate)}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[220px] truncate" title={r.description || ""}>{r.description || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.project || r.client ? (
                          <div className="text-xs">
                            {r.project && <div>{r.project}</div>}
                            {r.client && <div className="text-muted-foreground/70">{r.client}</div>}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[r.status] || "bg-muted text-muted-foreground")}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.paymentStatus ? (
                          <Badge variant="secondary" className={cn("font-medium border-0",
                            r.paymentStatus === "Paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                          )}>{r.paymentStatus}</Badge>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.approvedBy || "—"}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setView(r)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {r.status === "Draft" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-cyan-600 hover:bg-cyan-500/10"
                              onClick={() => patchStatus(r, "Submitted", "Expense submitted")}>
                              <Send className="h-3.5 w-3.5" /> Submit
                            </Button>
                          )}
                          {r.status === "Submitted" && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:bg-emerald-500/10"
                                onClick={() => patchStatus(r, "Approved", "Expense approved", { approvedBy: "HR Admin" })}>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-rose-600 hover:bg-rose-500/10"
                                onClick={() => patchStatus(r, "Rejected", "Expense rejected", { approvedBy: "HR Admin" })}>
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </>
                          )}
                          {r.status === "Approved" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:bg-emerald-500/10"
                              onClick={() => patchStatus(r, "Paid", "Expense marked paid")}>
                              <PiggyBank className="h-3.5 w-3.5" /> Mark Paid
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditDialog({ open: true, target: r })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10" onClick={() => setDeleteTarget(r)}>
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
      </SectionCard>

      {/* Edit / create dialog */}
      <ExpenseDialog
        open={editDialog.open}
        onOpenChange={(o) => setEditDialog({ open: o, target: null })}
        employeeId={employeeId}
        existing={editDialog.target}
        onSaved={load}
      />

      {/* View dialog */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {view?.category || "Expense"} · <span className="tabular-nums">{view ? inr(view.amount) : ""}</span>
              {view && (
                <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[view.status] || "bg-muted text-muted-foreground")}>
                  {view.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>{fmtDate(view?.expenseDate)}</DialogDescription>
          </DialogHeader>
          {view && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Project</p>
                  <p className="font-medium">{view.project || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="font-medium">{view.client || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Approved By</p>
                  <p className="font-medium">{view.approvedBy || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid At</p>
                  <p className="font-medium">{fmtDate(view.paidAt)}</p>
                </div>
              </div>
              {view.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{view.description}</p>
                </div>
              )}
              {view.billUrl && (
                <a href={view.billUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline">
                  <Receipt className="h-3 w-3" /> View bill / receipt
                </a>
              )}
              {view.remarks && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Remarks</p>
                  <p className="whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{view.remarks}</p>
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" className="gap-1.5" onClick={() => { setEditDialog({ open: true, target: view }); setView(null) }}>
                  <Pencil className="h-4 w-4" /> Edit
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
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deleteTarget?.category} expense of {deleteTarget ? inr(deleteTarget.amount) : ""}.
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
// Expense Dialog (Create / Edit)
// ============================================================

function ExpenseDialog({
  open, onOpenChange, employeeId, existing, onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  existing: ExpenseRec | null
  onSaved: () => void
}) {
  const isEdit = !!existing
  const [form, setForm] = React.useState({
    category: "Travel",
    amount: "",
    expenseDate: format(new Date(), "yyyy-MM-dd"),
    description: "",
    billUrl: "",
    project: "",
    client: "",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (existing) {
        setForm({
          category: existing.category || "Travel",
          amount: String(existing.amount || ""),
          expenseDate: existing.expenseDate ? format(new Date(existing.expenseDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
          description: existing.description || "",
          billUrl: existing.billUrl || "",
          project: existing.project || "",
          client: existing.client || "",
        })
      } else {
        setForm({
          category: "Travel", amount: "", expenseDate: format(new Date(), "yyyy-MM-dd"),
          description: "", billUrl: "", project: "", client: "",
        })
      }
    }
  }, [open, existing])

  async function handleSubmit() {
    if (!form.amount || Number(form.amount) <= 0) { toast.error("Valid amount is required"); return }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        category: form.category,
        amount: Number(form.amount),
        expenseDate: new Date(form.expenseDate).toISOString(),
        description: form.description || undefined,
        billUrl: form.billUrl || undefined,
        project: form.project || undefined,
        client: form.client || undefined,
      }
      const url = isEdit ? `/api/employees/${employeeId}/expenses/${existing!.id}` : `/api/employees/${employeeId}/expenses`
      const method = isEdit ? "PATCH" : "POST"
      const res = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to save expense")
      toast.success(isEdit ? "Expense updated" : "Expense created")
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to save expense")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Create Expense"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the expense details." : "Record a new expense claim. Created as Draft."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <Label>Amount <span className="text-rose-500">*</span></Label>
            <div className="relative">
              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input type="number" min={0} step="0.01" className="pl-8 tabular-nums"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Expense Date</Label>
            <Input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="Project name" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Client</Label>
            <Input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="Client name (optional)" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Expense details..." />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Bill URL</Label>
            <Input value={form.billUrl} onChange={(e) => setForm({ ...form, billUrl: e.target.value })} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
            {isEdit ? "Save Changes" : "Create Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
