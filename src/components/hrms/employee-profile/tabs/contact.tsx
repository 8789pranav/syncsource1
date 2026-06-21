"use client"

// ============================================================
// ContactTab — address + emergency contact + communication.
// ------------------------------------------------------------
// Uses the `employee` prop.
// Edit dialog → PATCH /api/employees/[id].
// "Copy current to permanent" → PATCH sameAsCurrent=true and all permanent* = current*
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  MapPin, Home as HomeIcon, Phone, Mail, User2, Copy,
  Pencil, Loader2, CheckCircle2, MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { SectionCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- main ----------
export default function ContactTab({ employeeId, employee }: { employeeId: string; employee: any }) {
  const [editOpen, setEditOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState<Record<string, any>>({})

  React.useEffect(() => {
    if (employee) {
      setForm({
        currentAddress: employee.currentAddress || "",
        currentAddressLine2: employee.currentAddressLine2 || "",
        currentCity: employee.currentCity || "",
        currentState: employee.currentState || "",
        currentCountry: employee.currentCountry || "",
        currentPincode: employee.currentPincode || "",
        currentLandmark: employee.currentLandmark || "",
        permanentAddress: employee.permanentAddress || "",
        permanentAddressLine2: employee.permanentAddressLine2 || "",
        permanentCity: employee.permanentCity || "",
        permanentState: employee.permanentState || "",
        permanentCountry: employee.permanentCountry || "",
        permanentPincode: employee.permanentPincode || "",
        sameAsCurrent: employee.sameAsCurrent || false,
        emergencyContactName: employee.emergencyContactName || "",
        emergencyContactRelation: employee.emergencyContactRelation || "",
        emergencyContactPhone: employee.emergencyContactPhone || "",
        emergencyContactAltPhone: employee.emergencyContactAltPhone || "",
        emergencyContactEmail: employee.emergencyContactEmail || "",
        emergencyContactAddress: employee.emergencyContactAddress || "",
        communicationPreference: employee.communicationPreference || "Email",
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

  const onPatch = async (payload: Record<string, any>, successMsg = "Contact details updated") => {
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
      toast.success(successMsg)
      setEditOpen(false)
    } catch (e: any) {
      toast.error(e?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const onSubmitEdit = () => onPatch(form)

  const onCopyToPermanent = async () => {
    await onPatch({
      sameAsCurrent: true,
      permanentAddress: employee.currentAddress,
      permanentAddressLine2: employee.currentAddressLine2,
      permanentCity: employee.currentCity,
      permanentState: employee.currentState,
      permanentCountry: employee.currentCountry,
      permanentPincode: employee.currentPincode,
      permanentLandmark: employee.currentLandmark,
    }, "Permanent address copied from current")
  }

  const addressesMatch = employee.sameAsCurrent || (
    employee.currentAddress === employee.permanentAddress &&
    employee.currentCity === employee.permanentCity &&
    employee.currentPincode === employee.permanentPincode
  )

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
          <h2 className="text-lg font-semibold">Contact & Address</h2>
          <p className="text-sm text-muted-foreground">Current and permanent addresses, emergency contact, communication preferences</p>
        </div>
        <Button size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={itemVariants}>
          <SectionCard
            title="Current Address"
            description="Where the employee currently resides"
            action={
              <Badge variant="outline" className="gap-1 text-emerald-700 dark:text-emerald-300">
                <HomeIcon className="h-3 w-3" /> Current
              </Badge>
            }
          >
            <AddressFields emp={employee} prefix="current" />
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard
            title="Permanent Address"
            description="Permanent home address"
            action={
              <div className="flex items-center gap-2">
                {addressesMatch && (
                  <Badge variant="outline" className="gap-1 text-cyan-700 dark:text-cyan-300">
                    <CheckCircle2 className="h-3 w-3" /> Same as current
                  </Badge>
                )}
                {!addressesMatch && (
                  <Button variant="ghost" size="sm" onClick={onCopyToPermanent} disabled={saving} className="gap-1 h-7 text-xs">
                    <Copy className="h-3 w-3" /> Copy current
                  </Button>
                )}
              </div>
            }
          >
            <AddressFields emp={employee} prefix="permanent" />
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard title="Emergency Contact" description="Person to contact in case of emergency">
            <div className="space-y-2 text-sm">
              <FieldRow icon={User2} label="Name" value={employee.emergencyContactName} />
              <FieldRow icon={User2} label="Relation" value={employee.emergencyContactRelation} />
              <FieldRow icon={Phone} label="Phone" value={employee.emergencyContactPhone} />
              <FieldRow icon={Phone} label="Alt phone" value={employee.emergencyContactAltPhone} />
              <FieldRow icon={Mail} label="Email" value={employee.emergencyContactEmail} />
              <FieldRow icon={MapPin} label="Address" value={employee.emergencyContactAddress} />
            </div>
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SectionCard title="Communication Preference" description="How the employee prefers to be contacted">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{employee.communicationPreference || "Email"}</p>
                <p className="text-xs text-muted-foreground">Primary channel for HR communications</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["Email", "SMS", "WhatsApp"].map((p) => (
                <div key={p} className={cn(
                  "rounded-lg border p-2 text-center text-xs",
                  employee.communicationPreference === p
                    ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 font-medium"
                    : "border-border/60 text-muted-foreground"
                )}>
                  {p}
                </div>
              ))}
            </div>
          </SectionCard>
        </motion.div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact & Address</DialogTitle>
            <DialogDescription>Update current/permanent address, emergency contact, and communication preference.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide sm:col-span-2 pt-1">Current Address</p>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Address line 1</Label>
              <Textarea rows={2} value={form.currentAddress} onChange={(e) => setForm({ ...form, currentAddress: e.target.value })} />
            </div>
            <LabeledInput label="Address line 2" value={form.currentAddressLine2} onChange={(v) => setForm({ ...form, currentAddressLine2: v })} />
            <LabeledInput label="Landmark" value={form.currentLandmark} onChange={(v) => setForm({ ...form, currentLandmark: v })} />
            <LabeledInput label="City" value={form.currentCity} onChange={(v) => setForm({ ...form, currentCity: v })} />
            <LabeledInput label="State" value={form.currentState} onChange={(v) => setForm({ ...form, currentState: v })} />
            <LabeledInput label="Country" value={form.currentCountry} onChange={(v) => setForm({ ...form, currentCountry: v })} />
            <LabeledInput label="Pincode" value={form.currentPincode} onChange={(v) => setForm({ ...form, currentPincode: v })} />

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide sm:col-span-2 pt-3 border-t">Permanent Address</p>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Address line 1</Label>
              <Textarea rows={2} value={form.permanentAddress} onChange={(e) => setForm({ ...form, permanentAddress: e.target.value })} />
            </div>
            <LabeledInput label="Address line 2" value={form.permanentAddressLine2} onChange={(v) => setForm({ ...form, permanentAddressLine2: v })} />
            <LabeledInput label="City" value={form.permanentCity} onChange={(v) => setForm({ ...form, permanentCity: v })} />
            <LabeledInput label="State" value={form.permanentState} onChange={(v) => setForm({ ...form, permanentState: v })} />
            <LabeledInput label="Country" value={form.permanentCountry} onChange={(v) => setForm({ ...form, permanentCountry: v })} />
            <LabeledInput label="Pincode" value={form.permanentPincode} onChange={(v) => setForm({ ...form, permanentPincode: v })} />

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide sm:col-span-2 pt-3 border-t">Emergency Contact</p>
            <LabeledInput label="Name" value={form.emergencyContactName} onChange={(v) => setForm({ ...form, emergencyContactName: v })} />
            <LabeledInput label="Relation" value={form.emergencyContactRelation} onChange={(v) => setForm({ ...form, emergencyContactRelation: v })} />
            <LabeledInput label="Phone" type="tel" value={form.emergencyContactPhone} onChange={(v) => setForm({ ...form, emergencyContactPhone: v })} />
            <LabeledInput label="Alt phone" type="tel" value={form.emergencyContactAltPhone} onChange={(v) => setForm({ ...form, emergencyContactAltPhone: v })} />
            <LabeledInput label="Email" type="email" value={form.emergencyContactEmail} onChange={(v) => setForm({ ...form, emergencyContactEmail: v })} />
            <LabeledInput label="Address" value={form.emergencyContactAddress} onChange={(v) => setForm({ ...form, emergencyContactAddress: v })} />

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide sm:col-span-2 pt-3 border-t">Communication</p>
            <LabeledSelect label="Preferred channel" value={form.communicationPreference} options={["Email", "SMS", "WhatsApp"].map((v) => ({ label: v, value: v }))} onChange={(v) => setForm({ ...form, communicationPreference: v })} />
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
    </motion.div>
  )
}

// ---------- subcomponents ----------
function AddressFields({ emp, prefix }: { emp: any; prefix: "current" | "permanent" }) {
  const address = emp[`${prefix}Address`]
  const line2 = emp[`${prefix}AddressLine2`]
  const landmark = emp[`${prefix}Landmark`]
  const city = emp[`${prefix}City`]
  const state = emp[`${prefix}State`]
  const country = emp[`${prefix}Country`]
  const pincode = emp[`${prefix}Pincode`]
  const hasData = address || city || pincode
  return (
    <div className="space-y-2 text-sm">
      {hasData ? (
        <>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="font-medium">{address || "—"}</p>
            {line2 && <p className="text-muted-foreground">{line2}</p>}
            <p className="text-muted-foreground">
              {[city, state].filter(Boolean).join(", ")}
              {pincode && ` - ${pincode}`}
            </p>
            {country && <p className="text-muted-foreground">{country}</p>}
            {landmark && <p className="text-xs text-muted-foreground mt-1">Landmark: {landmark}</p>}
          </div>
        </>
      ) : (
        <div className="py-6 text-center text-muted-foreground text-sm">
          <MapPin className="h-7 w-7 mx-auto text-muted-foreground/40 mb-1" />
          Address not provided
        </div>
      )}
    </div>
  )
}

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
