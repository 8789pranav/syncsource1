"use client"

// =============================================================
// Onboarding Dashboard (spec section #3)
// Task ID: 8-A — tracking & summary view (no operations)
// =============================================================

import * as React from "react"
import { motion } from "framer-motion"
import {
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
} from "recharts"
import {
  LayoutDashboard, Users, UserPlus, PlayCircle, Send, AlertTriangle,
  ClipboardList, CheckCircle2, UserMinus, CalendarDays, CalendarRange,
  Workflow as WorkflowIcon, FileText, ListChecks, Mail, RefreshCw,
  ArrowRightLeft, ShieldCheck, Settings, UserCheck, Inbox, Activity,
  CircleAlert, Gauge,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  PageHeader, EmptyState, SectionCard,
} from "@/components/hrms/ui"
import {
  useFetch, timeAgo, slaStatus,
} from "@/components/hrms/onboarding/shared"

// ---------- Types (API contract) ----------
interface DashboardCards {
  totalCandidates: number
  candidatesToday: number
  onboardingInitiated: number
  inviteSent: number
  completedOnboarding: number
  droppedCandidates: number
  joiningToday: number
  joiningThisWeek: number
  slaBreached: number
  overdueTasks: number
  activeWorkflows: number
  totalStages: number
  documentsCount: number
  checklistsCount: number
  emailsCount: number
}
interface SlaBreach {
  id: string
  candidateName: string
  designation?: string | null
  stageName?: string | null
  stageColor?: string | null
  enteredAt?: string | null
  slaDays?: number | null
}
interface StageDistItem {
  id: string
  name: string
  color: string
  order: number
  stageType: string
  count: number
}
interface TrendItem { date: string; label: string; count: number }
interface WorkflowDistItem {
  id: string
  name: string
  color: string
  count: number
}
interface PriorityDistItem { priority: string; count: number }
interface ActivityLog {
  id: string
  logType: string
  candidateName?: string | null
  actionType: string
  performedByName?: string | null
  role?: string | null
  status: string
  createdAt: string
  remarks?: string | null
}
interface DashboardData {
  cards: DashboardCards
  slaBreaches: SlaBreach[]
  stageDistribution: StageDistItem[]
  trend7d: TrendItem[]
  workflowDistribution: WorkflowDistItem[]
  priorityDistribution: PriorityDistItem[]
  recentActivity: ActivityLog[]
  logsToday: number
}

