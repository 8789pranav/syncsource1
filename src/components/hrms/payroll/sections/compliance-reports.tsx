"use client"

// =============================================================
// Compliance Reports — Payroll / Compliance #11
// Reports catalog (PF/ESI/PT/TDS annual + Form 16 bulk + audit
// reports), schedule + generate actions, recent reports table.
// Emerald/teal theme.
// =============================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  FileBarChart, Search, Filter, Building2, Calendar, Clock,
  Download, MoreHorizontal, X, FileText, PiggyBank, HeartPulse,
  Landmark, Receipt, FileSpreadsheet, ShieldCheck, TrendingUp,
  Scale, MapPin, Sparkles, CalendarClock, FileDown, History,
  CheckCircle2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

import { CHALLANS, PF_RECORDS, ESI_RECORDS, PT_RECORDS, TDS_RECORDS, FORM_16, INVESTMENT_DECLARATIONS } from "../data"
import {
  formatDateTime, initials, avatarColor, STATUS_COLORS,
} from "../shared"

// ---------- Report catalog ----------
interface ReportDef {
  id: string
  name: string
  description: string
  category: "Statutory Filing" | "Audit" | "Analytics" | "Annual Return"
  icon: React.ComponentType<{ className?: string }>
  frequency: string
  format: string
  accent: "emerald" | "teal" | "amber" | "violet" | "cyan" | "rose"
}

const REPORT_CATALOG: ReportDef[] = [
  { id: "pf-annual", name: "PF Annual Return", description: "Annual PF return (Form 6A + 3A) for EPFO submission", category: "Annual Return", icon: PiggyBank, frequency: "Annual", format: "PDF + CSV", accent: "emerald" },
  { id: "esi-annual", name: "ESI Annual Return", description: "Annual ESI return summarizing all employee contributions", category: "Annual Return", icon: HeartPulse, frequency: "Annual", format: "PDF + CSV", accent: "teal" },
  { id: "pt-annual", name: "PT Annual Summary", description: "State-wise annual PT summary with slab breakdown", category: "Annual Return", icon: Landmark, frequency: "Annual", format: "PDF + Excel", accent: "amber" },
  { id: "tds-26q", name: "TDS Quarterly Return (26Q)", description: "Quarterly TDS return for non-salary deductees", category: "Statutory Filing", icon: Receipt, frequency: "Quarterly", format: "TXT (NSDL)", accent: "violet" },
  { id: "tds-24q", name: "TDS Quarterly Return (24Q)", description: "Quarterly TDS return for salary deductees (Section 192)", category: "Statutory Filing", icon: Receipt, frequency: "Quarterly", format: "TXT (NSDL)", accent: "violet" },
  { id: "form-16-bulk", name: "Form 16 Bulk", description: "Bulk generate Form 16 (Part A + B) for all employees", category: "Statutory Filing", icon: FileText, frequency: "Annual", format: "PDF", accent: "emerald" },
  { id: "audit", name: "Compliance Audit Report", description: "Audit trail of all compliance filings, challans & gaps", category: "Audit", icon: ShieldCheck, frequency: "On-demand", format: "PDF", accent: "cyan" },
  { id: "liability", name: "Statutory Liability Report", description: "Outstanding statutory liability across PF/ESI/PT/LWF/TDS", category: "Audit", icon: TrendingUp, frequency: "Monthly", format: "PDF + Excel", accent: "rose" },
  { id: "entity-wise", name: "Entity-wise Compliance", description: "Compliance posture per entity (India/UAE/US/SG)", category: "Analytics", icon: Building2, frequency: "Monthly", format: "PDF", accent: "emerald" },
  { id: "state-wise-pt", name: "State-wise PT", description: "PT collected & filed per state with slab distribution", category: "Analytics", icon: MapPin, frequency: "Monthly", format: "Excel", accent: "amber" },
  { id: "regime-tax", name: "Regime-wise Tax", description: "Tax savings comparison (Old vs New regime) per employee", category: "Analytics", icon: Scale, frequency: "Annual", format: "PDF + Excel", accent: "teal" },
  { id: "challan-history", name: "Challan Payment History", description: "Multi-year challan payment history with UTR references", category: "Audit", icon: History, frequency: "On-demand", format: "Excel", accent: "cyan" },
]

// ---------- Recent reports (mock generated) ----------
interface RecentReport {
  id: string
  name: string
  type: string
  period: string
  generatedAt: string
  generatedBy: string
  format: string
  size: string
  status: "Generated" | "Scheduled" | "Failed"
}

const RECENT_REPORTS: RecentReport[] = [
  { id: "rr-1", name: "PF Annual Return FY 2024-25", type: "PF Annual", period: "FY 2024-25", generatedAt: new Date(Date.now() - 2 * 86400000).toISOString(), generatedBy: "Karthik Iyer", format: "PDF", size: "1.4 MB", status: "Generated" },
  { id: "rr-2", name: "TDS 24Q Q1 FY 2025-26", type: "TDS 24Q", period: "Q1 FY 2025-26", generatedAt: new Date(Date.now() - 5 * 86400000).toISOString(), generatedBy: "Anita Desai", format: "TXT", size: "280 KB", status: "Generated" },
  { id: "rr-3", name: "Form 16 Bulk FY 2024-25", type: "Form 16", period: "FY 2024-25", generatedAt: new Date(Date.now() - 7 * 86400000).toISOString(), generatedBy: "Rajesh Kumar", format: "PDF", size: "12.8 MB", status: "Generated" },
  { id: "rr-4", name: "PT Annual Summary FY 2024-25", type: "PT Annual", period: "FY 2024-25", generatedAt: new Date(Date.now() - 10 * 86400000).toISOString(), generatedBy: "Karthik Iyer", format: "Excel", size: "640 KB", status: "Generated" },
  { id: "rr-5", name: "Compliance Audit Aug 2025", type: "Audit", period: "Aug 2025", generatedAt: new Date(Date.now() - 12 * 86400000).toISOString(), generatedBy: "System", format: "PDF", size: "2.1 MB", status: "Generated" },
  { id: "rr-6", name: "Statutory Liability Sep 2025", type: "Liability", period: "Sep 2025", generatedAt: new Date(Date.now() - 1 * 86400000).toISOString(), generatedBy: "Anita Desai", format: "Excel", size: "320 KB", status: "Generated" },
  { id: "rr-7", name: "TDS 26Q Q2 FY 2025-26", type: "TDS 26Q", period: "Q2 FY 2025-26", generatedAt: new Date(Date.now() + 5 * 86400000).toISOString(), generatedBy: "System", format: "TXT", size: "—", status: "Scheduled" },
  { id: "rr-8", name: "ESI Annual Return FY 2024-25", type: "ESI Annual", period: "FY 2024-25", generatedAt: new Date(Date.now() - 14 * 86400000).toISOString(), generatedBy: "Karthik Iyer", format: "PDF", size: "980 KB", status: "Failed" },
]

