"use client"

// ============================================================
// ExperienceTab — CRUD for EmployeeExperience.
// ------------------------------------------------------------
// API: /api/employees/[id]/experience
//   • GET  → { items: [...] }
//   • POST → creates a record
//   • PATCH /api/employees/[id]/experience/<recordId>
//   • DELETE /api/employees/[id]/experience/<recordId>
// ============================================================

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Briefcase, Building2, Calendar, Plus, Pencil, Trash2, Loader2,
  CheckCircle2, Clock, Phone, FileText, DollarSign, ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { SectionCard, StatCard, EmptyState } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- helpers ----------
const fmtDate = (d?: string | Date | null) => {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return "—"
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}
function fmtDuration(start?: string | null, end?: string | null): string {
  if (!start) return "—"
  const s = new Date(start)
  const e = end ? new Date(end) : new Date()
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "—"
  let years = e.getFullYear() - s.getFullYear()
  let months = e.getMonth() - s.getMonth()
  if (months < 0) { years--; months += 12 }
  if (years < 0) return "—"
  const parts = []
  if (years > 0) parts.push(`${years}y`)
  if (months > 0) parts.push(`${months}m`)
  return parts.join(" ") || "< 1m"
}
function fmtCurrency(v?: number | null): string {
  if (v === undefined || v === null) return "—"
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v)
}

