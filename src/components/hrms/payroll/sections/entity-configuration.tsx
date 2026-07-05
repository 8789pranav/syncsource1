"use client"

// =============================================================
// Payroll → Settings → Entity Configuration  (FLAGSHIP 9-step wizard)
// Task ID: 3-e
//
// Layout:
//   • List page: header, stats row, filter bar, 15-column table,
//     row actions dropdown (10 actions).
//   • Create/Edit dialog: max-w-6xl, h-[90vh]. 9 clickable horizontal
//     steps at top. Done = teal check, current = teal solid, future = slate outline.
//   • Each step renders its own panel inside a ScrollArea.
//   • When "Use Tenant Default" is ON (Step 1), steps 3-8 collapse with notice.
// =============================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Building2, Plus, Search, Filter, MoreHorizontal, Eye, Pencil, Copy,
  FileCheck2, ShieldAlert, CheckCircle2, Power, Archive, History, Trash2,
  Settings2, ArrowRight, ArrowLeft, Check, X, Save, Send, Layers,
  CalendarDays, Users, ShieldCheck, FileSliders, ArrowLeftRight, Receipt,
  Mail, Plug, ClipboardList, AlertTriangle, ChevronRight, Info, Sparkles,
  CircleDot,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible"
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion"

import {
  EntityPayrollConfig, Entity,
  ENTITIES, PAYROLL_FREQUENCIES, BANK_FILE_FORMATS, APPROVAL_TYPES, CURRENCIES,
  STATUS_COLORS, formatDate, initials, avatarColor,
} from "../shared"
import { ENTITY_PAYROLL_CONFIGS, PAY_GROUPS, SALARY_STRUCTURES, SALARY_COMPONENTS, COMPLIANCE_RULES } from "../data"

// =============================================================
// Option pools
// =============================================================

const ENTITY_OPTIONS = ENTITIES.map((e) => e.name)
const PAY_GROUP_OPTIONS = PAY_GROUPS.map((p) => p.name)
const STRUCTURE_OPTIONS = SALARY_STRUCTURES.map((s) => s.name)
const COMPONENT_SETS = Array.from(new Set(["India Payroll Components", "UAE Payroll Components", "US Payroll Components", "Singapore Payroll Components"]))
const COMPLIANCE_OPTIONS = COMPLIANCE_RULES.map((c) => c.name)
const STATES_BY_COUNTRY: Record<string, string[]> = {
  "India": ["Karnataka", "Maharashtra", "Tamil Nadu", "Delhi", "Gujarat", "Telangana", "West Bengal"],
  "United Arab Emirates": ["Dubai", "Abu Dhabi", "Sharjah"],
  "United States": ["California", "New York", "Texas", "Washington"],
  "Singapore": ["Singapore"],
}
const PAY_DATE_OPTIONS = ["Last Working Day", "Last Day", "1st", "5th", "7th", "10th", "15th", "25th", "28th"]
const CUTOFF_OPTIONS = ["Last Day", "25th", "20th", "15th", "Pay Period End", "Pay Date - 2 days"]
const SALARY_RULES = ["Auto-assign on join", "Manager assigns", "HR assigns", "Manual only"]
const REVISION_RULES = ["Annual", "Annual + Promotion", "Promotion only", "Manager-initiated", "Manual"]
const INPUT_RULES = ["Manual + Auto", "Manual only", "Auto only", "Manager-submitted"]
const LOP_RULES = ["Per day = CTC/30", "Per day = CTC/26", "Per day = CTC/31", "Calendar days", "Working days only"]
const OVERTIME_RULES = ["Hourly @ 1.5x", "Hourly @ 2x", "Not Applicable", "Flat rate per hour"]
const BONUS_RULES = ["Annual", "Quarterly", "Monthly", "Festival", "Performance-based"]
const REIMBURSEMENT_RULES = ["Monthly cap", "Quarterly cap", "Annual cap", "No cap"]
const MIN_WAGE_RULES = ["National Floor", "State-specific", "Not Applicable", "UAE Labour Law", "California State", "Singapore MVP"]
const TAX_REGIME_RULES = ["New default, Old optional", "Old default, New optional", "New only", "Old only", "No income tax", "Federal + State", "Singapore Income Tax"]
const INVESTMENT_RULES = ["Annual + Proof", "Annual", "N/A", "W-4 Annual"]
const FORM16_TEMPLATES = ["India Form 16 (Auto)", "W-2 Form", "IR8A Form", "N/A"]
const CHALLAN_RULES = ["Monthly auto-generate", "WPS auto-file", "Quarterly 941", "Annual filing"]
const PAYSLIP_TEMPLATES = ["India Payslip Template", "UAE Payslip Template", "US Payslip Template", "Singapore Payslip Template"]
const BANK_ACCOUNTS = ["HDFC Salary Account - 5010012345678", "Emirates NBD Salary - 012345678901", "Chase Salary - 1234567890", "DBS Salary - 00123456789"]
const PAYMENT_MODES = ["NEFT", "RTGS", "IMPS", "WPS", "ACH", "GIRO", "Cheque"]
const ARREAR_RULES = ["Auto on revision", "Manual", "Auto + Manual"]
const FNF_RULES = ["Standard FnF", "India FnF Rule", "UAE FnF (Gratuity)", "US Final Pay", "Singapore FnF"]
const PAYOUT_MONTHS = ["Same Cycle", "Next Cycle", "Manual selection"]
const EMAIL_GROUPS = ["India Payroll Emails", "UAE Payroll Emails", "US Payroll Emails", "Singapore Payroll Emails"]
const APPROVAL_CHAINS = [
  "Payroll Admin → Finance Manager → HR Head",
  "Payroll Admin → Finance Manager",
  "Payroll Admin → HR Head",
  "Manager → HR Head → Finance",
  "Manager → Finance Head",
  "HR Head → Finance Head",
  "Finance Manager → CFO",
  "Manager → HR Head",
  "Manager → Finance",
  "HR → Finance",
]

// =============================================================
// Form state (mirrors EntityPayrollConfig with editable types)
// =============================================================

type FormState = Omit<EntityPayrollConfig, "id" | "createdAt" | "updatedAt" | "createdBy"> & {
  id?: string
}

