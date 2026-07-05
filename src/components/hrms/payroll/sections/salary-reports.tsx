"use client"

// ============================================================================
//  Salary — Reports (Task ID 3-a)
// ----------------------------------------------------------------------------
//  Reports catalog + recent generated reports.
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  BarChart3, FileText, Download, Mail, CalendarClock, RefreshCw, Plus,
  Building2, Users, Layers, Wallet, ListChecks, Landmark, CalendarDays,
  TrendingUp, ArrowLeftRight, Banknote, FileSpreadsheet, Filter,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { MoreHorizontal, Eye } from "lucide-react"

import { PAY_GROUPS } from "../data"

// ---------- Report catalog ----------
interface ReportDef {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: "Payroll" | "Cost" | "Compliance" | "Revision"
  accent: "teal" | "cyan" | "emerald" | "amber" | "rose" | "violet"
}

const REPORTS: ReportDef[] = [
  { id: "monthly-summary", title: "Monthly Payroll Summary", description: "Entity-wise monthly gross, deductions & net payout summary.", icon: Wallet, category: "Payroll", accent: "teal" },
  { id: "entity-payout", title: "Entity-wise Payout", description: "Compare net payout, headcount & average salary across entities.", icon: Building2, category: "Payroll", accent: "cyan" },
  { id: "dept-cost", title: "Department-wise Cost", description: "Department-level CTC cost & payroll expense analysis.", icon: Users, category: "Cost", accent: "emerald" },
  { id: "pay-group-analysis", title: "Pay Group Analysis", description: "Per pay-group cycle time, error rate & employee coverage.", icon: Layers, category: "Payroll", accent: "amber" },
  { id: "structure-distribution", title: "Salary Structure Distribution", description: "Employees by salary structure, grade & employee type.", icon: FileSpreadsheet, category: "Cost", accent: "violet" },
  { id: "input-summary", title: "Payroll Input Summary", description: "All payroll inputs (bonus, OT, incentive, LOP) for a period.", icon: ListChecks, category: "Payroll", accent: "teal" },
  { id: "bank-payment", title: "Bank Payment Report", description: "Bank files generated, sent, paid & failed with UTR tracking.", icon: Landmark, category: "Payroll", accent: "cyan" },
  { id: "lop-report", title: "LOP Report", description: "Loss-of-pay days & deducted amount per employee / department.", icon: CalendarDays, category: "Payroll", accent: "rose" },
  { id: "bonus-incentive", title: "Bonus / Incentive Report", description: "Bonus & incentive payouts by employee / department / month.", icon: TrendingUp, category: "Cost", accent: "emerald" },
  { id: "revision-report", title: "Salary Revision Report", description: "All revisions with hike %, status & arrear impact.", icon: ArrowLeftRight, category: "Revision", accent: "violet" },
]

// ---------- Recent reports (synthetic) ----------
const RECENT_REPORTS = [
  { id: "rep-1", name: "Monthly Payroll Summary — June 2025", type: "Monthly Payroll Summary", period: "Jun 2025", generatedBy: "Anita Desai", generatedAt: "2025-06-28T11:20:00Z", format: "PDF" },
  { id: "rep-2", name: "Entity-wise Payout — Q1 2025-26", type: "Entity-wise Payout", period: "Apr–Jun 2025", generatedBy: "Rajesh Kumar", generatedAt: "2025-06-25T16:05:00Z", format: "Excel" },
  { id: "rep-3", name: "Department-wise Cost — May 2025", type: "Department-wise Cost", period: "May 2025", generatedBy: "System (Scheduled)", generatedAt: "2025-06-01T02:00:00Z", format: "PDF" },
  { id: "rep-4", name: "LOP Report — May 2025", type: "LOP Report", period: "May 2025", generatedBy: "Karthik Iyer", generatedAt: "2025-06-03T10:30:00Z", format: "CSV" },
  { id: "rep-5", name: "Bonus / Incentive Report — Q1 2025-26", type: "Bonus / Incentive Report", period: "Apr–Jun 2025", generatedBy: "Rajesh Kumar", generatedAt: "2025-06-20T14:45:00Z", format: "Excel" },
  { id: "rep-6", name: "Bank Payment Report — May 2025", type: "Bank Payment Report", period: "May 2025", generatedBy: "Anita Desai", generatedAt: "2025-05-30T09:15:00Z", format: "PDF" },
  { id: "rep-7", name: "Salary Revision Report — FY 2024-25", type: "Salary Revision Report", period: "Apr 2024 – Mar 2025", generatedBy: "Anita Desai", generatedAt: "2025-04-15T11:00:00Z", format: "PDF" },
  { id: "rep-8", name: "Salary Structure Distribution — Jun 2025", type: "Salary Structure Distribution", period: "Jun 2025", generatedBy: "System (Scheduled)", generatedAt: "2025-06-10T02:00:00Z", format: "Excel" },
]

// ---------- motion ----------
const gridContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const gridItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

