"use client"

// ============================================================
// PayrollModule — Phase 3 Payroll Management
// ------------------------------------------------------------
// Three tabs:
//   1. Salary Structures — define reusable CTC component templates
//   2. Payroll Runs — create monthly runs, process, approve, pay
//   3. Payslips — view individual payslips (filter by run/employee)
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Banknote, Wallet, FileText, Plus, Pencil, Trash2, Loader2, Play,
  CheckCircle2, Eye, Download, Search, TrendingUp, Users, Clock,
  ArrowRight, IndianRupee, FileSpreadsheet, ShieldCheck, Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  PageHeader, StatCard, SectionCard, EmptyState, StatusBadge,
} from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- helpers ----------
const fmtDate = (d?: string | Date | null) => {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return "—"
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}
function fmtCurrency(v?: number | null): string {
  if (v === undefined || v === null) return "—"
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v)
}
function fmtLakhs(v?: number | null): string {
  if (!v) return "—"
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`
  return fmtCurrency(v)
}

const runStatusColors: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  Processing: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Completed: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Paid: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

// ============================================================
// Main Module
// ============================================================
export function PayrollModule() {
  const [tab, setTab] = React.useState("structures")

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
  }

  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-5">
      <motion.div variants={itemVariants}>
        <PageHeader
          title="Payroll Management"
          description="Salary structures, monthly payroll runs, and payslip generation"
          icon={Banknote}
          badge={<Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">Phase 3</Badge>}
        />
      </motion.div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/40">
          <TabsTrigger value="structures" className="gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" /> Salary Structures</TabsTrigger>
          <TabsTrigger value="runs" className="gap-1.5"><Play className="h-3.5 w-3.5" /> Payroll Runs</TabsTrigger>
          <TabsTrigger value="payslips" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Payslips</TabsTrigger>
        </TabsList>

        <TabsContent value="structures" className="mt-4">
          <StructuresTab />
        </TabsContent>
        <TabsContent value="runs" className="mt-4">
          <RunsTab />
        </TabsContent>
        <TabsContent value="payslips" className="mt-4">
          <PayslipsTab />
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

// ============================================================
// Tab 1: Salary Structures
// ============================================================
function StructuresTab() {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<any | null>(null)
  const [form, setForm] = React.useState<Record<string, any>>({})
  const [saving, setSaving] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/salary-structures")
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setItems(data.items || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load salary structures")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const EMPTY = {
    code: "", name: "", description: "",
    basicPercent: 50, hraPercent: 20, specialAllowancePercent: 20,
    conveyanceAllowance: 1600, medicalAllowance: 1250, bonusAmount: 0,
    pfEmployerPercent: 12, esiEmployerPercent: 3.25,
    pfEmployeePercent: 12, esiEmployeePercent: 0.75,
    professionalTax: 200, tdsPercent: 0, status: "Active",
  }

  const openAdd = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true) }
  const openEdit = (s: any) => {
    setEditing(s)
    setForm({
      code: s.code, name: s.name, description: s.description || "",
      basicPercent: s.basicPercent, hraPercent: s.hraPercent, specialAllowancePercent: s.specialAllowancePercent,
      conveyanceAllowance: s.conveyanceAllowance, medicalAllowance: s.medicalAllowance, bonusAmount: s.bonusAmount,
      pfEmployerPercent: s.pfEmployerPercent, esiEmployerPercent: s.esiEmployerPercent,
      pfEmployeePercent: s.pfEmployeePercent, esiEmployeePercent: s.esiEmployeePercent,
      professionalTax: s.professionalTax, tdsPercent: s.tdsPercent, status: s.status,
    })
    setDialogOpen(true)
  }

  const onSave = async () => {
    if (!form.code.trim() || !form.name.trim()) { toast.error("Code and name are required"); return }
    setSaving(true)
    try {
      const url = editing ? `/api/salary-structures/${editing.id}` : "/api/salary-structures"
      const method = editing ? "PATCH" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.error || `Failed (${res.status})`)
      }
      toast.success(editing ? "Salary structure updated" : "Salary structure created")
      setDialogOpen(false)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/salary-structures/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Salary structure deleted")
      setDeleteId(null)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Salary Structures</h2>
          <p className="text-sm text-muted-foreground">Reusable CTC component templates with PF/ESI/TDS rules</p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5"><Plus className="h-4 w-4" /> Add Structure</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <SectionCard>
          <EmptyState icon={FileSpreadsheet} title="No salary structures yet" description="Create a salary structure template to assign CTC components to employees." action={<Button size="sm" onClick={openAdd} className="gap-1.5"><Plus className="h-4 w-4" /> Add Structure</Button>} />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((s) => (
            <motion.div key={s.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <div className="rounded-xl border border-border/60 bg-card shadow-soft hover:shadow-card transition-shadow p-5 flex flex-col h-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" onClick={() => setDeleteId(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{s.name}</h3>
                    <Badge variant="secondary" className="font-mono text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">{s.code}</Badge>
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <Comp label="Basic" value={`${s.basicPercent}%`} />
                  <Comp label="HRA" value={`${s.hraPercent}%`} />
                  <Comp label="Special" value={`${s.specialAllowancePercent}%`} />
                  <Comp label="Conveyance" value={fmtCurrency(s.conveyanceAllowance)} />
                  <Comp label="Medical" value={fmtCurrency(s.medicalAllowance)} />
                  <Comp label="PF (E/E)" value={`${s.pfEmployeePercent}/${s.pfEmployerPercent}%`} />
                  <Comp label="ESI (E/E)" value={`${s.esiEmployeePercent}/${s.esiEmployerPercent}%`} />
                  <Comp label="Prof Tax" value={fmtCurrency(s.professionalTax)} />
                </div>
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                  <Badge variant="secondary" className={cn("text-[10px]", s.status === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>{s.status}</Badge>
                  <span className="text-xs text-muted-foreground">{s._count?.assignments || 0} employees</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Salary Structure" : "Add Salary Structure"}</DialogTitle>
            <DialogDescription>{editing ? "Update the structure template." : "Define a reusable CTC component template."}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Code <span className="text-destructive">*</span></Label>
              <Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SS-STD" disabled={!!editing} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Standard Salary Structure" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="sm:col-span-2 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Earnings (as % of CTC)</p>
            </div>
            <NumField label="Basic (% of CTC)" value={form.basicPercent} onChange={(v) => setForm({ ...form, basicPercent: v })} />
            <NumField label="HRA (% of CTC)" value={form.hraPercent} onChange={(v) => setForm({ ...form, hraPercent: v })} />
            <NumField label="Special Allowance (% of CTC)" value={form.specialAllowancePercent} onChange={(v) => setForm({ ...form, specialAllowancePercent: v })} />
            <NumField label="Bonus (annual ₹)" value={form.bonusAmount} onChange={(v) => setForm({ ...form, bonusAmount: v })} />
            <NumField label="Conveyance (monthly ₹)" value={form.conveyanceAllowance} onChange={(v) => setForm({ ...form, conveyanceAllowance: v })} />
            <NumField label="Medical (monthly ₹)" value={form.medicalAllowance} onChange={(v) => setForm({ ...form, medicalAllowance: v })} />
            <div className="sm:col-span-2 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deductions & Contributions</p>
            </div>
            <NumField label="PF Employee (%)" value={form.pfEmployeePercent} onChange={(v) => setForm({ ...form, pfEmployeePercent: v })} />
            <NumField label="PF Employer (%)" value={form.pfEmployerPercent} onChange={(v) => setForm({ ...form, pfEmployerPercent: v })} />
            <NumField label="ESI Employee (%)" value={form.esiEmployeePercent} onChange={(v) => setForm({ ...form, esiEmployeePercent: v })} />
            <NumField label="ESI Employer (%)" value={form.esiEmployerPercent} onChange={(v) => setForm({ ...form, esiEmployerPercent: v })} />
            <NumField label="Professional Tax (₹)" value={form.professionalTax} onChange={(v) => setForm({ ...form, professionalTax: v })} />
            <NumField label="TDS (% of CTC)" value={form.tdsPercent} onChange={(v) => setForm({ ...form, tdsPercent: v })} />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={onSave} disabled={saving} className="min-w-24">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              {editing ? "Save Changes" : "Create Structure"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete salary structure?</AlertDialogTitle>
            <AlertDialogDescription>This will not affect existing salary assignments, but the structure cannot be reused.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// Tab 2: Payroll Runs
// ============================================================
function RunsTab() {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState<Record<string, any>>({})
  const [saving, setSaving] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [detailTarget, setDetailTarget] = React.useState<any | null>(null)
  const [detailData, setDetailData] = React.useState<any | null>(null)
  const [detailLoading, setDetailLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/payroll-runs")
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setItems(data.items || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load payroll runs")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const openDetail = async (r: any) => {
    setDetailTarget(r)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/payroll-runs/${r.id}`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setDetailData(data)
    } catch (e: any) {
      toast.error(e?.message || "Failed to load run details")
    } finally {
      setDetailLoading(false)
    }
  }

  const onCreate = async () => {
    const name = String(form.name || "").trim()
    const payPeriod = String(form.payPeriod || "").trim()
    if (!name) { toast.error("Name is required"); return }
    if (!payPeriod || !/^\d{4}-\d{2}$/.test(payPeriod)) { toast.error("Pay period must be YYYY-MM"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/payroll-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, payPeriod, payDate: form.payDate || undefined }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.error || `Failed (${res.status})`)
      }
      toast.success("Payroll run created")
      setDialogOpen(false)
      setForm({})
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to create run")
    } finally {
      setSaving(false)
    }
  }

  const onProcess = async (r: any) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/payroll-runs/${r.id}/process`, { method: "POST" })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.error || `Failed (${res.status})`)
      }
      const data = await res.json()
      toast.success(`Payroll processed — ${data.payslipsGenerated} payslips, net ${fmtCurrency(data.totalNet)}`)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to process")
    } finally {
      setSaving(false)
    }
  }

  const onApprove = async (r: any) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/payroll-runs/${r.id}/approve`, { method: "POST" })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.error || `Failed (${res.status})`)
      }
      toast.success("Payroll run approved")
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to approve")
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/payroll-runs/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Payroll run deleted")
      setDeleteId(null)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete")
    } finally {
      setSaving(false)
    }
  }

  // Default name + pay period = current month
  const now = new Date()
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const defaultName = `${now.toLocaleDateString("en-IN", { month: "long" })} ${now.getFullYear()} Payroll`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Payroll Runs</h2>
          <p className="text-sm text-muted-foreground">Create monthly runs, process payslips, approve & disburse</p>
        </div>
        <Button size="sm" onClick={() => { setForm({ name: defaultName, payPeriod: defaultPeriod, payDate: "" }); setDialogOpen(true) }} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Payroll Run
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : items.length === 0 ? (
        <SectionCard>
          <EmptyState icon={Play} title="No payroll runs yet" description="Create your first monthly payroll run to get started." action={<Button size="sm" onClick={() => { setForm({ name: defaultName, payPeriod: defaultPeriod, payDate: "" }); setDialogOpen(true) }} className="gap-1.5"><Plus className="h-4 w-4" /> New Payroll Run</Button>} />
        </SectionCard>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <motion.div key={r.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <div className="rounded-xl border border-border/60 bg-card shadow-soft hover:shadow-card transition-shadow p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl", r.status === "Paid" ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" : r.status === "Approved" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : r.status === "Completed" ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400")}>
                      <Banknote className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{r.name}</h3>
                        <Badge variant="secondary" className={cn("text-[10px] font-mono", runStatusColors[r.status] || "bg-muted text-muted-foreground")}>{r.status}</Badge>
                        <Badge variant="secondary" className="text-[10px] font-mono bg-muted text-muted-foreground">{r.code}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Period: {r.payPeriod} · {fmtDate(r.payPeriodStart)} → {fmtDate(r.payPeriodEnd)}
                      </p>
                      <p className="text-xs text-muted-foreground">Pay date: {fmtDate(r.payDate)} · {r._count?.payslips || 0} payslips</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {r.status === "Draft" && (
                      <Button size="sm" variant="outline" onClick={() => onProcess(r)} disabled={saving} className="gap-1.5">
                        <Play className="h-3.5 w-3.5" /> Process
                      </Button>
                    )}
                    {r.status === "Completed" && (
                      <Button size="sm" variant="outline" onClick={() => onApprove(r)} disabled={saving} className="gap-1.5 text-emerald-700 hover:text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </Button>
                    )}
                    {r.status === "Approved" && (
                      <Button size="sm" onClick={() => onProcess(r)} disabled={saving} className="gap-1.5 bg-teal-600 hover:bg-teal-700">
                        <Wallet className="h-3.5 w-3.5" /> Mark Paid
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openDetail(r)} className="gap-1.5">
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700" onClick={() => setDeleteId(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {(r.status === "Completed" || r.status === "Approved" || r.status === "Paid") && (
                  <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Stat2 label="Total Gross" value={fmtCurrency(r.totalGross)} icon={TrendingUp} accent="emerald" />
                    <Stat2 label="Total Deductions" value={fmtCurrency(r.totalDeductions)} icon={IndianRupee} accent="amber" />
                    <Stat2 label="Total Net" value={fmtCurrency(r.totalNet)} icon={Wallet} accent="teal" />
                    <Stat2 label="Employer PF/ESI" value={fmtCurrency(r.totalEmployerContribution)} icon={ShieldCheck} accent="cyan" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Payroll Run</DialogTitle>
            <DialogDescription>Create a payroll run for a pay period.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Run Name <span className="text-destructive">*</span></Label>
              <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="June 2026 Payroll" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pay Period (YYYY-MM) <span className="text-destructive">*</span></Label>
              <Input value={form.payPeriod || ""} onChange={(e) => setForm({ ...form, payPeriod: e.target.value })} placeholder="2026-06" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pay Date</Label>
              <Input type="date" value={form.payDate || ""} onChange={(e) => setForm({ ...form, payDate: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={onCreate} disabled={saving} className="min-w-24">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Create Run
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailTarget} onOpenChange={(o) => !o && setDetailTarget(null)}>
        <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailTarget?.name} — Payslips</DialogTitle>
            <DialogDescription>{detailTarget?.code} · Period {detailTarget?.payPeriod}</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : detailData && detailData.payslips && detailData.payslips.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase">Employee</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Dept</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-right">Gross</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-right">Deductions</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-right">Net</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailData.payslips.map((p: any) => (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm">
                        <div className="font-medium">{p.employee?.displayName || `${p.employee?.firstName} ${p.employee?.lastName}`}</div>
                        <div className="text-xs text-muted-foreground font-mono">{p.employee?.employeeCode}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.employee?.department?.name || "—"}</TableCell>
                      <TableCell className="text-sm text-right font-medium">{fmtCurrency(p.grossEarnings)}</TableCell>
                      <TableCell className="text-sm text-right text-rose-600 dark:text-rose-400">-{fmtCurrency(p.totalDeductions)}</TableCell>
                      <TableCell className="text-sm text-right font-bold text-emerald-700 dark:text-emerald-400">{fmtCurrency(p.netSalary)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-[10px]", runStatusColors[p.status] || "bg-muted text-muted-foreground")}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toast.info(`Payslip ${p.id.slice(-6)} — download coming soon`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState icon={FileText} title="No payslips yet" description="Process this payroll run to generate payslips." />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payroll run?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the run and all its payslips.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// Tab 3: Payslips (all employees, all runs)
// ============================================================
function PayslipsTab() {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [viewTarget, setViewTarget] = React.useState<any | null>(null)
  const [viewData, setViewData] = React.useState<any | null>(null)
  const [viewLoading, setViewLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/payslips")
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setItems(data.items || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load payslips")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const filtered = React.useMemo(() => {
    return items.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false
      if (search) {
        const emp = p.employee
        const name = emp ? `${emp.firstName} ${emp.lastName} ${emp.displayName || ""} ${emp.employeeCode || ""}`.toLowerCase() : ""
        if (!name.includes(search.toLowerCase())) return false
      }
      return true
    })
  }, [items, search, statusFilter])

  const openView = async (p: any) => {
    setViewTarget(p)
    setViewLoading(true)
    try {
      const res = await fetch(`/api/payslips/${p.id}`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setViewData(data)
    } catch (e: any) {
      toast.error(e?.message || "Failed to load payslip")
    } finally {
      setViewLoading(false)
    }
  }

  const totalNet = filtered.reduce((s, p) => s + (p.netSalary || 0), 0)
  const totalGross = filtered.reduce((s, p) => s + (p.grossEarnings || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Payslips</h2>
          <p className="text-sm text-muted-foreground">All generated payslips across payroll runs</p>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Payslips" value={items.length} icon={FileText} accent="emerald" sub="All runs" />
        <StatCard label="Filtered" value={filtered.length} icon={Users} accent="cyan" sub="Matching filters" />
        <StatCard label="Total Gross" value={fmtLakhs(totalGross)} icon={TrendingUp} accent="amber" sub="Filtered" />
        <StatCard label="Total Net" value={fmtLakhs(totalNet)} icon={Wallet} accent="teal" sub="Filtered" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee..." className="pl-9 h-9 bg-background" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Generated">Generated</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : filtered.length === 0 ? (
        <SectionCard>
          <EmptyState icon={FileText} title="No payslips found" description={items.length === 0 ? "Process a payroll run to generate payslips." : "Try adjusting your filters."} />
        </SectionCard>
      ) : (
        <SectionCard>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase">Employee</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Period</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-right">Gross</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-right">Deductions</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-right">Net</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm">
                      <div className="font-medium">{p.employee?.displayName || `${p.employee?.firstName} ${p.employee?.lastName}`}</div>
                      <div className="text-xs text-muted-foreground font-mono">{p.employee?.employeeCode}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.payPeriod}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{fmtCurrency(p.grossEarnings)}</TableCell>
                    <TableCell className="text-sm text-right text-rose-600 dark:text-rose-400">-{fmtCurrency(p.totalDeductions)}</TableCell>
                    <TableCell className="text-sm text-right font-bold text-emerald-700 dark:text-emerald-400">{fmtCurrency(p.netSalary)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-[10px]", runStatusColors[p.status] || "bg-muted text-muted-foreground")}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openView(p)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      )}

      {/* View Dialog (formal payslip) */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-600" /> Payslip</DialogTitle>
            <DialogDescription>Pay period: {viewData?.payPeriod || viewTarget?.payPeriod}</DialogDescription>
          </DialogHeader>
          {viewLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : viewData ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 p-4 border border-emerald-500/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{viewData.employee?.entity?.legalName || viewData.employee?.entity?.tradeName || "ACME Corporation"}</p>
                    <h3 className="text-lg font-semibold mt-0.5">{viewData.employee?.displayName || `${viewData.employee?.firstName} ${viewData.employee?.lastName}`}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{viewData.employee?.employeeCode} · {viewData.employee?.designation?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{viewData.employee?.department?.name || "—"} · {viewData.employee?.entity?.tradeName || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Pay Period</p>
                    <p className="font-semibold">{viewData.payPeriod}</p>
                    <p className="text-xs text-muted-foreground mt-1">Pay Date</p>
                    <p className="font-medium">{fmtDate(viewData.payDate)}</p>
                  </div>
                </div>
              </div>

              {/* Working days */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border border-border/60 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Working Days</p>
                  <p className="font-bold">{viewData.workingDays}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Days Paid</p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400">{viewData.daysPaid}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">LOP Days</p>
                  <p className="font-bold text-rose-600 dark:text-rose-400">{viewData.lopDays}</p>
                </div>
              </div>

              {/* Earnings & Deductions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-500/30 p-4">
                  <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Earnings</p>
                  <div className="space-y-1.5 text-sm">
                    <PayRow label="Basic" value={viewData.basic} />
                    <PayRow label="HRA" value={viewData.hra} />
                    <PayRow label="Special Allowance" value={viewData.specialAllowance} />
                    <PayRow label="Conveyance" value={viewData.conveyanceAllowance} />
                    <PayRow label="Medical" value={viewData.medicalAllowance} />
                    {viewData.bonusAmount > 0 && <PayRow label="Bonus" value={viewData.bonusAmount} />}
                    <div className="pt-2 mt-2 border-t border-emerald-500/20 flex items-center justify-between font-semibold">
                      <span>Gross Earnings</span>
                      <span className="text-emerald-700 dark:text-emerald-400">{fmtCurrency(viewData.grossEarnings)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-rose-500/30 p-4">
                  <p className="text-xs font-semibold uppercase text-rose-700 dark:text-rose-400 mb-3 flex items-center gap-1.5"><IndianRupee className="h-3.5 w-3.5" /> Deductions</p>
                  <div className="space-y-1.5 text-sm">
                    <PayRow label="PF (Employee)" value={viewData.pfEmployee} />
                    {viewData.esiEmployee > 0 && <PayRow label="ESI (Employee)" value={viewData.esiEmployee} />}
                    <PayRow label="Professional Tax" value={viewData.professionalTax} />
                    {viewData.tdsAmount > 0 && <PayRow label="TDS" value={viewData.tdsAmount} />}
                    <div className="pt-2 mt-2 border-t border-rose-500/20 flex items-center justify-between font-semibold">
                      <span>Total Deductions</span>
                      <span className="text-rose-700 dark:text-rose-400">-{fmtCurrency(viewData.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net pay */}
              <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-90">Net Salary Payable</p>
                  <p className="text-2xl font-bold">{fmtCurrency(viewData.netSalary)}</p>
                </div>
                <Wallet className="h-8 w-8 opacity-80" />
              </div>

              {/* Employer contributions + CTC */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg border border-border/60 p-2.5">
                  <p className="text-muted-foreground uppercase">Employer PF</p>
                  <p className="font-semibold">{fmtCurrency(viewData.pfEmployer)}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-2.5">
                  <p className="text-muted-foreground uppercase">Employer ESI</p>
                  <p className="font-semibold">{fmtCurrency(viewData.esiEmployer)}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-2.5">
                  <p className="text-muted-foreground uppercase">Monthly CTC</p>
                  <p className="font-semibold">{fmtCurrency(viewData.ctc / 12)}</p>
                </div>
              </div>

              {/* Bank details */}
              {viewData.employee?.bankName && (
                <div className="rounded-lg border border-border/60 p-3 text-xs">
                  <p className="text-muted-foreground uppercase mb-1">Credited To</p>
                  <p className="font-medium">{viewData.employee.bankName} · <span className="font-mono">XXXX{String(viewData.employee.accountNumber || "").slice(-4)}</span></p>
                </div>
              )}
            </div>
          ) : (
            <EmptyState icon={FileText} title="Payslip not found" />
          )}
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => toast.info("PDF download coming soon")} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Download PDF
            </Button>
            <Button size="sm" onClick={() => setViewTarget(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================
function Comp({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step="0.01" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}
function Stat2({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent: string }) {
  const accents: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    teal: "text-teal-600 dark:text-teal-400",
    cyan: "text-cyan-600 dark:text-cyan-400",
  }
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</p>
      <div className={cn("flex items-center gap-1.5 mt-0.5", accents[accent] || "text-foreground")}>
        <Icon className="h-3.5 w-3.5" />
        <span className="font-bold text-sm">{value}</span>
      </div>
    </div>
  )
}
function PayRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{fmtCurrency(value)}</span>
    </div>
  )
}
