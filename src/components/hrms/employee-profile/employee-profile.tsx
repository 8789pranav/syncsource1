"use client"

// ============================================================
// EmployeeProfile — full-screen Phase 2 profile shell.
// ------------------------------------------------------------
//  • Sticky gradient header with avatar, name, code, designation,
//    meta chips, quick actions toolbar, profile completion bar.
//  • 32-tab horizontal scrollable strip (PROFILE_TABS) with
//    left/right scroll buttons on desktop.
//  • Tab content area rendering the active tab component.
//  • Fetches GET /api/employees/<id> on mount and on refresh.
//  • Role-based tab visibility via getVisibleTabs() (defaults to
//    "HR Admin" which sees ALL tabs).
//  • Edit action opens the DynamicForm dialog and PATCHes the
//    employee record, then re-fetches.
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ArrowLeft, Pencil, Download, FileText, RefreshCw, MoreHorizontal,
  Shuffle, TrendingUp, LogOut, ShieldCheck, KeyRound, UserCog,
  Send, History, ChevronLeft, ChevronRight, Mail, Phone, MapPin,
  CalendarDays, Building2, Users as UsersIcon, Briefcase, Loader2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { employeeFormSchema } from "@/lib/form-schemas"
import type { FormValues } from "@/lib/types"
import { StatusBadge } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

import {
  getVisibleTabs, type EmployeeRole,
} from "./tab-config"

// ----------------------------------------------------------------
// Tab components (static imports — keeps things simple, code is
// small per tab and tree-shaken when not used).
// ----------------------------------------------------------------
import OverviewTab from "./tabs/overview"
import PersonalTab from "./tabs/personal"
import JobTab from "./tabs/job"
import ContactTab from "./tabs/contact"
import FamilyTab from "./tabs/family"
import EducationTab from "./tabs/education"
import ExperienceTab from "./tabs/experience"
import BankTab from "./tabs/bank"
import StatutoryTab from "./tabs/statutory"
import DocumentsTab from "./tabs/documents"
import AttendanceTab from "./tabs/attendance"
import LeaveTab from "./tabs/leave"
import PayrollTab from "./tabs/payroll"
import CompensationTab from "./tabs/compensation"
import PerformanceTab from "./tabs/performance"
import SkillsTab from "./tabs/skills"
import TrainingTab from "./tabs/training"
import AssetsTab from "./tabs/assets"
import ExpensesTab from "./tabs/expenses"
import HelpdeskTab from "./tabs/helpdesk"
import RequestsTab from "./tabs/requests"
import LettersTab from "./tabs/letters"
import TimelineTab from "./tabs/timeline"
import AuditTab from "./tabs/audit"
import NotesTab from "./tabs/notes"
import ProbationTab from "./tabs/probation"
import TransferPromotionTab from "./tabs/transfer-promotion"
import ExitTab from "./tabs/exit"
import LoginAccessTab from "./tabs/login-access"
import RolesTab from "./tabs/roles"
import CustomFieldsTab from "./tabs/custom-fields"
import FormsTab from "./tabs/forms"
import { apiFetch } from "@/lib/api-client"

const TAB_COMPONENTS: Record<string, React.ComponentType<{ employeeId: string; employee: any }>> = {
  overview: OverviewTab,
  personal: PersonalTab,
  job: JobTab,
  contact: ContactTab,
  family: FamilyTab,
  education: EducationTab,
  experience: ExperienceTab,
  bank: BankTab,
  statutory: StatutoryTab,
  documents: DocumentsTab,
  attendance: AttendanceTab,
  leave: LeaveTab,
  payroll: PayrollTab,
  compensation: CompensationTab,
  performance: PerformanceTab,
  skills: SkillsTab,
  training: TrainingTab,
  assets: AssetsTab,
  expenses: ExpensesTab,
  helpdesk: HelpdeskTab,
  requests: RequestsTab,
  letters: LettersTab,
  timeline: TimelineTab,
  audit: AuditTab,
  notes: NotesTab,
  probation: ProbationTab,
  "transfer-promotion": TransferPromotionTab,
  exit: ExitTab,
  "login-access": LoginAccessTab,
  roles: RolesTab,
  "custom-fields": CustomFieldsTab,
  forms: FormsTab,
}

