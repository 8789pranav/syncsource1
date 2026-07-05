"use client"

// ============================================================================
//  Offboarding — Employees / Exit Cases (Task 2b)
// ----------------------------------------------------------------------------
//  Main operational page. Renders the exit cases table with full filter bar,
//  top action bar, bulk actions, row-action menu, and a 7-step Initiate Exit
//  wizard dialog.
// ============================================================================

import * as React from "react"
import {
  UserMinus, UserPlus, Search, Download, Upload, Bell, Workflow as WorkflowIcon,
  MoreHorizontal, Eye, Pencil, KanbanSquare, CheckCircle2, XCircle, CalendarClock,
  ShieldCheck, ListChecks, Wallet, FileText, LogOut, Ban, ScrollText, ChevronLeft,
  ChevronRight, Check, AlertTriangle, Sparkles, ArrowRight, Layers, Filter,
  Building2, MapPin, Users as UsersIcon, Briefcase, Mail, Lock, ShieldAlert,
  Clock, FileCheck2, Send, Save, FileSignature, History,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  ExitCase, ExitWorkflow, ClearanceTask,
  EXIT_TYPES, EXIT_CATEGORIES, EXIT_REASONS, DEFAULT_EXIT_STAGES,
  STATUS_COLORS, EXIT_TYPE_COLORS, AVATAR_COLORS,
  initials, formatDate,
} from "../shared"
import { EXIT_CASES, EXIT_WORKFLOWS, CLEARANCE_TASKS } from "../data"

// ============================================================================
//  Local constants — derived from seed data
// ============================================================================

const ENTITIES = Array.from(new Set(EXIT_CASES.map((c) => c.entity))).sort()
const BRANCHES = Array.from(new Set(EXIT_CASES.map((c) => c.branch).filter(Boolean) as string[])).sort()
const LOCATIONS = Array.from(new Set(EXIT_CASES.map((c) => c.location).filter(Boolean) as string[])).sort()
const DEPARTMENTS = Array.from(new Set(EXIT_CASES.map((c) => c.department))).sort()
const MANAGERS = Array.from(new Set(EXIT_CASES.map((c) => c.reportingManager))).sort()
const HR_OWNERS = Array.from(new Set(EXIT_CASES.map((c) => c.hrOwner))).sort()

const EXIT_STATUSES = ["Active", "On Hold", "Exited", "Withdrawn", "Cancelled", "Draft"] as const
const CLEARANCE_STATUSES = ["Not Started", "Pending", "In Progress", "Completed", "Overdue", "Waived"] as const
const FNF_STATUSES = ["Not Started", "Draft", "Inputs Pending", "Calculated", "Under Review", "Approved", "Paid", "Closed", "On Hold"] as const

// Sample list of "active employees" for the Initiate Exit employee dropdown.
// (In production this would come from the employee master; here we synthesize
//  from non-exited profiles + a few extra names so HR can pick one.)
const ACTIVE_EMPLOYEES = [
  { id: "emp-1", code: "EMP-1201", name: "Aditya Joshi", entity: "ACME India Pvt Ltd", location: "Bangalore", department: "Engineering", designation: "Senior Software Engineer", reportingManager: "Priya Patel", dateOfJoining: "2022-03-14", employmentType: "Full-time", status: "Active", avatarColor: "#0ea5e9" },
  { id: "emp-2", code: "EMP-1198", name: "Meera Krishnan", entity: "ACME India Pvt Ltd", location: "Hyderabad", department: "Design", designation: "UX Designer", reportingManager: "Sneha Reddy", dateOfJoining: "2021-07-01", employmentType: "Full-time", status: "Active", avatarColor: "#8b5cf6" },
  { id: "emp-3", code: "EMP-1210", name: "Sanjay Pillai", entity: "ACME India Pvt Ltd", location: "Mumbai", department: "Sales", designation: "Sales Executive", reportingManager: "Arjun Mehta", dateOfJoining: "2023-01-09", employmentType: "Full-time", status: "Active", avatarColor: "#14b8a6" },
  { id: "emp-4", code: "EMP-1175", name: "Nisha Agarwal", entity: "ACME UAE FZ-LLC", location: "Dubai", department: "Marketing", designation: "Marketing Lead", reportingManager: "Mohammed Al Farsi", dateOfJoining: "2020-11-23", employmentType: "Full-time", status: "Active", avatarColor: "#f59e0b" },
  { id: "emp-5", code: "EMP-1188", name: "Karan Malhotra", entity: "ACME India Pvt Ltd", location: "Pune", department: "Engineering", designation: "DevOps Engineer", reportingManager: "Priya Patel", dateOfJoining: "2022-09-12", employmentType: "Contract", status: "Active", avatarColor: "#ec4899" },
  { id: "emp-6", code: "EMP-1220", name: "Fatima Sheikh", entity: "ACME India Pvt Ltd", location: "Bangalore", department: "HR", designation: "HR Business Partner", reportingManager: "Anita Desai", dateOfJoining: "2019-04-02", employmentType: "Full-time", status: "Active", avatarColor: "#f97316" },
]

// ============================================================================
//  Wizard step definition
// ============================================================================

const WIZARD_STEPS = [
  { id: 1, name: "Employee Selection", icon: UsersIcon, short: "Employee" },
  { id: 2, name: "Exit Details", icon: FileText, short: "Exit Details" },
  { id: 3, name: "Workflow Selection", icon: WorkflowIcon, short: "Workflow" },
  { id: 4, name: "Clearance & Checklist", icon: ShieldCheck, short: "Clearance" },
  { id: 5, name: "Notice / FnF", icon: Wallet, short: "Notice / FnF" },
  { id: 6, name: "Email / Notification", icon: Mail, short: "Notifications" },
  { id: 7, name: "Review & Initiate", icon: CheckCircle2, short: "Review" },
] as const

// ============================================================================
//  Form state shape for the Initiate Exit wizard
// ============================================================================

interface ExitFormState {
  // Step 1
  employeeId: string
  employeeCode: string
  employeeName: string
  entity: string
  department: string
  designation: string
  location: string
  reportingManager: string
  dateOfJoining: string
  employmentType: string
  employeeStatus: string

  // Step 2
  exitType: string
  exitCategory: string
  exitReason: string
  subReason: string
  detailedReason: string
  resignationDate: string
  noticeStartDate: string
  requestedLwd: string
  approvedLwd: string
  noticePeriodRequired: boolean
  noticeServedDays: number
  noticeShortfallDays: number
  noticeWaiver: boolean
  noticeBuyout: boolean
  employeeRemarks: string
  legalHold: boolean
  regrettable: boolean
  eligibleRehire: boolean
  confidential: boolean

  // Step 3
  workflowMode: "auto" | "manual"
  workflowId: string

  // Step 6
  sendResignationEmail: boolean
  sendClearanceEmails: boolean
  sendManagerApprovalEmail: boolean
  ccHr: boolean
  ccManager: boolean
  ccPayroll: boolean
}

