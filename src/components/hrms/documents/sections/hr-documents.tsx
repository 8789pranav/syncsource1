"use client"

// ============================================================================
//  Documents — HR Documents (Task ID 4-b)
// ----------------------------------------------------------------------------
//  HR / company policy documents with visibility rules & acknowledgment tracking.
//  Theme: violet/purple accent.
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Building2, Plus, Filter, MoreHorizontal, Eye, FileText, Download,
  RefreshCw, Send, History, CheckCircle2, XCircle, FileUp, Search,
  Pencil, FileX2, Archive, BarChart3, Bell, ShieldAlert,
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
import { Progress } from "@/components/ui/progress"
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
  ENTITIES, HR_DOC_CATEGORIES, STATUS_COLORS, VISIBILITY_RULES,
  formatDate, daysUntil, initials, avatarColor, HRDoc,
} from "../shared"
import { HR_DOCUMENTS } from "../data"

// ---------- motion ----------
const gridContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const gridItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

// ---------- Stat tile ----------
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

// ---------- Create HR Document Dialog ----------
function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = React.useState({
    name: "", category: "", entity: "", department: "", visibleTo: "All Employees",
    description: "",
    acknowledgmentRequired: true, acknowledgmentDueDate: "",
    reminderRequired: true, escalationToHR: true, blockUntilAcknowledged: false,
  })
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }))

  const submit = () => {
    if (!form.name || !form.category || !form.entity) {
      toast.error("Name, category & entity are required")
      return
    }
    toast.success("HR document created", { description: `${form.name} saved as Draft` })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-violet-600" /> Create / Upload HR Document
          </DialogTitle>
          <DialogDescription>Add a company policy, circular or HR document with visibility & acknowledgment rules.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-2">
            {/* Basic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Document Name *</Label>
                <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Leave Policy 2025" className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category *</Label>
                <Select value={form.category} onValueChange={v => set("category", v)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {HR_DOC_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Entity *</Label>
                <Select value={form.entity} onValueChange={v => set("entity", v)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select entity" /></SelectTrigger>
                  <SelectContent>
                    {ENTITIES.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Department (optional)</Label>
                <Input value={form.department} onChange={e => set("department", e.target.value)} placeholder="e.g. Engineering" className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Visible To</Label>
                <Select value={form.visibleTo} onValueChange={v => set("visibleTo", v)}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_RULES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief description of the document purpose..." className="bg-background min-h-[60px]" />
            </div>

            <Separator />

            {/* Acknowledgment settings */}
            <div className="rounded-lg border border-border/60 p-3 space-y-3">
              <p className="text-xs font-semibold text-foreground">Acknowledgment Settings</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between gap-3 rounded-md hover:bg-muted/40 p-2 cursor-pointer">
                  <div>
                    <p className="text-xs font-medium text-foreground">Acknowledgment Required</p>
                    <p className="text-[10px] text-muted-foreground">Employees must acknowledge this document</p>
                  </div>
                  <Switch checked={form.acknowledgmentRequired} onCheckedChange={v => set("acknowledgmentRequired", v)} />
                </label>
                <div className="space-y-1.5">
                  <Label className="text-xs">Acknowledgment Due Date</Label>
                  <Input type="date" value={form.acknowledgmentDueDate} onChange={e => set("acknowledgmentDueDate", e.target.value)} className="bg-background" disabled={!form.acknowledgmentRequired} />
                </div>
                <label className="flex items-center justify-between gap-3 rounded-md hover:bg-muted/40 p-2 cursor-pointer">
                  <div>
                    <p className="text-xs font-medium text-foreground">Reminder Required</p>
                    <p className="text-[10px] text-muted-foreground">Auto-send reminders before due date</p>
                  </div>
                  <Switch checked={form.reminderRequired} onCheckedChange={v => set("reminderRequired", v)} />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-md hover:bg-muted/40 p-2 cursor-pointer">
                  <div>
                    <p className="text-xs font-medium text-foreground">Escalation to HR</p>
                    <p className="text-[10px] text-muted-foreground">Escalate non-acknowledged to HR</p>
                  </div>
                  <Switch checked={form.escalationToHR} onCheckedChange={v => set("escalationToHR", v)} />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-md hover:bg-muted/40 p-2 cursor-pointer sm:col-span-2">
                  <div>
                    <p className="text-xs font-medium text-foreground">Block Until Acknowledged</p>
                    <p className="text-[10px] text-muted-foreground">Block employee actions until acknowledged</p>
                  </div>
                  <Switch checked={form.blockUntilAcknowledged} onCheckedChange={v => set("blockUntilAcknowledged", v)} />
                </label>
              </div>
            </div>

            {/* File upload mock */}
            <div className="space-y-1.5">
              <Label className="text-xs">Document File</Label>
              <div className="rounded-lg border-2 border-dashed border-border/60 bg-muted/20 p-5 text-center hover:border-violet-500/40 hover:bg-violet-50/30 dark:hover:bg-violet-500/5 transition-colors cursor-pointer">
                <FileUp className="h-7 w-7 text-muted-foreground/60 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Click or drop PDF / DOCX (max 25 MB)</p>
              </div>
            </div>
          </div>
        </ScrollArea>
        <Separator />
        <DialogFooter className="bg-muted/30 -mx-6 px-6 py-3 gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
            <CheckCircle2 className="h-3.5 w-3.5" /> Save as Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Acknowledgment Status Dialog ----------
function AckDialog({ doc, open, onClose }: { doc: HRDoc | null; open: boolean; onClose: () => void }) {
  // Mock acknowledgment list
  const employees = React.useMemo(() => {
    if (!doc) return []
    const seed = [
      { code: "EMP-001", name: "Aarav Sharma", dept: "Engineering" },
      { code: "EMP-002", name: "Priya Nair", dept: "Human Resources" },
      { code: "EMP-003", name: "Vikram Reddy", dept: "Sales" },
      { code: "EMP-004", name: "Sneha Iyer", dept: "Finance" },
      { code: "EMP-005", name: "Rahul Verma", dept: "Engineering" },
      { code: "EMP-006", name: "Kavya Patel", dept: "Product" },
      { code: "EMP-007", name: "Arjun Mehta", dept: "Engineering" },
      { code: "EMP-008", name: "Diya Kapoor", dept: "Design" },
    ]
    const target = doc.acknowledgmentRate / 100
    return seed.map((e, i) => {
      const r = (i * 37 + doc.id.length * 11) % 100
      const ack = r < target * 100
      let due: "Acknowledged" | "Pending" | "Overdue" = "Pending"
      if (ack) due = "Acknowledged"
      else if (doc.acknowledgmentDueDate && daysUntil(doc.acknowledgmentDueDate) < 0) due = "Overdue"
      return { ...e, status: due, ackDate: ack ? new Date(Date.now() - i * 86400000).toISOString() : null }
    })
  }, [doc])

  if (!doc) return null
  const acked = employees.filter(e => e.status === "Acknowledged").length
  const overdue = employees.filter(e => e.status === "Overdue").length

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-violet-600" /> Acknowledgment Status
          </DialogTitle>
          <DialogDescription>{doc.documentName} · v{doc.version}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 -mx-1">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 p-3 text-center">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{acked}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Acknowledged</p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 p-3 text-center">
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">{employees.length - acked - overdue}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Pending</p>
          </div>
          <div className="rounded-lg border border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/5 p-3 text-center">
            <p className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">{overdue}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Overdue</p>
          </div>
        </div>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur z-10">
              <TableRow className="hover:bg-muted/40">
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acknowledged On</TableHead>
                <TableHead className="text-right pr-2">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(e => (
                <TableRow key={e.code} className="border-border/40 hover:bg-violet-50/30 dark:hover:bg-violet-500/5">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-white", avatarColor(e.code))}>
                        <span className="text-[9px] font-semibold">{initials(e.name)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{e.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{e.code}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs text-foreground">{e.dept}</span></TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[10px] border-0", e.status === "Acknowledged" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : e.status === "Overdue" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400")}>{e.status}</Badge>
                  </TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{e.ackDate ? formatDate(e.ackDate) : "—"}</span></TableCell>
                  <TableCell className="text-right pr-2">
                    {e.status !== "Acknowledged" && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toast.success("Reminder sent", { description: `${e.name} (${e.code})` })}>
                        <Bell className="h-3 w-3 mr-1" /> Remind
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <Separator />
        <DialogFooter className="bg-muted/30 -mx-6 px-6 py-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.success("Bulk reminder sent", { description: `${employees.filter(e => e.status !== "Acknowledged").length} pending employees` })}>
            <Bell className="h-3.5 w-3.5 mr-1" /> Send Bulk Reminder
          </Button>
          <Button size="sm" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Main component
// ============================================================================
export function HRDocumentsSection() {
  const [filters, setFilters] = React.useState({
    entity: "all", category: "all", visibility: "all", status: "all",
    ackRequired: "all", search: "",
  })
  const [createOpen, setCreateOpen] = React.useState(false)
  const [ackDoc, setAckDoc] = React.useState<HRDoc | null>(null)

  const setF = (k: string, v: string) => setFilters(f => ({ ...f, [k]: v }))

  const entities = React.useMemo(() => Array.from(new Set(HR_DOCUMENTS.map(d => d.entityName))), [])

  const filtered = React.useMemo(() => {
    let list = HR_DOCUMENTS
    if (filters.entity !== "all") list = list.filter(d => d.entityName === filters.entity)
    if (filters.category !== "all") list = list.filter(d => d.category === filters.category)
    if (filters.visibility !== "all") list = list.filter(d => d.visibleTo === filters.visibility)
    if (filters.status !== "all") list = list.filter(d => d.status === filters.status)
    if (filters.ackRequired !== "all") list = list.filter(d => filters.ackRequired === "yes" ? d.acknowledgmentRequired : !d.acknowledgmentRequired)
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      list = list.filter(d => d.documentName.toLowerCase().includes(q) || (d.description || "").toLowerCase().includes(q))
    }
    return list
  }, [filters])

  const stats = {
    total: HR_DOCUMENTS.length,
    published: HR_DOCUMENTS.filter(d => d.status === "Published").length,
    draft: HR_DOCUMENTS.filter(d => d.status === "Draft").length,
    ackPending: HR_DOCUMENTS.filter(d => d.acknowledgmentRequired && d.acknowledgmentRate < 100).length,
    avgAck: Math.round(
      HR_DOCUMENTS.filter(d => d.acknowledgmentRequired).reduce((s, d) => s + d.acknowledgmentRate, 0) /
      Math.max(1, HR_DOCUMENTS.filter(d => d.acknowledgmentRequired).length)
    ),
  }

  const onRowAction = (action: string, doc: HRDoc) => {
    if (action === "View Acknowledgment Status") { setAckDoc(doc); return }
    toast.success(action, { description: `${doc.documentName}` })
  }

  return (
    <div className="space-y-4">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-soft">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">HR Documents</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Company policies, handbooks, circulars & compliance documents with acknowledgment tracking.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => toast.success("Bulk publish started")} className="gap-1.5"><Send className="h-3.5 w-3.5" /> Publish All</Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
            <Plus className="h-3.5 w-3.5" /> Create / Upload HR Document
          </Button>
        </div>
      </div>

      {/* ---------- Stat tiles ---------- */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" variants={gridContainer} initial="hidden" animate="show">
        <motion.div variants={gridItem}><StatTile label="Total" value={stats.total} icon={FileText} accent="violet" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Published" value={stats.published} icon={CheckCircle2} accent="emerald" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Draft" value={stats.draft} icon={FileText} accent="slate" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Acknowledgment Pending" value={stats.ackPending} icon={ShieldAlert} accent="amber" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Avg Acknowledgment Rate" value={`${stats.avgAck}%`} icon={BarChart3} accent="sky" /></motion.div>
      </motion.div>

      {/* ---------- Filter bar ---------- */}
      <Card className="border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Select value={filters.entity} onValueChange={v => setF("entity", v)}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.category} onValueChange={v => setF("category", v)}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {HR_DOC_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.visibility} onValueChange={v => setF("visibility", v)}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Visibility" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Visibility</SelectItem>
                {VISIBILITY_RULES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={v => setF("status", v)}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Published">Published</SelectItem>
                <SelectItem value="Unpublished">Unpublished</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.ackRequired} onValueChange={v => setF("ackRequired", v)}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Acknowledgment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Acknowledgment Required</SelectItem>
                <SelectItem value="no">No Acknowledgment</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={filters.search} onChange={e => setF("search", e.target.value)} placeholder="Search documents..." className="pl-9 h-9 bg-background" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------- Table ---------- */}
      <Card className="border-border/60 rounded-xl shadow-soft overflow-hidden">
        <ScrollArea className="max-h-[640px]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur z-10">
              <TableRow className="hover:bg-muted/40">
                <TableHead className="min-w-[220px]">Document Name</TableHead>
                <TableHead className="min-w-[130px]">Category</TableHead>
                <TableHead className="min-w-[140px]">Entity / Dept</TableHead>
                <TableHead className="min-w-[140px]">Visible To</TableHead>
                <TableHead className="min-w-[100px]">Uploaded</TableHead>
                <TableHead className="min-w-[110px]">Uploaded By</TableHead>
                <TableHead className="min-w-[70px]">Version</TableHead>
                <TableHead className="min-w-[110px]">Ack Required</TableHead>
                <TableHead className="min-w-[140px]">Ack Rate</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileText className="h-8 w-8 opacity-40" />
                      <p className="text-sm font-medium">No HR documents match your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map(d => {
                const cat = HR_DOC_CATEGORIES.find(c => c.value === d.category)
                const ackOverdue = d.acknowledgmentRequired && d.acknowledgmentDueDate && daysUntil(d.acknowledgmentDueDate) < 0
                return (
                  <TableRow key={d.id} className="border-border/40 hover:bg-violet-50/30 dark:hover:bg-violet-500/5">
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate max-w-[220px]">{d.documentName}</p>
                          {d.description && <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">{d.description}</p>}
                          <p className="text-[10px] text-muted-foreground">{d.fileSize}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{cat && <Badge variant="secondary" className={cn("text-[10px] border-0", cat.color)}>{cat.label}</Badge>}</TableCell>
                    <TableCell>
                      <p className="text-xs text-foreground truncate max-w-[140px]">{d.entityName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{d.department || "—"}</p>
                    </TableCell>
                    <TableCell><span className="text-xs text-foreground">{d.visibleTo}</span></TableCell>
                    <TableCell><span className="text-xs text-foreground">{formatDate(d.uploadedDate)}</span></TableCell>
                    <TableCell><span className="text-xs text-foreground">{d.uploadedBy}</span></TableCell>
                    <TableCell><span className="text-xs text-foreground font-mono">{d.version}</span></TableCell>
                    <TableCell>
                      {d.acknowledgmentRequired ? (
                        <div>
                          <Badge variant="secondary" className={cn("text-[10px] border-0", ackOverdue ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400")}>Required</Badge>
                          {d.acknowledgmentDueDate && <p className="text-[10px] text-muted-foreground mt-0.5">Due {formatDate(d.acknowledgmentDueDate)}</p>}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {d.acknowledgmentRequired ? (
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">{d.acknowledgmentRate}%</span>
                            <span className="text-[10px] text-muted-foreground">acked</span>
                          </div>
                          <Progress value={d.acknowledgmentRate} className="h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-purple-600" />
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
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => onRowAction("Edit Details", d)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction("Preview", d)}><Eye className="h-3.5 w-3.5 mr-2" /> Preview</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction("Download", d)}><Download className="h-3.5 w-3.5 mr-2" /> Download</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {d.status !== "Published" && (
                            <DropdownMenuItem onClick={() => onRowAction("Publish", d)} className="text-emerald-700 dark:text-emerald-400"><Send className="h-3.5 w-3.5 mr-2" /> Publish</DropdownMenuItem>
                          )}
                          {d.status === "Published" && (
                            <DropdownMenuItem onClick={() => onRowAction("Unpublish", d)} className="text-amber-700 dark:text-amber-400"><Archive className="h-3.5 w-3.5 mr-2" /> Unpublish</DropdownMenuItem>
                          )}
                          {d.acknowledgmentRequired && (
                            <>
                              <DropdownMenuItem onClick={() => onRowAction("Send for Acknowledgment", d)}><Bell className="h-3.5 w-3.5 mr-2" /> Send for Acknowledgment</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onRowAction("View Acknowledgment Status", d)}><BarChart3 className="h-3.5 w-3.5 mr-2" /> View Acknowledgment Status</DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onRowAction("Create New Version", d)}><History className="h-3.5 w-3.5 mr-2" /> Create New Version</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction("Archive", d)}><Archive className="h-3.5 w-3.5 mr-2" /> Archive</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction("Delete", d)} className="text-rose-700 dark:text-rose-400"><XCircle className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
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

      <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <AckDialog doc={ackDoc} open={!!ackDoc} onClose={() => setAckDoc(null)} />
    </div>
  )
}

export default HRDocumentsSection