// ---------- Color helpers ----------
/** Allowed-palette accent map for the 14 stat cards. NO indigo/blue. */
const ACCENT_MAP: Record<string, { grad: string; text: string; ring: string }> = {
  emerald: { grad: "from-emerald-500/15 to-emerald-500/5", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20" },
  teal: { grad: "from-teal-500/15 to-teal-500/5", text: "text-teal-600 dark:text-teal-400", ring: "ring-teal-500/20" },
  cyan: { grad: "from-cyan-500/15 to-cyan-500/5", text: "text-cyan-600 dark:text-cyan-400", ring: "ring-cyan-500/20" },
  amber: { grad: "from-amber-500/15 to-amber-500/5", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/20" },
  rose: { grad: "from-rose-500/15 to-rose-500/5", text: "text-rose-600 dark:text-rose-400", ring: "ring-rose-500/20" },
  slate: { grad: "from-slate-500/15 to-slate-500/5", text: "text-slate-600 dark:text-slate-400", ring: "ring-slate-500/20" },
  fuchsia: { grad: "from-fuchsia-500/15 to-fuchsia-500/5", text: "text-fuchsia-600 dark:text-fuchsia-400", ring: "ring-fuchsia-500/20" },
  lime: { grad: "from-lime-500/15 to-lime-500/5", text: "text-lime-600 dark:text-lime-400", ring: "ring-lime-500/20" },
  orange: { grad: "from-orange-500/15 to-orange-500/5", text: "text-orange-600 dark:text-orange-400", ring: "ring-orange-500/20" },
  violet: { grad: "from-violet-500/15 to-violet-500/5", text: "text-violet-600 dark:text-violet-400", ring: "ring-violet-500/20" },
  pink: { grad: "from-pink-500/15 to-pink-500/5", text: "text-pink-600 dark:text-pink-400", ring: "ring-pink-500/20" },
}

/** Convert hex to rgba with alpha — used for stage/workflow bar fills & glows. */
function hexToRgba(hex: string | null | undefined, alpha: number): string {
  let h = (hex || "#64748b").replace("#", "").trim()
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  if (h.length !== 6) return `rgba(100,116,139,${alpha})`
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ---------- Stat card (local, mirrors hrms/ui StatCard but supports full palette) ----------
function DashboardStatCard({
  label, value, icon: Icon, accent, sub,
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  accent: keyof typeof ACCENT_MAP
  sub?: string
}) {
  const a = ACCENT_MAP[accent] || ACCENT_MAP.emerald
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

// ---------- Framer-motion stagger ----------
const gridContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const gridItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 220, damping: 22 } },
}

// ---------- Chart tooltip ----------
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs shadow-card">
      {label && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ---------- Activity log icon mapping ----------
const LOG_TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "Candidate Activity": UserPlus,
  "Workflow": WorkflowIcon,
  "Stage Movement": ArrowRightLeft,
  "Document": FileText,
  "Email": Mail,
  "Checklist": ListChecks,
  "Approval": ShieldCheck,
  "Verification": ShieldCheck,
  "Employee Conversion": UserCheck,
  "System": Settings,
  "Error": CircleAlert,
}
function logIcon(logType: string) {
  return LOG_TYPE_ICON[logType] || Activity
}

const LOG_STATUS_STYLES: Record<string, string> = {
  Success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Failed: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Error: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

// ---------- Priority donut config ----------
const PRIORITY_META: { key: string; color: string }[] = [
  { key: "Low", color: "#64748b" },
  { key: "Medium", color: "#06b6d4" },
  { key: "High", color: "#f59e0b" },
  { key: "Critical", color: "#f43f5e" },
]

// ---------- Component ----------
export function DashboardSection() {
  const { data, loading, error, reload } = useFetch<DashboardData>("/api/onboarding-dashboard")

  if (loading) return <DashboardSkeleton />
  if (error || !data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load dashboard"
        description={error || "Something went wrong while fetching onboarding analytics."}
        action={
          <Button size="sm" variant="outline" onClick={reload} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        }
      />
    )
  }

  const c = data.cards

  // Stat cards config (14) — accent from allowed palette only (NO indigo/blue)
  const statCards: { label: string; value: number; icon: any; accent: keyof typeof ACCENT_MAP; sub?: string }[] = [
    { label: "Total Candidates", value: c.totalCandidates, icon: Users, accent: "emerald", sub: "All-time added" },
    { label: "Added Today", value: c.candidatesToday, icon: UserPlus, accent: "cyan", sub: "New today" },
    { label: "Onboarding Initiated", value: c.onboardingInitiated, icon: PlayCircle, accent: "teal", sub: "Active pipeline" },
    { label: "Invite Sent", value: c.inviteSent, icon: Send, accent: "cyan", sub: "Emails dispatched" },
    { label: "SLA Breached", value: c.slaBreached, icon: AlertTriangle, accent: "rose", sub: "Overdue stages" },
    { label: "Overdue Tasks", value: c.overdueTasks, icon: ClipboardList, accent: "amber", sub: "Past due date" },
    { label: "Completed Onboarding", value: c.completedOnboarding, icon: CheckCircle2, accent: "emerald", sub: "Fully onboarded" },
    { label: "Dropped Candidates", value: c.droppedCandidates, icon: UserMinus, accent: "slate", sub: "Withdrawn" },
    { label: "Joining Today", value: c.joiningToday, icon: CalendarDays, accent: "teal", sub: "Day-1 joiners" },
    { label: "Joining This Week", value: c.joiningThisWeek, icon: CalendarRange, accent: "emerald", sub: "Current week" },
    { label: "Active Workflows", value: c.activeWorkflows, icon: WorkflowIcon, accent: "violet", sub: `${c.totalStages} stages total` },
    { label: "Documents", value: c.documentsCount, icon: FileText, accent: "orange", sub: "Templates" },
    { label: "Checklists", value: c.checklistsCount, icon: ListChecks, accent: "fuchsia", sub: "Templates" },
    { label: "Emails", value: c.emailsCount, icon: Mail, accent: "pink", sub: "Templates" },
  ]

  // Priority donut data — ensure all 4 priorities present
  const priorityData = PRIORITY_META.map((p) => ({
    name: p.key,
    value: data.priorityDistribution.find((d) => d.priority === p.key)?.count ?? 0,
    color: p.color,
  }))
  const priorityTotal = priorityData.reduce((s, p) => s + p.value, 0)

  // Stage distribution sorted by order
  const stageData = [...data.stageDistribution].sort((a, b) => a.order - b.order)
  const maxStageCount = Math.max(1, ...stageData.map((s) => s.count))

  // Workflow distribution sorted by count desc
  const workflowData = [...data.workflowDistribution].sort((a, b) => b.count - a.count)
  const maxWorkflowCount = Math.max(1, ...workflowData.map((w) => w.count))

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <PageHeader
        title="Onboarding Dashboard"
        description="Real-time tracking of candidate onboarding pipeline, SLAs, and activity."
        icon={LayoutDashboard}
        actions={
          <Button size="sm" variant="outline" onClick={reload} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      {/* Stat cards grid — 2 / 4 / 5 cols */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
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

      {/* Row: Pipeline by Stage (2/3) + Priority donut (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard
          title="Pipeline by Stage"
          description="Candidate count currently sitting in each stage"
          className="lg:col-span-2"
        >
          {stageData.length === 0 ? (
            <EmptyState icon={WorkflowIcon} title="No stages yet" description="Configure workflows & stages to see the pipeline distribution." />
          ) : (
            <div className="space-y-3 py-1">
              {stageData.map((stage) => {
                const pct = (stage.count / maxStageCount) * 100
                return (
                  <div key={stage.id} className="group">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: stage.color }}
                        />
                        <span className="text-sm font-medium text-foreground truncate">{stage.name}</span>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 shrink-0">
                          {stage.stageType}
                        </span>
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
        </SectionCard>

        <SectionCard
          title="Candidates by Priority"
          description="Distribution across priority levels"
        >
          {priorityTotal === 0 ? (
            <EmptyState icon={Gauge} title="No candidates" description="Add candidates to see the priority breakdown." />
          ) : (
            <div className="flex flex-col items-center">
              <div className="h-56 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {priorityData.map((p) => (
                        <Cell key={p.name} fill={p.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold tabular-nums text-foreground">{priorityTotal}</span>
                  <span className="text-[11px] text-muted-foreground">Total</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full mt-2">
                {priorityData.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="ml-auto font-semibold text-foreground tabular-nums">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* 7-Day Trend — full width */}
      <SectionCard
        title="7-Day Candidate Trend"
        description="New candidates added per day over the last week"
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trend7d} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="trendEmerald" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="color-mix(in oklch, var(--border) 70%, transparent)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={28}
              />
              <RechartsTooltip content={<ChartTooltip />} cursor={{ stroke: "#10b981", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area
                type="monotone"
                dataKey="count"
                name="Candidates"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#trendEmerald)"
                dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#10b981", stroke: "var(--background)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Row: SLA Breaches + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SLA Breaches */}
        <SectionCard
          title="SLA Breaches"
          description="Candidates whose current stage SLA is overdue"
          action={
            data.slaBreaches.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 px-2.5 py-1 text-xs font-semibold">
                <AlertTriangle className="h-3 w-3" /> {data.slaBreaches.length}
              </span>
            ) : undefined
          }
        >
          {data.slaBreaches.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No SLA breaches 🎉" description="Every active candidate is within their stage SLA." />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
              {data.slaBreaches.map((b) => {
                const sla = slaStatus(b.enteredAt, b.slaDays)
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 rounded-lg border border-rose-200/60 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5 px-3 py-2.5"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{b.candidateName}</p>
                        {b.designation && (
                          <span className="text-xs text-muted-foreground truncate">· {b.designation}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {b.stageName && (
                          <>
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ background: b.stageColor || "#64748b" }}
                            />
                            <span className="text-xs text-muted-foreground truncate">{b.stageName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center rounded-full bg-rose-600 text-white px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                        {sla.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        {/* Recent Activity */}
        <SectionCard
          title="Recent Activity"
          description="Latest onboarding events & log entries"
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-xs font-semibold">
              <Activity className="h-3 w-3" /> {data.logsToday} today
            </span>
          }
        >
          {data.recentActivity.length === 0 ? (
            <EmptyState icon={Inbox} title="No activity yet" description="Onboarding actions will appear here as they happen." />
          ) : (
            <div className="relative max-h-96 overflow-y-auto scrollbar-thin pr-1">
              <ol className="relative space-y-3 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border/60">
                {data.recentActivity.map((log) => {
                  const Icon = logIcon(log.logType)
                  const statusCls = LOG_STATUS_STYLES[log.status] || "bg-muted text-muted-foreground"
                  return (
                    <li key={log.id} className="relative flex gap-3 pl-0">
                      <div className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background border border-border/60 shadow-soft">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">
                            <span className="text-muted-foreground">{log.logType}:</span>{" "}
                            <span className="text-foreground">{log.actionType}</span>
                          </p>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {timeAgo(log.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          {log.candidateName && (
                            <span className="text-xs text-muted-foreground truncate">
                              · {log.candidateName}
                            </span>
                          )}
                          {log.performedByName && (
                            <span className="text-xs text-muted-foreground truncate">
                              by <span className="font-medium text-foreground/80">{log.performedByName}</span>
                              {log.role && <span className="opacity-70"> ({log.role})</span>}
                            </span>
                          )}
                          {log.status && (
                            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", statusCls)}>
                              {log.status}
                            </span>
                          )}
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
        </SectionCard>
      </div>

      {/* Workflow Distribution — full width */}
      <SectionCard
        title="Workflow Distribution"
        description="Candidate count per onboarding workflow"
      >
        {workflowData.length === 0 ? (
          <EmptyState icon={WorkflowIcon} title="No workflows" description="Create onboarding workflows to see candidate distribution." />
        ) : (
          <div className="space-y-3 py-1">
            {workflowData.map((w) => {
              const pct = (w.count / maxWorkflowCount) * 100
              return (
                <div key={w.id} className="group">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ background: w.color }}
                      />
                      <span className="text-sm font-medium text-foreground truncate">{w.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                      {w.count} <span className="text-muted-foreground font-normal text-xs">candidates</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: w.color }}
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
      </SectionCard>
    </div>
  )
}

// ---------- Skeleton ----------
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 14 }).map((_, i) => (
          <Card key={i} className="border border-border/60 rounded-xl">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border border-border/60 rounded-xl">
          <CardContent className="p-5 space-y-4">
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border border-border/60 rounded-xl">
          <CardContent className="p-5 space-y-4">
            <Skeleton className="h-5 w-40" />
            <div className="h-48 flex items-center justify-center">
              <Skeleton className="h-40 w-40 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/60 rounded-xl">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="border border-border/60 rounded-xl">
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-5 w-40" />
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-14 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-border/60 rounded-xl">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-5 w-44" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardSection
