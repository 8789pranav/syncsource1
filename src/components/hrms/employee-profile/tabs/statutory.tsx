"use client"

// ============================================================
// StatutoryTab — statutory / compliance details.
// ------------------------------------------------------------
// Uses Employee fields via `employee` prop (panNumber, aadhaarNumber,
// uanNumber, pfNumber, esiNumber, ptLocation, pfApplicable,
// esiApplicable, ptApplicable, lwfApplicability, gratuityApplicability,
// taxRegime, tdsDeclarationStatus).
// Also fetches statutory history from /api/employees/[id]/statutory
// and nominee summary from /api/employees/[id]/family.
// PATCH /api/employees/[id] to update top-level statutory fields.
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Shield, ShieldCheck, FileText, Eye, EyeOff, Plus, Pencil, Trash2,
  Loader2, Award, Percent, Building2, Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { SectionCard, StatCard, EmptyState } from "@/components/hrms/ui"
import { MaskedValue } from "@/components/hrms/permissions/masked-value"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"

// ---------- helpers ----------
const fmtDate = (d?: string | Date | null) => {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return "—"
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}
function maskPan(pan?: string | null, reveal = false): string {
  if (!pan) return "—"
  if (reveal) return pan
  const s = String(pan)
  if (s.length <= 4) return "****" + s
  return s.slice(0, 2) + "****" + s.slice(-2)
}
function maskAadhaar(a?: string | null, reveal = false): string {
  if (!a) return "—"
  if (reveal) return a
  const s = String(a).replace(/\s/g, "")
  if (s.length <= 4) return "****" + s
  return "XXXX-XXXX-" + s.slice(-4)
}

interface StatutoryRec {
  id: string
  panNumber?: string | null
  aadhaarNumber?: string | null
  uanNumber?: string | null
  pfNumber?: string | null
  esiNumber?: string | null
  ptLocation?: string | null
  pfApplicable?: boolean
  esiApplicable?: boolean
  ptApplicable?: boolean
  taxRegime?: string | null
  tdsDeclarationStatus?: string | null
  effectiveDate?: string | null
}
interface FamilyMember {
  id: string
  name: string
  relationship?: string | null
  isNominee: boolean
  nomineePercentage?: number | null
}

const EMPTY_FORM = {
  panNumber: "",
  aadhaarNumber: "",
  uanNumber: "",
  pfNumber: "",
  esiNumber: "",
  ptLocation: "",
  pfApplicable: true,
  esiApplicable: false,
  ptApplicable: true,
  lwfApplicability: "",
  gratuityApplicability: "",
  taxRegime: "New",
  tdsDeclarationStatus: "Pending",
}

