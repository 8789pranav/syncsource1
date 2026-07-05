"use client"

// ============================================================
// EducationTab — CRUD for EmployeeEducation.
// ------------------------------------------------------------
// API: /api/employees/[id]/education
// ============================================================

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  GraduationCap, Award, BookOpen, School, Building2, CalendarClock,
  Plus, Pencil, Trash2, Loader2, Star, FileText, ExternalLink,
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

interface EducationRecord {
  id: string
  qualification?: string | null
  degree?: string | null
  specialization?: string | null
  institute?: string | null
  university?: string | null
  yearOfPassing?: number | null
  percentage?: number | null
  cgpa?: number | null
  educationType?: string | null
  isHighest: boolean
  certificateUrl?: string | null
}

const EMPTY_FORM = {
  qualification: "",
  degree: "",
  specialization: "",
  institute: "",
  university: "",
  yearOfPassing: "",
  percentage: "",
  cgpa: "",
  educationType: "Full-time",
  isHighest: false,
  certificateUrl: "",
}

// ---------- main ----------
export default function EducationTab({ employeeId, employee }: { employeeId: string; employee: any }) {
  const [items, setItems] = React.useState<EducationRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<EducationRecord | null>(null)
  const [form, setForm] = React.useState<Record<string, any>>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/education`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setItems(data.items || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load education records")
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
  const openEdit = (r: EducationRecord) => {
    setEditing(r)
    setForm({
      qualification: r.qualification || "",
      degree: r.degree || "",
      specialization: r.specialization || "",
      institute: r.institute || "",
      university: r.university || "",
      yearOfPassing: r.yearOfPassing != null ? String(r.yearOfPassing) : "",
      percentage: r.percentage != null ? String(r.percentage) : "",
      cgpa: r.cgpa != null ? String(r.cgpa) : "",
      educationType: r.educationType || "Full-time",
      isHighest: !!r.isHighest,
      certificateUrl: r.certificateUrl || "",
    })
    setDialogOpen(true)
  }

  const onSave = async () => {
    if (!form.degree && !form.qualification) {
      toast.error("Degree or qualification is required")
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        qualification: form.qualification || null,
        degree: form.degree || null,
        specialization: form.specialization || null,
        institute: form.institute || null,
        university: form.university || null,
        yearOfPassing: form.yearOfPassing ? Number(form.yearOfPassing) : null,
        percentage: form.percentage ? Number(form.percentage) : null,
        cgpa: form.cgpa ? Number(form.cgpa) : null,
        educationType: form.educationType || null,
        isHighest: !!form.isHighest,
        certificateUrl: form.certificateUrl || null,
      }
      const url = editing
        ? `/api/employees/${employeeId}/education/${editing.id}`
        : `/api/employees/${employeeId}/education`
      const method = editing ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || data?.message || `Failed (${res.status})`)
      }
      toast.success(editing ? "Education record updated" : "Education record added")
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
      const res = await fetch(`/api/employees/${employeeId}/education/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Education record removed")
      setDeleteId(null)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete")
    } finally {
      setSaving(false)
    }
  }

  const highest = items.find((i) => i.isHighest) || items[0]
  const earliestYear = items
    .map((i) => i.yearOfPassing)
    .filter(Boolean)
    .sort()[0] as number | undefined
  const latestYear = items
    .map((i) => i.yearOfPassing)
    .filter(Boolean)
    .sort()
    .reverse()[0] as number | undefined
  const educationSpan = earliestYear && latestYear ? `${latestYear - earliestYear} yrs` : "—"

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
          <h2 className="text-lg font-semibold">Education</h2>
          <p className="text-sm text-muted-foreground">Academic qualifications, degrees, and certifications</p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Education
        </Button>
      </motion.div>

      {/* Summary stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Qualifications" value={items.length} icon={GraduationCap} accent="emerald" sub="On file" />
        <StatCard label="Highest" value={highest?.degree || highest?.qualification || "—"} icon={Star} accent="amber" sub={highest?.university || ""} />
        <StatCard label="Education Span" value={educationSpan} icon={CalendarClock} accent="cyan" sub={earliestYear && latestYear ? `${earliestYear} – ${latestYear}` : "—"} />
        <StatCard label="Latest Year" value={latestYear || "—"} icon={Award} accent="fuchsia" sub="Year of passing" />
      </motion.div>

      <motion.div variants={itemVariants}>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : items.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon={GraduationCap}
              title="No education records added yet"
              description="Click 'Add Education' to get started."
              action={
                <Button size="sm" onClick={openAdd} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add Education
                </Button>
              }
            />
          </SectionCard>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {items.map((r, idx) => (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.18, delay: idx * 0.02 }}
                >
                  <div className={cn(
                    "rounded-xl border bg-card shadow-soft hover:shadow-card transition-shadow p-4 sm:p-5 flex flex-col gap-3",
                    r.isHighest ? "border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-transparent" : "border-border/60"
                  )}>
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                        r.isHighest
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      )}>
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{r.degree || r.qualification || "Qualification"}</p>
                          {r.qualification && <Badge variant="outline" className="text-[10px] font-medium">{r.qualification}</Badge>}
                          {r.isHighest && <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 text-[10px] gap-1"><Star className="h-2.5 w-2.5" /> Highest</Badge>}
                          {r.educationType && <Badge variant="outline" className="text-[10px] text-muted-foreground">{r.educationType}</Badge>}
                        </div>
                        {r.specialization && <p className="text-sm text-muted-foreground mt-0.5">{r.specialization}</p>}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                          {r.institute && <Span icon={School} text={r.institute} />}
                          {r.university && <Span icon={Building2} text={r.university} />}
                          {r.yearOfPassing && <Span icon={CalendarClock} text={`Passed ${r.yearOfPassing}`} />}
                          {r.percentage != null && <Span icon={Award} text={`${r.percentage}%`} />}
                          {r.cgpa != null && <Span icon={Award} text={`${r.cgpa} CGPA`} />}
                          {r.certificateUrl && <a href={r.certificateUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"><FileText className="h-3 w-3" /> Certificate <ExternalLink className="h-2.5 w-2.5" /></a>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" onClick={() => setDeleteId(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Education Record" : "Add Education Record"}</DialogTitle>
            <DialogDescription>{editing ? "Update the details below." : "Add an academic qualification or certification."}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <LabeledSelect label="Qualification" value={form.qualification} options={["10th", "12th", "Diploma", "UG", "PG", "PhD", "Certification"].map((v) => ({ label: v, value: v }))} onChange={(v) => setForm({ ...form, qualification: v })} />
            <LabeledInput label="Degree" value={form.degree} onChange={(v) => setForm({ ...form, degree: v })} placeholder="e.g. B.E. Computer Science" />
            <LabeledInput label="Specialization" value={form.specialization} onChange={(v) => setForm({ ...form, specialization: v })} />
            <LabeledInput label="Institute" value={form.institute} onChange={(v) => setForm({ ...form, institute: v })} />
            <LabeledInput label="University" value={form.university} onChange={(v) => setForm({ ...form, university: v })} />
            <LabeledInput label="Year of passing" type="number" value={form.yearOfPassing} onChange={(v) => setForm({ ...form, yearOfPassing: v })} />
            <LabeledInput label="Percentage" type="number" value={form.percentage} onChange={(v) => setForm({ ...form, percentage: v })} />
            <LabeledInput label="CGPA" type="number" value={form.cgpa} onChange={(v) => setForm({ ...form, cgpa: v })} />
            <LabeledSelect label="Education type" value={form.educationType} options={["Full-time", "Part-time", "Distance", "Online"].map((v) => ({ label: v, value: v }))} onChange={(v) => setForm({ ...form, educationType: v })} />
            <LabeledInput label="Certificate URL" value={form.certificateUrl} onChange={(v) => setForm({ ...form, certificateUrl: v })} placeholder="https://" />
            <div className="sm:col-span-2 rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Mark as highest qualification</p>
                  <p className="text-xs text-muted-foreground">Highlights this record on the profile</p>
                </div>
                <Switch checked={!!form.isHighest} onCheckedChange={(v) => setForm({ ...form, isHighest: v })} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={onSave} disabled={saving} className="min-w-24">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              {editing ? "Save Changes" : "Add Record"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove education record?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The education record will be permanently deleted.</AlertDialogDescription>
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
function Span({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-3 w-3 opacity-70" /> {text}
    </span>
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
