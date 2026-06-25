"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, UserPlus, KanbanSquare, FileText,
  Workflow as WorkflowIcon, Mail, ListChecks, ScrollText, Settings as SettingsIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Lazy-load each section so Turbopack only compiles the active tab,
// keeping memory usage low in the dev server.
const DashboardSection = dynamic(() => import("@/components/hrms/onboarding/sections/dashboard").then(m => m.DashboardSection), { ssr: false })
const InitiateSection = dynamic(() => import("@/components/hrms/onboarding/sections/initiate").then(m => m.InitiateSection), { ssr: false })
const KanbanSection = dynamic(() => import("@/components/hrms/onboarding/sections/kanban").then(m => m.KanbanSection), { ssr: false })
const DocumentsSection = dynamic(() => import("@/components/hrms/onboarding/sections/documents").then(m => m.DocumentsSection), { ssr: false })
const WorkflowsSection = dynamic(() => import("@/components/hrms/onboarding/sections/workflows").then(m => m.WorkflowsSection), { ssr: false })
const EmailsSection = dynamic(() => import("@/components/hrms/onboarding/sections/emails").then(m => m.EmailsSection), { ssr: false })
const ChecklistsSection = dynamic(() => import("@/components/hrms/onboarding/sections/checklists").then(m => m.ChecklistsSection), { ssr: false })
const LogsSection = dynamic(() => import("@/components/hrms/onboarding/sections/logs").then(m => m.LogsSection), { ssr: false })
const SettingsSection = dynamic(() => import("@/components/hrms/onboarding/sections/settings").then(m => m.SettingsSection), { ssr: false })

type Tab =
  | "dashboard"
  | "initiate"
  | "kanban"
  | "documents"
  | "workflows"
  | "emails"
  | "checklists"
  | "logs"
  | "settings"

const TABS: { id: Tab; label: string; icon: any; description: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Real-time tracking of the onboarding pipeline, SLAs, and activity" },
  { id: "initiate", label: "Candidates", icon: UserPlus, description: "Add candidates and select their onboarding board" },
  { id: "kanban", label: "Kanban Board", icon: KanbanSquare, description: "Drag-and-drop candidates through pipeline stages" },
  { id: "documents", label: "Document Library", icon: FileText, description: "Reusable document templates for offer letters, agreements, and declarations" },
  { id: "workflows", label: "Workflow Builder", icon: WorkflowIcon, description: "Design deeply customizable onboarding pipelines" },
  { id: "emails", label: "Email Templates", icon: Mail, description: "Reusable email content for every onboarding event" },
  { id: "checklists", label: "Checklists", icon: ListChecks, description: "Reusable task groups assigned per onboarding stage" },
  { id: "logs", label: "Logs", icon: ScrollText, description: "Complete audit trail of every action across the onboarding pipeline" },
  { id: "settings", label: "Settings", icon: SettingsIcon, description: "Module-level controls and per-entity default configuration" },
]

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
        <p className="text-sm text-muted-foreground">Loading section…</p>
      </div>
    </div>
  )
}

export function OnboardingModule() {
  const [tab, setTab] = React.useState<Tab>("dashboard")

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-4 border-b border-border/60">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl gradient-emerald text-primary-foreground shadow-soft">
            <UserPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Onboarding</h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Workflow-driven kanban boards for candidate onboarding. Build customizable pipelines, drag candidates through stages, track SLAs and tasks.
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
                  layoutId="onboarding-tab"
                  className="absolute inset-0 rounded-lg gradient-emerald shadow-soft"
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
            {tab === "initiate" && <InitiateSection />}
            {tab === "kanban" && <KanbanSection />}
            {tab === "documents" && <DocumentsSection />}
            {tab === "workflows" && <WorkflowsSection />}
            {tab === "emails" && <EmailsSection />}
            {tab === "checklists" && <ChecklistsSection />}
            {tab === "logs" && <LogsSection />}
            {tab === "settings" && <SettingsSection />}
          </React.Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default OnboardingModule