function emptyForm(): FormState {
  return {
    id: undefined,
    entity: "",
    country: "India",
    state: "Karnataka",
    currency: "INR",
    useTenantDefault: false,
    overrideTenantDefault: true,
    status: "Active",
    priority: 1,
    version: 1,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
    // Step 2
    payrollFrequency: "Monthly",
    payrollMonthStartDay: 1,
    payrollMonthEndDay: 31,
    payDate: "Last Working Day",
    attendanceCutOff: "25th",
    leaveCutOff: "25th",
    reimbursementCutOff: "20th",
    taxDeclarationCutOff: "15th",
    loanDeductionCutOff: "Last Day",
    arrearCutOff: "Last Day",
    payrollLockDate: "Last Day",
    payslipPublishDate: "Pay Date",
    // Step 3
    defaultPayGroup: "",
    defaultSalaryStructure: "",
    defaultComponentSet: "India Payroll Components",
    defaultEmployeeSalaryRule: "Auto-assign on join",
    defaultSalaryRevisionRule: "Annual + Promotion",
    defaultPayrollInputRule: "Manual + Auto",
    defaultLopRule: "Per day = CTC/30",
    defaultOvertimeRule: "Hourly @ 1.5x",
    defaultBonusRule: "Quarterly",
    defaultReimbursementRule: "Monthly cap",
    // Step 4
    complianceRule: "India Standard Compliance",
    pfApplicable: true, esiApplicable: true, ptApplicable: true, lwfApplicable: true,
    tdsApplicable: true, gratuityApplicable: true, bonusApplicable: true,
    minimumWageRule: "Karnataka State",
    taxRegimeRule: "New default, Old optional",
    investmentDeclarationRule: "Annual + Proof",
    form16Template: "India Form 16 (Auto)",
    challanRule: "Monthly auto-generate",
    // Step 5
    defaultPayslipTemplate: "India Payslip Template",
    showEmployerContribution: true, showCtcComponents: true, showYtd: true,
    showLopDays: true, showLeaveBalance: true, hideZeroComponents: true,
    defaultBankAccount: BANK_ACCOUNTS[0],
    bankFileFormat: "HDFC Format",
    paymentApprovalRequired: true,
    paymentMode: "NEFT",
    // Step 6
    defaultArrearRule: "Auto on revision",
    autoArrearOnRevision: true, autoArrearOnLopReversal: true, autoArrearOnAttendance: true,
    arrearApprovalRequired: true, showArrearSeparately: true,
    allowManualArrear: true, allowNegativeArrear: true,
    defaultArrearPayoutMonth: "Next Cycle",
    defaultFnfRule: "Standard FnF",
    autoFetchPayrollInputs: true, autoFetchLeaveEncashment: true, autoFetchNoticeRecovery: true,
    autoFetchLoanRecovery: true, autoFetchAssetRecovery: true, autoFetchArrear: true,
    fnfApprovalRequired: true, allowFnfAfterExit: false,
    generateFnfLetter: true, fnfPaymentTracking: true,
    // Step 7
    payrollApprovalWorkflow: APPROVAL_CHAINS[0],
    salaryStructureApprovalWorkflow: APPROVAL_CHAINS[2],
    salaryRevisionApprovalWorkflow: APPROVAL_CHAINS[3],
    arrearApprovalWorkflow: APPROVAL_CHAINS[4],
    fnfApprovalWorkflow: APPROVAL_CHAINS[5],
    bankPaymentApprovalWorkflow: APPROVAL_CHAINS[6],
    emailTemplateGroup: "India Payroll Emails",
    payrollFinalizedEmail: true, payslipPublishedEmail: true, salaryHoldEmail: true,
    salaryReleaseEmail: true, taxDeclarationReminder: true, investmentProofReminder: true,
    arrearApprovedEmail: true, fnfPaymentEmail: true, bankPaymentNotification: true,
    // Step 8
    fetchAttendanceAuto: true, fetchLeaveAuto: true, fetchOvertimeAuto: false,
    fetchReimbursementAuto: true, fetchLoanDeductionAuto: true, fetchAssetRecoveryAuto: true,
    fetchOffboardingFnfAuto: true, fetchSalaryRevisionAuto: true, fetchArrearAuto: true,
    // Meta
    missingConfig: [],
    conflictWarnings: [],
    impactedEmployees: 0,
  }
}

function fromConfig(c: EntityPayrollConfig): FormState {
  const { id, createdAt, updatedAt, createdBy, ...rest } = c
  return {
    ...rest,
    id,
    effectiveFrom: rest.effectiveFrom ? rest.effectiveFrom.slice(0, 10) : "",
    effectiveTo: rest.effectiveTo ? rest.effectiveTo.slice(0, 10) : "",
  }
}

// =============================================================
// Step definitions
// =============================================================

interface StepDef {
  id: number
  label: string
  short: string
  icon: React.ComponentType<{ className?: string }>
  disabledWhenTenantDefault?: boolean
}

const STEPS: StepDef[] = [
  { id: 1, label: "Basic Entity Setup", short: "Basics", icon: Building2 },
  { id: 2, label: "Payroll Calendar", short: "Calendar", icon: CalendarDays },
  { id: 3, label: "Pay Group & Salary Defaults", short: "Pay Group", icon: Users, disabledWhenTenantDefault: true },
  { id: 4, label: "Compliance & Tax", short: "Compliance", icon: ShieldCheck, disabledWhenTenantDefault: true },
  { id: 5, label: "Payslip & Bank", short: "Payslip/Bank", icon: FileSliders, disabledWhenTenantDefault: true },
  { id: 6, label: "Arrear & FnF", short: "Arrear/FnF", icon: ArrowLeftRight, disabledWhenTenantDefault: true },
  { id: 7, label: "Approval & Email", short: "Approval/Email", icon: Mail, disabledWhenTenantDefault: true },
  { id: 8, label: "Integration Rules", short: "Integrations", icon: Plug, disabledWhenTenantDefault: true },
  { id: 9, label: "Review & Publish", short: "Review", icon: ClipboardList },
]

// =============================================================
// MAIN SECTION
// =============================================================

