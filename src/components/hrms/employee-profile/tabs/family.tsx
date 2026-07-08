"use client"

// ============================================================
// FamilyTab — CRUD for EmployeeFamilyMember.
// ------------------------------------------------------------
// API: /api/employees/[id]/family
//   • GET  → { items: [...] }
//   • POST → creates a record
//   • PATCH /api/employees/[id]/family/<recordId>
//   • DELETE /api/employees/[id]/family/<recordId>
// ============================================================

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Users as UsersIcon, User2, Heart, Cake, Phone, Briefcase,
  Plus, Pencil, Trash2, ShieldCheck, Loader2, Award, Gift,
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
import { SectionCard, StatCard, EmptyState } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"

// ---------- helpers ----------
const fmtDate = (d?: string | Date | null) => {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return "—"
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}
const calcAge = (d?: string | Date | null) => {
  if (!d) return null
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return null
  const age = Math.floor((Date.now() - dt.getTime()) / (365.25 * 86400000))
  return age >= 0 ? age : null
}

interface FamilyMember {
  id: string
  name: string
  relationship?: string | null
  gender?: string | null
  dateOfBirth?: string | null
  mobileNumber?: string | null
  occupation?: string | null
  isDependent: boolean
  isNominee: boolean
  nomineePercentage?: number | null
  insuranceApplicable: boolean
}

const EMPTY_FORM = {
  name: "",
  relationship: "",
  gender: "",
  dateOfBirth: "",
  mobileNumber: "",
  occupation: "",
  isDependent: false,
  isNominee: false,
  nomineePercentage: "",
  insuranceApplicable: false,
}

