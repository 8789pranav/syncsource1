"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { KanbanSquare, Workflow as WorkflowIcon, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { KanbanSection } from "@/components/hrms/onboarding/sections/kanban"
import { WorkflowsSection } from "@/components/hrms/onboarding/sections/workflows"
import { InitiateSection } from "@/components/hrms/onboarding/sections/initiate"

type Tab = "kanban" | "initiate" | "workflows"

const TABS: { id: Tab; label: string; icon: any; description: string }[] = [
  { id: "kanban", label: "Kanban Board", icon: KanbanSquare, description: "Drag-and-drop candidates through pipeline stages" },
  { id: "initiate", label: "Candidates", icon: UserPlus, description: "Add candidates and select their onboarding board" },
  { id: "workflows", label: "Workflow Builder", icon: WorkflowIcon, description: "Design deeply customizable onboarding pipelines" },
]

export function OnboardingModule() {
  const [tab, setTab] = React.useState<Tab>("kanban")

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
      <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl w-fit max-w-full overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
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
          {tab === "kanban" && <KanbanSection />}
          {tab === "initiate" && <InitiateSection />}
          {tab === "workflows" && <WorkflowsSection />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default OnboardingModule