const verificationColors: Record<string, string> = {
  Verified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Not Verified": "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

interface ExpRec {
  id: string
  companyName: string
  designation?: string | null
  department?: string | null
  startDate?: string | null
  endDate?: string | null
  totalYears?: number | null
  reasonForLeaving?: string | null
  previousSalary?: number | null
  managerName?: string | null
  managerContact?: string | null
  experienceLetterUrl?: string | null
  relievingLetterUrl?: string | null
  lastPayslipUrl?: string | null
  verificationStatus?: string | null
}

const EMPTY_FORM = {
  companyName: "",
  designation: "",
  department: "",
  startDate: "",
  endDate: "",
  reasonForLeaving: "",
  previousSalary: "",
  managerName: "",
  managerContact: "",
  experienceLetterUrl: "",
  relievingLetterUrl: "",
  lastPayslipUrl: "",
  verificationStatus: "Pending",
}

// ---------- main ----------
export default function ExperienceTab({ employeeId }: { employeeId: string; employee: any }) {
  const [items, setItems] = React.useState<ExpRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ExpRec | null>(null)
  const [form, setForm] = React.useState<Record<string, any>>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/experience`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setItems(data.items || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load experience")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }
  const openEdit = (x: ExpRec) => {
    setEditing(x)
    setForm({
      companyName: x.companyName || "",
      designation: x.designation || "",
      department: x.department || "",
      startDate: x.startDate ? x.startDate.slice(0, 10) : "",
      endDate: x.endDate ? x.endDate.slice(0, 10) : "",
      reasonForLeaving: x.reasonForLeaving || "",
      previousSalary: x.previousSalary ? String(x.previousSalary) : "",
      managerName: x.managerName || "",
      managerContact: x.managerContact || "",
      experienceLetterUrl: x.experienceLetterUrl || "",
      relievingLetterUrl: x.relievingLetterUrl || "",
      lastPayslipUrl: x.lastPayslipUrl || "",
      verificationStatus: x.verificationStatus || "Pending",
    })
    setDialogOpen(true)
  }

  const onSave = async () => {
    if (!form.companyName.trim()) { toast.error("Company name is required"); return }
    setSaving(true)
    try {
      const payload: any = {
        companyName: form.companyName.trim(),
        designation: form.designation || null,
        department: form.department || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        reasonForLeaving: form.reasonForLeaving || null,
        previousSalary: form.previousSalary ? Number(form.previousSalary) : null,
        managerName: form.managerName || null,
        managerContact: form.managerContact || null,
        experienceLetterUrl: form.experienceLetterUrl || null,
        relievingLetterUrl: form.relievingLetterUrl || null,
        lastPayslipUrl: form.lastPayslipUrl || null,
        verificationStatus: form.verificationStatus || "Pending",
      }
      const url = editing
        ? `/api/employees/${employeeId}/experience/${editing.id}`
        : `/api/employees/${employeeId}/experience`
      const method = editing ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `Failed (${res.status})`)
      }
      toast.success(editing ? "Experience updated" : "Experience added")
      setDialogOpen(false)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const onVerify = async (x: ExpRec) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/experience/${x.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus: "Verified" }),
      })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Experience verified")
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to verify")
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/experience/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Experience removed")
      setDeleteId(null)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete")
    } finally {
      setSaving(false)
    }
  }

  // Sort by start date descending
  const sorted = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const aS = a.startDate ? new Date(a.startDate).getTime() : 0
      const bS = b.startDate ? new Date(b.startDate).getTime() : 0
      return bS - aS
    })
  }, [items])

  const totalYears = items.reduce((s, x) => s + (x.totalYears || 0), 0)
  const verifiedCount = items.filter((x) => x.verificationStatus === "Verified").length

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
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Previous Experience</h2>
          <p className="text-sm text-muted-foreground">Track prior employment history for background verification</p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Experience
        </Button>
      </motion.div>

      {/* Summary stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Companies" value={items.length} icon={Building2} accent="emerald" sub="Previous employers" />
        <StatCard label="Total Experience" value={`${totalYears.toFixed(1)} yrs`} icon={Clock} accent="cyan" sub="Cumulative" />
        <StatCard label="Verified" value={verifiedCount} icon={CheckCircle2} accent="amber" sub="Background checked" />
        <StatCard label="Pending BGV" value={items.length - verifiedCount} icon={Briefcase} accent="coral" sub="Awaiting verification" />
      </motion.div>

      {/* Timeline */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : sorted.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon={Briefcase}
              title="No previous experience records"
              description="Click 'Add Experience' to log prior employment history."
              action={
                <Button size="sm" onClick={openAdd} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add Experience
                </Button>
              }
            />
          </SectionCard>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

            <div className="space-y-4">
              <AnimatePresence>
                {sorted.map((x, idx) => {
                  const duration = fmtDuration(x.startDate, x.endDate)
                  return (
                    <motion.div
                      key={x.id}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.22 }}
                      className="relative pl-12"
                    >
                      {/* Dot */}
                      <div className={cn(
                        "absolute left-2 top-3 grid h-5 w-5 place-items-center rounded-full ring-4 ring-background",
                        x.verificationStatus === "Verified" ? "bg-emerald-500" : x.verificationStatus === "Pending" ? "bg-amber-500" : "bg-rose-500"
                      )}>
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>

                      <div className="rounded-xl border border-border/60 bg-card shadow-soft hover:shadow-card transition-shadow p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-base">{x.companyName}</h3>
                              {x.verificationStatus && (
                                <Badge variant="secondary" className={cn("text-[10px]", verificationColors[x.verificationStatus] || "bg-muted text-muted-foreground")}>
                                  {x.verificationStatus}
                                </Badge>
                              )}
                              {idx === 0 && (
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 text-[10px]">Most Recent</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {x.designation || "—"}
                              {x.department ? ` · ${x.department}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {x.verificationStatus !== "Verified" && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-emerald-600 hover:text-emerald-700" onClick={() => onVerify(x)} disabled={saving}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verify
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(x)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" onClick={() => setDeleteId(x.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground uppercase tracking-wide">Duration</p>
                            <p className="font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> {duration}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground uppercase tracking-wide">Period</p>
                            <p className="font-medium flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmtDate(x.startDate)} → {x.endDate ? fmtDate(x.endDate) : "Present"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground uppercase tracking-wide">Previous Salary</p>
                            <p className="font-medium flex items-center gap-1"><DollarSign className="h-3 w-3" /> {fmtCurrency(x.previousSalary)}</p>
                          </div>
                          {x.managerName && (
                            <div>
                              <p className="text-muted-foreground uppercase tracking-wide">Manager</p>
                              <p className="font-medium flex items-center gap-1"><Phone className="h-3 w-3" /> {x.managerName}</p>
                            </div>
                          )}
                        </div>

                        {x.reasonForLeaving && (
                          <div className="mt-3 pt-3 border-t border-border/60">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Reason for Leaving</p>
                            <p className="text-sm">{x.reasonForLeaving}</p>
                          </div>
                        )}

                        {(x.experienceLetterUrl || x.relievingLetterUrl || x.lastPayslipUrl) && (
                          <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap gap-2">
                            {x.experienceLetterUrl && <DocLink label="Experience Letter" url={x.experienceLetterUrl} />}
                            {x.relievingLetterUrl && <DocLink label="Relieving Letter" url={x.relievingLetterUrl} />}
                            {x.lastPayslipUrl && <DocLink label="Last Payslip" url={x.lastPayslipUrl} />}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Experience" : "Add Experience"}</DialogTitle>
            <DialogDescription>{editing ? "Update the previous employment details." : "Log a previous employment record."}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Company Name <span className="text-destructive">*</span></Label>
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="e.g. Infosys" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Designation</Label>
              <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Software Engineer" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Department</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Engineering" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Previous Salary (₹/year)</Label>
              <Input type="number" value={form.previousSalary} onChange={(e) => setForm({ ...form, previousSalary: e.target.value })} placeholder="800000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Verification Status</Label>
              <Select value={form.verificationStatus || "Pending"} onValueChange={(v) => setForm({ ...form, verificationStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Not Verified">Not Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Reason for Leaving</Label>
              <Input value={form.reasonForLeaving} onChange={(e) => setForm({ ...form, reasonForLeaving: e.target.value })} placeholder="e.g. Better opportunity" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Manager Name</Label>
              <Input value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Manager Contact</Label>
              <Input value={form.managerContact} onChange={(e) => setForm({ ...form, managerContact: e.target.value })} placeholder="Email or phone" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Experience Letter URL</Label>
              <Input value={form.experienceLetterUrl} onChange={(e) => setForm({ ...form, experienceLetterUrl: e.target.value })} placeholder="/docs/exp.pdf" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Relieving Letter URL</Label>
              <Input value={form.relievingLetterUrl} onChange={(e) => setForm({ ...form, relievingLetterUrl: e.target.value })} placeholder="/docs/rel.pdf" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Last Payslip URL</Label>
              <Input value={form.lastPayslipUrl} onChange={(e) => setForm({ ...form, lastPayslipUrl: e.target.value })} placeholder="/docs/payslip.pdf" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={onSave} disabled={saving} className="min-w-24">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              {editing ? "Save Changes" : "Add Experience"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove experience record?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The experience record will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// ---------- subcomponents ----------
function DocLink({ label, url }: { label: string; url: string }) {
  return (
    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => window.open(url, "_blank")}>
      <FileText className="h-3 w-3" /> {label}
      <ChevronRight className="h-3 w-3" />
    </Button>
  )
}