// ---------- main ----------
export default function FamilyTab({ employeeId, employee }: { employeeId: string; employee: any }) {
  const [items, setItems] = React.useState<FamilyMember[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<FamilyMember | null>(null)
  const [form, setForm] = React.useState<Record<string, any>>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/family`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setItems(data.items || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load family members")
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
  const openEdit = (m: FamilyMember) => {
    setEditing(m)
    setForm({
      name: m.name || "",
      relationship: m.relationship || "",
      gender: m.gender || "",
      dateOfBirth: m.dateOfBirth ? m.dateOfBirth.slice(0, 10) : "",
      mobileNumber: m.mobileNumber || "",
      occupation: m.occupation || "",
      isDependent: m.isDependent || false,
      isNominee: m.isNominee || false,
      nomineePercentage: m.nomineePercentage != null ? String(m.nomineePercentage) : "",
      insuranceApplicable: m.insuranceApplicable || false,
    })
    setDialogOpen(true)
  }

  const onSave = async () => {
    if (!form.name.trim()) {
      toast.error("Family member name is required")
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        name: form.name.trim(),
        relationship: form.relationship || null,
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
        mobileNumber: form.mobileNumber || null,
        occupation: form.occupation || null,
        isDependent: !!form.isDependent,
        isNominee: !!form.isNominee,
        nomineePercentage: form.nomineePercentage ? Number(form.nomineePercentage) : null,
        insuranceApplicable: !!form.insuranceApplicable,
      }
      const url = editing
        ? `/api/employees/${employeeId}/family/${editing.id}`
        : `/api/employees/${employeeId}/family`
      const method = editing ? "PATCH" : "POST"
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || data?.message || `Failed (${res.status})`)
      }
      toast.success(editing ? "Family member updated" : "Family member added")
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
      const res = await apiFetch(`/api/employees/${employeeId}/family/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Family member removed")
      setDeleteId(null)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete")
    } finally {
      setSaving(false)
    }
  }

  const dependents = items.filter((m) => m.isDependent).length
  const nominees = items.filter((m) => m.isNominee).length
  const totalNomineePct = items.reduce((s, m) => s + (m.nomineePercentage || 0), 0)

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
          <h2 className="text-lg font-semibold">Family Members</h2>
          <p className="text-sm text-muted-foreground">Manage dependents, nominees, and insurance-eligible family members</p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Family Member
        </Button>
      </motion.div>

      {/* Summary stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Members" value={items.length} icon={UsersIcon} accent="emerald" sub="On file" />
        <StatCard label="Dependents" value={dependents} icon={Heart} accent="cyan" sub="Listed as dependent" />
        <StatCard label="Nominees" value={nominees} icon={Award} accent="amber" sub="For PF / gratuity" />
        <StatCard label="Nominee %" value={`${totalNomineePct}%`} icon={Gift} accent={totalNomineePct === 100 ? "emerald" : "coral"} sub={totalNomineePct === 100 ? "Fully allocated" : "Should total 100%"} />
      </motion.div>

      {/* Cards grid */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : items.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon={UsersIcon}
              title="No family members added yet"
              description="Click 'Add Family Member' to get started."
              action={
                <Button size="sm" onClick={openAdd} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add Family Member
                </Button>
              }
            />
          </SectionCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {items.map((m) => {
                const age = calcAge(m.dateOfBirth)
                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="rounded-xl border border-border/60 bg-card shadow-soft hover:shadow-card transition-shadow p-4 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-semibold",
                            m.gender === "Female"
                              ? "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300"
                              : m.gender === "Male"
                                ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          )}>
                            {m.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.relationship || "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" onClick={() => setDeleteId(m.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                        {m.gender && <Row icon={User2} value={m.gender} />}
                        {m.dateOfBirth && <Row icon={Cake} value={`${fmtDate(m.dateOfBirth)}${age !== null ? ` · ${age} yrs` : ""}`} />}
                        {m.mobileNumber && <Row icon={Phone} value={m.mobileNumber} />}
                        {m.occupation && <Row icon={Briefcase} value={m.occupation} />}
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap gap-1.5">
                        {m.isDependent && <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 gap-1 text-[10px]"><Heart className="h-2.5 w-2.5" /> Dependent</Badge>}
                        {m.isNominee && <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 gap-1 text-[10px]"><Award className="h-2.5 w-2.5" /> Nominee{m.nomineePercentage ? ` · ${m.nomineePercentage}%` : ""}</Badge>}
                        {m.insuranceApplicable && <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400 gap-1 text-[10px]"><ShieldCheck className="h-2.5 w-2.5" /> Insured</Badge>}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Family Member" : "Add Family Member"}</DialogTitle>
            <DialogDescription>{editing ? "Update the details below." : "Add a new family member, dependent, or nominee."}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </div>
            <LabeledSelect label="Relationship" value={form.relationship} options={["Spouse", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Other"].map((v) => ({ label: v, value: v }))} onChange={(v) => setForm({ ...form, relationship: v })} />
            <LabeledSelect label="Gender" value={form.gender} options={["Male", "Female", "Other"].map((v) => ({ label: v, value: v }))} onChange={(v) => setForm({ ...form, gender: v })} />
            <LabeledInput label="Date of birth" type="date" value={form.dateOfBirth} onChange={(v) => setForm({ ...form, dateOfBirth: v })} />
            <LabeledInput label="Mobile" type="tel" value={form.mobileNumber} onChange={(v) => setForm({ ...form, mobileNumber: v })} />
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Occupation</Label>
              <Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="e.g. Doctor, Homemaker" />
            </div>
            <div className="sm:col-span-2 rounded-lg border border-border/60 p-3 space-y-3">
              <SwitchRow label="Dependent" desc="Listed as a financial dependent" checked={form.isDependent} onChange={(v) => setForm({ ...form, isDependent: v })} />
              <SwitchRow label="Nominee" desc="Listed as nominee for PF / gratuity" checked={form.isNominee} onChange={(v) => setForm({ ...form, isNominee: v })} />
              {form.isNominee && (
                <LabeledInput label="Nominee percentage" type="number" value={form.nomineePercentage} onChange={(v) => setForm({ ...form, nomineePercentage: v })} />
              )}
              <SwitchRow label="Insurance applicable" desc="Eligible for health insurance coverage" checked={form.insuranceApplicable} onChange={(v) => setForm({ ...form, insuranceApplicable: v })} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={onSave} disabled={saving} className="min-w-24">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              {editing ? "Save Changes" : "Add Member"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove family member?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The family member record will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
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
function Row({ icon: Icon, value }: { icon: any; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  )
}
function LabeledInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
function LabeledSelect({ label, value, options, onChange }: { label: string; value: string; options: { label: string; value: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
function SwitchRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
