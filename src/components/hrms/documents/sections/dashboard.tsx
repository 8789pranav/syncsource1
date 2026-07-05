"use client"

// ============================================================================
//  Documents — Dashboard (Task ID 4-b)
// ----------------------------------------------------------------------------
//  Real-time overview of the entire Documents module.
//  Theme: violet/purple accent (Documents menu color).
//  - 11 stat cards (responsive grid)
//  - Donut: document distribution by category
//  - Bar: monthly generated documents trend (6 months)
//  - Horizontal bar: entity-wise document count
//  - Upcoming expiries list (color-coded)
//  - Recent activity timeline (from DOCUMENT_LOGS)
//  - Quick actions card
//  - Pending approvals card
//  - Filter bar at top
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts"
import {
  FileStack, FileText, Building2, Library, FileCheck, Inbox, Clock,
  AlertTriangle, FileX2, ShieldX, Star, Download, RefreshCw, ChevronRight,
  Upload, PlusCircle, Sparkles, UserSquare, CheckCircle2, XCircle, Eye,
  History, Pencil, Send, FileSignature,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"

import {
  ENTITIES, STATUS_COLORS, EMPLOYEE_DOC_CATEGORIES, formatDate, formatDateTime,
  daysUntil, initials, avatarColor,
} from "../shared"
import {
  EMPLOYEE_DOCUMENTS, HR_DOCUMENTS, DOCUMENT_TEMPLATES, GENERATED_DOCUMENTS,
  DOCUMENT_REQUESTS, DOCUMENT_LOGS, DASHBOARD_STATS,
} from "../data"

// ---------- Palette ----------
const VIOLET = "#8b5cf6"
const PURPLE = "#a855f7"
const FUCHSIA = "#d946ef"
const SKY = "#0ea5e9"
const AMBER = "#f59e0b"
const EMERALD = "#10b981"
const ROSE = "#f43f5e"
const SLATE = "#64748b"

const ACTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Create: PlusCircle, Upload: Upload, Download: Download, Preview: Eye, Send: Send,
  Delete: XCircle, Verify: CheckCircle2, Reject: XCircle, Approve: CheckCircle2,
  Generate: FileSignature, Publish: Send, Archive: FileX2, "E-Sign": FileSignature,
  "Version Change": History, Clone: FileText, Email: Send,
}

// ---------- motion ----------
const gridContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const gridItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

// ---------- Stat tile ----------
function DashStat({ label, value, icon: Icon, accent, sub, trend }: {
  label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>
  accent: "violet" | "purple" | "fuchsia" | "sky" | "amber" | "emerald" | "rose" | "slate"
  sub?: string; trend?: { up: boolean; value: string }
}) {
  const map: Record<string, { grad: string; text: string; ring: string }> = {
    violet:  { grad: "from-violet-500/15 to-violet-500/5",   text: "text-violet-600 dark:text-violet-400",   ring: "ring-violet-500/20" },
    purple:  { grad: "from-purple-500/15 to-purple-500/5",   text: "text-purple-600 dark:text-purple-400",   ring: "ring-purple-500/20" },
    fuchsia: { grad: "from-fuchsia-500/15 to-fuchsia-500/5", text: "text-fuchsia-600 dark:text-fuchsia-400", ring: "ring-fuchsia-500/20" },
    sky:     { grad: "from-sky-500/15 to-sky-500/5",         text: "text-sky-600 dark:text-sky-400",         ring: "ring-sky-500/20" },
    amber:   { grad: "from-amber-500/15 to-amber-500/5",     text: "text-amber-600 dark:text-amber-400",     ring: "ring-amber-500/20" },
    emerald: { grad: "from-emerald-500/15 to-emerald-500/5", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20" },
    rose:    { grad: "from-rose-500/15 to-rose-500/5",       text: "text-rose-600 dark:text-rose-400",       ring: "ring-rose-500/20" },
    slate:   { grad: "from-slate-500/15 to-slate-500/5",     text: "text-slate-600 dark:text-slate-400",     ring: "ring-slate-500/20" },
  }
  const a = map[accent] || map.violet
  return (
    <Card className={cn("relative overflow-hidden rounded-xl border border-border/60 shadow-soft bg-gradient-to-br", a.grad)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl font-semibold mt-1 text-foreground tabular-nums leading-none">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>}
            {trend && (
              <div className={cn("inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium",
                trend.up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                <span>{trend.up ? "▲" : "▼"}</span><span>{trend.value}</span>
              </div>
            )}
          </div>
          <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background/70 ring-1 backdrop-blur-sm", a.ring, a.text)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Chart tooltip ----------
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/60 bg-background/95 backdrop-blur px-3 py-2 shadow-soft text-xs">
      {label && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
//  Main component
// ============================================================================
export function DocumentsDashboardSection() {
  // ---------- Filters ----------
  const [filters, setFilters] = React.useState({
    entity: "all", docType: "all", status: "all", search: "",
  })
  const setF = (k: string, v: string) => setFilters(f => ({ ...f, [k]: v }))

  // ---------- Derived stats ----------
  const s = DASHBOARD_STATS

  // ---------- Distribution donut (category) ----------
  const categoryDist = React.useMemo(() => ([
    { name: "Employee Docs", value: EMPLOYEE_DOCUMENTS.length, color: VIOLET },
    { name: "HR Docs", value: HR_DOCUMENTS.length, color: FUCHSIA },
    { name: "Templates", value: DOCUMENT_TEMPLATES.length, color: SKY },
    { name: "Generated", value: GENERATED_DOCUMENTS.length, color: AMBER },
  ]), [])
  const distTotal = categoryDist.reduce((acc, d) => acc + d.value, 0)

  // ---------- Monthly generated trend (6 months) ----------
  const monthTrend = React.useMemo(() => {
    const months: { month: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = d.toLocaleDateString("en-IN", { month: "short" })
      const factor = 0.7 + (5 - i) * 0.12
      months.push({ month: label, count: Math.round(28 * factor) })
    }
    return months
  }, [])

  // ---------- Entity-wise doc count ----------
  const entityCounts = React.useMemo(() => {
    const map = new Map<string, number>()
    EMPLOYEE_DOCUMENTS.forEach(d => map.set(d.entityName, (map.get(d.entityName) || 0) + 1))
    HR_DOCUMENTS.forEach(d => map.set(d.entityName, (map.get(d.entityName) || 0) + 1))
    GENERATED_DOCUMENTS.forEach(d => map.set(d.entityName, (map.get(d.entityName) || 0) + 1))
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: name.replace("ACME ", "").replace(" Pvt Ltd", "").replace(" Pte Ltd", "").replace(" FZE", "").replace(" Inc", ""), value }))
      .sort((a, b) => b.value - a.value)
  }, [])

  // ---------- Upcoming expiries (top 5 employee docs) ----------
  const upcomingExpiries = React.useMemo(() => {
    return EMPLOYEE_DOCUMENTS
      .filter(d => d.expiryDate && daysUntil(d.expiryDate) >= 0 && daysUntil(d.expiryDate) <= 90)
      .sort((a, b) => daysUntil(a.expiryDate!) - daysUntil(b.expiryDate!))
      .slice(0, 5)
      .map(d => ({ ...d, days: daysUntil(d.expiryDate!) }))
  }, [])

  // ---------- Recent activity (6 latest logs) ----------
  const recentLogs = React.useMemo(() =>
    [...DOCUMENT_LOGS].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6)
  , [])

  // ---------- Pending approvals ----------
  const pendingHRReqs = React.useMemo(() => DOCUMENT_REQUESTS.filter(r => r.status === "Pending HR Approval").slice(0, 4), [])
  const pendingVerify = React.useMemo(() => EMPLOYEE_DOCUMENTS.filter(d => d.status === "Pending Verification").slice(0, 4), [])

  // ---------- Handlers ----------
  const onAction = (label: string) => toast.success(label)

  return (
    <div className="space-y-5">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-soft">
            <FileStack className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Documents Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Unified view of employee docs, HR policies, templates, generated letters, requests & approvals.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => onAction("Dashboard refreshed")} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => onAction("Export started")} className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* ---------- Filter bar ---------- */}
      <Card className="border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Select value={filters.entity} onValueChange={v => setF("entity", v)}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {ENTITIES.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.docType} onValueChange={v => setF("docType", v)}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Document Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Document Types</SelectItem>
                <SelectItem value="employee">Employee Documents</SelectItem>
                <SelectItem value="hr">HR Documents</SelectItem>
                <SelectItem value="templates">Templates</SelectItem>
                <SelectItem value="generated">Generated Documents</SelectItem>
                <SelectItem value="requests">Requests</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={v => setF("status", v)}>
              <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={filters.search}
              onChange={e => setF("search", e.target.value)}
              placeholder="Search documents..."
              className="h-9 bg-background"
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------- Stat cards (11) ---------- */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3"
        variants={gridContainer} initial="hidden" animate="show"
      >
        <motion.div variants={gridItem}><DashStat label="Total Documents" value={s.totalDocs} icon={FileStack} accent="violet" sub="All categories" /></motion.div>
        <motion.div variants={gridItem}><DashStat label="Employee Docs" value={s.employeeDocsCount} icon={UserSquare} accent="purple" sub="Across employees" /></motion.div>
        <motion.div variants={gridItem}><DashStat label="HR Documents" value={s.hrDocsCount} icon={Building2} accent="fuchsia" sub="Policies & circulars" /></motion.div>
        <motion.div variants={gridItem}><DashStat label="Templates" value={s.templatesCount} icon={Library} accent="sky" sub="Reusable letters" /></motion.div>
        <motion.div variants={gridItem}><DashStat label="Generated Letters" value={s.generatedCount} icon={FileCheck} accent="amber" sub="Lifetime" trend={{ up: true, value: "12%" }} /></motion.div>
        <motion.div variants={gridItem}><DashStat label="Pending Requests" value={s.pendingRequests} icon={Inbox} accent="violet" sub="Awaiting action" /></motion.div>
        <motion.div variants={gridItem}><DashStat label="Pending HR Approval" value={s.pendingHRApproval} icon={Clock} accent="amber" sub="Request queue" /></motion.div>
        <motion.div variants={gridItem}><DashStat label="Pending Employee Upload" value={s.pendingEmployeeUpload} icon={Upload} accent="sky" sub="Onboarding gaps" /></motion.div>
        <motion.div variants={gridItem}><DashStat label="Expiring Documents" value={s.expiringDocs} icon={AlertTriangle} accent="amber" sub="Next 30 days" /></motion.div>
        <motion.div variants={gridItem}><DashStat label="Expired Documents" value={s.expiredDocs} icon={FileX2} accent="rose" sub="Need renewal" /></motion.div>
        <motion.div variants={gridItem}><DashStat label="Rejected Documents" value={s.rejectedDocs} icon={ShieldX} accent="rose" sub="Requests + uploads" /></motion.div>
        <motion.div variants={gridItem}><DashStat label="Favourite Templates" value={s.favouriteTemplates} icon={Star} accent="emerald" sub="Quick access" /></motion.div>
      </motion.div>

      {/* ---------- Charts row 1 ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Distribution donut */}
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">Document Distribution</h3>
              <p className="text-xs text-muted-foreground mt-0.5">By category</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                      {categoryDist.map(d => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold tabular-nums text-foreground">{distTotal}</span>
                  <span className="text-[11px] text-muted-foreground">Documents</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 w-full mt-3">
                {categoryDist.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-muted-foreground truncate flex-1">{d.name}</span>
                    <span className="font-semibold text-foreground tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly generated trend */}
        <Card className="lg:col-span-2 border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Generated Documents Trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Last 6 months</p>
              </div>
              <Badge variant="outline" className="border-violet-500/30 text-violet-700 dark:text-violet-400 gap-1">
                <Sparkles className="h-3 w-3" /> Live
              </Badge>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthTrend} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  <Bar dataKey="count" name="Documents Generated" fill={VIOLET} radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---------- Charts row 2 + Upcoming Expiries ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Entity-wise count (horizontal bar) */}
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">Entity-wise Documents</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Count across all categories</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entityCounts} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={64} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  <Bar dataKey="value" name="Documents" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {entityCounts.map((_, i) => (
                      <Cell key={i} fill={[VIOLET, FUCHSIA, SKY, AMBER][i % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Expiries */}
        <Card className="lg:col-span-2 border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Upcoming Document Expiries</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Top 5 employee documents expiring within 90 days</p>
              </div>
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            {upcomingExpiries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-500 mb-2" />
                <p className="text-sm text-muted-foreground">No documents expiring soon.</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[300px] pr-2">
                <div className="space-y-2">
                  {upcomingExpiries.map(d => {
                    const cat = EMPLOYEE_DOC_CATEGORIES.find(c => c.value === d.category)
                    const tone = d.days <= 7 ? "rose" : d.days <= 30 ? "amber" : "emerald"
                    const toneCls: Record<string, string> = {
                      rose: "border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/5",
                      amber: "border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5",
                      emerald: "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5",
                    }
                    const dayCls: Record<string, string> = {
                      rose: "text-rose-600 dark:text-rose-400",
                      amber: "text-amber-600 dark:text-amber-400",
                      emerald: "text-emerald-600 dark:text-emerald-400",
                    }
                    return (
                      <div key={d.id} className={cn("flex items-center gap-3 rounded-lg border p-3 transition-colors", toneCls[tone])}>
                        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white", avatarColor(d.employeeCode))}>
                          <span className="text-[10px] font-semibold">{initials(d.employeeName)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{d.employeeName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{d.documentName} · {d.employeeCode}</p>
                        </div>
                        {cat && <Badge variant="secondary" className={cn("text-[10px] border-0 hidden md:inline-flex", cat.color)}>{cat.label}</Badge>}
                        <div className="text-right shrink-0">
                          <p className={cn("text-sm font-semibold tabular-nums", dayCls[tone])}>{d.days}d</p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(d.expiryDate)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------- Recent Activity + Quick Actions + Pending Approvals ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent activity timeline */}
        <Card className="lg:col-span-2 border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Last 6 document actions</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onAction("View all logs")} className="text-violet-700 dark:text-violet-400 hover:text-violet-800 hover:bg-violet-50 dark:hover:bg-violet-500/10">
                View all <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
            <ScrollArea className="max-h-[420px] pr-2">
              <ol className="relative space-y-3 border-l border-border/60 ml-3">
                {recentLogs.map(log => {
                  const Icon = ACTION_ICON[log.action] || FileText
                  return (
                    <li key={log.id} className="ml-4">
                      <span className="absolute -left-[13px] grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white ring-4 ring-background">
                        <Icon className="h-3 w-3" />
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div className="min-w-0">
                          <p className="text-sm text-foreground">
                            <span className="font-semibold">{log.action}</span>
                            <span className="text-muted-foreground"> · {log.documentName}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            by {log.performedBy} ({log.performedByRole}) · {log.entityName}
                          </p>
                        </div>
                        <p className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDateTime(log.timestamp)}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="border border-border/60 rounded-xl shadow-soft">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Common document tasks</p>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {[
                { label: "Upload Employee Document", icon: Upload, action: () => onAction("Upload Employee Document dialog opened") },
                { label: "Create HR Document", icon: Building2, action: () => onAction("Create HR Document dialog opened") },
                { label: "Create Template", icon: Library, action: () => onAction("Create Template wizard opened") },
                { label: "Generate Letter", icon: FileSignature, action: () => onAction("Generate Letter dialog opened") },
              ].map(qa => (
                <button
                  key={qa.label}
                  onClick={qa.action}
                  className="group flex items-center gap-2.5 rounded-lg border border-border/60 bg-card p-2.5 text-left transition-all hover:border-violet-500/40 hover:bg-violet-50/40 dark:hover:bg-violet-500/5"
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                    <qa.icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium text-foreground flex-1 truncate">{qa.label}</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-violet-600 transition-colors" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---------- Pending Approvals ---------- */}
      <Card className="border border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pending Approvals</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Document requests awaiting HR & verifications pending</p>
            </div>
            <Badge variant="outline" className="border-violet-500/30 text-violet-700 dark:text-violet-400 gap-1">
              <Clock className="h-3 w-3" /> {pendingHRReqs.length + pendingVerify.length} pending
            </Badge>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pending HR approvals */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending HR Approval</p>
              {pendingHRReqs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4 text-center">No pending requests</p>
              ) : pendingHRReqs.map(r => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border/40 bg-background p-3 hover:border-violet-500/40 hover:bg-violet-50/30 dark:hover:bg-violet-500/5 transition-colors">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                    <Inbox className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{r.documentType}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{r.employeeName} · {r.requestId}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">SLA {r.slaRemaining >= 0 ? `${r.slaRemaining}d` : "overdue"}</p>
                    <p className="text-[10px] text-muted-foreground">{r.pendingWith}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Pending verifications */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending Verification</p>
              {pendingVerify.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4 text-center">No documents to verify</p>
              ) : pendingVerify.map(d => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border/40 bg-background p-3 hover:border-violet-500/40 hover:bg-violet-50/30 dark:hover:bg-violet-500/5 transition-colors">
                  <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white", avatarColor(d.employeeCode))}>
                    <span className="text-[10px] font-semibold">{initials(d.employeeName)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{d.documentName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{d.employeeName} · {d.employeeCode}</p>
                  </div>
                  <Badge variant="secondary" className={cn("text-[10px] border-0", STATUS_COLORS[d.status])}>{d.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------- Footer banner ---------- */}
      <Card className="border border-violet-500/20 rounded-xl shadow-soft bg-gradient-to-r from-violet-50/60 to-purple-50/40 dark:from-violet-500/5 dark:to-purple-500/5">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Document module health is good</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {s.pendingHRApproval} requests need HR action · {s.expiringDocs + s.expiredDocs} documents need attention.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => onAction("Opened document requests")} className="gap-1.5 border-violet-500/40 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10">
            Open Requests <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default DocumentsDashboardSection
