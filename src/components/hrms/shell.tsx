'use client'

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LayoutDashboard, Building2, Users, CalendarDays, CalendarRange, Clock,
  Package, FileEdit, Workflow, Megaphone, Settings, ScrollText, Sun, Moon,
  Bell, Search, Menu, ChevronLeft, Sparkles, ShieldCheck, HelpCircle, LogOut, X,
  Wallet, Banknote, UserPlus, UserMinus, ArrowLeftRight, Receipt,
  FileStack, ShieldAlert,
} from "lucide-react"
import { useHrmsStore } from "@/store/hrms-store"
import { ModuleId, ModuleDef } from "@/lib/types"
import { ROLE_TYPE_MAP, RISK_LEVEL_MAP } from "@/lib/permissions-constants"
import { ViewAsRoleDropdown } from "@/components/hrms/permissions/view-as-dropdown"
import { ViewAsBanner } from "@/components/hrms/permissions/view-as-banner"
import { AccessDenied } from "@/components/hrms/permissions/access-denied"
import { MyPermissionsDialog } from "@/components/hrms/permissions/my-permissions-dialog"
import { usePermissions } from "@/lib/use-permissions"
import { apiFetch } from "@/lib/api-client"

// Hook: loads current-user permissions on mount
function usePermissionInit() {
  const { allowedModules, permissionsLoaded, setCurrentUser } = useHrmsStore()
  React.useEffect(() => {
    if (permissionsLoaded) return // already loaded
    // Load default HR Admin permissions on first load
    apiFetch("/api/roles-permissions/me")
      .then(r => r.json())
      .then(data => {
        const d = data?.data || data
        if (d?.allowedModules) {
          setCurrentUser({
            userId: d.userId || "default",
            userName: d.userName || "HR Admin",
            roleCode: d.roleCode || "HR_ADMIN",
            roleName: d.roleName,
            roleType: d.roleType,
            riskLevel: d.riskLevel,
            allowedModules: d.allowedModules,
            deniedModules: d.deniedModules || [],
            fieldAccess: d.fieldAccess || {},
            dataScopes: d.dataScopes || [],
            conflicts: d.conflicts || [],
            moduleAccess: d.moduleAccess || {},
            isViewAs: false,
            viewAsRoleId: null,
          })
        }
      })
      .catch(() => {
        // On error, allow everything
        setCurrentUser({
          userId: "default",
          userName: "HR Admin",
          roleCode: "HR_ADMIN",
          allowedModules: ["dashboard","organization","employees","onboarding","offboarding","leave","shift","roster","attendance","holiday","payroll","documents","asset","announcements","forms","workflows","roles-permissions","audit","settings"],
        })
      })
  }, [allowedModules, permissionsLoaded, setCurrentUser])
}

type ShellModule = ModuleDef & { icon: any; payrollMenu?: string; isChild?: boolean }

const MODULES: ShellModule[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Main", description: "Overview & analytics" },
  { id: "organization", label: "Organization", icon: Building2, group: "Config", description: "Entities, branches, departments" },
  { id: "employees", label: "Employees", icon: Users, group: "People", description: "Employee master" },
  { id: "onboarding", label: "Onboarding", icon: UserPlus, group: "People", description: "Workflow-driven kanban boards" },
  { id: "offboarding", label: "Offboarding", icon: UserMinus, group: "People", description: "Exit management & FnF settlement" },
  { id: "leave", label: "Leave", icon: CalendarDays, group: "Time", description: "Types, policies, applications" },
  { id: "shift", label: "Shifts", icon: Clock, group: "Time", description: "Shift master & assignments" },
  { id: "roster", label: "Roster", icon: CalendarRange, group: "Time", description: "Roster planning" },
  { id: "attendance", label: "Attendance", icon: CalendarRange, group: "Time", description: "Daily attendance" },
  { id: "holiday", label: "Holidays", icon: CalendarDays, group: "Time", description: "Holiday calendar" },
  { id: "asset", label: "Assets", icon: Package, group: "Config", description: "Asset master & assignment" },
  // Payroll & Finance group — parent + 4 deep-link children for direct sidebar visibility
  { id: "payroll", label: "Payroll", icon: Banknote, group: "Payroll", description: "Salary, runs & payslips" },
  { id: "payroll", label: "Salary", icon: Wallet, group: "Payroll", description: "Run monthly payroll, pay groups, structures & payslips", payrollMenu: "salary", isChild: true },
  { id: "payroll", label: "Compliance", icon: ShieldCheck, group: "Payroll", description: "PF, ESI, PT, LWF, TDS, Form 16 & challans", payrollMenu: "compliance", isChild: true },
  { id: "payroll", label: "Arrear", icon: ArrowLeftRight, group: "Payroll", description: "Salary arrears from revisions, LOP reversal & manual entries", payrollMenu: "arrear", isChild: true },
  { id: "payroll", label: "Full & Final", icon: Receipt, group: "Payroll", description: "Exit settlement, leave encashment, notice & asset recovery", payrollMenu: "fnf", isChild: true },
  { id: "documents", label: "Documents", icon: FileStack, group: "Documents", description: "Universal document library, employee/HR docs, requests, generated letters & entity-wise config" },
  { id: "roles-permissions", label: "Roles & Permissions", icon: ShieldAlert, group: "Access", description: "Enterprise access control: roles, users, permission matrix, data scopes, approval roles, delegation & audit" },
  { id: "forms", label: "Form Builder", icon: FileEdit, group: "System", description: "Dynamic form schemas" },
  { id: "workflows", label: "Workflows", icon: Workflow, group: "System", description: "Approval workflows" },
  { id: "announcements", label: "Announcements", icon: Megaphone, group: "People", description: "Company announcements" },
  { id: "audit", label: "Audit Log", icon: ScrollText, group: "System", description: "Activity history" },
  { id: "settings", label: "Settings", icon: Settings, group: "System", description: "Tenant configuration" },
]

const GROUPS: { id: string; label: string }[] = [
  { id: "Main", label: "Overview" },
  { id: "People", label: "People" },
  { id: "Time", label: "Time & Attendance" },
  { id: "Payroll", label: "Payroll & Finance" },
  { id: "Documents", label: "Documents" },
  { id: "Access", label: "Access Control" },
  { id: "Config", label: "Configuration" },
  { id: "System", label: "System" },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-xl gradient-emerald text-primary-foreground shadow-soft shrink-0">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <p className="font-semibold text-sm text-foreground">Nexus HR</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">HRMS Platform</p>
      </div>
    </div>
  )
}

function NavItem({ m }: { m: ShellModule }) {
  const { activeModule, activeSubModule, setModule, sidebarOpen, mobileNavOpen, setMobileNavOpen } = useHrmsStore()
  const showFull = sidebarOpen || mobileNavOpen
  // For payroll children: active only when both module and sub-menu match.
  // For non-child items: active when module matches (and either no payrollMenu, or sub-module is null/undefined).
  const isChildPayroll = !!m.payrollMenu
  const active = isChildPayroll
    ? activeModule === m.id && activeSubModule === m.payrollMenu
    : activeModule === m.id && (!activeSubModule || activeSubModule === "" || !MODULES.some(x => x.payrollMenu === activeSubModule))
  const Icon = m.icon

  // Accent colors per payroll child for visual identity (matches internal payroll menu colors)
  const childAccent: Record<string, string> = {
    salary: "from-teal-500 to-cyan-500",
    compliance: "from-emerald-500 to-teal-500",
    arrear: "from-amber-500 to-orange-500",
    fnf: "from-rose-500 to-pink-500",
  }
  const accent = m.payrollMenu ? childAccent[m.payrollMenu] : ""

  return (
    <button
      onClick={() => { setModule(m.id as ModuleId, m.payrollMenu ?? null); setMobileNavOpen(false) }}
      title={m.label}
      className={cn(
        "group relative flex w-full items-center gap-2 rounded-lg text-sm font-medium transition-all",
        m.isChild
          ? "pl-7 pr-2.5 py-1.5"
          : "px-2.5 py-2",
        active
          ? m.isChild
            ? cn("bg-gradient-to-r text-white shadow-sm", accent)
            : "bg-primary text-primary-foreground shadow-soft"
          : m.isChild
            ? "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        !showFull && "justify-center px-0",
      )}
    >
      {/* Left rail indicator for child items (when collapsed, hide since we center icon) */}
      {m.isChild && showFull && (
        <span
          className={cn(
            "absolute left-2 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full",
            active ? "bg-white/70" : "bg-sidebar-border group-hover:bg-muted-foreground/40",
          )}
        />
      )}
      <Icon className={cn("h-[16px] w-[16px] shrink-0", active ? (m.isChild ? "text-white" : "text-primary-foreground") : "text-muted-foreground group-hover:text-sidebar-accent-foreground", m.isChild && "h-[15px] w-[15px]")} />
      {showFull && (
        <span className={cn("truncate", m.isChild && "text-[13px]")}>{m.label}</span>
      )}
    </button>
  )
}

