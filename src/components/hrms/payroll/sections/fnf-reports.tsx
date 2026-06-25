"use client"

// ============================================================================
//  FnF Reports — catalog of FnF-related reports + recent reports table
//  Rose/pink accents. Filter, date range, report cards, recent reports.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  BarChart3, Search, Filter, Download, Calendar, Clock, Play, FileText,
  Building2, TrendingUp, TrendingDown, Coins, Plane, AlertCircle, Package,
  ShieldCheck, Receipt, FileSpreadsheet, Mail,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

import { FNF_CASES } from "../data"
import { formatDate, formatDateTime, formatCurrency } from "../shared"

interface ReportCatalogItem {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  category: "Summary" | "Breakdown" | "Recovery" | "Tax" | "Letter"
  format: "PDF" | "Excel" | "CSV"
}

const REPORT_CATALOG: ReportCatalogItem[] = [
  { id: "rpt-1", title: "FnF Summary", description: "Overall FnF settlement summary across all entities, statuses & time periods.", icon: BarChart3, accent: "rose", category: "Summary", format: "PDF" },
  { id: "rpt-2", title: "Entity-wise FnF", description: "FnF settlements grouped by entity with case counts and net payable totals.", icon: Building2, accent: "pink", category: "Breakdown", format: "Excel" },
  { id: "rpt-3", title: "Department-wise FnF", description: "FnF settlements broken down by department for cost-center attribution.", icon: Building2, accent: "amber", category: "Breakdown", format: "Excel" },
  { id: "rpt-4", title: "Settlement Time Analysis", description: "Average time taken from case creation to payment, with bottlenecks highlighted.", icon: Clock, accent: "cyan", category: "Summary", format: "PDF" },
  { id: "rpt-5", title: "Leave Encashment Report", description: "All leave encashments processed with per-day rates and totals.", icon: Plane, accent: "emerald", category: "Recovery", format: "Excel" },
  { id: "rpt-6", title: "Notice Recovery Report", description: "Notice period shortfall recoveries with shortfall days and amounts.", icon: AlertCircle, accent: "rose", category: "Recovery", format: "Excel" },
  { id: "rpt-7", title: "Asset / Loan Recovery Report", description: "Outstanding asset and loan recoveries deducted during FnF.", icon: Package, accent: "pink", category: "Recovery", format: "Excel" },
  { id: "rpt-8", title: "Gratuity Report", description: "Gratuity payouts with tenure, eligibility and amount per employee.", icon: ShieldCheck, accent: "teal", category: "Summary", format: "PDF" },
  { id: "rpt-9", title: "Tax Impact Report", description: "TDS deducted on FnF earnings with regime-wise breakdown.", icon: Receipt, accent: "amber", category: "Tax", format: "PDF" },
  { id: "rpt-10", title: "Letter Issuance Report", description: "All FnF / relieving / experience / no-dues letters generated and issued.", icon: FileText, accent: "cyan", category: "Letter", format: "Excel" },
]

interface RecentReport {
  id: string
  title: string
  generatedAt: string
  generatedBy: string
  format: string
  records: number
  sizeKb: number
  status: "Ready" | "Scheduled" | "Processing"
}

const RECENT_REPORTS: RecentReport[] = [
  { id: "rr-1", title: "FnF Summary — June 2025", generatedAt: new Date(Date.now() - 1 * 86400000).toISOString(), generatedBy: "Anita Desai", format: "PDF", records: 18, sizeKb: 245, status: "Ready" },
  { id: "rr-2", title: "Entity-wise FnF — Q2 2025", generatedAt: new Date(Date.now() - 3 * 86400000).toISOString(), generatedBy: "Rajesh Kumar", format: "Excel", records: 24, sizeKb: 412, status: "Ready" },
  { id: "rr-3", title: "Gratuity Report — FY 2024-25", generatedAt: new Date(Date.now() - 7 * 86400000).toISOString(), generatedBy: "Anita Desai", format: "PDF", records: 12, sizeKb: 188, status: "Ready" },
  { id: "rr-4", title: "Notice Recovery — June 2025", generatedAt: new Date(Date.now() - 10 * 86400000).toISOString(), generatedBy: "System", format: "Excel", records: 8, sizeKb: 156, status: "Ready" },
  { id: "rr-5", title: "Letter Issuance — May 2025", generatedAt: new Date(Date.now() - 35 * 86400000).toISOString(), generatedBy: "Rajesh Kumar", format: "Excel", records: 32, sizeKb: 524, status: "Ready" },
  { id: "rr-6", title: "Tax Impact — Q1 2025", generatedAt: new Date(Date.now() - 65 * 86400000).toISOString(), generatedBy: "Anita Desai", format: "PDF", records: 14, sizeKb: 278, status: "Ready" },
  { id: "rr-7", title: "FnF Summary — Scheduled (Monthly)", generatedAt: new Date(Date.now() + 7 * 86400000).toISOString(), generatedBy: "System", format: "PDF", records: 0, sizeKb: 0, status: "Scheduled" },
]

