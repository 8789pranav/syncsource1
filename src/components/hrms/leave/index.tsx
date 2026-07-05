'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { CalendarDays, Plus, CheckCheck, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/hrms/ui"
import { useHrmsStore } from "@/store/hrms-store"
import { toast } from "sonner"

import { DashboardSection } from "./sections/dashboard"
import { MyLeaveSection } from "./sections/my-leave"
import { TeamLeaveSection } from "./sections/team-leave"
import { RequestsSection } from "./sections/requests"
import { CalendarSection } from "./sections/calendar"
import { BalanceSection } from "./sections/balance"
import { LedgerSection } from "./sections/ledger"
import { TypesSection } from "./sections/types"
import { RulesSection } from "./sections/rules"
import { ClubbingRulesSection } from "./sections/clubbing-rules"
import { SandwichRulesSection } from "./sections/sandwich-rules"
import { HolidaysSection } from "./sections/holidays"
import { WeeklyOffSection } from "./sections/weekly-off"
import { EncashmentSection } from "./sections/encashment"
import { CarryForwardSection } from "./sections/carry-forward"
import { CompOffSection } from "./sections/comp-off"
import { AdjustmentSection } from "./sections/adjustment"
import { BulkActionsSection } from "./sections/bulk-actions"
import { ReportsSection } from "./sections/reports"
import { SettingsSection } from "./sections/settings"

// ============================================================
// Sub-nav definition
// ============================================================

interface NavItemDef {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  group: "Employee" | "Administration" | "Configuration"
}

import {
  LayoutDashboard, CalendarCheck, Users, Inbox, CalendarRange, Scale,
  BookOpen, ShieldCheck, CalendarOff, Banknote, Repeat,
  Coffee, Sliders, Layers, FileBarChart, Settings as SettingsIcon,
  GitMerge, Sandwich,
} from "lucide-react"

const NAV_ITEMS: NavItemDef[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Employee" },
  { id: "my-leave", label: "My Leave", icon: CalendarCheck, group: "Employee" },
  { id: "team-leave", label: "Team Leave", icon: Users, group: "Employee" },
  { id: "requests", label: "Leave Requests", icon: Inbox, group: "Administration" },
  { id: "calendar", label: "Leave Calendar", icon: CalendarRange, group: "Administration" },
  { id: "balance", label: "Leave Balance", icon: Scale, group: "Administration" },
  { id: "ledger", label: "Leave Ledger", icon: BookOpen, group: "Administration" },
  { id: "types", label: "Leave Types", icon: CalendarDays, group: "Configuration" },
  { id: "rules", label: "Leave Rules", icon: ShieldCheck, group: "Configuration" },
  { id: "clubbing", label: "Clubbing Rules", icon: GitMerge, group: "Configuration" },
  { id: "sandwich", label: "Sandwich Rules", icon: Sandwich, group: "Configuration" },
  { id: "holidays", label: "Holiday Calendar", icon: CalendarDays, group: "Configuration" },
  { id: "weekly-off", label: "Weekly Off", icon: CalendarOff, group: "Configuration" },
  { id: "encashment", label: "Leave Encashment", icon: Banknote, group: "Administration" },
  { id: "carry-forward", label: "Carry Forward", icon: Repeat, group: "Administration" },
  { id: "comp-off", label: "Comp-Off", icon: Coffee, group: "Administration" },
  { id: "adjustment", label: "Leave Adjustment", icon: Sliders, group: "Administration" },
  { id: "bulk-actions", label: "Bulk Actions", icon: Layers, group: "Administration" },
  { id: "reports", label: "Reports", icon: FileBarChart, group: "Administration" },
  { id: "settings", label: "Settings", icon: SettingsIcon, group: "Configuration" },
]

const GROUPS: { id: NavItemDef["group"]; label: string }[] = [
  { id: "Employee", label: "Employee" },
  { id: "Administration", label: "Administration" },
  { id: "Configuration", label: "Configuration" },
]

// ============================================================
// Section renderer
// ============================================================