const EMPTY_FORM: ExitFormState = {
  employeeId: "",
  employeeCode: "",
  employeeName: "",
  entity: "",
  department: "",
  designation: "",
  location: "",
  reportingManager: "",
  dateOfJoining: "",
  employmentType: "Full-time",
  employeeStatus: "Active",

  exitType: "",
  exitCategory: "",
  exitReason: "",
  subReason: "",
  detailedReason: "",
  resignationDate: new Date().toISOString().slice(0, 10),
  noticeStartDate: new Date().toISOString().slice(0, 10),
  requestedLwd: "",
  approvedLwd: "",
  noticePeriodRequired: true,
  noticeServedDays: 0,
  noticeShortfallDays: 0,
  noticeWaiver: false,
  noticeBuyout: false,
  employeeRemarks: "",
  legalHold: false,
  regrettable: false,
  eligibleRehire: true,
  confidential: false,

  workflowMode: "auto",
  workflowId: "",

  sendResignationEmail: true,
  sendClearanceEmails: true,
  sendManagerApprovalEmail: true,
  ccHr: true,
  ccManager: true,
  ccPayroll: false,
}

// ============================================================================
//  Helpers
// ============================================================================

function stageById(id: string) {
  return DEFAULT_EXIT_STAGES.find((s) => s.id === id)
}

function coloredBadge(label: string, colorMap: Record<string, string>) {
  const color = colorMap[label] || "#64748b"
  return (
    <Badge
      variant="secondary"
      className="font-medium border-0 gap-1 text-[11px] py-0.5 px-1.5"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </Badge>
  )
}

// ============================================================================
//  Main component
// ============================================================================