// ----------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------
function getInitials(first?: string | null, middle?: string | null, last?: string | null) {
  const f = (first || "").trim().charAt(0).toUpperCase()
  const m = (middle || "").trim().charAt(0).toUpperCase()
  const l = (last || "").trim().charAt(0).toUpperCase()
  const out = l ? f + l : (m ? f + m : f)
  return out || "?"
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return "—"
  }
}

function toFormValues(rec: any): FormValues {
  if (!rec) return {}
  const out: FormValues = {}
  for (const [k, v] of Object.entries(rec)) {
    if (v instanceof Date) out[k] = v.toISOString()
    else out[k] = v
  }
  return out
}

// Fields used to compute profile completion %. Each contributes 1
// to the total weight; nullish values count as missing.
const COMPLETION_FIELDS: { key: string; label: string }[] = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "displayName", label: "Display Name" },
  { key: "gender", label: "Gender" },
  { key: "dateOfBirth", label: "Date of Birth" },
  { key: "maritalStatus", label: "Marital Status" },
  { key: "bloodGroup", label: "Blood Group" },
  { key: "personalEmail", label: "Personal Email" },
  { key: "officialEmail", label: "Official Email" },
  { key: "mobileNumber", label: "Mobile" },
  { key: "dateOfJoining", label: "Date of Joining" },
  { key: "employmentType", label: "Employment Type" },
  { key: "employeeStatus", label: "Status" },
  { key: "entityId", label: "Entity" },
  { key: "departmentId", label: "Department" },
  { key: "designationId", label: "Designation" },
  { key: "gradeId", label: "Grade" },
  { key: "locationId", label: "Location" },
  { key: "reportingManagerId", label: "Reporting Manager" },
  { key: "bankName", label: "Bank" },
  { key: "accountNumber", label: "Bank A/C" },
  { key: "ifscCode", label: "IFSC" },
  { key: "panNumber", label: "PAN" },
  { key: "aadhaarNumber", label: "Aadhaar" },
  { key: "uanNumber", label: "UAN" },
  { key: "pfNumber", label: "PF" },
  { key: "currentAddress", label: "Current Address" },
  { key: "permanentAddress", label: "Permanent Address" },
  { key: "emergencyContactName", label: "Emergency Contact" },
  { key: "ctc", label: "CTC" },
]

function computeCompletion(emp: any): { pct: number; filled: number; total: number } {
  if (!emp) return { pct: 0, filled: 0, total: COMPLETION_FIELDS.length }
  const total = COMPLETION_FIELDS.length
  let filled = 0
  for (const f of COMPLETION_FIELDS) {
    const v = emp[f.key]
    if (v !== undefined && v !== null && v !== "") filled++
  }
  return { pct: Math.round((filled / total) * 100), filled, total }
}

// ----------------------------------------------------------------
// Quick action button (icon + tooltip)
// ----------------------------------------------------------------
function QuickAction({
  icon: Icon, label, onClick, tone = "default",
}: {
  icon: LucideIcon
  label: string
  onClick?: () => void
  tone?: "default" | "danger"
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClick}
          className={cn(
            "h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/60",
            tone === "danger" && "hover:text-destructive hover:bg-destructive/10"
          )}
          aria-label={label}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

// ----------------------------------------------------------------
// Meta chip — small pill with icon + label + value
// ----------------------------------------------------------------
function MetaChip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card px-2 py-1 text-xs">
      <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground truncate max-w-[180px]">{value}</span>
    </div>
  )
}

// ================================================================
// EmployeeProfile
// ================================================================
export interface EmployeeProfileProps {
  employeeId: string
  onBack: () => void
  /** Optional role for tab visibility (defaults to "HR Admin" which sees all). */
  role?: EmployeeRole | string
  /** Notified when an Edit succeeds so the parent list can refresh. */
  onEdited?: () => void
}