function Section({ id, onApplyLeave }: { id: string; onApplyLeave: () => void }) {
  switch (id) {
    case "dashboard": return <DashboardSection onApplyLeave={onApplyLeave} />
    case "my-leave": return <MyLeaveSection onApplyLeave={onApplyLeave} />
    case "team-leave": return <TeamLeaveSection />
    case "requests": return <RequestsSection />
    case "calendar": return <CalendarSection />
    case "balance": return <BalanceSection />
    case "ledger": return <LedgerSection />
    case "types": return <TypesSection />
    case "rules": return <RulesSection />
    case "clubbing": return <ClubbingRulesSection />
    case "sandwich": return <SandwichRulesSection />
    case "holidays": return <HolidaysSection />
    case "weekly-off": return <WeeklyOffSection />
    case "encashment": return <EncashmentSection />
    case "carry-forward": return <CarryForwardSection />
    case "comp-off": return <CompOffSection />
    case "adjustment": return <AdjustmentSection />
    case "bulk-actions": return <BulkActionsSection />
    case "reports": return <ReportsSection />
    case "settings": return <SettingsSection />
    default: return <DashboardSection onApplyLeave={onApplyLeave} />
  }
}

// ============================================================
// Main module
// ============================================================

export function LeaveModule() {
  const { activeSubModule, setSubModule } = useHrmsStore()
  const [active, setActive] = React.useState<string>(activeSubModule || "dashboard")
  const [applyOpenSignal, setApplyOpenSignal] = React.useState(0)

  const setSection = (id: string) => {
    setActive(id)
    setSubModule(id)
  }

  // Trigger the apply-leave dialog (rendered inside MyLeave section)
  const triggerApplyLeave = () => {
    setSection("my-leave")
    setApplyOpenSignal((n) => n + 1)
  }

  const currentNav = NAV_ITEMS.find((n) => n.id === active)

  return (
    <div className="min-h-full space-y-4">
      <PageHeader
        title="Leave Management"
        description="Apply, approve, configure and report on leave — types, rules, balances, ledger and more."
        icon={CalendarDays}
        actions={
          <>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.info("Exporting leave report…")}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSection("requests")}>
              <CheckCheck className="h-4 w-4" /> Bulk Approve
            </Button>
            <Button size="sm" className="gap-1.5" onClick={triggerApplyLeave}>
              <Plus className="h-4 w-4" /> Apply Leave
            </Button>
          </>
        }
      />

      <div className="flex flex-col md:flex-row gap-4">
        {/* Left sub-nav rail — desktop */}
        <aside className="hidden md:block w-56 shrink-0">
          <div className="sticky top-20 space-y-4">
            {GROUPS.map((g) => {
              const items = NAV_ITEMS.filter((n) => n.group === g.id)
              if (!items.length) return null
              return (
                <div key={g.id}>
                  <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.label}
                  </p>
                  <nav className="space-y-0.5">
                    {items.map((n) => {
                      const Icon = n.icon
                      const isActive = active === n.id
                      return (
                        <button
                          key={n.id}
                          onClick={() => setSection(n.id)}
                          className={cn(
                            "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-soft"
                              : "text-foreground/80 hover:bg-muted",
                          )}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                          <span className="truncate">{n.label}</span>
                        </button>
                      )
                    })}
                  </nav>
                </div>
              )
            })}
          </div>
        </aside>

        {/* Mobile horizontal strip */}
        <div className="md:hidden -mx-1 px-1 overflow-x-auto pb-2">
          <div className="flex items-center gap-1.5 min-w-min">
            {NAV_ITEMS.map((n) => {
              const Icon = n.icon
              const isActive = active === n.id
              return (
                <button
                  key={n.id}
                  onClick={() => setSection(n.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground/80 hover:bg-muted/70",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {n.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right content area */}
        <div className="flex-1 min-w-0">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            <Section id={active} onApplyLeave={triggerApplyLeave} />
          </motion.div>
        </div>
      </div>

      {/* Apply-leave signal (consumed by MyLeave section) */}
      <ApplyLeaveSignalBus signal={applyOpenSignal} section={active} />
    </div>
  )
}

// A small bridge: the MyLeave section listens for a window event to open its dialog.
// This avoids prop-drilling the apply-open state through every section.
function ApplyLeaveSignalBus({ signal, section }: { signal: number; section: string }) {
  React.useEffect(() => {
    if (signal > 0) {
      window.dispatchEvent(new CustomEvent("leave:open-apply-dialog"))
    }
  }, [signal])
  // The `section` value is read implicitly via the effect above; keep it for clarity.
  void section
  return null
}

export { NAV_ITEMS }
