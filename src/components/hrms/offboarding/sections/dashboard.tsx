"use client"

// =============================================================
// Offboarding Dashboard (spec section #3) — Task ID 2a
// Tracking & summary view. Rose theme.
// =============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import {
  LayoutDashboard, UserMinus, Users, Inbox, ShieldCheck, Clock,
  CalendarDays, ClipboardCheck, AlertTriangle, Package, Lock,
  MessageSquare, Wallet, FileText, UserX, Ban, Skull, AlertOctagon,
  Layers, Activity, RefreshCw, Filter, Building2, Briefcase,
  ArrowRightLeft, Mail, CheckCircle2,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import {
  OffboardingLog, ExitCase, DEFAULT_EXIT_STAGES,
  EXIT_TYPE_COLORS, timeAgo,
} from "../shared"
import {
  getDashboardStats, OFFBOARDING_LOGS, EXIT_CASES,
} from "../data"

// ---------- Color palette helpers ----------
const ACCENT_MAP: Record<string, { grad: string; text: string; ring: string; bg: string }> = {
  rose:     { grad: "from-rose-500/15 to-rose-500/5",     text: "text-rose-600 dark:text-rose-400",       ring: "ring-rose-500/20",     bg: "bg-rose-500/10" },
  amber:    { grad: "from-amber-500/15 to-amber-500/5",   text: "text-amber-600 dark:text-amber-400",     ring: "ring-amber-500/20",    bg: "bg-amber-500/10" },
  cyan:     { grad: "from-cyan-500/15 to-cyan-500/5",     text: "text-cyan-600 dark:text-cyan-400",       ring: "ring-cyan-500/20",     bg: "bg-cyan-500/10" },
  slate:    { grad: "from-slate-500/15 to-slate-500/5",   text: "text-slate-600 dark:text-slate-400",     ring: "ring-slate-500/20",    bg: "bg-slate-500/10" },
  violet:   { grad: "from-violet-500/15 to-violet-500/5", text: "text-violet-600 dark:text-violet-400",   ring: "ring-violet-500/20",   bg: "bg-violet-500/10" },
  fuchsia:  { grad: "from-fuchsia-500/15 to-fuchsia-500/5",text: "text-fuchsia-600 dark:text-fuchsia-400", ring: "ring-fuchsia-500/20",  bg: "bg-fuchsia-500/10" },
  teal:     { grad: "from-teal-500/15 to-teal-500/5",     text: "text-teal-600 dark:text-teal-400",       ring: "ring-teal-500/20",     bg: "bg-teal-500/10" },
  emerald:  { grad: "from-emerald-500/15 to-emerald-500/5",text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20",  bg: "bg-emerald-500/10" },
  orange:   { grad: "from-orange-500/15 to-orange-500/5", text: "text-orange-600 dark:text-orange-400",   ring: "ring-orange-500/20",   bg: "bg-orange-500/10" },
  pink:     { grad: "from-pink-500/15 to-pink-500/5",     text: "text-pink-600 dark:text-pink-400",       ring: "ring-pink-500/20",     bg: "bg-pink-500/10" },
}
type Accent = keyof typeof ACCENT_MAP

// ---------- Framer-motion stagger ----------
const gridContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
}
const gridItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 220, damping: 22 } },
}

