"use client"

// ============================================================================
//  ArrearDashboardSection — Arrear menu #1 (Dashboard)
//  ----------------------------------------------------------------------------
//  Amber/orange themed dashboard with stats row, charts (type distribution
//  donut, monthly trend bars, entity-wise horizontal bars, status breakdown),
//  recent arrears table (last 5) and an upcoming payout month summary card.
// ============================================================================

import * as React from "react"
import { useMemo } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts"
import {
  LayoutDashboard, RefreshCw, TrendingUp, TrendingDown, Wallet,
  Clock, CheckCircle2, XCircle, IndianRupee, Scale, ArrowRight,
  CalendarClock, Layers, Building2, PieChart as PieIcon, BarChart3,
  ArrowDownToLine, ArrowUpFromLine,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Avatar, AvatarFallback,
} from "@/components/ui/avatar"

import {
  ARREAR_CASES,
} from "../data"
import {
  ArrearCase, ArrearType, STATUS_COLORS,
  formatCurrency, formatCurrencyShort, formatDate, initials, avatarColor,
} from "../shared"

// ---------- Constants ----------
const ARREAR_TYPE_COLORS: Record<ArrearType, string> = {
  "Salary Revision":         "#f59e0b",
  "LOP Reversal":            "#fb923c",
  "Attendance Correction":   "#f97316",
  "Bonus":                   "#fbbf24",
  "Incentive":               "#fdba74",
  "Manual":                  "#ea580c",
  "Component Change":        "#fcd34d",
  "Structure Change":        "#d97706",
}

const ARREAR_TYPES: ArrearType[] = [
  "Salary Revision", "LOP Reversal", "Attendance Correction", "Bonus",
  "Incentive", "Manual", "Component Change", "Structure Change",
]

const gridContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const gridItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 220, damping: 22 } },
}

// ---------- Stat card ----------
function StatCard({
  label, value, icon: Icon, sub, accent = "amber", trend,
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  sub?: string
  accent?: "amber" | "orange" | "emerald" | "rose" | "teal" | "slate"
  trend?: { value: string; up: boolean }
}) {
  const accents: Record<string, string> = {
    amber:   "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    orange:  "from-orange-500/15 to-orange-500/5 text-orange-600 dark:text-orange-400 ring-orange-500/20",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    rose:    "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400 ring-rose-500/20",
    teal:    "from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-400 ring-teal-500/20",
    slate:   "from-slate-500/15 to-slate-500/5 text-slate-600 dark:text-slate-400 ring-slate-500/20",
  }
  const cls = accents[accent] || accents.amber
  return (
    <Card className="relative overflow-hidden border border-border/60 rounded-xl shadow-soft hover:shadow-card transition-all">
      <CardContent className="p-4 sm:p-5">
        <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", cls)} />
        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {label}
            </p>
            <p className="text-xl sm:text-2xl font-semibold mt-1 text-foreground tabular-nums leading-none">
              {value}
            </p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>}
            {trend && (
              <div className={cn(
                "inline-flex items-center gap-1 mt-2 text-[11px] font-medium",
                trend.up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
              )}>
                {trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{trend.value}</span>
              </div>
            )}
          </div>
          <div className={cn(
            "relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background/70 ring-1 backdrop-blur-sm",
            cls,
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Component ----------
export function ArrearDashboardSection() {
  // ---------- Derived data ----------
  const stats = useMemo(() => {
    const total = ARREAR_CASES.length
    const pendingApproval = ARREAR_CASES.filter(a => a.status === "Pending Approval").length
    const approved = ARREAR_CASES.filter(a => a.status === "Approved").length
    const paid = ARREAR_CASES.filter(a => a.status === "Paid").length
    const cancelled = ARREAR_CASES.filter(a => a.status === "Cancelled").length
    const totalArrearAmount = ARREAR_CASES.reduce((s, a) => s + a.arrearAmount, 0)
    const totalRecovery = ARREAR_CASES.reduce((s, a) => s + a.recoveryAmount, 0)
    const netArrear = totalArrearAmount - totalRecovery
    return { total, pendingApproval, approved, paid, cancelled, totalArrearAmount, totalRecovery, netArrear }
  }, [])

  // type distribution
  const typeDist = useMemo(() => {
    const map = new Map<ArrearType, number>()
    ARREAR_CASES.forEach(a => map.set(a.arrearType, (map.get(a.arrearType) || 0) + 1))
    return ARREAR_TYPES
      .map(t => ({ name: t, value: map.get(t) || 0, color: ARREAR_TYPE_COLORS[t] }))
      .filter(d => d.value > 0)
  }, [])
  const typeTotal = typeDist.reduce((s, d) => s + d.value, 0)

  // status breakdown
  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    ARREAR_CASES.forEach(a => map.set(a.status, (map.get(a.status) || 0) + 1))
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [])

  // entity-wise (horizontal bar)
  const entityDist = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>()
    ARREAR_CASES.forEach(a => {
      const cur = map.get(a.entity) || { count: 0, amount: 0 }
      cur.count += 1
      cur.amount += a.netArrear
      map.set(a.entity, cur)
    })
    return Array.from(map.entries()).map(([name, v]) => ({
      name, count: v.count, amount: v.amount,
    })).sort((a, b) => b.amount - a.amount)
  }, [])

  // monthly trend (bar) — by createdAt month
  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { arrear: number; recovery: number }>()
    ARREAR_CASES.forEach(a => {
      const d = new Date(a.createdAt)
      const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
      const cur = map.get(key) || { arrear: 0, recovery: 0 }
      cur.arrear += a.arrearAmount
      cur.recovery += a.recoveryAmount
      map.set(key, cur)
    })
    return Array.from(map.entries()).map(([month, v]) => ({
      month, arrear: v.arrear, recovery: v.recovery, net: v.arrear - v.recovery,
    }))
  }, [])

  // recent 5 arrears (by createdAt desc)
  const recent = useMemo(() => {
    return [...ARREAR_CASES]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [])

  // upcoming payout month summary
  const upcomingPayout = useMemo(() => {
    const map = new Map<string, { count: number; amount: number; pending: number }>()
    ARREAR_CASES.forEach(a => {
      if (a.status === "Paid" || a.status === "Cancelled") return
      const cur = map.get(a.payoutMonth) || { count: 0, amount: 0, pending: 0 }
      cur.count += 1
      cur.amount += a.netArrear
      if (a.status === "Pending Approval" || a.status === "Approved") cur.pending += 1
      map.set(a.payoutMonth, cur)
    })
    return Array.from(map.entries()).map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
  }, [])

  const maxEntityAmount = Math.max(1, ...entityDist.map(d => d.amount))
  const maxStatusCount = Math.max(1, ...statusBreakdown.map(d => d.value))

  const handleRefresh = () => toast.success("Dashboard refreshed")

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-soft">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">
              Arrear Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Centralized view of all arrear cases — salary revisions, LOP reversals, manual adjustments,
              approvals and payout pipeline.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={handleRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3"
        variants={gridContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={gridItem}>
          <StatCard label="Total Arrears" value={stats.total} icon={Layers} accent="amber" sub="All cases" />
        </motion.div>
        <motion.div variants={gridItem}>
          <StatCard label="Pending Approval" value={stats.pendingApproval} icon={Clock} accent="amber" sub="Awaiting action" />
        </motion.div>
        <motion.div variants={gridItem}>
          <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} accent="emerald" sub="Ready to pay" />
        </motion.div>
        <motion.div variants={gridItem}>
          <StatCard label="Paid" value={stats.paid} icon={Wallet} accent="teal" sub="Settled" />
        </motion.div>
        <motion.div variants={gridItem}>
          <StatCard label="Cancelled" value={stats.cancelled} icon={XCircle} accent="rose" sub="Void" />
        </motion.div>
        <motion.div variants={gridItem}>
          <StatCard label="Total Arrear Amount" value={formatCurrencyShort(stats.totalArrearAmount)} icon={IndianRupee} accent="orange" sub="Gross arrear" />
        </motion.div>
        <motion.div variants={gridItem}>
          <StatCard label="Total Recovery" value={formatCurrencyShort(stats.totalRecovery)} icon={TrendingDown} accent="rose" sub="Negative arrear" />
        </motion.div>
        <motion.div variants={gridItem}>
          <StatCard label="Net Arrear" value={formatCurrencyShort(stats.netArrear)} icon={Scale} accent="emerald" sub="Net payable" trend={{ value: "vs last cycle", up: true }} />
        </motion.div>
      </motion.div>

      {/* Charts row: type donut + status breakdown + entity-wise horizontal bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Type distribution donut */}
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-amber-500" /> Arrear Type Distribution
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">By case count</p>
              </div>
              <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400">
                {typeDist.length} types
              </Badge>
            </div>
            {typeTotal === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Layers className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No arrears recorded.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-44 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeDist}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {typeDist.map(d => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold tabular-nums text-foreground">{typeTotal}</span>
                    <span className="text-[11px] text-muted-foreground">Total</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 w-full mt-3 max-h-36 overflow-y-auto scrollbar-thin pr-1">
                  {typeDist.map(d => (
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

        {/* Status breakdown */}
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-500" /> Status Breakdown
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Cases by lifecycle status</p>
            </div>
            {statusBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Layers className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No data.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {statusBreakdown.map(s => {
                  const pct = (s.value / maxStatusCount) * 100
                  return (
                    <div key={s.name} className="group">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="text-sm font-medium text-foreground truncate">{s.name}</span>
                        <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{s.value}</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
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

        {/* Entity-wise horizontal bars */}
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-500" /> Entity-wise Arrear
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Net arrear amount by entity</p>
            </div>
            {entityDist.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Building2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No data.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entityDist.map(e => {
                  const pct = (e.amount / maxEntityAmount) * 100
                  return (
                    <div key={e.name} className="group">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="text-sm font-medium text-foreground truncate">{e.name}</span>
                        <div className="flex items-baseline gap-1.5 shrink-0">
                          <span className="text-sm font-semibold text-foreground tabular-nums">{formatCurrencyShort(e.amount)}</span>
                          <span className="text-[10px] text-muted-foreground">· {e.count} cases</span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
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

      {/* Monthly trend bar chart */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-500" /> Monthly Arrear Trend
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Arrear vs recovery by month</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Arrear
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Recovery
              </span>
            </div>
          </div>
          {monthlyTrend.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No trend data.</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 220)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="oklch(0.6 0.02 220)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.6 0.02 220)" tickFormatter={(v) => formatCurrencyShort(v).replace("₹", "")} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid oklch(0.92 0.01 220)" }}
                    formatter={(v: number, name: string) => [formatCurrency(v), name]}
                  />
                  <Bar dataKey="arrear" name="Arrear" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="recovery" name="Recovery" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent arrears + Upcoming payout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent arrears table (2/3) */}
        <Card className="lg:col-span-2 border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Recent Arrears</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Latest 5 arrear cases</p>
              </div>
              <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-400">
                {recent.length} shown
              </Badge>
            </div>
            <ScrollArea className="max-h-96 w-full rounded-lg border border-border/40">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
                  <TableRow className="hover:bg-muted/60">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Employee</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Payout</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((a: ArrearCase) => (
                    <TableRow key={a.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-500/5">
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={cn("text-[10px] text-white font-semibold", avatarColor(a.employeeId))}>
                              {initials(a.employeeName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{a.employeeName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{a.employeeCode} · {a.department}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="h-2 w-2 rounded-full" style={{ background: ARREAR_TYPE_COLORS[a.arrearType] }} />
                          {a.arrearType}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "text-sm font-semibold tabular-nums",
                          a.netArrear < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground",
                        )}>
                          {formatCurrency(a.netArrear)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.payoutMonth}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_COLORS[a.status] || "bg-muted text-muted-foreground")}>
                          {a.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Upcoming payout month summary (1/3) */}
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-amber-500" /> Upcoming Payout Months
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Pending & approved arrears by payout cycle</p>
            </div>
            {upcomingPayout.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CalendarClock className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming payouts scheduled.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingPayout.map(p => (
                  <div key={p.month} className="rounded-lg border border-border/60 p-3 hover:border-amber-500/40 transition-colors bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-500/5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{p.month}</p>
                        <p className="text-[11px] text-muted-foreground">{p.count} case{p.count !== 1 ? "s" : ""} · {p.pending} pending</p>
                      </div>
                      <div className="shrink-0 grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <IndianRupee className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Net payout</span>
                      <span className="text-base font-semibold text-foreground tabular-nums">{formatCurrency(p.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-border/40">
              <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => toast.info("Navigate to Arrear Payment to process payouts")}>
                <ArrowRight className="h-3.5 w-3.5" /> Go to Payout Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick links footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Arrear Inputs", icon: ArrowDownToLine, desc: "Capture arrear-eligible inputs" },
          { label: "Arrear Calculation", icon: ArrowUpFromLine, desc: "Compute per-month breakdown" },
          { label: "Approval Queue", icon: CheckCircle2, desc: "Review pending cases" },
          { label: "Process Payments", icon: Wallet, desc: "Batch-pay approved arrears" },
        ].map(q => (
          <button
            key={q.label}
            onClick={() => toast.info(`Navigate to ${q.label}`)}
            className="group text-left rounded-xl border border-border/60 bg-card p-4 hover:border-amber-500/40 hover:shadow-card transition-all"
          >
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20 mb-2">
              <q.icon className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-foreground">{q.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{q.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default ArrearDashboardSection
