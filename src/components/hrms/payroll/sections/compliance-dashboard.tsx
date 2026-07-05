"use client"

// =============================================================
// Compliance Dashboard — Payroll / Compliance #1
// Emerald/teal theme. Charts + stats + deadlines + quick actions.
// =============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts"
import {
  ShieldCheck, LayoutDashboard, RefreshCw, Building2, FileText,
  AlertTriangle, IndianRupee, TrendingUp, CalendarDays,
  CheckCircle2, PiggyBank, Landmark, ArrowRight, HeartPulse,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import {
  formatCurrency, formatCurrencyShort, formatDate, initials, avatarColor,
  STATUS_COLORS,
} from "../shared"
import {
  COMPLIANCE_RULES, PF_RECORDS, ESI_RECORDS, PT_RECORDS, LWF_RECORDS,
  TDS_RECORDS, CHALLANS,
} from "../data"

// ---------- Accents ----------
type Accent = "emerald" | "teal" | "amber" | "rose" | "cyan" | "violet" | "slate" | "lime"
const ACCENTS: Record<Accent, { grad: string; text: string; ring: string; bg: string }> = {
  emerald: { grad: "from-emerald-500/15 to-emerald-500/5", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20", bg: "bg-emerald-500/10" },
  teal:    { grad: "from-teal-500/15 to-teal-500/5",     text: "text-teal-600 dark:text-teal-400",       ring: "ring-teal-500/20",    bg: "bg-teal-500/10" },
  amber:   { grad: "from-amber-500/15 to-amber-500/5",   text: "text-amber-600 dark:text-amber-400",     ring: "ring-amber-500/20",   bg: "bg-amber-500/10" },
  rose:    { grad: "from-rose-500/15 to-rose-500/5",     text: "text-rose-600 dark:text-rose-400",       ring: "ring-rose-500/20",    bg: "bg-rose-500/10" },
  cyan:    { grad: "from-cyan-500/15 to-cyan-500/5",     text: "text-cyan-600 dark:text-cyan-400",       ring: "ring-cyan-500/20",    bg: "bg-cyan-500/10" },
  violet:  { grad: "from-violet-500/15 to-violet-500/5", text: "text-violet-600 dark:text-violet-400",   ring: "ring-violet-500/20",  bg: "bg-violet-500/10" },
  slate:   { grad: "from-slate-500/15 to-slate-500/5",   text: "text-slate-600 dark:text-slate-400",     ring: "ring-slate-500/20",   bg: "bg-slate-500/10" },
  lime:    { grad: "from-lime-500/15 to-lime-500/5",     text: "text-lime-600 dark:text-lime-400",       ring: "ring-lime-500/20",    bg: "bg-lime-500/10" },
}

const gridContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }
const gridItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 220, damping: 22 } } }

