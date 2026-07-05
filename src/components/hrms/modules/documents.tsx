"use client"

// ============================================================
// DocumentsModule — Universal Documents (Phase 4)
// ------------------------------------------------------------
// 8 sub-sections with nested sidebar:
//   1. Dashboard            — stats, charts, upcoming expiries, recent activity
//   2. Employee Documents   — employee-wise uploaded/generated docs with verification workflow
//   3. HR Documents         — company/HR policy documents with visibility & acknowledgment
//   4. Document Library     — universal template library with 4-step Create Document wizard
//   5. Document Requests    — employee-initiated document requests with approval workflow
//   6. Generated Documents  — every generated letter/document stored with audit trail
//   7. Settings             — entity-wise configuration (flagship 9-step wizard) + 13 settings tabs
//   8. Logs                 — comprehensive audit logs of all document activities
// ============================================================

import * as React from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileStack, LayoutDashboard, UserSquare, Building2, Library, Inbox,
  FileCheck, Settings as SettingsIcon, ScrollText, ChevronRight, Menu, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// ---------- Lazy-loaded sections ----------
const loading = () => (
  <div className="flex h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
  </div>
)

const DocumentsDashboard = dynamic(() => import("@/components/hrms/documents/sections/dashboard").then(m => m.DocumentsDashboardSection), { loading, ssr: false })
const EmployeeDocuments = dynamic(() => import("@/components/hrms/documents/sections/employee-documents").then(m => m.EmployeeDocumentsSection), { loading, ssr: false })
const HRDocuments = dynamic(() => import("@/components/hrms/documents/sections/hr-documents").then(m => m.HRDocumentsSection), { loading, ssr: false })
const DocumentLibrary = dynamic(() => import("@/components/hrms/documents/sections/document-library").then(m => m.DocumentLibrarySection), { loading, ssr: false })
const DocumentRequests = dynamic(() => import("@/components/hrms/documents/sections/document-requests").then(m => m.DocumentRequestsSection), { loading, ssr: false })
const GeneratedDocuments = dynamic(() => import("@/components/hrms/documents/sections/generated-documents").then(m => m.GeneratedDocumentsSection), { loading, ssr: false })
const DocumentsSettings = dynamic(() => import("@/components/hrms/documents/sections/settings").then(m => m.DocumentsSettingsSection), { loading, ssr: false })
const DocumentsLogs = dynamic(() => import("@/components/hrms/documents/sections/logs").then(m => m.DocumentsLogsSection), { loading, ssr: false })

// ---------- Menu structure ----------
interface SubItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
}

const SECTIONS: SubItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview, stats, charts & upcoming expiries" },
  { id: "employee-documents", label: "Employee Documents", icon: UserSquare, description: "Employee-wise uploaded & generated documents with verification workflow" },
  { id: "hr-documents", label: "HR Documents", icon: Building2, description: "Company/HR policy documents with visibility & acknowledgment rules" },
  { id: "document-library", label: "Document Library", icon: Library, description: "Universal template library with 4-step Create Document wizard" },
  { id: "document-requests", label: "Document Requests", icon: Inbox, description: "Employee-initiated document requests with approval workflow" },
  { id: "generated-documents", label: "Generated Documents", icon: FileCheck, description: "Every generated letter/document with audit trail" },
  { id: "settings", label: "Settings", icon: SettingsIcon, description: "Entity-wise configuration (9-step wizard) + 13 settings tabs" },
  { id: "logs", label: "Logs", icon: ScrollText, description: "Comprehensive audit logs of all document activities" },
]

// ============================================================
// Main Module
// ============================================================
export function DocumentsModule() {
  const [activeSection, setActiveSection] = React.useState("dashboard")
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const currentSection = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0]

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard": return <DocumentsDashboard />
      case "employee-documents": return <EmployeeDocuments />
      case "hr-documents": return <HRDocuments />
      case "document-library": return <DocumentLibrary />
      case "document-requests": return <DocumentRequests />
      case "generated-documents": return <GeneratedDocuments />
      case "settings": return <DocumentsSettings />
      case "logs": return <DocumentsLogs />
      default: return null
    }
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Module header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm">
            <FileStack className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                Documents — {currentSection.label}
              </h1>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {SECTIONS.length} sections
              </Badge>
            </div>
            <p className="mt-0.5 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              {currentSection.description}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden"
          onClick={() => setMobileOpen(o => !o)}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          Sections
        </Button>
      </motion.div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Sidebar — sub-sections */}
        <aside
          className={cn(
            "lg:w-64 lg:flex-shrink-0",
            mobileOpen ? "block" : "hidden lg:block"
          )}
        >
          <div className="sticky top-2 rounded-xl border border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
            <nav className="max-h-[calc(100vh-220px)] overflow-y-auto p-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-0.5"
                >
                  {SECTIONS.map(child => {
                    const active = activeSection === child.id
                    return (
                      <button
                        key={child.id}
                        onClick={() => { setActiveSection(child.id); setMobileOpen(false) }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all",
                          active
                            ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        )}
                      >
                        <child.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 text-left">{child.label}</span>
                        {active && <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    )
                  })}
                </motion.div>
              </AnimatePresence>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default DocumentsModule
