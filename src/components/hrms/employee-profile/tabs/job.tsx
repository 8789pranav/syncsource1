"use client"

// ============================================================
// JobTab — employment / job details.
// ------------------------------------------------------------
// Uses the `employee` prop (includes reportingManager, functionalManager, hrManager).
// Edit dialog → PATCH /api/employees/[id].
// Quick actions: Transfer / Promote / Change Status (simple PATCH dialogs).
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Briefcase, Building2, CalendarClock, CalendarDays, CalendarRange, Clock3,
  GitBranch, Home as HomeIcon, MapPin, Pencil, ShieldCheck, Shuffle,
  TrendingUp, User2, Loader2, FileText, CalendarCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { SectionCard, StatusBadge } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"

// ---------- helpers ----------
const fmtDate = (d?: string | Date | null) => {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return "—"
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}
const mgrName = (m: any) => m ? `${m.firstName} ${m.lastName || ""}`.trim() : null

// ---------- main ----------
export default function JobTab({ employeeId, employee }: { employeeId: string; employee: any }) {
  const [editOpen, setEditOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState<Record<string, any>>({})
  const [action, setAction] = React.useState<null | "transfer" | "promote" | "status">(null)
  const [actionForm, setActionForm] = React.useState<Record<string, any>>({})
  const [actionSaving, setActionSaving] = React.useState(false)

  React.useEffect(() => {
    if (employee) {
      setForm({
        employeeCode: employee.employeeCode || "",
        officialEmail: employee.officialEmail || "",
        dateOfJoining: employee.dateOfJoining ? employee.dateOfJoining.slice(0, 10) : "",
        employmentType: employee.employmentType || "",
        workerType: employee.workerType || "",
        jobType: employee.jobType || "",
        probationStatus: employee.probationStatus || "",
        probationStartDate: employee.probationStartDate ? employee.probationStartDate.slice(0, 10) : "",
        probationEndDate: employee.probationEndDate ? employee.probationEndDate.slice(0, 10) : "",
        confirmationDate: employee.confirmationDate ? employee.confirmationDate.slice(0, 10) : "",
        noticePeriod: employee.noticePeriod ?? "",
        employeeStatus: employee.employeeStatus || "",
        workMode: employee.workMode || "",
        businessUnit: employee.businessUnit || "",
        costCenter: employee.costCenter || "",
        entityId: employee.entityId || "",
        departmentId: employee.departmentId || "",
        designationId: employee.designationId || "",
        gradeId: employee.gradeId || "",
        locationId: employee.locationId || "",
        branchId: employee.branchId || "",
        reportingManagerId: employee.reportingManagerId || "",
        functionalManagerId: employee.functionalManagerId || "",
        hrManagerId: employee.hrManagerId || "",
        leavePolicyId: employee.leavePolicyId || "",
        attendancePolicyId: employee.attendancePolicyId || "",
        payrollPolicyId: employee.payrollPolicyId || "",
        shiftPolicyId: employee.shiftPolicyId || "",
        holidayCalendarId: employee.holidayCalendarId || "",
      })
    }
  }, [employee])

  if (!employee) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    )
  }

  const onPatch = async (payload: Record<string, any>, successMsg = "Job details updated") => {
    setSaving(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || data?.message || `Failed (${res.status})`)
      }
      toast.success(successMsg)
      setEditOpen(false)
      setAction(null)
    } catch (e: any) {
      toast.error(e?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const onSubmitEdit = () => onPatch(form)

  const openAction = (kind: "transfer" | "promote" | "status") => {
    setAction(kind)
    if (kind === "transfer") {
      setActionForm({
        departmentId: employee.departmentId || "",
        locationId: employee.locationId || "",
        branchId: employee.branchId || "",
        entityId: employee.entityId || "",
        reason: "",
      })
    } else if (kind === "promote") {
      setActionForm({
        designationId: employee.designationId || "",
        gradeId: employee.gradeId || "",
        newCtc: employee.ctc || "",
        effectiveDate: new Date().toISOString().slice(0, 10),
        reason: "",
      })
    } else {
      setActionForm({
        employeeStatus: employee.employeeStatus || "Active",
        reason: "",
        effectiveDate: new Date().toISOString().slice(0, 10),
      })
    }
  }

  const onSubmitAction = () => {
    if (action === "transfer") {
      onPatch({
        departmentId: actionForm.departmentId || undefined,
        locationId: actionForm.locationId || undefined,
        branchId: actionForm.branchId || undefined,
        entityId: actionForm.entityId || undefined,
      }, "Employee transferred")
    } else if (action === "promote") {
      const payload: Record<string, any> = {
        designationId: actionForm.designationId || undefined,
        gradeId: actionForm.gradeId || undefined,
      }
      if (actionForm.newCtc) {
        payload.ctc = Number(actionForm.newCtc)
        payload.basicSalary = Math.round(Number(actionForm.newCtc) * 0.5)
        payload.hra = Math.round(Number(actionForm.newCtc) * 0.2)
      }
      onPatch(payload, "Promotion applied")
    } else if (action === "status") {
      onPatch({ employeeStatus: actionForm.employeeStatus }, "Employee status updated")
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
  }

  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-5">
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Employment Details</h2>
          <p className="text-sm text-muted-foreground">Job, organization, managers, and assigned policies</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openAction("transfer")} className="gap-1.5">
            <Shuffle className="h-4 w-4" /> Transfer
          </Button>
          <Button variant="outline" size="sm" onClick={() => openAction("promote")} className="gap-1.5">
            <TrendingUp className="h-4 w-4" /> Promote
          </Button>
          <Button variant="outline" size="sm" onClick={() => openAction("status")} className="gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Change Status
          </Button>
          <Button size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={itemVariants}>
          <SectionCard title="Employment" description="Tenure, type, probation, notice">
            <div className="space-y-2 text-sm">
              <FieldRow icon={Briefcase} label="Employee code" value={<span className="font-mono">{employee.employeeCode}</span>} />
              <FieldRow icon={Briefcase} label="Official email" value={employee.officialEmail} />
              <FieldRow icon={CalendarDays} label="Date of joining" value={fmtDate(employee.dateOfJoining)} />
              <FieldRow icon={Briefcase} label="Employment type" value={employee.employmentType} />
              <FieldRow icon={Briefcase} label="Worker type" value={employee.workerType} />
              <FieldRow icon={Briefcase} label="Job type" value={employee.jobType} />
              <FieldRow icon={ShieldCheck} label="Probation status" value={employee.probationStatus ? <StatusBadge status={employee.probationStatus} /> : null} />
              <FieldRow icon={CalendarClock} label="Probation start" value={fmtDate(employee.probationStartDate)} />
              <FieldRow icon={CalendarClock} label="Probation end" value={fmtDate(employee.probationEndDate)} />
              <FieldRow icon={CalendarCheck} label="Confirmation date" value={fmtDate(employee.confirmationDate)} />
              <FieldRow icon={Clock3} label="Notice period" value={employee.noticePeriod != null ? `${employee.noticePeriod} days` : null} />
              <FieldRow icon={StatusBadge as any} label="Status" value={<StatusBadge status={employee.employeeStatus} />} />
              <FieldRow icon={HomeIcon} label="Work mode" value={employee.workMode} />
            </div>
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard title="Organization" description="Entity, branch, department, grade">
            <div className="space-y-2 text-sm">
              <FieldRow icon={Building2} label="Entity" value={employee.entity?.tradeName || employee.entity?.legalName || employee.entity?.code} />
              <FieldRow icon={GitBranch} label="Branch" value={employee.branch?.name} />
              <FieldRow icon={MapPin} label="Location" value={employee.location?.name} />
              <FieldRow icon={Building2} label="Department" value={employee.department?.name} />
              <FieldRow icon={Briefcase} label="Designation" value={employee.designation?.name} />
              <FieldRow icon={TrendingUp} label="Grade" value={employee.grade?.name} />
              <FieldRow icon={Briefcase} label="Business unit" value={employee.businessUnit} />
              <FieldRow icon={Briefcase} label="Cost center" value={employee.costCenter} />
            </div>
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard title="Managers" description="Reporting hierarchy">
            <div className="space-y-3">
              <ManagerRow label="Reporting manager" mgr={employee.reportingManager} />
              <ManagerRow label="Functional manager" mgr={employee.functionalManager} />
              <ManagerRow label="HR manager" mgr={employee.hrManager} />
            </div>
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard title="Policies" description="Assigned policy references">
            <div className="space-y-2 text-sm">
              <FieldRow icon={FileText} label="Leave policy" value={employee.leavePolicyId ? <Badge variant="outline" className="font-mono text-[10px]">{employee.leavePolicyId.slice(-6)}</Badge> : <NotAssigned />} />
              <FieldRow icon={Clock3} label="Attendance policy" value={employee.attendancePolicyId ? <Badge variant="outline" className="font-mono text-[10px]">{employee.attendancePolicyId.slice(-6)}</Badge> : <NotAssigned />} />
              <FieldRow icon={CalendarRange} label="Shift policy" value={employee.shiftPolicyId ? <Badge variant="outline" className="font-mono text-[10px]">{employee.shiftPolicyId.slice(-6)}</Badge> : <NotAssigned />} />
              <FieldRow icon={Briefcase} label="Payroll policy" value={employee.payrollPolicyId ? <Badge variant="outline" className="font-mono text-[10px]">{employee.payrollPolicyId.slice(-6)}</Badge> : <NotAssigned />} />
              <FieldRow icon={CalendarDays} label="Holiday calendar" value={employee.holidayCalendarId ? <Badge variant="outline" className="font-mono text-[10px]">{employee.holidayCalendarId.slice(-6)}</Badge> : <NotAssigned />} />
            </div>
          </SectionCard>
        </motion.div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employment Details</DialogTitle>
            <DialogDescription>Update employment, organization, manager, and policy fields.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide sm:col-span-2 pt-1">Employment</p>
            <LabeledInput label="Employee code" value={form.employeeCode} onChange={(v) => setForm({ ...form, employeeCode: v })} />
            <LabeledInput label="Official email" type="email" value={form.officialEmail} onChange={(v) => setForm({ ...form, officialEmail: v })} />
            <LabeledInput label="Date of joining" type="date" value={form.dateOfJoining} onChange={(v) => setForm({ ...form, dateOfJoining: v })} />
            <LabeledSelect label="Employment type" value={form.employmentType} options={["Full-time", "Part-time", "Contract", "Intern", "Consultant", "Apprentice", "Temporary"].map((v) => ({ label: v, value: v }))} onChange={(v) => setForm({ ...form, employmentType: v })} />
            <LabeledSelect label="Worker type" value={form.workerType} options={["Permanent", "Temporary", "Contract"].map((v) => ({ label: v, value: v }))} onChange={(v) => setForm({ ...form, workerType: v })} />
            <LabeledSelect label="Job type" value={form.jobType} options={["On-roll", "Off-roll"].map((v) => ({ label: v, value: v }))} onChange={(v) => setForm({ ...form, jobType: v })} />
            <LabeledSelect label="Probation status" value={form.probationStatus} options={["", "On Probation", "Confirmed", "Extended", "Not Confirmed"].map((v) => ({ label: v || "—", value: v }))} onChange={(v) => setForm({ ...form, probationStatus: v })} />
            <LabeledInput label="Probation start" type="date" value={form.probationStartDate} onChange={(v) => setForm({ ...form, probationStartDate: v })} />
            <LabeledInput label="Probation end" type="date" value={form.probationEndDate} onChange={(v) => setForm({ ...form, probationEndDate: v })} />
            <LabeledInput label="Confirmation date" type="date" value={form.confirmationDate} onChange={(v) => setForm({ ...form, confirmationDate: v })} />
            <LabeledInput label="Notice period (days)" type="number" value={String(form.noticePeriod ?? "")} onChange={(v) => setForm({ ...form, noticePeriod: v ? Number(v) : null })} />
            <LabeledSelect label="Employee status" value={form.employeeStatus} options={["Active", "On Notice", "Resigned", "Terminated", "Absconded", "Retired", "Inactive", "Alumni"].map((v) => ({ label: v, value: v }))} onChange={(v) => setForm({ ...form, employeeStatus: v })} />
            <LabeledSelect label="Work mode" value={form.workMode} options={["Work from office", "Work from home", "Hybrid", "Field work"].map((v) => ({ label: v, value: v }))} onChange={(v) => setForm({ ...form, workMode: v })} />

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide sm:col-span-2 pt-3 border-t">Organization</p>
            <LabeledInput label="Business unit" value={form.businessUnit} onChange={(v) => setForm({ ...form, businessUnit: v })} />
            <LabeledInput label="Cost center" value={form.costCenter} onChange={(v) => setForm({ ...form, costCenter: v })} />
            <LabeledInput label="Entity ID" value={form.entityId} onChange={(v) => setForm({ ...form, entityId: v })} />
            <LabeledInput label="Department ID" value={form.departmentId} onChange={(v) => setForm({ ...form, departmentId: v })} />
            <LabeledInput label="Designation ID" value={form.designationId} onChange={(v) => setForm({ ...form, designationId: v })} />
            <LabeledInput label="Grade ID" value={form.gradeId} onChange={(v) => setForm({ ...form, gradeId: v })} />
            <LabeledInput label="Location ID" value={form.locationId} onChange={(v) => setForm({ ...form, locationId: v })} />
            <LabeledInput label="Branch ID" value={form.branchId} onChange={(v) => setForm({ ...form, branchId: v })} />

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide sm:col-span-2 pt-3 border-t">Manager IDs</p>
            <LabeledInput label="Reporting manager ID" value={form.reportingManagerId} onChange={(v) => setForm({ ...form, reportingManagerId: v })} />
            <LabeledInput label="Functional manager ID" value={form.functionalManagerId} onChange={(v) => setForm({ ...form, functionalManagerId: v })} />
            <LabeledInput label="HR manager ID" value={form.hrManagerId} onChange={(v) => setForm({ ...form, hrManagerId: v })} />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={onSubmitEdit} disabled={saving} className="min-w-24">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Action Dialog */}
      <Dialog open={action !== null} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === "transfer" && "Transfer Employee"}
              {action === "promote" && "Promote Employee"}
              {action === "status" && "Change Employee Status"}
            </DialogTitle>
            <DialogDescription>
              {action === "transfer" && "Reassign department, location, branch, or entity."}
              {action === "promote" && "Apply a new designation, grade, or revised CTC."}
              {action === "status" && "Update the employee's current status."}
            </DialogDescription>
          </DialogHeader>
          {action === "transfer" && (
            <div className="space-y-3 py-2">
              <LabeledInput label="New department ID" value={actionForm.departmentId} onChange={(v) => setActionForm({ ...actionForm, departmentId: v })} />
              <LabeledInput label="New location ID" value={actionForm.locationId} onChange={(v) => setActionForm({ ...actionForm, locationId: v })} />
              <LabeledInput label="New branch ID" value={actionForm.branchId} onChange={(v) => setActionForm({ ...actionForm, branchId: v })} />
              <LabeledInput label="New entity ID" value={actionForm.entityId} onChange={(v) => setActionForm({ ...actionForm, entityId: v })} />
              <div className="space-y-1.5">
                <Label className="text-xs">Reason</Label>
                <Textarea rows={2} value={actionForm.reason} onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })} placeholder="Brief reason for transfer" />
              </div>
            </div>
          )}
          {action === "promote" && (
            <div className="space-y-3 py-2">
              <LabeledInput label="New designation ID" value={actionForm.designationId} onChange={(v) => setActionForm({ ...actionForm, designationId: v })} />
              <LabeledInput label="New grade ID" value={actionForm.gradeId} onChange={(v) => setActionForm({ ...actionForm, gradeId: v })} />
              <LabeledInput label="New annual CTC (₹)" type="number" value={String(actionForm.newCtc || "")} onChange={(v) => setActionForm({ ...actionForm, newCtc: v })} />
              <LabeledInput label="Effective date" type="date" value={actionForm.effectiveDate} onChange={(v) => setActionForm({ ...actionForm, effectiveDate: v })} />
              <div className="space-y-1.5">
                <Label className="text-xs">Reason</Label>
                <Textarea rows={2} value={actionForm.reason} onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })} placeholder="Reason for promotion" />
              </div>
            </div>
          )}
          {action === "status" && (
            <div className="space-y-3 py-2">
              <LabeledSelect label="New status" value={actionForm.employeeStatus} options={["Active", "On Notice", "Resigned", "Terminated", "Absconded", "Retired", "Inactive", "Alumni"].map((v) => ({ label: v, value: v }))} onChange={(v) => setActionForm({ ...actionForm, employeeStatus: v })} />
              <LabeledInput label="Effective date" type="date" value={actionForm.effectiveDate} onChange={(v) => setActionForm({ ...actionForm, effectiveDate: v })} />
              <div className="space-y-1.5">
                <Label className="text-xs">Reason</Label>
                <Textarea rows={2} value={actionForm.reason} onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })} placeholder="Reason for status change" />
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setAction(null)} disabled={actionSaving}>Cancel</Button>
            <Button size="sm" onClick={onSubmitAction} disabled={actionSaving || saving} className="min-w-24">
              {(actionSaving || saving) ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ---------- subcomponents ----------
function FieldRow({ icon: Icon, label, value }: { icon: any; label: string; value?: React.ReactNode }) {
  const empty = value === undefined || value === null || value === ""
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground min-w-0 truncate">{label}</span>
      <span className={cn("ml-auto text-right truncate", empty ? "text-muted-foreground/50 italic text-xs" : "font-medium")}>
        {empty ? "—" : value}
      </span>
    </div>
  )
}
function NotAssigned() {
  return <span className="text-muted-foreground/50 italic text-xs">Not assigned</span>
}
function ManagerRow({ label, mgr }: { label: string; mgr: any }) {
  const name = mgrName(mgr)
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-teal-500/15 to-cyan-500/15 text-teal-700 dark:text-teal-300 text-xs font-semibold">
        {name ? name.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase() : "—"}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{name || "Not assigned"}</p>
        {mgr?.employeeCode && <p className="text-[10px] text-muted-foreground font-mono">{mgr.employeeCode}</p>}
      </div>
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
          {options.map((o) => <SelectItem key={o.value || "_"} value={o.value || "_"}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
