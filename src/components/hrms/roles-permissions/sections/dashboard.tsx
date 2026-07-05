'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { useHrmsStore } from "@/store/hrms-store"
import {
  Shield, Users, FileWarning, AlertTriangle, ArrowRight, History,
  Crown, Layers, Activity, Sparkles,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"

import { StatCard, SectionCard, EmptyState } from "@/components/hrms/ui"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ROLE_TYPE_MAP, RISK_LEVEL_MAP, MODULE_MAP,
} from "@/lib/permissions-constants"

interface DashboardData {
  stats: { totalRoles: number; activeUsers: number; pendingRequests: number; criticalPermissions: number }
  rolesByType: { type: string; count: number }[]
  riskDistribution: { level: string; count: number }[]
  topRolesByUsers: { roleId: string; name: string; userCount: number }[]
  moduleCoverage: { module: string; label: string; group: string; riskLevel: string; roleCount: number }[]
  recentChanges: { id: string; action: string; roleName: string | null; performedByName: string | null; createdAt: string; status: string }[]
}

const TYPE_COLORS: Record<string, string> = {
  System: "#8b5cf6", Custom: "#10b981", Functional: "#0ea5e9", Implicit: "#f59e0b", Workflow: "#f43f5e", Temporary: "#06b6d4",
}

const ACTION_LABELS: Record<string, string> = {
  RoleCreated: "Created", RoleUpdated: "Updated", RoleDeleted: "Deleted", PermissionChanged: "Permission Changed", RoleCloned: "Cloned",
}
const ACTION_COLORS: Record<string, string> = {
  RoleCreated: "bg-emerald-100 text-emerald-700", RoleUpdated: "bg-amber-100 text-amber-700", RoleDeleted: "bg-rose-100 text-rose-700", PermissionChanged: "bg-sky-100 text-sky-700", RoleCloned: "bg-violet-100 text-violet-700",
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function DashboardSection() {
  const { setSubModule } = useHrmsStore()
  const [data, setData] = React.useState<DashboardData | null>(null)
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/roles-permissions/dashboard")
      if (r.ok) setData(await r.json())
    } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  const maxCoverage = Math.max(...data.moduleCoverage.map(m => m.roleCount), 1)

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Roles"
          value={data.stats.totalRoles}
          icon={Shield}
          accent="emerald"
          spark={data.rolesByType.map(r => r.count)}
          sub="Active roles in system"
        />
        <StatCard
          label="Active User-Role Assignments"
          value={data.stats.activeUsers}
          icon={Users}
          accent="cyan"
          sub="Users with role assignments"
        />
        <StatCard
          label="Pending Access Requests"
          value={data.stats.pendingRequests}
          icon={FileWarning}
          accent="amber"
          sub="Awaiting approval"
        />
        <StatCard
          label="Critical Permissions"
          value={data.stats.criticalPermissions}
          icon={AlertTriangle}
          accent="coral"
          sub="High-risk module grants"
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="default" className="gap-1.5 bg-gradient-to-r from-violet-500 to-emerald-500" onClick={() => setSubModule("roles")}>
          <Shield className="h-4 w-4" /> Manage Roles <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSubModule("matrix")}>
          <Layers className="h-4 w-4" /> Permission Matrix
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSubModule("users")}>
          <Users className="h-4 w-4" /> Assign Roles
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSubModule("logs")}>
          <History className="h-4 w-4" /> Audit Logs
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSubModule("access-requests")}>
          <FileWarning className="h-4 w-4" /> Access Requests
        </Button>
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Roles by Type donut */}
        <SectionCard title="Roles by Type" description="Distribution across role categories">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.rolesByType}
                  dataKey="count"
                  nameKey="type"
                  cx="50%" cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {data.rolesByType.map((entry, i) => (
                    <Cell key={i} fill={TYPE_COLORS[entry.type] || "#64748b"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  formatter={(v: any, n: any) => [`${v} role(s)`, ROLE_TYPE_MAP[n as string]?.label || n]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => ROLE_TYPE_MAP[v as string]?.label || v} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Risk distribution */}
        <SectionCard title="Risk Distribution" description="Roles by risk classification">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.riskDistribution} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="level" width={70} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  formatter={(v: any) => [`${v} role(s)`, "Count"]}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {data.riskDistribution.map((entry, i) => (
                    <Cell key={i} fill={
                      entry.level === "Critical" ? "#f43f5e" :
                      entry.level === "High" ? "#fb923c" :
                      entry.level === "Medium" ? "#f59e0b" : "#10b981"
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Top roles by users */}
        <SectionCard title="Top Roles by Users" description="Most assigned roles">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topRolesByUsers} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  formatter={(v: any) => [`${v} user(s)`, "Assigned"]}
                />
                <Bar dataKey="userCount" radius={[0, 6, 6, 0]} fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Module coverage heatmap */}
      <SectionCard
        title="Module Coverage Heatmap"
        description="How many roles have access to each module (color intensity = more roles)"
        action={<Badge variant="outline" className="text-[10px]">Max: {maxCoverage}</Badge>}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {data.moduleCoverage.map(m => {
            const intensity = m.roleCount / maxCoverage
            const heatColor = m.roleCount === 0
              ? "bg-slate-100 dark:bg-slate-800/40"
              : intensity > 0.66 ? "bg-emerald-500/80 text-white"
              : intensity > 0.33 ? "bg-emerald-400/60 text-emerald-950"
              : "bg-emerald-300/40 text-emerald-900"
            return (
              <div
                key={m.module}
                className={`rounded-lg p-3 border border-border/40 transition-all hover:scale-[1.02] ${heatColor}`}
                title={`${m.label}: ${m.roleCount} role(s)`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{m.group}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${RISK_LEVEL_MAP[m.riskLevel]?.dot || "bg-slate-400"}`} />
                </div>
                <p className="text-xs font-medium mt-1 leading-tight">{m.label}</p>
                <p className="text-lg font-bold mt-1">{m.roleCount}</p>
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* Recent changes */}
      <SectionCard title="Recent Permission Changes" description="Last 5 role-related audit events" action={
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setSubModule("logs")}>
          View all <ArrowRight className="h-3 w-3" />
        </Button>
      }>
        {data.recentChanges.length === 0 ? (
          <EmptyState icon={History} title="No recent changes" description="Permission changes will appear here." />
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {data.recentChanges.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/50 p-3 hover:bg-muted/30 transition-colors"
              >
                <div className={`grid h-9 w-9 place-items-center rounded-lg ${ACTION_COLORS[c.action] || "bg-muted"}`}>
                  <Activity className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{ACTION_LABELS[c.action] || c.action}</span>
                    {c.roleName && <Badge variant="outline" className="text-[10px]">{c.roleName}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    by {c.performedByName || "System"} · {timeAgo(c.createdAt)}
                  </p>
                </div>
                <Badge variant="secondary" className={`text-[10px] ${c.status === "Failed" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {c.status}
                </Badge>
              </motion.div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