const ACCENT_MAP: Record<string, { grad: string; text: string; ring: string; bg: string }> = {
  rose:    { grad: "from-rose-500/15 to-pink-500/5",     text: "text-rose-600 dark:text-rose-400",     ring: "ring-rose-500/20",     bg: "bg-rose-500/10" },
  pink:    { grad: "from-pink-500/15 to-rose-500/5",     text: "text-pink-600 dark:text-pink-400",     ring: "ring-pink-500/20",     bg: "bg-pink-500/10" },
  amber:   { grad: "from-amber-500/15 to-orange-500/5",  text: "text-amber-600 dark:text-amber-400",   ring: "ring-amber-500/20",    bg: "bg-amber-500/10" },
  cyan:    { grad: "from-cyan-500/15 to-teal-500/5",     text: "text-cyan-600 dark:text-cyan-400",     ring: "ring-cyan-500/20",     bg: "bg-cyan-500/10" },
  emerald: { grad: "from-emerald-500/15 to-teal-500/5",  text: "text-emerald-600 dark:text-emerald-400",ring: "ring-emerald-500/20",  bg: "bg-emerald-500/10" },
  teal:    { grad: "from-teal-500/15 to-cyan-500/5",     text: "text-teal-600 dark:text-teal-400",     ring: "ring-teal-500/20",     bg: "bg-teal-500/10" },
  slate:   { grad: "from-slate-500/15 to-slate-500/5",   text: "text-slate-600 dark:text-slate-400",   ring: "ring-slate-500/20",    bg: "bg-slate-500/10" },
}