// ---------- Stat card ----------
function DashboardStatCard({
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

// ---------- Log activity icon mapping ----------
const LOG_TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "Exit Case Logs": UserMinus,
  "Resignation Logs": Inbox,
  "Workflow Logs": Layers,
  "Stage Movement Logs": ArrowRightLeft,
  "Clearance Logs": ClipboardCheck,
  "Asset Recovery Logs": Package,
  "IT Revocation Logs": Lock,
  "FnF Logs": Wallet,
  "Document / Letter Logs": FileText,
  "Email Logs": Mail,
  "Approval Logs": CheckCircle2,
  "Employee Status Logs": UserX,
  "Alumni Logs": Users,
  "System Error Logs": AlertOctagon,
}
function logIcon(logType: string) {
  return LOG_TYPE_ICON[logType] || Activity
}

const LOG_STATUS_STYLES: Record<string, string> = {
  Success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Error:   "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Info:    "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
}

// ---------- Filter dropdown component (non-functional UI) ----------
function FilterSelect({
  label, icon: Icon, placeholder, options,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  placeholder: string
  options: string[]
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[150px]">
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

// ---------- Component ----------
export function DashboardSection() {
  const stats = React.useMemo(() => getDashboardStats(), [])
  const recentLogs = React.useMemo(
    () => [...OFFBOARDING_LOGS]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8),
    [],
  )

  // Stage distribution (count active exit cases per stage)
  const stageDist = React.useMemo(() => {
    const map = new Map<string, number>()
    DEFAULT_EXIT_STAGES.forEach((s) => map.set(s.id, 0))
    EXIT_CASES.forEach((c: ExitCase) => {
      map.set(c.currentStageId, (map.get(c.currentStageId) || 0) + 1)
    })
    return DEFAULT_EXIT_STAGES.map((s) => ({
      id: s.id, name: s.name, code: s.code, color: s.color,
      order: s.order, count: map.get(s.id) || 0,
      isInitial: s.isInitial, isFinal: s.isFinal,
    })).filter((s) => s.count > 0).sort((a, b) => a.order - b.order)
  }, [])
  const maxStageCount = Math.max(1, ...stageDist.map((s) => s.count))

  // Exit type distribution (donut)
  const exitTypeDist = React.useMemo(() => {
    const map = new Map<string, number>()
    EXIT_CASES.forEach((c) => {
      map.set(c.exitType, (map.get(c.exitType) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, value]) => ({
      name, value, color: EXIT_TYPE_COLORS[name] || "#64748b",
    })).sort((a, b) => b.value - a.value)
  }, [])
  const exitTypeTotal = exitTypeDist.reduce((s, d) => s + d.value, 0)

  // 18 stat cards per spec
  const statCards: { label: string; value: number; icon: any; accent: Accent; sub?: string }[] = [
    { label: "Active Exit Cases",          value: stats.activeCases,            icon: UserMinus,      accent: "rose",    sub: "In progress" },
    { label: "Resignation Requests Pending", value: stats.pendingResignations,  icon: Inbox,          accent: "amber",   sub: "Awaiting action" },
    { label: "Manager Approval Pending",   value: stats.pendingManagerApproval, icon: ShieldCheck,    accent: "violet",  sub: "Reporting mgr" },
    { label: "HR Approval Pending",        value: stats.pendingHrApproval,      icon: ShieldCheck,    accent: "fuchsia", sub: "HR review" },
    { label: "Employees in Notice Period", value: stats.noticePeriod,           icon: Clock,          accent: "amber",   sub: "Serving notice" },
    { label: "Last Working Day Today",     value: stats.lwdToday,               icon: CalendarDays,   accent: "cyan",    sub: "Exiting today" },
    { label: "Clearance Pending",          value: stats.clearancePending,       icon: ClipboardCheck, accent: "orange",  sub: "In progress" },
    { label: "Clearance Overdue",          value: stats.clearanceOverdue,       icon: AlertTriangle,  accent: "rose",    sub: "Past SLA" },
    { label: "Asset Recovery Pending",     value: stats.assetPending,           icon: Package,        accent: "teal",    sub: "Awaiting return" },
    { label: "IT Access Revocation Pending", value: stats.itPending,            icon: Lock,           accent: "pink",    sub: "To be revoked" },
    { label: "Exit Interview Pending",     value: stats.exitInterviewPending,   icon: MessageSquare,  accent: "violet",  sub: "Not yet done" },
    { label: "FnF Pending",                value: stats.fnfPending,             icon: Wallet,         accent: "emerald", sub: "Not settled" },
    { label: "Exit Letters Pending",       value: stats.letterPending,          icon: FileText,       accent: "cyan",    sub: "Not generated" },
    { label: "Exited This Month",          value: stats.exitedThisMonth,        icon: UserX,          accent: "slate",   sub: "Current month" },
    { label: "Withdrawn Resignations",     value: stats.withdrawn,              icon: Ban,            accent: "slate",   sub: "Cancelled" },
    { label: "Terminated Employees",       value: stats.terminated,             icon: Skull,          accent: "rose",    sub: "Involuntary" },
    { label: "High-Risk Exits",            value: stats.highRisk,               icon: AlertOctagon,   accent: "rose",    sub: "Need attention" },
    { label: "Total Cases",                value: stats.totalCases,             icon: Layers,         accent: "rose",    sub: "All-time" },
  ]

  const handleRefresh = () => toast.success("Dashboard refreshed")
  const handleFilterApply = () => toast.info("Filters are demo-only in this view")

  // Filter options (UI-only)
  const entityOptions = Array.from(new Set(EXIT_CASES.map((c) => c.entity)))
  const deptOptions = Array.from(new Set(EXIT_CASES.map((c) => c.department)))
  const exitTypeOptions = Array.from(new Set(EXIT_CASES.map((c) => c.exitType)))
  const exitReasonOptions = Array.from(new Set(EXIT_CASES.map((c) => c.exitReason)))
  const managerOptions = Array.from(new Set(EXIT_CASES.map((c) => c.reportingManager)))
  const hrOwnerOptions = Array.from(new Set(EXIT_CASES.map((c) => c.hrOwner)))
  const exitStatusOptions = ["Active", "On Hold", "Exited", "Withdrawn", "Cancelled", "Draft"]
  const clearanceStatusOptions = ["Not Started", "Pending", "In Progress", "Completed", "Overdue", "Waived"]
  const fnfStatusOptions = ["Not Started", "Draft", "Inputs Pending", "Calculated", "Under Review", "Approved", "Paid", "Closed", "On Hold"]

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-rose text-primary-foreground shadow-soft">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Offboarding Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Real-time tracking of the exit pipeline — clearances, asset recovery, IT revocation, FnF &amp; letters.
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
            <FilterSelect label="Department" icon={Briefcase} placeholder="All departments" options={deptOptions} />
            <FilterSelect label="Exit Type" icon={UserMinus} placeholder="All exit types" options={exitTypeOptions} />
            <FilterSelect label="Exit Reason" icon={Layers} placeholder="All reasons" options={exitReasonOptions} />
            <FilterSelect label="Manager" icon={Users} placeholder="All managers" options={managerOptions} />
            <FilterSelect label="HR Owner" icon={ShieldCheck} placeholder="All HR owners" options={hrOwnerOptions} />
            <FilterSelect label="Exit Status" icon={Activity} placeholder="All statuses" options={exitStatusOptions} />
            <FilterSelect label="Clearance Status" icon={ClipboardCheck} placeholder="All statuses" options={clearanceStatusOptions} />
            <FilterSelect label="FnF Status" icon={Wallet} placeholder="All statuses" options={fnfStatusOptions} />
          </div>
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/40">
            <Button size="sm" variant="ghost" onClick={() => toast.info("Filters cleared")}>Clear</Button>
            <Button size="sm" onClick={handleFilterApply} className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
              <Filter className="h-3.5 w-3.5" /> Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards grid — 18 cards, 2 / 3 / 6 / 9 cols */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-9 gap-3"
        variants={gridContainer}
        initial="hidden"
        animate="show"
      >
        {statCards.map((s) => (
          <motion.div key={s.label} variants={gridItem}>
            <DashboardStatCard
              label={s.label}
              value={s.value}
              icon={s.icon}
              accent={s.accent}
              sub={s.sub}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Row: Stage Distribution (2/3) + Exit Type Donut (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stage Distribution */}
        <Card className="lg:col-span-2 border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Stage Distribution</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Exit cases currently in each pipeline stage</p>
              </div>
              <Badge variant="outline" className="border-rose-500/30 text-rose-700 dark:text-rose-400">
                {stageDist.length} active stages
              </Badge>
            </div>
            {stageDist.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Layers className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No active exit cases in any stage.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stageDist.map((stage) => {
                  const pct = (stage.count / maxStageCount) * 100
                  return (
                    <div key={stage.id} className="group">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: stage.color }} />
                          <span className="text-sm font-medium text-foreground truncate">{stage.name}</span>
                          {(stage.isInitial || stage.isFinal) && (
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60 shrink-0">
                              {stage.isInitial ? "· initial" : stage.isFinal ? "· final" : ""}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                          {stage.count}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: stage.color }}
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

        {/* Exit Type Distribution donut */}
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">Exit Type Distribution</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Breakdown of exit cases by type</p>
            </div>
            {exitTypeTotal === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <UserMinus className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No exit cases recorded.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-48 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={exitTypeDist}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {exitTypeDist.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold tabular-nums text-foreground">{exitTypeTotal}</span>
                    <span className="text-[11px] text-muted-foreground">Total</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 w-full mt-3 max-h-44 overflow-y-auto scrollbar-thin pr-1">
                  {exitTypeDist.map((d) => (
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
      </div>

      {/* Recent Activity */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Latest 8 audit-log events across the offboarding pipeline</p>
            </div>
            <Badge variant="outline" className="border-rose-500/30 text-rose-700 dark:text-rose-400">
              <Activity className="h-3 w-3 mr-1" /> {recentLogs.length} shown
            </Badge>
          </div>
          {recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            </div>
          ) : (
            <div className="relative max-h-[28rem] overflow-y-auto scrollbar-thin pr-1">
              <ol className="relative space-y-3 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border/60">
                {recentLogs.map((log: OffboardingLog) => {
                  const Icon = logIcon(log.logType)
                  const statusCls = LOG_STATUS_STYLES[log.status] || "bg-muted text-muted-foreground"
                  return (
                    <li key={log.id} className="relative flex gap-3 pl-0">
                      <div className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background border border-border/60 shadow-soft">
                        <Icon className="h-4 w-4 text-rose-500" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">
                            <span className="text-muted-foreground">{log.logType}:</span>{" "}
                            <span className="text-foreground">{log.actionType}</span>
                          </p>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {timeAgo(log.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          {log.employeeName && (
                            <span className="text-xs text-muted-foreground truncate">
                              · {log.employeeName}
                              {log.exitCaseId && <span className="opacity-70"> ({log.exitCaseId})</span>}
                            </span>
                          )}
                          {log.performedBy && (
                            <span className="text-xs text-muted-foreground truncate">
                              by <span className="font-medium text-foreground/80">{log.performedBy}</span>
                              {log.role && <span className="opacity-70"> ({log.role})</span>}
                            </span>
                          )}
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", statusCls)}>
                            {log.status}
                          </span>
                        </div>
                        {log.remarks && (
                          <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{log.remarks}</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardSection
