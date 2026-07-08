'use client'

import * as React from "react"
import { motion } from "framer-motion"
import {
  Users, Clock, CalendarCheck, Package, Activity, UserPlus,
  TrendingUp, CalendarOff, Plus, FileText, Monitor, ChevronRight,
  Sparkles, ArrowRight, Cake, PartyPopper, Plane,
} from "lucide-react"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts"
import { toast } from "sonner"
import { format } from "date-fns"

import { StatCard, SectionCard, StatusBadge } from "@/components/hrms/ui"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useHrmsStore } from "@/store/hrms-store"
import { apiFetch } from "@/lib/api-client"

// ---- types ----
type Stats = {
  totalEmployees: number
  activeEmployees: number
  onNotice: number
  newThisMonth: number
  pendingApprovals: number
  openTickets: number
  assetsAssigned: number
  assetsInStock: number
  onLeaveToday: number
  avgAttendance: number
}
type NameValue = { name: string; value: number }
type JoiningsMonth = { month: string; joinings: number; exits: number }
type LeaveMonth = { month: string; leaves: number }
type AttendanceDay = { day: string; present: number; absent: number }
type RecentJoiner = {
  id: string; name: string; code: string; designation: string;
  department: string; dateOfJoining: string
}
type UpcomingHoliday = { id: string; name: string; date: string; type: string }
type PendingRequest = {
  id: string; kind: "Leave" | "Asset"; employeeName: string; employeeCode: string;
  type: string; date: string; status: string
}
type OnLeaveTodayItem = {
  id: string; name: string; code: string; designation: string; returnDate: string
}
type UpcomingBirthday = {
  id: string; name: string; code: string; designation: string;
  nextDate: string; ageTurning: number; daysUntil: number
}
type UpcomingAnniversary = {
  id: string; name: string; code: string; designation: string;
  joiningDate: string; nextDate: string; yearsCompleted: number; daysUntil: number
}
type DashboardData = {
  stats: Stats
  headcountByDept: NameValue[]
  headcountByLocation: NameValue[]
  genderRatio: NameValue[]
  joiningsByMonth: JoiningsMonth[]
  leaveTrend: LeaveMonth[]
  attendanceTrend: AttendanceDay[]
  assetStatus: NameValue[]
  recentJoiners: RecentJoiner[]
  upcomingHolidays: UpcomingHoliday[]
  pendingRequests: PendingRequest[]
  onLeaveTodayList: OnLeaveTodayItem[]
  upcomingBirthdays: UpcomingBirthday[]
  upcomingAnniversaries: UpcomingAnniversary[]
}

// ---- chart palette (matches chart-1..5 CSS vars; emerald/teal/amber/fuchsia/coral) ----
const CHART_COLORS = ["#10b981", "#06b6d4", "#f59e0b", "#d946ef", "#f43f5e", "#84cc16"]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 220, damping: 22 } },
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs shadow-card">
      {label && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function DashboardModule() {
  const [data, setData] = React.useState<DashboardData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)
  const setModule = useHrmsStore((s) => s.setModule)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiFetch("/api/dashboard")
      .then(async (r) => {
        if (!r.ok) throw new Error("HTTP " + r.status)
        return r.json()
      })
      .then((d) => { if (!cancelled) { setData(d); setError(false) } })
      .catch((e) => {
        console.error(e)
        if (!cancelled) {
          setError(true)
          toast.error("Failed to load dashboard data")
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const today = new Date()
  const todayLabel = format(today, "EEEE, dd MMMM yyyy")

  if (loading) return <DashboardSkeleton />
  if (error || !data) {
    return (
      <div className="space-y-5">
        <WelcomeBanner todayLabel={todayLabel} setModule={setModule} />
        <SectionCard title="Error" description="Could not load dashboard data.">
          <p className="text-sm text-muted-foreground">
            Please ensure the database has been seeded.{" "}
            <Button variant="link" className="h-auto p-0" onClick={() => {
              apiFetch("/api/seed").then(() => window.location.reload())
            }}>Seed data now</Button>
          </p>
        </SectionCard>
      </div>
    )
  }

  const s = data.stats

  // sparkline series derived from trend data
  const joiningsSpark = data.joiningsByMonth.map((m) => m.joinings)
  const attendanceSpark = data.attendanceTrend.map((d) => d.present)
  const leaveSpark = data.leaveTrend.map((m) => m.leaves)

  return (
    <div className="space-y-5">
      <WelcomeBanner todayLabel={todayLabel} setModule={setModule} />

      {/* Row 1: 4 stat cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item}>
          <StatCard label="Total Employees" value={s.totalEmployees} icon={Users} accent="emerald" trend={{ value: "+2 this month", up: true }} sub={`${s.activeEmployees} active · ${s.onNotice} on notice`} spark={joiningsSpark} />
        </motion.div>
        <motion.div variants={item}>
          <StatCard label="Pending Approvals" value={s.pendingApprovals} icon={Clock} accent="amber" sub={`${data.pendingRequests.length} awaiting review`} />
        </motion.div>
        <motion.div variants={item}>
          <StatCard label="On Leave Today" value={s.onLeaveToday} icon={CalendarOff} accent="fuchsia" sub="Approved leaves" spark={leaveSpark} />
        </motion.div>
        <motion.div variants={item}>
          <StatCard label="Assets Assigned" value={s.assetsAssigned} icon={Package} accent="cyan" sub={`${s.assetsInStock} in stock`} />
        </motion.div>
      </motion.div>

      {/* Row 2: 3 stat cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item}>
          <StatCard label="Avg Attendance" value={`${s.avgAttendance}%`} icon={Activity} accent="emerald" trend={{ value: "stable", up: true }} sub="Last 5 working days" spark={attendanceSpark} />
        </motion.div>
        <motion.div variants={item}>
          <StatCard label="Active Employees" value={s.activeEmployees} icon={TrendingUp} accent="cyan" sub={`of ${s.totalEmployees} total`} />
        </motion.div>
        <motion.div variants={item}>
          <StatCard label="New This Month" value={s.newThisMonth} icon={UserPlus} accent="amber" trend={{ value: "joinees", up: true }} sub="Fresh hires" spark={joiningsSpark} />
        </motion.div>
      </motion.div>

      {/* Team Pulse — on leave today, birthdays, anniversaries */}
      <TeamPulse data={data} setModule={setModule} />

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Headcount by Department — horizontal bar */}
        <SectionCard title="Headcount by Department" description="Distribution across teams" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.headcountByDept} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="color-mix(in oklch, var(--border) 70%, transparent)" />
                <XAxis type="number" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "color-mix(in oklch, var(--muted) 60%, transparent)" }} />
                <Bar dataKey="value" name="Employees" radius={[0, 6, 6, 0]} barSize={20}>
                  {data.headcountByDept.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Gender ratio — donut */}
        <SectionCard title="Gender Ratio" description="Workforce composition">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.genderRatio}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.genderRatio.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Joinings vs Exits — area chart */}
        <SectionCard title="Joinings vs Exits" description="Last 6 months" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.joiningsByMonth} margin={{ left: -8, right: 16, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gJoin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gExit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="color-mix(in oklch, var(--border) 70%, transparent)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="joinings" name="Joinings" stroke="#10b981" strokeWidth={2} fill="url(#gJoin)" />
                <Area type="monotone" dataKey="exits" name="Exits" stroke="#f43f5e" strokeWidth={2} fill="url(#gExit)" />
                <Legend verticalAlign="top" iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Asset status — donut */}
        <SectionCard title="Asset Status" description="Allocation overview">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.assetStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.assetStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Attendance trend — stacked bar */}
        <SectionCard title="Attendance Trend" description="Last 7 days — Present vs Absent" className="lg:col-span-3">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.attendanceTrend} margin={{ left: -8, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="color-mix(in oklch, var(--border) 70%, transparent)" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "color-mix(in oklch, var(--muted) 60%, transparent)" }} />
                <Legend verticalAlign="top" iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                <Bar dataKey="present" name="Present" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={28} />
                <Bar dataKey="absent" name="Absent" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Lists: recent joiners, upcoming holidays, pending approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent joiners */}
        <SectionCard title="Recent Joiners" description="Latest additions to the team" action={
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setModule("employees")}>
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        }>
          <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin pr-1">
            {data.recentJoiners.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent joiners</p>
            )}
            {data.recentJoiners.map((j) => (
              <div key={j.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                    {initials(j.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{j.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{j.designation} · {j.department}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-foreground">{format(new Date(j.dateOfJoining), "dd MMM")}</p>
                  <p className="text-[10px] text-muted-foreground">{j.code}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Upcoming holidays */}
        <SectionCard title="Upcoming Holidays" description="Next long weekends" action={
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setModule("holiday")}>
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        }>
          <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin pr-1">
            {data.upcomingHolidays.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No upcoming holidays</p>
            )}
            {data.upcomingHolidays.map((h) => (
              <div key={h.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg gradient-emerald text-primary-foreground flex-col leading-none">
                  <span className="text-[10px] uppercase opacity-80">{format(new Date(h.date), "MMM")}</span>
                  <span className="text-base font-bold">{format(new Date(h.date), "dd")}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{h.name}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(h.date), "EEEE")}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px]">{h.type}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Pending approvals */}
        <SectionCard title="Pending Approvals" description="Leave & asset requests awaiting review" action={
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setModule("leave")}>
            Review all <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        }>
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
            {data.pendingRequests.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No pending requests</p>
            )}
            {data.pendingRequests.map((r) => (
              <div key={r.kind + r.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{r.employeeName}</p>
                    <span className="text-[10px] text-muted-foreground">{r.employeeCode}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="inline-flex items-center gap-1">
                      {r.kind === "Leave" ? <CalendarOff className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                      {r.type} · {format(new Date(r.date), "dd MMM yyyy")}
                    </span>
                  </p>
                </div>
                <StatusBadge status={r.status} />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setModule(r.kind === "Leave" ? "leave" : "asset")}
                >
                  Review
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

// ---------- Team Pulse (on leave, birthdays, anniversaries) ----------
function relativeDay(n: number): string {
  if (n === 0) return "Today"
  if (n === 1) return "Tomorrow"
  if (n < 7) return `In ${n} days`
  if (n < 14) return `Next week`
  return `In ${n} days`
}

function TeamPulse({
  data, setModule,
}: {
  data: DashboardData
  setModule: (m: any, sub?: string | null) => void
}) {
  const onLeave = data.onLeaveTodayList
  const birthdays = data.upcomingBirthdays
  const anniversaries = data.upcomingAnniversaries

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* On Leave Today */}
      <motion.div variants={item}>
        <Card className="relative overflow-hidden border-border/60 shadow-soft h-full">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 to-pink-400" />
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-fuchsia-500/15 blur-2xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400">
                  <Plane className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">On Leave Today</p>
                  <p className="text-[11px] text-muted-foreground">{onLeave.length} out · returns shown</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setModule("leave")}>
                View <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin pr-1">
              {onLeave.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-muted mb-2">
                    <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Everyone's in today</p>
                </div>
              )}
              {onLeave.map((p) => (
                <div key={p.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 text-[11px] font-semibold">
                      {initials(p.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.designation}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-medium text-foreground">Returns</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(p.returnDate), "dd MMM")}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Upcoming Birthdays */}
      <motion.div variants={item}>
        <Card className="relative overflow-hidden border-border/60 shadow-soft h-full">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/15 blur-2xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Cake className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Upcoming Birthdays</p>
                  <p className="text-[11px] text-muted-foreground">Next 14 days</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setModule("employees")}>
                View <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin pr-1">
              {birthdays.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-muted mb-2">
                    <Cake className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">No birthdays coming up</p>
                </div>
              )}
              {birthdays.map((b) => (
                <div key={b.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-semibold">
                      {initials(b.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{b.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{b.designation}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">{format(new Date(b.nextDate), "dd MMM")}</p>
                    <p className="text-[10px] text-muted-foreground">turns {b.ageTurning}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Work Anniversaries */}
      <motion.div variants={item}>
        <Card className="relative overflow-hidden border-border/60 shadow-soft h-full">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/15 blur-2xl" />
          <CardContent className="relative p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <PartyPopper className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Work Anniversaries</p>
                  <p className="text-[11px] text-muted-foreground">Next 30 days</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setModule("employees")}>
                View <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin pr-1">
              {anniversaries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-muted mb-2">
                    <PartyPopper className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">No anniversaries coming up</p>
                </div>
              )}
              {anniversaries.map((a) => (
                <div key={a.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                      {initials(a.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{a.designation}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">{format(new Date(a.nextDate), "dd MMM")}</p>
                    <p className="text-[10px] text-muted-foreground">{a.yearsCompleted} yr{a.yearsCompleted === 1 ? "" : "s"}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

// ---------- Welcome banner ----------
function WelcomeBanner({ todayLabel, setModule }: { todayLabel: string; setModule: (m: any, sub?: string | null) => void }) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-card">
      <div className="absolute inset-0 gradient-emerald opacity-95" />
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <CardContent className="relative p-6 sm:p-7 text-primary-foreground">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
              <Sparkles className="h-3 w-3" />
              {todayLabel}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back to Nexus HR</h2>
            <p className="text-sm text-primary-foreground/80 max-w-xl">
              Your single command center for the entire employee lifecycle. Track headcount, approve requests, and stay on top of what matters today.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 bg-white text-emerald-700 hover:bg-white/90 hover:text-emerald-800 shadow-soft"
              onClick={() => setModule("employees")}
            >
              <UserPlus className="h-4 w-4" /> Add Employee
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 bg-white/15 text-primary-foreground hover:bg-white/25 hover:text-primary-foreground border border-white/30 backdrop-blur"
              onClick={() => setModule("leave")}
            >
              <FileText className="h-4 w-4" /> Apply Leave
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 bg-white/15 text-primary-foreground hover:bg-white/25 hover:text-primary-foreground border border-white/30 backdrop-blur"
              onClick={() => setModule("asset")}
            >
              <Monitor className="h-4 w-4" /> New Asset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Skeleton ----------
function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-80 lg:col-span-2 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 lg:col-span-2 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-72 lg:col-span-3 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
      </div>
    </div>
  )
}
