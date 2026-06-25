"use client"

// ============================================================================
//  Documents — Employee Documents (Task ID 4-b)
// ----------------------------------------------------------------------------
//  Employee document management with verification workflow.
//  Theme: violet/purple accent.
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  UserSquare, Upload, Filter, MoreHorizontal, Eye, FileText, Download,
  RefreshCw, History, CheckCircle2, XCircle, AlertTriangle, FileX2,
  Archive, Pencil, FileUp, Plus, Search, Trash2, CalendarClock,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import {
  ENTITIES, EMPLOYEE_DOC_CATEGORIES, STATUS_COLORS,
  formatDate, daysUntil, dueStatus, initials, avatarColor,
  EmployeeDoc,
} from "../shared"
import { EMPLOYEE_DOCUMENTS } from "../data"

// ---------- motion ----------
const gridContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const gridItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

// ---------- Stat tile ----------
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

// ---------- Upload Dialog ----------
function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = React.useState({
    employee: "", entity: "", department: "", designation: "",
    category: "", documentType: "", expiryDate: "", remarks: "",
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const employees = React.useMemo(() => {
    const map = new Map<string, EmployeeDoc>()
    EMPLOYEE_DOCUMENTS.forEach(d => map.set(d.employeeCode, d))
    return Array.from(map.values())
  }, [])

  const submit = () => {
    if (!form.employee || !form.category || !form.documentType) {
      toast.error("Employee, category & document type are required")
      return
    }
    toast.success("Document uploaded", {
      description: `${form.documentType} uploaded for ${form.employee}`,
    })
    setForm({ employee: "", entity: "", department: "", designation: "", category: "", documentType: "", expiryDate: "", remarks: "" })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-violet-600" /> Upload Employee Document
          </DialogTitle>
          <DialogDescription>Upload a document for an employee. Verification workflow will start automatically.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-2">
            {/* Employee selection */}
            <div className="space-y-2">
              <Label className="text-xs">Employee *</Label>
              <Select value={form.employee} onValueChange={v => {
                const emp = employees.find(e => e.employeeCode === v)
                set("employee", v)
                if (emp) { set("entity", emp.entityName); set("department", emp.department); set("designation", emp.designation) }
              }}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.employeeCode} value={e.employeeCode}>
                      {e.employeeName} ({e.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filters row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Entity</Label>
                <Select value={form.entity} onValueChange={v => set("entity", v)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Entity" /></SelectTrigger>
                  <SelectContent>
                    {ENTITIES.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Department</Label>
                <Input value={form.department} onChange={e => set("department", e.target.value)} placeholder="e.g. Engineering" className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Designation</Label>
                <Input value={form.designation} onChange={e => set("designation", e.target.value)} placeholder="e.g. SDE II" className="bg-background" />
              </div>
            </div>

            <Separator />

            {/* Doc details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Document Category *</Label>
                <Select value={form.category} onValueChange={v => set("category", v)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_DOC_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Document Type *</Label>
                <Input value={form.documentType} onChange={e => set("documentType", e.target.value)} placeholder="e.g. Aadhaar Card" className="bg-background" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Expiry Date (optional)</Label>
                <Input type="date" value={form.expiryDate} onChange={e => set("expiryDate", e.target.value)} className="bg-background" />
              </div>
            </div>

            {/* File upload mock */}
            <div className="space-y-1.5">
              <Label className="text-xs">File</Label>
              <div className="rounded-lg border-2 border-dashed border-border/60 bg-muted/20 p-5 text-center hover:border-violet-500/40 hover:bg-violet-50/30 dark:hover:bg-violet-500/5 transition-colors cursor-pointer">
                <FileUp className="h-7 w-7 text-muted-foreground/60 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Click or drop file here · PDF, JPG, PNG (max 10 MB)</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Remarks</Label>
              <Textarea value={form.remarks} onChange={e => set("remarks", e.target.value)} placeholder="Any remarks..." className="bg-background min-h-[60px]" />
            </div>
          </div>
        </ScrollArea>
        <Separator />
        <DialogFooter className="bg-muted/30 -mx-6 px-6 py-3 gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
            <Upload className="h-3.5 w-3.5" /> Upload Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- View History Dialog ----------
function HistoryDialog({ doc, open, onClose }: { doc: EmployeeDoc | null; open: boolean; onClose: () => void }) {
  if (!doc) return null
  // Mock version timeline
  const versions = Array.from({ length: Math.max(1, doc.version) }).map((_, i) => ({
    version: i + 1,
    uploadedBy: doc.uploadedBy || "Unknown",
    uploadedDate: new Date(new Date(doc.uploadedDate || Date.now()).getTime() - (doc.version - i - 1) * 86400000 * 30).toISOString(),
    remarks: i === doc.version - 1 ? doc.remarks || "Latest version" : `Replaced — version ${i + 1}`,
    isCurrent: i === doc.version - 1,
  })).reverse()

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-violet-600" /> Version History
          </DialogTitle>
          <DialogDescription>{doc.documentName} · {doc.employeeName} ({doc.employeeCode})</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <ol className="relative border-l border-border/60 ml-3 space-y-3 pb-2">
            {versions.map((v, i) => (
              <li key={v.version} className="ml-4">
                <span className={cn(
                  "absolute -left-[13px] grid h-6 w-6 place-items-center rounded-full text-white ring-4 ring-background",
                  v.isCurrent ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-muted-foreground"
                )}>
                  <span className="text-[10px] font-bold">{v.version}</span>
                </span>
                <div className="rounded-lg border border-border/40 bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">Version {v.version} {v.isCurrent && <Badge variant="secondary" className="ml-1 text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">Current</Badge>}</p>
                    <span className="text-[11px] text-muted-foreground">{formatDate(v.uploadedDate)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Uploaded by {v.uploadedBy}</p>
                  <p className="text-xs text-muted-foreground mt-1 italic">{v.remarks}</p>
                </div>
                {i < versions.length - 1 && <div className="text-[10px] text-muted-foreground/60 mt-1 ml-1">↓ superseded</div>}
              </li>
            ))}
          </ol>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Main component
// ============================================================================
export function EmployeeDocumentsSection() {
  const [filters, setFilters] = React.useState({
    entity: "all", department: "all", category: "all", status: "all", search: "",
    uploadedFrom: "", uploadedTo: "", expiryFrom: "", expiryTo: "",
  })
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [historyDoc, setHistoryDoc] = React.useState<EmployeeDoc | null>(null)
  const [historyOpen, setHistoryOpen] = React.useState(false)

  const setF = (k: string, v: string) => setFilters(f => ({ ...f, [k]: v }))

  const departments = React.useMemo(() => Array.from(new Set(EMPLOYEE_DOCUMENTS.map(d => d.department))).sort(), [])
  const entities = React.useMemo(() => Array.from(new Set(EMPLOYEE_DOCUMENTS.map(d => d.entityName))), [])

  const filtered = React.useMemo(() => {
    let list = EMPLOYEE_DOCUMENTS
    if (filters.entity !== "all") list = list.filter(d => d.entityName === filters.entity)
    if (filters.department !== "all") list = list.filter(d => d.department === filters.department)
    if (filters.category !== "all") list = list.filter(d => d.category === filters.category)
    if (filters.status !== "all") list = list.filter(d => d.status === filters.status)
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      list = list.filter(d =>
        d.employeeName.toLowerCase().includes(q) ||
        d.employeeCode.toLowerCase().includes(q) ||
        d.documentName.toLowerCase().includes(q)
      )
    }
    if (filters.uploadedFrom) list = list.filter(d => d.uploadedDate && new Date(d.uploadedDate) >= new Date(filters.uploadedFrom))
    if (filters.uploadedTo) list = list.filter(d => d.uploadedDate && new Date(d.uploadedDate) <= new Date(filters.uploadedTo))
    if (filters.expiryFrom) list = list.filter(d => d.expiryDate && new Date(d.expiryDate) >= new Date(filters.expiryFrom))
    if (filters.expiryTo) list = list.filter(d => d.expiryDate && new Date(d.expiryDate) <= new Date(filters.expiryTo))
    return list
  }, [filters])

  const stats = {
    total: EMPLOYEE_DOCUMENTS.length,
    verified: EMPLOYEE_DOCUMENTS.filter(d => d.status === "Verified").length,
    pending: EMPLOYEE_DOCUMENTS.filter(d => d.status === "Pending Verification" || d.status === "Uploaded").length,
    expiring: EMPLOYEE_DOCUMENTS.filter(d => d.status === "Expiring Soon" || (d.expiryDate && dueStatus(d.expiryDate) === "soon")).length,
    expired: EMPLOYEE_DOCUMENTS.filter(d => d.status === "Expired" || (d.expiryDate && dueStatus(d.expiryDate) === "overdue")).length,
    rejected: EMPLOYEE_DOCUMENTS.filter(d => d.status === "Rejected" || d.status === "Correction Required").length,
  }

  const onRowAction = (action: string, doc: EmployeeDoc) => {
    if (action === "View History") {
      setHistoryDoc(doc); setHistoryOpen(true); return
    }
    toast.success(action, { description: `${doc.documentName} · ${doc.employeeName}` })
  }

  return (
    <div className="space-y-4">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-soft">
            <UserSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Employee Documents</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage identity, address, education, bank, statutory & employment documents per employee.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => toast.info("Bulk import dialog opened")} className="gap-1.5"><FileUp className="h-3.5 w-3.5" /> Bulk Import</Button>
          <Button size="sm" variant="outline" onClick={() => toast.success("Export started")} className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export</Button>
          <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
            <Upload className="h-3.5 w-3.5" /> Upload Document
          </Button>
        </div>
      </div>

      {/* ---------- Stat tiles ---------- */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" variants={gridContainer} initial="hidden" animate="show">
        <motion.div variants={gridItem}><StatTile label="Total Documents" value={stats.total} icon={FileText} accent="violet" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Verified" value={stats.verified} icon={CheckCircle2} accent="emerald" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Pending Verification" value={stats.pending} icon={AlertTriangle} accent="amber" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Expiring Soon" value={stats.expiring} icon={CalendarClock} accent="sky" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Expired" value={stats.expired} icon={FileX2} accent="rose" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Rejected" value={stats.rejected} icon={XCircle} accent="cyan" /></motion.div>
      </motion.div>

      {/* ---------- Filter bar ---------- */}
      <Card className="border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Select value={filters.entity} onValueChange={v => setF("entity", v)}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.department} onValueChange={v => setF("department", v)}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.category} onValueChange={v => setF("category", v)}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EMPLOYEE_DOC_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={v => setF("status", v)}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {["Verified", "Pending Verification", "Uploaded", "Expiring Soon", "Expired", "Rejected", "Correction Required"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={filters.search} onChange={e => setF("search", e.target.value)} placeholder="Search employee / doc..." className="pl-9 h-9 bg-background" />
            </div>
            <Input type="date" value={filters.uploadedFrom} onChange={e => setF("uploadedFrom", e.target.value)} className="h-9 bg-background" title="Uploaded from" />
            <Input type="date" value={filters.uploadedTo} onChange={e => setF("uploadedTo", e.target.value)} className="h-9 bg-background" title="Uploaded to" />
            <Input type="date" value={filters.expiryFrom} onChange={e => setF("expiryFrom", e.target.value)} className="h-9 bg-background" title="Expiry from" />
          </div>
          {(filters.uploadedFrom || filters.uploadedTo || filters.expiryFrom || filters.expiryTo) && (
            <div className="flex items-center gap-2 mt-3 text-xs">
              <CalendarClock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Date range active</span>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setFilters(f => ({ ...f, uploadedFrom: "", uploadedTo: "", expiryFrom: "", expiryTo: "" }))}>
                Clear dates
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------- Table ---------- */}
      <Card className="border-border/60 rounded-xl shadow-soft overflow-hidden">
        <ScrollArea className="max-h-[640px]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur z-10">
              <TableRow className="hover:bg-muted/40">
                <TableHead className="min-w-[200px]">Employee</TableHead>
                <TableHead className="min-w-[140px]">Entity / Dept</TableHead>
                <TableHead className="min-w-[180px]">Document Name</TableHead>
                <TableHead className="min-w-[120px]">Category</TableHead>
                <TableHead className="min-w-[120px]">Document Type</TableHead>
                <TableHead className="min-w-[110px]">Uploaded Date</TableHead>
                <TableHead className="min-w-[110px]">Uploaded By</TableHead>
                <TableHead className="min-w-[110px]">Verified By</TableHead>
                <TableHead className="min-w-[110px]">Expiry Date</TableHead>
                <TableHead className="min-w-[110px]">Status</TableHead>
                <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileText className="h-8 w-8 opacity-40" />
                      <p className="text-sm font-medium">No documents match your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map(d => {
                const cat = EMPLOYEE_DOC_CATEGORIES.find(c => c.value === d.category)
                const expiryTone = d.expiryDate ? dueStatus(d.expiryDate) : "none"
                const rowTint = d.status === "Expired" || expiryTone === "overdue"
                  ? "bg-rose-50/40 dark:bg-rose-500/5"
                  : d.status === "Expiring Soon" || expiryTone === "soon"
                    ? "bg-amber-50/40 dark:bg-amber-500/5"
                    : ""
                return (
                  <TableRow key={d.id} className={cn("border-border/40 hover:bg-violet-50/30 dark:hover:bg-violet-500/5", rowTint)}>
                    <TableCell>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white", avatarColor(d.employeeCode))}>
                          <span className="text-[10px] font-semibold">{initials(d.employeeName)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{d.employeeName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{d.employeeCode}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-foreground truncate max-w-[140px]">{d.entityName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{d.department}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{d.documentName}</p>
                      {d.remarks && <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{d.remarks}</p>}
                    </TableCell>
                    <TableCell>
                      {cat && <Badge variant="secondary" className={cn("text-[10px] border-0", cat.color)}>{cat.label}</Badge>}
                    </TableCell>
                    <TableCell><span className="text-xs text-foreground">{d.documentType}</span></TableCell>
                    <TableCell>
                      <span className="text-xs text-foreground">{formatDate(d.uploadedDate)}</span>
                      <p className="text-[10px] text-muted-foreground">v{d.version} · {d.fileSize}</p>
                    </TableCell>
                    <TableCell><span className="text-xs text-foreground">{d.uploadedBy || "—"}</span></TableCell>
                    <TableCell>
                      {d.verifiedBy ? (
                        <span className="text-xs text-foreground">{d.verifiedBy}</span>
                      ) : <span className="text-xs text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell>
                      {d.expiryDate ? (
                        <div>
                          <span className={cn(
                            "text-xs font-medium",
                            expiryTone === "overdue" ? "text-rose-600 dark:text-rose-400"
                              : expiryTone === "soon" ? "text-amber-600 dark:text-amber-400"
                                : "text-foreground"
                          )}>{formatDate(d.expiryDate)}</span>
                          <p className="text-[10px] text-muted-foreground">{daysUntil(d.expiryDate) >= 0 ? `${daysUntil(d.expiryDate)}d left` : `${Math.abs(daysUntil(d.expiryDate))}d ago`}</p>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-[11px] border-0", STATUS_COLORS[d.status])}>{d.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => onRowAction("View", d)}><Eye className="h-3.5 w-3.5 mr-2" /> View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction("Preview", d)}><FileText className="h-3.5 w-3.5 mr-2" /> Preview</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction("Download", d)}><Download className="h-3.5 w-3.5 mr-2" /> Download</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction("Upload New Version", d)}><FileUp className="h-3.5 w-3.5 mr-2" /> Upload New Version</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onRowAction("Verify", d)} className="text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Verify</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction("Reject", d)} className="text-rose-700 dark:text-rose-400"><XCircle className="h-3.5 w-3.5 mr-2" /> Reject</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction("Ask Correction", d)} className="text-amber-700 dark:text-amber-400"><AlertTriangle className="h-3.5 w-3.5 mr-2" /> Ask Correction</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction("Mark Expired", d)} className="text-rose-700 dark:text-rose-400"><FileX2 className="h-3.5 w-3.5 mr-2" /> Mark Expired</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onRowAction("Archive", d)}><Archive className="h-3.5 w-3.5 mr-2" /> Archive</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction("View History", d)}><History className="h-3.5 w-3.5 mr-2" /> View History</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <HistoryDialog doc={historyDoc} open={historyOpen} onClose={() => { setHistoryOpen(false); setHistoryDoc(null) }} />
    </div>
  )
}

export default EmployeeDocumentsSection
