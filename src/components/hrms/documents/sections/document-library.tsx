"use client"

// ============================================================================
//  Documents — Document Library (Task ID 4-b)
// ----------------------------------------------------------------------------
//  Universal template library with 4-step Create Document wizard.
//  Theme: violet/purple accent.
//
//  Step 1: Create     — basic info + scope + configuration + settings
//  Step 2: Configure  — page/header/body/footer settings + live A4 preview
//  Step 3: Template   — slug library + rich text editor + live preview
//  Step 4: Review     — summary accordion + validation + final preview + publish
// ============================================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Library, Plus, Filter, MoreHorizontal, Eye, Download, RefreshCw, Search,
  Star, FileText, Pencil, Copy, History, Send, Trash2, Power, Award,
  FilePlus2, LayoutGrid, List as ListIcon, FileUp, FileSignature,
  Check, ChevronRight, ChevronLeft, X, AlertTriangle, ShieldCheck,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link2, Image, Table as TableIcon, Undo2, Redo2, Type, Palette,
  Heading, User, Users, Briefcase, Banknote, Building2, Inbox, DoorOpen, Calendar,
  SlidersHorizontal, FileCheck2, Sparkles, Layers, Type as TypeIcon, CheckCircle2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table"
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion"

import {
  ENTITIES, TEMPLATE_CATEGORIES, SLUG_CATEGORIES, STATUS_COLORS, PAGE_SIZES,
  ORIENTATIONS, formatDate, initials, avatarColor,
  DocumentTemplate, TemplateCategory,
} from "../shared"
import { apiFetch } from "@/lib/api-client"

// ---------- motion ----------
const gridContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const gridItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

// ---------- Module icon map ----------
const MODULE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Onboarding: UserSquare, Offboarding: DoorOpen, Payroll: Banknote, "Core HR": Briefcase,
  HR: Building2, "Employee Request": Inbox,
}
function UserSquare({ className }: { className?: string }) { return <User className={className} /> }

// ---------- Stat tile ----------
function StatTile({ label, value, icon: Icon, accent, sub }: {
  label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>
  accent: "violet" | "emerald" | "amber" | "sky" | "fuchsia" | "slate"; sub?: string
}) {
  const map: Record<string, string> = {
    violet: "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
    sky: "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400",
    fuchsia: "from-fuchsia-500/15 to-fuchsia-500/5 text-fuchsia-600 dark:text-fuchsia-400",
    slate: "from-slate-500/15 to-slate-500/5 text-slate-600 dark:text-slate-400",
  }
  return (
    <Card className={cn("rounded-xl border border-border/60 shadow-soft bg-gradient-to-br", map[accent])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl font-semibold mt-1 text-foreground tabular-nums leading-none">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>}
          </div>
          <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background/70 ring-1 backdrop-blur-sm", map[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
//  Sample token values (for live preview)
// ============================================================================
const SAMPLE_VALUES: Record<string, string> = {
  "{{EmployeeCode}}": "EMP-001",
  "{{EmployeeName}}": "Aarav Sharma",
  "{{FirstName}}": "Aarav",
  "{{MiddleName}}": "Kumar",
  "{{LastName}}": "Sharma",
  "{{PersonalEmail}}": "aarav.sharma@gmail.com",
  "{{OfficialEmail}}": "aarav.sharma@acme.com",
  "{{MobileNumber}}": "+91 98765 43210",
  "{{DateOfBirth}}": "14 Aug 1992",
  "{{Gender}}": "Male",
  "{{MaritalStatus}}": "Married",
  "{{Nationality}}": "Indian",
  "{{BloodGroup}}": "B+",
  "{{AadhaarNumber}}": "XXXX-XXXX-1234",
  "{{PanNumber}}": "AKJPS9182H",
  "{{PassportNumber}}": "P1234567",
  "{{ProfilePic}}": "[Photo]",
  "{{JoiningDate}}": "01 Apr 2022",
  "{{ConfirmationDate}}": "01 Oct 2022",
  "{{ProbationPeriod}}": "6 months",
  "{{NoticeDays}}": "60",
  "{{Department}}": "Engineering",
  "{{Designation}}": "Senior Software Engineer",
  "{{Grade}}": "E4",
  "{{Band}}": "Band B",
  "{{BusinessUnit}}": "Platform",
  "{{CostCenter}}": "CC-1001",
  "{{Location}}": "Mumbai",
  "{{Branch}}": "Andheri East",
  "{{EntityName}}": "ACME India Pvt Ltd",
  "{{EmploymentType}}": "Full-Time",
  "{{EmployeeType}}": "Permanent",
  "{{WorkMode}}": "Hybrid",
  "{{ReportingManager}}": "Vikram Reddy",
  "{{ManagerCode}}": "EMP-003",
  "{{ManagerDesignation}}": "Engineering Manager",
  "{{HROwner}}": "Anita Desai",
  "{{HREmail}}": "anita.desai@acme.com",
  "{{DepartmentHead}}": "Vikram Reddy",
  "{{EntityAdmin}}": "Anita Desai",
  "{{HRHead}}": "Priya Nair",
  "{{CTCAnnual}}": "₹18,50,000",
  "{{CTCMonthly}}": "₹1,54,167",
  "{{BasicMonthly}}": "₹77,083",
  "{{HRAMonthly}}": "₹38,542",
  "{{GrossMonthly}}": "₹1,42,000",
  "{{NetPayMonthly}}": "₹1,18,500",
  "{{PreviousCTC}}": "₹15,00,000",
  "{{RevisedCTC}}": "₹18,50,000",
  "{{HikePercent}}": "23.3%",
  "{{IncrementAmount}}": "₹3,50,000",
  "{{EffectiveDate}}": "01 Apr 2025",
  "{{PayrollFrequency}}": "Monthly",
  "{{Currency}}": "INR (₹)",
  "{{CompanyName}}": "ACME India Pvt Ltd",
  "{{CompanyCode}}": "IND",
  "{{CompanyAddress}}": "123, MIDC, Andheri East, Mumbai 400093, India",
  "{{CompanyLogo}}": "[LOGO]",
  "{{CompanyWebsite}}": "www.acme.com",
  "{{CompanyCIN}}": "U72200MH2010PTC123456",
  "{{CompanyTRN}}": "—",
  "{{CompanyEIN}}": "—",
  "{{CompanyUEN}}": "—",
  "{{RequestID}}": "REQ-DOC-2024-001",
  "{{RequestDate}}": "12 Nov 2024",
  "{{DocumentType}}": "Salary Certificate",
  "{{Reason}}": "Home Loan Application",
  "{{Purpose}}": "Bank Loan",
  "{{AddressedTo}}": "HDFC Bank",
  "{{SLADate}}": "15 Nov 2024",
  "{{ResignationDate}}": "—",
  "{{LastWorkingDate}}": "—",
  "{{ExitType}}": "—",
  "{{ExitReason}}": "—",
  "{{NoticePeriodServed}}": "—",
  "{{FnFAmount}}": "—",
  "{{RelievingDate}}": "—",
  "{{CurrentDate}}": new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
  "{{CurrentDateTime}}": new Date().toLocaleString("en-IN"),
  "{{CurrentMonth}}": new Date().toLocaleDateString("en-IN", { month: "long" }),
  "{{CurrentYear}}": String(new Date().getFullYear()),
  "{{FinancialYear}}": `FY ${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, "0")}`,
  "{{GeneratedDate}}": new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
}

function renderTokens(content: string): string {
  let out = content
  // Replace known tokens with sample values
  Object.entries(SAMPLE_VALUES).forEach(([token, value]) => {
    out = out.split(token).join(value)
  })
  // For any custom field tokens ({{CustomField.*}}) replace with a placeholder
  out = out.replace(/\{\{CustomField\.[^}]+\}\}/g, "[Custom Value]")
  // For any unknown {{...}} tokens, replace with bracketed name
  out = out.replace(/\{\{([^}]+)\}\}/g, "[$1]")
  return out
}

// ============================================================================
//  Template Card (grid view)
// ============================================================================
function TemplateCard({ t, onAction }: {
  t: DocumentTemplate
  onAction: (action: string, tpl: DocumentTemplate) => void
}) {
  const cat = TEMPLATE_CATEGORIES.find(c => c.value === t.category)
  return (
    <Card className="rounded-xl border border-border/60 shadow-soft hover:shadow-card hover:border-violet-500/40 transition-all overflow-hidden group flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{t.code}</p>
            </div>
          </div>
          <button
            onClick={() => onAction(t.isFavourite ? "Remove from Favourites" : "Mark as Favourite", t)}
            className="p-1 rounded hover:bg-muted/60 transition-colors"
            aria-label={t.isFavourite ? "Remove from favourites" : "Add to favourites"}
          >
            <Star className={cn("h-4 w-4", t.isFavourite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/60")} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {cat && <Badge variant="secondary" className="text-[10px] border-0 bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">{cat.label}</Badge>}
          <Badge variant="secondary" className={cn("text-[10px] border-0", STATUS_COLORS[t.status])}>{t.status}</Badge>
          <Badge variant="outline" className="text-[10px] font-mono">{t.version}</Badge>
        </div>

        <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 flex-1">{t.description || "No description provided."}</p>

        {/* Module availability badges */}
        <div className="flex flex-wrap items-center gap-1 mt-2">
          {[
            { key: "availableForOnboarding", label: "Onboarding" },
            { key: "availableForOffboarding", label: "Offboarding" },
            { key: "availableForPayroll", label: "Payroll" },
            { key: "availableForHR", label: "HR" },
            { key: "availableForRequest", label: "Request" },
          ].map(m => {
            const enabled = (t as unknown as Record<string, boolean>)[m.key]
            if (!enabled) return null
            const Icon = MODULE_ICON[m.label] || FileText
            return (
              <span key={m.key} className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">
                <Icon className="h-2.5 w-2.5" /> {m.label}
              </span>
            )
          })}
          {t.eSignRequired && (
            <span className="inline-flex items-center gap-1 rounded-md bg-fuchsia-50 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-400">
              <FileSignature className="h-2.5 w-2.5" /> eSign
            </span>
          )}
          {t.approvalRequired && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              <ShieldCheck className="h-2.5 w-2.5" /> Approval
            </span>
          )}
        </div>

        <Separator className="my-3" />

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground truncate">{t.entityName}</p>
            <p className="text-[10px] text-muted-foreground">Updated {formatDate(t.createdDate)}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onAction("Edit", t)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction("Preview", t)}><Eye className="h-3.5 w-3.5 mr-2" /> Preview</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction("Clone", t)}><Copy className="h-3.5 w-3.5 mr-2" /> Clone</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction("Create New Version", t)}><History className="h-3.5 w-3.5 mr-2" /> Create New Version</DropdownMenuItem>
              <DropdownMenuSeparator />
              {t.status !== "Active" && <DropdownMenuItem onClick={() => onAction("Publish", t)} className="text-emerald-700 dark:text-emerald-400"><Send className="h-3.5 w-3.5 mr-2" /> Publish</DropdownMenuItem>}
              {t.status === "Active" && <DropdownMenuItem onClick={() => onAction("Deactivate", t)} className="text-amber-700 dark:text-amber-400"><Power className="h-3.5 w-3.5 mr-2" /> Deactivate</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => onAction("Send", t)}><Send className="h-3.5 w-3.5 mr-2" /> Send</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction(t.isFavourite ? "Remove from Favourites" : "Mark as Favourite", t)}>
                <Star className={cn("h-3.5 w-3.5 mr-2", t.isFavourite && "fill-amber-400 text-amber-400")} /> {t.isFavourite ? "Unfavourite" : "Mark as Favourite"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction("Set as Default", t)}><Award className="h-3.5 w-3.5 mr-2" /> Set as Default</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction("View History", t)}><History className="h-3.5 w-3.5 mr-2" /> View History</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction("Delete", t)} className="text-rose-700 dark:text-rose-400"><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
