"use client"

// ============================================================================
//  FnF Letters — generate / issue / download FnF-related letters
//  Rose/pink accents. Filter, stats, table, generate dialog, letter preview.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  FileText, Search, Filter, Plus, Download, Mail, Send, Eye, Clock,
  CheckCircle2, Layers, Building2, Files,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

import { FNF_CASES } from "../data"
import {
  initials, avatarColor, formatDate, formatDateTime, formatCurrency,
  STATUS_COLORS,
} from "../shared"

type LetterType = "FnF Settlement" | "Relieving" | "Experience" | "No Dues"
type LetterStatus = "Draft" | "Generated" | "Issued" | "Downloaded"

interface FnFLetter {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  entity: string
  designation: string
  department: string
  letterType: LetterType
  fnfCaseId: string
  generatedAt?: string
  issuedAt?: string
  status: LetterStatus
  netPayable: number
  doj: string
  lwd: string
}

const LETTER_TYPES: LetterType[] = ["FnF Settlement", "Relieving", "Experience", "No Dues"]
const LETTER_TEMPLATES = [
  "Standard FnF Settlement Letter",
  "Detailed Relieving Letter",
  "Experience Certificate (Standard)",
  "No Dues Certificate",
  "Custom Template",
]

// Synthesize ~8 letter records
const LETTERS: FnFLetter[] = [
  { id: "lt-1", employeeId: "EMP-1185", employeeName: "Rahul Verma", employeeCode: "EMP-1185", entity: "ACME India Pvt Ltd", designation: "Software Engineer", department: "Engineering", letterType: "FnF Settlement", fnfCaseId: "fnf-2", generatedAt: new Date(Date.now() - 20 * 86400000).toISOString(), issuedAt: new Date(Date.now() - 18 * 86400000).toISOString(), status: "Downloaded", netPayable: 197000, doj: new Date(Date.now() - 1080 * 86400000).toISOString().slice(0, 10), lwd: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10) },
  { id: "lt-2", employeeId: "EMP-1185", employeeName: "Rahul Verma", employeeCode: "EMP-1185", entity: "ACME India Pvt Ltd", designation: "Software Engineer", department: "Engineering", letterType: "Relieving", fnfCaseId: "fnf-2", generatedAt: new Date(Date.now() - 20 * 86400000).toISOString(), issuedAt: new Date(Date.now() - 12 * 86400000).toISOString(), status: "Issued", netPayable: 197000, doj: new Date(Date.now() - 1080 * 86400000).toISOString().slice(0, 10), lwd: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10) },
  { id: "lt-3", employeeId: "EMP-1185", employeeName: "Rahul Verma", employeeCode: "EMP-1185", entity: "ACME India Pvt Ltd", designation: "Software Engineer", department: "Engineering", letterType: "Experience", fnfCaseId: "fnf-2", generatedAt: new Date(Date.now() - 19 * 86400000).toISOString(), issuedAt: new Date(Date.now() - 11 * 86400000).toISOString(), status: "Issued", netPayable: 197000, doj: new Date(Date.now() - 1080 * 86400000).toISOString().slice(0, 10), lwd: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10) },
  { id: "lt-4", employeeId: "EMP-1180", employeeName: "Suresh Babu", employeeCode: "EMP-1180", entity: "ACME India Pvt Ltd", designation: "Operations Analyst", department: "Operations", letterType: "FnF Settlement", fnfCaseId: "fnf-3", generatedAt: new Date(Date.now() - 48 * 86400000).toISOString(), status: "Generated", netPayable: 99000, doj: new Date(Date.now() - 540 * 86400000).toISOString().slice(0, 10), lwd: new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10) },
  { id: "lt-5", employeeId: "EMP-1170", employeeName: "Amit Saxena", employeeCode: "EMP-1170", entity: "ACME India Pvt Ltd", designation: "Sales Executive", department: "Sales", letterType: "FnF Settlement", fnfCaseId: "fnf-5", generatedAt: new Date(Date.now() - 90 * 86400000).toISOString(), issuedAt: new Date(Date.now() - 85 * 86400000).toISOString(), status: "Downloaded", netPayable: 137000, doj: new Date(Date.now() - 1440 * 86400000).toISOString().slice(0, 10), lwd: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10) },
  { id: "lt-6", employeeId: "EMP-1170", employeeName: "Amit Saxena", employeeCode: "EMP-1170", entity: "ACME India Pvt Ltd", designation: "Sales Executive", department: "Sales", letterType: "Relieving", fnfCaseId: "fnf-5", generatedAt: new Date(Date.now() - 90 * 86400000).toISOString(), issuedAt: new Date(Date.now() - 88 * 86400000).toISOString(), status: "Issued", netPayable: 137000, doj: new Date(Date.now() - 1440 * 86400000).toISOString().slice(0, 10), lwd: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10) },
  { id: "lt-7", employeeId: "EMP-1170", employeeName: "Amit Saxena", employeeCode: "EMP-1170", entity: "ACME India Pvt Ltd", designation: "Sales Executive", department: "Sales", letterType: "No Dues", fnfCaseId: "fnf-5", generatedAt: new Date(Date.now() - 92 * 86400000).toISOString(), issuedAt: new Date(Date.now() - 89 * 86400000).toISOString(), status: "Issued", netPayable: 137000, doj: new Date(Date.now() - 1440 * 86400000).toISOString().slice(0, 10), lwd: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10) },
  { id: "lt-8", employeeId: "EMP-1190", employeeName: "Pooja Iyer", employeeCode: "EMP-1190", entity: "ACME India Pvt Ltd", designation: "CS Executive", department: "Customer Success", letterType: "FnF Settlement", fnfCaseId: "fnf-1", status: "Draft", netPayable: 45000, doj: new Date(Date.now() - 720 * 86400000).toISOString().slice(0, 10), lwd: new Date(Date.now() + 51 * 86400000).toISOString().slice(0, 10) },
]