export function EntityConfigurationSection() {
  const [configs, setConfigs] = useState<EntityPayrollConfig[]>(ENTITY_PAYROLL_CONFIGS)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editing, setEditing] = useState<EntityPayrollConfig | null>(null)
  const [viewing, setViewing] = useState<EntityPayrollConfig | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EntityPayrollConfig | null>(null)
  const [historyTarget, setHistoryTarget] = useState<EntityPayrollConfig | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [filterCountry, setFilterCountry] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")
  const [filterTenantDefault, setFilterTenantDefault] = useState("All")

  const filtered = useMemo(() => {
    return configs.filter((c) => {
      if (search && !c.entity.toLowerCase().includes(search.toLowerCase()) && !c.country.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCountry !== "All" && c.country !== filterCountry) return false
      if (filterStatus !== "All" && c.status !== filterStatus) return false
      if (filterTenantDefault === "Yes" && !c.useTenantDefault) return false
      if (filterTenantDefault === "No" && c.useTenantDefault) return false
      return true
    })
  }, [configs, search, filterCountry, filterStatus, filterTenantDefault])

  // Stats
  const stats = useMemo(() => {
    const total = configs.length
    const active = configs.filter((c) => c.status === "Active").length
    const usingDefault = configs.filter((c) => c.useTenantDefault).length
    const overriding = configs.filter((c) => c.overrideTenantDefault).length
    const impacted = configs.reduce((sum, c) => sum + (c.impactedEmployees || 0), 0)
    return { total, active, usingDefault, overriding, impacted }
  }, [configs])

  function openAdd() {
    setEditing(null)
    setWizardOpen(true)
  }
  function openEdit(c: EntityPayrollConfig) {
    setEditing(c)
    setWizardOpen(true)
  }
  function handleSave(form: FormState) {
    if (!form.entity) {
      toast.error("Please select an entity / company")
      return
    }
    const now = new Date().toISOString()
    if (form.id) {
      const updated: EntityPayrollConfig = {
        ...(form as EntityPayrollConfig),
        id: form.id,
        updatedAt: now,
      } as EntityPayrollConfig
      setConfigs((prev) => prev.map((c) => (c.id === form.id ? updated : c)))
      toast.success(`Configuration updated for ${form.entity}`)
    } else {
      const created: EntityPayrollConfig = {
        ...(form as EntityPayrollConfig),
        id: `epc-${Date.now()}`,
        createdBy: "Anita Desai",
        createdAt: now,
        updatedAt: now,
      } as EntityPayrollConfig
      setConfigs((prev) => [...prev, created])
      toast.success(`Configuration created for ${form.entity}`)
    }
    setWizardOpen(false)
    setEditing(null)
  }
  function handleDelete(c: EntityPayrollConfig) {
    setConfigs((prev) => prev.filter((x) => x.id !== c.id))
    toast.success(`Configuration deleted for ${c.entity}`)
    setDeleteTarget(null)
  }
  function handleAction(action: string, c: EntityPayrollConfig) {
    switch (action) {
      case "view": setViewing(c); break
      case "edit": openEdit(c); break
      case "clone-tenant":
        toast.success(`Cloned tenant default into new config for ${c.entity}`)
        break
      case "clone-entity":
        toast.info(`Clone from another entity — select source entity for ${c.entity}`)
        break
      case "preview":
        toast.info(`Previewing configuration for ${c.entity}`)
        setViewing(c)
        break
      case "validate":
        if (c.missingConfig.length === 0 && c.conflictWarnings.length === 0) {
          toast.success(`Configuration for ${c.entity} is valid — no issues found`)
        } else {
          toast.warning(`Found ${c.missingConfig.length + c.conflictWarnings.length} issue(s) for ${c.entity}`)
        }
        break
      case "activate":
        setConfigs((prev) => prev.map((x) => x.id === c.id ? { ...x, status: "Active" } : x))
        toast.success(`${c.entity} configuration activated`)
        break
      case "deactivate":
        setConfigs((prev) => prev.map((x) => x.id === c.id ? { ...x, status: "Inactive" } : x))
        toast.info(`${c.entity} configuration deactivated`)
        break
      case "history": setHistoryTarget(c); break
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-soft">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Entity Configuration</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Per-entity payroll defaults. Flagship 9-step wizard drives currency, calendar, pay group, compliance, payslip, arrear, FnF, approval, email and integration rules.
            </p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white shrink-0" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Entity Configuration
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatTile label="Total Entities" value={stats.total} icon={Building2} accent="slate" />
        <StatTile label="Active Configs" value={stats.active} icon={CheckCircle2} accent="emerald" />
        <StatTile label="Using Tenant Default" value={stats.usingDefault} icon={Layers} accent="cyan" />
        <StatTile label="Override Tenant Default" value={stats.overriding} icon={ShieldAlert} accent="amber" />
        <StatTile label="Total Impacted Employees" value={stats.impacted.toLocaleString("en-IN")} icon={Users} accent="violet" />
      </div>

      {/* Filter bar */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by entity or country..."
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect label="Country" value={filterCountry} onChange={setFilterCountry} options={["All", ...Array.from(new Set(configs.map((c) => c.country)))]} />
              <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={["All", "Active", "Inactive"]} />
              <FilterSelect label="Use Tenant Default" value={filterTenantDefault} onChange={setFilterTenantDefault} options={["All", "Yes", "No"]} />
              {(search || filterCountry !== "All" || filterStatus !== "All" || filterTenantDefault !== "All") && (
                <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={() => { setSearch(""); setFilterCountry("All"); setFilterStatus("All"); setFilterTenantDefault("All") }}>
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TH>Entity / Company</TH>
                  <TH>Country</TH>
                  <TH>State</TH>
                  <TH>Default Pay Group</TH>
                  <TH>Payroll Month</TH>
                  <TH>Pay Date</TH>
                  <TH>Salary Structure</TH>
                  <TH>Compliance Rule</TH>
                  <TH>Payslip Template</TH>
                  <TH>Bank Account</TH>
                  <TH>Approval Workflow</TH>
                  <TH>Tenant Default</TH>
                  <TH>Status</TH>
                  <TH>Effective From</TH>
                  <TH>Effective To</TH>
                  <TH className="text-right">Actions</TH>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const ent = ENTITIES.find((e) => e.name === c.entity)
                  return (
                    <TableRow key={c.id} className="border-border/40 hover:bg-slate-50/60 dark:hover:bg-slate-500/5 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5 min-w-[200px]">
                          <div className={cn("grid h-8 w-8 place-items-center rounded-lg text-white text-[11px] font-semibold shrink-0", avatarColor(c.entity))}>
                            {initials(c.entity)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{c.entity}</div>
                            <div className="text-[11px] text-muted-foreground">{ent?.code || "—"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{c.country}</TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{c.state || "—"}</TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{c.defaultPayGroup || "—"}</TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{`${c.payrollMonthStartDay}–${c.payrollMonthEndDay}`}</TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{c.payDate}</TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{c.defaultSalaryStructure || "—"}</TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{c.complianceRule || "—"}</TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{c.defaultPayslipTemplate || "—"}</TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{c.defaultBankAccount?.split(" - ")[0] || "—"}</TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap max-w-[180px] truncate">{c.payrollApprovalWorkflow || "—"}</TableCell>
                      <TableCell>
                        {c.useTenantDefault ? (
                          <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400 border-0">Yes</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400 border-0">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("font-medium border-0", STATUS_COLORS[c.status] || STATUS_COLORS.Inactive)}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{formatDate(c.effectiveFrom)}</TableCell>
                      <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{formatDate(c.effectiveTo)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-500/10">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleAction("view", c)}><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction("edit", c)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleAction("clone-tenant", c)}><Copy className="h-4 w-4 mr-2" /> Clone From Tenant Default</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction("clone-entity", c)}><Copy className="h-4 w-4 mr-2" /> Clone From Another Entity</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction("preview", c)}><Eye className="h-4 w-4 mr-2" /> Preview Configuration</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction("validate", c)}><FileCheck2 className="h-4 w-4 mr-2" /> Validate Configuration</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {c.status === "Active" ? (
                              <DropdownMenuItem onClick={() => handleAction("deactivate", c)}><Power className="h-4 w-4 mr-2" /> Deactivate</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleAction("activate", c)}><Power className="h-4 w-4 mr-2" /> Set Active</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleAction("history", c)}><History className="h-4 w-4 mr-2" /> View History</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600 dark:text-rose-400" onClick={() => setDeleteTarget(c)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={16} className="py-12 text-center text-muted-foreground text-sm">
                      No entity configurations match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Wizard — keyed so it remounts (and re-initialises form) per open */}
      <EntityConfigWizard
        key={wizardOpen ? (editing?.id || "new") : "closed"}
        open={wizardOpen}
        editing={editing}
        onClose={() => { setWizardOpen(false); setEditing(null) }}
        onSave={handleSave}
      />

      {/* View dialog */}
      <ViewConfigDialog config={viewing} onClose={() => setViewing(null)} />

      {/* History dialog */}
      <HistoryDialog config={historyTarget} onClose={() => setHistoryTarget(null)} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete configuration for {deleteTarget?.entity}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The entity will fall back to tenant defaults after deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete Configuration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// =============================================================
// Stat tile
// =============================================================

function StatTile({
  label, value, icon: Icon, accent,
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  accent: "slate" | "emerald" | "cyan" | "amber" | "violet"
}) {
  const accents: Record<string, string> = {
    slate: "from-slate-500/10 to-slate-500/5 text-slate-600 dark:text-slate-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    cyan: "from-cyan-500/10 to-cyan-500/5 text-cyan-600 dark:text-cyan-400",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400",
    violet: "from-violet-500/10 to-violet-500/5 text-violet-600 dark:text-violet-400",
  }
  return (
    <Card className="border-border/60 shadow-soft">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="text-lg font-semibold text-foreground tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide hidden sm:inline">{label}:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

function TH({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <TableHead className={cn("text-[11px] uppercase tracking-wide text-muted-foreground font-semibold whitespace-nowrap min-w-[120px]", className)}>
      {children}
    </TableHead>
  )
}

// =============================================================
// 9-STEP WIZARD
// =============================================================

function EntityConfigWizard({
  open, editing, onClose, onSave,
}: {
  open: boolean
  editing: EntityPayrollConfig | null
  onClose: () => void
  onSave: (form: FormState) => void
}) {
  // Initialise form & step from props — parent remounts via `key`
  // so this runs once per wizard open.
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(() => editing ? fromConfig(editing) : emptyForm())

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  function next() { setStep((s) => Math.min(9, s + 1)) }
  function back() { setStep((s) => Math.max(1, s - 1)) }

  const isTenantDefault = form.useTenantDefault
  const stepDef = STEPS.find((s) => s.id === step)!
  const isStepDisabled = (s: StepDef) => isTenantDefault && s.disabledWhenTenantDefault

  const missingList = useMemo(() => computeMissing(form), [form])
  const conflictList = useMemo(() => computeConflicts(form), [form])

  function handleFinalSave(mode: "draft" | "publish") {
    const finalForm: FormState = {
      ...form,
      missingConfig: missingList,
      conflictWarnings: conflictList,
    }
    if (mode === "draft") {
      finalForm.status = "Inactive"
    } else {
      finalForm.status = "Active"
    }
    onSave(finalForm)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-5 py-3 border-b border-border/60 bg-gradient-to-br from-slate-500/8 via-transparent to-transparent shrink-0">
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            {editing ? "Edit Entity Configuration" : "Create Entity Configuration"}
            <Badge variant="outline" className="ml-1 text-[10px] border-slate-300/60 text-slate-700 dark:text-slate-300">
              Step {step} of 9
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {stepDef.label} — configure per-entity payroll behaviour. Click any step number to jump.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="px-5 py-3 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto">
            {STEPS.map((s, idx) => {
              const disabled = isStepDisabled(s)
              const isDone = s.id < step && !disabled
              const isCurrent = s.id === step
              const isFuture = s.id > step
              const Icon = s.icon
              return (
                <React.Fragment key={s.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setStep(s.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                      disabled && "opacity-50 cursor-not-allowed",
                      isCurrent && "bg-teal-600 text-white shadow-soft",
                      isDone && !disabled && "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300 hover:bg-teal-100",
                      isFuture && !disabled && "bg-background text-muted-foreground hover:bg-muted border border-border/60",
                      disabled && "bg-muted text-muted-foreground border border-dashed border-border/60",
                    )}
                  >
                    <span className={cn(
                      "grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold shrink-0",
                      isCurrent && "bg-white/20 text-white",
                      isDone && !disabled && "bg-teal-600 text-white",
                      isFuture && !disabled && "bg-muted-foreground/10 text-muted-foreground",
                      disabled && "bg-muted-foreground/10 text-muted-foreground",
                    )}>
                      {isDone && !disabled ? <Check className="h-3 w-3" /> : s.id}
                    </span>
                    <span className="hidden md:inline">{s.short}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <ChevronRight className={cn(
                      "h-3 w-3 shrink-0",
                      s.id < step ? "text-teal-500" : "text-muted-foreground/40",
                    )} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
          {/* Progress */}
          <div className="mt-2.5 flex items-center gap-2">
            <Progress value={(step / 9) * 100} className="h-1.5 flex-1 bg-muted" />
            <span className="text-[11px] text-muted-foreground tabular-nums">{Math.round((step / 9) * 100)}%</span>
          </div>
        </div>

        {/* Step body */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                {step === 1 && <Step1Basics form={form} set={set} />}
                {step === 2 && <Step2Calendar form={form} set={set} />}
                {step === 3 && (isTenantDefault ? <TenantDefaultNotice /> : <Step3PayGroup form={form} set={set} />)}
                {step === 4 && (isTenantDefault ? <TenantDefaultNotice /> : <Step4Compliance form={form} set={set} />)}
                {step === 5 && (isTenantDefault ? <TenantDefaultNotice /> : <Step5PayslipBank form={form} set={set} />)}
                {step === 6 && (isTenantDefault ? <TenantDefaultNotice /> : <Step6ArrearFnF form={form} set={set} />)}
                {step === 7 && (isTenantDefault ? <TenantDefaultNotice /> : <Step7ApprovalEmail form={form} set={set} />)}
                {step === 8 && (isTenantDefault ? <TenantDefaultNotice /> : <Step8Integration form={form} set={set} />)}
                {step === 9 && <Step9Review form={form} missing={missingList} conflicts={conflictList} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/60 bg-muted/30 shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={onClose}>
              <X className="h-4 w-4" /> Cancel
            </Button>
            {step > 1 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={back}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 9 && (
              <>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleFinalSave("draft")}>
                  <Save className="h-4 w-4" /> Save Draft
                </Button>
                <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => handleFinalSave("publish")}>
                  <Send className="h-4 w-4" /> Publish
                </Button>
              </>
            )}
            {step < 9 && (
              <Button size="sm" className="gap-1.5 bg-slate-600 hover:bg-slate-700 text-white" onClick={next}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================
// Helper components — Step panels
// =============================================================

function TenantDefaultNotice() {
  return (
    <Card className="rounded-xl border-dashed border-teal-300/60 bg-teal-50/40 dark:bg-teal-500/5">
      <CardContent className="p-6 flex flex-col items-center text-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
          <Info className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Using tenant default</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          This step is collapsed because <strong>&ldquo;Use Tenant Default&rdquo;</strong> is enabled in Step 1.
          The entity inherits tenant-level defaults for pay group, salary, compliance, payslip, arrear, FnF, approval, email and integration rules.
        </p>
        <p className="text-xs text-muted-foreground">
          Disable <strong>&ldquo;Use Tenant Default&rdquo;</strong> in Step 1 to override these defaults for this entity.
        </p>
      </CardContent>
    </Card>
  )
}

// ----- Field primitives -----

function FieldGroup({
  title, subtitle, icon: Icon, children,
}: {
  title: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div>{children}</div>
    </div>
  )
}

function Field({
  label, hint, children, full,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", full && "sm:col-span-2")}>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function SelectField({
  label, value, onChange, options, hint, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  hint?: string
  placeholder?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full h-9"><SelectValue placeholder={placeholder || "Select..."} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  )
}

function InputField({
  label, value, onChange, hint, type = "text", placeholder,
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  hint?: string
  type?: string
  placeholder?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9" />
    </Field>
  )
}

function ToggleField({
  label, description, checked, onChange, accent = "slate",
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  accent?: "slate" | "teal"
}) {
  const accentCls = accent === "teal"
    ? "data-[state=checked]:bg-teal-600 dark:data-[state=checked]:bg-teal-500"
    : "data-[state=checked]:bg-slate-600 dark:data-[state=checked]:bg-slate-500"
  return (
    <label className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 hover:bg-background p-3 transition-colors cursor-pointer">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className={cn("mt-0.5", accentCls)} />
    </label>
  )
}

function HintCard({
  title, children, accent = "slate",
}: {
  title: string
  children: React.ReactNode
  accent?: "slate" | "teal" | "amber"
}) {
  const accents = {
    slate: "border-slate-200/60 bg-slate-50/60 dark:bg-slate-500/5 text-slate-700 dark:text-slate-300",
    teal: "border-teal-200/60 bg-teal-50/60 dark:bg-teal-500/5 text-teal-700 dark:text-teal-300",
    amber: "border-amber-200/60 bg-amber-50/60 dark:bg-amber-500/5 text-amber-700 dark:text-amber-300",
  }
  return (
    <div className={cn("rounded-lg border p-3 text-xs", accents[accent])}>
      <div className="flex items-center gap-1.5 mb-1 font-semibold">
        <Sparkles className="h-3.5 w-3.5" /> {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

// =============================================================
// STEP 1 — Basic Entity Setup
// =============================================================

function Step1Basics({ form, set }: { form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  const stateOptions = STATES_BY_COUNTRY[form.country] || []
  return (
    <div className="flex flex-col gap-5">
      <FieldGroup title="Basic Entity Setup" subtitle="Select the entity, set tenant-default behaviour and lifecycle dates." icon={Building2}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Entity / Company *" value={form.entity} onChange={(v) => {
            const ent = ENTITIES.find((e) => e.name === v)
            set("entity", v)
            if (ent) {
              set("country", ent.country)
              set("currency", ent.currency)
              set("state", ent.state || "")
            }
          }} options={ENTITY_OPTIONS} placeholder="Select entity..." />
          <SelectField label="Country (auto-filled)" value={form.country} onChange={(v) => set("country", v)} options={Object.keys(STATES_BY_COUNTRY)} />
          <SelectField label="State" value={form.state || ""} onChange={(v) => set("state", v)} options={stateOptions.length ? stateOptions : ["—"]} />
          <SelectField label="Currency" value={form.currency} onChange={(v) => set("currency", v)} options={CURRENCIES.map((c) => c.code)} />
          <ToggleField
            label="Use Tenant Default"
            description="Inherit tenant-level defaults for pay group, compliance, payslip, arrear, FnF, approval, email and integrations."
            checked={form.useTenantDefault}
            onChange={(v) => set("useTenantDefault", v)}
            accent="teal"
          />
          <ToggleField
            label="Override Tenant Default"
            description="Allow this entity's settings to override tenant-level defaults where both exist."
            checked={form.overrideTenantDefault}
            onChange={(v) => set("overrideTenantDefault", v)}
            accent="teal"
          />
          <InputField label="Effective From" type="date" value={form.effectiveFrom} onChange={(v) => set("effectiveFrom", v)} />
          <InputField label="Effective To" type="date" value={form.effectiveTo || ""} onChange={(v) => set("effectiveTo", v)} hint="Leave blank for open-ended." />
          <SelectField label="Status" value={form.status} onChange={(v) => set("status", v as FormState["status"])} options={["Active", "Inactive"]} />
          <InputField label="Priority" type="number" value={form.priority} onChange={(v) => set("priority", Number(v))} hint="Lower number = higher priority in fallback chain." />
          <InputField label="Version" type="number" value={form.version} onChange={(v) => set("version", Number(v))} hint="Auto-incremented on each save." />
        </div>
      </FieldGroup>

      <HintCard title="Tip — Use Tenant Default">
        <p>When ON, Steps 3 through 8 will be collapsed and the entity will inherit tenant-level defaults.</p>
        <p>Disable this to override any subset of defaults for this specific entity.</p>
      </HintCard>
    </div>
  )
}

// =============================================================
// STEP 2 — Payroll Calendar
// =============================================================

function Step2Calendar({ form, set }: { form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <FieldGroup title="Payroll Calendar" subtitle="Define the frequency, period boundaries and cut-off dates that drive each payroll cycle." icon={CalendarDays}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SelectField label="Payroll Frequency" value={form.payrollFrequency} onChange={(v) => set("payrollFrequency", v)} options={[...PAYROLL_FREQUENCIES]} />
          <InputField label="Payroll Month Start Day" type="number" value={form.payrollMonthStartDay} onChange={(v) => set("payrollMonthStartDay", Number(v))} />
          <InputField label="Payroll Month End Day" type="number" value={form.payrollMonthEndDay} onChange={(v) => set("payrollMonthEndDay", Number(v))} />
          <SelectField label="Pay Date" value={form.payDate} onChange={(v) => set("payDate", v)} options={PAY_DATE_OPTIONS} />
          <SelectField label="Attendance Cut-Off" value={form.attendanceCutOff} onChange={(v) => set("attendanceCutOff", v)} options={CUTOFF_OPTIONS} />
          <SelectField label="Leave Cut-Off" value={form.leaveCutOff} onChange={(v) => set("leaveCutOff", v)} options={CUTOFF_OPTIONS} />
          <SelectField label="Reimbursement Cut-Off" value={form.reimbursementCutOff} onChange={(v) => set("reimbursementCutOff", v)} options={CUTOFF_OPTIONS} />
          <SelectField label="Tax Declaration Cut-Off" value={form.taxDeclarationCutOff} onChange={(v) => set("taxDeclarationCutOff", v)} options={CUTOFF_OPTIONS} />
          <SelectField label="Loan Deduction Cut-Off" value={form.loanDeductionCutOff} onChange={(v) => set("loanDeductionCutOff", v)} options={CUTOFF_OPTIONS} />
          <SelectField label="Arrear Cut-Off" value={form.arrearCutOff} onChange={(v) => set("arrearCutOff", v)} options={CUTOFF_OPTIONS} />
          <SelectField label="Payroll Lock Date" value={form.payrollLockDate} onChange={(v) => set("payrollLockDate", v)} options={CUTOFF_OPTIONS} />
          <SelectField label="Payslip Publish Date" value={form.payslipPublishDate} onChange={(v) => set("payslipPublishDate", v)} options={["Pay Date", "Pay Date - 1", "Pay Date - 2", "On Approval"]} />
        </div>
      </FieldGroup>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HintCard title="Monthly Example" accent="teal">
          <p>Start: 1st · End: 31st · Pay: Last Working Day</p>
          <p>Attendance cut-off: 25th · Lock: Last Day</p>
          <p>Payslip publishes on Pay Date.</p>
        </HintCard>
        <HintCard title="Bi-Weekly Example" accent="teal">
          <p>Start: 1st · End: 15th · Pay: Alternate Friday</p>
          <p>Attendance cut-off: Pay Period End · Lock: Pay Date - 2</p>
        </HintCard>
      </div>
    </div>
  )
}

// =============================================================
// STEP 3 — Pay Group & Salary Defaults
// =============================================================

function Step3PayGroup({ form, set }: { form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <FieldGroup title="Pay Group & Salary Defaults" subtitle="Default pay group, salary structure and rules for this entity." icon={Users}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Default Pay Group" value={form.defaultPayGroup} onChange={(v) => set("defaultPayGroup", v)} options={PAY_GROUP_OPTIONS} />
          <SelectField label="Default Salary Structure" value={form.defaultSalaryStructure} onChange={(v) => set("defaultSalaryStructure", v)} options={STRUCTURE_OPTIONS} />
          <SelectField label="Default Component Set" value={form.defaultComponentSet} onChange={(v) => set("defaultComponentSet", v)} options={COMPONENT_SETS} />
          <SelectField label="Employee Salary Assignment Rule" value={form.defaultEmployeeSalaryRule} onChange={(v) => set("defaultEmployeeSalaryRule", v)} options={SALARY_RULES} />
          <SelectField label="Salary Revision Rule" value={form.defaultSalaryRevisionRule} onChange={(v) => set("defaultSalaryRevisionRule", v)} options={REVISION_RULES} />
          <SelectField label="Payroll Input Rule" value={form.defaultPayrollInputRule} onChange={(v) => set("defaultPayrollInputRule", v)} options={INPUT_RULES} />
          <SelectField label="LOP Calculation Rule" value={form.defaultLopRule} onChange={(v) => set("defaultLopRule", v)} options={LOP_RULES} />
          <SelectField label="Overtime Rule" value={form.defaultOvertimeRule} onChange={(v) => set("defaultOvertimeRule", v)} options={OVERTIME_RULES} />
          <SelectField label="Bonus Rule" value={form.defaultBonusRule} onChange={(v) => set("defaultBonusRule", v)} options={BONUS_RULES} />
          <SelectField label="Reimbursement Rule" value={form.defaultReimbursementRule} onChange={(v) => set("defaultReimbursementRule", v)} options={REIMBURSEMENT_RULES} />
        </div>
      </FieldGroup>

      {/* Logic flow diagram */}
      <Card className="rounded-xl border-border/60 bg-muted/20">
        <CardContent className="p-4">
          <div className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-teal-600" /> Logic Flow — New Employee Onboarding
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <FlowNode>Employee Joins</FlowNode>
            <FlowArrow />
            <FlowNode>Check Entity Config</FlowNode>
            <FlowArrow />
            <FlowNode>Assign Pay Group</FlowNode>
            <FlowArrow />
            <FlowNode>Assign Salary Structure</FlowNode>
            <FlowArrow />
            <FlowNode accent>Create Salary Profile</FlowNode>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FlowNode({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium border",
      accent
        ? "bg-teal-600 text-white border-teal-600"
        : "bg-background text-foreground border-border/60",
    )}>
      {children}
    </span>
  )
}
function FlowArrow() {
  return <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />
}

// =============================================================
// STEP 4 — Compliance & Tax
// =============================================================

function Step4Compliance({ form, set }: { form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  const applicabilities: Array<[keyof FormState, string]> = [
    ["pfApplicable", "PF (Provident Fund)"],
    ["esiApplicable", "ESI"],
    ["ptApplicable", "PT (Professional Tax)"],
    ["lwfApplicable", "LWF (Labour Welfare Fund)"],
    ["tdsApplicable", "TDS / Income Tax"],
    ["gratuityApplicable", "Gratuity"],
    ["bonusApplicable", "Statutory Bonus"],
  ]
  return (
    <div className="flex flex-col gap-5">
      <FieldGroup title="Compliance & Tax" subtitle="Configure statutory compliance and tax rules applicable to this entity." icon={ShieldCheck}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
          <SelectField label="Compliance Rule" value={form.complianceRule} onChange={(v) => set("complianceRule", v)} options={COMPLIANCE_OPTIONS} />
          <SelectField label="Minimum Wage Rule" value={form.minimumWageRule} onChange={(v) => set("minimumWageRule", v)} options={MIN_WAGE_RULES} />
          <SelectField label="Tax Regime Rule" value={form.taxRegimeRule} onChange={(v) => set("taxRegimeRule", v)} options={TAX_REGIME_RULES} />
          <SelectField label="Investment Declaration Rule" value={form.investmentDeclarationRule} onChange={(v) => set("investmentDeclarationRule", v)} options={INVESTMENT_RULES} />
          <SelectField label="Form 16 Template" value={form.form16Template} onChange={(v) => set("form16Template", v)} options={FORM16_TEMPLATES} />
          <SelectField label="Challan Rule" value={form.challanRule} onChange={(v) => set("challanRule", v)} options={CHALLAN_RULES} />
        </div>
        <Separator className="my-2" />
        <div className="text-xs font-semibold text-foreground mb-2">Statutory Applicability</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {applicabilities.map(([key, label]) => (
            <ToggleField
              key={key}
              label={label}
              checked={Boolean(form[key])}
              onChange={(v) => set(key, v as FormState[typeof key])}
              accent="teal"
            />
          ))}
        </div>
      </FieldGroup>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HintCard title="India Example" accent="teal">
          <p>PF ✓ ESI ✓ PT ✓ LWF ✓ TDS ✓ Gratuity ✓ Bonus ✓</p>
          <p>Form 16 (Auto) · Monthly challan auto-generate</p>
        </HintCard>
        <HintCard title="UAE Example" accent="teal">
          <p>PF ✗ ESI ✗ PT ✗ LWF ✗ TDS ✗ Gratuity ✓ Bonus ✗</p>
          <p>WPS auto-file · No income tax · N/A Form 16</p>
        </HintCard>
      </div>
    </div>
  )
}

// =============================================================
// STEP 5 — Payslip & Bank
// =============================================================

function Step5PayslipBank({ form, set }: { form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  const displays: Array<[keyof FormState, string, string]> = [
    ["showEmployerContribution", "Show Employer Contribution", "Display PF/ESI/gratuity employer-side contributions."],
    ["showCtcComponents", "Show CTC Components", "Display CTC breakdown on payslip."],
    ["showYtd", "Show YTD", "Show year-to-date totals per component."],
    ["showLopDays", "Show LOP Days", "Display loss-of-pay days and deduction."],
    ["showLeaveBalance", "Show Leave Balance", "Display closing leave balances."],
    ["hideZeroComponents", "Hide Zero Components", "Skip components whose value is zero."],
  ]
  return (
    <div className="flex flex-col gap-5">
      <FieldGroup title="Payslip & Bank" subtitle="Default payslip template, display flags and bank payment configuration." icon={FileSliders}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
          <SelectField label="Default Payslip Template" value={form.defaultPayslipTemplate} onChange={(v) => set("defaultPayslipTemplate", v)} options={PAYSLIP_TEMPLATES} />
          <SelectField label="Default Bank Account" value={form.defaultBankAccount} onChange={(v) => set("defaultBankAccount", v)} options={BANK_ACCOUNTS} />
          <SelectField label="Bank File Format" value={form.bankFileFormat} onChange={(v) => set("bankFileFormat", v as FormState["bankFileFormat"])} options={[...BANK_FILE_FORMATS]} />
          <SelectField label="Payment Mode" value={form.paymentMode} onChange={(v) => set("paymentMode", v)} options={PAYMENT_MODES} />
          <ToggleField
            label="Payment Approval Required"
            description="Bank payment file must be approved before being sent."
            checked={form.paymentApprovalRequired}
            onChange={(v) => set("paymentApprovalRequired", v)}
            accent="teal"
          />
        </div>
        <Separator className="my-2" />
        <div className="text-xs font-semibold text-foreground mb-2">Payslip Display Settings</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {displays.map(([key, label, desc]) => (
            <ToggleField
              key={key}
              label={label}
              description={desc}
              checked={Boolean(form[key])}
              onChange={(v) => set(key, v as FormState[typeof key])}
              accent="teal"
            />
          ))}
        </div>
      </FieldGroup>
    </div>
  )
}

// =============================================================
// STEP 6 — Arrear & FnF
// =============================================================

function Step6ArrearFnF({ form, set }: { form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Arrear card */}
      <Card className="rounded-xl border-border/60">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Arrear Settings</h3>
              <p className="text-xs text-muted-foreground">Auto-generation, approval and payout rules.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectField label="Default Arrear Rule" value={form.defaultArrearRule} onChange={(v) => set("defaultArrearRule", v)} options={ARREAR_RULES} />
            <SelectField label="Default Payout Month" value={form.defaultArrearPayoutMonth} onChange={(v) => set("defaultArrearPayoutMonth", v)} options={PAYOUT_MONTHS} />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <ToggleField label="Auto-generate on Salary Revision" checked={form.autoArrearOnRevision} onChange={(v) => set("autoArrearOnRevision", v)} accent="teal" />
            <ToggleField label="Auto-generate on LOP Reversal" checked={form.autoArrearOnLopReversal} onChange={(v) => set("autoArrearOnLopReversal", v)} accent="teal" />
            <ToggleField label="Auto-generate on Attendance Correction" checked={form.autoArrearOnAttendance} onChange={(v) => set("autoArrearOnAttendance", v)} accent="teal" />
            <ToggleField label="Arrear Approval Required" checked={form.arrearApprovalRequired} onChange={(v) => set("arrearApprovalRequired", v)} accent="teal" />
            <ToggleField label="Show Separately in Payslip" checked={form.showArrearSeparately} onChange={(v) => set("showArrearSeparately", v)} accent="teal" />
            <ToggleField label="Allow Manual Arrear" checked={form.allowManualArrear} onChange={(v) => set("allowManualArrear", v)} accent="teal" />
            <ToggleField label="Allow Negative Arrear (Recovery)" checked={form.allowNegativeArrear} onChange={(v) => set("allowNegativeArrear", v)} accent="teal" />
          </div>
        </CardContent>
      </Card>

      {/* FnF card */}
      <Card className="rounded-xl border-border/60">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">FnF Settings</h3>
              <p className="text-xs text-muted-foreground">Auto-fetch inputs, approval and payment tracking.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectField label="Default FnF Rule" value={form.defaultFnfRule} onChange={(v) => set("defaultFnfRule", v)} options={FNF_RULES} />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <ToggleField label="Auto-fetch Payroll Inputs" checked={form.autoFetchPayrollInputs} onChange={(v) => set("autoFetchPayrollInputs", v)} accent="teal" />
            <ToggleField label="Auto-fetch Leave Encashment" checked={form.autoFetchLeaveEncashment} onChange={(v) => set("autoFetchLeaveEncashment", v)} accent="teal" />
            <ToggleField label="Auto-fetch Notice Recovery" checked={form.autoFetchNoticeRecovery} onChange={(v) => set("autoFetchNoticeRecovery", v)} accent="teal" />
            <ToggleField label="Auto-fetch Loan Recovery" checked={form.autoFetchLoanRecovery} onChange={(v) => set("autoFetchLoanRecovery", v)} accent="teal" />
            <ToggleField label="Auto-fetch Asset Recovery" checked={form.autoFetchAssetRecovery} onChange={(v) => set("autoFetchAssetRecovery", v)} accent="teal" />
            <ToggleField label="Auto-fetch Arrear" checked={form.autoFetchArrear} onChange={(v) => set("autoFetchArrear", v)} accent="teal" />
            <ToggleField label="FnF Approval Required" checked={form.fnfApprovalRequired} onChange={(v) => set("fnfApprovalRequired", v)} accent="teal" />
            <ToggleField label="Allow FnF After Exit" checked={form.allowFnfAfterExit} onChange={(v) => set("allowFnfAfterExit", v)} accent="teal" />
            <ToggleField label="Generate FnF Letter" checked={form.generateFnfLetter} onChange={(v) => set("generateFnfLetter", v)} accent="teal" />
            <ToggleField label="FnF Payment Tracking" checked={form.fnfPaymentTracking} onChange={(v) => set("fnfPaymentTracking", v)} accent="teal" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================
// STEP 7 — Approval & Email
// =============================================================

function Step7ApprovalEmail({ form, set }: { form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  const approvals: Array<[keyof FormState, string]> = [
    ["payrollApprovalWorkflow", "Payroll Approval"],
    ["salaryStructureApprovalWorkflow", "Salary Structure Approval"],
    ["salaryRevisionApprovalWorkflow", "Salary Revision Approval"],
    ["arrearApprovalWorkflow", "Arrear Approval"],
    ["fnfApprovalWorkflow", "FnF Approval"],
    ["bankPaymentApprovalWorkflow", "Bank Payment Approval"],
  ]
  const emails: Array<[keyof FormState, string]> = [
    ["payrollFinalizedEmail", "Payroll Finalized"],
    ["payslipPublishedEmail", "Payslip Published"],
    ["salaryHoldEmail", "Salary Hold"],
    ["salaryReleaseEmail", "Salary Release"],
    ["taxDeclarationReminder", "Tax Declaration Reminder"],
    ["investmentProofReminder", "Investment Proof Reminder"],
    ["arrearApprovedEmail", "Arrear Approved"],
    ["fnfPaymentEmail", "FnF Payment"],
    ["bankPaymentNotification", "Bank Payment Notification"],
  ]
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Approval card */}
      <Card className="rounded-xl border-border/60">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Approval Settings</h3>
              <p className="text-xs text-muted-foreground">Per-domain approval workflows and types.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {approvals.map(([key, label]) => (
              <div key={key} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                <Field label={label}>
                  <Input value={String(form[key] || "")} onChange={(e) => set(key, e.target.value as FormState[typeof key])} className="h-9" />
                </Field>
                <SelectField label="Approval Type" value="Sequential Approval" onChange={() => {}} options={[...APPROVAL_TYPES]} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Email card */}
      <Card className="rounded-xl border-border/60">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/20">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Email Settings</h3>
              <p className="text-xs text-muted-foreground">Per-event email toggles and template group.</p>
            </div>
          </div>
          <SelectField label="Email Template Group" value={form.emailTemplateGroup} onChange={(v) => set("emailTemplateGroup", v)} options={EMAIL_GROUPS} />
          <div className="grid grid-cols-1 gap-2">
            {emails.map(([key, label]) => (
              <ToggleField
                key={key}
                label={label}
                checked={Boolean(form[key])}
                onChange={(v) => set(key, v as FormState[typeof key])}
                accent="teal"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================
// STEP 8 — Integration Rules
// =============================================================

function Step8Integration({ form, set }: { form: FormState; set: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  const sources: Array<[keyof FormState, string, string]> = [
    ["fetchAttendanceAuto", "Attendance", "Auto-fetch attendance records from the Attendance module."],
    ["fetchLeaveAuto", "Leave", "Auto-fetch leave applications and LOP days."],
    ["fetchOvertimeAuto", "Overtime", "Auto-fetch approved overtime hours."],
    ["fetchReimbursementAuto", "Reimbursement", "Auto-fetch approved reimbursements."],
    ["fetchLoanDeductionAuto", "Loan Deduction", "Auto-fetch loan EMI deductions."],
    ["fetchAssetRecoveryAuto", "Asset Recovery", "Auto-fetch asset damage/loss recovery."],
    ["fetchOffboardingFnfAuto", "Offboarding FnF", "Auto-fetch FnF triggers from offboarding."],
    ["fetchSalaryRevisionAuto", "Salary Revision", "Auto-fetch approved salary revisions."],
    ["fetchArrearAuto", "Arrear", "Auto-fetch approved arrear cases."],
  ]
  return (
    <div className="flex flex-col gap-5">
      <FieldGroup title="Integration Rules" subtitle="Configure which source modules feed into payroll automatically." icon={Plug}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {sources.map(([key, label, desc]) => (
            <ToggleField
              key={key}
              label={label}
              description={desc}
              checked={Boolean(form[key])}
              onChange={(v) => set(key, v as FormState[typeof key])}
              accent="teal"
            />
          ))}
        </div>
      </FieldGroup>

      {/* Source modules reference */}
      <Card className="rounded-xl border-border/60 bg-muted/20">
        <CardContent className="p-4">
          <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-slate-600" /> Source Modules Reference
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sources.map(([, label]) => (
              <Badge key={label} variant="outline" className="text-[11px] bg-background">{label}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================
// STEP 9 — Review & Publish
// =============================================================

function Step9Review({
  form, missing, conflicts,
}: {
  form: FormState
  missing: string[]
  conflicts: string[]
}) {
  const summarySteps = STEPS.slice(0, 8)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 ring-1 ring-teal-500/20">
          <ClipboardList className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Review & Publish</h3>
          <p className="text-xs text-muted-foreground">Verify all settings, then save as draft or publish.</p>
        </div>
      </div>

      {/* Summary accordion */}
      <Accordion type="multiple" defaultValue={["s1"]} className="w-full">
        {summarySteps.map((s) => {
          const Icon = s.icon
          return (
            <AccordionItem key={s.id} value={`s${s.id}`} className="border-border/60">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <span className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[11px] font-semibold">
                    {s.id}
                  </span>
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {s.label}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-xs">
                <StepSummary stepId={s.id} form={form} />
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Missing config + conflicts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className={cn("rounded-xl border", missing.length ? "border-amber-300/60" : "border-emerald-300/60")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={cn("h-4 w-4", missing.length ? "text-amber-600" : "text-emerald-600")} />
              <h4 className="text-sm font-semibold text-foreground">Missing Configuration</h4>
              <Badge variant="outline" className="ml-auto text-[10px]">{missing.length}</Badge>
            </div>
            {missing.length === 0 ? (
              <p className="text-xs text-muted-foreground">No missing configuration. All required fields are set.</p>
            ) : (
              <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc pl-4 space-y-0.5">
                {missing.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className={cn("rounded-xl border", conflicts.length ? "border-rose-300/60" : "border-emerald-300/60")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className={cn("h-4 w-4", conflicts.length ? "text-rose-600" : "text-emerald-600")} />
              <h4 className="text-sm font-semibold text-foreground">Conflict Warnings</h4>
              <Badge variant="outline" className="ml-auto text-[10px]">{conflicts.length}</Badge>
            </div>
            {conflicts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No conflicts detected. Configuration is consistent.</p>
            ) : (
              <ul className="text-xs text-rose-700 dark:text-rose-300 list-disc pl-4 space-y-0.5">
                {conflicts.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Impacted employees */}
      <Card className="rounded-xl border-border/60 bg-slate-50/60 dark:bg-slate-500/5">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Impacted Employees</div>
            <div className="text-lg font-semibold text-foreground tabular-nums">{form.impactedEmployees.toLocaleString("en-IN")}</div>
          </div>
          <p className="text-xs text-muted-foreground ml-auto max-w-sm text-right">
            Employees whose payroll will be affected by this configuration based on entity assignment.
          </p>
        </CardContent>
      </Card>

      {/* Fallback diagram */}
      <Card className="rounded-xl border-border/60 bg-muted/20">
        <CardContent className="p-4">
          <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-teal-600" /> Entity-wise Fallback Logic
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <FlowNode>Employee-specific</FlowNode>
            <FlowArrow />
            <FlowNode>Dept + Type</FlowNode>
            <FlowArrow />
            <FlowNode>Grade</FlowNode>
            <FlowArrow />
            <FlowNode>Location</FlowNode>
            <FlowArrow />
            <FlowNode>Entity</FlowNode>
            <FlowArrow />
            <FlowNode accent>Tenant Default</FlowNode>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StepSummary({ stepId, form }: { stepId: number; form: FormState }) {
  const rows: Record<number, Array<[string, string]>> = {
    1: [
      ["Entity", form.entity],
      ["Country / State", `${form.country} / ${form.state || "—"}`],
      ["Currency", form.currency],
      ["Use Tenant Default", form.useTenantDefault ? "Yes" : "No"],
      ["Override Tenant Default", form.overrideTenantDefault ? "Yes" : "No"],
      ["Status / Priority", `${form.status} · P${form.priority}`],
      ["Effective", `${formatDate(form.effectiveFrom)} → ${formatDate(form.effectiveTo)}`],
    ],
    2: [
      ["Frequency", form.payrollFrequency],
      ["Payroll Month", `${form.payrollMonthStartDay}–${form.payrollMonthEndDay}`],
      ["Pay Date", form.payDate],
      ["Attendance Cut-Off", form.attendanceCutOff],
      ["Leave Cut-Off", form.leaveCutOff],
      ["Reimbursement Cut-Off", form.reimbursementCutOff],
      ["Payroll Lock", form.payrollLockDate],
      ["Payslip Publish", form.payslipPublishDate],
    ],
    3: [
      ["Default Pay Group", form.defaultPayGroup],
      ["Default Salary Structure", form.defaultSalaryStructure],
      ["Component Set", form.defaultComponentSet],
      ["Salary Assignment", form.defaultEmployeeSalaryRule],
      ["Revision Rule", form.defaultSalaryRevisionRule],
      ["LOP Rule", form.defaultLopRule],
      ["Overtime Rule", form.defaultOvertimeRule],
    ],
    4: [
      ["Compliance Rule", form.complianceRule],
      ["PF/ESI/PT/LWF", [form.pfApplicable, form.esiApplicable, form.ptApplicable, form.lwfApplicable].map((v) => v ? "✓" : "✗").join(" / ")],
      ["TDS/Gratuity/Bonus", [form.tdsApplicable, form.gratuityApplicable, form.bonusApplicable].map((v) => v ? "✓" : "✗").join(" / ")],
      ["Tax Regime", form.taxRegimeRule],
      ["Form 16", form.form16Template],
      ["Challan Rule", form.challanRule],
    ],
    5: [
      ["Payslip Template", form.defaultPayslipTemplate],
      ["Bank Account", form.defaultBankAccount],
      ["Bank File Format", form.bankFileFormat],
      ["Payment Mode", form.paymentMode],
      ["Approval Required", form.paymentApprovalRequired ? "Yes" : "No"],
      ["Hide Zero Components", form.hideZeroComponents ? "Yes" : "No"],
    ],
    6: [
      ["Arrear Rule", form.defaultArrearRule],
      ["Auto on Revision", form.autoArrearOnRevision ? "Yes" : "No"],
      ["Approval Required", form.arrearApprovalRequired ? "Yes" : "No"],
      ["FnF Rule", form.defaultFnfRule],
      ["Auto-fetch Inputs", form.autoFetchPayrollInputs ? "Yes" : "No"],
      ["FnF Letter", form.generateFnfLetter ? "Yes" : "No"],
    ],
    7: [
      ["Payroll Approval", form.payrollApprovalWorkflow],
      ["Structure Approval", form.salaryStructureApprovalWorkflow],
      ["Revision Approval", form.salaryRevisionApprovalWorkflow],
      ["FnF Approval", form.fnfApprovalWorkflow],
      ["Bank Payment Approval", form.bankPaymentApprovalWorkflow],
      ["Email Group", form.emailTemplateGroup],
    ],
    8: [
      ["Attendance", form.fetchAttendanceAuto ? "Auto" : "Manual"],
      ["Leave", form.fetchLeaveAuto ? "Auto" : "Manual"],
      ["Overtime", form.fetchOvertimeAuto ? "Auto" : "Manual"],
      ["Reimbursement", form.fetchReimbursementAuto ? "Auto" : "Manual"],
      ["Loan Deduction", form.fetchLoanDeductionAuto ? "Auto" : "Manual"],
      ["Offboarding FnF", form.fetchOffboardingFnfAuto ? "Auto" : "Manual"],
    ],
  }
  const data = rows[stepId] || []
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1">
      {data.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 py-0.5 border-b border-border/40 last:border-0">
          <span className="text-muted-foreground">{k}</span>
          <span className="text-foreground font-medium text-right truncate max-w-[60%]">{v || "—"}</span>
        </div>
      ))}
    </div>
  )
}

// =============================================================
// Validation helpers
// =============================================================

function computeMissing(form: FormState): string[] {
  const list: string[] = []
  if (!form.entity) list.push("Entity / Company not selected")
  if (form.useTenantDefault) return list
  if (!form.defaultPayGroup) list.push("Default Pay Group not set")
  if (!form.defaultSalaryStructure) list.push("Default Salary Structure not set")
  if (!form.defaultBankAccount) list.push("Default Bank Account not set")
  if (form.country === "India" && !form.pfApplicable && !form.tdsApplicable) {
    list.push("India entity has both PF and TDS disabled")
  }
  if (!form.payrollFrequency) list.push("Payroll Frequency not set")
  return list
}

function computeConflicts(form: FormState): string[] {
  const list: string[] = []
  if (form.useTenantDefault && form.overrideTenantDefault) {
    list.push("'Use Tenant Default' and 'Override Tenant Default' are both enabled — override is ignored")
  }
  if (!form.useTenantDefault) {
    if (form.country === "United Arab Emirates" && (form.pfApplicable || form.esiApplicable || form.ptApplicable)) {
      list.push("UAE entity has PF/ESI/PT enabled — these are not applicable in UAE")
    }
    if (form.country === "India" && form.taxRegimeRule === "No income tax") {
      list.push("India entity has 'No income tax' regime — India levies income tax")
    }
    if (form.country === "Singapore" && form.form16Template === "India Form 16 (Auto)") {
      list.push("Singapore entity using India Form 16 template — should be IR8A")
    }
  }
  return list
}

// =============================================================
// View Dialog
// =============================================================

function ViewConfigDialog({ config, onClose }: { config: EntityPayrollConfig | null; onClose: () => void }) {
  if (!config) return null
  return (
    <Dialog open={!!config} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-slate-500/8 via-transparent to-transparent shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            {config.entity}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Entity configuration preview · v{config.version} · {config.country}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <ViewRow label="Country" value={config.country} />
            <ViewRow label="State" value={config.state || "—"} />
            <ViewRow label="Currency" value={config.currency} />
            <ViewRow label="Status" value={config.status} />
            <ViewRow label="Use Tenant Default" value={config.useTenantDefault ? "Yes" : "No"} />
            <ViewRow label="Override Tenant Default" value={config.overrideTenantDefault ? "Yes" : "No"} />
            <ViewRow label="Effective" value={`${formatDate(config.effectiveFrom)} → ${formatDate(config.effectiveTo)}`} />
            <ViewRow label="Priority" value={`P${config.priority}`} />
            <ViewRow label="Payroll Frequency" value={config.payrollFrequency} />
            <ViewRow label="Pay Date" value={config.payDate} />
            <ViewRow label="Default Pay Group" value={config.defaultPayGroup} />
            <ViewRow label="Salary Structure" value={config.defaultSalaryStructure} />
            <ViewRow label="Compliance Rule" value={config.complianceRule} />
            <ViewRow label="Bank Account" value={config.defaultBankAccount} />
            <ViewRow label="Bank File Format" value={config.bankFileFormat} />
            <ViewRow label="Payment Mode" value={config.paymentMode} />
            <ViewRow label="Arrear Rule" value={config.defaultArrearRule} />
            <ViewRow label="FnF Rule" value={config.defaultFnfRule} />
            <ViewRow label="Email Group" value={config.emailTemplateGroup} />
            <ViewRow label="Impacted Employees" value={config.impactedEmployees.toLocaleString("en-IN")} />
            <ViewRow label="Created By" value={config.createdBy} />
            <ViewRow label="Updated At" value={formatDate(config.updatedAt)} />
            {config.missingConfig.length > 0 && (
              <div className="sm:col-span-2 mt-2 rounded-lg border border-amber-300/60 bg-amber-50/60 dark:bg-amber-500/5 p-3">
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">Missing Configuration</div>
                <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc pl-4">
                  {config.missingConfig.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}
            {config.conflictWarnings.length > 0 && (
              <div className="sm:col-span-2 mt-2 rounded-lg border border-rose-300/60 bg-rose-50/60 dark:bg-rose-500/5 p-3">
                <div className="text-xs font-semibold text-rose-700 dark:text-rose-300 mb-1">Conflict Warnings</div>
                <ul className="text-xs text-rose-700 dark:text-rose-300 list-disc pl-4">
                  {config.conflictWarnings.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/30 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onClose}><X className="h-4 w-4" /> Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-border/40">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  )
}

// =============================================================
// History Dialog
// =============================================================

function HistoryDialog({ config, onClose }: { config: EntityPayrollConfig | null; onClose: () => void }) {
  if (!config) return null
  const versions = Array.from({ length: config.version }, (_, i) => {
    const v = config.version - i
    return {
      version: v,
      label: v === config.version ? "Current" : `v${v}`,
      date: new Date(Date.now() - i * 15 * 86400000).toISOString(),
      by: i % 2 === 0 ? config.createdBy : "Anita Desai",
      action: v === config.version ? "Updated" : v === 1 ? "Created" : "Updated",
    }
  })
  return (
    <Dialog open={!!config} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-border/60 shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            Configuration History — {config.entity}
          </DialogTitle>
          <DialogDescription className="text-xs">All versions of this entity configuration.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-5">
            <ol className="relative border-l border-border/60 ml-2 space-y-4">
              {versions.map((v, idx) => (
                <li key={idx} className="ml-4">
                  <div className={cn(
                    "absolute -left-2 grid h-4 w-4 place-items-center rounded-full",
                    idx === 0 ? "bg-teal-600" : "bg-slate-400",
                  )}>
                    <CircleDot className="h-2.5 w-2.5 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{v.label}</span>
                    {idx === 0 && <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400 border-0">Current</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{v.action} by {v.by} · {formatDate(v.date)}</div>
                </li>
              ))}
            </ol>
          </div>
        </ScrollArea>
        <DialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/30 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onClose}><X className="h-4 w-4" /> Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EntityConfigurationSection
