"use client"

// ============================================================================
//  ArrearReportsSection — Arrear menu #9 (Reports)
//  ----------------------------------------------------------------------------
//  Reports catalog with Generate + Schedule actions. Date range + entity/type
//  filters. Recent reports table. Amber/orange accent.
// ============================================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  FileBarChart, Search, Filter, RefreshCw, Download, Eye,
  Clock, IndianRupee, Layers, Inbox, Building2, Tag, CalendarDays,
  MoreHorizontal, FileSpreadsheet, CalendarClock, Plus, Play, Mail,
  TrendingUp, TrendingDown, PieChart, BarChart3, AlertTriangle,
  FileText, ListChecks, Scale, FileCheck,
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

import { ARREAR_CASES } from "../data"
import {
  ArrearType, STATUS_COLORS,
  formatCurrency, formatDateTime, initials, avatarColor,
} from "../shared"

// ---------- Constants ----------
const ARREAR_TYPES: ArrearType[] = [
  "Salary Revision", "LOP Reversal", "Attendance Correction", "Bonus",
  "Incentive", "Manual", "Component Change", "Structure Change",
]
const ENTITIES = ["ACME India Pvt Ltd", "ACME UAE LLC", "ACME US Inc", "ACME Singapore Pte Ltd"]

interface ReportDef {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: "Summary" | "Analysis" | "Aging" | "Schedule" | "Workflow"
  format: "Excel" | "PDF" | "CSV"
  popularity: number
}

const REPORT_CATALOG: ReportDef[] = [
  { id: "arrear-summary", name: "Arrear Summary", description: "Consolidated summary of all arrear cases by status, type, and entity", icon: FileText, category: "Summary", format: "Excel", popularity: 95 },
  { id: "type-wise-analysis", name: "Type-wise Analysis", description: "Breakdown of arrears by type (Salary Revision, LOP Reversal, Bonus, Manual etc.)", icon: PieChart, category: "Analysis", format: "Excel", popularity: 88 },
  { id: "entity-wise-arrear", name: "Entity-wise Arrear", description: "Arrear distribution and totals across all legal entities", icon: BarChart3, category: "Analysis", format: "PDF", popularity: 80 },
  { id: "department-wise-arrear", name: "Department-wise Arrear", description: "Arrear amounts and counts grouped by department", icon: BarChart3, category: "Analysis", format: "Excel", popularity: 76 },
  { id: "monthly-trend", name: "Monthly Trend", description: "Arrear vs recovery trend over the last 12 months", icon: TrendingUp, category: "Analysis", format: "Excel", popularity: 82 },
  { id: "negative-arrear-recovery", name: "Negative Arrear (Recovery) Report", description: "All recovery / negative arrear cases with employee and reason", icon: TrendingDown, category: "Analysis", format: "PDF", popularity: 70 },
  { id: "arrear-aging", name: "Arrear Aging", description: "Aging buckets (0-30, 31-60, 61-90, 90+ days) for unpaid arrears", icon: AlertTriangle, category: "Aging", format: "Excel", popularity: 85 },
  { id: "payout-schedule", name: "Payout Schedule", description: "Upcoming arrear payouts grouped by month and entity", icon: CalendarClock, category: "Schedule", format: "PDF", popularity: 78 },
  { id: "approval-cycle-time", name: "Approval Cycle Time", description: "Average approval cycle time by approver and arrear type", icon: FileCheck, category: "Workflow", format: "Excel", popularity: 72 },
]

