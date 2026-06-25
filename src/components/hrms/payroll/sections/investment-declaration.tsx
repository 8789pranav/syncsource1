"use client"

// =============================================================
// Investment Declaration — Payroll / Compliance #8
// Employee investment declarations with section-wise proof
// tracking and detail dialog with regime comparison.
// Emerald/teal theme.
// =============================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  FileText, Search, Filter, Building2, Calendar, IndianRupee,
  Users, CheckCircle2, Clock, Download, MoreHorizontal,
  X, Scale, Eye, ShieldCheck, AlertCircle, FileCheck,
  Stamp, FileX, Mail, Sparkles, Wallet,
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

import { INVESTMENT_DECLARATIONS } from "../data"
import type { InvestmentDeclaration } from "../shared"
import {
  formatCurrency, formatCurrencyShort, formatDate, initials,
  avatarColor, STATUS_COLORS,
} from "../shared"

const REGIME_COLORS: Record<string, string> = {
  Old: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  New: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
}

// Section labels
const SECTIONS = [
  { key: "section80C", label: "80C — PF/ELSS/PPF", cap: 150000 },
  { key: "section80D", label: "80D — Health Insurance", cap: 75000 },
  { key: "section80CCD", label: "80CCD(1B) — NPS", cap: 50000 },
  { key: "section24", label: "24(b) — Home Loan Interest", cap: 200000 },
  { key: "section80E", label: "80E — Education Loan", cap: 0 },
  { key: "section80G", label: "80G — Donations", cap: 0 },
  { key: "otherDeductions", label: "Other Deductions", cap: 0 },
] as const

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
    rose: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400 ring-rose-500/20",
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
export function InvestmentDeclarationSection() {
  const [records, setRecords] = useState<InvestmentDeclaration[]>(INVESTMENT_DECLARATIONS)
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")
  const [fyFilter, setFyFilter] = useState("all")
  const [regimeFilter, setRegimeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<InvestmentDeclaration | null>(null)

  const entityOptions = useMemo(() => Array.from(new Set(records.map((r) => r.entity))), [records])
  const fyOptions = useMemo(() => Array.from(new Set(records.map((r) => r.financialYear))).sort().reverse(), [records])

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (entityFilter !== "all" && r.entity !== entityFilter) return false
      if (fyFilter !== "all" && r.financialYear !== fyFilter) return false
      if (regimeFilter !== "all" && r.regime !== regimeFilter) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!(r.employeeName.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [records, search, entityFilter, fyFilter, regimeFilter, statusFilter])

  // ---------- Stats ----------
  const total = filtered.length
  const submitted = filtered.filter((r) => r.status === "Submitted" || r.status === "Verified" || r.status === "Approved").length
  const verified = filtered.filter((r) => r.status === "Verified" || r.status === "Approved").length
  const approved = filtered.filter((r) => r.status === "Approved").length
  const draft = filtered.filter((r) => r.status === "Draft").length
  const totalDeclared = filtered.reduce((s, r) => s + r.totalDeclared, 0)
  const totalProof = filtered.reduce((s, r) => s + r.totalProofSubmitted, 0)

  // ---------- Actions ----------
  function openDetail(r: InvestmentDeclaration) {
    setSelected(r)
    setDetailOpen(true)
  }
  function verify(r: InvestmentDeclaration) {
    setRecords((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "Verified", verifiedBy: "Karthik Iyer" } : x))
    toast.success(`${r.employeeName}'s declaration verified`)
    if (selected?.id === r.id) setSelected({ ...r, status: "Verified", verifiedBy: "Karthik Iyer" })
  }
  function approve(r: InvestmentDeclaration) {
    setRecords((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "Approved" } : x))
    toast.success(`${r.employeeName}'s declaration approved`)
    if (selected?.id === r.id) setSelected({ ...r, status: "Approved" })
  }
  function reject(r: InvestmentDeclaration) {
    setRecords((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "Rejected" } : x))
    toast.error(`${r.employeeName}'s declaration rejected`)
    if (selected?.id === r.id) setSelected({ ...r, status: "Rejected" })
  }
  function requestProof(r: InvestmentDeclaration) {
    toast.success(`Proof request emailed to ${r.employeeName}`)
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
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Investment Declaration</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Section-wise investment declarations &amp; proof tracking under Old/New tax regime.
            </p>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3"
        initial="hidden" animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }}
      >
        {[
          { label: "Total Declarations", value: total, icon: FileText, accent: "emerald", sub: "In filter" },
          { label: "Submitted", value: submitted, icon: Mail, accent: "cyan", sub: "Awaiting review" },
          { label: "Verified", value: verified, icon: ShieldCheck, accent: "amber", sub: "Pending approve" },
          { label: "Approved", value: approved, icon: CheckCircle2, accent: "teal", sub: "Ready for TDS" },
          { label: "Draft", value: draft, icon: Clock, accent: "violet", sub: "Not yet submitted" },
          { label: "Total Declared", value: formatCurrencyShort(totalDeclared), icon: IndianRupee, accent: "emerald", sub: "Sum across sections" },
          { label: "Total Proof", value: formatCurrencyShort(totalProof), icon: FileCheck, accent: "rose", sub: "Proof submitted" },
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
                <Scale className="h-3 w-3" /> Regime
              </label>
              <Select value={regimeFilter} onValueChange={setRegimeFilter}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regimes</SelectItem>
                  <SelectItem value="Old">Old regime</SelectItem>
                  <SelectItem value="New">New regime</SelectItem>
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
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Search className="h-3 w-3" /> Search
              </label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or code" className="h-8 text-xs bg-background" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/40">
            <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setEntityFilter("all"); setFyFilter("all"); setRegimeFilter("all"); setStatusFilter("all") }} className="gap-1.5">
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
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">FY</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Regime</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">80C</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">80D</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">80CCD</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">24(b)</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">80E</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">80G</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Other</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Total Declared</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Proof</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5 cursor-pointer" onClick={() => openDetail(r)}>
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
                    <TableCell><Badge variant="outline" className="text-[10px] font-mono">{r.financialYear}</Badge></TableCell>
                    <TableCell className="text-center">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", REGIME_COLORS[r.regime])}>
                        {r.regime}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-right">{r.section80C ? formatCurrency(r.section80C) : "—"}</TableCell>
                    <TableCell className="text-xs tabular-nums text-right">{r.section80D ? formatCurrency(r.section80D) : "—"}</TableCell>
                    <TableCell className="text-xs tabular-nums text-right">{r.section80CCD ? formatCurrency(r.section80CCD) : "—"}</TableCell>
                    <TableCell className="text-xs tabular-nums text-right">{r.section24 ? formatCurrency(r.section24) : "—"}</TableCell>
                    <TableCell className="text-xs tabular-nums text-right">{r.section80E ? formatCurrency(r.section80E) : "—"}</TableCell>
                    <TableCell className="text-xs tabular-nums text-right">{r.section80G ? formatCurrency(r.section80G) : "—"}</TableCell>
                    <TableCell className="text-xs tabular-nums text-right">{r.otherDeductions ? formatCurrency(r.otherDeductions) : "—"}</TableCell>
                    <TableCell className="text-sm tabular-nums text-right font-bold">{formatCurrency(r.totalDeclared)}</TableCell>
                    <TableCell className="text-xs tabular-nums text-right">
                      {r.totalProofSubmitted > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrencyShort(r.totalProofSubmitted)}</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">Pending</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_COLORS[r.status])}>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => openDetail(r)}>
                            <Eye className="h-3.5 w-3.5" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => verify(r)}>
                            <ShieldCheck className="h-3.5 w-3.5" /> Verify
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => approve(r)}>
                            <Stamp className="h-3.5 w-3.5" /> Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-xs text-rose-600" onClick={() => reject(r)}>
                            <FileX className="h-3.5 w-3.5" /> Reject
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => requestProof(r)}>
                            <Mail className="h-3.5 w-3.5" /> Request Proof
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => toast.success("Statement downloaded")}>
                            <Download className="h-3.5 w-3.5" /> Download
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-10 text-sm text-muted-foreground">
                      No declarations match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] p-0 gap-0 overflow-hidden">
          {selected && (
            <>
              <DialogHeader className="p-5 pb-3 border-b border-border/60">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  Declaration — {selected.employeeName}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  FY {selected.financialYear} · {selected.regime} Regime · Submitted {selected.submittedAt ? formatDate(selected.submittedAt) : "—"}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh]">
                <div className="p-5 space-y-4">
                  {/* Employee header */}
                  <div className="flex items-center gap-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-500/20 p-3">
                    <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-full text-white text-sm font-semibold", avatarColor(selected.employeeId))}>
                      {initials(selected.employeeName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{selected.employeeName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{selected.employeeCode} · {selected.entity}</p>
                    </div>
                    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", STATUS_COLORS[selected.status])}>
                      {selected.status}
                    </span>
                  </div>

                  {/* Section breakdown */}
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Section-wise Breakdown</p>
                    <div className="rounded-lg border border-border/60 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-transparent">
                            <TableHead className="text-xs uppercase">Section</TableHead>
                            <TableHead className="text-xs uppercase text-right">Declared</TableHead>
                            <TableHead className="text-xs uppercase text-right">Cap</TableHead>
                            <TableHead className="text-xs uppercase text-center">Proof</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {SECTIONS.map((s) => {
                            const val = (selected as any)[s.key] as number
                            const proofSubmitted = val > 0 && selected.totalProofSubmitted > 0
                            return (
                              <TableRow key={s.key} className="hover:bg-muted/30">
                                <TableCell className="text-xs font-medium text-foreground">{s.label}</TableCell>
                                <TableCell className="text-xs tabular-nums text-right">{val ? formatCurrency(val) : "—"}</TableCell>
                                <TableCell className="text-xs tabular-nums text-right text-muted-foreground">{s.cap ? formatCurrency(s.cap) : "—"}</TableCell>
                                <TableCell className="text-center">
                                  {val > 0 ? (
                                    proofSubmitted ? (
                                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600">
                                        <CheckCircle2 className="h-3 w-3" />
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-600">
                                        <Clock className="h-3 w-3" />
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-muted-foreground/40 text-xs">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          <TableRow className="bg-emerald-50/40 dark:bg-emerald-500/5 font-semibold">
                            <TableCell className="text-xs">Total</TableCell>
                            <TableCell className="text-xs tabular-nums text-right text-emerald-700 dark:text-emerald-400">{formatCurrency(selected.totalDeclared)}</TableCell>
                            <TableCell className="text-xs tabular-nums text-right text-muted-foreground">—</TableCell>
                            <TableCell className="text-center text-xs text-foreground/80">{formatCurrencyShort(selected.totalProofSubmitted)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <Separator />

                  {/* Regime comparison */}
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Scale className="h-4 w-4 text-emerald-600" /> Regime Comparison — Old vs New
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={cn("rounded-lg border p-3", selected.regime === "Old" ? "border-amber-500/40 bg-amber-50/40 dark:bg-amber-500/5" : "border-border/60")}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-foreground">Old Regime</p>
                          {selected.regime === "Old" && <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Selected</Badge>}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between"><span className="text-muted-foreground">Gross Income</span><span className="font-medium">{formatCurrencyShort(selected.totalDeclared * 4)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Deductions</span><span className="font-medium text-amber-600">−{formatCurrencyShort(selected.totalDeclared)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Taxable</span><span className="font-medium">{formatCurrencyShort(selected.totalDeclared * 3)}</span></div>
                          <Separator className="my-1" />
                          <div className="flex justify-between"><span className="font-semibold text-foreground">Tax</span><span className="font-bold text-foreground">{formatCurrencyShort(Math.round(selected.totalDeclared * 3 * 0.15))}</span></div>
                        </div>
                      </div>
                      <div className={cn("rounded-lg border p-3", selected.regime === "New" ? "border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-500/5" : "border-border/60")}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-foreground">New Regime</p>
                          {selected.regime === "New" && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">Selected</Badge>}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between"><span className="text-muted-foreground">Gross Income</span><span className="font-medium">{formatCurrencyShort(selected.totalDeclared * 4)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Deductions</span><span className="font-medium text-muted-foreground/60">—</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Standard Ded.</span><span className="font-medium">−₹75K</span></div>
                          <Separator className="my-1" />
                          <div className="flex justify-between"><span className="font-semibold text-foreground">Tax</span><span className="font-bold text-foreground">{formatCurrencyShort(Math.round((selected.totalDeclared * 4 - 75000) * 0.1))}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selected.verifiedBy && (
                    <div className="rounded-lg bg-muted/40 border border-border/60 p-3 text-xs">
                      <p className="text-muted-foreground">Verified by <span className="font-semibold text-foreground">{selected.verifiedBy}</span></p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="p-4 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Section-wise proof tracking
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setDetailOpen(false)}>Close</Button>
                  <Button variant="outline" size="sm" onClick={() => requestProof(selected)} className="gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Request Proof
                  </Button>
                  {selected.status === "Submitted" && (
                    <Button size="sm" onClick={() => verify(selected)} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verify
                    </Button>
                  )}
                  {(selected.status === "Submitted" || selected.status === "Verified") && (
                    <Button size="sm" onClick={() => approve(selected)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Stamp className="h-3.5 w-3.5" /> Approve
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

export default InvestmentDeclarationSection
