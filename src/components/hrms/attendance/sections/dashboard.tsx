'use client'

import * as React from "react"
import { format } from "date-fns"
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Legend as RLegend, Cell,
  PieChart, Pie,
} from "recharts"
import {
  Users, UserCheck, UserX, Clock, Plane, Home, AlertTriangle,
  Hourglass, ArrowRight, RefreshCw, CalendarDays, Inbox, Layers3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover"
import { SectionCard, StatCard, EmptyState } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"
import {
  fetchJson, useAsync, GridSkeleton, CHART_COLORS,
} from "../shared"

// ============================================================
// Types
// ============================================================

interface DashStats {
  totalEmployees: number
  present: number
  absent: number
  late: number
  earlyGoing: number
  halfDay: number
  onLeave: number
  weeklyOff: number
  holiday: number
  wfh: number
  onDuty: number
  missingPunch: number
  missingInPunch: number
  missingOutPunch: number
  notYetPunched: number
  lwp: number
  pendingRequests: number
  pendingOvertime: number
}

interface DeptSlice { name: string; present: number; absent: number; total: number }
interface TrendDay { date: string; late: number; absent: number; present: number }

interface DashboardResp {
  date?: string
  stats: DashStats
  departmentWise?: DeptSlice[]
  locationWise?: DeptSlice[]
  trend?: TrendDay[]
}

// Status -> pie chart color (matches badge palette)
const STATUS_PIE_COLORS: Record<string, string> = {
  Present: "#10b981",
  Absent: "#f43f5e",
  Late: "#f59e0b",
  "Half Day": "#fbbf24",
  "On Leave": "#06b6d4",
  WFH: "#8b5cf6",
  "On Duty": "#fb923c",
  "Weekly Off": "#94a3b8",
  Holiday: "#64748b",
  "Missing Punch": "#ec4899",
  LWP: "#dc2626",
}

// ============================================================
// Helpers
// ============================================================

function navigate(section: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("attendance:navigate", { detail: section }))
  }
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-soft">
      {label != null && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span>{p.name}:</span>
          <span className="font-medium text-foreground tabular-nums">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ============================================================
// Main
// ============================================================

export function DashboardSection() {
  const [date, setDate] = React.useState<Date>(new Date())
  const dateStr = format(date, "yyyy-MM-dd")
  const { data, loading, error, reload } = useAsync<DashboardResp>(
    () => fetchJson(`/api/attendance-dashboard?date=${dateStr}`),
    [dateStr],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <GridSkeleton count={8} />
        <div className="h-72 rounded-xl bg-muted/40 animate-pulse" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <SectionCard title="Attendance Dashboard">
        <EmptyState
          icon={RefreshCw}
          title="Couldn't load dashboard"
          description={error || "Failed to load attendance analytics."}
          action={<Button onClick={reload} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1" /> Retry</Button>}
        />
      </SectionCard>
    )
  }

  const s = data?.stats || ({} as DashStats)
  const deptWise = (data?.departmentWise || []).slice(0, 8)
  const trend = data?.trend || []
  const trendData = trend.map((t) => ({
    ...t,
    label: t.date ? format(new Date(t.date), "dd MMM") : "",
  }))

  // Build pie distribution
  const pieData = [
    { name: "Present", value: s.present || 0 },
    { name: "Absent", value: s.absent || 0 },
    { name: "Late", value: s.late || 0 },
    { name: "Half Day", value: s.halfDay || 0 },
    { name: "On Leave", value: s.onLeave || 0 },
    { name: "WFH", value: s.wfh || 0 },
    { name: "On Duty", value: s.onDuty || 0 },
    { name: "Weekly Off", value: s.weeklyOff || 0 },
    { name: "Holiday", value: s.holiday || 0 },
    { name: "Missing Punch", value: s.missingPunch || 0 },
    { name: "LWP", value: s.lwp || 0 },
  ].filter((d) => d.value > 0)

  const presentRate = s.totalEmployees
    ? Math.round(((s.present + s.wfh + s.onDuty) / s.totalEmployees) * 100)
    : 0

  const cards = [
    { label: "Total Employees", value: s.totalEmployees ?? 0, icon: Users, accent: "emerald" as const, sub: "Active workforce" },
    { label: "Present", value: s.present ?? 0, icon: UserCheck, accent: "emerald" as const, sub: `${presentRate}% present rate` },
    { label: "Absent", value: s.absent ?? 0, icon: UserX, accent: "coral" as const, sub: "Marked absent" },
    { label: "Late Coming", value: s.late ?? 0, icon: Clock, accent: "amber" as const, sub: "Late check-in" },
    { label: "On Leave", value: s.onLeave ?? 0, icon: Plane, accent: "cyan" as const, sub: "Approved leaves" },
    { label: "WFH", value: s.wfh ?? 0, icon: Home, accent: "fuchsia" as const, sub: "Remote today" },
    { label: "Missing Punch", value: s.missingPunch ?? 0, icon: AlertTriangle, accent: "amber" as const, sub: `${s.missingInPunch ?? 0} in / ${s.missingOutPunch ?? 0} out` },
    { label: "Not Yet Punched", value: s.notYetPunched ?? 0, icon: Hourglass, accent: "coral" as const, sub: "Awaiting check-in" },
  ]

  return (
    <div className="space-y-4">
      {/* Header + date picker */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Attendance Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Live snapshot for <span className="font-medium text-foreground">{format(date, "EEEE, dd MMM yyyy")}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <CalendarDays className="h-4 w-4 text-emerald-500" />
                {format(date, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="outline" className="h-9" onClick={() => setDate(new Date())}>Today</Button>
        </div>
      </div>

      {/* 8 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} accent={c.accent} sub={c.sub} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Department-wise */}
        <SectionCard title="Department-wise Attendance" description="Present vs Absent by department">
          <div className="h-72">
            {deptWise.length === 0 ? (
              <EmptyState title="No data" description="No attendance records for this date." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptWise} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RLegend wrapperStyle={{ fontSize: 11 }} />
                  <RTooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" , opacity: 0.4 }} />
                  <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        {/* 7-day trend */}
        <SectionCard title="7-Day Trend" description="Late / Absent / Present over the past week">
          <div className="h-72">
            {trendData.length === 0 ? (
              <EmptyState title="No trend data" description="No attendance records for the past 7 days." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RLegend wrapperStyle={{ fontSize: 11 }} />
                  <RTooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="present" name="Present" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="late" name="Late" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="absent" name="Absent" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        {/* Pie distribution */}
        <SectionCard title="Status Distribution" description="Today's attendance breakdown">
          <div className="h-72">
            {pieData.length === 0 ? (
              <EmptyState title="No records" description="No attendance data for this date." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={STATUS_PIE_COLORS[d.name] || CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RLegend wrapperStyle={{ fontSize: 11 }} layout="vertical" align="right" verticalAlign="middle" />
                  <RTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        {/* Pending items + Quick actions */}
        <SectionCard title="Pending & Quick Actions" description="Approvals awaiting action & shortcuts">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate("requests")}
                className="rounded-xl border border-border/60 bg-card p-4 text-left hover:border-emerald-400 hover:shadow-soft transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Inbox className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">{s.pendingRequests ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Pending Requests</p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">Review <ArrowRight className="h-3 w-3" /></p>
              </button>
              <button
                onClick={() => navigate("overtime")}
                className="rounded-xl border border-border/60 bg-card p-4 text-left hover:border-emerald-400 hover:shadow-soft transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">{s.pendingOvertime ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Pending Overtime</p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">Approve <ArrowRight className="h-3 w-3" /></p>
              </button>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Quick Actions</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button variant="outline" size="sm" className="justify-start gap-2 h-9" onClick={() => navigate("register")}>
                  <Layers3 className="h-4 w-4 text-emerald-500" /> Attendance Register <ArrowRight className="h-3 w-3 ml-auto" />
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2 h-9" onClick={() => navigate("regularization")}>
                  <RefreshCw className="h-4 w-4 text-amber-500" /> Regularization <ArrowRight className="h-3 w-3 ml-auto" />
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2 h-9" onClick={() => navigate("bulk-update")}>
                  <Layers3 className="h-4 w-4 text-fuchsia-500" /> Bulk Update <ArrowRight className="h-3 w-3 ml-auto" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Today's summary</p>
                  <p className="text-sm font-medium text-foreground">
                    {s.present ?? 0} present · {s.wfh ?? 0} WFH · {s.onDuty ?? 0} on-duty · {s.onLeave ?? 0} on leave
                  </p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-0">
                  {presentRate}% present
                </Badge>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