// Synthetic recent reports
const RECENT_REPORTS = [
  { id: "rep-1", name: "Arrear Summary — June 2025", type: "Arrear Summary", format: "Excel", generatedBy: "Anita Desai", generatedAt: new Date(Date.now() - 1 * 86400000).toISOString(), size: "248 KB", status: "Generated" },
  { id: "rep-2", name: "Type-wise Analysis — Q1 FY26", type: "Type-wise Analysis", format: "Excel", generatedBy: "Rajesh Kumar", generatedAt: new Date(Date.now() - 3 * 86400000).toISOString(), size: "512 KB", status: "Generated" },
  { id: "rep-3", name: "Arrear Aging — May 2025", type: "Arrear Aging", format: "Excel", generatedBy: "Karthik Iyer", generatedAt: new Date(Date.now() - 7 * 86400000).toISOString(), size: "184 KB", status: "Generated" },
  { id: "rep-4", name: "Payout Schedule — June 2025", type: "Payout Schedule", format: "PDF", generatedBy: "Anita Desai", generatedAt: new Date(Date.now() - 8 * 86400000).toISOString(), size: "96 KB", status: "Generated" },
  { id: "rep-5", name: "Negative Arrear Recovery — May 2025", type: "Negative Arrear (Recovery) Report", format: "PDF", generatedBy: "Rajesh Kumar", generatedAt: new Date(Date.now() - 14 * 86400000).toISOString(), size: "72 KB", status: "Generated" },
  { id: "rep-6", name: "Approval Cycle Time — Q4 FY25", type: "Approval Cycle Time", format: "Excel", generatedBy: "Anita Desai", generatedAt: new Date(Date.now() - 30 * 86400000).toISOString(), size: "320 KB", status: "Generated" },
]

