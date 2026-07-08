"use client"

import { apiFetch } from "@/lib/api-client"

// ============================================================================
//  Documents — Employee Documents (Task ID 4-emp-docs)
// ----------------------------------------------------------------------------
//  Real-DB-driven employee document management with folder/document hierarchy.
//  3-level drill-down:
//    Level 1 — Employees grid (with doc/folder counts, search, filters)
//    Level 2 — Employee root documents + folders sidebar
//    Level 3 — Folder documents view
//
//  Features:
//    • Real employees from /api/employees/with-doc-counts
//    • Folder CRUD (/api/employees/[id]/document-folders)
//    • Document CRUD (/api/employees/[id]/documents)
//    • "Uploaded by [user] · [relative time]" prominent on every doc card
//    • File-type accent colors (pdf=rose, img=sky, doc=violet, xls=emerald)
//    • Violet/purple theme accent
// ============================================================================

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  UserSquare, Upload, Filter, MoreHorizontal, Eye, FileText, Download,
  RefreshCw, History, CheckCircle2, XCircle, AlertTriangle,
  Pencil, FileUp, Plus, Search, Trash2, CalendarClock, Folder as FolderIcon,
  FolderOpen, FolderPlus, ChevronRight, ArrowLeft, File, Image as ImageIcon,
  FileSpreadsheet, FileSignature, HardDrive, Users, FolderClosed, Inbox,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  EMPLOYEE_DOC_CATEGORIES, STATUS_COLORS,
  formatDate, formatDateTime, initials, avatarColor,
} from "../shared"

// ============================================================================
//  Types
// ============================================================================
interface EmployeeLite {
  id: string
  employeeCode: string
  firstName: string
  lastName?: string | null
  displayName?: string | null
  profilePhotoUrl?: string | null
  officialEmail?: string | null
  employeeStatus?: string | null
  department: { name: string } | null
  designation: { name: string } | null
  entity: { legalName: string | null; tradeName: string | null } | null
  _count: { documents: number; folders: number; pending: number }
}

interface DocFolder {
  id: string
  tenantId: string
  employeeId: string
  name: string
  description: string | null
  color: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  docCount: number
  lastActivityAt: string
}

interface EmployeeDocRecord {
  id: string
  tenantId: string
  employeeId: string
  folderId: string | null
  folder: { id: string; name: string; color: string | null } | null
  name: string
  category: string | null
  documentType: string | null
  fileUrl: string | null
  fileExt: string | null
  fileSize: number | null
  status: string
  expiryDate: string | null
  uploadedAt: string
  uploadedBy: string | null
  approvedAt: string | null
  approvedBy: string | null
  remarks: string | null
  visibleToEmployee: boolean
  createdAt: string
  updatedAt: string
}

interface Department { id: string; name: string; code?: string | null }
interface Entity { id: string; legalName?: string | null; tradeName?: string | null; code?: string | null }

// ============================================================================
//  Helpers
// ============================================================================
function timeAgo(d?: string | Date | null): string {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return "—"
  const diff = Date.now() - dt.getTime()
  const sec = Math.round(diff / 1000)
  if (sec < 60) return "just now"
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d ago`
  const wk = Math.round(day / 7)
  if (wk < 5) return `${wk}w ago`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.round(day / 365)}y ago`
}

function formatBytes(n?: number | null): string {
  if (n === undefined || n === null || isNaN(n)) return "—"
  if (n === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(n) / Math.log(1024))
  const v = n / Math.pow(1024, i)
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

function empDisplayName(e: { firstName: string; lastName?: string | null; displayName?: string | null; employeeCode: string }): string {
  const dn = e.displayName?.trim()
  if (dn) return dn
  const joined = [e.firstName, e.lastName].filter(Boolean).join(" ").trim()
  return joined || e.employeeCode
}

// Folder color → tailwind classes for the icon tile + chip
const FOLDER_COLOR_MAP: Record<string, { tile: string; chip: string; ring: string }> = {
  violet:  { tile: "bg-violet-500/15 text-violet-600 dark:text-violet-400",       chip: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",       ring: "ring-violet-500/30" },
  emerald: { tile: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",    ring: "ring-emerald-500/30" },
  amber:   { tile: "bg-amber-500/15 text-amber-600 dark:text-amber-400",          chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",            ring: "ring-amber-500/30" },
  rose:    { tile: "bg-rose-500/15 text-rose-600 dark:text-rose-400",             chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",                ring: "ring-rose-500/30" },
  sky:     { tile: "bg-sky-500/15 text-sky-600 dark:text-sky-400",                chip: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",                    ring: "ring-sky-500/30" },
  cyan:    { tile: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",             chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",                ring: "ring-cyan-500/30" },
  slate:   { tile: "bg-slate-500/15 text-slate-600 dark:text-slate-400",          chip: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",            ring: "ring-slate-500/30" },
}
const FOLDER_COLORS = Object.keys(FOLDER_COLOR_MAP)
function folderColorClasses(color?: string | null) {
  const k = (color || "violet").toLowerCase()
  return FOLDER_COLOR_MAP[k] || FOLDER_COLOR_MAP.violet
}

// File type icon + accent
function fileIcon(fileExt?: string | null): { Icon: React.ComponentType<{ className?: string }>; tile: string } {
  const ext = (fileExt || "").toLowerCase().replace(/^\./, "")
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext))
    return { Icon: ImageIcon, tile: "bg-sky-500/15 text-sky-600 dark:text-sky-400" }
  if (["pdf"].includes(ext))
    return { Icon: FileText, tile: "bg-rose-500/15 text-rose-600 dark:text-rose-400" }
  if (["doc", "docx", "rtf"].includes(ext))
    return { Icon: FileText, tile: "bg-violet-500/15 text-violet-600 dark:text-violet-400" }
  if (["xls", "xlsx", "csv", "ods"].includes(ext))
    return { Icon: FileSpreadsheet, tile: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext))
    return { Icon: HardDrive, tile: "bg-amber-500/15 text-amber-600 dark:text-amber-400" }
  if (["ppt", "pptx"].includes(ext))
    return { Icon: FileSignature, tile: "bg-orange-500/15 text-orange-600 dark:text-orange-400" }
  return { Icon: File, tile: "bg-slate-500/15 text-slate-600 dark:text-slate-400" }
}

// ============================================================================
//  Motion presets
// ============================================================================
const gridContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const gridItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

// ============================================================================
//  Stat tile
// ============================================================================
function StatTile({ label, value, icon: Icon, accent, sub }: {
  label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>
  accent: "violet" | "emerald" | "amber" | "rose" | "sky" | "cyan"; sub?: string
}) {
  const map: Record<string, string> = {
    violet: "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400",
    sky: "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400",
    cyan: "from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400",
  }
  return (
    <Card className={cn("rounded-xl border border-border/60 shadow-soft bg-gradient-to-br", map[accent])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl font-semibold mt-1 text-foreground tabular-nums leading-none">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>}
          </div>
          <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background/70 ring-1 backdrop-blur-sm", map[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
//  Avatar helpers
// ============================================================================
function EmpAvatar({ emp, size = "h-10 w-10" }: { emp: EmployeeLite; size?: string }) {
  const name = empDisplayName(emp)
  return (
    <Avatar className={cn(size, "ring-2 ring-white dark:ring-slate-900 shadow-sm")}>
      {emp.profilePhotoUrl ? <AvatarImage src={emp.profilePhotoUrl} alt={name} /> : null}
      <AvatarFallback className={cn("text-xs font-semibold text-white", avatarColor(emp.id))}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

// ============================================================================
//  Document card (used in both root and folder views)
// ============================================================================
function DocCard({
  doc,
  onEdit,
  onDelete,
}: {
  doc: EmployeeDocRecord
  onEdit: () => void
  onDelete: () => void
}) {
  const { Icon, tile } = fileIcon(doc.fileExt)
  const statusCls = STATUS_COLORS[doc.status] || "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400"
  const cat = EMPLOYEE_DOC_CATEGORIES.find(c => c.value === doc.category)
  const catCls = cat?.color || "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400"
  const expirySoon = doc.expiryDate ? new Date(doc.expiryDate).getTime() - Date.now() < 7 * 86400000 : false

  return (
    <motion.div variants={gridItem}>
      <Card className="group relative h-full rounded-xl border border-border/60 shadow-soft transition-all hover:border-violet-400/50 hover:shadow-md overflow-hidden">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg ring-1 ring-inset ring-border/40", tile)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h4 className="font-semibold text-sm text-foreground truncate cursor-default">{doc.name}</h4>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{doc.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {doc.category && <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 h-5", catCls)}>{doc.category}</Badge>}
                {doc.documentType && <span className="text-[11px] text-muted-foreground truncate">{doc.documentType}</span>}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => toast.info("Preview not available in demo")}>
                  <Eye className="h-4 w-4 mr-2" /> View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info("Download not available in demo")}>
                  <Download className="h-4 w-4 mr-2" /> Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-500/10">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Uploaded by + when — the key requirement, prominent */}
          <div className="flex items-center gap-2 rounded-lg bg-violet-500/5 dark:bg-violet-500/10 px-2.5 py-2 ring-1 ring-inset ring-violet-500/15">
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <FileUp className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground leading-tight">Uploaded by</p>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs font-medium text-foreground truncate cursor-default">
                      {doc.uploadedBy || "HR Admin"}
                      <span className="text-muted-foreground font-normal"> · {timeAgo(doc.uploadedAt)}</span>
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">{formatDateTime(doc.uploadedAt)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary" className={cn("text-[10px] px-2 py-0 h-5", statusCls)}>{doc.status}</Badge>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {doc.fileExt && <span className="uppercase">{doc.fileExt.replace(/^\./, "")}</span>}
              {doc.fileSize ? <span>· {formatBytes(doc.fileSize)}</span> : null}
              {doc.expiryDate ? (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn("inline-flex items-center gap-1", expirySoon ? "text-amber-600 dark:text-amber-400 font-medium" : "")}>
                        · <CalendarClock className="h-3 w-3" />{formatDate(doc.expiryDate)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Expires {formatDate(doc.expiryDate)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
            </div>
          </div>

          {doc.remarks ? (
            <p className="text-[11px] text-muted-foreground line-clamp-2 italic border-t border-dashed border-border/60 pt-2">{doc.remarks}</p>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
//  Upload / Edit Document Dialog (shared)
// ============================================================================
interface DocFormValues {
  name: string
  category: string
  documentType: string
  expiryDate: string
  uploadedBy: string
  remarks: string
  fileExt: string
  fileSize: number | null
  fileName: string
}

function DocFormDialog({
  open,
  onClose,
  mode,
  initial,
  folderName,
  onSubmit,
  submitting,
}: {
  open: boolean
  onClose: () => void
  mode: "create" | "edit"
  initial?: Partial<EmployeeDocRecord>
  folderName?: string | null
  onSubmit: (values: DocFormValues) => Promise<void>
  submitting: boolean
}) {
  const blank: DocFormValues = {
    name: "", category: "", documentType: "", expiryDate: "",
    uploadedBy: "HR Admin", remarks: "", fileExt: "", fileSize: null, fileName: "",
  }
  const [form, setForm] = React.useState<DocFormValues>(blank)
  const [fileInputRef] = React.useState<React.RefObject<HTMLInputElement | null>>(() => React.createRef())

  React.useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name || "",
        category: initial?.category || "",
        documentType: initial?.documentType || "",
        expiryDate: initial?.expiryDate ? initial.expiryDate.slice(0, 10) : "",
        uploadedBy: initial?.uploadedBy || "HR Admin",
        remarks: initial?.remarks || "",
        fileExt: initial?.fileExt || "",
        fileSize: initial?.fileSize ?? null,
        fileName: "",
      })
    }
  }, [open, initial])

  const set = (k: keyof DocFormValues, v: string | number | null) => setForm(f => ({ ...f, [k]: v }))

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) {
      set("fileName", "")
      set("fileExt", "")
      set("fileSize", null)
      return
    }
    const ext = f.name.split(".").pop() || ""
    set("fileName", f.name)
    set("fileExt", ext)
    set("fileSize", f.size)
    // auto-fill name if empty
    setForm(prev => prev.name ? prev : { ...prev, name: f.name.replace(/\.[^.]+$/, "") })
  }

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Document name is required")
      return
    }
    await onSubmit(form)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-4 w-4 text-violet-500" />
            {mode === "create" ? "Upload Document" : "Edit Document"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Upload a new document for this employee. File storage is simulated — metadata is saved."
              : "Update the document details below."}
            {folderName ? (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                <FolderIcon className="h-3 w-3" /> Will be saved to folder: {folderName}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="doc-name">Document name <span className="text-rose-500">*</span></Label>
            <Input id="doc-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Aadhaar Card" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_DOC_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doc-type">Document type</Label>
              <Input id="doc-type" value={form.documentType} onChange={(e) => set("documentType", e.target.value)} placeholder="e.g. Aadhaar, PAN, Offer letter" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="doc-uploaded-by">Uploaded by</Label>
              <Input id="doc-uploaded-by" value={form.uploadedBy} onChange={(e) => set("uploadedBy", e.target.value)} placeholder="HR Admin" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doc-expiry">Expiry date</Label>
              <Input id="doc-expiry" type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
            </div>
          </div>

          {mode === "create" ? (
            <div className="grid gap-2">
              <Label htmlFor="doc-file">File</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  id="doc-file"
                  type="file"
                  className="hidden"
                  onChange={onFileChange}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <FileUp className="h-4 w-4 mr-1.5" /> Choose file
                </Button>
                {form.fileName ? (
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {form.fileName} <span className="text-slate-400">· {formatBytes(form.fileSize)}</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">No file chosen — metadata-only record will be created.</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5">
              File: <span className="font-medium text-foreground">{form.fileExt ? form.fileExt.toUpperCase() : "—"}</span>
              {form.fileSize ? <span> · {formatBytes(form.fileSize)}</span> : null}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="doc-remarks">Remarks</Label>
            <Textarea id="doc-remarks" rows={2} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Optional notes" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90">
            {submitting ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
            {mode === "create" ? "Upload" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Folder form dialog (used for create + rename)
// ============================================================================
interface FolderFormValues { name: string; description: string; color: string; createdBy: string }
function FolderFormDialog({
  open, onClose, mode, initial, onSubmit, submitting,
}: {
  open: boolean; onClose: () => void; mode: "create" | "rename"
  initial?: Partial<DocFolder>
  onSubmit: (v: FolderFormValues) => Promise<void>
  submitting: boolean
}) {
  const blank: FolderFormValues = { name: "", description: "", color: "violet", createdBy: "HR Admin" }
  const [form, setForm] = React.useState<FolderFormValues>(blank)
  React.useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name || "",
        description: initial?.description || "",
        color: initial?.color || "violet",
        createdBy: initial?.createdBy || "HR Admin",
      })
    }
  }, [open, initial])
  const set = (k: keyof FolderFormValues, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Folder name is required")
      return
    }
    await onSubmit(form)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-violet-500" />
            {mode === "create" ? "New Folder" : "Rename Folder"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a folder to organise this employee's documents."
              : "Update the folder name, description or colour."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="folder-name">Folder name <span className="text-rose-500">*</span></Label>
            <Input id="folder-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Onboarding, Offer Letters, 2024 Payslips" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="folder-desc">Description</Label>
            <Textarea id="folder-desc" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional — what goes in this folder?" />
          </div>
          <div className="grid gap-2">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map(c => {
                const cls = folderColorClasses(c)
                const active = form.color === c
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("color", c)}
                    className={cn(
                      "h-9 w-9 rounded-lg grid place-items-center transition-all",
                      cls.tile,
                      active ? cn("ring-2 ring-offset-2 ring-offset-background", cls.ring) : "ring-1 ring-inset ring-border/40 hover:scale-110"
                    )}
                    title={c}
                    aria-label={c}
                  >
                    {active ? <CheckCircle2 className="h-4 w-4" /> : <FolderIcon className="h-4 w-4" />}
                  </button>
                )
              })}
            </div>
          </div>
          {mode === "create" ? (
            <div className="grid gap-2">
              <Label htmlFor="folder-created-by">Created by</Label>
              <Input id="folder-created-by" value={form.createdBy} onChange={(e) => set("createdBy", e.target.value)} placeholder="HR Admin" />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90">
            {submitting ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <FolderPlus className="h-4 w-4 mr-1.5" />}
            {mode === "create" ? "Create folder" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Skeletons
// ============================================================================
function EmpGridSkeleton() {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="rounded-xl border border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DocGridSkeleton() {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="rounded-xl border border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-3">
              <Skeleton className="h-11 w-11 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="flex justify-between">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ============================================================================
//  Empty state
// ============================================================================
function EmptyState({ icon: Icon, title, desc, action }: {
  icon: React.ComponentType<{ className?: string }>
  title: string; desc?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 rounded-xl border border-dashed border-border/70 bg-muted/20">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-violet-500/10 text-violet-500 mb-3">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      {desc ? <p className="text-sm text-muted-foreground mt-1 max-w-sm">{desc}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

// ============================================================================
//  MAIN SECTION
// ============================================================================
export function EmployeeDocumentsSection() {
  // ----- top-level view state -----
  const [view, setView] = React.useState<"employees" | "documents">("employees")
  const [selectedEmployee, setSelectedEmployee] = React.useState<EmployeeLite | null>(null)
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null)

  // ----- employees list state -----
  const [empSearch, setEmpSearch] = React.useState("")
  const [empDept, setEmpDept] = React.useState<string>("")
  const [empEntity, setEmpEntity] = React.useState<string>("")
  const [employees, setEmployees] = React.useState<EmployeeLite[]>([])
  const [employeesLoading, setEmployeesLoading] = React.useState(true)
  const [employeesError, setEmployeesError] = React.useState<string | null>(null)
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [entities, setEntities] = React.useState<Entity[]>([])

  // ----- documents + folders state (for the selected employee) -----
  const [documents, setDocuments] = React.useState<EmployeeDocRecord[]>([])
  const [folders, setFolders] = React.useState<DocFolder[]>([])
  const [docsLoading, setDocsLoading] = React.useState(false)
  const [foldersLoading, setFoldersLoading] = React.useState(false)
  const [docSearch, setDocSearch] = React.useState("")
  const [docCategory, setDocCategory] = React.useState<string>("")

  // ----- dialog state -----
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<EmployeeDocRecord | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [folderFormOpen, setFolderFormOpen] = React.useState(false)
  const [folderFormMode, setFolderFormMode] = React.useState<"create" | "rename">("create")
  const [folderFormInitial, setFolderFormInitial] = React.useState<DocFolder | null>(null)
  const [deleteDocTarget, setDeleteDocTarget] = React.useState<EmployeeDocRecord | null>(null)
  const [deleteFolderTarget, setDeleteFolderTarget] = React.useState<DocFolder | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // ------------------------------------------------------------------
  // Fetch employees (with counts)
  // ------------------------------------------------------------------
  const fetchEmployees = React.useCallback(async () => {
    setEmployeesLoading(true)
    setEmployeesError(null)
    try {
      const params = new URLSearchParams()
      if (empSearch) params.set("q", empSearch)
      if (empDept) params.set("departmentId", empDept)
      if (empEntity) params.set("entityId", empEntity)
      const qs = params.toString()
      const res = await apiFetch(`/api/employees/with-doc-counts${qs ? `?${qs}` : ""}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEmployees(data.items || [])
    } catch (e: any) {
      setEmployeesError(e?.message || "Failed to load employees")
    } finally {
      setEmployeesLoading(false)
    }
  }, [empSearch, empDept, empEntity])

  React.useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  // Fetch department + entity filters once
  React.useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [dRes, eRes] = await Promise.all([
          apiFetch("/api/departments", { cache: "no-store" }),
          apiFetch("/api/entities", { cache: "no-store" }),
        ])
        const dJson = await dRes.json()
        const eJson = await eRes.json()
        if (!alive) return
        setDepartments((dJson.items || []).map((d: any) => ({ id: d.id, name: d.name, code: d.code })))
        setEntities((eJson.items || []).map((e: any) => ({ id: e.id, legalName: e.legalName, tradeName: e.tradeName, code: e.code })))
      } catch {
        // best-effort
      }
    })()
    return () => { alive = false }
  }, [])

  // ------------------------------------------------------------------
  // Fetch documents + folders for the selected employee
  // ------------------------------------------------------------------
  const fetchDocuments = React.useCallback(async () => {
    if (!selectedEmployee) return
    setDocsLoading(true)
    try {
      const res = await apiFetch(`/api/employees/${selectedEmployee.id}/documents`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setDocuments(data.items || [])
    } catch (e: any) {
      toast.error("Failed to load documents", { description: e?.message })
      setDocuments([])
    } finally {
      setDocsLoading(false)
    }
  }, [selectedEmployee])

  const fetchFolders = React.useCallback(async () => {
    if (!selectedEmployee) return
    setFoldersLoading(true)
    try {
      const res = await apiFetch(`/api/employees/${selectedEmployee.id}/document-folders`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setFolders(data.items || [])
    } catch (e: any) {
      toast.error("Failed to load folders", { description: e?.message })
      setFolders([])
    } finally {
      setFoldersLoading(false)
    }
  }, [selectedEmployee])

  React.useEffect(() => {
    if (view === "documents" && selectedEmployee) {
      fetchDocuments()
      fetchFolders()
    }
  }, [view, selectedEmployee, fetchDocuments, fetchFolders])

  // ------------------------------------------------------------------
  // Derived: documents shown in current view (root or folder)
  // ------------------------------------------------------------------
  const visibleDocs = React.useMemo(() => {
    let list = documents
    if (selectedFolderId) {
      list = list.filter(d => d.folderId === selectedFolderId)
    } else {
      list = list.filter(d => !d.folderId)
    }
    if (docSearch) {
      const q = docSearch.toLowerCase()
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.documentType || "").toLowerCase().includes(q) ||
        (d.uploadedBy || "").toLowerCase().includes(q)
      )
    }
    if (docCategory) list = list.filter(d => d.category === docCategory)
    return list
  }, [documents, selectedFolderId, docSearch, docCategory])

  const rootDocCount = React.useMemo(() => documents.filter(d => !d.folderId).length, [documents])
  const pendingCount = React.useMemo(() => documents.filter(d => d.status === "Pending Verification" || d.status === "Pending Upload" || d.status === "Pending").length, [documents])

  const selectedFolder = React.useMemo(() => folders.find(f => f.id === selectedFolderId) || null, [folders, selectedFolderId])

  // ------------------------------------------------------------------
  // Mutations
  // ------------------------------------------------------------------
  const refresh = React.useCallback(async () => {
    await Promise.all([fetchDocuments(), fetchFolders(), fetchEmployees()])
  }, [fetchDocuments, fetchFolders, fetchEmployees])

  const handleUploadSubmit = async (v: DocFormValues) => {
    if (!selectedEmployee) return
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: v.name.trim(),
        category: v.category || null,
        documentType: v.documentType || null,
        expiryDate: v.expiryDate || null,
        uploadedBy: v.uploadedBy || "HR Admin",
        remarks: v.remarks || null,
        fileExt: v.fileExt || null,
        fileSize: v.fileSize,
        status: "Uploaded",
      }
      if (selectedFolderId) payload.folderId = selectedFolderId
      const res = await apiFetch(`/api/employees/${selectedEmployee.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${res.status}`)
      }
      toast.success("Document uploaded", {
        description: `${v.name} · uploaded by ${v.uploadedBy || "HR Admin"}`,
      })
      setUploadOpen(false)
      await refresh()
    } catch (e: any) {
      toast.error("Upload failed", { description: e?.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (v: DocFormValues) => {
    if (!selectedEmployee || !editTarget) return
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/employees/${selectedEmployee.id}/documents/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: v.name.trim(),
          category: v.category || null,
          documentType: v.documentType || null,
          expiryDate: v.expiryDate || null,
          uploadedBy: v.uploadedBy || "HR Admin",
          remarks: v.remarks || null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${res.status}`)
      }
      toast.success("Document updated", { description: v.name })
      setEditOpen(false)
      setEditTarget(null)
      await refresh()
    } catch (e: any) {
      toast.error("Update failed", { description: e?.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteDoc = async () => {
    if (!selectedEmployee || !deleteDocTarget) return
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/employees/${selectedEmployee.id}/documents/${deleteDocTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${res.status}`)
      }
      toast.success("Document deleted", { description: deleteDocTarget.name })
      setDeleteDocTarget(null)
      await refresh()
    } catch (e: any) {
      toast.error("Delete failed", { description: e?.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateFolder = async (v: FolderFormValues) => {
    if (!selectedEmployee) return
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/employees/${selectedEmployee.id}/document-folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: v.name.trim(),
          description: v.description || null,
          color: v.color,
          createdBy: v.createdBy || "HR Admin",
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${res.status}`)
      }
      toast.success("Folder created", { description: v.name })
      setFolderFormOpen(false)
      await refresh()
    } catch (e: any) {
      toast.error("Create folder failed", { description: e?.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRenameFolder = async (v: FolderFormValues) => {
    if (!selectedEmployee || !folderFormInitial) return
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/employees/${selectedEmployee.id}/document-folders/${folderFormInitial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: v.name.trim(),
          description: v.description || null,
          color: v.color,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${res.status}`)
      }
      toast.success("Folder updated", { description: v.name })
      setFolderFormOpen(false)
      setFolderFormInitial(null)
      await refresh()
    } catch (e: any) {
      toast.error("Update folder failed", { description: e?.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteFolder = async () => {
    if (!selectedEmployee || !deleteFolderTarget) return
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/employees/${selectedEmployee.id}/document-folders/${deleteFolderTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${res.status}`)
      }
      const data = await res.json().catch(() => ({}))
      const moved = data.movedToRoot ?? 0
      toast.success("Folder deleted", { description: `${deleteFolderTarget.name} — ${moved} document${moved === 1 ? "" : "s"} moved to root.` })
      setSelectedFolderId(null)
      setDeleteFolderTarget(null)
      await refresh()
    } catch (e: any) {
      toast.error("Delete folder failed", { description: e?.message })
    } finally {
      setSubmitting(false)
    }
  }

  // ------------------------------------------------------------------
  // Navigation handlers
  // ------------------------------------------------------------------
  const openEmployee = (emp: EmployeeLite) => {
    setSelectedEmployee(emp)
    setSelectedFolderId(null)
    setDocSearch("")
    setDocCategory("")
    setView("documents")
  }
  const backToEmployees = () => {
    setView("employees")
    setSelectedEmployee(null)
    setSelectedFolderId(null)
  }
  const backToRoot = () => setSelectedFolderId(null)

  // ------------------------------------------------------------------
  // Stats row (employees view)
  // ------------------------------------------------------------------
  const totalDocs = employees.reduce((s, e) => s + (e._count?.documents || 0), 0)
  const totalFolders = employees.reduce((s, e) => s + (e._count?.folders || 0), 0)
  const totalPending = employees.reduce((s, e) => s + (e._count?.pending || 0), 0)

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full">
      <AnimatePresence mode="wait">
        {view === "employees" ? (
          <motion.div
            key="employees"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <UserSquare className="h-5 w-5 text-violet-500" />
                  Employee Documents
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Browse real employees and manage their documents & folders.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchEmployees}
                disabled={employeesLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1.5", employeesLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatTile label="Employees" value={employees.length} icon={Users} accent="violet" sub="Real employees from DB" />
              <StatTile label="Total Documents" value={totalDocs} icon={FileText} accent="sky" sub="Across all employees" />
              <StatTile label="Total Folders" value={totalFolders} icon={FolderOpen} accent="emerald" sub="Organisational folders" />
              <StatTile label="Pending" value={totalPending} icon={AlertTriangle} accent="amber" sub="Pending verification" />
            </div>

            {/* Filters */}
            <Card className="rounded-xl border border-border/60">
              <CardContent className="p-4 flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, code or email…"
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={empDept} onValueChange={setEmpDept}>
                  <SelectTrigger className="sm:w-48 w-full"><SelectValue placeholder="All departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={empEntity} onValueChange={setEmpEntity}>
                  <SelectTrigger className="sm:w-48 w-full"><SelectValue placeholder="All entities" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All entities</SelectItem>
                    {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.tradeName || e.legalName || e.code || "Entity"}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(empSearch || empDept || empEntity) ? (
                  <Button variant="ghost" size="sm" onClick={() => { setEmpSearch(""); setEmpDept(""); setEmpEntity("") }}>
                    <Filter className="h-4 w-4 mr-1" /> Clear
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            {/* Employees grid */}
            {employeesLoading ? (
              <EmpGridSkeleton />
            ) : employeesError ? (
              <EmptyState
                icon={AlertTriangle}
                title="Couldn't load employees"
                desc={employeesError}
                action={<Button onClick={fetchEmployees} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1.5" /> Retry</Button>}
              />
            ) : employees.length === 0 ? (
              <EmptyState icon={Inbox} title="No employees found" desc="Try adjusting your search or filters." />
            ) : (
              <motion.div
                variants={gridContainer}
                initial="hidden"
                animate="show"
                className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {employees.map(emp => {
                  const name = empDisplayName(emp)
                  return (
                    <motion.div key={emp.id} variants={gridItem}>
                      <Card
                        role="button"
                        tabIndex={0}
                        onClick={() => openEmployee(emp)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEmployee(emp) } }}
                        className="group cursor-pointer rounded-xl border border-border/60 shadow-soft transition-all hover:border-violet-400/60 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <EmpAvatar emp={emp} />
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-sm text-foreground truncate">{name}</h3>
                              <p className="text-[11px] text-muted-foreground truncate">{emp.employeeCode}</p>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {emp.department?.name || "—"}{emp.designation?.name ? ` · ${emp.designation.name}` : ""}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <Separator className="my-3" />
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] h-5 bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
                              <FileText className="h-3 w-3 mr-1" />
                              {emp._count?.documents || 0} doc{(emp._count?.documents || 0) === 1 ? "" : "s"}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                              <FolderIcon className="h-3 w-3 mr-1" />
                              {emp._count?.folders || 0} folder{(emp._count?.folders || 0) === 1 ? "" : "s"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </motion.div>
        ) : null}

        {view === "documents" && selectedEmployee ? (
          <motion.div
            key="documents"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm flex-wrap">
              <Button variant="ghost" size="sm" onClick={backToEmployees} className="text-muted-foreground hover:text-foreground h-7 px-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> Employee Documents
              </Button>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <button
                onClick={backToRoot}
                className={cn(
                  "px-2 py-0.5 rounded-md text-sm",
                  selectedFolderId ? "text-muted-foreground hover:text-foreground hover:bg-muted" : "text-foreground font-medium"
                )}
              >
                {empDisplayName(selectedEmployee)}
              </button>
              {selectedFolder ? (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="px-2 py-0.5 rounded-md text-sm font-medium text-foreground">{selectedFolder.name}</span>
                </>
              ) : null}
            </div>

            {/* Employee header strip */}
            <Card className="rounded-xl border border-border/60 bg-gradient-to-br from-violet-500/5 to-transparent">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <EmpAvatar emp={selectedEmployee} size="h-14 w-14" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-lg text-foreground truncate">{empDisplayName(selectedEmployee)}</h2>
                      <Badge variant="secondary" className="text-[10px] h-5 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{selectedEmployee.employeeCode}</Badge>
                      {selectedEmployee.employeeStatus ? (
                        <Badge variant="secondary" className={cn("text-[10px] h-5", STATUS_COLORS[selectedEmployee.employeeStatus] || "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400")}>
                          {selectedEmployee.employeeStatus}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {selectedEmployee.department?.name || "—"}{selectedEmployee.designation?.name ? ` · ${selectedEmployee.designation.name}` : ""}
                    </p>
                    {selectedEmployee.officialEmail ? (
                      <p className="text-[11px] text-muted-foreground truncate">{selectedEmployee.officialEmail}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setFolderFormMode("create"); setFolderFormInitial(null); setFolderFormOpen(true) }}
                  >
                    <FolderPlus className="h-4 w-4 mr-1.5" /> New Folder
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setUploadOpen(true)}
                    className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
                  >
                    <Upload className="h-4 w-4 mr-1.5" /> Upload Document
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Two-column layout: folders sidebar + documents grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Folders sidebar */}
              <div className="lg:col-span-1">
                <Card className="rounded-xl border border-border/60 sticky top-2">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5" /> Folders
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] text-violet-600 hover:text-violet-700 dark:text-violet-400"
                        onClick={() => { setFolderFormMode("create"); setFolderFormInitial(null); setFolderFormOpen(true) }}
                      >
                        <Plus className="h-3 w-3 mr-0.5" /> New
                      </Button>
                    </div>

                    {foldersLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                      </div>
                    ) : (
                      <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-1 pr-1">
                          {/* All Documents (root) entry */}
                          <button
                            onClick={backToRoot}
                            className={cn(
                              "w-full flex items-center gap-2.5 rounded-lg p-2.5 text-left transition-all",
                              !selectedFolderId
                                ? "bg-violet-500/10 ring-1 ring-inset ring-violet-500/30"
                                : "hover:bg-muted"
                            )}
                          >
                            <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", "bg-violet-500/15 text-violet-600 dark:text-violet-400")}>
                              <FolderClosed className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">All Documents</p>
                              <p className="text-[11px] text-muted-foreground">{rootDocCount} doc{rootDocCount === 1 ? "" : "s"} · root level</p>
                            </div>
                          </button>

                          {folders.length === 0 ? (
                            <p className="text-center text-xs text-muted-foreground italic py-4 px-2">
                              No folders yet. Click "New Folder" to organise documents.
                            </p>
                          ) : (
                            folders.map(f => {
                              const cls = folderColorClasses(f.color)
                              const active = selectedFolderId === f.id
                              return (
                                <div
                                  key={f.id}
                                  className={cn(
                                    "group relative flex items-center gap-2.5 rounded-lg p-2.5 transition-all",
                                    active ? cn("ring-1 ring-inset", cls.ring, cls.tile) : "hover:bg-muted"
                                  )}
                                >
                                  <button
                                    onClick={() => setSelectedFolderId(f.id)}
                                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                                  >
                                    <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", cls.tile)}>
                                      <FolderIcon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                                      <p className="text-[11px] text-muted-foreground truncate">
                                        {f.docCount} doc{f.docCount === 1 ? "" : "s"}
                                        {f.createdBy ? ` · ${f.createdBy}` : ""}
                                      </p>
                                    </div>
                                  </button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                      <DropdownMenuItem onClick={() => { setFolderFormMode("rename"); setFolderFormInitial(f); setFolderFormOpen(true) }}>
                                        <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => setDeleteFolderTarget(f)} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-500/10">
                                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Documents grid */}
              <div className="lg:col-span-2 space-y-3">
                {/* Folder info bar (when in a folder) */}
                {selectedFolder ? (
                  <Card className={cn("rounded-xl border", folderColorClasses(selectedFolder.color).ring, "ring-1 ring-inset")}>
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", folderColorClasses(selectedFolder.color).tile)}>
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate">{selectedFolder.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {selectedFolder.description || "No description"}
                          {selectedFolder.createdBy ? ` · Created by ${selectedFolder.createdBy}` : ""}
                          {" · "}{formatDate(selectedFolder.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setFolderFormMode("rename"); setFolderFormInitial(selectedFolder); setFolderFormOpen(true) }}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Rename
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteFolderTarget(selectedFolder)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete folder
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Documents header (heading + count + upload + filters) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {selectedFolder ? (
                      <><FileText className="h-4 w-4 text-violet-500" /> Documents in folder ({visibleDocs.length})</>
                    ) : (
                      <><FileText className="h-4 w-4 text-violet-500" /> All Documents ({visibleDocs.length})</>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search docs…"
                        value={docSearch}
                        onChange={(e) => setDocSearch(e.target.value)}
                        className="pl-8 h-8 w-40 sm:w-48 text-sm"
                      />
                    </div>
                    <Select value={docCategory} onValueChange={setDocCategory}>
                      <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="All categories" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {EMPLOYEE_DOC_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => setUploadOpen(true)}
                      className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" /> {selectedFolder ? "Upload to folder" : "Upload"}
                    </Button>
                  </div>
                </div>

                {/* Documents grid */}
                {docsLoading ? (
                  <DocGridSkeleton />
                ) : visibleDocs.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title={selectedFolder ? "This folder is empty" : "No documents yet"}
                    desc={selectedFolder ? "Upload a document to this folder." : "Upload the first document for this employee."}
                    action={
                      <Button size="sm" onClick={() => setUploadOpen(true)} className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90">
                        <Upload className="h-4 w-4 mr-1.5" /> Upload Document
                      </Button>
                    }
                  />
                ) : (
                  <motion.div
                    variants={gridContainer}
                    initial="hidden"
                    animate="show"
                    className="grid gap-3 grid-cols-1 sm:grid-cols-2"
                  >
                    {visibleDocs.map(doc => (
                      <DocCard
                        key={doc.id}
                        doc={doc}
                        onEdit={() => { setEditTarget(doc); setEditOpen(true) }}
                        onDelete={() => setDeleteDocTarget(doc)}
                      />
                    ))}
                  </motion.div>
                )}

                {/* Pending + count footer info */}
                {!docsLoading && documents.length > 0 ? (
                  <p className="text-[11px] text-muted-foreground pt-1">
                    {documents.length} total document{documents.length === 1 ? "" : "s"}
                    {pendingCount > 0 ? ` · ${pendingCount} pending verification` : ""}
                    {folders.length > 0 ? ` · ${folders.length} folder${folders.length === 1 ? "" : "s"}` : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ---------- Dialogs ---------- */}
      <DocFormDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        mode="create"
        folderName={selectedFolder?.name}
        onSubmit={handleUploadSubmit}
        submitting={submitting}
      />
      <DocFormDialog
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditTarget(null) }}
        mode="edit"
        initial={editTarget || undefined}
        folderName={editTarget?.folder?.name}
        onSubmit={handleEditSubmit}
        submitting={submitting}
      />
      <FolderFormDialog
        open={folderFormOpen}
        onClose={() => { setFolderFormOpen(false); setFolderFormInitial(null) }}
        mode={folderFormMode}
        initial={folderFormInitial || undefined}
        onSubmit={folderFormMode === "create" ? handleCreateFolder : handleRenameFolder}
        submitting={submitting}
      />

      {/* Delete document confirm */}
      <AlertDialog open={!!deleteDocTarget} onOpenChange={(o) => !o && setDeleteDocTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium text-foreground">{deleteDocTarget?.name}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteDoc() }}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {submitting ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete folder confirm */}
      <AlertDialog open={!!deleteFolderTarget} onOpenChange={(o) => !o && setDeleteFolderTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder "{deleteFolderTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Documents inside this folder will be <span className="font-medium text-foreground">moved to the root level</span>, not deleted.
              You can re-organise them into other folders afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteFolder() }}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {submitting ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default EmployeeDocumentsSection