export function EmployeeProfile({
  employeeId,
  onBack,
  role = "HR Admin",
  onEdited,
}: EmployeeProfileProps) {
  // -------- state --------
  const [employee, setEmployee] = React.useState<any | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<string>("overview")
  const [editOpen, setEditOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const tabStripRef = React.useRef<HTMLDivElement | null>(null)
  const visibleTabs = React.useMemo(() => getVisibleTabs(role), [role])

  // -------- data fetching --------
  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Request failed")
      const data = await res.json()
      setEmployee(data)
    } catch {
      toast.error("Failed to load employee profile")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => {
    load()
  }, [load])

  // -------- ensure activeTab is in the visible set --------
  React.useEffect(() => {
    if (!visibleTabs.find((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? "overview")
    }
  }, [visibleTabs, activeTab])

  // -------- scroll active tab into view --------
  React.useEffect(() => {
    if (!tabStripRef.current) return
    const el = tabStripRef.current.querySelector<HTMLElement>(`[data-tab-id="${activeTab}"]`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
    }
  }, [activeTab])

  // -------- scroll buttons (desktop) --------
  const scrollBy = (dir: -1 | 1) => {
    if (!tabStripRef.current) return
    tabStripRef.current.scrollBy({ left: dir * 280, behavior: "smooth" })
  }

  // -------- submit edit --------
  const onSubmitEdit = async (values: FormValues) => {
    setSaving(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to update employee")
      }
      toast.success("Employee updated")
      setEditOpen(false)
      await load()
      onEdited?.()
    } catch (e: any) {
      toast.error(e.message || "Failed to update employee")
    } finally {
      setSaving(false)
    }
  }

  // -------- derived values --------
  const fullName = employee
    ? [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" ")
    : ""
  const completion = computeCompletion(employee)
  const ActiveTabComponent = TAB_COMPONENTS[activeTab] ?? OverviewTab

  return (
    <div className="space-y-4">
      {/* ---------- Back row ---------- */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Employees
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          disabled={loading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* ---------- Profile Header (sticky, emerald gradient) ---------- */}
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-soft">
        <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 dark:from-emerald-500/15 dark:via-teal-500/10 dark:to-cyan-500/15">
          <div className="p-5 sm:p-6 space-y-4">
            {/* Avatar + identity + quick actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4 min-w-0">
                {loading || !employee ? (
                  <Skeleton className="h-20 w-20 rounded-full shrink-0" />
                ) : (
                  <Avatar className="h-20 w-20 border-2 border-background shadow-soft shrink-0">
                    {employee.profilePhotoUrl ? (
                      <AvatarImage src={employee.profilePhotoUrl} alt={fullName} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xl font-semibold">
                      {getInitials(employee.firstName, employee.middleName, employee.lastName)}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className="min-w-0 space-y-1.5">
                  {loading || !employee ? (
                    <>
                      <Skeleton className="h-6 w-56" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-32" />
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">
                          {employee.displayName || fullName || "Unnamed employee"}
                        </h1>
                        <Badge variant="outline" className="font-mono text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                          {employee.employeeCode}
                        </Badge>
                      </div>
                      {employee.designation?.name && (
                        <p className="text-sm text-muted-foreground">
                          {employee.designation.name}
                          {employee.grade?.name ? ` · ${employee.grade.name}` : ""}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <StatusBadge status={employee.employeeStatus} />
                        {employee.employmentType && (
                          <Badge variant="outline" className="text-xs">{employee.employmentType}</Badge>
                        )}
                        {employee.workMode && (
                          <Badge variant="outline" className="text-xs">{employee.workMode}</Badge>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Quick actions toolbar */}
              <div className="flex items-center gap-0.5 shrink-0 rounded-lg border border-border/60 bg-card/70 p-1">
                <QuickAction icon={Pencil} label="Edit profile" onClick={() => setEditOpen(true)} />
                <QuickAction icon={Download} label="Download profile" onClick={() => toast.info("Profile download — coming soon")} />
                <QuickAction icon={FileText} label="Generate letter" onClick={() => toast.info("Letter generator — coming soon")} />
                <QuickAction icon={UserCog} label="Change status" onClick={() => toast.info("Change status — coming soon")} />
                <QuickAction icon={Shuffle} label="Transfer" onClick={() => toast.info("Transfer flow — coming soon")} />
                <QuickAction icon={TrendingUp} label="Promote" onClick={() => toast.info("Promotion flow — coming soon")} />
                <QuickAction icon={LogOut} label="Resign" onClick={() => toast.info("Resignation flow — coming soon")} />
                <QuickAction icon={ShieldCheck} label="Initiate exit" onClick={() => toast.info("Exit flow — coming soon")} tone="danger" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>More actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => toast.info("Reset password — coming soon")}>
                      <KeyRound className="h-3.5 w-3.5 mr-2" /> Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info("Assign role — coming soon")}>
                      <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Assign Role
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info("View audit — coming soon")}>
                      <History className="h-3.5 w-3.5 mr-2" /> View Audit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info("Send invite — coming soon")}>
                      <Send className="h-3.5 w-3.5 mr-2" /> Send Invite
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Meta chips */}
            {loading || !employee ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-32 rounded-md" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                <MetaChip icon={Building2} label="Dept" value={employee.department?.name} />
                <MetaChip icon={MapPin} label="Location" value={employee.location?.name} />
                <MetaChip icon={Briefcase} label="Entity" value={employee.entity?.tradeName || employee.entity?.legalName} />
                <MetaChip icon={UsersIcon} label="Manager" value={
                  employee.reportingManager
                    ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName || ""}`
                    : undefined
                } />
                <MetaChip icon={CalendarDays} label="Joined" value={formatDate(employee.dateOfJoining)} />
                <MetaChip icon={Mail} label="Email" value={employee.officialEmail} />
                <MetaChip icon={Phone} label="Mobile" value={employee.mobileNumber} />
              </div>
            )}

            {/* Profile completion */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Profile completion</span>
                <span className="text-muted-foreground tabular-nums">
                  {loading || !employee ? "…" : `${completion.pct}% · ${completion.filled}/${completion.total} fields`}
                </span>
              </div>
              <Progress
                value={loading || !employee ? 0 : completion.pct}
                className="h-1.5 bg-muted"
              />
            </div>
          </div>
        </div>

        {/* ---------- Tab strip ---------- */}
        <div className="relative border-t border-border/60 bg-card">
          {/* Left scroll button (desktop) */}
          <button
            type="button"
            aria-label="Scroll tabs left"
            onClick={() => scrollBy(-1)}
            className="hidden md:grid absolute left-0 top-0 bottom-0 z-10 w-9 place-items-center bg-gradient-to-r from-card to-card/0 hover:from-muted/40 border-r border-border/60 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            ref={tabStripRef}
            className="flex items-stretch overflow-x-auto scrollbar-thin gap-0.5 px-2 md:px-11 py-2"
            style={{ scrollbarWidth: "thin" }}
          >
            {visibleTabs.map((tab) => {
              const isActive = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-tab-id={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "group relative inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 min-h-[44px] text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                    isActive
                      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                  title={tab.label}
                >
                  <tab.icon className={cn("h-3.5 w-3.5 shrink-0", isActive && "text-emerald-600 dark:text-emerald-400")} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="profile-tab-underline"
                      className="absolute left-2 right-2 -bottom-2 h-0.5 rounded-full bg-emerald-500"
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Right scroll button (desktop) */}
          <button
            type="button"
            aria-label="Scroll tabs right"
            onClick={() => scrollBy(1)}
            className="hidden md:grid absolute right-0 top-0 bottom-0 z-10 w-9 place-items-center bg-gradient-to-l from-card to-card/0 hover:from-muted/40 border-l border-border/60 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <Separator />

        {/* ---------- Tab content ---------- */}
        <div className="p-4 sm:p-6">
          {loading || !employee ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full max-w-3xl" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ) : (
            <ActiveTabComponent employeeId={employeeId} employee={employee} />
          )}
        </div>
      </div>

      {/* ---------- Edit dialog ---------- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update the employee details below. Fields marked <span className="text-destructive">*</span> are required.
            </DialogDescription>
          </DialogHeader>
          {employee && (
            <DynamicForm
              schema={employeeFormSchema}
              initialValues={toFormValues(employee)}
              onSubmit={onSubmitEdit}
              onCancel={() => setEditOpen(false)}
              submitLabel="Update Employee"
              loading={saving}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Subtle full-row loading indicator while initial fetch runs */}
      {loading && !employee && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading employee…
        </div>
      )}
    </div>
  )
}

export default EmployeeProfile
