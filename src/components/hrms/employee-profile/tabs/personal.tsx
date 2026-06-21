"use client"

// ============================================================
// PersonalTab — personal identity details.
// ------------------------------------------------------------
// Uses the `employee` prop (no separate API).
// Edit dialog → PATCH /api/employees/[id].
// Request Change → POST /api/employees/[id]/requests (type "Profile update")
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  User2, Mail, Phone, IdCard, Heart, Droplet, Globe, Sparkles,
  Pencil, Send, ShieldCheck, Eye, EyeOff, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { SectionCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

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
  const diff = Date.now() - dt.getTime()
  const age = Math.floor(diff / (365.25 * 86400000))
  return age >= 0 ? age : null
}
function maskValue(v?: string | null, reveal = false, suffix = 4) {
  if (!v) return "—"
  if (reveal) return v
  const s = String(v)
  if (s.length <= suffix) return "XXXX"
  return "XXXX" + s.slice(-suffix)
}

// ---------- main ----------
export default function PersonalTab({ employeeId, employee }: { employeeId: string; employee: any }) {
  const [editOpen, setEditOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState<Record<string, any>>({})
  const [reqOpen, setReqOpen] = React.useState(false)
  const [reqSaving, setReqSaving] = React.useState(false)
  const [reqField, setReqField] = React.useState("")
  const [reqReason, setReqReason] = React.useState("")
  const [reqValue, setReqValue] = React.useState("")
  const [reveal, setReveal] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    if (employee) {
      setForm({
        firstName: employee.firstName || "",
        middleName: employee.middleName || "",
        lastName: employee.lastName || "",
        displayName: employee.displayName || "",
        gender: employee.gender || "",
        dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : "",
        maritalStatus: employee.maritalStatus || "",
        bloodGroup: employee.bloodGroup || "",
        nationality: employee.nationality || "Indian",
        religion: employee.religion || "",
        category: employee.category || "",
        physicallyDisabled: employee.physicallyDisabled || false,
        disabilityDetails: employee.disabilityDetails || "",
        personalEmail: employee.personalEmail || "",
        mobileNumber: employee.mobileNumber || "",
        alternateNumber: employee.alternateNumber || "",
        passportNumber: employee.passportNumber || "",
        drivingLicense: employee.drivingLicense || "",
        voterId: employee.voterId || "",
        aadhaarNumber: employee.aadhaarNumber || "",
        panNumber: employee.panNumber || "",
      })
    }
  }, [employee])

  if (!employee) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    )
  }

  const age = calcAge(employee.dateOfBirth)

  const onPatch = async (payload: Record<string, any>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || data?.message || `Failed (${res.status})`)
      }
      toast.success("Personal details updated")
      setEditOpen(false)
    } catch (e: any) {
      toast.error(e?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const onSubmitEdit = () => {
    onPatch(form)
  }

  const onRequestChange = async () => {
    if (!reqField || !reqValue) {
      toast.error("Please select a field and enter the new value")
      return
    }
    setReqSaving(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "Profile update",
          title: `Update ${reqField}`,
          description: reqReason || `Self-service request to update ${reqField}`,
          payload: JSON.stringify({ field: reqField, newValue: reqValue }),
          status: "Pending",
        }),
      })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Change request submitted for approval")
      setReqOpen(false)
      setReqField(""); setReqValue(""); setReqReason("")
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit request")
    } finally {
      setReqSaving(false)
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
          <h2 className="text-lg font-semibold">Personal Details</h2>
          <p className="text-sm text-muted-foreground">Identity, contact, and government IDs for {employee.employeeCode}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setReqOpen(true)} className="gap-1.5">
            <Send className="h-4 w-4" /> Request Change
          </Button>
          <Button size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={itemVariants}>
          <SectionCard title="Personal Identity" description="Basic demographic information">
            <div className="space-y-2 text-sm">
              <FieldRow icon={User2} label="Full name" value={[employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" ")} />
              <FieldRow icon={User2} label="Display name" value={employee.displayName} />
              <FieldRow icon={User2} label="Gender" value={employee.gender} />
              <FieldRow icon={Sparkles} label="Date of birth" value={fmtDate(employee.dateOfBirth)} />
              <FieldRow icon={Sparkles} label="Age" value={age !== null ? `${age} years` : null} />
              <FieldRow icon={Heart} label="Marital status" value={employee.maritalStatus} />
              <FieldRow icon={Droplet} label="Blood group" value={employee.bloodGroup} />
              <FieldRow icon={Globe} label="Nationality" value={employee.nationality} />
              <FieldRow icon={Globe} label="Religion" value={employee.religion} />
              <FieldRow icon={Globe} label="Category" value={employee.category} />
              <FieldRow icon={ShieldCheck} label="Physically disabled" value={employee.physicallyDisabled ? "Yes" : "No"} />
              {employee.physicallyDisabled && (
                <FieldRow icon={ShieldCheck} label="Disability details" value={employee.disabilityDetails} />
              )}
            </div>
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard title="Contact Information" description="Personal contact details">
            <div className="space-y-2 text-sm">
              <FieldRow icon={Mail} label="Personal email" value={employee.personalEmail} />
              <FieldRow icon={Phone} label="Mobile" value={employee.mobileNumber} />
              <FieldRow icon={Phone} label="Alternate mobile" value={employee.alternateNumber} />
            </div>
            <div className="mt-4 pt-3 border-t border-border/60">
              <p className="text-xs text-muted-foreground mb-2">Self-service fields</p>
              <p className="text-xs text-muted-foreground/80">
                Use <span className="font-medium text-foreground">Request Change</span> to submit approval-required updates to your mobile, email, marital status, or address.
              </p>
            </div>
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard title="Identity Documents" description="Government-issued IDs (masked)">
            <div className="space-y-2 text-sm">
              <MaskedRow icon={IdCard} label="Aadhaar" value={employee.aadhaarNumber} reveal={reveal.aadhaar} onToggle={() => setReveal((r) => ({ ...r, aadhaar: !r.aadhaar }))} />
              <MaskedRow icon={IdCard} label="PAN" value={employee.panNumber} reveal={reveal.pan} onToggle={() => setReveal((r) => ({ ...r, pan: !r.pan }))} />
              <MaskedRow icon={IdCard} label="Passport" value={employee.passportNumber} reveal={reveal.passport} onToggle={() => setReveal((r) => ({ ...r, passport: !r.passport }))} />
              <MaskedRow icon={IdCard} label="Driving license" value={employee.drivingLicense} reveal={reveal.dl} onToggle={() => setReveal((r) => ({ ...r, dl: !r.dl }))} />
              <MaskedRow icon={IdCard} label="Voter ID" value={employee.voterId} reveal={reveal.voter} onToggle={() => setReveal((r) => ({ ...r, voter: !r.voter }))} />
            </div>
            <div className="mt-3 pt-3 border-t border-border/60">
              <Badge variant="outline" className="gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-3 w-3" /> Masked for privacy
              </Badge>
            </div>
          </SectionCard>
        </motion.div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Personal Details</DialogTitle>
            <DialogDescription>Update identity, contact, and ID documents. Changes apply immediately.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <LabeledInput label="First name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
            <LabeledInput label="Middle name" value={form.middleName} onChange={(v) => setForm({ ...form, middleName: v })} />
            <LabeledInput label="Last name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
            <LabeledInput label="Display name" value={form.displayName} onChange={(v) => setForm({ ...form, displayName: v })} />
            <LabeledSelect label="Gender" value={form.gender} options={["Male", "Female", "Other"].map((v) => ({ label: v, value: v }))} onChange={(v) => setForm({ ...form, gender: v })} />
            <LabeledInput label="Date of birth" type="date" value={form.dateOfBirth} onChange={(v) => setForm({ ...form, dateOfBirth: v })} />
            <LabeledSelect label="Marital status" value={form.maritalStatus} options={["Single", "Married", "Divorced", "Widowed"].map((v) => ({ label: v, value: v }))} onChange={(v) => setForm({ ...form, maritalStatus: v })} />
            <LabeledSelect label="Blood group" value={form.bloodGroup} options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((v) => ({ label: v, value: v }))} onChange={(v) => setForm({ ...form, bloodGroup: v })} />
            <LabeledInput label="Nationality" value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} />
            <LabeledInput label="Religion" value={form.religion} onChange={(v) => setForm({ ...form, religion: v })} />
            <LabeledSelect label="Category" value={form.category} options={["General", "OBC", "SC", "ST", "EWS"].map((v) => ({ label: v, value: v }))} onChange={(v) => setForm({ ...form, category: v })} />
            <div className="space-y-1.5">
              <Label className="text-xs">Physically disabled</Label>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={!!form.physicallyDisabled} onCheckedChange={(v) => setForm({ ...form, physicallyDisabled: v })} />
                <span className="text-sm text-muted-foreground">{form.physicallyDisabled ? "Yes" : "No"}</span>
              </div>
            </div>
            {form.physicallyDisabled && (
              <LabeledInput label="Disability details" value={form.disabilityDetails || ""} onChange={(v) => setForm({ ...form, disabilityDetails: v })} />
            )}
            <div className="sm:col-span-2 pt-2 border-t border-border/60 mt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact</p>
            </div>
            <LabeledInput label="Personal email" type="email" value={form.personalEmail} onChange={(v) => setForm({ ...form, personalEmail: v })} />
            <LabeledInput label="Mobile" type="tel" value={form.mobileNumber} onChange={(v) => setForm({ ...form, mobileNumber: v })} />
            <LabeledInput label="Alternate mobile" type="tel" value={form.alternateNumber} onChange={(v) => setForm({ ...form, alternateNumber: v })} />
            <div className="sm:col-span-2 pt-2 border-t border-border/60 mt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Identity Documents</p>
            </div>
            <LabeledInput label="Aadhaar number" value={form.aadhaarNumber} onChange={(v) => setForm({ ...form, aadhaarNumber: v })} />
            <LabeledInput label="PAN number" value={form.panNumber} onChange={(v) => setForm({ ...form, panNumber: v })} />
            <LabeledInput label="Passport number" value={form.passportNumber} onChange={(v) => setForm({ ...form, passportNumber: v })} />
            <LabeledInput label="Driving license" value={form.drivingLicense} onChange={(v) => setForm({ ...form, drivingLicense: v })} />
            <LabeledInput label="Voter ID" value={form.voterId} onChange={(v) => setForm({ ...form, voterId: v })} />
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

      {/* Request Change Dialog */}
      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Profile Change</DialogTitle>
            <DialogDescription>Submit an approval-required update for self-service fields.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Field to update</Label>
              <Select value={reqField} onValueChange={setReqField}>
                <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobileNumber">Mobile number</SelectItem>
                  <SelectItem value="personalEmail">Personal email</SelectItem>
                  <SelectItem value="maritalStatus">Marital status</SelectItem>
                  <SelectItem value="currentAddress">Current address</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">New value</Label>
              <Input value={reqValue} onChange={(e) => setReqValue(e.target.value)} placeholder="Enter the new value" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason (optional)</Label>
              <Input value={reqReason} onChange={(e) => setReqReason(e.target.value)} placeholder="Brief reason for change" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setReqOpen(false)} disabled={reqSaving}>Cancel</Button>
            <Button size="sm" onClick={onRequestChange} disabled={reqSaving} className="min-w-24">
              {reqSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
              Submit Request
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

function MaskedRow({ icon: Icon, label, value, reveal, onToggle }: { icon: any; label: string; value?: string | null; reveal?: boolean; onToggle?: () => void }) {
  const empty = !value
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground min-w-0 truncate">{label}</span>
      <span className={cn("ml-auto text-right font-mono", empty ? "text-muted-foreground/50 italic text-xs" : "text-sm font-medium")}>
        {empty ? "—" : maskValue(value, reveal, 4)}
      </span>
      {!empty && (
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onToggle}>
          {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      )}
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
