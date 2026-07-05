"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, Users, KanbanSquare, FileText,
  Workflow as WorkflowIcon, Mail, ListChecks, MessageSquare, Settings as SettingsIcon,
  ScrollText, ShieldCheck, Package, Lock, Wallet, UserMinus, Inbox,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Lazy-load each section so Turbopack only compiles the active tab,
// keeping memory usage low in the dev server.
const DashboardSection = dynamic(() => import("@/components/hrms/offboarding/sections/dashboard").then(m => m.DashboardSection), { ssr: false })
const ExitCasesSection = dynamic(() => import("@/components/hrms/offboarding/sections/exit-cases").then(m => m.ExitCasesSection), { ssr: false })
const ResignationsSection = dynamic(() => import("@/components/hrms/offboarding/sections/resignations").then(m => m.ResignationsSection), { ssr: false })
const KanbanSection = dynamic(() => import("@/components/hrms/offboarding/sections/kanban").then(m => m.KanbanSection), { ssr: false })
const ClearanceSection = dynamic(() => import("@/components/hrms/offboarding/sections/clearance").then(m => m.ClearanceSection), { ssr: false })
const AssetRecoverySection = dynamic(() => import("@/components/hrms/offboarding/sections/asset-recovery").then(m => m.AssetRecoverySection), { ssr: false })
const ItAccessSection = dynamic(() => import("@/components/hrms/offboarding/sections/it-access").then(m => m.ItAccessSection), { ssr: false })
const FnFSection = dynamic(() => import("@/components/hrms/offboarding/sections/fnf").then(m => m.FnFSection), { ssr: false })
const DocumentsSection = dynamic(() => import("@/components/hrms/offboarding/sections/documents").then(m => m.DocumentsSection), { ssr: false })
const EmailsSection = dynamic(() => import("@/components/hrms/offboarding/sections/emails").then(m => m.EmailsSection), { ssr: false })
const ChecklistsSection = dynamic(() => import("@/components/hrms/offboarding/sections/checklists").then(m => m.ChecklistsSection), { ssr: false })
const ExitInterviewsSection = dynamic(() => import("@/components/hrms/offboarding/sections/exit-interviews").then(m => m.ExitInterviewsSection), { ssr: false })
const WorkflowsSection = dynamic(() => import("@/components/hrms/offboarding/sections/workflows").then(m => m.WorkflowsSection), { ssr: false })
const AlumniSection = dynamic(() => import("@/components/hrms/offboarding/sections/alumni").then(m => m.AlumniSection), { ssr: false })
const LogsSection = dynamic(() => import("@/components/hrms/offboarding/sections/logs").then(m => m.LogsSection), { ssr: false })
const SettingsSection = dynamic(() => import("@/components/hrms/offboarding/sections/settings").then(m => m.SettingsSection), { ssr: false })

type Tab =
  | "dashboard"
  | "exit-cases"
  | "resignations"
  | "kanban"
  | "clearance"
  | "asset-recovery"
  | "it-access"
  | "fnf"
  | "documents"
  | "workflows"
  | "emails"
  | "checklists"
  | "exit-interviews"
  | "alumni"
  | "logs"
  | "settings"

const TABS: { id: Tab; label: string; icon: any; description: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Real-time tracking of the exit pipeline, clearance, FnF, and activity" },
  { id: "exit-cases", label: "Exit Cases", icon: Users, description: "Manage all employee exit cases — initiate, track, and close" },
  { id: "resignations", label: "Resignations", icon: Inbox, description: "Review and approve employee resignation requests" },
  { id: "kanban", label: "Kanban Board", icon: KanbanSquare, description: "Drag-and-drop exit cases through pipeline stages" },
  { id: "clearance", label: "Clearance", icon: ShieldCheck, description: "Department-wise clearance tasks and approvals" },
  { id: "asset-recovery", label: "Asset Recovery", icon: Package, description: "Track company asset returns and damage recovery" },
  { id: "it-access", label: "IT Access", icon: Lock, description: "Revoke IT access, logins, and system permissions" },
  { id: "fnf", label: "FnF Settlement", icon: Wallet, description: "Full & Final settlement calculation and approval" },
  { id: "documents", label: "Document Library", icon: FileText, description: "Relieving, experience, and exit letter templates" },
  { id: "workflows", label: "Workflow Config", icon: WorkflowIcon, description: "Design deeply customizable exit pipelines" },
  { id: "emails", label: "Email Templates", icon: Mail, description: "Event-driven email content for every exit milestone" },
  { id: "checklists", label: "Checklists", icon: ListChecks, description: "Reusable task groups assigned per exit stage" },
  { id: "exit-interviews", label: "Exit Interviews", icon: MessageSquare, description: "Custom exit interview forms and surveys" },
  { id: "alumni", label: "Alumni", icon: Users, description: "Ex-employee records and rehire eligibility" },
  { id: "logs", label: "Logs", icon: ScrollText, description: "Complete audit trail of every action across the exit pipeline" },
  { id: "settings", label: "Settings", icon: SettingsIcon, description: "Module-level controls and per-entity default configuration" },
]

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500/30 border-t-rose-500" />
        <p className="text-sm text-muted-foreground">Loading section…</p>
      </div>
    </div>
  )
}

export function OffboardingModule() {
  const [tab, setTab] = React.useState<Tab>("dashboard")

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-4 border-b border-border/60">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl gradient-rose text-primary-foreground shadow-soft">
            <UserMinus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Offboarding</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Workflow-driven exit management — resignation, clearance, asset recovery, IT revocation, FnF settlement, exit letters, and alumni records.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl w-fit max-w-full overflow-x-auto onboarding-tabs-scroll">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              {active && (
                <motion.div
                  layoutId="offboarding-tab"
                  className="absolute inset-0 rounded-lg gradient-rose shadow-soft"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="h-4 w-4 relative z-10" />
              <span className="relative z-10">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab description */}
      <p className="text-xs text-muted-foreground -mt-2">
        {TABS.find((t) => t.id === tab)?.description}
      </p>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          <React.Suspense fallback={<TabLoading />}>
            {tab === "dashboard" && <DashboardSection />}
            {tab === "exit-cases" && <ExitCasesSection />}
            {tab === "resignations" && <ResignationsSection />}
            {tab === "kanban" && <KanbanSection />}
            {tab === "clearance" && <ClearanceSection />}
            {tab === "asset-recovery" && <AssetRecoverySection />}
            {tab === "it-access" && <ItAccessSection />}
            {tab === "fnf" && <FnFSection />}
            {tab === "documents" && <DocumentsSection />}
            {tab === "workflows" && <WorkflowsSection />}
            {tab === "emails" && <EmailsSection />}
            {tab === "checklists" && <ChecklistsSection />}
            {tab === "exit-interviews" && <ExitInterviewsSection />}
            {tab === "alumni" && <AlumniSection />}
            {tab === "logs" && <LogsSection />}
            {tab === "settings" && <SettingsSection />}
          </React.Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default OffboardingModule
