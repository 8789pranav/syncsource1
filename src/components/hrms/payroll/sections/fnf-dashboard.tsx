"use client"

// ============================================================================
//  FnF Dashboard — Full & Final settlement overview
//  Rose/pink accent family. Stats, charts, recent cases, settlement timeline.
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts"
import {
  LayoutDashboard, Wallet, Inbox, Calculator, ShieldCheck, BadgeCheck,
  Coins, Clock, RefreshCw, Filter, Building2, Briefcase, UserMinus,
  TrendingUp, TrendingDown, CalendarDays, ArrowRight,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import {
  FNF_CASES,
} from "../data"
import type { FnFCase } from "../shared"
import {
  initials, avatarColor, formatDate, formatCurrency, formatCurrencyShort,
  timeAgo, STATUS_COLORS,
} from "../shared"

// ---------- accent helpers ----------
const ACCENT_MAP: Record<string, { grad: string; text: string; ring: string }> = {
  rose:    { grad: "from-rose-500/15 to-pink-500/5",     text: "text-rose-600 dark:text-rose-400",     ring: "ring-rose-500/20" },
  pink:    { grad: "from-pink-500/15 to-rose-500/5",     text: "text-pink-600 dark:text-pink-400",     ring: "ring-pink-500/20" },
  amber:   { grad: "from-amber-500/15 to-orange-500/5",  text: "text-amber-600 dark:text-amber-400",   ring: "ring-amber-500/20" },
  cyan:    { grad: "from-cyan-500/15 to-teal-500/5",     text: "text-cyan-600 dark:text-cyan-400",     ring: "ring-cyan-500/20" },
  emerald: { grad: "from-emerald-500/15 to-teal-500/5",  text: "text-emerald-600 dark:text-emerald-400",ring: "ring-emerald-500/20" },
  teal:    { grad: "from-teal-500/15 to-cyan-500/5",     text: "text-teal-600 dark:text-teal-400",     ring: "ring-teal-500/20" },
  slate:   { grad: "from-slate-500/15 to-slate-500/5",   text: "text-slate-600 dark:text-slate-400",   ring: "ring-slate-500/20" },
}
type Accent = keyof typeof ACCENT_MAP

const gridContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
}
const gridItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 220, damping: 22 } },
}

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
    <Card className={cn(
      "relative overflow-hidden border border-border/60 rounded-xl shadow-soft hover:shadow-card transition-all duration-200",
      "bg-gradient-to-br", a.grad,
    )}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-2xl sm:text-3xl font-semibold mt-1 text-foreground tabular-nums leading-none">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>}
          </div>
          <div className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background/70 ring-1 backdrop-blur-sm",
            a.ring, a.text,
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterSelect({
  label, icon: Icon, placeholder, options,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  placeholder: string
  options: string[]
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </label>
      <Select defaultValue="all">
        <SelectTrigger className="h-8 text-xs bg-background">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All {label}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// ---------- Status palette for donut ----------
const STATUS_PIE_COLORS: Record<string, string> = {
  "Draft": "#94a3b8",
  "Inputs Pending": "#f59e0b",
  "Calculation In Progress": "#06b6d4",
  "Pending Approval": "#a855f7",
  "Approved": "#10b981",
  "Paid": "#e11d48",
  "Cancelled": "#64748b",
}

const MONTH_TREND = [
  { month: "Jan", value: 4 },
  { month: "Feb", value: 6 },
  { month: "Mar", value: 3 },
  { month: "Apr", value: 7 },
  { month: "May", value: 5 },
  { month: "Jun", value: 8 },
  { month: "Jul", value: 4 },
  { month: "Aug", value: 9 },
  { month: "Sep", value: 6 },
  { month: "Oct", value: 7 },
  { month: "Nov", value: 5 },
  { month: "Dec", value: 8 },
]

// ============================================================================
export function FnFDashboardSection() {
  const stats = React.useMemo(() => {
    const cases = FNF_CASES
    const total = cases.length
    const inputsPending = cases.filter(c => c.status === "Inputs Pending").length
    const inProgress = cases.filter(c => c.status === "Calculation In Progress").length
    const pendingAppr = cases.filter(c => c.status === "Pending Approval").length
    const approved = cases.filter(c => c.status === "Approved").length
    const paid = cases.filter(c => c.status === "Paid").length
    const netPayable = cases.reduce((s, c) => s + c.netPayable, 0)
    // Avg settlement time: days between createdAt and paidAt/approvedAt for paid cases
    const settled = cases.filter(c => c.paidAt || c.approvedAt)
    const avgDays = settled.length === 0 ? 0 : Math.round(
      settled.reduce((s, c) => {
        const end = new Date(c.paidAt || c.approvedAt || c.createdAt).getTime()
        const start = new Date(c.createdAt).getTime()
        return s + Math.max(0, (end - start) / (1000 * 60 * 60 * 24))
      }, 0) / settled.length
    )
    return { total, inputsPending, inProgress, pendingAppr, approved, paid, netPayable, avgDays }
  }, [])

  // Status distribution
  const statusDist = React.useMemo(() => {
    const map = new Map<string, number>()
    FNF_CASES.forEach(c => map.set(c.status, (map.get(c.status) || 0) + 1))
    return Array.from(map.entries()).map(([name, value]) => ({
      name, value, color: STATUS_PIE_COLORS[name] || "#94a3b8",
    })).sort((a, b) => b.value - a.value)
  }, [])
  const statusTotal = statusDist.reduce((s, d) => s + d.value, 0)

  // Entity-wise FnF (horizontal bar)
  const entityDist = React.useMemo(() => {
    const map = new Map<string, { count: number; net: number }>()
    FNF_CASES.forEach(c => {
      const e = map.get(c.entity) || { count: 0, net: 0 }
      e.count += 1
      e.net += c.netPayable
      map.set(c.entity, e)
    })
    return Array.from(map.entries()).map(([name, v]) => ({
      name: name.replace("ACME ", "").replace(" Pvt Ltd", "").replace(" LLC", "").replace(" Inc", "").replace(" Pte Ltd", ""),
      count: v.count,
      net: v.net,
    })).sort((a, b) => b.count - a.count)
  }, [])

  // Exit type distribution
  const exitTypeDist = React.useMemo(() => {
    const map = new Map<string, number>()
    FNF_CASES.forEach(c => map.set(c.exitType, (map.get(c.exitType) || 0) + 1))
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [])
  const exitTypeTotal = exitTypeDist.reduce((s, d) => s + d.value, 0)
  const EXIT_TYPE_COLORS = ["#e11d48", "#f43f5e", "#ec4899", "#f472b6", "#be185d"]

  // Recent cases (last 5)
  const recentCases = React.useMemo(() => {
    return [...FNF_CASES]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [])

  // Upcoming settlement timeline: cases with LWD in future or pending approval/payment
  const upcoming = React.useMemo(() => {
    const now = Date.now()
    return [...FNF_CASES]
      .filter(c => {
        const lwd = new Date(c.lwd).getTime()
        return lwd >= now || c.status === "Pending Approval" || c.status === "Approved"
      })
      .sort((a, b) => new Date(a.lwd).getTime() - new Date(b.lwd).getTime())
      .slice(0, 6)
  }, [])

  const entityOptions = Array.from(new Set(FNF_CASES.map(c => c.entity)))
  const exitTypeOptions = Array.from(new Set(FNF_CASES.map(c => c.exitType)))
  const statusOptions = Array.from(new Set(FNF_CASES.map(c => c.status)))

  const handleRefresh = () => toast.success("FnF dashboard refreshed")
  const handleFilterApply = () => toast.info("Filters are demo-only in this view")

  const statCards: { label: string; value: React.ReactNode; icon: any; accent: Accent; sub?: string }[] = [
    { label: "Total FnF Cases",       value: stats.total,         icon: Wallet,        accent: "rose",    sub: "All-time" },
    { label: "Inputs Pending",        value: stats.inputsPending, icon: Inbox,         accent: "amber",   sub: "Awaiting inputs" },
    { label: "Calculation In Progress", value: stats.inProgress,  icon: Calculator,    accent: "cyan",    sub: "Being computed" },
    { label: "Pending Approval",      value: stats.pendingAppr,   icon: ShieldCheck,   accent: "rose",    sub: "Awaiting approver" },
    { label: "Approved",              value: stats.approved,      icon: BadgeCheck,    accent: "emerald", sub: "Ready to pay" },
    { label: "Paid",                  value: stats.paid,          icon: Coins,         accent: "teal",    sub: "Settled" },
    { label: "Total Net Payable",     value: formatCurrencyShort(stats.netPayable), icon: TrendingUp, accent: "pink", sub: "Across all cases" },
    { label: "Avg Settlement Time",   value: `${stats.avgDays}d`, icon: Clock,         accent: "slate",   sub: "Create → paid" },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-soft">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Full &amp; Final Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Real-time tracking of exit settlements — inputs, calculations, approvals, payments &amp; letters.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleRefresh} className="gap-1.5 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Filters bar */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-rose-500" />
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
            <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-700 dark:text-rose-400">Demo</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            <FilterSelect label="Entity" icon={Building2} placeholder="All entities" options={entityOptions} />
            <FilterSelect label="Exit Type" icon={UserMinus} placeholder="All exit types" options={exitTypeOptions} />
            <FilterSelect label="Status" icon={ShieldCheck} placeholder="All statuses" options={statusOptions} />
          </div>
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/40">
            <Button size="sm" variant="ghost" onClick={() => toast.info("Filters cleared")}>Clear</Button>
            <Button size="sm" onClick={handleFilterApply} className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
              <Filter className="h-3.5 w-3.5" /> Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3"
        variants={gridContainer}
        initial="hidden"
        animate="show"
      >
        {statCards.map((s) => (
          <motion.div key={s.label} variants={gridItem}>
            <StatCard label={s.label} value={s.value} icon={s.icon} accent={s.accent} sub={s.sub} />
          </motion.div>
        ))}
      </motion.div>

      {/* Row: Status donut + Monthly trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">FnF Status Breakdown</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Cases by current status</p>
            </div>
            {statusTotal === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No FnF cases recorded.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-48 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDist}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {statusDist.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold tabular-nums text-foreground">{statusTotal}</span>
                    <span className="text-[11px] text-muted-foreground">Total</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 w-full mt-3 max-h-44 overflow-y-auto scrollbar-thin pr-1">
                  {statusDist.map((d) => (
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

        <Card className="lg:col-span-2 border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Monthly FnF Payout Trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Number of FnF settlements processed per month</p>
              </div>
              <Badge variant="outline" className="border-rose-500/30 text-rose-700 dark:text-rose-400">
                <TrendingUp className="h-3 w-3 mr-1" /> 12 months
              </Badge>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTH_TREND} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  />
                  <Bar dataKey="value" name="FnF Cases" radius={[6, 6, 0, 0]} fill="#e11d48" maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row: Entity-wise + Exit type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Entity-wise FnF</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Case count &amp; net payable by entity</p>
              </div>
              <Badge variant="outline" className="border-rose-500/30 text-rose-700 dark:text-rose-400">
                {entityDist.length} entities
              </Badge>
            </div>
            <div className="space-y-3">
              {entityDist.map((e) => {
                const maxCount = Math.max(...entityDist.map(x => x.count), 1)
                const pct = (e.count / maxCount) * 100
                return (
                  <div key={e.name}>
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">{e.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="text-muted-foreground">{formatCurrencyShort(e.net)}</span>
                        <span className="font-semibold text-foreground tabular-nums">{e.count}</span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">Exit Type Distribution</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Cases grouped by exit reason</p>
            </div>
            {exitTypeTotal === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <UserMinus className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No exit types recorded.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {exitTypeDist.map((d, i) => {
                  const pct = (d.value / exitTypeTotal) * 100
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: EXIT_TYPE_COLORS[i % EXIT_TYPE_COLORS.length] }} />
                          <span className="text-xs font-medium text-foreground truncate">{d.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">{d.value} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: EXIT_TYPE_COLORS[i % EXIT_TYPE_COLORS.length] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row: Recent cases + Upcoming timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Recent FnF Cases</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Last 5 cases created</p>
              </div>
              <Badge variant="outline" className="border-rose-500/30 text-rose-700 dark:text-rose-400">
                {recentCases.length} shown
              </Badge>
            </div>
            <ScrollArea className="max-h-[420px] rounded-md">
              <div className="pr-2">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 sticky top-0">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employee</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exit Case</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Net Payable</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentCases.map((c: FnFCase) => (
                      <TableRow key={c.id} className="hover:bg-rose-500/5 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white", avatarColor(c.employeeId))}>
                              {initials(c.employeeName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{c.employeeName}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{c.employeeCode} · {c.designation}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <p className="font-medium text-foreground">{c.exitCaseId}</p>
                            <p className="text-muted-foreground">{c.exitType}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-rose-700 dark:text-rose-400 tabular-nums">
                            {formatCurrency(c.netPayable)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium border-0 text-[11px]", STATUS_COLORS[c.status] || "")}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Upcoming Settlement Timeline</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Cases needing attention next</p>
              </div>
              <Badge variant="outline" className="border-rose-500/30 text-rose-700 dark:text-rose-400">
                <CalendarDays className="h-3 w-3 mr-1" /> {upcoming.length}
              </Badge>
            </div>
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CalendarDays className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming settlements.</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[420px] rounded-md">
                <ol className="relative space-y-3 pr-2 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border/60">
                  {upcoming.map((c) => {
                    const isFuture = new Date(c.lwd).getTime() >= Date.now()
                    return (
                      <li key={c.id} className="relative flex gap-3 pl-0">
                        <div className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background border border-border/60 shadow-soft">
                          <CalendarDays className="h-4 w-4 text-rose-500" />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <p className="text-sm font-medium text-foreground truncate">{c.employeeName}</p>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                              LWD {formatDate(c.lwd)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <span className="text-xs text-muted-foreground truncate">{c.exitCaseId} · {c.exitType}</span>
                            <Badge variant="secondary" className={cn("font-medium border-0 text-[10px]", STATUS_COLORS[c.status] || "")}>
                              {c.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
                            <ArrowRight className="h-3 w-3" />
                            <span>Net payable: <span className="font-semibold text-rose-700 dark:text-rose-400">{formatCurrency(c.netPayable)}</span></span>
                            {isFuture && <span className="text-amber-600 dark:text-amber-400">· upcoming LWD</span>}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default FnFDashboardSection
