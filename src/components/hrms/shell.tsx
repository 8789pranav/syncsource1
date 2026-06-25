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
  Bell, Search, Menu, ChevronLeft, Sparkles, ShieldCheck, HelpCircle, LogOut,
  Wallet, Banknote, UserPlus, UserMinus, ArrowLeftRight, Receipt,
  FileStack,
} from "lucide-react"
import { useHrmsStore } from "@/store/hrms-store"
import { ModuleId, ModuleDef } from "@/lib/types"

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
  const { activeModule, activeSubModule, setModule, sidebarOpen } = useHrmsStore()
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
      onClick={() => setModule(m.id as ModuleId, m.payrollMenu ?? null)}
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
        !sidebarOpen && "justify-center px-0",
      )}
    >
      {/* Left rail indicator for child items (when collapsed, hide since we center icon) */}
      {m.isChild && sidebarOpen && (
        <span
          className={cn(
            "absolute left-2 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full",
            active ? "bg-white/70" : "bg-sidebar-border group-hover:bg-muted-foreground/40",
          )}
        />
      )}
      <Icon className={cn("h-[16px] w-[16px] shrink-0", active ? (m.isChild ? "text-white" : "text-primary-foreground") : "text-muted-foreground group-hover:text-sidebar-accent-foreground", m.isChild && "h-[15px] w-[15px]")} />
      {sidebarOpen && (
        <span className={cn("truncate", m.isChild && "text-[13px]")}>{m.label}</span>
      )}
    </button>
  )
}

function Sidebar() {
  const { sidebarOpen, setSidebar, toggleSidebar } = useHrmsStore()
  return (
    <aside
      className={cn(
        "sticky top-0 h-screen shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col transition-[width] duration-200 z-30",
        sidebarOpen ? "w-64" : "w-16",
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-sidebar-border", sidebarOpen ? "px-4 justify-between" : "px-2 justify-center")}>
        {sidebarOpen ? <Logo /> : (
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-emerald text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
        )}
      </div>
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-4">
          {GROUPS.map((g) => {
            const items = MODULES.filter((m) => m.group === g.id)
            if (items.length === 0) return null
            return (
              <div key={g.id}>
                {sidebarOpen && <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</p>}
                <div className="space-y-0.5">
                  {items.map((m) => <NavItem key={m.id + (m.payrollMenu ? `-${m.payrollMenu}` : "")} m={m} />)}
                </div>
              </div>
            )
          })}
        </nav>
      </ScrollArea>
      <div className={cn("border-t border-sidebar-border p-3", !sidebarOpen && "px-2")}>
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
          {sidebarOpen && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}

function Topbar() {
  const { theme, setTheme } = useTheme()
  const { toggleSidebar, activeModule } = useHrmsStore()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const current = MODULES.find((m) => m.id === activeModule)

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 sm:px-6">
      <button onClick={toggleSidebar} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted text-muted-foreground">
        <Menu className="h-[18px] w-[18px]" />
      </button>
      <div className="hidden md:block min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{current?.label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{current?.description}</p>
      </div>
      <div className="relative hidden lg:block w-full max-w-sm ml-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search employees, requests, assets..." className="pl-9 h-9 bg-muted/40 border-0 focus-visible:ring-1" />
      </div>
      <div className="flex items-center gap-1.5 ml-auto lg:ml-2">
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
            <button className="flex items-center gap-2 rounded-lg hover:bg-muted p-1 pr-2 transition-colors">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">HR</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-semibold text-foreground">HR Admin</p>
                <p className="text-[10px] text-muted-foreground">ACME Corp</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem><ShieldCheck className="mr-2 h-4 w-4" /> Permissions</DropdownMenuItem>
            <DropdownMenuItem><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
            <DropdownMenuItem><HelpCircle className="mr-2 h-4 w-4" /> Help & Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-600 focus:text-rose-600"><LogOut className="mr-2 h-4 w-4" /> Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar />
        <main className="flex-1 px-4 sm:px-6 py-5">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  )
}

export { MODULES }