// ---------- main ----------
export default function StatutoryTab({ employeeId, employee }: { employeeId: string; employee: any }) {
  const [history, setHistory] = React.useState<StatutoryRec[]>([])
  const [nominees, setNominees] = React.useState<FamilyMember[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editOpen, setEditOpen] = React.useState(false)
  const [form, setForm] = React.useState<Record<string, any>>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [revealPan, setRevealPan] = React.useState(false)
  const [revealAadhaar, setRevealAadhaar] = React.useState(false)
  const [addHistoryOpen, setAddHistoryOpen] = React.useState(false)
  const [histForm, setHistForm] = React.useState<Record<string, any>>({})
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [statRes, famRes] = await Promise.all([
        apiFetch(`/api/employees/${employeeId}/statutory`),
        apiFetch(`/api/employees/${employeeId}/family`),
      ])
      const stat = statRes.ok ? await statRes.json() : { items: [] }
      const fam = famRes.ok ? await famRes.json() : { items: [] }
      setHistory(stat.items || [])
      setNominees((fam.items || []).filter((m: FamilyMember) => m.isNominee))
    } catch (e: any) {
      toast.error(e?.message || "Failed to load statutory details")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  const openEdit = () => {
    setForm({
      panNumber: employee?.panNumber || "",
      aadhaarNumber: employee?.aadhaarNumber || "",
      uanNumber: employee?.uanNumber || "",
      pfNumber: employee?.pfNumber || "",
      esiNumber: employee?.esiNumber || "",
      ptLocation: employee?.ptLocation || "",
      pfApplicable: employee?.pfApplicable ?? true,
      esiApplicable: employee?.esiApplicable ?? false,
      ptApplicable: employee?.ptApplicable ?? true,
      lwfApplicability: employee?.lwfApplicability || "",
      gratuityApplicability: employee?.gratuityApplicability || "",
      taxRegime: employee?.taxRegime || "New",
      tdsDeclarationStatus: employee?.tdsDeclarationStatus || "Pending",
    })
    setEditOpen(true)
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panNumber: form.panNumber || null,
          aadhaarNumber: form.aadhaarNumber || null,
          uanNumber: form.uanNumber || null,
          pfNumber: form.pfNumber || null,
          esiNumber: form.esiNumber || null,
          ptLocation: form.ptLocation || null,
          pfApplicable: !!form.pfApplicable,
          esiApplicable: !!form.esiApplicable,
          ptApplicable: !!form.ptApplicable,
          lwfApplicability: form.lwfApplicability || null,
          gratuityApplicability: form.gratuityApplicability || null,
          taxRegime: form.taxRegime || null,
          tdsDeclarationStatus: form.tdsDeclarationStatus || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `Failed (${res.status})`)
      }
      toast.success("Statutory details updated")
      setEditOpen(false)
      // Refresh employee data via parent reload (the shell re-fetches on edit)
      window.dispatchEvent(new CustomEvent("employee-updated"))
    } catch (e: any) {
      toast.error(e?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const onAddHistory = async () => {
    setSaving(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/statutory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panNumber: histForm.panNumber || employee?.panNumber || null,
          aadhaarNumber: histForm.aadhaarNumber || employee?.aadhaarNumber || null,
          uanNumber: histForm.uanNumber || employee?.uanNumber || null,
          pfNumber: histForm.pfNumber || employee?.pfNumber || null,
          taxRegime: histForm.taxRegime || "New",
          tdsDeclarationStatus: histForm.tdsDeclarationStatus || "Pending",
        }),
      })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Statutory history record added")
      setAddHistoryOpen(false)
      setHistForm({})
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to add")
    } finally {
      setSaving(false)
    }
  }

  const onDeleteHistory = async () => {
    if (!deleteId) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/statutory/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Statutory record removed")
      setDeleteId(null)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete")
    } finally {
      setSaving(false)
    }
  }

  const tdsColors: Record<string, string> = {
    Verified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    Submitted: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
    Pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  }

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
          <h2 className="text-lg font-semibold">Statutory Details</h2>
          <p className="text-sm text-muted-foreground">Government compliance data for payroll, tax, and statutory returns</p>
        </div>
        <Button size="sm" variant="outline" onClick={openEdit} className="gap-1.5">
          <Pencil className="h-4 w-4" /> Edit Details
        </Button>
      </motion.div>

      {/* Security note */}
      <motion.div variants={itemVariants} className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 flex items-center gap-2">
        <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-300">Visible to HR / Payroll admin only. PAN and Aadhaar are masked by default.</p>
      </motion.div>

      {/* Summary stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="PF Applicable" value={employee?.pfApplicable ? "Yes" : "No"} icon={ShieldCheck} accent={employee?.pfApplicable ? "emerald" : "coral"} />
        <StatCard label="ESI Applicable" value={employee?.esiApplicable ? "Yes" : "No"} icon={Shield} accent={employee?.esiApplicable ? "emerald" : "coral"} />
        <StatCard label="PT Applicable" value={employee?.ptApplicable ? "Yes" : "No"} icon={Percent} accent={employee?.ptApplicable ? "emerald" : "coral"} />
        <StatCard label="Nominees" value={nominees.length} icon={Award} accent="amber" sub="Declared" />
      </motion.div>

      {/* Statutory details */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <Skeleton className="h-56 rounded-xl" />
        ) : (
          <SectionCard title="Statutory Details" description="Identity, PF, ESI, and tax information">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field
                icon={FileText}
                label="PAN Number"
                value={<MaskedValue module="employees" field="panNumber" value={employee?.panNumber} maskStyle="pan" showBadge />}
              />
              <Field
                icon={Shield}
                label="Aadhaar Number"
                value={<MaskedValue module="employees" field="aadhaarNumber" value={employee?.aadhaarNumber} maskStyle="aadhaar" showBadge />}
              />
              <Field icon={Wallet} label="UAN Number" value={<MaskedValue module="employees" field="uan" value={employee?.uanNumber} />} />
              <Field icon={ShieldCheck} label="PF Number" value={<MaskedValue module="employees" field="esiNumber" value={employee?.pfNumber} />} />
              <Field icon={Shield} label="ESI Number" value={<MaskedValue module="employees" field="esiNumber" value={employee?.esiNumber} />} />
              <Field icon={Building2} label="PT Location" value={employee?.ptLocation || "—"} />
              <Field icon={ShieldCheck} label="LWF Applicability" value={employee?.lwfApplicability || "—"} />
              <Field icon={ShieldCheck} label="Gratuity Applicability" value={employee?.gratuityApplicability || "—"} />
            </div>

            {/* Tax details */}
            <div className="mt-4 pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Tax Regime</p>
                  <Badge variant="secondary" className="mt-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                    {employee?.taxRegime || "—"}
                  </Badge>
                </div>
                <Percent className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">TDS Declaration</p>
                  <Badge variant="secondary" className={cn("mt-1", tdsColors[employee?.tdsDeclarationStatus] || "bg-muted text-muted-foreground")}>
                    {employee?.tdsDeclarationStatus || "—"}
                  </Badge>
                </div>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </SectionCard>
        )}
      </motion.div>

      {/* Nominee summary */}
      <motion.div variants={itemVariants}>
        <SectionCard title="Nominee Summary" description="Family members declared as nominees for PF / gratuity">
          {nominees.length === 0 ? (
            <EmptyState icon={Award} title="No nominees declared" description="Add family members and mark them as nominees in the Family tab." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {nominees.map((n) => (
                <div key={n.id} className="rounded-lg border border-border/60 p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{n.name}</p>
                    <p className="text-xs text-muted-foreground">{n.relationship || "—"}</p>
                  </div>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                    {n.nomineePercentage || 0}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </motion.div>

      {/* Statutory history */}
      <motion.div variants={itemVariants}>
        <SectionCard
          title="Statutory History"
          description="Historical statutory records"
          action={
            <Button size="sm" variant="outline" onClick={() => setAddHistoryOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Record
            </Button>
          }
        >
          {history.length === 0 ? (
            <EmptyState icon={FileText} title="No statutory history" description="Historical statutory records will appear here." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase">Effective</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">PAN</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">UAN</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">PF</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Tax</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">TDS</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm">{fmtDate(h.effectiveDate)}</TableCell>
                      <TableCell className="text-sm font-mono"><MaskedValue module="employees" field="panNumber" value={h.panNumber} maskStyle="pan" /></TableCell>
                      <TableCell className="text-sm">{h.uanNumber || "—"}</TableCell>
                      <TableCell className="text-sm">{h.pfNumber || "—"}</TableCell>
                      <TableCell className="text-sm">{h.taxRegime || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("text-[10px]", tdsColors[h.tdsDeclarationStatus || ""] || "bg-muted text-muted-foreground")}>
                          {h.tdsDeclarationStatus || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" onClick={() => setDeleteId(h.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Statutory Details</DialogTitle>
            <DialogDescription>Update government compliance information.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">PAN Number</Label>
              <Input value={form.panNumber} onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Aadhaar Number</Label>
              <Input value={form.aadhaarNumber} onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })} placeholder="1234 5678 9012" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">UAN Number</Label>
              <Input value={form.uanNumber} onChange={(e) => setForm({ ...form, uanNumber: e.target.value })} placeholder="101234567890" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">PF Number</Label>
              <Input value={form.pfNumber} onChange={(e) => setForm({ ...form, pfNumber: e.target.value })} placeholder="KN/BNG/12345/000/0001234" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ESI Number</Label>
              <Input value={form.esiNumber} onChange={(e) => setForm({ ...form, esiNumber: e.target.value })} placeholder="ESI number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">PT Location</Label>
              <Input value={form.ptLocation} onChange={(e) => setForm({ ...form, ptLocation: e.target.value })} placeholder="Karnataka" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">LWF Applicability</Label>
              <Input value={form.lwfApplicability} onChange={(e) => setForm({ ...form, lwfApplicability: e.target.value })} placeholder="Applicable / Not applicable" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Gratuity Applicability</Label>
              <Input value={form.gratuityApplicability} onChange={(e) => setForm({ ...form, gratuityApplicability: e.target.value })} placeholder="Applicable / Not applicable" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tax Regime</Label>
              <Select value={form.taxRegime || "New"} onValueChange={(v) => setForm({ ...form, taxRegime: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Old">Old</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">TDS Declaration Status</Label>
              <Select value={form.tdsDeclarationStatus || "Pending"} onValueChange={(v) => setForm({ ...form, tdsDeclarationStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 rounded-lg border border-border/60 p-3 space-y-3">
              <SwitchRow label="PF Applicable" checked={form.pfApplicable} onChange={(v) => setForm({ ...form, pfApplicable: v })} />
              <SwitchRow label="ESI Applicable" checked={form.esiApplicable} onChange={(v) => setForm({ ...form, esiApplicable: v })} />
              <SwitchRow label="Professional Tax Applicable" checked={form.ptApplicable} onChange={(v) => setForm({ ...form, ptApplicable: v })} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={onSave} disabled={saving} className="min-w-24">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add History Dialog */}
      <Dialog open={addHistoryOpen} onOpenChange={setAddHistoryOpen}>
        <DialogContent className="max-w-md max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Statutory Record</DialogTitle>
            <DialogDescription>Log a historical statutory record.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">PAN Number</Label>
              <Input value={histForm.panNumber || ""} onChange={(e) => setHistForm({ ...histForm, panNumber: e.target.value.toUpperCase() })} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">UAN Number</Label>
              <Input value={histForm.uanNumber || ""} onChange={(e) => setHistForm({ ...histForm, uanNumber: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">PF Number</Label>
              <Input value={histForm.pfNumber || ""} onChange={(e) => setHistForm({ ...histForm, pfNumber: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tax Regime</Label>
              <Select value={histForm.taxRegime || "New"} onValueChange={(v) => setHistForm({ ...histForm, taxRegime: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Old">Old</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">TDS Declaration Status</Label>
              <Select value={histForm.tdsDeclarationStatus || "Pending"} onValueChange={(v) => setHistForm({ ...histForm, tdsDeclarationStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setAddHistoryOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={onAddHistory} disabled={saving} className="min-w-24">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Add Record
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove statutory record?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteHistory} disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white">
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
function Field({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium text-foreground">{value}</span>
      </div>
    </div>
  )
}
function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-medium">{label}</p>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
