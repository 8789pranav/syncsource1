'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { useHrmsStore } from "@/store/hrms-store"
import {
  LayoutDashboard, Shield, Users, Grid3x3, Filter, GitBranch, Send,
  Settings as SettingsIcon, ScrollText, UserCog, ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

import { DashboardSection } from "@/components/hrms/roles-permissions/sections/dashboard"
import { RolesSection } from "@/components/hrms/roles-permissions/sections/roles"
import { UsersSection } from "@/components/hrms/roles-permissions/sections/users"
import { PermissionMatrixSection } from "@/components/hrms/roles-permissions/sections/permission-matrix"
import { DataAccessRulesSection } from "@/components/hrms/roles-permissions/sections/data-access-rules"
import { ApprovalRolesSection } from "@/components/hrms/roles-permissions/sections/approval-roles"
import { DelegationSection } from "@/components/hrms/roles-permissions/sections/delegation"
import { AccessRequestsSection } from "@/components/hrms/roles-permissions/sections/access-requests"
import { SettingsSection } from "@/components/hrms/roles-permissions/sections/settings"
import { LogsSection } from "@/components/hrms/roles-permissions/sections/logs"

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: "from-emerald-500 to-teal-500" },
  { id: "roles", label: "Roles", icon: Shield, color: "from-violet-500 to-purple-500" },
  { id: "users", label: "Users", icon: Users, color: "from-sky-500 to-cyan-500" },
  { id: "matrix", label: "Permission Matrix", icon: Grid3x3, color: "from-amber-500 to-orange-500" },
  { id: "data-rules", label: "Data Access Rules", icon: Filter, color: "from-rose-500 to-pink-500" },
  { id: "approval-roles", label: "Approval Roles", icon: GitBranch, color: "from-teal-500 to-emerald-500" },
  { id: "delegation", label: "Delegation", icon: Send, color: "from-cyan-500 to-blue-500" },
  { id: "access-requests", label: "Access Requests", icon: UserCog, color: "from-fuchsia-500 to-pink-500" },
  { id: "settings", label: "Settings", icon: SettingsIcon, color: "from-slate-500 to-zinc-500" },
  { id: "logs", label: "Logs", icon: ScrollText, color: "from-orange-500 to-red-500" },
] as const

type TabId = typeof TABS[number]["id"]

export function RolesPermissionsModule() {
  const { activeSubModule, setSubModule } = useHrmsStore()
  const [tab, setTab] = React.useState<TabId>((activeSubModule as TabId) || "dashboard")

  React.useEffect(() => {
    if (activeSubModule && TABS.some(t => t.id === activeSubModule)) {
      setTab(activeSubModule as TabId)
    }
  }, [activeSubModule])

  const handleTab = (t: TabId) => {
    setTab(t)
    setSubModule(t)
  }

  return (
    <div className="space-y-4">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-violet-50 via-white to-emerald-50 dark:from-violet-950/30 dark:via-slate-900 dark:to-emerald-950/20 p-5 sm:p-6"
      >
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="hidden sm:grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-emerald-500 text-white shadow-lg shadow-violet-500/30 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">Roles & Permissions</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Enterprise Access Control
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
              Manage who can see what, who can edit what, who can approve what, and which employee data is visible.
              Layered access control with role types, data scopes, field-level permissions, approval roles, delegation
              and full audit trails.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tab navigation */}
      <div className="sticky top-16 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/80 backdrop-blur-md border-b border-border/60">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => handleTab(t.id)}
                className={cn(
                  "group relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                  active
                    ? "text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {active && (
                  <span className={cn("absolute inset-0 -z-10 rounded-lg bg-gradient-to-r", t.color)} />
                )}
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Section content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tab === "dashboard" && <DashboardSection />}
        {tab === "roles" && <RolesSection />}
        {tab === "users" && <UsersSection />}
        {tab === "matrix" && <PermissionMatrixSection />}
        {tab === "data-rules" && <DataAccessRulesSection />}
        {tab === "approval-roles" && <ApprovalRolesSection />}
        {tab === "delegation" && <DelegationSection />}
        {tab === "access-requests" && <AccessRequestsSection />}
        {tab === "settings" && <SettingsSection />}
        {tab === "logs" && <LogsSection />}
      </motion.div>
    </div>
  )
}
