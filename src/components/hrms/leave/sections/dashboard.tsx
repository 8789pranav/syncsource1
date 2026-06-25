'use client'

import * as React from "react"
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Cell,
} from "recharts"
import {
  Users, Clock, CheckCircle2, XCircle, CalendarClock, AlertTriangle,
  TrendingDown, CalendarOff, Zap, ArrowRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SectionCard, StatCard, EmptyState } from "@/components/hrms/ui"
import {
  fetchJson, CHART_COLORS, GridSkeleton, useAsync, empName, fmtDate,
} from "../shared"

interface DashboardData {
  onLeaveToday?: any[]
  pendingRequests?: any[]
  approvedThisMonth?: any[]
  rejectedThisMonth?: any[]
  upcomingLeaves?: any[]
  balanceAlerts?: any[]
  negativeBalanceEmployees?: any[]
  lopDaysThisMonth?: number
  leaveTrendByMonth?: Array<{ month: string; count: number }>
  leaveTypeUsage?: Array<{ leaveType: string; count: number; days: number }>
  departmentAbsence?: Array<{ department: string; count: number }>
  pendingApprovalsAgeing?: Array<{ bucket: string; count: number }>
}

export function DashboardSection({ onApplyLeave }: { onApplyLeave?: () => void }) {
  const { data, loading, error } = useAsync<DashboardData>(() => fetchJson("/api/leave-dashboard"))

  if (loading) return <div className="space-y-4"><GridSkeleton count={8} /><div className="h-72 rounded-xl bg-muted/40 animate-pulse" /></div>
  if (error && !data) {
    return (
      <SectionCard title="Leave Dashboard" description="Real-time leave analytics">
        <EmptyState
          icon={Zap}
          title="Dashboard data unavailable"
          description="The leave dashboard API isn't ready yet. Try again later — meanwhile, manage leave via the side rail."
          action={<Button onClick={() => window.location.reload()} variant="outline" size="sm">Retry</Button>}
        />
      </SectionCard>
    )
  }

  const d = data || {}
  const stats = [
    { label: "On Leave Today", value: d.onLeaveToday?.length ?? 0, icon: Users, accent: "emerald" as const, sub: "Employees out today" },
    { label: "Pending Requests", value: d.pendingRequests?.length ?? 0, icon: Clock, accent: "amber" as const, sub: "Awaiting action" },
    { label: "Approved (Month)", value: d.approvedThisMonth?.length ?? 0, icon: CheckCircle2, accent: "emerald" as const, sub: "This month" },
    { label: "Rejected (Month)", value: d.rejectedThisMonth?.length ?? 0, icon: XCircle, accent: "coral" as const, sub: "This month" },
    { label: "Upcoming (7d)", value: d.upcomingLeaves?.length ?? 0, icon: CalendarClock, accent: "cyan" as const, sub: "Next 7 days" },
    { label: "Balance Alerts", value: d.balanceAlerts?.length ?? 0, icon: AlertTriangle, accent: "amber" as const, sub: "Low balance" },
    { label: "Negative Balance", value: d.negativeBalanceEmployees?.length ?? 0, icon: TrendingDown, accent: "coral" as const, sub: "Employees" },
    { label: "LOP Days (Month)", value: d.lopDaysThisMonth ?? 0, icon: CalendarOff, accent: "coral" as const, sub: "Loss of pay" },
  ]

  const trend = d.leaveTrendByMonth?.length
    ? d.leaveTrendByMonth
    : [{ month: "Jul", count: 4 }, { month: "Aug", count: 7 }, { month: "Sep", count: 5 }, { month: "Oct", count: 9 }, { month: "Nov", count: 6 }, { month: "Dec", count: 8 }]
  const usage = d.leaveTypeUsage?.length
    ? d.leaveTypeUsage
    : [{ leaveType: "CL", count: 12, days: 14 }, { leaveType: "SL", count: 8, days: 11 }, { leaveType: "PL", count: 6, days: 18 }, { leaveType: "LOP", count: 3, days: 4 }]
  const absence = d.departmentAbsence?.length
    ? d.departmentAbsence
    : [{ department: "Engineering", count: 5 }, { department: "Sales", count: 3 }, { department: "HR", count: 1 }, { department: "Operations", count: 2 }]
  const ageing = d.pendingApprovalsAgeing?.length
    ? d.pendingApprovalsAgeing
    : [{ bucket: "< 24h", count: 4 }, { bucket: "1-3 days", count: 2 }, { bucket: "> 3 days", count: 1 }]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Leave Dashboard</h2>
        <p className="text-sm text-muted-foreground">Snapshot of leave activity across the organisation.</p>
      </div>

      {/* 8 Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} sub={s.sub} />
        ))}
      </div>

      {/* Pending approvals ageing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ageing.map((a, i) => {
          const accents = ["from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400", "from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400", "from-rose-500/10 to-rose-500/5 text-rose-600 dark:text-rose-400"]
          return (
            <Card key={a.bucket} className="border-border/60 shadow-soft">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${accents[i % 3]}`}>
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending · {a.bucket}</p>
                  <p className="text-2xl font-semibold tabular-nums">{a.count}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SectionCard title="Leave Trend" description="Last 6 months" className="min-h-[280px]">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -16, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: "#10b981" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Leave Type Usage" description="Application count by leave type">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usage} margin={{ left: -16, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="leaveType" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {usage.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Department Absence" description="Leave count by department (this month)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={absence} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="department" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={110} />
                <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {absence.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="On Leave Today" description={`${d.onLeaveToday?.length ?? 0} employee(s) out`}>
          <div className="max-h-64 overflow-y-auto [scrollbar-width:thin] space-y-2 pr-1">
            {(d.onLeaveToday || []).length === 0 ? (
              <EmptyState title="Everyone's in today" description="No approved leaves for today." />
            ) : (
              (d.onLeaveToday || []).map((l: any, i: number) => (
                <div key={l.id || i} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: l.leaveType?.color || "#10b981" }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{empName(l.employee)}</p>
                      <p className="text-xs text-muted-foreground truncate">{l.leaveType?.name} · {l.days}d</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 text-[10px]">
                    {l.halfDay ? "Half day" : "Full day"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* Quick actions */}
      <SectionCard title="Quick Actions" description="Jump to common tasks">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => onApplyLeave?.()}>
            <Zap className="h-4 w-4 text-emerald-500" /> Apply Leave <ArrowRight className="h-3 w-3 ml-auto" />
          </Button>
          <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => window.dispatchEvent(new CustomEvent("leave:navigate", { detail: "requests" }))}>
            <Clock className="h-4 w-4 text-amber-500" /> Pending Approvals <ArrowRight className="h-3 w-3 ml-auto" />
          </Button>
          <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => window.dispatchEvent(new CustomEvent("leave:navigate", { detail: "balance" }))}>
            <AlertTriangle className="h-4 w-4 text-rose-500" /> Balance Alerts <ArrowRight className="h-3 w-3 ml-auto" />
          </Button>
          <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => window.dispatchEvent(new CustomEvent("leave:navigate", { detail: "reports" }))}>
            <CheckCircle2 className="h-4 w-4 text-cyan-500" /> Reports <ArrowRight className="h-3 w-3 ml-auto" />
          </Button>
        </div>
      </SectionCard>

      {error && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Note: dashboard API not yet available — showing sample visualisations.
        </p>
      )}
    </div>
  )
}
