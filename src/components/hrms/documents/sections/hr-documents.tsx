"use client"

import { apiFetch } from "@/lib/api-client"

// ============================================================================
//  Documents — HR Documents (Task ID 4-hr-docs)
// ----------------------------------------------------------------------------
//  Company-wide HR / policy document management with folder hierarchy.
//  2-level layout:
//    Level 1 — Root view: folders sidebar + documents grid (root level)
//    Level 2 — Folder view: documents inside the selected folder
//
//  Features:
//    • Folder CRUD (POST/PATCH/DELETE /api/hr-documents/folders)
//    • Document CRUD (POST/PATCH/DELETE /api/hr-documents)
//    • "Uploaded by [user] · [relative time]" prominent on every doc card
//    • Delete folder moves its docs to root (not deleted)
//    • Violet/purple theme accent
// ============================================================================

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Building2, Plus, MoreHorizontal, Eye, FileText, Download,
  RefreshCw, FileUp, Search, Pencil, Trash2, Folder as FolderIcon,
  FolderOpen, FolderPlus, ChevronRight, ArrowLeft, File, Image as ImageIcon,
  FileSpreadsheet, FileSignature, HardDrive, Inbox, ShieldAlert,
  CheckCircle2, FileCheck2, Users, Upload,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
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
  HR_DOC_CATEGORIES, STATUS_COLORS, VISIBILITY_RULES,
  formatDate, formatDateTime,
} from "../shared"

// ============================================================================
//  Types
// ============================================================================
interface HRFolder {
  id: string
  name: string
  description?: string | null
  color?: string | null
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  docCount?: number
  lastActivityAt?: string
}
interface HRDoc {
  id: string
  folderId?: string | null
  folder?: { id: string; name: string; color: string | null } | null
  name: string
  category?: string | null
  entityId?: string | null
  department?: string | null
  visibleTo: string
  status: string
  fileUrl?: string | null
  fileExt?: string | null
  fileSize?: number | null
  version?: string | null
  description?: string | null
  remarks?: string | null
  acknowledgmentRequired: boolean
  acknowledgmentDueDate?: string | null
  uploadedBy?: string | null
  uploadedAt: string
  createdAt: string
  updatedAt: string
}

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

// Folder color → tailwind classes
const FOLDER_COLOR_MAP: Record<string, { tile: string; chip: string; ring: string }> = {
  violet:  { tile: "bg-violet-500/15 text-violet-600 dark:text-violet-400",    chip: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",    ring: "ring-violet-500/30" },
  emerald: { tile: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400", ring: "ring-emerald-500/30" },
  amber:   { tile: "bg-amber-500/15 text-amber-600 dark:text-amber-400",       chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",       ring: "ring-amber-500/30" },
  rose:    { tile: "bg-rose-500/15 text-rose-600 dark:text-rose-400",          chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",          ring: "ring-rose-500/30" },
  sky:     { tile: "bg-sky-500/15 text-sky-600 dark:text-sky-400",             chip: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",             ring: "ring-sky-500/30" },
  cyan:    { tile: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",          chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",          ring: "ring-cyan-500/30" },
  slate:   { tile: "bg-slate-500/15 text-slate-600 dark:text-slate-400",       chip: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",       ring: "ring-slate-500/30" },
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

// ---------- motion ----------
const gridContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const gridItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

// ============================================================================
//  Stat tile
// ============================================================================
function StatTile({ label, value, icon: Icon, accent, sub }: {
  label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>
  accent: "violet" | "emerald" | "amber" | "sky" | "cyan" | "slate"; sub?: string
}) {
  const map: Record<string, string> = {
    violet: "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
    sky: "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400",
    cyan: "from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400",
    slate: "from-slate-500/15 to-slate-500/5 text-slate-600 dark:text-slate-400",
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
//  Folder Dialog (create / rename)
// ============================================================================
function FolderDialog({ open, onClose, onSave, initial }: {
  open: boolean
  onClose: () => void
  onSave: (data: { name: string; description: string; color: string }) => Promise<void>
  initial?: HRFolder | null
}) {
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [color, setColor] = React.useState("violet")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setName(initial?.name || "")
      setDescription(initial?.description || "")
      setColor(initial?.color || "violet")
    }
  }, [open, initial])

  const submit = async () => {
    if (!name.trim()) { toast.error("Folder name is required"); return }
    setSaving(true)
    try {
      await onSave({ name: name.trim(), description: description.trim(), color })
      onClose()
    } catch (e: any) {
      toast.error(e?.message || "Failed to save folder")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-violet-600" />
            {initial ? "Rename Folder" : "New Folder"}
          </DialogTitle>
          <DialogDescription>
            {initial ? "Update folder details." : "Create a new folder to organize HR documents."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Folder name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Leave Policies 2024" className="bg-background" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" rows={2} className="bg-background resize-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Color</Label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map(c => {
                const cls = folderColorClasses(c)
                return (
                  <button
                    key={c} type="button"
                    onClick={() => setColor(c)}
                    className={cn("h-8 w-8 rounded-lg grid place-items-center ring-2 ring-offset-2 ring-offset-background transition", cls.tile, color === c ? cls.ring : "ring-transparent")}
                    title={c}
                  >
                    {color === c && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
            {saving ? "Saving…" : initial ? "Save changes" : "Create folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Document Dialog (upload / edit)
// ============================================================================
function DocDialog({ open, onClose, onSave, initial, folderName }: {
  open: boolean
  onClose: () => void
  onSave: (data: Partial<HRDoc> & { name: string }) => Promise<void>
  initial?: HRDoc | null
  folderName?: string | null
}) {
  const [form, setForm] = React.useState({
    name: "", category: "", visibleTo: "All Employees",
    status: "Published", description: "", remarks: "",
    uploadedBy: "HR Admin", version: "1.0",
    acknowledgmentRequired: false,
    fileName: "", fileExt: "", fileSize: 0 as number | null,
  })
  const [saving, setSaving] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name || "",
        category: initial?.category || "",
        visibleTo: initial?.visibleTo || "All Employees",
        status: initial?.status || "Published",
        description: initial?.description || "",
        remarks: initial?.remarks || "",
        uploadedBy: initial?.uploadedBy || "HR Admin",
        version: initial?.version || "1.0",
        acknowledgmentRequired: initial?.acknowledgmentRequired || false,
        fileName: initial?.fileUrl || "",
        fileExt: initial?.fileExt || "",
        fileSize: initial?.fileSize ?? null,
      })
    }
  }, [open, initial])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const ext = f.name.split(".").pop() || ""
    set("fileName", f.name)
    set("fileExt", ext)
    set("fileSize", f.size)
    if (!form.name) set("name", f.name.replace(/\.[^.]+$/, ""))
  }

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Document name is required"); return }
    setSaving(true)
    try {
      await onSave({
        name: form.name.trim(),
        category: form.category || null,
        visibleTo: form.visibleTo,
        status: form.status,
        description: form.description || null,
        remarks: form.remarks || null,
        uploadedBy: form.uploadedBy || "HR Admin",
        version: form.version || "1.0",
        acknowledgmentRequired: form.acknowledgmentRequired,
        fileUrl: form.fileName || null,
        fileExt: form.fileExt || null,
        fileSize: form.fileSize,
      })
      onClose()
    } catch (e: any) {
      toast.error(e?.message || "Failed to save document")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-4 w-4 text-violet-600" />
            {initial ? "Edit HR Document" : "Upload HR Document"}
          </DialogTitle>
          <DialogDescription>
            {initial ? "Update document details." : "Add a new HR / policy document."}
            {folderName && (
              <Badge variant="secondary" className="ml-2 bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
                <FolderIcon className="h-3 w-3 mr-1" /> {folderName}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Document name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Leave Policy 2024" className="bg-background" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={v => set("category", v)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {HR_DOC_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Published">Published</SelectItem>
                    <SelectItem value="Unpublished">Unpublished</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Visible to</Label>
                <Select value={form.visibleTo} onValueChange={v => set("visibleTo", v)}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_RULES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Uploaded by</Label>
                <Input value={form.uploadedBy} onChange={e => set("uploadedBy", e.target.value)} placeholder="HR Admin" className="bg-background" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">File</Label>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <FileUp className="h-3.5 w-3.5 mr-1.5" /> Choose file
                </Button>
                {form.fileName ? (
                  <span className="text-xs text-muted-foreground truncate">
                    {form.fileName} <span className="text-slate-400">· {formatBytes(form.fileSize)}</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">No file chosen (metadata only)</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief description of this document" rows={2} className="bg-background resize-none" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Remarks</Label>
              <Textarea value={form.remarks} onChange={e => set("remarks", e.target.value)} placeholder="Optional remarks" rows={2} className="bg-background resize-none" />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-sm font-medium">Acknowledgment required</p>
                  <p className="text-[11px] text-muted-foreground">Employees must acknowledge this document</p>
                </div>
              </div>
              <Switch checked={form.acknowledgmentRequired} onCheckedChange={v => set("acknowledgmentRequired", v)} />
            </div>

            <p className="text-[11px] text-muted-foreground bg-muted/30 rounded-md p-2">
              Note: File storage is simulated in this demo. File metadata (name, size, type) is saved.
            </p>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
            {saving ? "Saving…" : initial ? "Save changes" : "Upload document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Document card
// ============================================================================
function DocCard({ doc, onEdit, onDelete }: {
  doc: HRDoc
  onEdit: () => void
  onDelete: () => void
}) {
  const { Icon, tile } = fileIcon(doc.fileExt)
  const statusCls = STATUS_COLORS[doc.status] || "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400"
  const cat = HR_DOC_CATEGORIES.find(c => c.value === doc.category)
  return (
    <motion.div variants={gridItem}>
      <Card className="rounded-xl border border-border/60 shadow-soft hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition group overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", tile)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold leading-tight line-clamp-2">{doc.name}</h4>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-60 group-hover:opacity-100">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toast.info("Preview not available in demo")}>
                      <Eye className="h-3.5 w-3.5 mr-2" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info("Download not available in demo")}>
                      <Download className="h-3.5 w-3.5 mr-2" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete} className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-500/10">
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {doc.category && (
                  <Badge variant="secondary" className={cn("text-[10px] h-5", cat?.color || "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400")}>
                    {doc.category}
                  </Badge>
                )}
                <Badge variant="secondary" className={cn("text-[10px] h-5", statusCls)}>{doc.status}</Badge>
                {doc.acknowledgmentRequired && (
                  <Badge variant="secondary" className="text-[10px] h-5 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                    <FileCheck2 className="h-3 w-3 mr-1" /> Ack
                  </Badge>
                )}
              </div>
              {/* WHO uploaded + WHEN — the key requirement */}
              <div className="flex items-center gap-1.5 mt-2 text-[11px]">
                <div className="grid h-5 w-5 place-items-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[9px] font-semibold shrink-0">
                  {(doc.uploadedBy || "HR").slice(0, 1).toUpperCase()}
                </div>
                <span className="font-medium text-foreground/80">{doc.uploadedBy || "HR Admin"}</span>
                <span className="text-muted-foreground">· {timeAgo(doc.uploadedAt)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5" title={formatDateTime(doc.uploadedAt)}>
                {formatDate(doc.uploadedAt)}
              </p>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                {doc.fileExt && <span className="uppercase">{doc.fileExt}</span>}
                {doc.fileSize ? <span>· {formatBytes(doc.fileSize)}</span> : null}
                {doc.version && <span>· v{doc.version}</span>}
              </div>
            </div>
          </div>
          {doc.description && (
            <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{doc.description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
//  Main section
// ============================================================================
export function HRDocumentsSection() {
  const [folders, setFolders] = React.useState<HRFolder[]>([])
  const [docs, setDocs] = React.useState<HRDoc[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null) // null = root
  const [search, setSearch] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState("all")

  const [folderDialog, setFolderDialog] = React.useState<{ open: boolean; initial: HRFolder | null }>({ open: false, initial: null })
  const [docDialog, setDocDialog] = React.useState<{ open: boolean; initial: HRDoc | null }>({ open: false, initial: null })
  const [deleteFolder, setDeleteFolder] = React.useState<HRFolder | null>(null)
  const [deleteDoc, setDeleteDoc] = React.useState<HRDoc | null>(null)

  const selectedFolder = folders.find(f => f.id === selectedFolderId) || null

  // ---------- fetch ----------
  const refresh = React.useCallback(async () => {
    setLoading(true)
    try {
      const [fRes, dRes] = await Promise.all([
        apiFetch("/api/hr-documents/folders"),
        apiFetch(`/api/hr-documents?folderId=${selectedFolderId === null ? "root" : selectedFolderId || "root"}`),
      ])
      if (fRes.ok) {
        const fjson = await fRes.json()
        setFolders(fjson.items || [])
      }
      if (dRes.ok) {
        const djson = await dRes.json()
        setDocs(djson.items || [])
      }
    } catch (e) {
      toast.error("Failed to load HR documents")
    } finally {
      setLoading(false)
    }
  }, [selectedFolderId])

  React.useEffect(() => { refresh() }, [refresh])

  // ---------- derived ----------
  const rootDocCount = React.useMemo(() => {
    return docs.filter(d => !d.folderId).length
  }, [docs])

  const filteredDocs = React.useMemo(() => {
    let list = docs
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.category || "").toLowerCase().includes(q) ||
        (d.uploadedBy || "").toLowerCase().includes(q)
      )
    }
    if (categoryFilter !== "all") {
      list = list.filter(d => d.category === categoryFilter)
    }
    return list
  }, [docs, search, categoryFilter])

  const totalDocs = folders.reduce((s, f) => s + (f.docCount || 0), 0) + rootDocCount
  const publishedCount = docs.filter(d => d.status === "Published").length
  const ackCount = docs.filter(d => d.acknowledgmentRequired).length

  // ---------- handlers ----------
  const onSaveFolder = async (data: { name: string; description: string; color: string }) => {
    if (folderDialog.initial) {
      const res = await apiFetch(`/api/hr-documents/folders/${folderDialog.initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to rename folder")
      toast.success("Folder updated", { description: data.name })
    } else {
      const res = await apiFetch("/api/hr-documents/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, createdBy: "HR Admin" }),
      })
      if (!res.ok) throw new Error("Failed to create folder")
      toast.success("Folder created", { description: data.name })
    }
    await refresh()
  }

  const onSaveDoc = async (data: Partial<HRDoc> & { name: string }) => {
    const payload = { ...data, folderId: selectedFolderId }
    if (docDialog.initial) {
      const res = await apiFetch(`/api/hr-documents/${docDialog.initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to update document")
      toast.success("Document updated", { description: data.name })
    } else {
      const res = await apiFetch("/api/hr-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to upload document")
      toast.success("Document uploaded", { description: `${data.name} · uploaded by ${data.uploadedBy || "HR Admin"}` })
    }
    await refresh()
  }

  const onDeleteFolder = async () => {
    if (!deleteFolder) return
    try {
      const res = await apiFetch(`/api/hr-documents/folders/${deleteFolder.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete folder")
      const json = await res.json()
      toast.success("Folder deleted", {
        description: json.movedToRoot > 0
          ? `${deleteFolder.name} removed · ${json.movedToRoot} document(s) moved to root`
          : `${deleteFolder.name} removed`,
      })
      if (selectedFolderId === deleteFolder.id) setSelectedFolderId(null)
      setDeleteFolder(null)
      await refresh()
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete folder")
    }
  }

  const onDeleteDoc = async () => {
    if (!deleteDoc) return
    try {
      const res = await apiFetch(`/api/hr-documents/${deleteDoc.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete document")
      toast.success("Document deleted", { description: deleteDoc.name })
      setDeleteDoc(null)
      await refresh()
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete document")
    }
  }

  // ---------- render ----------
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Breadcrumb + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-sm min-w-0">
          <h2 className="text-lg font-semibold truncate">HR Documents</h2>
          {selectedFolder && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <button
                onClick={() => setSelectedFolderId(null)}
                className="text-muted-foreground hover:text-foreground transition truncate"
              >
                All Documents
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-foreground truncate">{selectedFolder.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFolderDialog({ open: true, initial: null })}>
            <FolderPlus className="h-3.5 w-3.5 mr-1.5" /> New Folder
          </Button>
          <Button size="sm" onClick={() => setDocDialog({ open: true, initial: null })} className="bg-violet-600 hover:bg-violet-700 text-white">
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload Document
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Total Documents" value={totalDocs} icon={FileText} accent="violet" sub="Across all folders" />
        <StatTile label="Folders" value={folders.length} icon={FolderIcon} accent="sky" sub="Organizing documents" />
        <StatTile label="Published" value={publishedCount} icon={CheckCircle2} accent="emerald" sub="Visible to employees" />
        <StatTile label="Acknowledgment" value={ackCount} icon={ShieldAlert} accent="amber" sub="Require employee ack" />
      </div>

      {/* Main: sidebar + documents grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Folders sidebar */}
        <Card className="rounded-xl border border-border/60 lg:col-span-1 flex flex-col">
          <CardContent className="p-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <FolderIcon className="h-3.5 w-3.5" /> Folders
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFolderDialog({ open: true, initial: null })}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ScrollArea className="flex-1 -mx-1 px-1">
              <div className="space-y-1">
                {/* All Documents (root) item */}
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition group",
                    selectedFolderId === null
                      ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/20"
                      : "hover:bg-muted text-foreground/80"
                  )}
                >
                  <div className={cn("grid h-7 w-7 place-items-center rounded-md shrink-0", selectedFolderId === null ? "bg-violet-500/20 text-violet-600 dark:text-violet-400" : "bg-muted text-muted-foreground group-hover:bg-background")}>
                    <FolderOpen className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-medium truncate">All Documents</p>
                    <p className="text-[10px] text-muted-foreground">{rootDocCount} docs · root level</p>
                  </div>
                </button>

                {loading && folders.length === 0 ? (
                  <div className="space-y-1">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}
                  </div>
                ) : folders.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No folders yet
                  </div>
                ) : (
                  folders.map(f => {
                    const cls = folderColorClasses(f.color)
                    const active = selectedFolderId === f.id
                    return (
                      <div
                        key={f.id}
                        className={cn(
                          "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition cursor-pointer",
                          active ? "bg-violet-500/10 ring-1 ring-violet-500/20" : "hover:bg-muted"
                        )}
                        onClick={() => setSelectedFolderId(f.id)}
                      >
                        <div className={cn("grid h-7 w-7 place-items-center rounded-md shrink-0", cls.tile)}>
                          <FolderIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("font-medium truncate", active ? "text-violet-700 dark:text-violet-300" : "text-foreground/80")}>{f.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {f.docCount || 0} docs · {f.createdBy || "HR"}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost" size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                              onClick={e => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => setFolderDialog({ open: true, initial: f })}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteFolder(f)} className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-500/10">
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
          </CardContent>
        </Card>

        {/* Documents grid */}
        <Card className="rounded-xl border border-border/60 lg:col-span-2 flex flex-col">
          <CardContent className="p-4 flex-1 flex flex-col min-h-0">
            {/* Folder info bar OR root heading */}
            {selectedFolder ? (
              <div className="mb-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={cn("grid h-8 w-8 place-items-center rounded-md", folderColorClasses(selectedFolder.color).tile)}>
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold truncate">{selectedFolder.name}</h3>
                        <p className="text-[11px] text-muted-foreground">
                          Created by <span className="font-medium">{selectedFolder.createdBy || "HR Admin"}</span> · {formatDate(selectedFolder.createdAt)}
                        </p>
                      </div>
                    </div>
                    {selectedFolder.description && (
                      <p className="text-xs text-muted-foreground mt-2">{selectedFolder.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setFolderDialog({ open: true, initial: selectedFolder })}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Rename
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteFolder(selectedFolder)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete folder
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Documents header */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold">
                {selectedFolder ? `Documents in folder (${docs.length})` : `All Documents (${rootDocCount})`}
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search docs…"
                    className="pl-7 h-8 w-40 text-xs bg-background"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 w-36 text-xs bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {HR_DOC_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => setDocDialog({ open: true, initial: null })} className="bg-violet-600 hover:bg-violet-700 text-white h-8">
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
                </Button>
              </div>
            </div>

            {/* Documents list */}
            <ScrollArea className="flex-1 -mx-1 px-1">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-muted mx-auto mb-3">
                    <FileText className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{search || categoryFilter !== "all" ? "No documents match your filters" : selectedFolder ? "This folder is empty" : "No documents at root level"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {search || categoryFilter !== "all" ? "Try adjusting your search or filters." : "Upload the first document to get started."}
                  </p>
                  {!search && categoryFilter === "all" && (
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => setDocDialog({ open: true, initial: null })}>
                      <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload document
                    </Button>
                  )}
                </div>
              ) : (
                <motion.div
                  variants={gridContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredDocs.map(doc => (
                      <DocCard
                        key={doc.id}
                        doc={doc}
                        onEdit={() => setDocDialog({ open: true, initial: doc })}
                        onDelete={() => setDeleteDoc(doc)}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <FolderDialog
        open={folderDialog.open}
        onClose={() => setFolderDialog({ open: false, initial: null })}
        onSave={onSaveFolder}
        initial={folderDialog.initial}
      />
      <DocDialog
        open={docDialog.open}
        onClose={() => setDocDialog({ open: false, initial: null })}
        onSave={onSaveDoc}
        initial={docDialog.initial}
        folderName={selectedFolder?.name}
      />

      {/* Delete folder confirm */}
      <AlertDialog open={!!deleteFolder} onOpenChange={v => !v && setDeleteFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder &ldquo;{deleteFolder?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              The folder will be permanently removed. Documents inside it will be moved to the root level (All Documents), not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteFolder}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete document confirm */}
      <AlertDialog open={!!deleteDoc} onOpenChange={v => !v && setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document &ldquo;{deleteDoc?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The document will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteDoc}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default HRDocumentsSection
