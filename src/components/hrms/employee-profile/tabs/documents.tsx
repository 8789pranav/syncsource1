"use client"

// ============================================================
// DocumentsTab — CRUD for EmployeeDocument.
// ------------------------------------------------------------
// API: /api/employees/[id]/documents
//   • GET  → { items: [...] }
//   • POST → creates a record
//   • PATCH /api/employees/[id]/documents/<recordId>
//   • DELETE /api/employees/[id]/documents/<recordId>
// ============================================================

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  FileText, FileCheck, FileWarning, FileX, FilePlus, Download, Eye,
  Pencil, Trash2, Plus, CheckCircle2, XCircle, Loader2, AlertTriangle,
  Upload, Search,
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

// ---------- helpers ----------
const fmtDate = (d?: string | Date | null) => {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return "—"
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}
function daysUntil(d?: string | Date | null): number | null {
  if (!d) return null
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return null
  return Math.ceil((dt.getTime() - Date.now()) / 86400000)
}

const CATEGORIES = ["Identity", "Address", "Education", "Experience", "Bank", "Joining", "Payroll", "Company Letter", "Exit", "Other"]
const STATUSES = ["Pending", "Uploaded", "Approved", "Rejected", "Expired", "Expiring soon"]

const statusColors: Record<string, string> = {
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Uploaded: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Expired: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  "Expiring soon": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
}
const categoryColors: Record<string, string> = {
  Identity: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Address: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Education: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Experience: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
  Bank: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Joining: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Payroll: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Company Letter": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Exit: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Other: "bg-muted text-muted-foreground",
}

interface DocRec {
  id: string
  name: string
  category?: string | null
  documentType?: string | null
  fileUrl?: string | null
  fileExt?: string | null
  fileSize?: number | null
  status: string
  expiryDate?: string | null
  uploadedAt?: string | null
  approvedAt?: string | null
  approvedBy?: string | null
  remarks?: string | null
  visibleToEmployee: boolean
}

const EMPTY_FORM = {
  name: "",
  category: "",
  documentType: "",
  fileUrl: "",
  fileExt: "",
  fileSize: "",
  expiryDate: "",
  visibleToEmployee: true,
  remarks: "",
}

