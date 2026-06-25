"use client"

// ============================================================================
//  Shared Slug / Variable Catalog  (single source of truth)
// ----------------------------------------------------------------------------
//  Used by BOTH the Document Library editor and the Email Templates editor
//  (and any future template type). Every placeholder that can be inserted
//  into a template lives here exactly once, tagged with where it applies.
//
//  Exports:
//    • SLUG_CATEGORIES        — full catalog (grouped)
//    • ALL_SLUGS              — flat list
//    • getSlugsFor(context)   — filter by "document" | "email"
//    • SAMPLE_VALUES          — preview substitution map
//    • extractVariables(html) — pull {{slugs}} out of HTML
//    • substituteVariables(html, context?)
//    • <SlugPalette>          — the prominent, searchable, click-to-insert
//                               panel rendered inside both editors.
// ============================================================================

import * as React from "react"
import { useMemo, useState, useCallback } from "react"
import {
  Search, Copy, Check, ChevronDown, Variable as VariableIcon,
  User, Briefcase, Landmark, ClipboardCheck, Building2, Calendar,
  Workflow, Link2, Mail, Sparkles, Hash,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"

// ============================================================================
//  Types
// ============================================================================

export type TemplateContext = "document" | "email"

export interface SlugEntry {
  /** The token that gets inserted, e.g. "CandidateName" → {{CandidateName}} */
  slug: string
  /** Human label shown in the palette + tooltip */
  label: string
  /** Short description of what it resolves to */
  description: string
  /** Sample value used by the preview engine */
  sample: string
  /** Where this slug is valid */
  appliesTo: TemplateContext[]
}

export interface SlugCategory {
  id: string
  name: string
  icon: LucideIcon
  accent: string // tailwind text color class for the icon
  description: string
  slugs: SlugEntry[]
}

// ============================================================================
//  Catalog
// ============================================================================

export const SLUG_CATEGORIES: SlugCategory[] = [
  {
    id: "candidate",
    name: "Candidate",
    icon: User,
    accent: "text-emerald-600 dark:text-emerald-400",
    description: "Personal details of the candidate being onboarded.",
    slugs: [
      { slug: "CandidateName", label: "Candidate Full Name", description: "Full name of the candidate", sample: "Priya Sharma", appliesTo: ["document", "email"] },
      { slug: "CandidateFirstName", label: "First Name", description: "Given name", sample: "Priya", appliesTo: ["document", "email"] },
      { slug: "CandidateLastName", label: "Last Name", description: "Surname", sample: "Sharma", appliesTo: ["document", "email"] },
      { slug: "CandidateEmail", label: "Email", description: "Personal email address", sample: "priya.sharma@example.com", appliesTo: ["document", "email"] },
      { slug: "CandidateMobile", label: "Mobile", description: "Phone number", sample: "+91 98765 43210", appliesTo: ["document", "email"] },
      { slug: "CandidateAddress", label: "Address", description: "Residential address", sample: "42 MG Road, Bengaluru, KA 560001", appliesTo: ["document"] },
      { slug: "CandidateDOB", label: "Date of Birth", description: "Date of birth", sample: "12 Jun 1995", appliesTo: ["document"] },
      { slug: "CandidatePAN", label: "PAN Number", description: "Permanent Account Number", sample: "ABCPS1234K", appliesTo: ["document"] },
      { slug: "CandidateAadhaar", label: "Aadhaar", description: "Aadhaar number (masked)", sample: "XXXX-XXXX-1234", appliesTo: ["document"] },
    ],
  },
  {
    id: "job",
    name: "Job & Offer",
    icon: Briefcase,
    accent: "text-teal-600 dark:text-teal-400",
    description: "Role, grade, location and joining details.",
    slugs: [
      { slug: "Designation", label: "Designation", description: "Job title offered", sample: "Senior Software Engineer", appliesTo: ["document", "email"] },
      { slug: "Department", label: "Department", description: "Department / function", sample: "Engineering", appliesTo: ["document", "email"] },
      { slug: "Grade", label: "Grade / Level", description: "Career grade or level", sample: "L5", appliesTo: ["document", "email"] },
      { slug: "Location", label: "Work Location", description: "Primary work location", sample: "Bengaluru", appliesTo: ["document", "email"] },
      { slug: "Branch", label: "Branch / Office", description: "Branch or office name", sample: "Corporate Office", appliesTo: ["document", "email"] },
      { slug: "EntityName", label: "Legal Entity", description: "Employing legal entity", sample: "Acme Technologies Pvt Ltd", appliesTo: ["document", "email"] },
      { slug: "CompanyName", label: "Company Name", description: "Brand / trade name", sample: "Acme Technologies", appliesTo: ["document", "email"] },
      { slug: "JoiningDate", label: "Joining Date", description: "Date of joining", sample: "15 Aug 2025", appliesTo: ["document", "email"] },
      { slug: "ReportingManager", label: "Reporting Manager", description: "Manager the candidate reports to", sample: "Anand Verma", appliesTo: ["document", "email"] },
      { slug: "HRManager", label: "HR Manager", description: "HR owner / buddy", sample: "Riya Kapoor", appliesTo: ["document", "email"] },
      { slug: "WorkMode", label: "Work Mode", description: "Remote / Hybrid / Onsite", sample: "Hybrid", appliesTo: ["document", "email"] },
      { slug: "EmploymentType", label: "Employment Type", description: "Full-time / Contract etc.", sample: "Full-time", appliesTo: ["document", "email"] },
      { slug: "OfferReferenceNo", label: "Offer Reference No.", description: "Unique offer reference", sample: "ACME-OFR-2025-0412", appliesTo: ["document", "email"] },
    ],
  },
  {
    id: "compensation",
    name: "Compensation",
    icon: Landmark,
    accent: "text-cyan-600 dark:text-cyan-400",
    description: "Salary breakdown, bonus and currency.",
    slugs: [
      { slug: "CTC", label: "CTC (Annual)", description: "Total cost to company", sample: "₹24,00,000", appliesTo: ["document", "email"] },
      { slug: "BasicSalary", label: "Basic Salary", description: "Basic component (annual)", sample: "₹12,00,000", appliesTo: ["document"] },
      { slug: "HRA", label: "HRA", description: "House rent allowance", sample: "₹4,80,000", appliesTo: ["document"] },
      { slug: "SpecialAllowance", label: "Special Allowance", description: "Special allowance", sample: "₹3,20,000", appliesTo: ["document"] },
      { slug: "Bonus", label: "Bonus", description: "Variable / performance bonus", sample: "₹2,00,000", appliesTo: ["document"] },
      { slug: "GrossSalary", label: "Gross Salary", description: "Gross annual salary", sample: "₹22,00,000", appliesTo: ["document"] },
      { slug: "NetSalary", label: "Net Salary", description: "In-hand annual salary", sample: "₹18,50,000", appliesTo: ["document"] },
      { slug: "SalaryCurrency", label: "Currency", description: "Salary currency code", sample: "INR", appliesTo: ["document", "email"] },
      { slug: "PayFrequency", label: "Pay Frequency", description: "Monthly / Bi-weekly", sample: "Monthly", appliesTo: ["document"] },
    ],
  },
  {
    id: "policies",
    name: "Policies & Terms",
    icon: ClipboardCheck,
    accent: "text-amber-600 dark:text-amber-400",
    description: "Probation, notice and policy references.",
    slugs: [
      { slug: "ProbationPeriod", label: "Probation Period", description: "Length of probation", sample: "6 months", appliesTo: ["document", "email"] },
      { slug: "NoticePeriod", label: "Notice Period", description: "Resignation notice", sample: "60 days", appliesTo: ["document", "email"] },
      { slug: "WorkingHours", label: "Working Hours", description: "Standard working hours", sample: "9 hours / day", appliesTo: ["document"] },
      { slug: "LeavePolicy", label: "Leave Policy", description: "Applicable leave policy", sample: "Earned + Sick + Casual Leave", appliesTo: ["document", "email"] },
      { slug: "AttendancePolicy", label: "Attendance Policy", description: "Attendance mechanism", sample: "Biometric + Flexible Hours", appliesTo: ["document"] },
      { slug: "ConfidentialityClause", label: "Confidentiality", description: "NDA / confidentiality reference", sample: "As per Employee NDA dated {{JoiningDate}}", appliesTo: ["document"] },
    ],
  },
  {
    id: "company",
    name: "Company",
    icon: Building2,
    accent: "text-violet-600 dark:text-violet-400",
    description: "Branding, contact and signatory details.",
    slugs: [
      { slug: "CompanyLogo", label: "Company Logo", description: "Inline logo image", sample: "[LOGO]", appliesTo: ["document", "email"] },
      { slug: "CompanyAddress", label: "Company Address", description: "Registered address", sample: "123 Tech Park, Bengaluru, KA 560001", appliesTo: ["document", "email"] },
      { slug: "CompanyWebsite", label: "Website", description: "Company website URL", sample: "www.acme-tech.com", appliesTo: ["document", "email"] },
      { slug: "CompanyEmail", label: "Company Email", description: "HR / contact email", sample: "hr@acme-tech.com", appliesTo: ["document", "email"] },
      { slug: "CompanyPhone", label: "Company Phone", description: "Contact phone", sample: "+91 80 1234 5678", appliesTo: ["document", "email"] },
      { slug: "AuthorizedSignatory", label: "Authorized Signatory", description: "Name of signing authority", sample: "Anand Verma", appliesTo: ["document"] },
      { slug: "SignatoryDesignation", label: "Signatory Designation", description: "Designation of signatory", sample: "VP, Human Resources", appliesTo: ["document"] },
    ],
  },
  {
    id: "dates",
    name: "Dates",
    icon: Calendar,
    accent: "text-rose-600 dark:text-rose-400",
    description: "Letter and offer lifecycle dates.",
    slugs: [
      { slug: "CurrentDate", label: "Today's Date", description: "Current date", sample: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), appliesTo: ["document", "email"] },
      { slug: "OfferDate", label: "Offer Date", description: "Date the offer was issued", sample: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), appliesTo: ["document", "email"] },
      { slug: "OfferExpiryDate", label: "Offer Expiry", description: "Last date to accept", sample: new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), appliesTo: ["document", "email"] },
      { slug: "LetterDate", label: "Letter Date", description: "Date printed on the letter", sample: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), appliesTo: ["document"] },
    ],
  },
  {
    id: "workflow",
    name: "Workflow & Task",
    icon: Workflow,
    accent: "text-lime-600 dark:text-lime-400",
    description: "Onboarding workflow, stage and task context.",
    slugs: [
      { slug: "WorkflowName", label: "Workflow Name", description: "Onboarding workflow", sample: "Standard Engineering Onboarding", appliesTo: ["email"] },
      { slug: "CurrentStage", label: "Current Stage", description: "Stage the candidate is in", sample: "Document Collection", appliesTo: ["email"] },
      { slug: "FormName", label: "Form Name", description: "Form to be filled", sample: "Personal Information Form", appliesTo: ["email"] },
      { slug: "DocumentName", label: "Document Name", description: "Document requested", sample: "PAN Card", appliesTo: ["email"] },
      { slug: "TaskName", label: "Task Name", description: "Pending task", sample: "Submit address proof", appliesTo: ["email"] },
      { slug: "DueDate", label: "Due Date", description: "Task / form due date", sample: "20 Aug 2025", appliesTo: ["email"] },
      { slug: "Assignee", label: "Assignee", description: "Owner of the task", sample: "Riya Kapoor", appliesTo: ["email"] },
    ],
  },
  {
    id: "links",
    name: "Links & Portal",
    icon: Link2,
    accent: "text-fuchsia-600 dark:text-fuchsia-400",
    description: "Actionable links for the candidate.",
    slugs: [
      { slug: "PortalLink", label: "Onboarding Portal", description: "Candidate portal URL", sample: "https://onboard.acme-tech.com/p/abc123", appliesTo: ["email"] },
      { slug: "OfferLetterLink", label: "Offer Letter", description: "Download / accept offer", sample: "https://onboard.acme-tech.com/offer/abc123", appliesTo: ["email"] },
      { slug: "ApprovalLink", label: "Approval Link", description: "Internal approval link", sample: "https://hr.acme-tech.com/approvals/abc123", appliesTo: ["email"] },
      { slug: "FormLink", label: "Form Link", description: "Direct form link", sample: "https://onboard.acme-tech.com/forms/abc123", appliesTo: ["email"] },
      { slug: "DocumentUploadLink", label: "Upload Documents", description: "Document upload URL", sample: "https://onboard.acme-tech.com/upload/abc123", appliesTo: ["email"] },
      { slug: "SupportEmail", label: "Support Email", description: "HR support email", sample: "support@acme-tech.com", appliesTo: ["email"] },
    ],
  },
  {
    id: "email",
    name: "Email Specific",
    icon: Mail,
    accent: "text-orange-600 dark:text-orange-400",
    description: "Greeting, signature and email-only tokens.",
    slugs: [
      { slug: "Greeting", label: "Greeting", description: "Time-aware greeting", sample: "Hi Priya,", appliesTo: ["email"] },
      { slug: "SenderName", label: "Sender Name", description: "Name of the email sender", sample: "Riya Kapoor", appliesTo: ["email"] },
      { slug: "SenderDesignation", label: "Sender Designation", description: "Sender's role", sample: "HR Business Partner", appliesTo: ["email"] },
      { slug: "Signature", label: "Email Signature", description: "Full signature block", sample: "Warm regards,\nRiya Kapoor\nHR Business Partner, Acme Technologies", appliesTo: ["email"] },
      { slug: "RejectReason", label: "Reject Reason", description: "Reason for rejection (rejection emails)", sample: "Position was put on hold", appliesTo: ["email"] },
      { slug: "EventName", label: "Event Name", description: "Triggering event", sample: "Offer Accepted", appliesTo: ["email"] },
    ],
  },
]