const LETTER_EMP_OPTIONS = FNF_CASES.map(c => ({
  id: c.id,
  empId: c.employeeId,
  name: c.employeeName,
  code: c.employeeCode,
  entity: c.entity,
  dept: c.department,
  desg: c.designation,
  doj: c.doj,
  lwd: c.lwd,
  netPayable: c.netPayable,
}))

const ACCENT_MAP: Record<string, { grad: string; text: string; ring: string }> = {
  rose:    { grad: "from-rose-500/15 to-pink-500/5",     text: "text-rose-600 dark:text-rose-400",     ring: "ring-rose-500/20" },
  amber:   { grad: "from-amber-500/15 to-orange-500/5",  text: "text-amber-600 dark:text-amber-400",   ring: "ring-amber-500/20" },
  emerald: { grad: "from-emerald-500/15 to-teal-500/5",  text: "text-emerald-600 dark:text-emerald-400",ring: "ring-emerald-500/20" },
  teal:    { grad: "from-teal-500/15 to-cyan-500/5",     text: "text-teal-600 dark:text-teal-400",     ring: "ring-teal-500/20" },
  slate:   { grad: "from-slate-500/15 to-slate-500/5",   text: "text-slate-600 dark:text-slate-400",   ring: "ring-slate-500/20" },
  pink:    { grad: "from-pink-500/15 to-rose-500/5",     text: "text-pink-600 dark:text-pink-400",     ring: "ring-pink-500/20" },
  cyan:    { grad: "from-cyan-500/15 to-teal-500/5",     text: "text-cyan-600 dark:text-cyan-400",     ring: "ring-cyan-500/20" },
}
type Accent = keyof typeof ACCENT_MAP