export function ExitCasesSection() {
  // ---- table state ----
  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState({
    entity: "all",
    branch: "all",
    location: "all",
    department: "all",
    exitType: "all",
    exitStatus: "all",
    clearanceStatus: "all",
    fnfStatus: "all",
    manager: "all",
    hrOwner: "all",
  })
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  // ---- wizard state ----
  const [wizardOpen, setWizardOpen] = React.useState(false)
  const [wizardStep, setWizardStep] = React.useState(1)
  const [form, setForm] = React.useState<ExitFormState>(EMPTY_FORM)

  const setField = <K extends keyof ExitFormState>(k: K, v: ExitFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const resetFilters = () =>
    setFilters({
      entity: "all", branch: "all", location: "all", department: "all",
      exitType: "all", exitStatus: "all", clearanceStatus: "all",
      fnfStatus: "all", manager: "all", hrOwner: "all",
    })

  // ---- derived: filtered cases ----
  const filteredCases = React.useMemo(() => {
    let list = EXIT_CASES
    const f = filters
    if (f.entity !== "all") list = list.filter((c) => c.entity === f.entity)
    if (f.branch !== "all") list = list.filter((c) => c.branch === f.branch)
    if (f.location !== "all") list = list.filter((c) => c.location === f.location)
    if (f.department !== "all") list = list.filter((c) => c.department === f.department)
    if (f.exitType !== "all") list = list.filter((c) => c.exitType === f.exitType)
    if (f.exitStatus !== "all") list = list.filter((c) => c.exitStatus === f.exitStatus)
    if (f.clearanceStatus !== "all") list = list.filter((c) => c.clearanceStatus === f.clearanceStatus)
    if (f.fnfStatus !== "all") list = list.filter((c) => c.fnfStatus === f.fnfStatus)
    if (f.manager !== "all") list = list.filter((c) => c.reportingManager === f.manager)
    if (f.hrOwner !== "all") list = list.filter((c) => c.hrOwner === f.hrOwner)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.employeeName.toLowerCase().includes(q) ||
          c.exitCaseId.toLowerCase().includes(q) ||
          c.employeeCode.toLowerCase().includes(q),
      )
    }
    return list
  }, [filters, search])

  const allVisibleSelected = filteredCases.length > 0 && filteredCases.every((c) => selectedIds.has(c.id))

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredCases.map((c) => c.id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedCount = selectedIds.size

  // ---- row action handler ----
  const onRowAction = (action: string, ec: ExitCase) => {
    toast.success(`${action}`, { description: `${ec.employeeName} · ${ec.exitCaseId}` })
  }

  // ---- bulk action handler ----
  const onBulkAction = (action: string) => {
    if (selectedCount === 0) {
      toast.error("Select at least one exit case first.")
      return
    }
    toast.success(`${action}`, { description: `${selectedCount} exit case${selectedCount === 1 ? "" : "s"} selected` })
  }

  const onSimpleAction = (action: string) => {
    toast.info(action)
  }

  // ---- wizard helpers ----
  const openWizard = () => {
    setForm(EMPTY_FORM)
    setWizardStep(1)
    setWizardOpen(true)
  }

  const closeWizard = () => {
    setWizardOpen(false)
  }

  const nextStep = () => setWizardStep((s) => Math.min(7, s + 1))
  const prevStep = () => setWizardStep((s) => Math.max(1, s - 1))

  const finishWizard = (mode: "save" | "initiate" | "initiate-notify" | "initiate-clearance") => {
    const labels: Record<string, string> = {
      "save": "Exit case saved as draft",
      "initiate": "Exit case initiated",
      "initiate-notify": "Exit case initiated & notifications sent",
      "initiate-clearance": "Exit case initiated & clearance started",
    }
    toast.success(labels[mode], {
      description: form.employeeName ? `${form.employeeName} · ${form.exitType || "—"}` : undefined,
    })
    closeWizard()
  }

  // ========================================================================
  //  Render
  // ========================================================================

  return (
    <div className="space-y-4">
      {/* ---------- Page header ---------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            Employees / Exit Cases
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Initiate, track and close employee exits — {filteredCases.length} of {EXIT_CASES.length} cases shown
            {selectedCount > 0 && <span className="text-rose-600 dark:text-rose-400 font-medium"> · {selectedCount} selected</span>}
          </p>
        </div>
      </div>

      {/* ---------- Top action bar ---------- */}
      <TopActionBar onInitiate={openWizard} onAction={onSimpleAction} />

      {/* ---------- Filter bar ---------- */}
      <FilterBar
        search={search}
        onSearch={setSearch}
        filters={filters}
        onFilters={setFilters}
        onReset={resetFilters}
      />

      {/* ---------- Bulk actions bar ---------- */}
      {selectedCount > 0 && (
        <BulkActionsBar
          selectedCount={selectedCount}
          onClear={() => setSelectedIds(new Set())}
          onAction={onBulkAction}
        />
      )}

      {/* ---------- Exit cases table ---------- */}
      <Card className="border-border/60 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[40px] pl-4">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all visible"
                  />
                </TableHead>
                <TableHead className="min-w-[120px]">Exit Case ID</TableHead>
                <TableHead className="min-w-[220px]">Employee</TableHead>
                <TableHead className="min-w-[150px]">Entity / Company</TableHead>
                <TableHead className="min-w-[130px]">Department</TableHead>
                <TableHead className="min-w-[160px]">Designation</TableHead>
                <TableHead className="min-w-[150px]">Exit Type</TableHead>
                <TableHead className="min-w-[140px]">Exit Reason</TableHead>
                <TableHead className="min-w-[120px]">Resignation Date</TableHead>
                <TableHead className="min-w-[120px]">Approved LWD</TableHead>
                <TableHead className="min-w-[180px]">Workflow</TableHead>
                <TableHead className="min-w-[160px]">Current Stage</TableHead>
                <TableHead className="min-w-[130px]">Clearance</TableHead>
                <TableHead className="min-w-[120px]">FnF Status</TableHead>
                <TableHead className="min-w-[120px]">Exit Status</TableHead>
                <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={16} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <UserMinus className="h-8 w-8 opacity-40" />
                      <p className="text-sm font-medium">No exit cases match your filters</p>
                      <p className="text-xs">Try adjusting the search or filter criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCases.map((ec) => {
                  const stage = stageById(ec.currentStageId)
                  const isSelected = selectedIds.has(ec.id)
                  return (
                    <TableRow
                      key={ec.id}
                      className={cn(
                        "border-border/40 transition-colors",
                        isSelected ? "bg-rose-50/50 dark:bg-rose-500/5" : "hover:bg-muted/30",
                      )}
                    >
                      {/* Checkbox */}
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(ec.id)}
                          aria-label={`Select ${ec.employeeName}`}
                        />
                      </TableCell>

                      {/* Exit Case ID */}
                      <TableCell>
                        <span className="text-xs font-mono font-medium text-foreground">{ec.exitCaseId}</span>
                        {ec.riskFlag === "high" && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex ml-1 align-middle">
                                  <ShieldAlert className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">High-risk exit</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>

                      {/* Employee */}
                      <TableCell>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-[11px] font-semibold shadow-sm"
                            style={{ backgroundColor: ec.avatarColor }}
                          >
                            {initials(ec.employeeName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{ec.employeeName}</p>
                            <p className="text-xs text-muted-foreground truncate">{ec.employeeCode}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Entity */}
                      <TableCell>
                        <span className="text-sm text-foreground truncate block max-w-[150px]">{ec.entity}</span>
                      </TableCell>

                      {/* Department */}
                      <TableCell>
                        <span className="text-sm text-foreground">{ec.department}</span>
                      </TableCell>

                      {/* Designation */}
                      <TableCell>
                        <span className="text-sm text-foreground truncate block max-w-[160px]">{ec.designation}</span>
                      </TableCell>

                      {/* Exit Type */}
                      <TableCell>{coloredBadge(ec.exitType, EXIT_TYPE_COLORS)}</TableCell>

                      {/* Exit Reason */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground truncate block max-w-[140px]">{ec.exitReason}</span>
                      </TableCell>

                      {/* Resignation Date */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarClock className="h-3 w-3 opacity-60" />
                          {formatDate(ec.resignationDate)}
                        </span>
                      </TableCell>

                      {/* Approved LWD */}
                      <TableCell>
                        <span className="text-xs font-medium text-foreground flex items-center gap-1">
                          <CalendarClock className="h-3 w-3 text-rose-500/70" />
                          {formatDate(ec.approvedLwd)}
                        </span>
                      </TableCell>

                      {/* Workflow */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <WorkflowIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate block max-w-[150px]">{ec.workflowName}</span>
                        </div>
                      </TableCell>

                      {/* Current Stage */}
                      <TableCell>
                        {stage ? coloredBadge(stage.name, { [stage.name]: stage.color }) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </TableCell>

                      {/* Clearance */}
                      <TableCell>{coloredBadge(ec.clearanceStatus, STATUS_COLORS)}</TableCell>

                      {/* FnF */}
                      <TableCell>{coloredBadge(ec.fnfStatus, STATUS_COLORS)}</TableCell>

                      {/* Exit Status */}
                      <TableCell>{coloredBadge(ec.exitStatus, STATUS_COLORS)}</TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-4">
                        <RowActionsMenu ec={ec} onAction={onRowAction} />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground">
          <span>Showing {filteredCases.length} of {EXIT_CASES.length} exit cases</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2" disabled>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2">Page 1 of 1</span>
            <Button variant="ghost" size="sm" className="h-7 px-2" disabled>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ---------- Initiate Exit wizard ---------- */}
      <InitiateExitWizard
        open={wizardOpen}
        onOpenChange={(o) => (o ? setWizardOpen(true) : closeWizard())}
        step={wizardStep}
        onNext={nextStep}
        onPrev={prevStep}
        onJump={setWizardStep}
        form={form}
        setField={setField}
        onFinish={finishWizard}
      />
    </div>
  )
}

// ============================================================================
//  Top action bar
// ============================================================================

function TopActionBar({
  onInitiate,
  onAction,
}: {
  onInitiate: () => void
  onAction: (action: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        onClick={onInitiate}
        className="gap-1.5 gradient-rose text-primary-foreground shadow-soft hover:opacity-90"
      >
        <UserPlus className="h-4 w-4" /> Initiate Exit
      </Button>
      <Button variant="outline" className="gap-1.5" onClick={() => onAction("Bulk Exit Initiation")}>
        <Layers className="h-3.5 w-3.5" /> Bulk Exit Initiation
      </Button>
      <Button variant="outline" className="gap-1.5" onClick={() => onAction("Bulk Update")}>
        <Pencil className="h-3.5 w-3.5" /> Bulk Update
      </Button>
      <Button variant="outline" className="gap-1.5" onClick={() => onAction("Export")}>
        <Download className="h-3.5 w-3.5" /> Export
      </Button>
      <Button variant="outline" className="gap-1.5" onClick={() => onAction("Import")}>
        <Upload className="h-3.5 w-3.5" /> Import
      </Button>
      <Button variant="outline" className="gap-1.5" onClick={() => onAction("Assign Workflow")}>
        <WorkflowIcon className="h-3.5 w-3.5" /> Assign Workflow
      </Button>
      <Button variant="outline" className="gap-1.5" onClick={() => onAction("Send Reminder")}>
        <Bell className="h-3.5 w-3.5" /> Send Reminder
      </Button>
    </div>
  )
}

// ============================================================================
//  Filter bar
// ============================================================================

interface FilterBarProps {
  search: string
  onSearch: (v: string) => void
  filters: Record<string, string>
  onFilters: (next: Record<string, string>) => void
  onReset: () => void
}

function FilterBar({ search, onSearch, filters, onFilters, onReset }: FilterBarProps) {
  const setFilter = (key: string, val: string) => onFilters({ ...filters, [key]: val })

  const selects: { key: string; label: string; icon: any; options: readonly string[] }[] = [
    { key: "entity", label: "Entity", icon: Building2, options: ENTITIES },
    { key: "branch", label: "Branch", icon: Building2, options: BRANCHES },
    { key: "location", label: "Location", icon: MapPin, options: LOCATIONS },
    { key: "department", label: "Department", icon: Briefcase, options: DEPARTMENTS },
    { key: "exitType", label: "Exit Type", icon: UserMinus, options: EXIT_TYPES as readonly string[] },
    { key: "exitStatus", label: "Exit Status", icon: CheckCircle2, options: EXIT_STATUSES },
    { key: "clearanceStatus", label: "Clearance", icon: ShieldCheck, options: CLEARANCE_STATUSES },
    { key: "fnfStatus", label: "FnF Status", icon: Wallet, options: FNF_STATUSES },
    { key: "manager", label: "Manager", icon: UsersIcon, options: MANAGERS },
    { key: "hrOwner", label: "HR Owner", icon: UsersIcon, options: HR_OWNERS },
  ]

  return (
    <Card className="border-border/60 shadow-soft">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filters</span>
          <div className="ml-auto relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search employee or exit case ID…"
              className="pl-8 h-8 text-sm bg-background"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {selects.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.key} className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Icon className="h-3 w-3" /> {s.label}
                </Label>
                <Select value={filters[s.key]} onValueChange={(v) => setFilter(s.key, v)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder={`All ${s.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {s.label.toLowerCase()}</SelectItem>
                    {s.options.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={onReset}>
            <XCircle className="h-3 w-3" /> Reset filters
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
//  Bulk actions bar
// ============================================================================

function BulkActionsBar({
  selectedCount,
  onClear,
  onAction,
}: {
  selectedCount: number
  onClear: () => void
  onAction: (action: string) => void
}) {
  const actions = [
    { label: "Assign Workflow", icon: WorkflowIcon },
    { label: "Change Stage", icon: KanbanSquare },
    { label: "Assign HR Owner", icon: UsersIcon },
    { label: "Send Reminder", icon: Bell },
    { label: "Export Selected", icon: Download },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-rose-300/40 bg-rose-50/60 dark:bg-rose-500/10 dark:border-rose-500/30 shadow-soft">
      <span className="text-sm font-semibold text-rose-700 dark:text-rose-300 mr-1">
        {selectedCount} selected
      </span>
      <Separator orientation="vertical" className="h-5 mx-1" />
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((a) => {
          const Icon = a.icon
          return (
            <Button
              key={a.label}
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 bg-background"
              onClick={() => onAction(a.label)}
            >
              <Icon className="h-3 w-3" /> {a.label}
            </Button>
          )
        })}
      </div>
      <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto gap-1" onClick={onClear}>
        <XCircle className="h-3 w-3" /> Clear
      </Button>
    </div>
  )
}

// ============================================================================
//  Row actions dropdown
// ============================================================================

function RowActionsMenu({
  ec,
  onAction,
}: {
  ec: ExitCase
  onAction: (action: string, ec: ExitCase) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          {ec.employeeName} · {ec.exitCaseId}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onAction("View Exit Case", ec)}>
          <Eye className="h-4 w-4 mr-2" /> View Exit Case
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("Edit Exit Details", ec)}>
          <Pencil className="h-4 w-4 mr-2" /> Edit Exit Details
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onAction("Assign / Change Workflow", ec)}>
          <WorkflowIcon className="h-4 w-4 mr-2" /> Assign / Change Workflow
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("Move Stage", ec)}>
          <KanbanSquare className="h-4 w-4 mr-2" /> Move Stage
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onAction("Approve Resignation", ec)}>
          <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" /> Approve Resignation
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("Reject Resignation", ec)}>
          <XCircle className="h-4 w-4 mr-2 text-rose-600" /> Reject Resignation
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("Change LWD", ec)}>
          <CalendarClock className="h-4 w-4 mr-2" /> Change LWD
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onAction("Start Clearance", ec)}>
          <ShieldCheck className="h-4 w-4 mr-2" /> Start Clearance
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("Assign Checklist", ec)}>
          <ListChecks className="h-4 w-4 mr-2" /> Assign Checklist
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("Send Reminder", ec)}>
          <Bell className="h-4 w-4 mr-2" /> Send Reminder
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onAction("Initiate FnF", ec)}>
          <Wallet className="h-4 w-4 mr-2" /> Initiate FnF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("Generate Relieving Letter", ec)}>
          <FileText className="h-4 w-4 mr-2" /> Generate Relieving Letter
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onAction("Mark Exited", ec)}>
          <LogOut className="h-4 w-4 mr-2 text-emerald-600" /> Mark Exited
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-500/10"
          onClick={() => onAction("Cancel Exit", ec)}
        >
          <Ban className="h-4 w-4 mr-2" /> Cancel Exit
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onAction("View Logs", ec)}>
          <ScrollText className="h-4 w-4 mr-2" /> View Logs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================================================
//  Initiate Exit wizard dialog
// ============================================================================

interface WizardProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  step: number
  onNext: () => void
  onPrev: () => void
  onJump: (s: number) => void
  form: ExitFormState
  setField: <K extends keyof ExitFormState>(k: K, v: ExitFormState[K]) => void
  onFinish: (mode: "save" | "initiate" | "initiate-notify" | "initiate-clearance") => void
}

function InitiateExitWizard({
  open, onOpenChange, step, onNext, onPrev, onJump, form, setField, onFinish,
}: WizardProps) {
  const isFirst = step === 1
  const isLast = step === 7
  const selectedWorkflow = EXIT_WORKFLOWS.find((w) => w.id === form.workflowId) || null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[96vw] max-h-[94vh] p-0 gap-0 overflow-hidden">
        {/* ---------- Header ---------- */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/60">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <UserMinus className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            Initiate Exit
          </DialogTitle>
          <DialogDescription className="text-xs">
            Multi-step wizard — capture employee, exit details, workflow, clearance, FnF preview, notifications, then initiate.
          </DialogDescription>
        </DialogHeader>

        {/* ---------- Step indicator ---------- */}
        <StepIndicator currentStep={step} onJump={onJump} />

        {/* ---------- Body — scrollable ---------- */}
        <ScrollArea className="flex-1 max-h-[calc(94vh-280px)]">
          <div className="px-6 py-5">
            {step === 1 && <Step1EmployeeSelection form={form} setField={setField} />}
            {step === 2 && <Step2ExitDetails form={form} setField={setField} />}
            {step === 3 && <Step3WorkflowSelection form={form} setField={setField} selectedWorkflow={selectedWorkflow} />}
            {step === 4 && <Step4ClearancePreview form={form} />}
            {step === 5 && <Step5NoticeFnFPreview form={form} selectedWorkflow={selectedWorkflow} />}
            {step === 6 && <Step6EmailNotification form={form} setField={setField} />}
            {step === 7 && <Step7ReviewAndInitiate form={form} selectedWorkflow={selectedWorkflow} />}
          </div>
        </ScrollArea>

        {/* ---------- Footer ---------- */}
        <div className="px-6 py-3 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onPrev} disabled={isFirst} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            <span className="text-xs text-muted-foreground">
              Step <span className="font-medium text-foreground">{step}</span> of {WIZARD_STEPS.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isLast && (
              <Button
                onClick={onNext}
                className="gap-1.5 gradient-rose text-primary-foreground hover:opacity-90"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {isLast && (
              <>
                <Button variant="outline" onClick={() => onFinish("save")} className="gap-1.5">
                  <Save className="h-4 w-4" /> Save as Draft
                </Button>
                <Button
                  onClick={() => onFinish("initiate")}
                  className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4" /> Initiate Exit
                </Button>
                <Button
                  onClick={() => onFinish("initiate-notify")}
                  className="gap-1.5 gradient-rose text-primary-foreground hover:opacity-90"
                >
                  <Send className="h-4 w-4" /> Initiate & Notify
                </Button>
                <Button
                  onClick={() => onFinish("initiate-clearance")}
                  className="gap-1.5 bg-rose-700 hover:bg-rose-800 text-white"
                >
                  <ShieldCheck className="h-4 w-4" /> Initiate & Start Clearance
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
//  Step indicator
// ============================================================================

function StepIndicator({
  currentStep,
  onJump,
}: {
  currentStep: number
  onJump: (s: number) => void
}) {
  return (
    <div className="px-6 py-3 border-b border-border/60 bg-muted/20">
      <div className="flex items-center gap-1 overflow-x-auto">
        {WIZARD_STEPS.map((s, i) => {
          const Icon = s.icon
          const isDone = currentStep > s.id
          const isCurrent = currentStep === s.id
          const isLast = i === WIZARD_STEPS.length - 1
          return (
            <React.Fragment key={s.id}>
              <button
                type="button"
                onClick={() => onJump(s.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                  isCurrent && "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
                  isDone && !isCurrent && "text-emerald-600 dark:text-emerald-400 hover:bg-muted/60",
                  !isDone && !isCurrent && "text-muted-foreground hover:bg-muted/60",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                    isCurrent && "bg-rose-600 text-white",
                    isDone && !isCurrent && "bg-emerald-500 text-white",
                    !isDone && !isCurrent && "bg-muted-foreground/30 text-white",
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" /> : s.id}
                </span>
                <span className="hidden sm:inline">{s.short}</span>
              </button>
              {!isLast && (
                <div className={cn("h-px flex-1 min-w-[12px]", isDone ? "bg-emerald-400/60" : "bg-border/60")} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
//  Step 1 — Employee Selection
// ============================================================================

function Step1EmployeeSelection({
  form,
  setField,
}: {
  form: ExitFormState
  setField: <K extends keyof ExitFormState>(k: K, v: ExitFormState[K]) => void
}) {
  const onPick = (id: string) => {
    const emp = ACTIVE_EMPLOYEES.find((e) => e.id === id)
    if (!emp) {
      setField("employeeId", "")
      return
    }
    setField("employeeId", emp.id)
    setField("employeeCode", emp.code)
    setField("employeeName", emp.name)
    setField("entity", emp.entity)
    setField("department", emp.department)
    setField("designation", emp.designation)
    setField("location", emp.location)
    setField("reportingManager", emp.reportingManager)
    setField("dateOfJoining", emp.dateOfJoining)
    setField("employmentType", emp.employmentType)
    setField("employeeStatus", emp.status)
  }

  return (
    <section className="space-y-5">
      <SectionHeading number={1} title="Employee Selection" subtitle="Pick the employee whose exit you are initiating. Their details will auto-fill." />

      <Field label="Employee" required>
        <Select value={form.employeeId} onValueChange={onPick}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Search & select an employee…" />
          </SelectTrigger>
          <SelectContent>
            {ACTIVE_EMPLOYEES.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-white text-[9px] font-semibold"
                    style={{ backgroundColor: e.avatarColor }}
                  >
                    {initials(e.name)}
                  </span>
                  <span className="font-medium">{e.name}</span>
                  <span className="text-xs text-muted-foreground">· {e.code} · {e.designation}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Separator />

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-rose-500" />
          Auto-filled Employee Details
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ReadonlyField label="Employee Code" value={form.employeeCode || "—"} icon={UserMinus} />
          <ReadonlyField label="Entity" value={form.entity || "—"} icon={Building2} />
          <ReadonlyField label="Department" value={form.department || "—"} icon={Briefcase} />
          <ReadonlyField label="Designation" value={form.designation || "—"} icon={Briefcase} />
          <ReadonlyField label="Location" value={form.location || "—"} icon={MapPin} />
          <ReadonlyField label="Reporting Manager" value={form.reportingManager || "—"} icon={UsersIcon} />
          <ReadonlyField label="Date of Joining" value={formatDate(form.dateOfJoining) || "—"} icon={CalendarClock} />
          <ReadonlyField label="Employment Type" value={form.employmentType || "—"} icon={FileText} />
          <ReadonlyField label="Employee Status" value={form.employeeStatus || "—"} icon={CheckCircle2} />
        </div>
      </div>
    </section>
  )
}

// ============================================================================
//  Step 2 — Exit Details
// ============================================================================

function Step2ExitDetails({
  form,
  setField,
}: {
  form: ExitFormState
  setField: <K extends keyof ExitFormState>(k: K, v: ExitFormState[K]) => void
}) {
  return (
    <section className="space-y-5">
      <SectionHeading number={2} title="Exit Details" subtitle="Capture the type, reason, dates and notice-period parameters." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Exit Type" required>
          <Select value={form.exitType} onValueChange={(v) => setField("exitType", v)}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="Select exit type" /></SelectTrigger>
            <SelectContent>
              {EXIT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: EXIT_TYPE_COLORS[t] }} />
                    {t}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Exit Category">
          <Select value={form.exitCategory} onValueChange={(v) => setField("exitCategory", v)}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {EXIT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Exit Reason" required>
          <Select value={form.exitReason} onValueChange={(v) => setField("exitReason", v)}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="Select reason" /></SelectTrigger>
            <SelectContent>
              {EXIT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Sub Reason">
          <Input value={form.subReason} onChange={(e) => setField("subReason", e.target.value)} placeholder="e.g. better compensation at competitor" className="bg-background" />
        </Field>

        <Field label="Detailed Reason" className="md:col-span-2">
          <Textarea
            value={form.detailedReason}
            onChange={(e) => setField("detailedReason", e.target.value)}
            placeholder="Provide context for the exit (employee / manager narrative)"
            className="bg-background min-h-[70px] resize-y"
          />
        </Field>

        <Field label="Resignation Date" required>
          <Input type="date" value={form.resignationDate} onChange={(e) => setField("resignationDate", e.target.value)} className="bg-background" />
        </Field>
        <Field label="Notice Start Date">
          <Input type="date" value={form.noticeStartDate} onChange={(e) => setField("noticeStartDate", e.target.value)} className="bg-background" />
        </Field>
        <Field label="Requested Last Working Day">
          <Input type="date" value={form.requestedLwd} onChange={(e) => setField("requestedLwd", e.target.value)} className="bg-background" />
        </Field>
        <Field label="Approved Last Working Day">
          <Input type="date" value={form.approvedLwd} onChange={(e) => setField("approvedLwd", e.target.value)} className="bg-background" />
        </Field>
      </div>

      <Separator />

      {/* Notice period block */}
      <div className="rounded-lg border border-border/60 p-4 bg-muted/20 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-rose-500" /> Notice Period
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Notice Period Required">
            <div className="flex items-center gap-2 h-9">
              <Switch checked={form.noticePeriodRequired} onCheckedChange={(v) => setField("noticePeriodRequired", v)} />
              <span className="text-xs text-muted-foreground">{form.noticePeriodRequired ? "Required" : "Not required"}</span>
            </div>
          </Field>
          <Field label="Notice Served Days">
            <Input type="number" min={0} value={form.noticeServedDays} onChange={(e) => setField("noticeServedDays", Number(e.target.value))} className="bg-background" />
          </Field>
          <Field label="Notice Shortfall Days">
            <Input type="number" min={0} value={form.noticeShortfallDays} onChange={(e) => setField("noticeShortfallDays", Number(e.target.value))} className="bg-background" />
          </Field>
          <Field label="Notice Waiver">
            <div className="flex items-center gap-2 h-9">
              <Switch checked={form.noticeWaiver} onCheckedChange={(v) => setField("noticeWaiver", v)} />
              <span className="text-xs text-muted-foreground">{form.noticeWaiver ? "Waived" : "Not waived"}</span>
            </div>
          </Field>
          <Field label="Notice Buyout">
            <div className="flex items-center gap-2 h-9">
              <Switch checked={form.noticeBuyout} onCheckedChange={(v) => setField("noticeBuyout", v)} />
              <span className="text-xs text-muted-foreground">{form.noticeBuyout ? "Buyout" : "No buyout"}</span>
            </div>
          </Field>
        </div>
      </div>

      <Field label="Employee Remarks">
        <Textarea
          value={form.employeeRemarks}
          onChange={(e) => setField("employeeRemarks", e.target.value)}
          placeholder="Employee's notes / handover preferences"
          className="bg-background min-h-[60px] resize-y"
        />
      </Field>

      <Separator />

      {/* Flags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ToggleRow icon={ShieldAlert} label="Legal Hold" desc="Block FnF / letters until legal clears" checked={form.legalHold} onChange={(v) => setField("legalHold", v)} />
        <ToggleRow icon={AlertTriangle} label="Regrettable Attrition" desc="Flag as a loss to the organisation" checked={form.regrettable} onChange={(v) => setField("regrettable", v)} />
        <ToggleRow icon={CheckCircle2} label="Eligible for Rehire" desc="Allow rehire in the future" checked={form.eligibleRehire} onChange={(v) => setField("eligibleRehire", v)} />
        <ToggleRow icon={Lock} label="Confidential Exit" desc="Restrict visibility to HR + legal only" checked={form.confidential} onChange={(v) => setField("confidential", v)} />
      </div>
    </section>
  )
}

// ============================================================================
//  Step 3 — Workflow Selection
// ============================================================================

function Step3WorkflowSelection({
  form,
  setField,
  selectedWorkflow,
}: {
  form: ExitFormState
  setField: <K extends keyof ExitFormState>(k: K, v: ExitFormState[K]) => void
  selectedWorkflow: ExitWorkflow | null
}) {
  // Auto-select default workflow when in auto mode
  React.useEffect(() => {
    if (form.workflowMode === "auto" && !form.workflowId) {
      const defaultWf = EXIT_WORKFLOWS.find((w) => w.isDefault) || EXIT_WORKFLOWS[0]
      if (defaultWf) setField("workflowId", defaultWf.id)
    }
  }, [form.workflowMode, form.workflowId, setField])

  return (
    <section className="space-y-5">
      <SectionHeading number={3} title="Workflow Selection" subtitle="Auto-resolve based on employee attributes, or manually pick a workflow." />

      <Field label="Workflow Selection Mode">
        <div className="flex items-center gap-2">
          <ModeButton active={form.workflowMode === "auto"} onClick={() => setField("workflowMode", "auto")} icon={Sparkles} label="Auto Select" desc="Match by entity / dept / type" />
          <ModeButton active={form.workflowMode === "manual"} onClick={() => setField("workflowMode", "manual")} icon={Pencil} label="Manual Select" desc="Choose explicitly" />
        </div>
      </Field>

      {form.workflowMode === "manual" && (
        <Field label="Selected Exit Workflow" required>
          <Select value={form.workflowId} onValueChange={(v) => setField("workflowId", v)}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="Select workflow" /></SelectTrigger>
            <SelectContent>
              {EXIT_WORKFLOWS.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  <span className="inline-flex items-center gap-2">
                    <WorkflowIcon className="h-3 w-3" />
                    <span className="font-medium">{w.name}</span>
                    {w.isDefault && <Badge variant="outline" className="text-[9px] py-0 px-1 h-3.5 border-rose-500/40 text-rose-600 dark:text-rose-400">DEFAULT</Badge>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {selectedWorkflow ? (
        <div className="rounded-lg border border-rose-300/40 bg-rose-50/40 dark:bg-rose-500/5 dark:border-rose-500/30 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <WorkflowIcon className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                {selectedWorkflow.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedWorkflow.description}</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">v{selectedWorkflow.version}</Badge>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">{selectedWorkflow.status}</Badge>
            </div>
          </div>

          <Separator />

          {/* Auto-resolved linked artefacts */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 font-medium">Auto-resolved artefacts</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <ResolveItem icon={KanbanSquare} label="Kanban Board" value={selectedWorkflow.kanbanBoardName} />
              <ResolveItem icon={ShieldCheck} label="Clearance Checklist" value={selectedWorkflow.clearanceChecklistId ? `Checklist ${selectedWorkflow.clearanceChecklistId}` : "—"} />
              <ResolveItem icon={Mail} label="Email Template Group" value={selectedWorkflow.emailGroupId ? `Group ${selectedWorkflow.emailGroupId}` : "—"} />
              <ResolveItem icon={Wallet} label="FnF Rule" value={selectedWorkflow.fnfRuleId ? `Rule ${selectedWorkflow.fnfRuleId}` : "—"} />
            </div>
          </div>

          <Separator />

          {/* Stage pipeline preview */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 font-medium">Pipeline ({selectedWorkflow.stages.length} stages)</p>
            <div className="flex items-center gap-1 flex-wrap">
              {selectedWorkflow.stages.slice(0, 12).map((s, i) => (
                <div key={s.id} className="flex items-center gap-1">
                  {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                    title={`${s.name} · ${s.code}`}
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 truncate">
              {selectedWorkflow.stages.map((s) => s.name).join(" → ")}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            No workflow resolved. Switch to <span className="font-medium">Manual Select</span> and pick one to continue.
          </p>
        </div>
      )}
    </section>
  )
}

// ============================================================================
//  Step 4 — Clearance & Checklist Preview
// ============================================================================

function Step4ClearancePreview({ form }: { form: ExitFormState }) {
  // Use ec-1's clearance tasks as the sample preview (richest dataset)
  const previewTasks = CLEARANCE_TASKS.filter((t) => t.exitCaseId === "ec-1")
  const byDept = previewTasks.reduce<Record<string, ClearanceTask[]>>((acc, t) => {
    const k = t.department
    if (!acc[k]) acc[k] = []
    acc[k].push(t)
    return acc
  }, {})

  const totalMandatory = previewTasks.filter((t) => t.mandatory).length
  const totalBlocking = previewTasks.filter((t) => t.blocking).length

  return (
    <section className="space-y-5">
      <SectionHeading number={4} title="Clearance & Checklist Preview" subtitle="Read-only preview of the clearance tasks that will be auto-created when this exit is initiated." />

      {previewTasks.length === 0 ? (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> No clearance tasks found for preview.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <PreviewStat label="Total Tasks" value={previewTasks.length} icon={ListChecks} />
            <PreviewStat label="Departments" value={Object.keys(byDept).length} icon={Building2} />
            <PreviewStat label="Mandatory" value={totalMandatory} icon={ShieldCheck} />
            <PreviewStat label="Blocking" value={totalBlocking} icon={Lock} />
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {Object.entries(byDept).map(([dept, tasks]) => (
              <div key={dept} className="rounded-lg border border-border/60 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-rose-500" />
                    {dept} Clearance
                  </p>
                  <span className="text-[10px] text-muted-foreground">{tasks.length} task{tasks.length === 1 ? "" : "s"}</span>
                </div>
                <div className="divide-y divide-border/40">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/20 transition-colors">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                        <FileCheck2 className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">{t.taskName}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Owner: <span className="font-medium text-foreground/80">{t.owner}</span> · SLA: {t.slaDays}d
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {t.mandatory && <Badge variant="outline" className="text-[9px] py-0 px-1 h-4 border-rose-500/40 text-rose-600 dark:text-rose-400">MANDATORY</Badge>}
                        {t.blocking && <Badge variant="outline" className="text-[9px] py-0 px-1 h-4 border-amber-500/40 text-amber-600 dark:text-amber-400">BLOCKING</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-rose-500 mt-0.5 shrink-0" />
            HR can override after initiation — add extra tasks, remove optional ones, change owner / due date, mark as financial impact or blocking.
            <span className="font-medium text-foreground/80 ml-1">(Read-only preview)</span>
          </p>
        </>
      )}
      <p className="text-[10px] text-muted-foreground italic">
        Sample preview from EXIT-2025-001. Actual tasks will be derived from the selected workflow's clearance checklist.
      </p>
    </section>
  )
}

// ============================================================================
//  Step 5 — Notice / FnF Preview
// ============================================================================

function Step5NoticeFnFPreview({
  form,
  selectedWorkflow,
}: {
  form: ExitFormState
  selectedWorkflow: ExitWorkflow | null
}) {
  return (
    <section className="space-y-5">
      <SectionHeading number={5} title="Notice / FnF Preview" subtitle="Notice period, leave encashment, pending dues, loan recovery and FnF rule preview." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Notice period block */}
        <div className="rounded-lg border border-border/60 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-rose-500" /> Notice Period
          </p>
          <RowItem label="Notice Period Required" value={form.noticePeriodRequired ? "Yes" : "No"} />
          <RowItem label="Notice Served Days" value={`${form.noticeServedDays} days`} />
          <RowItem label="Notice Shortfall Days" value={`${form.noticeShortfallDays} days`} highlight={form.noticeShortfallDays > 0} />
          <RowItem label="Notice Waiver" value={form.noticeWaiver ? "Approved" : "—"} />
          <RowItem label="Notice Buyout" value={form.noticeBuyout ? "Required" : "—"} />
          <RowItem label="Notice Recovery" value={form.noticeShortfallDays > 0 && !form.noticeWaiver ? "Applicable" : "—"} highlight={form.noticeShortfallDays > 0 && !form.noticeWaiver} />
        </div>

        {/* FnF block */}
        <div className="rounded-lg border border-border/60 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-rose-500" /> Full & Final
          </p>
          <RowItem label="FnF Rule" value={selectedWorkflow?.fnfRuleId ? `Rule ${selectedWorkflow.fnfRuleId}` : "Default tenant rule"} />
          <RowItem label="Leave Encashment Eligibility" value="Eligible (18 PL)" />
          <RowItem label="Pending Salary" value="₹65,000 (current cycle)" />
          <RowItem label="Pending Reimbursements" value="₹8,500" />
          <RowItem label="Loan / Advance Recovery" value="₹10,000" highlight />
          <RowItem label="Asset Damage Recovery" value="—" />
          <RowItem label="Payroll Cut-Off" value="25th of month" />
          <RowItem label="FnF Approval Required" value="Yes — Finance + HR" />
        </div>
      </div>

      <div className="rounded-lg border border-rose-300/40 bg-rose-50/40 dark:bg-rose-500/5 dark:border-rose-500/30 p-4">
        <p className="text-xs text-rose-800 dark:text-rose-200 flex items-start gap-1.5">
          <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          These values are pre-computed previews. HR / Finance can adjust entries manually after initiation.
        </p>
      </div>
    </section>
  )
}

// ============================================================================
//  Step 6 — Email / Notification
// ============================================================================

function Step6EmailNotification({
  form,
  setField,
}: {
  form: ExitFormState
  setField: <K extends keyof ExitFormState>(k: K, v: ExitFormState[K]) => void
}) {
  const toggles: { key: keyof ExitFormState; label: string; desc: string; icon: any }[] = [
    { key: "sendResignationEmail", label: "Send Resignation Accepted Email", desc: "Notifies employee that their resignation has been accepted with the approved LWD", icon: Mail },
    { key: "sendClearanceEmails", label: "Send Clearance Task Emails", desc: "Email each clearance owner their assigned task with due date", icon: ShieldCheck },
    { key: "sendManagerApprovalEmail", label: "Send Manager Approval Email", desc: "Notify reporting manager to review and approve the resignation", icon: CheckCircle2 },
    { key: "ccHr", label: "CC to HR", desc: "Include HR owner on all notifications", icon: UsersIcon },
    { key: "ccManager", label: "CC to Manager", desc: "Include reporting manager on all notifications", icon: UsersIcon },
    { key: "ccPayroll", label: "CC to Payroll", desc: "Include payroll team on FnF-related notifications", icon: Wallet },
  ]
  return (
    <section className="space-y-5">
      <SectionHeading number={6} title="Email / Notification" subtitle="Choose which notifications to fire on initiation." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {toggles.map((t) => {
          const Icon = t.icon
          const checked = form[t.key] as boolean
          return (
            <label
              key={t.key}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                checked
                  ? "border-rose-300/60 bg-rose-50/50 dark:bg-rose-500/10 dark:border-rose-500/40"
                  : "border-border/60 bg-background hover:bg-muted/30",
              )}
            >
              <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-md", checked ? "bg-rose-600 text-white" : "bg-muted text-muted-foreground")}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{t.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
              </div>
              <Switch checked={checked} onCheckedChange={(v) => setField(t.key, v as any)} />
            </label>
          )
        })}
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> Email Template Group
        </p>
        <p className="text-sm text-foreground">
          Default Exit Email Group — 8 event-based templates (resignation submitted, manager approval pending, resignation approved, clearance task assigned, asset return pending, exit interview request, FnF calculated, relieving letter generated).
        </p>
      </div>
    </section>
  )
}

// ============================================================================
//  Step 7 — Review & Initiate
// ============================================================================

function Step7ReviewAndInitiate({
  form,
  selectedWorkflow,
}: {
  form: ExitFormState
  selectedWorkflow: ExitWorkflow | null
}) {
  return (
    <section className="space-y-5">
      <SectionHeading number={7} title="Review & Initiate" subtitle="Verify all inputs, then choose how to initiate." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ReviewBlock title="Employee" icon={UsersIcon}>
          <ReviewRow label="Name" value={form.employeeName || "—"} />
          <ReviewRow label="Code" value={form.employeeCode || "—"} />
          <ReviewRow label="Entity" value={form.entity || "—"} />
          <ReviewRow label="Department" value={form.department || "—"} />
          <ReviewRow label="Designation" value={form.designation || "—"} />
          <ReviewRow label="Reporting Manager" value={form.reportingManager || "—"} />
          <ReviewRow label="Employment Type" value={form.employmentType || "—"} />
        </ReviewBlock>

        <ReviewBlock title="Exit Details" icon={FileText}>
          <ReviewRow label="Exit Type" value={form.exitType || "—"} />
          <ReviewRow label="Category" value={form.exitCategory || "—"} />
          <ReviewRow label="Reason" value={form.exitReason || "—"} />
          <ReviewRow label="Resignation Date" value={formatDate(form.resignationDate)} />
          <ReviewRow label="Notice Start" value={formatDate(form.noticeStartDate)} />
          <ReviewRow label="Requested LWD" value={formatDate(form.requestedLwd)} />
          <ReviewRow label="Approved LWD" value={formatDate(form.approvedLwd)} />
        </ReviewBlock>

        <ReviewBlock title="Notice Period" icon={Clock}>
          <ReviewRow label="Required" value={form.noticePeriodRequired ? "Yes" : "No"} />
          <ReviewRow label="Served Days" value={`${form.noticeServedDays}`} />
          <ReviewRow label="Shortfall" value={`${form.noticeShortfallDays}`} highlight={form.noticeShortfallDays > 0} />
          <ReviewRow label="Waiver" value={form.noticeWaiver ? "Yes" : "No"} />
          <ReviewRow label="Buyout" value={form.noticeBuyout ? "Yes" : "No"} />
        </ReviewBlock>

        <ReviewBlock title="Workflow" icon={WorkflowIcon}>
          <ReviewRow label="Selection Mode" value={form.workflowMode === "auto" ? "Auto Select" : "Manual Select"} />
          <ReviewRow label="Workflow" value={selectedWorkflow?.name || "—"} />
          <ReviewRow label="Version" value={selectedWorkflow ? `v${selectedWorkflow.version}` : "—"} />
          <ReviewRow label="Kanban Board" value={selectedWorkflow?.kanbanBoardName || "—"} />
          <ReviewRow label="Stages" value={`${selectedWorkflow?.stages.length || 0}`} />
        </ReviewBlock>

        <ReviewBlock title="Flags" icon={ShieldAlert}>
          <ReviewRow label="Legal Hold" value={form.legalHold ? "Yes" : "No"} highlight={form.legalHold} />
          <ReviewRow label="Regrettable" value={form.regrettable ? "Yes" : "No"} highlight={form.regrettable} />
          <ReviewRow label="Eligible for Rehire" value={form.eligibleRehire ? "Yes" : "No"} />
          <ReviewRow label="Confidential Exit" value={form.confidential ? "Yes" : "No"} highlight={form.confidential} />
        </ReviewBlock>

        <ReviewBlock title="Notifications" icon={Mail}>
          <ReviewRow label="Resignation Email" value={form.sendResignationEmail ? "On" : "Off"} />
          <ReviewRow label="Clearance Emails" value={form.sendClearanceEmails ? "On" : "Off"} />
          <ReviewRow label="Manager Approval Email" value={form.sendManagerApprovalEmail ? "On" : "Off"} />
          <ReviewRow label="CC HR" value={form.ccHr ? "Yes" : "No"} />
          <ReviewRow label="CC Manager" value={form.ccManager ? "Yes" : "No"} />
          <ReviewRow label="CC Payroll" value={form.ccPayroll ? "Yes" : "No"} />
        </ReviewBlock>
      </div>

      <div className="rounded-lg border border-rose-300/40 bg-rose-50/40 dark:bg-rose-500/5 dark:border-rose-500/30 p-4">
        <p className="text-xs font-semibold text-rose-800 dark:text-rose-200 mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Choose your initiation action
        </p>
        <ul className="text-xs text-rose-700/90 dark:text-rose-300/90 space-y-1.5">
          <li className="flex items-start gap-2"><Save className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span><span className="font-medium">Save as Draft</span> — creates a Draft exit case, no notifications, clearance not started.</span></li>
          <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span><span className="font-medium">Initiate Exit</span> — creates an Active exit case at the first stage; no notifications sent.</span></li>
          <li className="flex items-start gap-2"><Send className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span><span className="font-medium">Initiate & Notify</span> — initiates and fires all selected email notifications.</span></li>
          <li className="flex items-start gap-2"><ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span><span className="font-medium">Initiate & Start Clearance</span> — initiates, notifies, and immediately creates clearance tasks for all departments.</span></li>
        </ul>
      </div>
    </section>
  )
}

// ============================================================================
//  Small shared building blocks
// ============================================================================

function SectionHeading({ number, title, subtitle }: { number: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md gradient-rose text-primary-foreground text-xs font-bold">
        {number}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

function Field({
  label, required, children, className,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function ReadonlyField({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="text-sm text-foreground mt-0.5 truncate">{value}</p>
    </div>
  )
}

function ToggleRow({
  icon: Icon, label, desc, checked, onChange,
}: {
  icon: any
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
      checked ? "border-rose-300/60 bg-rose-50/40 dark:bg-rose-500/5 dark:border-rose-500/30" : "border-border/60",
    )}>
      <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-md", checked ? "bg-rose-600 text-white" : "bg-muted text-muted-foreground")}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function ModeButton({
  active, onClick, icon: Icon, label, desc,
}: {
  active: boolean
  onClick: () => void
  icon: any
  label: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 flex items-start gap-2 p-3 rounded-lg border text-left transition-all",
        active
          ? "border-rose-300/60 bg-rose-50/50 dark:bg-rose-500/10 dark:border-rose-500/40 shadow-soft"
          : "border-border/60 hover:bg-muted/30",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", active ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")} />
      <div className="min-w-0">
        <p className={cn("text-sm font-medium", active ? "text-rose-700 dark:text-rose-300" : "text-foreground")}>{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
    </button>
  )
}

function ResolveItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 text-rose-500 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  )
}

function PreviewStat({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className="text-xl font-semibold text-foreground mt-1">{value}</p>
    </div>
  )
}

function RowItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", highlight ? "text-rose-600 dark:text-rose-400" : "text-foreground")}>{value}</span>
    </div>
  )
}

function ReviewBlock({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border/60">
        <Icon className="h-3.5 w-3.5 text-rose-500" />
        <p className="text-xs font-semibold text-foreground">{title}</p>
      </div>
      <div className="px-3 py-2 space-y-1.5">{children}</div>
    </div>
  )
}

function ReviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-right", highlight ? "text-rose-600 dark:text-rose-400" : "text-foreground")}>{value}</span>
    </div>
  )
}

export default ExitCasesSection
