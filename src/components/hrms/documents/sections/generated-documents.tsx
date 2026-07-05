"use client"

// =============================================================
// Documents → Generated Documents  (Task ID: 4-c, File 2)
// -------------------------------------------------------------
// Every generated letter/document with audit trail.
// Includes Generate New dialog, Bulk Generate dialog,
// realistic document Preview, and View Audit trail dialog.
// =============================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  FileCheck2, Plus, Search, Filter, MoreHorizontal, Eye, Download,
  Mail, RefreshCw, X, Archive, History, Layers, FileText, Send,
  CheckCircle2, CalendarDays, Building2, PenTool, ChevronRight,
  Sparkles, FileSignature, FileX2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Checkbox,
} from "@/components/ui/checkbox"

import {
  GeneratedDoc, SourceModule,
  ENTITIES, SOURCE_MODULES, STATUS_COLORS,
  formatDate, formatDateTime, initials, avatarColor,
} from "../shared"
import { GENERATED_DOCUMENTS, DOCUMENT_TEMPLATES, DOCUMENT_LOGS } from "../data"

// =============================================================
// Constants
// =============================================================

const SOURCE_BADGES: Record<SourceModule, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  "Manual": { color: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400", icon: FileText },
  "Employee Request": { color: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400", icon: Send },
  "Onboarding": { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400", icon: CheckCircle2 },
  "Offboarding": { color: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400", icon: FileX2 },
  "Payroll": { color: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400", icon: FileText },
  "Core HR": { color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400", icon: Building2 },
  "Bulk Generation": { color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400", icon: Layers },
}

const GENERATED_STATUSES: GeneratedDoc["status"][] = ["Generated", "Sent", "Downloaded", "Archived", "Cancelled"]

// =============================================================
// MAIN SECTION
// =============================================================

export function GeneratedDocumentsSection() {
  const [docs, setDocs] = useState<GeneratedDoc[]>(GENERATED_DOCUMENTS)

  // Filters
  const [search, setSearch] = useState("")
  const [filterEntity, setFilterEntity] = useState("All")
  const [filterSource, setFilterSource] = useState("All")
  const [filterTemplate, setFilterTemplate] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")
  const [filterFrom, setFilterFrom] = useState("")
  const [filterTo, setFilterTo] = useState("")
  const [filterGeneratedBy, setFilterGeneratedBy] = useState("All")

  // Dialogs
  const [generateOpen, setGenerateOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [previewTarget, setPreviewTarget] = useState<GeneratedDoc | null>(null)
  const [auditTarget, setAuditTarget] = useState<GeneratedDoc | null>(null)

  const uniqueTemplates = useMemo(() => Array.from(new Set(docs.map(d => d.templateName))), [docs])
  const uniqueGenerators = useMemo(() => Array.from(new Set(docs.map(d => d.generatedBy))), [docs])

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (search) {
        const q = search.toLowerCase()
        if (!d.generatedId.toLowerCase().includes(q) &&
            !d.documentName.toLowerCase().includes(q) &&
            !d.employeeName.toLowerCase().includes(q) &&
            !d.employeeCode.toLowerCase().includes(q) &&
            !d.templateName.toLowerCase().includes(q)) return false
      }
      if (filterEntity !== "All" && d.entityName !== filterEntity) return false
      if (filterSource !== "All" && d.sourceModule !== filterSource) return false
      if (filterTemplate !== "All" && d.templateName !== filterTemplate) return false
      if (filterStatus !== "All" && d.status !== filterStatus) return false
      if (filterGeneratedBy !== "All" && d.generatedBy !== filterGeneratedBy) return false
      if (filterFrom && new Date(d.generatedDate) < new Date(filterFrom)) return false
      if (filterTo && new Date(d.generatedDate) > new Date(filterTo)) return false
      return true
    })
  }, [docs, search, filterEntity, filterSource, filterTemplate, filterStatus, filterFrom, filterTo, filterGeneratedBy])

  // Stats
  const stats = useMemo(() => {
    const now = new Date()
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1)
    const total = docs.length
    const thisMonth = docs.filter(d => new Date(d.generatedDate) >= monthAgo).length
    const eSigned = docs.filter(d => d.eSigned).length
    const sent = docs.filter(d => d.status === "Sent").length
    const downloaded = docs.filter(d => d.status === "Downloaded").length
    const archived = docs.filter(d => d.status === "Archived").length
    return { total, thisMonth, eSigned, sent, downloaded, archived }
  }, [docs])

  function handleAction(action: string, d: GeneratedDoc) {
    switch (action) {
      case "preview":
        setPreviewTarget(d); break
      case "download":
        toast.success(`Downloading PDF: ${d.documentName}`)
        setDocs(prev => prev.map(x => x.id === d.id ? { ...x, status: "Downloaded" as GeneratedDoc["status"] } : x))
        break
      case "email":
        toast.success(`Emailing ${d.documentName} to ${d.employeeName}`)
        setDocs(prev => prev.map(x => x.id === d.id ? { ...x, status: "Sent" as GeneratedDoc["status"] } : x))
        break
      case "regenerate":
        toast.info(`Regenerating ${d.documentName}...`)
        setTimeout(() => toast.success(`Regenerated: ${d.documentName}`), 800)
        break
      case "cancel":
        setDocs(prev => prev.map(x => x.id === d.id ? { ...x, status: "Cancelled" as GeneratedDoc["status"] } : x))
        toast.info(`Document cancelled: ${d.documentName}`)
        break
      case "archive":
        setDocs(prev => prev.map(x => x.id === d.id ? { ...x, status: "Archived" as GeneratedDoc["status"] } : x))
        toast.success(`Archived: ${d.documentName}`)
        break
      case "audit":
        setAuditTarget(d); break
    }
  }

  function handleGenerate(input: { template: string; employeeName: string; employeeCode: string; source: SourceModule; entityName: string }) {
    const tpl = DOCUMENT_TEMPLATES.find(t => t.name === input.template) || DOCUMENT_TEMPLATES[0]
    const ent = ENTITIES.find(e => e.name === input.entityName) || ENTITIES[0]
    const newDoc: GeneratedDoc = {
      id: `gd-${Date.now()}`,
      generatedId: `GEN-DOC-2024-${String(docs.length + 1).padStart(4, "0")}`,
      documentName: `${tpl.name} — ${input.employeeName}`,
      templateName: tpl.name,
      employeeCode: input.employeeCode,
      employeeName: input.employeeName,
      entityId: ent.id,
      entityName: ent.name,
      generatedDate: new Date().toISOString(),
      generatedBy: "Anita Desai",
      sourceModule: input.source,
      status: "Generated",
      fileSize: "175 KB",
      eSigned: tpl.eSignRequired,
    }
    setDocs(prev => [newDoc, ...prev])
    toast.success(`Generated: ${newDoc.documentName}`)
    setGenerateOpen(false)
  }

  function handleBulkGenerate(input: { template: string; employees: string[]; source: SourceModule; entityName: string }) {
    const count = input.employees.length
    toast.success(`Bulk generated ${count} ${input.template}(s) for ${input.entityName}`)
    setBulkOpen(false)
  }

  function clearFilters() {
    setSearch(""); setFilterEntity("All"); setFilterSource("All")
    setFilterTemplate("All"); setFilterStatus("All"); setFilterFrom("")
    setFilterTo(""); setFilterGeneratedBy("All")
  }

  const hasFilters = search || filterEntity !== "All" || filterSource !== "All" ||
    filterTemplate !== "All" || filterStatus !== "All" || filterFrom || filterTo ||
    filterGeneratedBy !== "All"

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-soft">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Generated Documents</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Every generated letter &amp; document with complete audit trail.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("Exporting generated documents...")}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setBulkOpen(true)}>
            <Layers className="h-4 w-4" /> Bulk Generate
          </Button>
          <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setGenerateOpen(true)}>
            <Plus className="h-4 w-4" /> Generate New
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatTile label="Total Generated" value={stats.total} icon={FileCheck2} accent="violet" />
        <StatTile label="This Month" value={stats.thisMonth} icon={CalendarDays} accent="emerald" />
        <StatTile label="E-Signed" value={stats.eSigned} icon={PenTool} accent="fuchsia" />
        <StatTile label="Sent to Employee" value={stats.sent} icon={Send} accent="sky" />
        <StatTile label="Downloaded" value={stats.downloaded} icon={Download} accent="cyan" />
        <StatTile label="Archived" value={stats.archived} icon={Archive} accent="slate" />
      </div>

      {/* Filter bar */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ID, name, employee or template..."
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect label="Entity" value={filterEntity} onChange={setFilterEntity} options={["All", ...ENTITIES.map(e => e.name)]} />
              <FilterSelect label="Source" value={filterSource} onChange={setFilterSource} options={["All", ...SOURCE_MODULES]} />
              <FilterSelect label="Template" value={filterTemplate} onChange={setFilterTemplate} options={["All", ...uniqueTemplates]} />
              <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={["All", ...GENERATED_STATUSES]} />
              <FilterSelect label="Generated By" value={filterGeneratedBy} onChange={setFilterGeneratedBy} options={["All", ...uniqueGenerators]} />
              <div className="flex items-center gap-1">
                <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="h-9 w-[140px] text-xs" />
                <span className="text-muted-foreground text-xs">→</span>
                <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="h-9 w-[140px] text-xs" />
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TH>Generated ID</TH>
                  <TH>Document Name</TH>
                  <TH>Template</TH>
                  <TH>Employee</TH>
                  <TH>Entity</TH>
                  <TH>Generated Date</TH>
                  <TH>Generated By</TH>
                  <TH>Source Module</TH>
                  <TH>E-Sign</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => {
                  const src = SOURCE_BADGES[d.sourceModule]
                  const SrcIcon = src.icon
                  return (
                    <TableRow key={d.id} className="border-border/40 hover:bg-violet-50/30 dark:hover:bg-violet-500/5 transition-colors">
                      <TableCell className="text-xs font-medium text-foreground whitespace-nowrap">{d.generatedId}</TableCell>
                      <TableCell className="text-xs text-foreground/90 max-w-[220px] truncate" title={d.documentName}>{d.documentName}</TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{d.templateName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5 min-w-[160px]">
                          <div className={cn("grid h-7 w-7 place-items-center rounded-lg text-white text-[10px] font-semibold shrink-0", avatarColor(d.employeeName))}>
                            {initials(d.employeeName)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">{d.employeeName}</div>
                            <div className="text-[10px] text-muted-foreground">{d.employeeCode}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{d.entityName}</TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{formatDateTime(d.generatedDate)}</TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap max-w-[150px] truncate" title={d.generatedBy}>{d.generatedBy}</TableCell>
                      <TableCell>
                        <Badge className={cn("font-medium border-0 gap-1", src.color)}>
                          <SrcIcon className="h-3 w-3" /> {d.sourceModule}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {d.eSigned ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("font-medium border-0", STATUS_COLORS[d.status] || "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400")}>
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-violet-500/10">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleAction("preview", d)}><Eye className="h-4 w-4 mr-2" /> Preview</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction("download", d)}><Download className="h-4 w-4 mr-2" /> Download PDF</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction("email", d)}><Mail className="h-4 w-4 mr-2" /> Email</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction("regenerate", d)}><RefreshCw className="h-4 w-4 mr-2" /> Regenerate</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleAction("audit", d)}><History className="h-4 w-4 mr-2" /> View Audit</DropdownMenuItem>
                            {d.status !== "Archived" && d.status !== "Cancelled" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleAction("archive", d)}><Archive className="h-4 w-4 mr-2" /> Archive</DropdownMenuItem>
                                <DropdownMenuItem className="text-rose-600 dark:text-rose-400" onClick={() => handleAction("cancel", d)}><X className="h-4 w-4 mr-2" /> Cancel</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="py-12 text-center text-muted-foreground text-sm">
                      No generated documents match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <GenerateDialog open={generateOpen} onClose={() => setGenerateOpen(false)} onSubmit={handleGenerate} />
      <BulkGenerateDialog open={bulkOpen} onClose={() => setBulkOpen(false)} onSubmit={handleBulkGenerate} />
      <PreviewDialog doc={previewTarget} onClose={() => setPreviewTarget(null)} onAction={handleAction} />
      <AuditDialog doc={auditTarget} onClose={() => setAuditTarget(null)} />
    </div>
  )
}

// =============================================================
// Sub-components
// =============================================================

function StatTile({
  label, value, icon: Icon, accent,
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  accent: "violet" | "emerald" | "fuchsia" | "sky" | "cyan" | "slate"
}) {
  const accents: Record<string, string> = {
    violet: "from-violet-500/10 to-violet-500/5 text-violet-600 dark:text-violet-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    fuchsia: "from-fuchsia-500/10 to-fuchsia-500/5 text-fuchsia-600 dark:text-fuchsia-400",
    sky: "from-sky-500/10 to-sky-500/5 text-sky-600 dark:text-sky-400",
    cyan: "from-cyan-500/10 to-cyan-500/5 text-cyan-600 dark:text-cyan-400",
    slate: "from-slate-500/10 to-slate-500/5 text-slate-600 dark:text-slate-400",
  }
  return (
    <Card className="border-border/60 shadow-soft">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="text-lg font-semibold text-foreground tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide hidden sm:inline">{label}:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

function TH({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <TableHead className={cn("text-[11px] uppercase tracking-wide text-muted-foreground font-semibold whitespace-nowrap min-w-[120px]", className)}>
      {children}
    </TableHead>
  )
}

// =============================================================
// Generate New Dialog
// =============================================================

function GenerateDialog({
  open, onClose, onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (input: { template: string; employeeName: string; employeeCode: string; source: SourceModule; entityName: string }) => void
}) {
  const [template, setTemplate] = useState(DOCUMENT_TEMPLATES[0].name)
  const [employeeName, setEmployeeName] = useState("Aarav Sharma")
  const [employeeCode, setEmployeeCode] = useState("EMP-001")
  const [entityName, setEntityName] = useState(ENTITIES[0].name)
  const [source, setSource] = useState<SourceModule>("Manual")
  const [confirmStep, setConfirmStep] = useState(false)

  function reset() {
    setTemplate(DOCUMENT_TEMPLATES[0].name); setEmployeeName("Aarav Sharma")
    setEmployeeCode("EMP-001"); setEntityName(ENTITIES[0].name)
    setSource("Manual"); setConfirmStep(false)
  }

  function handleConfirm() {
    onSubmit({ template, employeeName, employeeCode, source, entityName })
    reset()
  }

  const tpl = DOCUMENT_TEMPLATES.find(t => t.name === template)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (onClose(), reset())}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-violet-500/8 via-transparent to-transparent shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" /> Generate New Document
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select a template, employee and source module — preview then confirm.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Template *</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TEMPLATES.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {tpl && (
                <div className="text-[11px] text-muted-foreground">
                  Category: {tpl.category} · Page: {tpl.pageSize} · E-Sign: {tpl.eSignRequired ? "Required" : "Optional"}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Entity *</Label>
              <Select value={entityName} onValueChange={setEntityName}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITIES.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <FieldInput label="Employee Name *" value={employeeName} onChange={setEmployeeName} />
            <FieldInput label="Employee Code *" value={employeeCode} onChange={setEmployeeCode} />
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label className="text-xs font-medium">Source Module</Label>
              <Select value={source} onValueChange={(v) => setSource(v as SourceModule)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_MODULES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs font-medium mb-2 block">Document Preview</Label>
              <DocumentPreview doc={{
                id: "preview", generatedId: "PREVIEW", documentName: `${template} — ${employeeName}`,
                templateName: template, employeeCode, employeeName,
                entityId: "ent-1", entityName, generatedDate: new Date().toISOString(),
                generatedBy: "Anita Desai", sourceModule: source, status: "Generated",
                fileSize: "—", eSigned: tpl?.eSignRequired || false,
              }} compact />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/30 shrink-0">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { onClose(); reset() }}>
            <X className="h-4 w-4" /> Cancel
          </Button>
          {confirmStep ? (
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConfirm}>
              <CheckCircle2 className="h-4 w-4" /> Confirm &amp; Generate
            </Button>
          ) : (
            <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setConfirmStep(true)}>
              <Eye className="h-4 w-4" /> Preview &amp; Confirm
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldInput({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9" />
    </div>
  )
}

// =============================================================
// Bulk Generate Dialog
// =============================================================

const BULK_EMPLOYEES = [
  "EMP-001 Aarav Sharma", "EMP-002 Priya Nair", "EMP-003 Vikram Reddy",
  "EMP-004 Sneha Iyer", "EMP-005 Rahul Verma", "EMP-006 Kavya Patel",
  "EMP-007 Arjun Mehta", "EMP-008 Diya Kapoor", "EMP-009 Karan Malhotra",
  "EMP-010 Rohan Gupta", "EMP-011 Ananya Singh", "EMP-012 Fatima Al-Sayed",
]

function BulkGenerateDialog({
  open, onClose, onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (input: { template: string; employees: string[]; source: SourceModule; entityName: string }) => void
}) {
  const [template, setTemplate] = useState(DOCUMENT_TEMPLATES[0].name)
  const [entityName, setEntityName] = useState(ENTITIES[0].name)
  const [source, setSource] = useState<SourceModule>("Bulk Generation")
  const [selected, setSelected] = useState<string[]>([BULK_EMPLOYEES[0], BULK_EMPLOYEES[1], BULK_EMPLOYEES[2]])

  function toggle(emp: string) {
    setSelected(prev => prev.includes(emp) ? prev.filter(e => e !== emp) : [...prev, emp])
  }

  function handleSubmit() {
    if (selected.length === 0) { toast.error("Please select at least one employee"); return }
    onSubmit({ template, employees: selected, source, entityName })
    setSelected([BULK_EMPLOYEES[0], BULK_EMPLOYEES[1], BULK_EMPLOYEES[2]])
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-violet-500/8 via-transparent to-transparent shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-600" /> Bulk Generate
          </DialogTitle>
          <DialogDescription className="text-xs">
            Generate the same template for multiple employees in one batch.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Template *</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TEMPLATES.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Entity</Label>
              <Select value={entityName} onValueChange={setEntityName}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITIES.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label className="text-xs font-medium">Source Module</Label>
              <Select value={source} onValueChange={(v) => setSource(v as SourceModule)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_MODULES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Select Employees ({selected.length} selected)</Label>
                <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => setSelected(selected.length === BULK_EMPLOYEES.length ? [] : [...BULK_EMPLOYEES])}>
                  {selected.length === BULK_EMPLOYEES.length ? "Deselect all" : "Select all"}
                </Button>
              </div>
              <div className="rounded-lg border border-border/60 max-h-72 overflow-y-auto">
                {BULK_EMPLOYEES.map(emp => {
                  const checked = selected.includes(emp)
                  return (
                    <label key={emp} className={cn(
                      "flex items-center gap-2.5 px-3 py-2 cursor-pointer text-xs border-b border-border/40 last:border-0 hover:bg-violet-50/30 dark:hover:bg-violet-500/5",
                      checked && "bg-violet-50/50 dark:bg-violet-500/10",
                    )}>
                      <Checkbox checked={checked} onCheckedChange={() => toggle(emp)} />
                      <span className="text-foreground">{emp}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/30 shrink-0">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onClose}>
            <X className="h-4 w-4" /> Cancel
          </Button>
          <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white" onClick={handleSubmit} disabled={selected.length === 0}>
            <Layers className="h-4 w-4" /> Generate {selected.length > 0 ? `(${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================
// Document Preview
// =============================================================

function DocumentPreview({ doc, compact }: { doc: GeneratedDoc; compact?: boolean }) {
  return (
    <div className={cn(
      "rounded-lg border border-border/60 bg-white dark:bg-slate-950 shadow-inner overflow-hidden",
      compact ? "p-4" : "p-8",
    )} style={{ aspectRatio: compact ? undefined : "1 / 1.414" }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-violet-500 pb-3 mb-4">
        <div>
          <div className="text-base font-bold text-violet-700 dark:text-violet-400">ACME Corp</div>
          <div className="text-[10px] text-muted-foreground">{doc.entityName}</div>
        </div>
        <div className="text-right text-[10px] text-muted-foreground">
          <div>Ref: {doc.generatedId}</div>
          <div>Date: {formatDate(doc.generatedDate)}</div>
        </div>
      </div>
      {/* Title */}
      <div className="text-center mb-4">
        <div className="text-sm font-bold uppercase tracking-wide text-foreground">{doc.templateName}</div>
        <div className="text-[10px] text-muted-foreground">To Whom It May Concern</div>
      </div>
      {/* Body */}
      <div className="space-y-2 text-[11px] text-foreground/90 leading-relaxed">
        <p>This is to certify that <strong>{doc.employeeName}</strong> ({doc.employeeCode}) is a bona fide employee of {doc.entityName}, working in the capacity stated in our records.</p>
        <p>The details of employment are maintained in our HR system and may be verified upon written request from authorized parties.</p>
        <p>This document is generated on {formatDate(doc.generatedDate)} and is valid for the purpose stated by the employee at the time of request.</p>
        {doc.eSigned && (
          <p className="italic text-muted-foreground">This document is electronically signed and verified.</p>
        )}
      </div>
      <div className="mt-8 flex items-end justify-between">
        <div className="text-[10px] text-muted-foreground">
          <div>Generated by: {doc.generatedBy}</div>
          <div>Source: {doc.sourceModule}</div>
        </div>
        <div className="text-center">
          {doc.eSigned ? (
            <>
              <PenTool className="h-8 w-8 text-violet-600 mx-auto mb-1" />
              <div className="text-[10px] font-semibold text-violet-700 dark:text-violet-400">E-Signed</div>
            </>
          ) : (
            <div className="text-[10px] text-muted-foreground">For {doc.entityName}</div>
          )}
        </div>
      </div>
      {/* Footer */}
      <div className="border-t border-border/60 mt-4 pt-2 text-[9px] text-muted-foreground text-center">
        This is a computer-generated document. Verification: {doc.generatedId} · © ACME Corp
      </div>
    </div>
  )
}

// =============================================================
// Preview Dialog
// =============================================================

function PreviewDialog({
  doc, onClose, onAction,
}: {
  doc: GeneratedDoc | null
  onClose: () => void
  onAction: (action: string, d: GeneratedDoc) => void
}) {
  if (!doc) return null
  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-violet-500/8 via-transparent to-transparent shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-violet-600" /> {doc.documentName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {doc.generatedId} · {doc.templateName} · {doc.employeeName} ({doc.employeeCode})
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <DocumentPreview doc={doc} />
              </div>
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs space-y-1.5">
                  <InfoRow label="Status" value={doc.status} />
                  <InfoRow label="Generated Date" value={formatDateTime(doc.generatedDate)} />
                  <InfoRow label="Generated By" value={doc.generatedBy} />
                  <InfoRow label="Source Module" value={doc.sourceModule} />
                  <InfoRow label="File Size" value={doc.fileSize} />
                  <InfoRow label="E-Signed" value={doc.eSigned ? "Yes" : "No"} />
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => onAction("download", doc)}>
                    <Download className="h-4 w-4" /> Download PDF
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onAction("email", doc)}>
                    <Mail className="h-4 w-4" /> Email to Employee
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onAction("regenerate", doc)}>
                    <RefreshCw className="h-4 w-4" /> Regenerate
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/30 shrink-0">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onClose}>
            <X className="h-4 w-4" /> Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  )
}

// =============================================================
// Audit Dialog
// =============================================================

function AuditDialog({ doc, onClose }: { doc: GeneratedDoc | null; onClose: () => void }) {
  const auditLogs = useMemo(() => {
    if (!doc) return []
    return DOCUMENT_LOGS.filter(l => l.documentId === doc.id || l.documentName === doc.documentName)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [doc])

  // Build a synthetic timeline even if logs are sparse
  const syntheticTimeline = useMemo(() => {
    if (!doc) return []
    const t: { action: string; actor: string; time: string; details: string }[] = [
      { action: "Created", actor: doc.generatedBy, time: doc.generatedDate, details: `Document generated from ${doc.sourceModule} source` },
    ]
    if (doc.status === "Sent" || doc.status === "Downloaded" || doc.status === "Archived") {
      t.push({ action: "Sent", actor: doc.generatedBy, time: new Date(new Date(doc.generatedDate).getTime() + 3600000).toISOString(), details: `Sent to ${doc.employeeName} via email` })
    }
    if (doc.eSigned) {
      t.push({ action: "E-Sign", actor: doc.generatedBy, time: new Date(new Date(doc.generatedDate).getTime() + 1800000).toISOString(), details: `E-signed via Adobe Sign` })
    }
    if (doc.status === "Downloaded") {
      t.push({ action: "Downloaded", actor: doc.employeeName, time: new Date(new Date(doc.generatedDate).getTime() + 7200000).toISOString(), details: `Downloaded by employee` })
    }
    if (doc.status === "Archived") {
      t.push({ action: "Archived", actor: "System", time: new Date(new Date(doc.generatedDate).getTime() + 30 * 86400000).toISOString(), details: `Auto-archived after retention period` })
    }
    if (doc.status === "Cancelled") {
      t.push({ action: "Cancelled", actor: doc.generatedBy, time: new Date(new Date(doc.generatedDate).getTime() + 7200000).toISOString(), details: `Document cancelled` })
    }
    // Add extra logs from DOCUMENT_LOGS
    auditLogs.forEach(l => {
      if (!t.find(x => x.action === l.action)) {
        t.push({ action: l.action, actor: l.performedBy, time: l.timestamp, details: l.details })
      }
    })
    return t.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  }, [doc, auditLogs])

  if (!doc) return null
  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-violet-500/8 via-transparent to-transparent shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-violet-600" /> Audit Trail
          </DialogTitle>
          <DialogDescription className="text-xs">
            {doc.documentName} · {doc.generatedId}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-5">
            <ol className="relative border-l border-border/60 ml-2 space-y-4">
              {syntheticTimeline.map((t, idx) => (
                <li key={idx} className="ml-4">
                  <div className={cn(
                    "absolute -left-2 grid h-4 w-4 place-items-center rounded-full",
                    idx === 0 ? "bg-violet-600" : "bg-slate-400 dark:bg-slate-600",
                  )}>
                    <ChevronRight className="h-2.5 w-2.5 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400 border-0 text-[10px]">{t.action}</Badge>
                    <span className="text-xs font-medium text-foreground">{t.actor}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{formatDateTime(t.time)}</div>
                  <div className="text-xs text-foreground/80 mt-1">{t.details}</div>
                </li>
              ))}
            </ol>
          </div>
        </ScrollArea>
        <DialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/30 shrink-0">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onClose}>
            <X className="h-4 w-4" /> Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default GeneratedDocumentsSection
