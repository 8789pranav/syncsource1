"use client"

// ============================================================
// FormsTab — CRUD for EmployeeFormSubmission.
// ------------------------------------------------------------
// API: /api/employees/[id]/forms
//   • GET  → { items: [...] }
//   • POST → creates a record
//   • PATCH /api/employees/[id]/forms/<recordId>
//   • DELETE /api/employees/[id]/forms/<recordId>
// ============================================================

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  FileText, FileCheck, FileX, FilePlus, Plus, Eye, Pencil, Trash2,
  CheckCircle2, XCircle, Loader2, Download, Send, FileEdit,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"

// ---------- helpers ----------
const fmtDate = (d?: string | Date | null) => {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return "—"
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

const FORM_CODES = [
  { code: "joining", name: "Joining Form", accent: "emerald" },
  { code: "policy_declaration", name: "Policy Declaration", accent: "cyan" },
  { code: "asset_declaration", name: "Asset Declaration", accent: "teal" },
  { code: "medical", name: "Medical Declaration", accent: "amber" },
  { code: "nominee", name: "Nominee Declaration", accent: "fuchsia" },
  { code: "travel", name: "Travel Declaration", accent: "cyan" },
  { code: "wfh", name: "WFH Declaration", accent: "teal" },
  { code: "custom", name: "Custom HR Request", accent: "muted" },
]

const statusColors: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Submitted: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

const formCodeColors: Record<string, string> = {
  joining: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  policy_declaration: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  asset_declaration: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  medical: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  nominee: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
  travel: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  wfh: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  custom: "bg-muted text-muted-foreground",
}

interface FormRec {
  id: string
  formCode: string
  formName?: string | null
  version: number
  data?: string | null
  status: string
  submittedAt?: string | null
  approvedAt?: string | null
  approvedBy?: string | null
  remarks?: string | null
  pdfUrl?: string | null
  createdAt?: string | null
}

// Form field definitions per code
const FORM_FIELDS: Record<string, { key: string; label: string; type: string; placeholder?: string; options?: string[] }[]> = {
  joining: [
    { key: "personalEmail", label: "Personal Email", type: "email", placeholder: "name@gmail.com" },
    { key: "mobileNumber", label: "Mobile Number", type: "tel", placeholder: "+91-9876543210" },
    { key: "emergencyContactName", label: "Emergency Contact Name", type: "text" },
    { key: "emergencyContactPhone", label: "Emergency Contact Phone", type: "tel" },
    { key: "bloodGroup", label: "Blood Group", type: "select", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
    { key: "currentAddress", label: "Current Address", type: "textarea" },
  ],
  policy_declaration: [
    { key: "acceptedPolicies", label: "I accept all company policies", type: "switch" },
    { key: "signature", label: "Digital Signature", type: "text", placeholder: "Type your full name" },
  ],
  asset_declaration: [
    { key: "laptopReceived", label: "Laptop Received", type: "switch" },
    { key: "laptopSerialNumber", label: "Laptop Serial Number", type: "text" },
    { key: "monitorReceived", label: "Monitor Received", type: "switch" },
    { key: "otherAssets", label: "Other Assets Received", type: "textarea" },
  ],
  medical: [
    { key: "bloodGroup", label: "Blood Group", type: "select", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
    { key: "allergies", label: "Known Allergies", type: "textarea" },
    { key: "medications", label: "Current Medications", type: "textarea" },
    { key: "emergencyMedication", label: "Emergency Medication Needed", type: "switch" },
  ],
  nominee: [
    { key: "nomineeName", label: "Nominee Name", type: "text" },
    { key: "nomineeRelationship", label: "Relationship", type: "text" },
    { key: "nomineePercentage", label: "Nominee Percentage", type: "number" },
    { key: "nomineeDob", label: "Nominee Date of Birth", type: "date" },
  ],
  travel: [
    { key: "destination", label: "Destination", type: "text" },
    { key: "travelFromDate", label: "Travel From Date", type: "date" },
    { key: "travelToDate", label: "Travel To Date", type: "date" },
    { key: "purpose", label: "Purpose of Travel", type: "textarea" },
    { key: "estimatedCost", label: "Estimated Cost (₹)", type: "number" },
  ],
  wfh: [
    { key: "wfhAddress", label: "WFH Address", type: "textarea" },
    { key: "wfhFromDate", label: "WFH From Date", type: "date" },
    { key: "wfhToDate", label: "WFH To Date", type: "date" },
    { key: "reason", label: "Reason for WFH", type: "textarea" },
  ],
  custom: [
    { key: "requestDetails", label: "Request Details", type: "textarea" },
  ],
}

// ---------- main ----------
export default function FormsTab({ employeeId }: { employeeId: string; employee: any }) {
  const [items, setItems] = React.useState<FormRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [fillOpen, setFillOpen] = React.useState(false)
  const [selectedFormCode, setSelectedFormCode] = React.useState<string>("")
  const [formValues, setFormValues] = React.useState<Record<string, any>>({})
  const [saving, setSaving] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [viewTarget, setViewTarget] = React.useState<FormRec | null>(null)
  const [rejectTarget, setRejectTarget] = React.useState<FormRec | null>(null)
  const [rejectRemarks, setRejectRemarks] = React.useState("")
  const [codeFilter, setCodeFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/forms`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setItems(data.items || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load forms")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  const filtered = React.useMemo(() => {
    return items.filter((f) => {
      if (codeFilter !== "all" && f.formCode !== codeFilter) return false
      if (statusFilter !== "all" && f.status !== statusFilter) return false
      return true
    })
  }, [items, codeFilter, statusFilter])

  const onSelectForm = (code: string) => {
    setSelectedFormCode(code)
    setFormValues({})
  }

  const onSubmitForm = async () => {
    if (!selectedFormCode) { toast.error("Please select a form type"); return }
    const formDef = FORM_FIELDS[selectedFormCode]
    if (!formDef) { toast.error("Unknown form type"); return }
    // Validate required fields (basic — check non-empty for text/textarea/number/date)
    for (const f of formDef) {
      if (f.type !== "switch" && f.type !== "checkbox") {
        const v = formValues[f.key]
        if (v === undefined || v === null || v === "") {
          // allow empty for now (no hard required)
        }
      }
    }
    setSaving(true)
    try {
      const formMeta = FORM_CODES.find((c) => c.code === selectedFormCode)
      const res = await apiFetch(`/api/employees/${employeeId}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formCode: selectedFormCode,
          formName: formMeta?.name || selectedFormCode,
          version: 1,
          data: JSON.stringify(formValues),
          status: "Submitted",
          submittedAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `Failed (${res.status})`)
      }
      toast.success(`${formMeta?.name || "Form"} submitted successfully`)
      setFillOpen(false)
      setSelectedFormCode("")
      setFormValues({})
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit form")
    } finally {
      setSaving(false)
    }
  }

  const onApprove = async (f: FormRec) => {
    setSaving(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/forms/${f.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Approved", approvedBy: "HR Admin", approvedAt: new Date().toISOString() }),
      })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Form approved")
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to approve")
    } finally {
      setSaving(false)
    }
  }

  const onReject = async () => {
    if (!rejectTarget) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/forms/${rejectTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Rejected", approvedBy: "HR Admin", approvedAt: new Date().toISOString(), remarks: rejectRemarks || "Rejected" }),
      })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Form rejected")
      setRejectTarget(null)
      setRejectRemarks("")
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to reject")
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/forms/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Form deleted")
      setDeleteId(null)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete")
    } finally {
      setSaving(false)
    }
  }

  const draftCount = items.filter((f) => f.status === "Draft").length
  const submittedCount = items.filter((f) => f.status === "Submitted").length
  const approvedCount = items.filter((f) => f.status === "Approved").length

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
          <h2 className="text-lg font-semibold">Employee Forms</h2>
          <p className="text-sm text-muted-foreground">Fill, submit, and track declarations and HR forms</p>
        </div>
        <Button size="sm" onClick={() => { setFillOpen(true); setSelectedFormCode(""); setFormValues({}) }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Fill Form
        </Button>
      </motion.div>

      {/* Summary stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Forms" value={items.length} icon={FileText} accent="emerald" sub="Submitted" />
        <StatCard label="Drafts" value={draftCount} icon={FileEdit} accent="cyan" sub="Not submitted" />
        <StatCard label="Pending Review" value={submittedCount} icon={FilePlus} accent="amber" sub="Awaiting approval" />
        <StatCard label="Approved" value={approvedCount} icon={FileCheck} accent="emerald" sub="Completed" />
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <Select value={codeFilter} onValueChange={setCodeFilter}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Form type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Form Types</SelectItem>
            {FORM_CODES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Submitted">Submitted</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Forms table */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : filtered.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon={FileText}
              title={items.length === 0 ? "No forms submitted yet" : "No forms match your filters"}
              description={items.length === 0 ? "Click 'Fill Form' to submit your first declaration." : "Try adjusting your filters."}
              action={items.length === 0 ? (
                <Button size="sm" onClick={() => { setFillOpen(true); setSelectedFormCode(""); setFormValues({}) }} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Fill Form
                </Button>
              ) : undefined}
            />
          </SectionCard>
        ) : (
          <SectionCard>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase">Form</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Version</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Submitted</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Approved By</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filtered.map((f) => {
                      const meta = FORM_CODES.find((c) => c.code === f.formCode)
                      return (
                        <motion.tr
                          key={f.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-muted/30"
                        >
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <FileText className="h-4 w-4" />
                              </div>
                              <span className="font-medium">{f.formName || f.formCode}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn("text-[10px]", formCodeColors[f.formCode] || "bg-muted text-muted-foreground")}>
                              {meta?.name || f.formCode}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">v{f.version}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn("text-[10px]", statusColors[f.status] || "bg-muted text-muted-foreground")}>
                              {f.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{fmtDate(f.submittedAt)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{f.approvedBy || "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View" onClick={() => setViewTarget(f)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {f.status === "Submitted" && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700" title="Approve" onClick={() => onApprove(f)} disabled={saving}>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" title="Reject" onClick={() => { setRejectTarget(f); setRejectRemarks("") }} disabled={saving}>
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {f.pdfUrl && (
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Download PDF" onClick={() => toast.info("Generating PDF...")}>
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" onClick={() => setDeleteId(f.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        )}
      </motion.div>

      {/* Fill Form Dialog */}
      <Dialog open={fillOpen} onOpenChange={setFillOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fill Form</DialogTitle>
            <DialogDescription>Select a form type and fill in the required details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Form Type <span className="text-destructive">*</span></Label>
              <Select value={selectedFormCode} onValueChange={onSelectForm}>
                <SelectTrigger><SelectValue placeholder="Select a form type..." /></SelectTrigger>
                <SelectContent>
                  {FORM_CODES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedFormCode && FORM_FIELDS[selectedFormCode] && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                {FORM_FIELDS[selectedFormCode].map((field) => {
                  if (field.type === "switch") {
                    return (
                      <div key={field.key} className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border/60 p-3">
                        <p className="text-sm font-medium">{field.label}</p>
                        <Switch checked={!!formValues[field.key]} onCheckedChange={(v) => setFormValues({ ...formValues, [field.key]: v })} />
                      </div>
                    )
                  }
                  if (field.type === "textarea") {
                    return (
                      <div key={field.key} className="sm:col-span-2 space-y-1.5">
                        <Label className="text-xs">{field.label}</Label>
                        <Textarea value={formValues[field.key] || ""} onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })} placeholder={field.placeholder} rows={3} />
                      </div>
                    )
                  }
                  if (field.type === "select") {
                    return (
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-xs">{field.label}</Label>
                        <Select value={formValues[field.key] || ""} onValueChange={(v) => setFormValues({ ...formValues, [field.key]: v })}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {(field.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  }
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs">{field.label}</Label>
                      <Input
                        type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
                        value={formValues[field.key] || ""}
                        onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setFillOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={onSubmitForm} disabled={saving || !selectedFormCode} className="min-w-24">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
              Submit Form
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewTarget?.formName || "Form Details"}</DialogTitle>
            <DialogDescription>
              Submitted {fmtDate(viewTarget?.submittedAt)} · v{viewTarget?.version}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {viewTarget?.data ? (
              (() => {
                let parsed: Record<string, any> = {}
                try { parsed = JSON.parse(viewTarget.data) } catch { /* ignore */ }
                const entries = Object.entries(parsed)
                if (entries.length === 0) return <p className="text-sm text-muted-foreground">No data captured.</p>
                return (
                  <div className="rounded-lg border border-border/60 divide-y">
                    {entries.map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-4 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.replace(/([A-Z])/g, " $1").trim()}</p>
                        <p className="text-sm font-medium text-right max-w-[60%] break-words">
                          {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v || "—")}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              })()
            ) : (
              <p className="text-sm text-muted-foreground">No data captured.</p>
            )}
            {viewTarget?.remarks && (
              <div className="mt-3 p-3 rounded-lg bg-muted/40">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Remarks</p>
                <p className="text-sm">{viewTarget.remarks}</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setViewTarget(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Form</DialogTitle>
            <DialogDescription>Provide a reason for rejecting "{rejectTarget?.formName}".</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs">Rejection Reason</Label>
            <Textarea value={rejectRemarks} onChange={(e) => setRejectRemarks(e.target.value)} placeholder="e.g. Please re-fill with complete details" rows={3} />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setRejectTarget(null)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={onReject} disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white min-w-24">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete form submission?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The form record will be permanently deleted.</AlertDialogDescription>
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
    </motion.div>
  )
}