/** Flat list of every slug in the catalog. */
export const ALL_SLUGS: SlugEntry[] = SLUG_CATEGORIES.flatMap((c) => c.slugs)

/** Filter the catalog to only slugs valid for a given template context. */
export function getSlugsFor(context: TemplateContext): SlugEntry[] {
  return ALL_SLUGS.filter((s) => s.appliesTo.includes(context))
}

/** Quick lookup: slug → entry. */
const SLUG_MAP: Record<string, SlugEntry> = Object.fromEntries(
  ALL_SLUGS.map((s) => [s.slug, s]),
)

// ============================================================================
//  Sample values + substitution helpers
// ============================================================================

export const SAMPLE_VALUES: Record<string, string> = Object.fromEntries(
  ALL_SLUGS.map((s) => [s.slug, s.sample]),
)

/** Extract all unique {{slug}} tokens from an HTML/text string. */
export function extractVariables(html: string): string[] {
  if (!html) return []
  const set = new Set<string>()
  const re = /\{\{(\w+)\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) set.add(m[1])
  return Array.from(set)
}

/** Replace {{slugs}} with sample values; unknown tokens are left intact. */
export function substituteVariables(html: string, _context?: TemplateContext): string {
  if (!html) return ""
  return html.replace(/\{\{(\w+)\}\}/g, (_m, key: string) =>
    SAMPLE_VALUES[key] ?? `{{${key}}}`,
  )
}

/** Human label for a slug (falls back to the raw slug). */
export function slugLabel(slug: string): string {
  return SLUG_MAP[slug]?.label ?? slug
}

// ============================================================================
//  <SlugPalette> — the prominent click-to-insert panel
// ============================================================================

interface SlugPaletteProps {
  /** Called with the slug name (without braces) when a chip is clicked. */
  onInsert: (slug: string) => void
  /** Slugs already used in the current template (for "used" indicators). */
  usedVariables?: string[]
  /** Filters the catalog to only slugs valid for this context. */
  context?: TemplateContext
  /** Compact height variant (for tight dialogs). */
  compact?: boolean
  /** Extra class on the outer wrapper. */
  className?: string
  /** Optional title override. */
  title?: string
}

export function SlugPalette({
  onInsert,
  usedVariables = [],
  context,
  compact,
  className,
  title = "Slug Library",
}: SlugPaletteProps) {
  const [search, setSearch] = useState("")
  const [showSamples, setShowSamples] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)

  // Filter categories by context + search term.
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase()
    return SLUG_CATEGORIES
      .map((cat) => ({
        ...cat,
        slugs: cat.slugs.filter((s) => {
          if (context && !s.appliesTo.includes(context)) return false
          if (!q) return true
          return (
            s.slug.toLowerCase().includes(q) ||
            s.label.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q)
          )
        }),
      }))
      .filter((cat) => cat.slugs.length > 0)
  }, [context, search])

  const totalAvailable = useMemo(
    () => filteredCategories.reduce((n, c) => n + c.slugs.length, 0),
    [filteredCategories],
  )

  const toggleCategory = useCallback((id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const handleCopy = useCallback(async (slug: string) => {
    const token = `{{${slug}}}`
    try {
      await navigator.clipboard.writeText(token)
      setCopied(slug)
      setTimeout(() => setCopied((c) => (c === slug ? null : c)), 1200)
    } catch {
      /* clipboard not available — ignore */
    }
  }, [])

  return (
    <div className={cn("flex flex-col h-full min-h-0 bg-background", className)}>
      {/* ---------------- Header ---------------- */}
      <div className="px-3 pt-3 pb-2 border-b border-border/60 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5">
        <div className="flex items-center gap-2 mb-2">
          <div className="grid place-items-center h-7 w-7 rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300">
            <VariableIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {context === "email" ? "Email" : context === "document" ? "Document" : "All"} slugs · click to insert at cursor
            </p>
          </div>
          <Badge variant="secondary" className="h-5 text-[10px] font-mono bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20">
            {totalAvailable}
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search slugs by name, label or meaning…"
            className="pl-8 pr-7 h-8 text-xs bg-background"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <button
            type="button"
            onClick={() => setShowSamples((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors",
              showSamples
                ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
          >
            <Sparkles className="h-3 w-3" />
            {showSamples ? "Hide" : "Show"} sample values
          </button>
          <span className="text-[10px] text-muted-foreground">
            {usedVariables.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                {usedVariables.length} used
              </span>
            )}
          </span>
        </div>
      </div>

      {/* ---------------- Body ---------------- */}
      <ScrollArea className={cn("flex-1 min-h-0", compact ? "" : "")}>
        <TooltipProvider delayDuration={250}>
          <div className="p-2.5 space-y-1.5">
            {filteredCategories.length === 0 && (
              <div className="text-center py-10 px-4">
                <Hash className="h-7 w-7 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  No slugs match <span className="font-mono">“{search}”</span>.
                </p>
              </div>
            )}

            {filteredCategories.map((cat) => {
              const CIcon = cat.icon
              const isCollapsed = collapsed[cat.id]
              const usedCount = cat.slugs.filter((s) => usedVariables.includes(s.slug)).length
              return (
                <Collapsible
                  key={cat.id}
                  open={!isCollapsed}
                  onOpenChange={() => toggleCategory(cat.id)}
                  className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden"
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/40 transition-colors text-left"
                    >
                      <CIcon className={cn("h-3.5 w-3.5 shrink-0", cat.accent)} />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/90">
                        {cat.name}
                      </span>
                      <Badge variant="outline" className="h-4 px-1 text-[9px] font-mono bg-background border-border/60 text-muted-foreground">
                        {cat.slugs.length}
                      </Badge>
                      {usedCount > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20">
                          {usedCount} used
                        </Badge>
                      )}
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 ml-auto text-muted-foreground transition-transform",
                          isCollapsed && "-rotate-90",
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-2 pt-0.5 space-y-1">
                      {cat.slugs.map((s) => {
                        const used = usedVariables.includes(s.slug)
                        return (
                          <div
                            key={s.slug}
                            className={cn(
                              "group flex items-center gap-1.5 rounded-md px-1.5 py-1 border transition-colors",
                              used
                                ? "border-cyan-500/30 bg-cyan-500/5"
                                : "border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/5",
                            )}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => onInsert(s.slug)}
                                  className="flex-1 min-w-0 flex items-center gap-1.5 text-left"
                                  title={`Insert {{${s.slug}}}`}
                                >
                                  {used && <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shrink-0" />}
                                  <span className="shrink-0">
                                    <span className="text-muted-foreground/60 font-mono text-[11px]">{"{{"}</span>
                                    <span className={cn(
                                      "font-mono text-[11px] font-medium",
                                      used ? "text-cyan-700 dark:text-cyan-300" : "text-foreground/90",
                                    )}>{s.slug}</span>
                                    <span className="text-muted-foreground/60 font-mono text-[11px]">{"}}"}</span>
                                  </span>
                                  <span className="text-[10px] text-muted-foreground truncate hidden sm:block">
                                    {s.label}
                                  </span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-[240px] text-xs">
                                <div className="space-y-0.5">
                                  <p className="font-mono font-semibold text-cyan-300">{`{{${s.slug}}}`}</p>
                                  <p className="text-foreground">{s.label}</p>
                                  <p className="text-muted-foreground">{s.description}</p>
                                  <p className="text-emerald-300 italic">Sample: {s.sample}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(s.slug)}
                                  className="shrink-0 grid place-items-center h-5 w-5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 opacity-0 group-hover:opacity-100 transition-opacity"
                                  aria-label={`Copy {{${s.slug}}}`}
                                >
                                  {copied === s.slug
                                    ? <Check className="h-3 w-3 text-emerald-500" />
                                    : <Copy className="h-3 w-3" />}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {copied === s.slug ? "Copied!" : "Copy token"}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )
                      })}

                      {showSamples && (
                        <div className="mt-1 rounded-md bg-background/60 border border-border/40 p-2">
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            Sample preview
                          </p>
                          <dl className="space-y-0.5">
                            {cat.slugs.map((s) => (
                              <div key={s.slug} className="flex items-baseline gap-2 text-[10px]">
                                <dt className="font-mono text-cyan-700 dark:text-cyan-300 shrink-0">{`{{${s.slug}}}`}</dt>
                                <dd className="text-muted-foreground truncate">→ {s.sample}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        </TooltipProvider>
      </ScrollArea>

      {/* ---------------- Footer ---------------- */}
      <div className="px-3 py-1.5 border-t border-border/60 bg-muted/20 text-[10px] text-muted-foreground flex items-center justify-between">
        <span className="inline-flex items-center gap-1">
          <VariableIcon className="h-3 w-3" />
          {ALL_SLUGS.length} slugs · {SLUG_CATEGORIES.length} categories
        </span>
        <Separator orientation="vertical" className="h-3 bg-border/40" />
        <span>Tip: hover a slug to preview its value</span>
      </div>
    </div>
  )
}

// ============================================================================
//  SlugUsageSummary — compact "used slugs" chip list for the left metadata
//  column of an editor, so authors always see what they've inserted.
// ============================================================================

interface SlugUsageSummaryProps {
  used: string[]
  onRemove?: (slug: string) => void
  className?: string
}

export function SlugUsageSummary({ used, onRemove, className }: SlugUsageSummaryProps) {
  if (used.length === 0) {
    return (
      <div className={cn("rounded-md border border-dashed border-border/60 px-3 py-2 text-center", className)}>
        <VariableIcon className="h-4 w-4 mx-auto text-muted-foreground/40 mb-1" />
        <p className="text-[11px] text-muted-foreground">
          No slugs inserted yet. Click a slug in the library to add it at your cursor.
        </p>
      </div>
    )
  }
  return (
    <div className={cn("rounded-md border border-cyan-500/30 bg-cyan-500/5 px-3 py-2", className)}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <VariableIcon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
          Slugs in use ({used.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {used.map((slug) => {
          const entry = SLUG_MAP[slug]
          return (
            <Tooltip key={slug}>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="font-mono text-[10px] gap-1 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20 pr-1"
                >
                  {`{{${slug}}}`}
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(slug)}
                      className="ml-0.5 hover:text-rose-500"
                      aria-label={`Remove ${slug}`}
                    >
                      ×
                    </button>
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {entry ? `${entry.label} — ${entry.description}` : slug}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