// ---------- Component ----------
export function ComplianceReportsSection() {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [entityFilter, setEntityFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [recentSearch, setRecentSearch] = useState("")

  const filteredCatalog = useMemo(() => {
    return REPORT_CATALOG.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!(r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [search, categoryFilter])

  const filteredRecent = useMemo(() => {
    return RECENT_REPORTS.filter((r) => {
      if (typeFilter !== "all" && !r.type.toLowerCase().includes(typeFilter.toLowerCase())) return false
      if (recentSearch.trim()) {
        const q = recentSearch.toLowerCase()
        if (!(r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.generatedBy.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [recentSearch, typeFilter])

  const entityOptions = Array.from(new Set([...CHALLANS, ...PF_RECORDS, ...ESI_RECORDS, ...PT_RECORDS, ...TDS_RECORDS].map((r: any) => r.entity)))
  const typeOptions = Array.from(new Set(RECENT_REPORTS.map((r) => r.type)))

  // ---------- Stats ----------
  const totalReports = REPORT_CATALOG.length
  const generated = RECENT_REPORTS.filter((r) => r.status === "Generated").length
  const scheduled = RECENT_REPORTS.filter((r) => r.status === "Scheduled").length
  const failed = RECENT_REPORTS.filter((r) => r.status === "Failed").length

  function generateReport(r: ReportDef) {
    toast.success(`Generating "${r.name}" — you will be notified when ready`)
  }
  function scheduleReport(r: ReportDef) {
    toast.success(`"${r.name}" scheduled for monthly generation`)
  }
  function downloadReport(r: RecentReport) {
    if (r.status === "Failed") { toast.error("Report generation failed — please retry"); return }
    toast.success(`Downloading ${r.name}`)
  }
  function regenerateReport(r: RecentReport) {
    toast.success(`Re-generating "${r.name}"`)
  }

  // ---------- Accents ----------
  const accents: Record<string, { grad: string; text: string; ring: string }> = {
    emerald: { grad: "from-emerald-500/15 to-emerald-500/5", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20" },
    teal:    { grad: "from-teal-500/15 to-teal-500/5",     text: "text-teal-600 dark:text-teal-400",       ring: "ring-teal-500/20" },
    amber:   { grad: "from-amber-500/15 to-amber-500/5",   text: "text-amber-600 dark:text-amber-400",     ring: "ring-amber-500/20" },
    violet:  { grad: "from-violet-500/15 to-violet-500/5", text: "text-violet-600 dark:text-violet-400",   ring: "ring-violet-500/20" },
    cyan:    { grad: "from-cyan-500/15 to-cyan-500/5",     text: "text-cyan-600 dark:text-cyan-400",       ring: "ring-cyan-500/20" },
    rose:    { grad: "from-rose-500/15 to-rose-500/5",     text: "text-rose-600 dark:text-rose-400",       ring: "ring-rose-500/20" },
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-primary-foreground shadow-soft">
            <FileBarChart className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Compliance Reports</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Generate statutory returns, audit reports &amp; analytics across PF, ESI, PT, LWF &amp; TDS.
            </p>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        initial="hidden" animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }}
      >
        {[
          { label: "Report Templates", value: totalReports, icon: FileBarChart, accent: "emerald", sub: "Available to generate" },
          { label: "Recently Generated", value: generated, icon: CheckCircle2, accent: "teal", sub: "Last 30 days" },
          { label: "Scheduled", value: scheduled, icon: CalendarClock, accent: "amber", sub: "Auto-generation on" },
          { label: "Failed", value: failed, icon: X, accent: "rose", sub: "Needs attention" },
        ].map((s) => {
          const a = accents[s.accent]
          return (
            <motion.div key={s.label} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <Card className={cn("relative overflow-hidden border border-border/60 rounded-xl shadow-soft hover:shadow-card transition-all bg-gradient-to-br", a.grad)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{s.label}</p>
                      <p className="text-2xl font-semibold mt-1 text-foreground tabular-nums leading-none">{s.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{s.sub}</p>
                    </div>
                    <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background/70 ring-1 backdrop-blur-sm", a.ring, a.text)}>
                      <s.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Filter bar for catalog */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-foreground">Report Catalog Filters</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Category
              </label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="Annual Return">Annual Return</SelectItem>
                  <SelectItem value="Statutory Filing">Statutory Filing</SelectItem>
                  <SelectItem value="Audit">Audit</SelectItem>
                  <SelectItem value="Analytics">Analytics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Entity
              </label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  {entityOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date Range
              </label>
              <Select defaultValue="this-fy">
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="this-q">This Quarter</SelectItem>
                  <SelectItem value="this-fy">This Financial Year</SelectItem>
                  <SelectItem value="last-fy">Last Financial Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reports..." className="pl-9 h-8 text-xs bg-background" />
            </div>
            <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setCategoryFilter("all"); setEntityFilter("all") }} className="gap-1.5">
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports catalog grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-foreground">Reports Catalog</h2>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
            {filteredCatalog.length} reports
          </Badge>
        </div>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          initial="hidden" animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }}
        >
          {filteredCatalog.map((r) => {
            const a = accents[r.accent]
            return (
              <motion.div key={r.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <Card className="group border border-border/60 rounded-xl shadow-soft hover:shadow-card transition-all overflow-hidden h-full flex flex-col">
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1", a.grad, a.ring, a.text)}>
                        <r.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground leading-tight">{r.name}</p>
                        <Badge variant="outline" className="text-[10px] mt-1 font-medium">{r.category}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{r.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {r.frequency}</span>
                      <span className="flex items-center gap-1"><FileDown className="h-3 w-3" /> {r.format}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-border/40">
                      <Button size="sm" variant="outline" onClick={() => scheduleReport(r)} className="gap-1.5 flex-1 h-8 text-xs">
                        <CalendarClock className="h-3.5 w-3.5" /> Schedule
                      </Button>
                      <Button size="sm" onClick={() => generateReport(r)} className="gap-1.5 flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                        <FileDown className="h-3.5 w-3.5" /> Generate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
          {filteredCatalog.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-10 text-center">
              <FileBarChart className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No reports match the current filters.</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent reports */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-foreground">Recent Reports</h3>
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-7 w-[140px] text-xs bg-background"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {typeOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative w-44">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={recentSearch} onChange={(e) => setRecentSearch(e.target.value)} placeholder="Search recent..." className="pl-8 h-7 text-xs bg-background" />
              </div>
            </div>
          </div>
          <ScrollArea className="max-h-[460px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Report Name</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Period</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Generated At</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Generated By</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Format / Size</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecent.map((r) => (
                  <TableRow key={r.id} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", r.format === "PDF" ? "bg-rose-100 dark:bg-rose-500/15 text-rose-600" : r.format === "Excel" ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600" : "bg-violet-100 dark:bg-violet-500/15 text-violet-600")}>
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] font-medium">{r.type}</Badge></TableCell>
                    <TableCell className="text-xs text-foreground/80">{r.period}</TableCell>
                    <TableCell className="text-xs text-foreground/80">{formatDateTime(r.generatedAt)}</TableCell>
                    <TableCell className="text-xs text-foreground/80">{r.generatedBy}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium text-foreground/80">{r.format}</div>
                      <div className="text-muted-foreground">{r.size}</div>
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        r.status === "Generated" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : r.status === "Scheduled" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                      )}>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => downloadReport(r)}>
                            <Download className="h-3.5 w-3.5" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => regenerateReport(r)}>
                            <Sparkles className="h-3.5 w-3.5" /> Re-generate
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => toast.info("Viewing report history")}>
                            <History className="h-3.5 w-3.5" /> View History
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-xs text-rose-600" onClick={() => toast.info("Delete disabled in demo")}>
                            <X className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRecent.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-sm text-muted-foreground">
                      No recent reports match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

export default ComplianceReportsSection
