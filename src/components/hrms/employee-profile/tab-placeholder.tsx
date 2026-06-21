"use client"

// ============================================================
// TabPlaceholder — shared "coming soon" shell used by all 32
// employee-profile tab stubs.
// ------------------------------------------------------------
// Phase 2 strategy:
//   • Agents 8-c-1, 8-c-2, 8-c-3 will OVERWRITE the stub tab
//     files for specific tabs they implement (real data, real
//     APIs). Until then, this component renders a polished,
//     intentional-looking placeholder that clearly communicates
//     the tab is wired up and what data sections it will surface.
//   • Tabs that are NOT overwritten by 8-c-* agents will keep
//     using this placeholder as their final UI, so it has to
//     look good on its own.
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { Sparkles, Clock3 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SectionCard } from "@/components/hrms/ui"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface TabPlaceholderSection {
  title: string
  icon: LucideIcon
  hint: string
}

export interface TabPlaceholderProps {
  /** The tab id (overview, personal, ...) */
  tabId: string
  /** Human title shown as the section heading */
  title: string
  /** 1-3 sentence description of what this tab will contain */
  description: string
  /** The data-section cards to outline */
  sections: TabPlaceholderSection[]
  /** Optional small note shown above the grid (e.g. "Loading…" badge) */
  statusLabel?: string
  /** Visual accent override (defaults to emerald) */
  accent?: "emerald" | "teal" | "cyan" | "amber" | "fuchsia" | "coral"
}

const ACCENT_BADGE: Record<NonNullable<TabPlaceholderProps["accent"]>, string> = {
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  fuchsia: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
  coral: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

const ACCENT_ICON: Record<NonNullable<TabPlaceholderProps["accent"]>, string> = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  fuchsia: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  coral: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
}

export function TabPlaceholder({
  tabId,
  title,
  description,
  sections,
  statusLabel = "Loading…",
  accent = "emerald",
}: TabPlaceholderProps) {
  return (
    <motion.div
      key={tabId}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="space-y-5"
    >
      {/* Heading row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="secondary"
            className={cn("gap-1 border-0 font-medium", ACCENT_BADGE[accent])}
          >
            <Clock3 className="h-3 w-3" /> {statusLabel}
          </Badge>
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Content coming in next phase
          </Badge>
        </div>
      </div>

      {/* Section cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s, idx) => (
          <SectionCard key={`${tabId}-${s.title}-${idx}`} title={s.title} className="overflow-hidden">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                  ACCENT_ICON[accent]
                )}
              >
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground leading-relaxed">{s.hint}</p>
                <div className="mt-3 space-y-1.5">
                  <div className="h-2 rounded-full bg-muted/70 w-full" />
                  <div className="h-2 rounded-full bg-muted/50 w-2/3" />
                  <div className="h-2 rounded-full bg-muted/30 w-1/2" />
                </div>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>

      {/* Footnote */}
      <p className="text-xs text-muted-foreground/70 pt-1">
        This tab is wired up. Implementation of live data, forms and actions will land in a follow-up phase.
      </p>
    </motion.div>
  )
}
