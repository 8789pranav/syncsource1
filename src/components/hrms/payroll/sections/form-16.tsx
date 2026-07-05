"use client"

// =============================================================
// Form 16 — Payroll / Compliance #9
// Form 16 records with Part A + Part B formatted preview dialog.
// Emerald/teal theme.
// =============================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  FileText, Search, Filter, Building2, Calendar, IndianRupee,
  Users, CheckCircle2, Clock, Download, MoreHorizontal,
  X, Eye, Mail, Send, Layers, Stamp, FileDown, FileCheck,
  Printer, Sparkles,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

import { FORM_16 } from "../data"
import type { Form16 } from "../shared"
import {
  formatCurrency, formatCurrencyShort, formatDateTime, initials,
  avatarColor, STATUS_COLORS,
} from "../shared"

// ---------- Stat tile ----------
function StatTile({
  label, value, icon: Icon, accent, sub,
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  accent: string
  sub?: string
}) {
  const accents: Record<string, string> = {
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    teal: "from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-400 ring-teal-500/20",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    cyan: "from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 ring-cyan-500/20",
    violet: "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400 ring-violet-500/20",
  }
  const a = accents[accent] || accents.emerald
  return (
    <Card className={cn("relative overflow-hidden border border-border/60 rounded-xl shadow-soft hover:shadow-card transition-all bg-gradient-to-br", a)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl font-semibold mt-1 text-foreground tabular-nums leading-none">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>}
          </div>
          <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background/70 ring-1 backdrop-blur-sm", a)}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Component ----------
export function Form16Section() {
  const [records, setRecords] = useState<Form16[]>(FORM_16)
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")
  const [fyFilter, setFyFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selected, setSelected] = useState<Form16 | null>(null)

  const entityOptions = useMemo(() => Array.from(new Set(records.map((r) => r.entity))), [records])
  const fyOptions = useMemo(() => Array.from(new Set(records.map((r) => r.financialYear))).sort().reverse(), [records])

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (entityFilter !== "all" && r.entity !== entityFilter) return false
      if (fyFilter !== "all" && r.financialYear !== fyFilter) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!(r.employeeName.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q) || r.pan.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [records, search, entityFilter, fyFilter, statusFilter])

  // ---------- Stats ----------
  const total = filtered.length
  const issued = filtered.filter((r) => r.status === "Issued").length
  const generated = filtered.filter((r) => r.status === "Generated").length
  const pending = filtered.filter((r) => r.status === "Pending").length
  const totalGross = filtered.reduce((s, r) => s + r.grossSalary, 0)
  const totalTDS = filtered.reduce((s, r) => s + r.totalTds, 0)

  // ---------- Actions ----------
  function openPreview(r: Form16) {
    setSelected(r)
    setPreviewOpen(true)
  }
  function generate(r: Form16) {
    setRecords((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "Generated", partA: true, partB: true, generatedAt: new Date().toISOString() } : x))
    toast.success(`Form 16 generated for ${r.employeeName}`)
    if (selected?.id === r.id) setSelected({ ...r, status: "Generated", partA: true, partB: true, generatedAt: new Date().toISOString() })
  }
  function issue(r: Form16) {
    setRecords((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "Issued", issuedAt: new Date().toISOString() } : x))
    toast.success(`Form 16 issued to ${r.employeeName}`)
    if (selected?.id === r.id) setSelected({ ...r, status: "Issued", issuedAt: new Date().toISOString() })
  }
  function download(r: Form16) {
    toast.success(`Form 16 PDF downloaded for ${r.employeeName}`)
  }
  function email(r: Form16) {
    toast.success(`Form 16 emailed to ${r.employeeName}`)
  }
  function bulkGenerate() {
    const toGen = filtered.filter((r) => r.status === "Pending")
    if (toGen.length === 0) { toast.info("No pending forms to generate"); return }
    setRecords((prev) => prev.map((x) => {
      if (toGen.find((f) => f.id === x.id)) return { ...x, status: "Generated", partA: true, partB: true, generatedAt: new Date().toISOString() }
      return x
    }))
    toast.success(`${toGen.length} Form 16(s) generated in bulk`)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-primary-foreground shadow-soft">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Form 16</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Annual TDS certificate (Part A + Part B) issued to employees under Section 203 of Income Tax Act.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={bulkGenerate} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
          <Layers className="h-4 w-4" /> Bulk Generate
        </Button>
      </div>

      {/* Stat tiles */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        initial="hidden" animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }}
      >
        {[
          { label: "Total Forms", value: total, icon: FileText, accent: "emerald", sub: "In filter" },
          { label: "Issued", value: issued, icon: Send, accent: "teal", sub: "Sent to employee" },
          { label: "Generated", value: generated, icon: FileCheck, accent: "cyan", sub: "Ready to issue" },
          { label: "Pending", value: pending, icon: Clock, accent: "amber", sub: "Not yet generated" },
          { label: "Total Gross Salary", value: formatCurrencyShort(totalGross), icon: IndianRupee, accent: "violet", sub: "Sum of all forms" },
          { label: "Total TDS", value: formatCurrencyShort(totalTDS), icon: IndianRupee, accent: "emerald", sub: "TDS deducted" },
        ].map((s) => (
          <motion.div key={s.label} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <StatTile {...s} />
          </motion.div>
        ))}
      </motion.div>

      {/* Filter bar */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Entity
              </label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="All entities" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  {entityOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Financial Year
              </label>
              <Select value={fyFilter} onValueChange={setFyFilter}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="All FYs" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All FYs</SelectItem>
                  {fyOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Generated">Generated</SelectItem>
                  <SelectItem value="Issued">Issued</SelectItem>
                  <SelectItem value="Downloaded">Downloaded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Search className="h-3 w-3" /> Search
              </label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, code or PAN" className="h-8 text-xs bg-background" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/40">
            <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setEntityFilter("all"); setFyFilter("all"); setStatusFilter("all") }} className="gap-1.5">
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.info("Filters applied")} className="gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
              <Filter className="h-3.5 w-3.5" /> Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[200px]">Employee</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PAN</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">FY</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Gross Salary</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Total TDS</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Part A</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Part B</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Generated / Issued</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5 cursor-pointer" onClick={() => openPreview(r)}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-xs font-semibold", avatarColor(r.employeeId))}>
                          {initials(r.employeeName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{r.employeeName}</p>
                          <p className="text-[11px] text-muted-foreground truncate font-mono">{r.employeeCode}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-foreground/80">{r.entity}</TableCell>
                    <TableCell className="text-xs font-mono text-foreground/80">{r.pan}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] font-mono">{r.financialYear}</Badge></TableCell>
                    <TableCell className="text-sm tabular-nums text-right">{formatCurrency(r.grossSalary)}</TableCell>
                    <TableCell className="text-sm tabular-nums text-right font-bold text-amber-600 dark:text-amber-400">{formatCurrency(r.totalTds)}</TableCell>
                    <TableCell className="text-center">
                      {r.partA ? (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.partB ? (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_COLORS[r.status])}>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-[11px] text-foreground/80">
                      <div>Gen: {r.generatedAt ? formatDateTime(r.generatedAt) : "—"}</div>
                      <div className="text-muted-foreground">Iss: {r.issuedAt ? formatDateTime(r.issuedAt) : "—"}</div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => openPreview(r)}>
                            <Eye className="h-3.5 w-3.5" /> Preview
                          </DropdownMenuItem>
                          {r.status === "Pending" && (
                            <DropdownMenuItem className="gap-2 text-xs" onClick={() => generate(r)}>
                              <FileDown className="h-3.5 w-3.5" /> Generate
                            </DropdownMenuItem>
                          )}
                          {(r.status === "Generated") && (
                            <DropdownMenuItem className="gap-2 text-xs" onClick={() => issue(r)}>
                              <Send className="h-3.5 w-3.5" /> Issue to Employee
                            </DropdownMenuItem>
                          )}
                          {(r.status === "Generated" || r.status === "Issued" || r.status === "Downloaded") && (
                            <>
                              <DropdownMenuItem className="gap-2 text-xs" onClick={() => download(r)}>
                                <Download className="h-3.5 w-3.5" /> Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-xs" onClick={() => email(r)}>
                                <Mail className="h-3.5 w-3.5" /> Email
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-xs text-rose-600" onClick={() => toast.info("Delete disabled in demo")}>
                            <X className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10 text-sm text-muted-foreground">
                      No Form 16 records match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Form 16 preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] p-0 gap-0 overflow-hidden">
          {selected && (
            <>
              <DialogHeader className="p-5 pb-3 border-b border-border/60">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  Form 16 — {selected.employeeName} · FY {selected.financialYear}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Annual TDS certificate under Section 203 of Income Tax Act, 1961
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh]">
                <div className="p-5 space-y-5">
                  {/* Form 16 header */}
                  <div className="rounded-lg border-2 border-emerald-500/40 overflow-hidden">
                    <div className="bg-emerald-500/10 dark:bg-emerald-500/15 p-4 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Government of India</p>
                      <p className="text-lg font-bold text-foreground">FORM NO. 16</p>
                      <p className="text-xs text-muted-foreground">[See rule 31(1)(a)]</p>
                      <p className="text-sm font-medium text-foreground mt-1">Certificate under section 203 of the Income-tax Act, 1961 for TDS on Salaries</p>
                    </div>

                    {/* Part A */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-foreground">PART A</p>
                        <Badge variant="outline" className="text-[10px]">TDS Deduction Details</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div><span className="text-muted-foreground">Employer:</span> <span className="font-medium">{selected.entity}</span></div>
                        <div><span className="text-muted-foreground">TAN:</span> <span className="font-mono">BLRA12345B</span></div>
                        <div><span className="text-muted-foreground">PAN:</span> <span className="font-mono">AABCA1234C</span></div>
                        <div><span className="text-muted-foreground">Assessment Year:</span> <span className="font-medium">{parseInt(selected.financialYear.split("-")[0]) + 1}-{(parseInt(selected.financialYear.split("-")[0]) + 1).toString().slice(-2)}</span></div>
                        <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{selected.employeeName}</span></div>
                        <div><span className="text-muted-foreground">PAN:</span> <span className="font-mono">{selected.pan}</span></div>
                        <div><span className="text-muted-foreground">Designation:</span> <span className="font-medium">Senior Engineer</span></div>
                        <div><span className="text-muted-foreground">Period:</span> <span className="font-medium">Apr {selected.financialYear.split("-")[0]} – Mar {selected.financialYear.split("-")[1]}</span></div>
                      </div>

                      <Separator className="my-3" />

                      <p className="text-xs font-semibold text-foreground mb-2">Summary of Tax Deducted at Source</p>
                      <div className="rounded border border-border/60 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-transparent">
                              <TableHead className="text-[10px] uppercase">Quarter</TableHead>
                              <TableHead className="text-[10px] uppercase">Receipt No.</TableHead>
                              <TableHead className="text-[10px] uppercase text-right">TDS Deposited</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[
                              { q: "Q1", amt: Math.round(selected.totalTds * 0.25) },
                              { q: "Q2", amt: Math.round(selected.totalTds * 0.25) },
                              { q: "Q3", amt: Math.round(selected.totalTds * 0.25) },
                              { q: "Q4", amt: selected.totalTds - Math.round(selected.totalTds * 0.75) },
                            ].map((q) => (
                              <TableRow key={q.q} className="hover:bg-muted/30">
                                <TableCell className="text-xs py-1.5">{q.q}</TableCell>
                                <TableCell className="text-xs py-1.5 font-mono">{q.q}23{selected.financialYear.replace("-", "")}</TableCell>
                                <TableCell className="text-xs py-1.5 tabular-nums text-right">{formatCurrency(q.amt)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-emerald-50/40 dark:bg-emerald-500/5 font-semibold">
                              <TableCell className="text-xs py-1.5" colSpan={2}>Total</TableCell>
                              <TableCell className="text-xs py-1.5 tabular-nums text-right text-emerald-700 dark:text-emerald-400">{formatCurrency(selected.totalTds)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <Separator />

                    {/* Part B */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-foreground">PART B</p>
                        <Badge variant="outline" className="text-[10px]">Salary & Tax Computation</Badge>
                      </div>

                      <p className="text-xs font-semibold text-foreground mb-2">Salary Breakdown</p>
                      <div className="rounded border border-border/60 overflow-hidden mb-3">
                        <Table>
                          <TableBody>
                            {[
                              { label: "Basic Salary", amt: Math.round(selected.grossSalary * 0.4) },
                              { label: "House Rent Allowance", amt: Math.round(selected.grossSalary * 0.2) },
                              { label: "Special Allowance", amt: Math.round(selected.grossSalary * 0.35) },
                              { label: "Bonus", amt: Math.round(selected.grossSalary * 0.05) },
                              { label: "Gross Salary", amt: selected.grossSalary, bold: true },
                              { label: "Standard Deduction", amt: -75000, deduction: true },
                              { label: "HRA Exemption", amt: -Math.round(selected.grossSalary * 0.1), deduction: true },
                              { label: "Net Taxable Salary", amt: selected.grossSalary - 75000 - Math.round(selected.grossSalary * 0.1), bold: true },
                            ].map((row, i) => (
                              <TableRow key={i} className="hover:bg-muted/30">
                                <TableCell className={cn("text-xs py-1.5", row.bold && "font-semibold bg-muted/30")}>{row.label}</TableCell>
                                <TableCell className={cn("text-xs py-1.5 tabular-nums text-right", row.deduction && "text-rose-600 dark:text-rose-400", row.bold && "font-bold")}>
                                  {row.deduction ? "−" : ""}{formatCurrency(Math.abs(row.amt))}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <p className="text-xs font-semibold text-foreground mb-2">Deductions (Chapter VI-A)</p>
                      <div className="rounded border border-border/60 overflow-hidden mb-3">
                        <Table>
                          <TableBody>
                            {[
                              { label: "80C — PF/ELSS/PPF", amt: 150000 },
                              { label: "80D — Health Insurance", amt: 25000 },
                              { label: "80CCD(1B) — NPS", amt: 50000 },
                              { label: "Total Deductions", amt: 225000, bold: true },
                            ].map((row, i) => (
                              <TableRow key={i} className="hover:bg-muted/30">
                                <TableCell className={cn("text-xs py-1.5", row.bold && "font-semibold bg-muted/30")}>{row.label}</TableCell>
                                <TableCell className={cn("text-xs py-1.5 tabular-nums text-right", row.bold && "font-bold")}>{formatCurrency(row.amt)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <p className="text-xs font-semibold text-foreground mb-2">Tax Computation</p>
                      <div className="rounded border border-border/60 overflow-hidden">
                        <Table>
                          <TableBody>
                            <TableRow className="hover:bg-muted/30"><TableCell className="text-xs py-1.5">Taxable Income</TableCell><TableCell className="text-xs py-1.5 tabular-nums text-right">{formatCurrency(selected.grossSalary - 75000 - Math.round(selected.grossSalary * 0.1) - 225000)}</TableCell></TableRow>
                            <TableRow className="hover:bg-muted/30"><TableCell className="text-xs py-1.5">Tax on above</TableCell><TableCell className="text-xs py-1.5 tabular-nums text-right">{formatCurrency(Math.round(selected.totalTds * 1.03))}</TableCell></TableRow>
                            <TableRow className="hover:bg-muted/30"><TableCell className="text-xs py-1.5">Less: Rebate 87A</TableCell><TableCell className="text-xs py-1.5 tabular-nums text-right text-rose-600 dark:text-rose-400">−₹0</TableCell></TableRow>
                            <TableRow className="hover:bg-muted/30"><TableCell className="text-xs py-1.5">Add: Health &amp; Edu Cess (4%)</TableCell><TableCell className="text-xs py-1.5 tabular-nums text-right">{formatCurrency(Math.round(selected.totalTds * 0.03))}</TableCell></TableRow>
                            <TableRow className="bg-emerald-50/40 dark:bg-emerald-500/5"><TableCell className="text-xs py-1.5 font-bold">Total Tax Payable</TableCell><TableCell className="text-xs py-1.5 tabular-nums text-right font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(Math.round(selected.totalTds * 1.03))}</TableCell></TableRow>
                            <TableRow className="bg-emerald-50/40 dark:bg-emerald-500/5"><TableCell className="text-xs py-1.5 font-bold">TDS Deducted</TableCell><TableCell className="text-xs py-1.5 tabular-nums text-right font-bold">{formatCurrency(selected.totalTds)}</TableCell></TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="p-4 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Form 16 — Income Tax Department format
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(false)}>Close</Button>
                  <Button variant="outline" size="sm" onClick={() => download(selected)} className="gap-1.5">
                    <Printer className="h-3.5 w-3.5" /> Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => download(selected)} className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                  {selected.status === "Pending" && (
                    <Button size="sm" onClick={() => generate(selected)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <FileDown className="h-3.5 w-3.5" /> Generate
                    </Button>
                  )}
                  {selected.status === "Generated" && (
                    <Button size="sm" onClick={() => issue(selected)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Send className="h-3.5 w-3.5" /> Issue
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Form16Section