// ---------- Stat card ----------
function StatTile({
  label, value, icon: Icon, accent, sub,
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  accent: Accent
  sub?: string
}) {
  const a = ACCENTS[accent]
  return (
    <Card className={cn("relative overflow-hidden border border-border/60 rounded-xl shadow-soft hover:shadow-card transition-all duration-200 bg-gradient-to-br", a.grad)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-semibold mt-1 text-foreground tabular-nums leading-none">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>}
          </div>
          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background/70 ring-1 backdrop-blur-sm", a.ring, a.text)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Component ----------
export function ComplianceDashboardSection() {
  // Derive stats
  const totalRules = COMPLIANCE_RULES.length
  const activeEntities = new Set(COMPLIANCE_RULES.map((r) => r.entity)).size
  const pfDue = PF_RECORDS.filter((r) => r.status !== "Filed").length
  const esiDue = ESI_RECORDS.filter((r) => r.status !== "Filed").length
  const ptDue = PT_RECORDS.filter((r) => r.status !== "Filed").length
  const tdsDue = TDS_RECORDS.filter((r) => r.status !== "Filed").length
  const overdueChallans = CHALLANS.filter((c) => c.status === "Overdue").length
  const totalLiability = CHALLANS.filter((c) => c.status !== "Paid").reduce((s, c) => s + c.amount, 0)

  // Status breakdown (donut)
  const all = [...PF_RECORDS, ...ESI_RECORDS, ...PT_RECORDS, ...LWF_RECORDS, ...TDS_RECORDS]
  const filed = all.filter((r) => r.status === "Filed").length
  const pending = all.filter((r) => r.status === "Pending").length
  const overdue = CHALLANS.filter((c) => c.status === "Overdue").length + overdueChallans
  const statusData = [
    { name: "Filed", value: filed, color: "#10b981" },
    { name: "Pending", value: pending, color: "#f59e0b" },
    { name: "Overdue", value: overdue, color: "#f43f5e" },
  ]
  const statusTotal = filed + pending + overdue

  // Monthly liability trend (last 6 months, simulate from challans)
  const monthlyTrend = React.useMemo(() => {
    const months: { month: string; liability: number; paid: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = d.toLocaleDateString("en-IN", { month: "short" })
      const factor = 1 - i * 0.04
      const baseLiability = 5200000 * factor
      const basePaid = i === 0 ? baseLiability * 0.55 : baseLiability * 0.95
      months.push({
        month: label,
        liability: Math.round(baseLiability),
        paid: Math.round(basePaid),
      })
    }
    // Inject real values for current month from pending challans
    const currPending = CHALLANS.filter((c) => c.status === "Pending").reduce((s, c) => s + c.amount, 0)
    const currPaid = CHALLANS.filter((c) => c.status === "Paid" && new Date(c.dueDate).getMonth() === new Date().getMonth()).reduce((s, c) => s + c.amount, 0)
    if (months[months.length - 1]) {
      months[months.length - 1].liability = currPending + currPaid || months[months.length - 1].liability
      months[months.length - 1].paid = currPaid || months[months.length - 1].paid
    }
    return months
  }, [])

  // Entity-wise liability (horizontal bar)
  const entityLiability = React.useMemo(() => {
    const map = new Map<string, number>()
    CHALLANS.forEach((c) => {
      map.set(c.entity, (map.get(c.entity) || 0) + c.amount)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name: name.replace("ACME ", "").replace(" Pvt Ltd", "").replace(" LLC", "").replace(" Inc", "").replace(" Pte Ltd", ""), value })).sort((a, b) => b.value - a.value).slice(0, 6)
  }, [])
  const maxEntityVal = Math.max(1, ...entityLiability.map((e) => e.value))

  // Upcoming deadlines (next 30 days)
  const now = Date.now()
  const upcoming = React.useMemo(() => {
    return CHALLANS
      .filter((c) => {
        const due = new Date(c.dueDate).getTime()
        return due >= now - 86400000 && due <= now + 30 * 86400000
      })
      .map((c) => {
        const days = Math.ceil((new Date(c.dueDate).getTime() - now) / 86400000)
        return { ...c, daysToDue: days }
      })
      .sort((a, b) => a.daysToDue - b.daysToDue)
  }, [now])

  const quickActions = [
    { label: "Generate PF Challan", icon: PiggyBank, accent: "emerald" as Accent, action: () => toast.success("PF challan generation started") },
    { label: "Generate ESI Challan", icon: HeartPulse, accent: "teal" as Accent, action: () => toast.success("ESI challan generation started") },
    { label: "Generate TDS Challan", icon: Landmark, accent: "cyan" as Accent, action: () => toast.success("TDS challan generation started") },
    { label: "File Return", icon: FileText, accent: "violet" as Accent, action: () => toast.success("Return filing workflow opened") },
  ]

  const handleRefresh = () => toast.success("Compliance dashboard refreshed")

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-primary-foreground shadow-soft">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Compliance Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Statutory compliance posture across PF, ESI, PT, LWF &amp; TDS — filings, liabilities and deadlines.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleRefresh} className="gap-1.5 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3"
        variants={gridContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={gridItem}><StatTile label="Compliance Rules" value={totalRules} icon={ShieldCheck} accent="emerald" sub="Across entities" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Active Entities" value={activeEntities} icon={Building2} accent="teal" sub="Multi-country" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="PF Filings Due" value={pfDue} icon={PiggyBank} accent="cyan" sub="Pending records" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="ESI Filings Due" value={esiDue} icon={HeartPulse} accent="violet" sub="Pending records" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="PT Filings Due" value={ptDue} icon={Landmark} accent="amber" sub="Pending records" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="TDS Filings Due" value={tdsDue} icon={FileText} accent="lime" sub="Pending records" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Overdue Challans" value={overdueChallans} icon={AlertTriangle} accent="rose" sub="Past due date" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Total Liability" value={formatCurrencyShort(totalLiability)} icon={IndianRupee} accent="emerald" sub="Outstanding" /></motion.div>
      </motion.div>

      {/* Charts row: donut + monthly bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status donut */}
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">Compliance Status Breakdown</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Filed vs Pending vs Overdue across all heads</p>
            </div>
            {statusTotal === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ShieldCheck className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No records.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-48 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                        {statusData.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold tabular-nums text-foreground">{statusTotal}</span>
                    <span className="text-[11px] text-muted-foreground">Total</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-y-1.5 w-full mt-3">
                  {statusData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-muted-foreground truncate flex-1">{d.name}</span>
                      <span className="font-semibold text-foreground tabular-nums">{d.value}</span>
                      <span className="text-muted-foreground tabular-nums">({((d.value / statusTotal) * 100).toFixed(0)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly liability trend (2/3) */}
        <Card className="lg:col-span-2 border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Monthly Liability Trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Last 6 months — total liability vs paid</p>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="h-3 w-3 mr-1" /> 6 months
              </Badge>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={(v) => formatCurrencyShort(v).replace("₹", "")} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={48} />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="liability" name="Total Liability" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paid" name="Paid" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entity-wise liability + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Entity-wise Compliance Liability</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Outstanding statutory liability per entity</p>
              </div>
              <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-400">
                <Building2 className="h-3 w-3 mr-1" /> {entityLiability.length} entities
              </Badge>
            </div>
            <div className="space-y-3">
              {entityLiability.map((e, i) => {
                const pct = (e.value / maxEntityVal) * 100
                const colors = ["#10b981", "#14b8a6", "#06b6d4", "#8b5cf6", "#f59e0b", "#f43f5e"]
                return (
                  <div key={e.name} className="group">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
                        <span className="text-sm font-medium text-foreground truncate">{e.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{formatCurrencyShort(e.value)}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: colors[i % colors.length] }}
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

        {/* Quick actions */}
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">One-click compliance operations</p>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {quickActions.map((a) => {
                const acc = ACCENTS[a.accent]
                return (
                  <button
                    key={a.label}
                    onClick={a.action}
                    className={cn(
                      "group flex items-center gap-3 w-full text-left rounded-xl border border-border/60 bg-card hover:bg-accent/50 p-3 transition-all",
                      "focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
                    )}
                  >
                    <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br", acc.grad, acc.text)}>
                      <a.icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{a.label}</p>
                      <p className="text-[11px] text-muted-foreground">Auto-calculate &amp; generate</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming deadlines */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Upcoming Compliance Deadlines</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Next 30 days — sorted by due date</p>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
              <CalendarDays className="h-3 w-3 mr-1" /> {upcoming.length} due
            </Badge>
          </div>
          <ScrollArea className="max-h-[460px] pr-2">
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mb-2" />
                <p className="text-sm text-muted-foreground">No deadlines in the next 30 days.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((c) => {
                  const typeColor: Record<string, string> = {
                    PF: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/15",
                    ESI: "text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-500/15",
                    PT: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15",
                    LWF: "text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-500/15",
                    TDS: "text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-500/15",
                  }
                  const isOverdue = c.daysToDue < 0
                  const isSoon = c.daysToDue >= 0 && c.daysToDue <= 7
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-soft transition-shadow",
                        isOverdue ? "border-rose-500/30 bg-rose-50/40 dark:bg-rose-500/5" : isSoon ? "border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/5" : "border-border/60",
                      )}
                    >
                      <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg font-semibold text-xs", typeColor[c.challanType])}>
                        {c.challanType}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground truncate">{c.challanType} Challan — {c.payrollMonth}</p>
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_COLORS[c.status] || "bg-muted text-muted-foreground")}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{c.entity} · {c.employeeCount} employees</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground tabular-nums">{formatCurrencyShort(c.amount)}</p>
                        <p className={cn("text-[11px] font-medium", isOverdue ? "text-rose-600 dark:text-rose-400" : isSoon ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                          {isOverdue ? `${Math.abs(c.daysToDue)}d overdue` : c.daysToDue === 0 ? "Due today" : `Due in ${c.daysToDue}d`}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// Local helper icon (HeartPulse) — imported above
export default ComplianceDashboardSection