// ---------- Stat card ----------
function StatCard({
  label, value, icon: Icon, sub, accent = "amber",
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  sub?: string
  accent?: "amber" | "emerald"
}) {
  const accents: Record<string, string> = {
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  }
  const cls = accents[accent] || accents.amber
  return (
    <Card className="relative overflow-hidden border border-border/60 rounded-xl shadow-soft hover:shadow-card transition-all">
      <CardContent className="p-4">
        <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", cls)} />
        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl font-semibold mt-1 text-foreground tabular-nums leading-none">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>}
          </div>
          <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background/70 ring-1 backdrop-blur-sm", cls)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterSelect({
  label, icon: Icon, value, onChange, options, allLabel,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  value: string
  onChange: (v: string) => void
  options: string[]
  allLabel: string
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[150px]">
      <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder={allLabel} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

// ---------- Schedule dialog ----------
function ScheduleDialog({
  report, open, onOpenChange,
}: {
  report: ReportDef | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [frequency, setFrequency] = useState("Monthly")
  const [day, setDay] = useState("1st")
  const [emails, setEmails] = useState("payroll@acme.com")
  if (!report) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <CalendarClock className="h-4 w-4" />
            </div>
            Schedule Report
          </DialogTitle>
          <DialogDescription>{report.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Run On</Label>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["1st", "5th", "10th", "15th", "20th", "25th", "Last Day"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email Recipients (comma-separated)</Label>
            <Input value={emails} onChange={e => setEmails(e.target.value)} className="h-9" />
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Format:</span> {report.format} · <span className="font-medium text-foreground">Category:</span> {report.category}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
            onClick={() => { toast.success("Report scheduled", { description: `${report.name} · ${frequency} on ${day}` }); onOpenChange(false) }}
          >
            <CalendarClock className="h-4 w-4" /> Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Component ----------
export function ArrearReportsSection() {
  const [entityFilter, setEntityFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [search, setSearch] = useState("")
  const [scheduleReport, setScheduleReport] = useState<ReportDef | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const totalReports = REPORT_CATALOG.length
    const generatedThisMonth = RECENT_REPORTS.length
    const totalScheduled = 3 // synthetic
    const totalCases = ARREAR_CASES.length
    return { totalReports, generatedThisMonth, totalScheduled, totalCases }
  }, [])

  // ---------- Filtered catalog (search only) ----------
  const filteredCatalog = useMemo(() => {
    if (!search.trim()) return REPORT_CATALOG
    const q = search.toLowerCase()
    return REPORT_CATALOG.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q),
    )
  }, [search])

  // ---------- Actions ----------
  const handleGenerate = (r: ReportDef) => {
    toast.success(`Generating ${r.name}`, {
      description: `Format: ${r.format} · Entity: ${entityFilter === "all" ? "All" : entityFilter} · Type: ${typeFilter === "all" ? "All" : typeFilter}`,
    })
  }
  const handleSchedule = (r: ReportDef) => {
    setScheduleReport(r)
    setScheduleOpen(true)
  }
  const handleDownload = (r: typeof RECENT_REPORTS[0]) => {
    toast.success(`Downloading ${r.name}`, { description: `${r.format} · ${r.size}` })
  }
  const handleEmail = (r: typeof RECENT_REPORTS[0]) => {
    toast.success(`Report emailed`, { description: r.name })
  }

  const handleClearFilters = () => {
    setEntityFilter("all"); setTypeFilter("all"); setFromDate(""); setToDate(""); setSearch("")
  }
  const handleRefresh = () => toast.success("Reports refreshed")

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-soft">
            <FileBarChart className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">
              Arrear Reports
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Generate arrear analytics & operational reports. Schedule recurring exports and email
              distribution.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleRefresh} className="gap-1.5 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Available Reports" value={stats.totalReports} icon={FileBarChart} accent="amber" sub="In catalog" />
        <StatCard label="Generated This Month" value={stats.generatedThisMonth} icon={FileCheck} accent="emerald" sub="Recent exports" />
        <StatCard label="Scheduled Reports" value={stats.totalScheduled} icon={CalendarClock} accent="amber" sub="Recurring" />
        <StatCard label="Arrear Cases" value={stats.totalCases} icon={Layers} accent="emerald" sub="Total in system" />
      </div>

      {/* Filter bar */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Report Filters</h3>
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400">
              Applied to all reports
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <FilterSelect label="Entity" icon={Building2} value={entityFilter} onChange={setEntityFilter} options={ENTITIES} allLabel="All entities" />
            <FilterSelect label="Arrear Type" icon={Tag} value={typeFilter} onChange={setTypeFilter} options={ARREAR_TYPES} allLabel="All types" />
            <div className="flex flex-col gap-1 min-w-[150px]">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> From Date
              </label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-8 text-xs bg-background" />
            </div>
            <div className="flex flex-col gap-1 min-w-[150px]">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> To Date
              </label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-8 text-xs bg-background" />
            </div>
            <div className="flex flex-col gap-1 min-w-[150px]">
              <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
                <Search className="h-3 w-3" /> Search Catalog
              </label>
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Report name…" className="h-8 text-xs bg-background" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/40">
            <Button size="sm" variant="ghost" onClick={handleClearFilters}>Clear</Button>
            <Button size="sm" onClick={() => toast.info("Filters applied")} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
              <Filter className="h-3.5 w-3.5" /> Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports catalog */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Reports Catalog</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{filteredCatalog.length} report(s) available</p>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400">
              {REPORT_CATALOG.length} total
            </Badge>
          </div>
          {filteredCatalog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No reports match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCatalog.map((r, idx) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="group rounded-xl border border-border/60 bg-card p-4 hover:border-amber-500/40 hover:shadow-card transition-all flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-amber-500/15 to-orange-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                      <r.icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      <Badge variant="outline" className="text-[9px] py-0 h-5">{r.category}</Badge>
                      <Badge variant="outline" className="text-[9px] py-0 h-5 border-amber-500/30 text-amber-700 dark:text-amber-400">{r.format}</Badge>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> {r.popularity}% used
                    </span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={() => handleSchedule(r)}>
                        <CalendarClock className="h-3 w-3" /> Schedule
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                        onClick={() => handleGenerate(r)}
                      >
                        <Play className="h-3 w-3" /> Generate
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent reports table */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent Reports</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{RECENT_REPORTS.length} most-recent generated reports</p>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400">
              Last 30 days
            </Badge>
          </div>
          <ScrollArea className="max-h-[480px] w-full">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
                <TableRow className="hover:bg-muted/60">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide min-w-[260px]">Report Name</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Format</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Generated By</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Generated At</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Size</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_REPORTS.map(r => (
                  <TableRow key={r.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-500/5">
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-500/15 to-orange-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                          <FileSpreadsheet className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">{r.format}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.generatedBy}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(r.generatedAt)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">{r.size}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_COLORS[r.status] || "bg-muted text-muted-foreground")}>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-[11px]">Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => toast.info(`Previewing ${r.name}`)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(r)}>
                            <Download className="h-3.5 w-3.5 mr-2" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEmail(r)}>
                            <Mail className="h-3.5 w-3.5 mr-2" /> Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info(`Re-generating ${r.name}`)}>
                            <Play className="h-3.5 w-3.5 mr-2" /> Regenerate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 dark:text-rose-400" onClick={() => toast.info("Report deleted")}>
                            <Download className="h-3.5 w-3.5 mr-2 rotate-180" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <ScheduleDialog report={scheduleReport} open={scheduleOpen} onOpenChange={setScheduleOpen} />
    </div>
  )
}

export default ArrearReportsSection