// ============================================================================
export function FnFReportsSection() {
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [entityFilter, setEntityFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const entityOptions = useMemo(() => Array.from(new Set(FNF_CASES.map(c => c.entity))), [])
  const categories = ["Summary", "Breakdown", "Recovery", "Tax", "Letter"]

  const filteredCatalog = useMemo(() => {
    return REPORT_CATALOG.filter(r => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
      }
      return true
    })
  }, [categoryFilter, search])

  const handleGenerate = (r: ReportCatalogItem) => {
    toast.success("Report generation started", {
      description: `${r.title} · ${r.format} · will be available shortly`,
    })
  }

  const handleSchedule = (r: ReportCatalogItem) => {
    toast.success("Report scheduled", {
      description: `${r.title} scheduled monthly · first day of month`,
    })
  }

  const handleDownloadRecent = (r: RecentReport) => {
    if (r.status !== "Ready") {
      toast.error("Report not ready yet")
      return
    }
    toast.success("Report downloaded", {
      description: `${r.title} · ${r.format} · ${(r.sizeKb / 1024).toFixed(2)} MB`,
    })
  }

  const handleEmailRecent = (r: RecentReport) => {
    toast.success("Report emailed", {
      description: `${r.title} sent to payroll@acme.com`,
    })
  }

  const clearFilters = () => {
    setCategoryFilter("all"); setEntityFilter("all"); setSearch("")
    setFromDate(""); setToDate("")
  }
  const hasFilters = categoryFilter !== "all" || entityFilter !== "all" || search || fromDate || toDate

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-soft">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">FnF Reports</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Catalog of FnF-related reports — generate, schedule &amp; download.
            </p>
          </div>
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
                placeholder="Search reports by title or description…"
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:items-center">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[160px]"><SelectValue placeholder="Entity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Date range */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-2 lg:flex lg:items-center gap-2 pt-3 border-t border-border/40">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="h-8 w-full lg:w-[150px] text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
              <Input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="h-8 w-full lg:w-[150px] text-xs"
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs ml-auto" onClick={clearFilters}>Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report catalog grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Report Catalog</h2>
            <p className="text-xs text-muted-foreground">{filteredCatalog.length} reports available</p>
          </div>
          <Badge variant="outline" className="border-rose-500/30 text-rose-700 dark:text-rose-400">
            {REPORT_CATALOG.length} total
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredCatalog.map(r => {
            const a = ACCENT_MAP[r.accent] || ACCENT_MAP.rose
            const Icon = r.icon
            return (
              <Card key={r.id} className={cn("relative overflow-hidden border border-border/60 rounded-xl shadow-soft hover:shadow-card transition-all bg-gradient-to-br", a.grad)}>
                <CardContent className="p-4 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("grid h-10 w-10 place-items-center rounded-lg ring-1 backdrop-blur-sm", a.bg, a.ring, a.text)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 py-0">{r.category}</Badge>
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 py-0 font-mono">{r.format}</Badge>
                    </div>
                  </div>
                  <div className="flex-1 mb-3">
                    <p className="text-sm font-semibold text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => handleGenerate(r)} className={cn("gap-1.5 text-white flex-1", `bg-rose-600 hover:bg-rose-700`)}>
                      <Play className="h-3.5 w-3.5" /> Generate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleSchedule(r)} className="gap-1.5" title="Schedule">
                      <Calendar className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {filteredCatalog.length === 0 && (
            <Card className="col-span-full border border-border/60 rounded-xl">
              <CardContent className="py-10 text-center text-muted-foreground">
                <BarChart3 className="h-8 w-8 opacity-40 mx-auto mb-2" />
                <p className="text-sm">No reports match your filters.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent reports table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Recent Reports</h2>
              <p className="text-xs text-muted-foreground">Last 7 generated / scheduled reports</p>
            </div>
            <Badge variant="outline" className="border-rose-500/30 text-rose-700 dark:text-rose-400">
              {RECENT_REPORTS.length} reports
            </Badge>
          </div>
          <ScrollArea className="max-h-[420px] rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 sticky top-0 z-10">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground min-w-[280px]">Report</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Generated At</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Generated By</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Format</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Records</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Size</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_REPORTS.map(r => (
                  <TableRow key={r.id} className="hover:bg-rose-500/5 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                          r.format === "Excel" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                          r.format === "CSV" ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" :
                          "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        )}>
                          {r.format === "Excel" ? <FileSpreadsheet className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">{r.title}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{formatDateTime(r.generatedAt)}</span></TableCell>
                    <TableCell><span className="text-xs text-foreground">{r.generatedBy}</span></TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">{r.format}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs font-medium text-foreground tabular-nums">{r.records || "—"}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs text-muted-foreground tabular-nums">{r.sizeKb ? `${(r.sizeKb / 1024).toFixed(2)} MB` : "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(
                        "font-medium border-0 text-[10px]",
                        r.status === "Ready" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" :
                        r.status === "Scheduled" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" :
                        "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400"
                      )}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.status === "Ready" && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Download" onClick={() => handleDownloadRecent(r)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Email" onClick={() => handleEmailRecent(r)}>
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

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border border-border/60 rounded-xl shadow-soft bg-gradient-to-br from-rose-500/10 to-pink-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Total Reports</p>
                <p className="text-xl font-bold text-rose-700 dark:text-rose-400 tabular-nums">{REPORT_CATALOG.length}</p>
              </div>
              <BarChart3 className="h-5 w-5 text-rose-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 rounded-xl shadow-soft bg-gradient-to-br from-emerald-500/10 to-teal-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Ready to Download</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{RECENT_REPORTS.filter(r => r.status === "Ready").length}</p>
              </div>
              <Download className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 rounded-xl shadow-soft bg-gradient-to-br from-amber-500/10 to-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Scheduled</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">{RECENT_REPORTS.filter(r => r.status === "Scheduled").length}</p>
              </div>
              <Calendar className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 rounded-xl shadow-soft bg-gradient-to-br from-cyan-500/10 to-teal-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Total FnF Cases</p>
                <p className="text-xl font-bold text-cyan-700 dark:text-cyan-400 tabular-nums">{FNF_CASES.length}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-cyan-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default FnFReportsSection
