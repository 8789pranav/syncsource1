'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { Fingerprint, Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/hrms/ui"
import { useHrmsStore } from "@/store/hrms-store"
import { toast } from "sonner"

import { DashboardSection } from "./sections/dashboard"
import { RegisterSection } from "./sections/register"
import { CalendarSection } from "./sections/calendar"
import { RequestsSection } from "./sections/requests"
import { RegularizationSection } from "./sections/regularization"
import { WfhOdPermissionSection } from "./sections/wfh-od-permission"
import { ShiftAssignmentSection } from "./sections/shift-assignment"
import { BulkUpdateSection } from "./sections/bulk-update"
import { OvertimeSection } from "./sections/overtime"
import { DeviceLogsSection } from "./sections/device-logs"
import { ReportsSection } from "./sections/reports"
import { SettingsSection } from "./sections/settings"

// ============================================================
// Sub-nav definition
// ============================================================

interface NavItemDef {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  group: "Daily Ops" | "Requests" | "Administration" | "Configuration"
}

import {
  LayoutDashboard, ClipboardList, CalendarRange, Inbox, Edit3,
  Briefcase, CalendarClock, Layers3, Clock, Fingerprint as FpIcon,
  FileBarChart, Settings as SettingsIcon,
} from "lucide-react"

const NAV_ITEMS: NavItemDef[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Daily Ops" },
  { id: "register", label: "Attendance Register", icon: ClipboardList, group: "Daily Ops" },
  { id: "calendar", label: "Attendance Calendar", icon: CalendarRange, group: "Daily Ops" },
  { id: "requests", label: "Attendance Requests", icon: Inbox, group: "Requests" },
  { id: "regularization", label: "Regularization", icon: Edit3, group: "Requests" },
  { id: "wfh-od-permission", label: "WFH / OD / Permission", icon: Briefcase, group: "Requests" },
  { id: "shift-assignment", label: "Shift & Weekly Off", icon: CalendarClock, group: "Administration" },
  { id: "bulk-update", label: "Bulk Attendance Update", icon: Layers3, group: "Administration" },
  { id: "overtime", label: "Overtime", icon: Clock, group: "Administration" },
  { id: "device-logs", label: "Device / Biometric Logs", icon: FpIcon, group: "Administration" },
  { id: "reports", label: "Reports", icon: FileBarChart, group: "Administration" },
  { id: "settings", label: "Settings", icon: SettingsIcon, group: "Configuration" },
]

const GROUPS: { id: NavItemDef["group"]; label: string }[] = [
  { id: "Daily Ops", label: "Daily Operations" },
  { id: "Requests", label: "Requests" },
  { id: "Administration", label: "Administration" },
  { id: "Configuration", label: "Configuration" },
]

// ============================================================
// Section renderer
// ============================================================

function Section({ id }: { id: string }) {
  switch (id) {
    case "dashboard": return <DashboardSection />
    case "register": return <RegisterSection />
    case "calendar": return <CalendarSection />
    case "requests": return <RequestsSection />
    case "regularization": return <RegularizationSection />
    case "wfh-od-permission": return <WfhOdPermissionSection />
    case "shift-assignment": return <ShiftAssignmentSection />
    case "bulk-update": return <BulkUpdateSection />
    case "overtime": return <OvertimeSection />
    case "device-logs": return <DeviceLogsSection />
    case "reports": return <ReportsSection />
    case "settings": return <SettingsSection />
    default: return <DashboardSection />
  }
}

// ============================================================
// Main module
// ============================================================

export function AttendanceModule() {
  const { activeSubModule, setSubModule } = useHrmsStore()
  const [active, setActive] = React.useState<string>(activeSubModule || "dashboard")

  const setSection = (id: string) => {
    setActive(id)
    setSubModule(id)
  }

  // Listen for inter-section navigation events dispatched by child sections
  // (e.g. dashboard quick actions, calendar/regularize "Apply WFH" buttons)
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (typeof detail === "string" && detail) setSection(detail)
    }
    window.addEventListener("attendance:navigate", handler)
    return () => window.removeEventListener("attendance:navigate", handler)
  }, [])

  return (
    <div className="min-h-full space-y-4">
      <PageHeader
        title="Attendance Management"
        description="Daily operations, policy engine, bulk correction and payroll integration — register, calendar, requests, regularization and more."
        icon={Fingerprint}
        actions={
          <>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.info("Exporting attendance report…")}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSection("bulk-update")}>
              <RefreshCw className="h-4 w-4" /> Bulk Update
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setSection("regularization")}>
              <Edit3 className="h-4 w-4" /> Regularize
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
            <Section id={active} />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export { NAV_ITEMS }