function Sidebar() {
  const { sidebarOpen, setSidebar, toggleSidebar, mobileNavOpen, setMobileNavOpen, allowedModules } = useHrmsStore()
  const showFull = sidebarOpen || mobileNavOpen
  // Filter modules by permission
  const visibleModules = React.useMemo(() => {
    if (!allowedModules) return MODULES // null = not loaded yet = show all
    const set = new Set(allowedModules)
    return MODULES.filter(m => {
      // Always show payroll children if payroll is allowed
      if (m.isChild && m.id === "payroll") return set.has("payroll")
      return set.has(m.id as ModuleId)
    })
  }, [allowedModules])
  return (
    <>
      {/* Mobile backdrop overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "flex flex-col overflow-hidden border-r border-sidebar-border bg-sidebar h-screen",
          // Mobile: fixed overlay drawer, slide in/out
          "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200 lg:translate-x-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Desktop: sticky, width transitions between w-64 and w-16
          "lg:sticky lg:top-0 lg:z-30 lg:transition-[width] lg:duration-200",
          sidebarOpen ? "lg:w-64" : "lg:w-16",
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-sidebar-border shrink-0", showFull ? "px-4 justify-between" : "px-2 justify-center")}>
          {showFull ? <Logo /> : (
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-emerald text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
          )}
          {/* Close button on mobile */}
          {mobileNavOpen && (
            <button
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden grid h-8 w-8 place-items-center rounded-lg hover:bg-sidebar-accent text-muted-foreground"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <ScrollArea className="flex-1 min-h-0 px-2 py-3">
          <nav className="space-y-4">
            {GROUPS.map((g) => {
              const items = visibleModules.filter((m) => m.group === g.id)
              if (items.length === 0) return null
              return (
                <div key={g.id}>
                  {showFull && <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</p>}
                  <div className="space-y-0.5">
                    {items.map((m) => <NavItem key={m.id + (m.payrollMenu ? `-${m.payrollMenu}` : "")} m={m} />)}
                  </div>
                </div>
              )
            })}
          </nav>
        </ScrollArea>
        <div className={cn("border-t border-sidebar-border p-3 shrink-0", !showFull && "px-2")}>
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  )
}

function Topbar() {
  const { theme, setTheme } = useTheme()
  const { toggleSidebar, setMobileNavOpen, activeModule, currentUserName, currentUserRole, currentRoleName, currentRoleType, currentRiskLevel, isViewAs } = useHrmsStore()
  const perm = usePermissions()
  const [mounted, setMounted] = React.useState(false)
  const [myPermOpen, setMyPermOpen] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const current = MODULES.find((m) => m.id === activeModule)

  // Build role badge info
  const rt = ROLE_TYPE_MAP[currentRoleType || ""] || null
  const rl = RISK_LEVEL_MAP[currentRiskLevel || ""] || null
  const initials = (currentUserName || "HR").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 sm:px-6">
      <button onClick={() => { if (window.innerWidth < 1024) setMobileNavOpen(true); else toggleSidebar() }} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted text-muted-foreground" aria-label="Toggle menu">
        <Menu className="h-[18px] w-[18px]" />
      </button>
      <div className="hidden md:block min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{current?.label}</p>
          {perm.loaded && currentRoleName && (
            <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5 gap-1 shrink-0", isViewAs ? "border-amber-400 text-amber-700 bg-amber-50" : "border-border text-muted-foreground")}>
              {rt && <span className={cn("h-1.5 w-1.5 rounded-full", rt.color)} />}
              {currentRoleName}
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{current?.description}</p>
      </div>
      <div className="relative hidden lg:block w-full max-w-sm ml-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search employees, requests, assets..." className="pl-9 h-9 bg-muted/40 border-0 focus-visible:ring-1" />
      </div>
      <div className="flex items-center gap-1.5 ml-auto lg:ml-2">
        <ViewAsRoleDropdown />
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme">
          {mounted && theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg relative">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Badge variant="secondary" className="text-[10px]">3 new</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { t: "Leave request from Aarav Sharma", s: "2 min ago", c: "Pending approval" },
              { t: "Asset request — new laptop", s: "1 hr ago", c: "Pending approval" },
              { t: "Diwali holiday calendar updated", s: "3 hrs ago", c: "System" },
            ].map((n, i) => (
              <DropdownMenuItem key={i} className="flex-col items-start py-2.5">
                <p className="text-sm font-medium">{n.t}</p>
                <p className="text-xs text-muted-foreground">{n.s} · {n.c}</p>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid="user-menu-trigger" className="flex items-center gap-2 rounded-lg hover:bg-muted p-1 pr-2 transition-colors">
              <Avatar className={cn("h-8 w-8 border border-border", isViewAs && "ring-2 ring-amber-400 ring-offset-1 ring-offset-background")}>
                <AvatarFallback className={cn("text-xs font-semibold", isViewAs ? "bg-amber-500 text-white" : "bg-primary/10 text-primary")}>{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-semibold text-foreground truncate max-w-[120px]">{currentUserName || "HR Admin"}</p>
                <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {currentRoleName || "ACME Corp"}
                  {isViewAs && <span className="text-amber-600"> · view-as</span>}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-2 py-2">
              <p className="text-sm font-semibold">{currentUserName || "HR Admin"}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {currentRoleName && <Badge variant="secondary" className="text-[10px] h-5">{currentRoleName}</Badge>}
                {rt && <Badge variant="outline" className="text-[9px] h-5 gap-1"><span className={cn("h-1.5 w-1.5 rounded-full", rt.color)} />{rt.label}</Badge>}
                {rl && <Badge variant="outline" className="text-[9px] h-5">{rl.label} risk</Badge>}
              </div>
              {perm.loaded && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {perm.allowedModules?.length || 0} modules accessible · {Object.values(perm.fieldAccess || {}).reduce((n, m) => n + Object.keys(m).length, 0)} field rules
                </p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setMyPermOpen(true)}><ShieldCheck className="mr-2 h-4 w-4" /> My Permissions</DropdownMenuItem>
            <DropdownMenuItem onClick={() => useHrmsStore.getState().setModule("settings" as any)}><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
            <DropdownMenuItem><HelpCircle className="mr-2 h-4 w-4" /> Help & Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-600 focus:text-rose-600"><LogOut className="mr-2 h-4 w-4" /> Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <MyPermissionsDialog open={myPermOpen} onOpenChange={setMyPermOpen} />
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/20">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-6 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">Nexus HR</span>
          <span>·</span>
          <span>Industry-grade HRMS v1.0</span>
          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">Phase 1</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Link href="#" className="hover:text-foreground">Privacy</Link>
          <Link href="#" className="hover:text-foreground">Terms</Link>
          <Link href="#" className="hover:text-foreground">Docs</Link>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> All systems operational
          </span>
        </div>
      </div>
    </footer>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  usePermissionInit() // Load current-user permissions on mount
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar />
        <ViewAsBanner />
        <main className="flex-1 px-4 sm:px-6 py-5">
          <div className="mx-auto w-full max-w-[1400px]">
            <AccessGate>{children}</AccessGate>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  )
}

// Wraps children — if the active module isn't accessible, show AccessDenied
function AccessGate({ children }: { children: React.ReactNode }) {
  const activeModule = useHrmsStore(s => s.activeModule)
  const perm = usePermissions()
  // While permissions haven't loaded yet, show children (avoid flash)
  if (!perm.loaded) return <>{children}</>
  // Dashboard is always accessible
  if (activeModule === "dashboard") return <>{children}</>
  // If allowedModules is null (not loaded) or includes the module, allow
  if (!perm.allowedModules || perm.allowedModules.includes(activeModule as any)) {
    return <>{children}</>
  }
  return <AccessDenied module={activeModule as string} />
}

export { MODULES }