//  Step Indicator
// ============================================================================
const STEPS = ["Create", "Configure", "Template", "Review & Publish"]
function StepIndicator({ step, onStep }: { step: number; onStep: (n: number) => void }) {
  const pct = (step / 4) * 100
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {STEPS.map((label, i) => {
            const n = i + 1
            const done = step > n
            const current = step === n
            return (
              <React.Fragment key={label}>
                <button
                  onClick={() => n <= step && onStep(n)}
                  disabled={n > step}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-2 sm:px-3 py-1.5 text-xs font-medium transition-all",
                    done && "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
                    current && "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm",
                    !done && !current && "text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <span className={cn(
                    "grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold",
                    done && "bg-violet-500 text-white",
                    current && "bg-white/20",
                    !done && !current && "bg-muted text-muted-foreground"
                  )}>
                    {done ? <Check className="h-3 w-3" /> : n}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
              </React.Fragment>
            )
          })}
        </div>
        <Badge variant="outline" className="border-violet-500/30 text-violet-700 dark:text-violet-400 text-xs whitespace-nowrap">
          Step {step} of 4
        </Badge>
      </div>
      <Progress value={pct} className="h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-purple-600" />
    </div>
  )
}

// ============================================================================
//  Wizard state type
// ============================================================================
interface WizardState {
  // Step 1: Create
  name: string; code: string; category: string; documentType: string; entity: string
  department: string; location: string; employeeType: string; language: string; description: string
  scope: string
  headerTemplate: string; footerTemplate: string; watermarkTemplate: string; signatureTemplate: string
  availableForRequest: boolean; availableForHR: boolean; availableForOnboarding: boolean
  availableForOffboarding: boolean; availableForPayroll: boolean
  approvalRequired: boolean; eSignRequired: boolean; acknowledgmentRequired: boolean
  allowDownload: boolean; allowEmail: boolean; allowPrint: boolean; status: string
  // Step 2: Configure
  pageSize: string; orientation: string; unit: string
  headerHeight: string; footerHeight: string; bodyTopMargin: string; bodyBottomMargin: string
  pageBackground: string; watermarkText: string; showPageNumber: boolean; showCompanyLogo: boolean
  enableHeader: boolean; headerMargins: string; repeatHeader: boolean
  bodyMargins: string; lineHeight: string; defaultFont: string; defaultFontSize: string
  enableFooter: boolean; footerMargins: string; repeatFooter: boolean; footerShowPageNumber: boolean
  // Step 3: Template
  headerContent: string; bodyContent: string; footerContent: string
}