function StatCard({
  label, value, icon: Icon, accent, sub,
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  accent: Accent
  sub?: string
}) {
  const a = ACCENT_MAP[accent] || ACCENT_MAP.rose
  return (
    <Card className={cn("relative overflow-hidden border border-border/60 rounded-xl shadow-soft hover:shadow-card transition-all bg-gradient-to-br", a.grad)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl font-semibold mt-1 text-foreground tabular-nums leading-none">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-1 truncate">{sub}</p>}
          </div>
          <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-background/70 ring-1 backdrop-blur-sm", a.ring, a.text)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
export function FnFLettersSection() {
  const [letters, setLetters] = useState<FnFLetter[]>(LETTERS)
  const [entityFilter, setEntityFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [genOpen, setGenOpen] = useState(false)
  const [genForm, setGenForm] = useState({
    letterType: "FnF Settlement" as LetterType,
    fnfCaseId: "",
    template: LETTER_TEMPLATES[0],
  })

  const [previewLetter, setPreviewLetter] = useState<FnFLetter | null>(null)

  const entityOptions = useMemo(() => Array.from(new Set(letters.map(l => l.entity))), [letters])

  const filtered = useMemo(() => {
    return letters.filter(l => {
      if (entityFilter !== "all" && l.entity !== entityFilter) return false
      if (typeFilter !== "all" && l.letterType !== typeFilter) return false
      if (statusFilter !== "all" && l.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return l.employeeName.toLowerCase().includes(q) ||
          l.employeeCode.toLowerCase().includes(q) ||
          l.fnfCaseId.toLowerCase().includes(q) ||
          l.letterType.toLowerCase().includes(q)
      }
      return true
    })
  }, [letters, entityFilter, typeFilter, statusFilter, search])

  const stats = useMemo(() => {
    const total = letters.length
    const generated = letters.filter(l => l.status === "Generated" || l.status === "Issued" || l.status === "Downloaded").length
    const issued = letters.filter(l => l.status === "Issued" || l.status === "Downloaded").length
    const downloaded = letters.filter(l => l.status === "Downloaded").length
    const pending = letters.filter(l => l.status === "Draft").length
    return { total, generated, issued, downloaded, pending }
  }, [letters])

  const selectedCase = LETTER_EMP_OPTIONS.find(e => e.id === genForm.fnfCaseId)

  const handleGenerate = () => {
    if (!genForm.fnfCaseId) {
      toast.error("Please select an FnF case / employee.")
      return
    }
    if (!selectedCase) return
    const newLetter: FnFLetter = {
      id: `lt-${Date.now()}`,
      employeeId: selectedCase.empId,
      employeeName: selectedCase.name,
      employeeCode: selectedCase.code,
      entity: selectedCase.entity,
      designation: selectedCase.desg,
      department: selectedCase.dept,
      letterType: genForm.letterType,
      fnfCaseId: selectedCase.id,
      generatedAt: new Date().toISOString(),
      status: "Generated",
      netPayable: selectedCase.netPayable,
      doj: selectedCase.doj,
      lwd: selectedCase.lwd,
    }
    setLetters(prev => [newLetter, ...prev])
    toast.success(`${genForm.letterType} letter generated`, {
      description: `${selectedCase.name} · ${selectedCase.id}`,
    })
    setGenOpen(false)
    setGenForm({ letterType: "FnF Settlement", fnfCaseId: "", template: LETTER_TEMPLATES[0] })
  }

  const handleIssue = (l: FnFLetter) => {
    setLetters(prev => prev.map(x => x.id === l.id ? { ...x, status: "Issued" as const, issuedAt: new Date().toISOString() } : x))
    toast.success("Letter issued", { description: `${l.letterType} · ${l.employeeName}` })
  }

  const handleDownload = (l: FnFLetter) => {
    setLetters(prev => prev.map(x => x.id === l.id ? { ...x, status: "Downloaded" as const } : x))
    toast.success("Letter downloaded", { description: `${l.letterType} · ${l.employeeName} · PDF` })
  }

  const handleEmail = (l: FnFLetter) => {
    toast.success("Letter emailed", { description: `${l.letterType} · sent to ${l.employeeCode.toLowerCase()}@acme.com` })
  }

  const handleBulkGenerate = () => {
    const drafts = FNF_CASES.filter(c => c.status === "Approved" || c.status === "Paid")
    let count = 0
    drafts.forEach(c => {
      // skip if already exists
      if (letters.some(l => l.fnfCaseId === c.id && l.letterType === "FnF Settlement")) return
      count++
    })
    toast.success("Bulk generate triggered", {
      description: `${count} new FnF settlement letters queued for generation.`,
    })
  }

  const clearFilters = () => { setEntityFilter("all"); setTypeFilter("all"); setStatusFilter("all"); setSearch("") }
  const hasFilters = entityFilter !== "all" || typeFilter !== "all" || statusFilter !== "all" || search

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-soft">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">FnF Letters</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Generate &amp; issue FnF settlement, relieving, experience &amp; no-dues letters.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={handleBulkGenerate} className="gap-1.5">
            <Files className="h-4 w-4" /> Bulk Generate
          </Button>
          <Button size="sm" onClick={() => setGenOpen(true)} className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
            <Plus className="h-4 w-4" /> Generate Letter
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by employee, letter type or case…"
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:items-center">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[160px]"><SelectValue placeholder="Entity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[160px]"><SelectValue placeholder="Letter Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {LETTER_TYPES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Generated">Generated</SelectItem>
                  <SelectItem value="Issued">Issued</SelectItem>
                  <SelectItem value="Downloaded">Downloaded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>Showing {filtered.length} of {letters.length} letters</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>Clear filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Letters" value={stats.total} icon={Layers} accent="rose" />
        <StatCard label="Generated" value={stats.generated} icon={FileText} accent="cyan" />
        <StatCard label="Issued" value={stats.issued} icon={Send} accent="emerald" />
        <StatCard label="Downloaded" value={stats.downloaded} icon={Download} accent="teal" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} accent="amber" />
      </div>

      {/* Letters table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px] rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 sticky top-0 z-10">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Employee</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Letter Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">FnF Case</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Generated At</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Issued At</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="h-8 w-8 opacity-40" />
                        <p className="text-sm">No letters match your filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map(l => (
                  <TableRow key={l.id} className="hover:bg-rose-500/5 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white", avatarColor(l.employeeId))}>
                          {initials(l.employeeName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{l.employeeName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{l.employeeCode} · {l.designation}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{l.entity}</span></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[10px] font-medium gap-1",
                        l.letterType === "FnF Settlement" ? "border-rose-300 text-rose-700 dark:text-rose-300" :
                        l.letterType === "Relieving" ? "border-pink-300 text-pink-700 dark:text-pink-300" :
                        l.letterType === "Experience" ? "border-emerald-300 text-emerald-700 dark:text-emerald-300" :
                        "border-amber-300 text-amber-700 dark:text-amber-300"
                      )}>
                        <FileText className="h-3 w-3" />
                        {l.letterType}
                      </Badge>
                    </TableCell>
                    <TableCell><span className="text-xs font-medium text-foreground">{l.fnfCaseId}</span></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{formatDate(l.generatedAt)}</span></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{formatDate(l.issuedAt)}</span></TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-medium border-0 text-[10px]", STATUS_COLORS[l.status] || "")}>
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Preview" onClick={() => setPreviewLetter(l)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {l.status === "Draft" || l.status === "Generated" ? (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-emerald-500/10 hover:text-emerald-700" title="Issue" onClick={() => handleIssue(l)}>
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Download" onClick={() => handleDownload(l)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Email" onClick={() => handleEmail(l)}>
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Generate letter dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                <Plus className="h-4 w-4" />
              </div>
              Generate Letter
            </DialogTitle>
            <DialogDescription>Pick a letter type, employee &amp; template to generate.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-1 space-y-4 pr-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Letter Type</Label>
                  <Select value={genForm.letterType} onValueChange={v => setGenForm(f => ({ ...f, letterType: v as LetterType }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LETTER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Template</Label>
                  <Select value={genForm.template} onValueChange={v => setGenForm(f => ({ ...f, template: v }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LETTER_TEMPLATES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Employee / FnF Case</Label>
                <Select value={genForm.fnfCaseId} onValueChange={v => setGenForm(f => ({ ...f, fnfCaseId: v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select employee…" /></SelectTrigger>
                  <SelectContent>
                    {LETTER_EMP_OPTIONS.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name} · {e.code} · {e.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCase && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div><p className="text-muted-foreground">Entity</p><p className="font-medium text-foreground truncate">{selectedCase.entity}</p></div>
                  <div><p className="text-muted-foreground">Department</p><p className="font-medium text-foreground">{selectedCase.dept}</p></div>
                  <div><p className="text-muted-foreground">DOJ</p><p className="font-medium text-foreground">{formatDate(selectedCase.doj)}</p></div>
                  <div><p className="text-muted-foreground">LWD</p><p className="font-medium text-foreground">{formatDate(selectedCase.lwd)}</p></div>
                  <div className="sm:col-span-2"><p className="text-muted-foreground">Designation</p><p className="font-medium text-foreground">{selectedCase.desg}</p></div>
                  <div className="sm:col-span-2"><p className="text-muted-foreground">Net Payable</p><p className="font-bold text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(selectedCase.netPayable)}</p></div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
              <FileText className="h-4 w-4" /> Generate Letter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Letter preview dialog */}
      <Dialog open={!!previewLetter} onOpenChange={(o) => { if (!o) setPreviewLetter(null) }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                <FileText className="h-4 w-4" />
              </div>
              Letter Preview — {previewLetter?.letterType}
            </DialogTitle>
            <DialogDescription>
              {previewLetter?.employeeName} · {previewLetter?.fnfCaseId}
            </DialogDescription>
          </DialogHeader>
          {previewLetter && (
            <ScrollArea className="max-h-[65vh]">
              <div className="p-1 pr-3">
                {/* Letter sheet */}
                <div className="rounded-xl border border-border bg-white dark:bg-slate-900 p-8 shadow-sm">
                  {/* Letterhead */}
                  <div className="flex items-start justify-between pb-4 border-b-2 border-rose-500">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white font-bold text-lg">
                        A
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{previewLetter.entity}</p>
                        <p className="text-[11px] text-muted-foreground">123 Brigade Road, Bangalore, Karnataka 560001</p>
                        <p className="text-[11px] text-muted-foreground">CIN: U72200KA2010PTC053987 · GST: 29AAACA1234D1ZP</p>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">
                      <p className="font-semibold text-foreground">Ref: ACME/{previewLetter.letterType.replace(/\s/g, "/")}/{previewLetter.id.toUpperCase()}</p>
                      <p>Date: {formatDate(new Date().toISOString())}</p>
                    </div>
                  </div>
                  {/* Subject */}
                  <div className="mt-6">
                    <p className="text-sm font-semibold text-foreground">To,</p>
                    <p className="text-sm text-foreground mt-1">{previewLetter.employeeName}</p>
                    <p className="text-sm text-muted-foreground">Employee Code: {previewLetter.employeeCode}</p>
                    <p className="text-sm text-muted-foreground">{previewLetter.designation} · {previewLetter.department}</p>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-bold text-foreground underline">
                      Subject: {previewLetter.letterType === "FnF Settlement" ? "Full & Final Settlement Statement" :
                        previewLetter.letterType === "Relieving" ? "Relieving Letter" :
                        previewLetter.letterType === "Experience" ? "Experience Certificate" :
                        "No Dues Certificate"}
                    </p>
                  </div>
                  {/* Body */}
                  <div className="mt-4 text-sm text-foreground space-y-3 leading-relaxed">
                    {previewLetter.letterType === "FnF Settlement" ? (
                      <>
                        <p>Dear {previewLetter.employeeName.split(" ")[0]},</p>
                        <p>As per your resignation dated {formatDate(previewLetter.doj)} and subsequent clearance, we are pleased to share the Full &amp; Final settlement statement for your employment with {previewLetter.entity}.</p>
                        <p>Your last working day was <span className="font-semibold">{formatDate(previewLetter.lwd)}</span>. Please find below the settlement summary:</p>
                        <div className="my-4 rounded-lg border border-border overflow-hidden">
                          <div className="grid grid-cols-2 bg-rose-500/10 text-xs font-semibold py-2 px-3 text-foreground">
                            <span>Particulars</span><span className="text-right">Amount (₹)</span>
                          </div>
                          <div className="divide-y divide-border text-xs">
                            <div className="grid grid-cols-2 py-2 px-3"><span>Pending Salary</span><span className="text-right text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(Math.round(previewLetter.netPayable * 0.4))}</span></div>
                            <div className="grid grid-cols-2 py-2 px-3"><span>Leave Encashment</span><span className="text-right text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(Math.round(previewLetter.netPayable * 0.25))}</span></div>
                            <div className="grid grid-cols-2 py-2 px-3"><span>Gratuity</span><span className="text-right text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(Math.round(previewLetter.netPayable * 0.2))}</span></div>
                            <div className="grid grid-cols-2 py-2 px-3"><span>TDS / Deductions</span><span className="text-right text-rose-700 dark:text-rose-400 tabular-nums">-{formatCurrency(Math.round(previewLetter.netPayable * 0.05))}</span></div>
                            <div className="grid grid-cols-2 py-2 px-3 bg-rose-500/5 font-bold"><span>Net Payable</span><span className="text-right text-rose-700 dark:text-rose-400 tabular-nums">{formatCurrency(previewLetter.netPayable)}</span></div>
                          </div>
                        </div>
                        <p>The said amount has been credited to your registered bank account. Kindly acknowledge receipt of this letter.</p>
                      </>
                    ) : previewLetter.letterType === "Relieving" ? (
                      <>
                        <p>Dear {previewLetter.employeeName.split(" ")[0]},</p>
                        <p>This is to formally relieve you from the services of {previewLetter.entity} with effect from <span className="font-semibold">{formatDate(previewLetter.lwd)}</span>, on acceptance of your resignation.</p>
                        <p>You joined the organization on {formatDate(previewLetter.doj)} as {previewLetter.designation} and have served for the duration of your employment. We thank you for your contributions and wish you the very best in your future endeavours.</p>
                      </>
                    ) : previewLetter.letterType === "Experience" ? (
                      <>
                        <p>This is to certify that <span className="font-semibold">{previewLetter.employeeName}</span> (Employee Code: {previewLetter.employeeCode}) was employed with {previewLetter.entity} from <span className="font-semibold">{formatDate(previewLetter.doj)}</span> to <span className="font-semibold">{formatDate(previewLetter.lwd)}</span>.</p>
                        <p>At the time of leaving, the employee was holding the position of <span className="font-semibold">{previewLetter.designation}</span> in the {previewLetter.department} department. During the tenure, we found the employee to be sincere, hardworking and professional.</p>
                        <p>We wish {previewLetter.employeeName.split(" ")[0]} success in all future endeavours.</p>
                      </>
                    ) : (
                      <>
                        <p>This is to certify that <span className="font-semibold">{previewLetter.employeeName}</span> (Employee Code: {previewLetter.employeeCode}) has no dues pending with {previewLetter.entity} as on <span className="font-semibold">{formatDate(previewLetter.lwd)}</span>.</p>
                        <p>All company assets have been returned, all outstanding loans / advances settled, and all clearance formalities completed.</p>
                      </>
                    )}
                    <p className="mt-4">For {previewLetter.entity},</p>
                  </div>
                  {/* Signature blocks */}
                  <div className="mt-12 grid grid-cols-2 gap-6 text-xs">
                    <div>
                      <div className="border-t border-foreground/40 pt-1">
                        <p className="font-semibold text-foreground">Anita Desai</p>
                        <p className="text-muted-foreground">HR Business Partner</p>
                        <p className="text-muted-foreground">{previewLetter.entity}</p>
                      </div>
                    </div>
                    <div>
                      <div className="border-t border-foreground/40 pt-1">
                        <p className="font-semibold text-foreground">Rajesh Kumar</p>
                        <p className="text-muted-foreground">Finance Head</p>
                        <p className="text-muted-foreground">{previewLetter.entity}</p>
                      </div>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <p className="text-[10px] text-muted-foreground text-center">
                    This is a system-generated letter from ACME HRMS. Generated on {formatDateTime(previewLetter.generatedAt || new Date().toISOString())}.
                  </p>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewLetter(null)}>Close</Button>
            {previewLetter && (
              <>
                {(previewLetter.status === "Draft" || previewLetter.status === "Generated") && (
                  <Button onClick={() => { handleIssue(previewLetter); setPreviewLetter(null) }} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                    <Send className="h-4 w-4" /> Issue
                  </Button>
                )}
                <Button onClick={() => { handleDownload(previewLetter); setPreviewLetter(null) }} className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FnFLettersSection