// ---------- main ----------
export default function DocumentsTab({ employeeId }: { employeeId: string; employee: any }) {
  const [items, setItems] = React.useState<DocRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<DocRec | null>(null)
  const [form, setForm] = React.useState<Record<string, any>>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = React.useState<DocRec | null>(null)
  const [rejectRemarks, setRejectRemarks] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [catFilter, setCatFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/documents`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setItems(data.items || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load documents")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  const filtered = React.useMemo(() => {
    return items.filter((d) => {
      if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !(d.documentType || "").toLowerCase().includes(search.toLowerCase())) return false
      if (catFilter !== "all" && d.category !== catFilter) return false
      if (statusFilter !== "all" && d.status !== statusFilter) return false
      return true
    })
  }, [items, search, catFilter, statusFilter])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }
  const openEdit = (d: DocRec) => {
    setEditing(d)
    setForm({
      name: d.name || "",
      category: d.category || "",
      documentType: d.documentType || "",
      fileUrl: d.fileUrl || "",
      fileExt: d.fileExt || "",
      fileSize: d.fileSize ? String(d.fileSize) : "",
      expiryDate: d.expiryDate ? d.expiryDate.slice(0, 10) : "",
      visibleToEmployee: d.visibleToEmployee !== false,
      remarks: d.remarks || "",
    })
    setDialogOpen(true)
  }

  const onSave = async () => {
    if (!form.name.trim()) { toast.error("Document name is required"); return }
    setSaving(true)
    try {
      const payload: any = {
        name: form.name.trim(),
        category: form.category || null,
        documentType: form.documentType || null,
        fileUrl: form.fileUrl || null,
        fileExt: form.fileExt || null,
        fileSize: form.fileSize ? Number(form.fileSize) : null,
        expiryDate: form.expiryDate || null,
        visibleToEmployee: !!form.visibleToEmployee,
        remarks: form.remarks || null,
      }
      const url = editing
        ? `/api/employees/${employeeId}/documents/${editing.id}`
        : `/api/employees/${employeeId}/documents`
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
      toast.success(editing ? "Document updated" : "Document uploaded")
      setDialogOpen(false)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const onApprove = async (d: DocRec) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/documents/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Approved", approvedBy: "HR Admin", approvedAt: new Date().toISOString() }),
      })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Document approved")
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
      const res = await fetch(`/api/employees/${employeeId}/documents/${rejectTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Rejected", approvedBy: "HR Admin", approvedAt: new Date().toISOString(), remarks: rejectRemarks || "Rejected" }),
      })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Document rejected")
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
      const res = await fetch(`/api/employees/${employeeId}/documents/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      toast.success("Document deleted")
      setDeleteId(null)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete")
    } finally {
      setSaving(false)
    }
  }

  const pending = items.filter((d) => d.status === "Pending" || d.status === "Uploaded").length
  const approved = items.filter((d) => d.status === "Approved").length
  const expiringSoon = items.filter((d) => {
    if (d.status === "Expired") return false
    const days = daysUntil(d.expiryDate)
    return days !== null && days >= 0 && days <= 30
  }).length

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
          <h2 className="text-lg font-semibold">Documents</h2>
          <p className="text-sm text-muted-foreground">Upload, verify, and track employee documents with expiry alerts</p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" /> Upload Document
        </Button>
      </motion.div>

      {/* Expiring soon alert */}
      {expiringSoon > 0 && (
        <motion.div variants={itemVariants} className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            {expiringSoon} document{expiringSoon > 1 ? "s" : ""} expiring within 30 days. Please review and initiate renewal.
          </p>
        </motion.div>
      )}

      {/* Summary stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Documents" value={items.length} icon={FileText} accent="emerald" sub="On file" />
        <StatCard label="Pending Review" value={pending} icon={FileWarning} accent="amber" sub="Awaiting approval" />
        <StatCard label="Approved" value={approved} icon={FileCheck} accent="cyan" sub="Verified" />
        <StatCard label="Expiring Soon" value={expiringSoon} icon={AlertTriangle} accent="coral" sub="Within 30 days" />
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="pl-9 h-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Documents table */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : filtered.length === 0 ? (
          <SectionCard>
            <EmptyState
              icon={FileText}
              title={items.length === 0 ? "No documents uploaded yet" : "No documents match your filters"}
              description={items.length === 0 ? "Click 'Upload Document' to add the first document." : "Try adjusting your search or filters."}
              action={items.length === 0 ? (
                <Button size="sm" onClick={openAdd} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Upload Document
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
                    <TableHead className="text-xs font-semibold uppercase">Document</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Category</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Expiry</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Uploaded</TableHead>
                    <TableHead className="text-xs font-semibold uppercase">Approved By</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filtered.map((d) => {
                      const days = daysUntil(d.expiryDate)
                      const isExpiring = days !== null && days >= 0 && days <= 30 && d.status !== "Expired"
                      const isExpired = days !== null && days < 0 && d.status !== "Expired"
                      return (
                        <motion.tr
                          key={d.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-muted/30"
                        >
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                                d.fileExt === "pdf" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                              )}>
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{d.name}</p>
                                {d.documentType && <p className="text-xs text-muted-foreground truncate">{d.documentType}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {d.category ? (
                              <Badge variant="secondary" className={cn("text-[10px]", categoryColors[d.category] || "bg-muted text-muted-foreground")}>{d.category}</Badge>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn("text-[10px]", statusColors[d.status] || "bg-muted text-muted-foreground")}>{d.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {d.expiryDate ? (
                              <span className={cn(isExpiring || isExpired ? "text-amber-600 dark:text-amber-400 font-medium" : "")}>
                                {fmtDate(d.expiryDate)}
                                {isExpiring && <span className="block text-[10px]">in {days}d</span>}
                                {isExpired && <span className="block text-[10px] text-rose-600 dark:text-rose-400">expired</span>}
                              </span>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{fmtDate(d.uploadedAt)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{d.approvedBy || "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {d.fileUrl && (
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View" onClick={() => window.open(d.fileUrl!, "_blank")}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {(d.status === "Pending" || d.status === "Uploaded") && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700" title="Approve" onClick={() => onApprove(d)} disabled={saving}>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" title="Reject" onClick={() => { setRejectTarget(d); setRejectRemarks("") }} disabled={saving}>
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(d)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" onClick={() => setDeleteId(d.id)}>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Document" : "Upload Document"}</DialogTitle>
            <DialogDescription>{editing ? "Update the document details below." : "Add a new document record."}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Document Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Aadhaar Card" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={form.category || ""} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Document Type</Label>
              <Input value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })} placeholder="e.g. Aadhaar, PAN, Passport" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">File URL</Label>
              <Input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="/docs/file.pdf" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">File Extension</Label>
              <Input value={form.fileExt} onChange={(e) => setForm({ ...form, fileExt: e.target.value })} placeholder="pdf, jpg, png" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">File Size (KB)</Label>
              <Input type="number" value={form.fileSize} onChange={(e) => setForm({ ...form, fileSize: e.target.value })} placeholder="1024" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Expiry Date</Label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Remarks</Label>
              <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Optional notes" rows={2} />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">Visible to employee</p>
                <p className="text-xs text-muted-foreground">Employee can view this document in self-service</p>
              </div>
              <Switch checked={form.visibleToEmployee} onCheckedChange={(v) => setForm({ ...form, visibleToEmployee: v })} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={onSave} disabled={saving} className="min-w-24">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              {editing ? "Save Changes" : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>Provide a reason for rejecting "{rejectTarget?.name}".</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs">Rejection Reason</Label>
            <Textarea value={rejectRemarks} onChange={(e) => setRejectRemarks(e.target.value)} placeholder="e.g. Document is unclear, please re-upload" rows={3} />
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
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The document record will be permanently deleted.</AlertDialogDescription>
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