// ---------- Format helpers ----------
function formatDateTime(d?: string | Date | null): string {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return "—"
  return dt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const ACCENT_GRAD: Record<string, string> = {
  teal: "from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-400 ring-teal-500/20",
  cyan: "from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 ring-cyan-500/20",
  emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  rose: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400 ring-rose-500/20",
  violet: "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400 ring-violet-500/20",
}

// ============================================================================
//  Main component
// ============================================================================
export function SalaryReportsSection() {
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [entity, setEntity] = React.useState("all")
  const [payGroup, setPayGroup] = React.useState("all")
  const [from, setFrom] = React.useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
  const [to, setTo] = React.useState(new Date().toISOString().slice(0, 10))

  const filteredReports = React.useMemo(() => {
    if (categoryFilter === "all") return REPORTS
    return REPORTS.filter(r => r.category === categoryFilter)
  }, [categoryFilter])

  const onGenerate = (r: ReportDef) => {
    toast.success("Report generation started", { description: `${r.title} · ${from} to ${to}` })
  }
  const onSchedule = (r: ReportDef) => {
    toast.success("Report scheduled", { description: `${r.title} — monthly auto-generation enabled` })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-soft">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Salary Reports</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Generate & schedule payroll reports across entities, pay groups & periods.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => toast.info("Refreshed")} className="gap-1.5 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Global filters */}
      <Card className="border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-teal-500" />
            <h3 className="text-sm font-semibold text-foreground">Report Filters</h3>
            <span className="text-[11px] text-muted-foreground">Applied to all generated reports</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">From Date</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 bg-background" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">To Date</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 bg-background" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Entity</Label>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger className="h-9 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {Array.from(new Set(PAY_GROUPS.map(g => g.entity))).map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Pay Group</Label>
              <Select value={payGroup} onValueChange={setPayGroup}>
                <SelectTrigger className="h-9 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pay Groups</SelectItem>
                  {PAY_GROUPS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {["Payroll", "Cost", "Compliance", "Revision"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports catalog */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Reports Catalog</h2>
          <Badge variant="outline" className="text-[10px] border-teal-500/30 text-teal-700 dark:text-teal-400">
            {filteredReports.length} of {REPORTS.length} reports
          </Badge>
        </div>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          variants={gridContainer} initial="hidden" animate="show"
        >
          {filteredReports.map(r => {
            const accent = ACCENT_GRAD[r.accent]
            return (
              <motion.div key={r.id} variants={gridItem}>
                <Card className="rounded-xl border border-border/60 shadow-soft hover:shadow-card transition-all overflow-hidden group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br ring-1", accent)}>
                        <r.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{r.title}</p>
                        <Badge variant="outline" className="text-[10px] mt-1">{r.category}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[32px]">{r.description}</p>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="default" onClick={() => onGenerate(r)} className="gap-1.5 h-8 text-xs flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
                        <Plus className="h-3 w-3" /> Generate
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onSchedule(r)} className="gap-1.5 h-8 text-xs">
                        <CalendarClock className="h-3 w-3" /> Schedule
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Recent reports */}
      <Card className="border-border/60 rounded-xl shadow-soft overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Recently Generated Reports</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last 8 reports generated across the system</p>
          </div>
          <Badge variant="outline" className="text-[10px] border-teal-500/30 text-teal-700 dark:text-teal-400">
            {RECENT_REPORTS.length} reports
          </Badge>
        </div>
        <ScrollArea className="max-h-[480px]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur z-10">
              <TableRow className="hover:bg-muted/40">
                <TableHead className="min-w-[260px]">Report Name</TableHead>
                <TableHead className="min-w-[180px]">Type</TableHead>
                <TableHead className="min-w-[140px]">Period</TableHead>
                <TableHead className="min-w-[140px]">Generated By</TableHead>
                <TableHead className="min-w-[150px]">Generated At</TableHead>
                <TableHead className="min-w-[80px]">Format</TableHead>
                <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RECENT_REPORTS.map(rep => (
                <TableRow key={rep.id} className="border-border/40 hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
                        <FileText className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{rep.name}</p>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[180px]">{rep.type}</span></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{rep.period}</Badge></TableCell>
                  <TableCell><span className="text-xs text-foreground truncate block max-w-[140px]">{rep.generatedBy}</span></TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{formatDateTime(rep.generatedAt)}</span></TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px] bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400">{rep.format}</Badge></TableCell>
                  <TableCell className="text-right pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => toast.info("Preview opened")}><Eye className="h-3.5 w-3.5 mr-2" /> Preview</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.success("Report downloaded")}><Download className="h-3.5 w-3.5 mr-2" /> Download</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.success("Emailed to recipients")}><Mail className="h-3.5 w-3.5 mr-2" /> Email</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toast.success("Schedule updated")}><CalendarClock className="h-3.5 w-3.5 mr-2" /> Schedule</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  )
}

export default SalaryReportsSection