const initialWizard: WizardState = {
  name: "", code: "", category: "", documentType: "", entity: "",
  department: "", location: "", employeeType: "Full-Time", language: "English", description: "",
  scope: "Tenant Default",
  headerTemplate: "", footerTemplate: "", watermarkTemplate: "", signatureTemplate: "",
  availableForRequest: false, availableForHR: true, availableForOnboarding: false,
  availableForOffboarding: false, availableForPayroll: false,
  approvalRequired: true, eSignRequired: false, acknowledgmentRequired: false,
  allowDownload: true, allowEmail: true, allowPrint: true, status: "Draft",
  pageSize: "A4", orientation: "Portrait", unit: "cm",
  headerHeight: "2", footerHeight: "1.5", bodyTopMargin: "2", bodyBottomMargin: "2",
  pageBackground: "#ffffff", watermarkText: "CONFIDENTIAL", showPageNumber: true, showCompanyLogo: true,
  enableHeader: true, headerMargins: "1.5", repeatHeader: false,
  bodyMargins: "1.5", lineHeight: "1.5", defaultFont: "Inter", defaultFontSize: "11",
  enableFooter: true, footerMargins: "1.5", repeatFooter: false, footerShowPageNumber: true,
  headerContent: "{{CompanyLogo}}\n{{CompanyName}} · {{CompanyAddress}}",
  bodyContent: "Date: {{CurrentDate}}\n\nTo,\n{{EmployeeName}} ({{EmployeeCode}})\n{{Designation}}, {{Department}}\n\nSubject: {{DocumentType}}\n\nDear {{FirstName}},\n\nWe are pleased to issue this document for your reference.\n\nThis letter is generated on {{GeneratedDate}} and remains valid as per company policy.\n\nFor {{CompanyName}},\n\n{{HROwner}}\n{{HREmail}}",
  footerContent: "{{CompanyName}} · {{CompanyWebsite}} · Page {{PageNumber}}",
}

// ============================================================================
//  Slug sidebar item
// ============================================================================
function SlugSidebar({ onInsert }: { onInsert: (token: string) => void }) {
  const [search, setSearch] = React.useState("")
  const filtered = React.useMemo(() => {
    if (!search.trim()) return SLUG_CATEGORIES
    const q = search.toLowerCase()
    return SLUG_CATEGORIES.map(cat => ({
      ...cat,
      slugs: cat.slugs.filter(s => s.token.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)),
    })).filter(cat => cat.slugs.length > 0)
  }, [search])

  const CAT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
    User, Briefcase, Users, Banknote, Building2, Inbox, DoorOpen, Calendar, SlidersHorizontal, FileText,
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-border/60">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search slugs..." className="pl-8 h-8 text-xs bg-background" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filtered.map(cat => {
            const Icon = CAT_ICON[cat.icon] || TypeIcon
            return (
              <div key={cat.name} className="rounded-lg border border-border/40 bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/40">
                  <Icon className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  <p className="text-[11px] font-semibold text-foreground">{cat.name}</p>
                  <span className="ml-auto text-[10px] text-muted-foreground">{cat.slugs.length}</span>
                </div>
                <div className="divide-y divide-border/30">
                  {cat.slugs.map(s => (
                    <button
                      key={s.token}
                      onClick={() => onInsert(s.token)}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-violet-50/40 dark:hover:bg-violet-500/5 transition-colors group"
                      title={s.description}
                    >
                      <p className="text-[11px] font-mono text-violet-700 dark:text-violet-400 group-hover:underline">{s.token}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================================
//  Rich Text Editor (textarea + toolbar)
// ============================================================================
function RichTextEditor({
  value, onChange, registerInsert,
}: {
  value: string
  onChange: (v: string) => void
  registerInsert: (fn: (token: string) => void) => void
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [linkOpen, setLinkOpen] = React.useState(false)
  const [linkUrl, setLinkUrl] = React.useState("")

  const wrapSelection = (before: string, after: string = before) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const text = value.slice(start, end) || "text"
    const newValue = value.slice(0, start) + before + text + after + value.slice(end)
    onChange(newValue)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = start + before.length
      el.selectionEnd = end + before.length
    })
  }

  const insertText = (text: string) => {
    const el = textareaRef.current
    if (!el) { onChange(value + text); return }
    const start = el.selectionStart
    const newValue = value.slice(0, start) + text + value.slice(el.selectionEnd)
    onChange(newValue)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = start + text.length
    })
  }

  const insertAtCursor = (token: string) => {
    insertText(token)
    toast.success(`Inserted ${token}`)
  }

  // Expose insertAtCursor via callback prop
  React.useEffect(() => {
    registerInsert(insertAtCursor)
  }, [value, registerInsert])

  const toolbarBtns: { icon: React.ComponentType<{ className?: string }>; title: string; onClick: () => void }[] = [
    { icon: Bold, title: "Bold (Ctrl+B)", onClick: () => wrapSelection("**") },
    { icon: Italic, title: "Italic (Ctrl+I)", onClick: () => wrapSelection("_") },
    { icon: Underline, title: "Underline", onClick: () => wrapSelection("<u>", "</u>") },
    { icon: Strikethrough, title: "Strikethrough", onClick: () => wrapSelection("~~") },
    { icon: Heading, title: "Heading", onClick: () => insertText("\n## ") },
    { icon: AlignLeft, title: "Left align", onClick: () => insertText("\n[align-left]") },
    { icon: AlignCenter, title: "Center align", onClick: () => insertText("\n[align-center]") },
    { icon: AlignRight, title: "Right align", onClick: () => insertText("\n[align-right]") },
    { icon: List, title: "Bullet list", onClick: () => insertText("\n- ") },
    { icon: ListOrdered, title: "Numbered list", onClick: () => insertText("\n1. ") },
    { icon: Link2, title: "Insert link", onClick: () => setLinkOpen(true) },
    { icon: Image, title: "Insert image", onClick: () => insertText("[img:logo.png]") },
    { icon: TableIcon, title: "Insert table", onClick: () => insertText("\n| Col1 | Col2 |\n|---|---|\n| A | B |\n") },
    { icon: FileSignature, title: "Insert signature", onClick: () => insertText("[signature:HR Owner]") },
    { icon: Palette, title: "Text color", onClick: () => insertText("[color:red]") },
    { icon: Type, title: "Font size", onClick: () => insertText("[size:14]") },
  ]

  return (
    <div className="flex flex-col h-full border border-border/60 rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-1 border-b border-border/60 bg-muted/40 flex-wrap">
        <button onClick={() => { /* undo mock */ toast.info("Undo") }} className="p-1.5 rounded hover:bg-muted" title="Undo"><Undo2 className="h-3.5 w-3.5" /></button>
        <button onClick={() => { /* redo mock */ toast.info("Redo") }} className="p-1.5 rounded hover:bg-muted" title="Redo"><Redo2 className="h-3.5 w-3.5" /></button>
        <Separator orientation="vertical" className="h-5 mx-1" />
        {/* eslint-disable react-hooks/refs */}
        {toolbarBtns.map((b, i) => (
          <button key={i} onClick={b.onClick} className="p-1.5 rounded hover:bg-violet-100 dark:hover:bg-violet-500/10 text-foreground" title={b.title}>
            <b.icon className="h-3.5 w-3.5" />
          </button>
        ))}
        {/* eslint-enable react-hooks/refs */}
        <Separator orientation="vertical" className="h-5 mx-1" />
        <button onClick={() => onChange("")} className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 ml-auto" title="Clear formatting">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 min-h-[280px] border-0 rounded-none font-mono text-xs bg-background resize-none focus-visible:ring-0"
        placeholder="Start typing... use {{Slug}} tokens to insert dynamic values."
      />
      {/* Link dialog inline */}
      {linkOpen && (
        <div className="border-t border-border/60 p-2 flex items-center gap-2 bg-muted/40">
          <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className="h-7 text-xs bg-background flex-1" />
          <Button size="sm" className="h-7 text-xs" onClick={() => { insertText(`[link:${linkUrl}]`); setLinkOpen(false); setLinkUrl("") }}>Insert</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setLinkOpen(false)}>Cancel</Button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
//  Live A4 preview (Step 2 right side)
// ============================================================================
function A4Preview({ w }: { w: WizardState }) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Live Preview</p>
      <div
        className={cn(
          "bg-white shadow-md border border-slate-200 transition-all",
          w.orientation === "Landscape" ? "w-full aspect-[1.414/1]" : "w-full aspect-[1/1.414]"
        )}
        style={{ background: w.pageBackground, maxWidth: w.orientation === "Landscape" ? 480 : 340 }}
      >
        <div className="flex flex-col h-full p-3 text-[8px] text-slate-700">
          {/* Watermark */}
          {w.watermarkText && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06]">
              <span className="text-2xl font-bold text-slate-900 rotate-[-30deg]">{w.watermarkText}</span>
            </div>
          )}
          {/* Header */}
          {w.enableHeader && (
            <div className="border-b border-slate-300 pb-1 mb-1.5" style={{ height: `${w.headerHeight}cm`, maxHeight: "30%" }}>
              {w.showCompanyLogo && <div className="inline-block w-6 h-3 bg-slate-200 rounded mr-1 align-middle" />}
              <p className="font-bold text-[9px]">ACME India Pvt Ltd</p>
              <p className="text-[7px] text-slate-500">MIDC, Andheri East, Mumbai</p>
            </div>
          )}
          {/* Body */}
          <div className="flex-1 overflow-hidden">
            <p className="text-center text-[7px] text-slate-500">— Document Body —</p>
            <div className="space-y-0.5 mt-1">
              <div className="h-1 bg-slate-100 rounded w-3/4" />
              <div className="h-1 bg-slate-100 rounded w-full" />
              <div className="h-1 bg-slate-100 rounded w-5/6" />
              <div className="h-1 bg-slate-100 rounded w-2/3" />
            </div>
          </div>
          {/* Footer */}
          {w.enableFooter && (
            <div className="border-t border-slate-300 pt-1 mt-1.5 flex items-center justify-between text-[7px] text-slate-500">
              <span>www.acme.com</span>
              {w.footerShowPageNumber && <span>Page 1 of 1</span>}
            </div>
          )}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">{w.pageSize} · {w.orientation} · {w.unit}</p>
    </div>
  )
}

// ============================================================================
//  Live token preview (Step 3 right side)
// ============================================================================
function TokenPreview({ content, label }: { content: string; label: string }) {
  const rendered = React.useMemo(() => renderTokens(content), [content])
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label} — Preview (with sample data)</p>
        <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-700 dark:text-violet-400">Sample</Badge>
      </div>
      <div className="flex-1 rounded-lg border border-border/60 bg-white p-4 overflow-auto">
        <pre className="text-[11px] text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{rendered}</pre>
      </div>
    </div>
  )
}

