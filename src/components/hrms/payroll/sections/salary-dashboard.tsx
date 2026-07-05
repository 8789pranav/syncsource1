"use client"

// ============================================================================
//  Salary — Dashboard (Task ID 3-a)
// ----------------------------------------------------------------------------
//  Real-time overview of the Salary / Payroll pipeline.
//  Theme: teal/cyan accent (Salary menu color).
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area,
} from "recharts"
import {
  Wallet, Users, Play, ListChecks, ArrowLeftRight, Landmark, ShieldCheck,
  TrendingUp, CalendarDays, FileText, Download, RefreshCw, ChevronRight,
  Sparkles, Clock,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, CheckCircle2, Banknote, FileSpreadsheet } from "lucide-react"

import {
  STATUS_COLORS, formatCurrency, formatCurrencyShort, formatDate,
} from "../shared"
import {
  PAY_GROUPS as PG_DATA, PAYROLL_RUNS as PR_DATA, PAYROLL_INPUTS,
  BANK_PAYMENTS, ARREAR_CASES, CHALLANS,
} from "../data"

// ---------- Palette ----------
const TEAL = "#14b8a6"
const CYAN = "#06b6d4"
const EMERALD = "#10b981"
const AMBER = "#f59e0b"
const ROSE = "#f43f5e"
const VIOLET = "#8b5cf6"
const SLATE = "#64748b"

const DONUT_COLORS: Record<string, string> = {
  Draft: SLATE, Processing: CYAN, Processed: "#0891b2",
  Approved: EMERALD, Paid: TEAL, Cancelled: ROSE,
}

// ---------- motion variants ----------
const gridContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const gridItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 220, damping: 22 } },
}

// ---------- Stat card ----------
function DashStat({
  label, value, icon: Icon, accent, sub, trend,
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  accent: "teal" | "cyan" | "emerald" | "amber" | "rose" | "violet"
  sub?: string
  trend?: { up: boolean; value: string }
}) {
  const map: Record<string, { grad: string; text: string; ring: string }> = {
    teal:    { grad: "from-teal-500/15 to-teal-500/5",     text: "text-teal-600 dark:text-teal-400",     ring: "ring-teal-500/20" },
    cyan:    { grad: "from-cyan-500/15 to-cyan-500/5",     text: "text-cyan-600 dark:text-cyan-400",     ring: "ring-cyan-500/20" },
    emerald: { grad: "from-emerald-500/15 to-emerald-500/5",text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20" },
    amber:   { grad: "from-amber-500/15 to-amber-500/5",   text: "text-amber-600 dark:text-amber-400",   ring: "ring-amber-500/20" },
    rose:    { grad: "from-rose-500/15 to-rose-500/5",     text: "text-rose-600 dark:text-rose-400",     ring: "ring-rose-500/20" },
    violet:  { grad: "from-violet-500/15 to-violet-500/5", text: "text-violet-600 dark:text-violet-400", ring: "ring-violet-500/20" },
  }
  const a = map[accent] || map.teal
  return (
    <Card className={cn("relative overflow-hidden rounded-xl border border-border/60 shadow-soft bg-gradient-to-br", a.grad)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-semibold mt-1 text-foreground tabular-nums leading-none">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>}
            {trend && (
              <div className={cn("inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium",
                trend.up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                <span>{trend.up ? "▲" : "▼"}</span><span>{trend.value}</span>
              </div>
            )}
          </div>
          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background/70 ring-1 backdrop-blur-sm", a.ring, a.text)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- chart tooltip ----------
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/60 bg-background/95 backdrop-blur px-3 py-2 shadow-soft text-xs">
      {label && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground tabular-nums">
            {typeof p.value === "number" ? formatCurrencyShort(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
//  Main component
// ============================================================================
export function SalaryDashboardSection() {
  // ---------- Derived stats ----------
  const totalPayGroups = PG_DATA.length
  const activeRuns = PR_DATA.filter(r => r.status === "Processing" || r.status === "Draft" || r.status === "Processed").length
  const totalEmployees = PG_DATA.reduce((s, g) => s + g.employeeCount, 0)
  const netPayoutThisMonth = PR_DATA
    .filter(r => r.status === "Paid" || r.status === "Approved" || r.status === "Processed")
    .reduce((s, r) => s + r.netPayout, 0)
  const pendingInputs = PAYROLL_INPUTS.filter(i => i.status === "Pending").length
  const arrearsPending = ARREAR_CASES.filter(a => a.status === "Pending Approval" || a.status === "Approved").length
  const bankFilesPending = BANK_PAYMENTS.filter(b => b.status === "Pending" || b.status === "File Generated").length
  const compliancePending = CHALLANS.filter(c => c.status === "Pending" || c.status === "Overdue").length

  // ---------- Run status donut ----------
  const statusDist = React.useMemo(() => {
    const map = new Map<string, number>()
    PR_DATA.forEach(r => map.set(r.status, (map.get(r.status) || 0) + 1))
    return Array.from(map.entries()).map(([name, value]) => ({ name, value, color: DONUT_COLORS[name] || SLATE }))
  }, [])
  const statusTotal = statusDist.reduce((s, d) => s + d.value, 0)

  // ---------- Monthly payout trend (6 months) ----------
  const monthTrend = React.useMemo(() => {
    const months: { month: string; net: number; gross: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = d.toLocaleDateString("en-IN", { month: "short" })
      const factor = 1 - i * 0.02 + 0.05 * (5 - i) / 5
      const net = Math.round(38500000 * factor)
      const gross = Math.round(45000000 * factor)
      months.push({ month: label, net, gross })
    }
    return months
  }, [])

  // ---------- Entity-wise payout ----------
  const entityPayout = React.useMemo(() => {
    const map = new Map<string, number>()
    PR_DATA.forEach(r => map.set(r.entity, (map.get(r.entity) || 0) + r.netPayout))
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: name.replace("ACME ", "").replace(" Pvt Ltd", "").replace(" LLC", "").replace(" Inc", "").replace(" Pte Ltd", ""), value }))
      .sort((a, b) => b.value - a.value)
  }, [])

  // ---------- Arrear trend ----------
  const arrearTrend = React.useMemo(() => {
    const months: { month: string; arrear: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = d.toLocaleDateString("en-IN", { month: "short" })
      const factor = 0.6 + (5 - i) * 0.1
      months.push({ month: label, arrear: Math.round(280000 * factor) })
    }
    return months
  }, [])

  // ---------- Recent runs ----------
  const recentRuns = React.useMemo(() =>
    [...PR_DATA].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    []
  )

  // ---------- Upcoming pay dates ----------
  const upcomingPayDates = React.useMemo(() => {
    return PG_DATA
      .filter(g => g.status === "Active")
      .map(g => {
        // Synthesize next pay date as ~10 days from now (demo)
        const days = 3 + Math.floor(Math.random() * 20)
        const dt = new Date(Date.now() + days * 86400000)
        return { ...g, payDateIso: dt.toISOString(), daysUntil: days }
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 6)
  }, [])

  // ---------- Handlers ----------
  const onAction = (label: string) => toast.success(label)
  const onRowAction = (action: string, name: string) => toast.success(`${action}`, { description: name })

  return (
    <div className="space-y-5">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-soft">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Salary Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Real-time payroll overview — runs, payouts, inputs, arrears, bank files & compliance.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => onAction("Dashboard refreshed")} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => onAction("Export started")} className="gap-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* ---------- Quick actions ---------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Start Payroll Run", icon: Play, action: () => onAction("Payroll Run wizard opened") },
          { label: "Add Pay Group", icon: Users, action: () => onAction("Add Pay Group dialog opened") },
          { label: "Generate Payslips", icon: FileText, action: () => onAction("Payslip generation started") },
          { label: "Export Data", icon: Download, action: () => onAction("Export dialog opened") },
        ].map(qa => (
          <button
            key={qa.label}
            onClick={qa.action}
            className="group flex items-center gap-2.5 rounded-xl border border-border/60 bg-card p-3 text-left shadow-soft transition-all hover:border-teal-500/40 hover:shadow-card hover:bg-teal-50/40 dark:hover:bg-teal-500/5"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-sm">
              <qa.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{qa.label}</p>
              <p className="text-[11px] text-muted-foreground truncate">Quick action</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-teal-600 transition-colors" />
          </button>
        ))}
      </div>

      {/* ---------- Stat cards ---------- */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3"
        variants={gridContainer} initial="hidden" animate="show"
      >
        <motion.div variants={gridItem}>
          <DashStat label="Pay Groups" value={totalPayGroups} icon={Users} accent="teal" sub="Across 4 entities" />
        </motion.div>
        <motion.div variants={gridItem}>
          <DashStat label="Active Runs" value={activeRuns} icon={Play} accent="cyan" sub="In progress" />
        </motion.div>
        <motion.div variants={gridItem}>
          <DashStat label="Total Employees" value={totalEmployees} icon={Wallet} accent="emerald" sub="On payroll" />
        </motion.div>
        <motion.div variants={gridItem}>
          <DashStat label="Net Payout (Month)" value={formatCurrencyShort(netPayoutThisMonth)} icon={Banknote} accent="teal" sub="This month" trend={{ up: true, value: "4.2%" }} />
        </motion.div>
        <motion.div variants={gridItem}>
          <DashStat label="Pending Inputs" value={pendingInputs} icon={ListChecks} accent="amber" sub="Awaiting approval" />
        </motion.div>
        <motion.div variants={gridItem}>
          <DashStat label="Arrears Pending" value={arrearsPending} icon={ArrowLeftRight} accent="violet" sub="To be paid" />
        </motion.div>
        <motion.div variants={gridItem}>
          <DashStat label="Bank Files Pending" value={bankFilesPending} icon={Landmark} accent="rose" sub="To generate" />
        </motion.div>
        <motion.div variants={gridItem}>
          <DashStat label="Compliance Pending" value={compliancePending} icon={ShieldCheck} accent="amber" sub="Challans due" />
        </motion.div>
      </motion.div>

      {/* ---------- Charts row 1 ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Run status donut */}
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">Payroll Run Status</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Distribution of current runs</p>
            </div>
            {statusTotal === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Play className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No runs recorded.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-48 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                        {statusDist.map(d => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold tabular-nums text-foreground">{statusTotal}</span>
                    <span className="text-[11px] text-muted-foreground">Runs</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 w-full mt-3">
                  {statusDist.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-muted-foreground truncate flex-1">{d.name}</span>
                      <span className="font-semibold text-foreground tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly net payout trend (bar) */}
        <Card className="lg:col-span-2 border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Monthly Net Payout Trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Last 6 months</p>
              </div>
              <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-400 gap-1">
                <TrendingUp className="h-3 w-3" /> +4.2%
              </Badge>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthTrend} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrencyShort(v).replace("₹", "")} width={50} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  <Bar dataKey="net" name="Net Payout" fill={TEAL} radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---------- Charts row 2 ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Entity-wise payout (horizontal bar) */}
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">Entity-wise Payout</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Net payout by entity (current month)</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entityPayout} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrencyShort(v).replace("₹", "")} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={88} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  <Bar dataKey="value" name="Net Payout" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {entityPayout.map((_, i) => (
                      <Cell key={i} fill={[TEAL, CYAN, EMERALD, VIOLET][i % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Arrear trend (area) */}
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Arrear Trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Last 6 months</p>
              </div>
              <Badge variant="outline" className="border-violet-500/30 text-violet-700 dark:text-violet-400 gap-1">
                <ArrowLeftRight className="h-3 w-3" /> Live
              </Badge>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={arrearTrend} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="arrearGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={VIOLET} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={VIOLET} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrencyShort(v).replace("₹", "")} width={50} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="arrear" name="Arrears" stroke={VIOLET} strokeWidth={2} fill="url(#arrearGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---------- Recent runs + upcoming pay dates ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent runs table */}
        <Card className="lg:col-span-2 border border-border/60 rounded-xl shadow-soft overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent Payroll Runs</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Latest 5 runs across all pay groups</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onAction("View all payroll runs")} className="text-teal-700 dark:text-teal-400 hover:text-teal-800 hover:bg-teal-50 dark:hover:bg-teal-500/10">
              View all <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
          <div className="max-h-[440px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur z-10">
                <TableRow className="hover:bg-muted/40">
                  <TableHead className="min-w-[200px]">Run Name</TableHead>
                  <TableHead className="min-w-[120px]">Entity</TableHead>
                  <TableHead className="min-w-[110px]">Month</TableHead>
                  <TableHead className="min-w-[110px]">Status</TableHead>
                  <TableHead className="min-w-[80px] text-right">Employees</TableHead>
                  <TableHead className="min-w-[130px] text-right">Net Payout</TableHead>
                  <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.map(r => (
                  <TableRow key={r.id} className="border-border/40 hover:bg-muted/30">
                    <TableCell>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{r.code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground truncate block max-w-[120px]">{r.entity}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-foreground">{r.payrollMonth}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-[11px] border-0", STATUS_COLORS[r.status] || "bg-muted text-muted-foreground")}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{r.totalEmployees}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums text-foreground">{formatCurrencyShort(r.netPayout)}</TableCell>
                    <TableCell className="text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => onRowAction("View run", r.name)}><Eye className="h-3.5 w-3.5 mr-2" /> View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction("Process run", r.name)}><Play className="h-3.5 w-3.5 mr-2" /> Process</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRowAction("Approve run", r.name)}><CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Approve</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onRowAction("Generate bank file", r.name)}><Landmark className="h-3.5 w-3.5 mr-2" /> Bank File</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Upcoming pay dates */}
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Upcoming Pay Dates</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Next 6 pay groups</p>
              </div>
              <CalendarDays className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <ScrollArea className="max-h-[440px] pr-2">
              <div className="space-y-2">
                {upcomingPayDates.map(pg => (
                  <div key={pg.id} className="flex items-center gap-3 rounded-lg border border-border/40 bg-background p-3 hover:border-teal-500/40 hover:bg-teal-50/30 dark:hover:bg-teal-500/5 transition-colors">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white text-center">
                      <div>
                        <p className="text-[10px] font-medium uppercase leading-none opacity-90">
                          {new Date(pg.payDateIso).toLocaleDateString("en-IN", { month: "short" })}
                        </p>
                        <p className="text-base font-bold leading-tight">{new Date(pg.payDateIso).getDate()}</p>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{pg.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{pg.entity} · {pg.employeeCount} emp</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 tabular-nums">{pg.daysUntil}d</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(pg.payDateIso)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* ---------- Footer banner ---------- */}
      <Card className="border border-teal-500/20 rounded-xl shadow-soft bg-gradient-to-r from-teal-50/60 to-cyan-50/40 dark:from-teal-500/5 dark:to-cyan-500/5">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Payroll cycle is on track</p>
              <p className="text-xs text-muted-foreground mt-0.5">All current-month runs are progressing. 2 inputs pending approval, 3 bank files to generate.</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => onAction("Opened payroll run section")} className="gap-1.5 border-teal-500/40 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10">
            Open Payroll Run <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default SalaryDashboardSection