// ============================================================================
//  Toggle row helper
// ============================================================================
function ToggleRow({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md hover:bg-muted/40 p-2 cursor-pointer">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

// ============================================================================
//  Wizard dialog
// ============================================================================
function CreateWizardDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = React.useState(1)
  const [w, setW] = React.useState<WizardState>(initialWizard)
  const [editorTab, setEditorTab] = React.useState<"header" | "body" | "footer">("body")
  const insertFnRef = React.useRef<(t: string) => void>(() => {})

  const set = <K extends keyof WizardState>(k: K, v: WizardState[K]) => setW(prev => ({ ...prev, [k]: v }))

  // Reset on open
  React.useEffect(() => {
    if (open) { setStep(1); setW(initialWizard); setEditorTab("body") }
  }, [open])

  // Validation (step 4)
  const requiredFields = [
    { key: "name", label: "Template Name" },
    { key: "category", label: "Document Category" },
    { key: "entity", label: "Entity" },
  ] as const
  const missing = requiredFields.filter(f => !w[f.key as keyof WizardState])
  const warnings: string[] = []
  if (!w.code) warnings.push("Document Code is empty — will be auto-generated.")
  if (w.eSignRequired && !w.approvalRequired) warnings.push("E-Sign is required but Approval is off — approval will be auto-enabled.")
  if (!w.bodyContent.trim()) warnings.push("Body template is empty — final document will be blank.")

  const handleInsert = (token: string) => {
    insertFnRef.current(token)
  }

  const save = async (publish: boolean) => {
    if (missing.length > 0) {
      toast.error("Please fill required fields", { description: missing.map(m => m.label).join(", ") })
      setStep(1)
      return
    }
    try {
      const payload: Record<string, unknown> = {
        name: w.name,
        code: w.code || undefined,
        category: w.category,
        entityName: w.entity,
        status: publish ? "Active" : "Draft",
        version: "v1.0",
        availableForRequest: w.availableForRequest,
        availableForHR: w.availableForHR,
        availableForOnboarding: w.availableForOnboarding,
        availableForOffboarding: w.availableForOffboarding,
        availableForPayroll: w.availableForPayroll,
        approvalRequired: w.approvalRequired,
        eSignRequired: w.eSignRequired,
        acknowledgmentRequired: w.acknowledgmentRequired,
        allowDownload: w.allowDownload,
        allowEmail: w.allowEmail,
        allowPrint: w.allowPrint,
        description: w.description,
        headerTemplate: w.headerContent,
        footerTemplate: w.footerContent,
        bodyTemplate: w.bodyContent,
        pageSize: w.pageSize,
        orientation: w.orientation,
      }
      const res = await apiFetch("/api/document-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success(publish ? "Template published" : "Template saved as draft", {
          description: `${w.name} (${w.code || "AUTO-CODE"})`,
        })
        onClose()
      } else {
        toast.error("Failed to save template")
      }
    } catch {
      toast.error("Failed to save template")
    }
  }

  const next = () => setStep(s => Math.min(4, s + 1))
  const back = () => setStep(s => Math.max(1, s - 1))

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-6xl h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/60 bg-gradient-to-r from-violet-50/60 to-purple-50/40 dark:from-violet-500/5 dark:to-purple-500/5">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <Library className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base">Create Document Template</DialogTitle>
              <DialogDescription className="text-xs">4-step wizard — Create, Configure, Template, Review & Publish</DialogDescription>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {/* Step indicator */}
        <div className="px-4 py-3 border-b border-border/60 bg-muted/20">
          <StepIndicator step={step} onStep={setStep} />
        </div>

        {/* Body (scrollable) */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {step === 1 && (
              <div className="space-y-4">
                {/* Basic Information */}
                <div className="rounded-xl border border-border/60 p-4">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-violet-600" /> Basic Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Template Name *</Label>
                      <Input value={w.name} onChange={e => set("name", e.target.value)} placeholder="e.g. India Offer Letter" className="bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Document Code</Label>
                      <Input value={w.code} onChange={e => set("code", e.target.value)} placeholder="Auto-generated" className="bg-background font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Document Category *</Label>
                      <Select value={w.category} onValueChange={v => set("category", v)}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Document Type</Label>
                      <Input value={w.documentType} onChange={e => set("documentType", e.target.value)} placeholder="e.g. Offer" className="bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Entity *</Label>
                      <Select value={w.entity} onValueChange={v => set("entity", v)}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Select entity" /></SelectTrigger>
                        <SelectContent>
                          {ENTITIES.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Department</Label>
                      <Input value={w.department} onChange={e => set("department", e.target.value)} placeholder="All / specific" className="bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Location</Label>
                      <Input value={w.location} onChange={e => set("location", e.target.value)} placeholder="All / specific" className="bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Employee Type</Label>
                      <Select value={w.employeeType} onValueChange={v => set("employeeType", v)}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Full-Time", "Part-Time", "Contract", "Intern", "All"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Language</Label>
                      <Select value={w.language} onValueChange={v => set("language", v)}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["English", "Hindi", "Arabic", "Spanish", "French"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                      <Label className="text-xs">Description</Label>
                      <Textarea value={w.description} onChange={e => set("description", e.target.value)} placeholder="Brief description of when this template is used..." className="bg-background min-h-[60px]" />
                    </div>
                  </div>
                </div>

                {/* Scope */}
                <div className="rounded-xl border border-border/60 p-4">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Layers className="h-4 w-4 text-violet-600" /> Scope</p>
                  <RadioGroup value={w.scope} onValueChange={v => set("scope", v)} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {["Tenant Default", "Entity", "Branch", "Location", "Department", "Designation", "Grade", "Employee Type", "Specific Employee"].map(s => (
                      <label key={s} className={cn(
                        "flex items-center gap-2 rounded-md border p-2 text-xs cursor-pointer transition-all",
                        w.scope === s ? "border-violet-500 bg-violet-50/50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400" : "border-border/60 hover:bg-muted/40"
                      )}>
                        <RadioGroupItem value={s} className="h-3 w-3" />
                        <span className="font-medium">{s}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                {/* Configuration templates */}
                <div className="rounded-xl border border-border/60 p-4">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><FileSignature className="h-4 w-4 text-violet-600" /> Configuration Templates</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Header Template</Label>
                      <Input value={w.headerTemplate} onChange={e => set("headerTemplate", e.target.value)} placeholder="Default header template" className="bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Footer Template</Label>
                      <Input value={w.footerTemplate} onChange={e => set("footerTemplate", e.target.value)} placeholder="Default footer template" className="bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Watermark Template</Label>
                      <Input value={w.watermarkTemplate} onChange={e => set("watermarkTemplate", e.target.value)} placeholder="e.g. CONFIDENTIAL" className="bg-background" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Signature Template</Label>
                      <Input value={w.signatureTemplate} onChange={e => set("signatureTemplate", e.target.value)} placeholder="e.g. HR Manager signature" className="bg-background" />
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div className="rounded-xl border border-border/60 p-4">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-violet-600" /> Settings</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                    <ToggleRow label="Available for Employee Request" desc="Employees can request" checked={w.availableForRequest} onChange={v => set("availableForRequest", v)} />
                    <ToggleRow label="Available for HR Generation" desc="HR can generate" checked={w.availableForHR} onChange={v => set("availableForHR", v)} />
                    <ToggleRow label="Available for Onboarding" desc="Used in onboarding flow" checked={w.availableForOnboarding} onChange={v => set("availableForOnboarding", v)} />
                    <ToggleRow label="Available for Offboarding" desc="Used in exit flow" checked={w.availableForOffboarding} onChange={v => set("availableForOffboarding", v)} />
                    <ToggleRow label="Available for Payroll" desc="Used in payroll" checked={w.availableForPayroll} onChange={v => set("availableForPayroll", v)} />
                    <ToggleRow label="Approval Required" desc="Approval before publish" checked={w.approvalRequired} onChange={v => set("approvalRequired", v)} />
                    <ToggleRow label="E-Sign Required" desc="Digital signature" checked={w.eSignRequired} onChange={v => set("eSignRequired", v)} />
                    <ToggleRow label="Employee Acknowledgment" desc="Employee must acknowledge" checked={w.acknowledgmentRequired} onChange={v => set("acknowledgmentRequired", v)} />
                    <ToggleRow label="Allow Download" desc="Downloadable by employee" checked={w.allowDownload} onChange={v => set("allowDownload", v)} />
                    <ToggleRow label="Allow Email" desc="Emailable" checked={w.allowEmail} onChange={v => set("allowEmail", v)} />
                    <ToggleRow label="Allow Print" desc="Printable" checked={w.allowPrint} onChange={v => set("allowPrint", v)} />
                    <div className="space-y-1.5 p-2">
                      <Label className="text-xs">Status</Label>
                      <Select value={w.status} onValueChange={v => set("status", v)}>
                        <SelectTrigger className="bg-background h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Draft", "Active", "Inactive"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Settings */}
                <div className="space-y-4">
                  {/* Page Settings */}
                  <div className="rounded-xl border border-border/60 p-4">
                    <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Layers className="h-4 w-4 text-violet-600" /> Page Settings</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Page Size</Label>
                        <Select value={w.pageSize} onValueChange={v => set("pageSize", v)}>
                          <SelectTrigger className="bg-background h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PAGE_SIZES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Orientation</Label>
                        <Select value={w.orientation} onValueChange={v => set("orientation", v)}>
                          <SelectTrigger className="bg-background h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ORIENTATIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Unit</Label>
                        <Select value={w.unit} onValueChange={v => set("unit", v)}>
                          <SelectTrigger className="bg-background h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["cm", "mm", "px"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5"><Label className="text-xs">Header Height ({w.unit})</Label><Input value={w.headerHeight} onChange={e => set("headerHeight", e.target.value)} className="bg-background h-8 text-xs" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Footer Height ({w.unit})</Label><Input value={w.footerHeight} onChange={e => set("footerHeight", e.target.value)} className="bg-background h-8 text-xs" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Body Top Margin</Label><Input value={w.bodyTopMargin} onChange={e => set("bodyTopMargin", e.target.value)} className="bg-background h-8 text-xs" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Body Bottom Margin</Label><Input value={w.bodyBottomMargin} onChange={e => set("bodyBottomMargin", e.target.value)} className="bg-background h-8 text-xs" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Watermark Text</Label><Input value={w.watermarkText} onChange={e => set("watermarkText", e.target.value)} className="bg-background h-8 text-xs" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Page Background</Label><Input type="color" value={w.pageBackground} onChange={e => set("pageBackground", e.target.value)} className="bg-background h-8 p-1" /></div>
                      <ToggleRow label="Show Page Number" desc="In footer" checked={w.showPageNumber} onChange={v => set("showPageNumber", v)} />
                      <ToggleRow label="Show Company Logo" desc="In header" checked={w.showCompanyLogo} onChange={v => set("showCompanyLogo", v)} />
                    </div>
                  </div>

                  {/* Header Settings */}
                  <div className="rounded-xl border border-border/60 p-4">
                    <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Heading className="h-4 w-4 text-violet-600" /> Header Settings</p>
                    <div className="space-y-2">
                      <ToggleRow label="Enable Header" desc="Render header on every page" checked={w.enableHeader} onChange={v => set("enableHeader", v)} />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5"><Label className="text-xs">Margins ({w.unit})</Label><Input value={w.headerMargins} onChange={e => set("headerMargins", e.target.value)} disabled={!w.enableHeader} className="bg-background h-8 text-xs" /></div>
                        <div className="space-y-1.5"><Label className="text-xs">Height ({w.unit})</Label><Input value={w.headerHeight} onChange={e => set("headerHeight", e.target.value)} disabled={!w.enableHeader} className="bg-background h-8 text-xs" /></div>
                      </div>
                      <ToggleRow label="Repeat Header" desc="On every page" checked={w.repeatHeader} onChange={v => set("repeatHeader", v)} />
                    </div>
                  </div>

                  {/* Body Settings */}
                  <div className="rounded-xl border border-border/60 p-4">
                    <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Type className="h-4 w-4 text-violet-600" /> Body Settings</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5"><Label className="text-xs">Margins ({w.unit})</Label><Input value={w.bodyMargins} onChange={e => set("bodyMargins", e.target.value)} className="bg-background h-8 text-xs" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Line Height</Label><Input value={w.lineHeight} onChange={e => set("lineHeight", e.target.value)} className="bg-background h-8 text-xs" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Default Font</Label>
                        <Select value={w.defaultFont} onValueChange={v => set("defaultFont", v)}>
                          <SelectTrigger className="bg-background h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Inter", "Roboto", "Arial", "Times New Roman", "Calibri"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5"><Label className="text-xs">Default Font Size (pt)</Label><Input value={w.defaultFontSize} onChange={e => set("defaultFontSize", e.target.value)} className="bg-background h-8 text-xs" /></div>
                    </div>
                  </div>

                  {/* Footer Settings */}
                  <div className="rounded-xl border border-border/60 p-4">
                    <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-violet-600" /> Footer Settings</p>
                    <div className="space-y-2">
                      <ToggleRow label="Enable Footer" desc="Render footer on every page" checked={w.enableFooter} onChange={v => set("enableFooter", v)} />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5"><Label className="text-xs">Margins ({w.unit})</Label><Input value={w.footerMargins} onChange={e => set("footerMargins", e.target.value)} disabled={!w.enableFooter} className="bg-background h-8 text-xs" /></div>
                        <div className="space-y-1.5"><Label className="text-xs">Height ({w.unit})</Label><Input value={w.footerHeight} onChange={e => set("footerHeight", e.target.value)} disabled={!w.enableFooter} className="bg-background h-8 text-xs" /></div>
                      </div>
                      <ToggleRow label="Repeat Footer" desc="On every page" checked={w.repeatFooter} onChange={v => set("repeatFooter", v)} />
                      <ToggleRow label="Show Page Number" desc="In footer" checked={w.footerShowPageNumber} onChange={v => set("footerShowPageNumber", v)} />
                    </div>
                  </div>
                </div>

                {/* Live preview */}
                <div className="rounded-xl border border-border/60 p-4 bg-muted/20">
                  <A4Preview w={w} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[calc(90vh-280px)]">
                {/* Slugs sidebar */}
                <div className="lg:col-span-3 rounded-lg border border-border/60 bg-card overflow-hidden">
                  <SlugSidebar onInsert={handleInsert} />
                </div>

                {/* Editor (middle) */}
                <div className="lg:col-span-5 flex flex-col gap-2">
                  <Tabs value={editorTab} onValueChange={v => setEditorTab(v as typeof editorTab)}>
                    <TabsList className="w-full">
                      <TabsTrigger value="header" className="flex-1 text-xs">Header</TabsTrigger>
                      <TabsTrigger value="body" className="flex-1 text-xs">Body</TabsTrigger>
                      <TabsTrigger value="footer" className="flex-1 text-xs">Footer</TabsTrigger>
                    </TabsList>
                    <TabsContent value="header" className="mt-2 h-[calc(100%-40px)]">
                      <RichTextEditor value={w.headerContent} onChange={v => set("headerContent", v)} registerInsert={fn => { insertFnRef.current = fn }} />
                    </TabsContent>
                    <TabsContent value="body" className="mt-2 h-[calc(100%-40px)]">
                      <RichTextEditor value={w.bodyContent} onChange={v => set("bodyContent", v)} registerInsert={fn => { insertFnRef.current = fn }} />
                    </TabsContent>
                    <TabsContent value="footer" className="mt-2 h-[calc(100%-40px)]">
                      <RichTextEditor value={w.footerContent} onChange={v => set("footerContent", v)} registerInsert={fn => { insertFnRef.current = fn }} />
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Live preview (right) */}
                <div className="lg:col-span-4 rounded-lg border border-border/60 bg-card p-3">
                  <Tabs defaultValue="body">
                    <TabsList className="w-full">
                      <TabsTrigger value="header" className="flex-1 text-xs">Header</TabsTrigger>
                      <TabsTrigger value="body" className="flex-1 text-xs">Body</TabsTrigger>
                      <TabsTrigger value="footer" className="flex-1 text-xs">Footer</TabsTrigger>
                    </TabsList>
                    <TabsContent value="header" className="mt-2 h-[calc(100%-40px)]">
                      <TokenPreview content={w.headerContent} label="Header" />
                    </TabsContent>
                    <TabsContent value="body" className="mt-2 h-[calc(100%-40px)]">
                      <TokenPreview content={w.bodyContent} label="Body" />
                    </TabsContent>
                    <TabsContent value="footer" className="mt-2 h-[calc(100%-40px)]">
                      <TokenPreview content={w.footerContent} label="Footer" />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                {/* Validation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={cn("rounded-lg border p-3", missing.length === 0 ? "border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/5" : "border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/5")}>
                    <div className="flex items-center gap-2 mb-2">
                      {missing.length === 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                      <p className="text-sm font-semibold text-foreground">Required Fields</p>
                    </div>
                    {missing.length === 0 ? (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">All required fields are filled.</p>
                    ) : (
                      <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5 list-disc list-inside">
                        {missing.map(m => <li key={m.key}>{m.label} is required</li>)}
                      </ul>
                    )}
                  </div>
                  <div className={cn("rounded-lg border p-3", warnings.length === 0 ? "border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/5" : "border-rose-500/30 bg-rose-50/40 dark:bg-rose-500/5")}>
                    <div className="flex items-center gap-2 mb-2">
                      {warnings.length === 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-rose-600" />}
                      <p className="text-sm font-semibold text-foreground">Conflict Warnings</p>
                    </div>
                    {warnings.length === 0 ? (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">No conflicts detected.</p>
                    ) : (
                      <ul className="text-xs text-rose-700 dark:text-rose-400 space-y-0.5 list-disc list-inside">
                        {warnings.map((warn, i) => <li key={i}>{warn}</li>)}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Summary accordion */}
                <Accordion type="multiple" defaultValue={["step1", "step2", "step3"]} className="rounded-xl border border-border/60">
                  <AccordionItem value="step1" className="border-b border-border/60">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-violet-500 text-white text-[10px]">1</span>
                        Step 1: Create — Basic Info, Scope, Configuration & Settings
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Name:</span> <span className="font-medium text-foreground">{w.name || "—"}</span></div>
                        <div><span className="text-muted-foreground">Code:</span> <span className="font-mono text-foreground">{w.code || "Auto"}</span></div>
                        <div><span className="text-muted-foreground">Category:</span> <span className="font-medium text-foreground">{w.category || "—"}</span></div>
                        <div><span className="text-muted-foreground">Entity:</span> <span className="font-medium text-foreground">{w.entity || "—"}</span></div>
                        <div><span className="text-muted-foreground">Scope:</span> <span className="font-medium text-foreground">{w.scope}</span></div>
                        <div><span className="text-muted-foreground">Status:</span> <span className="font-medium text-foreground">{w.status}</span></div>
                        <div><span className="text-muted-foreground">Approval:</span> <span className="font-medium text-foreground">{w.approvalRequired ? "Yes" : "No"}</span></div>
                        <div><span className="text-muted-foreground">E-Sign:</span> <span className="font-medium text-foreground">{w.eSignRequired ? "Yes" : "No"}</span></div>
                        <div><span className="text-muted-foreground">Ack:</span> <span className="font-medium text-foreground">{w.acknowledgmentRequired ? "Yes" : "No"}</span></div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="step2" className="border-b border-border/60">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-violet-500 text-white text-[10px]">2</span>
                        Step 2: Configure — Page, Header, Body & Footer
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Page:</span> <span className="font-medium text-foreground">{w.pageSize} · {w.orientation}</span></div>
                        <div><span className="text-muted-foreground">Unit:</span> <span className="font-medium text-foreground">{w.unit}</span></div>
                        <div><span className="text-muted-foreground">Header:</span> <span className="font-medium text-foreground">{w.enableHeader ? `On (${w.headerHeight}${w.unit})` : "Off"}</span></div>
                        <div><span className="text-muted-foreground">Footer:</span> <span className="font-medium text-foreground">{w.enableFooter ? `On (${w.footerHeight}${w.unit})` : "Off"}</span></div>
                        <div><span className="text-muted-foreground">Font:</span> <span className="font-medium text-foreground">{w.defaultFont} {w.defaultFontSize}pt</span></div>
                        <div><span className="text-muted-foreground">Line Height:</span> <span className="font-medium text-foreground">{w.lineHeight}</span></div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="step3">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-violet-500 text-white text-[10px]">3</span>
                        Step 3: Template — Header, Body & Footer content
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3 space-y-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Header Preview</p>
                        <div className="rounded-md border border-border/60 bg-white p-2 text-[11px] text-slate-700 whitespace-pre-wrap">{renderTokens(w.headerContent)}</div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Body Preview</p>
                        <div className="rounded-md border border-border/60 bg-white p-2 text-[11px] text-slate-700 whitespace-pre-wrap max-h-[200px] overflow-auto">{renderTokens(w.bodyContent)}</div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Footer Preview</p>
                        <div className="rounded-md border border-border/60 bg-white p-2 text-[11px] text-slate-700 whitespace-pre-wrap">{renderTokens(w.footerContent)}</div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer (sticky) */}
        <div className="border-t border-border/60 bg-muted/30 px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="outline" size="sm" onClick={back} className="gap-1.5">
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
            {step < 4 && (
              <Button size="sm" onClick={next} className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
            {step === 4 && (
              <>
                <Button variant="outline" size="sm" onClick={() => save(false)} className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Save Draft
                </Button>
                <Button size="sm" onClick={() => save(true)} className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
                  <Send className="h-3.5 w-3.5" /> Publish
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
//  Main component
// ============================================================================
export function DocumentLibrarySection() {
  const [templates, setTemplates] = React.useState<DocumentTemplate[]>([])
  const [filters, setFilters] = React.useState({
    entity: "all", status: "all", search: "", favouritesOnly: false,
    category: "all" as "all" | TemplateCategory,
  })
  const [view, setView] = React.useState<"grid" | "list">("grid")
  const [wizardOpen, setWizardOpen] = React.useState(false)

  const loadTemplates = React.useCallback(async () => {
    try {
      const res = await apiFetch("/api/document-templates?page_size=100", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.items || [])
      }
    } catch {
      toast.error("Failed to load templates")
    }
  }, [])

  React.useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const setF = <K extends keyof typeof filters>(k: K, v: (typeof filters)[K]) => setFilters(f => ({ ...f, [k]: v }))

  const entities = React.useMemo(() => Array.from(new Set(templates.map(t => t.entityName))), [templates])

  const filtered = React.useMemo(() => {
    let list = templates
    if (filters.entity !== "all") list = list.filter(t => t.entityName === filters.entity)
    if (filters.status !== "all") list = list.filter(t => t.status === filters.status)
    if (filters.category !== "all") list = list.filter(t => t.category === filters.category)
    if (filters.favouritesOnly) list = list.filter(t => t.isFavourite)
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    }
    return list
  }, [templates, filters])

  const stats = {
    total: templates.length,
    active: templates.filter(t => t.status === "Active").length,
    draft: templates.filter(t => t.status === "Draft").length,
    favourites: templates.filter(t => t.isFavourite).length,
    avgVersions: (templates.reduce((s, t) => s + parseFloat(t.version.replace("v", "")), 0) / Math.max(1, templates.length)).toFixed(1),
  }

  const onAction = async (action: string, t: DocumentTemplate) => {
    switch (action) {
      case "Publish":
        try {
          await apiFetch(`/api/document-templates/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Active" }) })
          setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, status: "Active" as DocumentTemplate["status"] } : x))
          toast.success("Template published", { description: `${t.name} (${t.code})` })
        } catch { toast.error("Failed to publish template") }
        break
      case "Deactivate":
        try {
          await apiFetch(`/api/document-templates/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Inactive" }) })
          setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, status: "Inactive" as DocumentTemplate["status"] } : x))
          toast.success("Template deactivated", { description: `${t.name} (${t.code})` })
        } catch { toast.error("Failed to deactivate template") }
        break
      case "Delete":
        try {
          await apiFetch(`/api/document-templates/${t.id}`, { method: "DELETE" })
          setTemplates(prev => prev.filter(x => x.id !== t.id))
          toast.success("Template deleted", { description: `${t.name} (${t.code})` })
        } catch { toast.error("Failed to delete template") }
        break
      case "Mark as Favourite":
      case "Remove from Favourites":
        try {
          const newVal = action === "Mark as Favourite"
          await apiFetch(`/api/document-templates/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isFavourite: newVal }) })
          setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, isFavourite: newVal } : x))
          toast.success(action, { description: `${t.name} (${t.code})` })
        } catch { toast.error("Failed to update favourite") }
        break
      default:
        toast.success(action, { description: `${t.name} (${t.code})` })
    }
  }

  return (
    <div className="space-y-4">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-soft">
            <Library className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">Document Library</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Universal template library — create, configure & publish document templates with smart slugs.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => toast.info("Import template dialog opened")} className="gap-1.5"><FileUp className="h-3.5 w-3.5" /> Import</Button>
          <Button size="sm" variant="outline" onClick={() => toast.success("Export started")} className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export</Button>
          <Button size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
            <Plus className="h-3.5 w-3.5" /> Create Template
          </Button>
        </div>
      </div>

      {/* ---------- Stat tiles ---------- */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" variants={gridContainer} initial="hidden" animate="show">
        <motion.div variants={gridItem}><StatTile label="Total Templates" value={stats.total} icon={Library} accent="violet" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Active" value={stats.active} icon={CheckCircle2} accent="emerald" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Draft" value={stats.draft} icon={FileText} accent="slate" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Favourites" value={stats.favourites} icon={Star} accent="amber" /></motion.div>
        <motion.div variants={gridItem}><StatTile label="Avg Versions" value={stats.avgVersions} icon={History} accent="sky" sub="Per template" /></motion.div>
      </motion.div>

      {/* ---------- Filter chips & view toggle ---------- */}
      <Card className="border-border/60 rounded-xl shadow-soft">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={filters.search} onChange={e => setF("search", e.target.value)} placeholder="Search templates..." className="pl-9 h-9 bg-background" />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={filters.favouritesOnly ? "default" : "outline"}
                onClick={() => setF("favouritesOnly", !filters.favouritesOnly)}
                className={cn("gap-1.5", filters.favouritesOnly && "bg-amber-500 hover:bg-amber-600 text-white")}
              >
                <Star className={cn("h-3.5 w-3.5", filters.favouritesOnly && "fill-white")} /> Favourites
              </Button>
              <Select value={filters.entity} onValueChange={v => setF("entity", v)}>
                <SelectTrigger className="h-9 text-xs bg-background w-[140px]"><SelectValue placeholder="Entity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={v => setF("status", v)}>
                <SelectTrigger className="h-9 text-xs bg-background w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center rounded-md border border-border/60 overflow-hidden">
                <button
                  onClick={() => setView("grid")}
                  className={cn("p-2", view === "grid" ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" : "text-muted-foreground hover:bg-muted/40")}
                  title="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={cn("p-2", view === "list" ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" : "text-muted-foreground hover:bg-muted/40")}
                  title="List view"
                >
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setF("category", "all")}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all",
                filters.category === "all" ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              All Categories
            </button>
            {TEMPLATE_CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setF("category", c.value)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all",
                  filters.category === c.value ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ---------- Templates ---------- */}
      {filtered.length === 0 ? (
        <Card className="border-border/60 rounded-xl shadow-soft">
          <CardContent className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
            <Library className="h-8 w-8 opacity-40" />
            <p className="text-sm font-medium">No templates match your filters</p>
            <Button size="sm" variant="outline" onClick={() => setWizardOpen(true)} className="mt-2 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create New Template
            </Button>
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(t => <TemplateCard key={t.id} t={t} onAction={onAction} />)}
        </div>
      ) : (
        <Card className="border-border/60 rounded-xl shadow-soft overflow-hidden">
          <ScrollArea className="max-h-[640px]">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur z-10">
                <TableRow className="hover:bg-muted/40">
                  <TableHead className="min-w-[220px]">Template</TableHead>
                  <TableHead className="min-w-[140px]">Category</TableHead>
                  <TableHead className="min-w-[140px]">Entity</TableHead>
                  <TableHead className="min-w-[80px]">Version</TableHead>
                  <TableHead className="min-w-[100px]">Modules</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Favourite</TableHead>
                  <TableHead className="min-w-[110px]">Updated</TableHead>
                  <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => {
                  const cat = TEMPLATE_CATEGORIES.find(c => c.value === t.category)
                  return (
                    <TableRow key={t.id} className="border-border/40 hover:bg-violet-50/30 dark:hover:bg-violet-500/5">
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{t.code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{cat && <Badge variant="secondary" className="text-[10px] border-0 bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">{cat.label}</Badge>}</TableCell>
                      <TableCell><span className="text-xs text-foreground truncate block max-w-[140px]">{t.entityName}</span></TableCell>
                      <TableCell><span className="text-xs text-foreground font-mono">{t.version}</span></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap max-w-[140px]">
                          {t.availableForOnboarding && <Badge variant="outline" className="text-[9px] px-1">Onb</Badge>}
                          {t.availableForOffboarding && <Badge variant="outline" className="text-[9px] px-1">Exit</Badge>}
                          {t.availableForPayroll && <Badge variant="outline" className="text-[9px] px-1">Pay</Badge>}
                          {t.availableForRequest && <Badge variant="outline" className="text-[9px] px-1">Req</Badge>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className={cn("text-[10px] border-0", STATUS_COLORS[t.status])}>{t.status}</Badge></TableCell>
                      <TableCell>
                        <button onClick={() => onAction(t.isFavourite ? "Remove from Favourites" : "Mark as Favourite", t)}>
                          <Star className={cn("h-4 w-4", t.isFavourite ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                        </button>
                      </TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{formatDate(t.createdDate)}</span></TableCell>
                      <TableCell className="text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => onAction("Edit", t)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAction("Preview", t)}><Eye className="h-3.5 w-3.5 mr-2" /> Preview</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAction("Clone", t)}><Copy className="h-3.5 w-3.5 mr-2" /> Clone</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAction("Create New Version", t)}><History className="h-3.5 w-3.5 mr-2" /> New Version</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {t.status !== "Active" && <DropdownMenuItem onClick={() => onAction("Publish", t)} className="text-emerald-700 dark:text-emerald-400"><Send className="h-3.5 w-3.5 mr-2" /> Publish</DropdownMenuItem>}
                            {t.status === "Active" && <DropdownMenuItem onClick={() => onAction("Deactivate", t)} className="text-amber-700 dark:text-amber-400"><Power className="h-3.5 w-3.5 mr-2" /> Deactivate</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => onAction("Delete", t)} className="text-rose-700 dark:text-rose-400"><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      <CreateWizardDialog open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  )
}

export default DocumentLibrarySection
