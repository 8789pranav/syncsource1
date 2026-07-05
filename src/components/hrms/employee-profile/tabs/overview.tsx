"use client"

// ============================================================
// OverviewTab — employee dashboard / snapshot.
// ------------------------------------------------------------
// Uses the `employee` prop for most fields (already includes
// _count, reportingManager, functionalManager, hrManager).
// Extra fetches (best-effort):
//   • GET /api/attendance?employeeId=X&from=today&to=today
//   • GET /api/employees/[id]/timeline?limit=5
//   • GET /api/employees/[id]/requests (for pending count)
//   • GET /api/holidays?upcoming=1 (next holiday)
//   • GET /api/leave-applications?employeeId=X (recent)
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Activity, Briefcase, CalendarClock, CheckCircle2, Clock3, FileText,
  GraduationCap, Home as HomeIcon, Mail, MapPin, Phone, ShieldCheck,
  Sparkles, TrendingUp, User2, Users as UsersIcon, Wallet,
  CalendarDays, ChevronRight, AlertCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SectionCard, StatCard, StatusBadge } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- helpers ----------
const fmtDate = (d?: string | Date | null) => {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return "—"
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}
const fmtCurrency = (n?: number | null) => {
  if (n === null || n === undefined) return "—"
  return "₹" + new Intl.NumberFormat("en-IN").format(n)
}
const fmtRelative = (d?: string | Date | null) => {
  if (!d) return ""
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return ""
  const diff = Date.now() - dt.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return fmtDate(dt)
}

function maskAccount(num?: string | null) {
  if (!num) return "—"
  const s = String(num)
  if (s.length <= 4) return `XXXX${s}`
  return `XXXX${s.slice(-4)}`
}
function maskPan(pan?: string | null) {
  if (!pan) return "—"
  const s = String(pan)
  if (s.length <= 4) return "XXXX"
  return `XXXX${s.slice(-4)}`
}

function fullName(emp: any) {
  return [emp?.firstName, emp?.middleName, emp?.lastName].filter(Boolean).join(" ") || emp?.displayName || "—"
}
function initials(emp: any) {
  const f = emp?.firstName?.[0] || ""
  const l = emp?.lastName?.[0] || ""
  return (f + l).toUpperCase() || emp?.employeeCode?.slice(-2) || "?"
}

// Profile completion — weighted fields scan
function profileCompletion(emp: any): { pct: number; filled: number; total: number } {
  const fields = [
    "firstName", "lastName", "displayName", "gender", "dateOfBirth", "maritalStatus",
    "bloodGroup", "nationality", "personalEmail", "officialEmail", "mobileNumber",
    "panNumber", "aadhaarNumber", "uanNumber", "pfNumber",
    "dateOfJoining", "employmentType", "probationStatus", "employeeStatus", "workMode",
    "entityId", "departmentId", "designationId", "gradeId", "locationId", "reportingManagerId",
    "bankName", "accountNumber", "ifscCode",
    "currentAddress", "currentCity", "permanentAddress", "emergencyContactName", "emergencyContactPhone",
    "ctc",
  ]
  const total = fields.length
  let filled = 0
  for (const k of fields) {
    const v = emp?.[k]
    if (v !== null && v !== undefined && v !== "") filled++
  }
  return { pct: Math.round((filled / total) * 100), filled, total }
}

// friendly skeleton
function SkeletonBlock({ className }: { className?: string }) {
  return <Skeleton className={cn("h-4 w-full rounded-md", className)} />
}

// ---------- main ----------
export default function OverviewTab({ employeeId, employee }: { employeeId: string; employee: any }) {
  const [attendanceToday, setAttendanceToday] = React.useState<any | null>(null)
  const [timeline, setTimeline] = React.useState<any[]>([])
  const [requests, setRequests] = React.useState<any[]>([])
  const [holidays, setHolidays] = React.useState<any[]>([])
  const [leaveApps, setLeaveApps] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    Promise.allSettled([
      fetch(`/api/attendance?employeeId=${employeeId}&from=${todayStr}&to=${todayStr}`).then((r) => r.json()),
      fetch(`/api/employees/${employeeId}/timeline`).then((r) => r.json()),
      fetch(`/api/employees/${employeeId}/requests`).then((r) => r.json()),
      fetch(`/api/holidays?upcoming=1`).then((r) => r.json()),
      fetch(`/api/leave-applications?employeeId=${employeeId}`).then((r) => r.json()),
    ]).then((results) => {
      if (!alive) return
      const att = results[0].status === "fulfilled" ? results[0].value : null
      const tl = results[1].status === "fulfilled" ? results[1].value : null
      const rq = results[2].status === "fulfilled" ? results[2].value : null
      const hl = results[3].status === "fulfilled" ? results[3].value : null
      const la = results[4].status === "fulfilled" ? results[4].value : null
      setAttendanceToday(att?.items?.[0] ?? null)
      setTimeline(tl?.items?.slice(0, 5) ?? [])
      setRequests(rq?.items ?? [])
      setHolidays(hl?.items?.slice(0, 1) ?? [])
      setLeaveApps(la?.items ?? [])
      setLoading(false)
    }).catch(() => {
      if (alive) setLoading(false)
    })
    return () => { alive = false }
  }, [employeeId])

  if (!employee) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const completion = profileCompletion(employee)
  const pendingRequests = requests.filter((r) => r.status === "Pending")
  const approvedLeave = leaveApps.filter((l) => l.status === "Approved")
  const pendingLeave = leaveApps.filter((l) => l.status === "Pending")
  const docsCount = employee._count?.documents ?? 0
  const familyCount = employee._count?.familyMembers ?? 0
  const eduCount = employee._count?.educationRecords ?? 0
  const expCount = employee._count?.experienceRecords ?? 0

  const attendanceStatus = attendanceToday?.status
    ? (attendanceToday.status === "Present" ? "Present"
      : attendanceToday.status === "Late" ? "Late"
      : attendanceToday.status === "Work from home" || attendanceToday.status === "WFH" ? "WFH"
      : attendanceToday.status === "On Duty" || attendanceToday.status === "OD" ? "On Duty"
      : attendanceToday.status)
    : "Not marked"

  const nextHoliday = holidays[0]

  const reportingMgr = employee.reportingManager
  const functionalMgr = employee.functionalManager
  const hrMgr = employee.hrManager
  const mgrName = (m: any) => m ? `${m.firstName} ${m.lastName || ""}`.trim() : "—"

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-5"
    >
      {/* Stat cards row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Profile Completion"
          icon={Sparkles}
          accent="emerald"
          value={`${completion.pct}%`}
          sub={`${completion.filled}/${completion.total} fields filled`}
        />
        <StatCard
          label="Today's Attendance"
          icon={Clock3}
          accent={attendanceStatus === "Present" ? "emerald" : attendanceStatus === "Late" ? "amber" : "cyan"}
          value={loading ? "—" : attendanceStatus}
          sub={attendanceToday?.clockIn ? `In: ${String(attendanceToday.clockIn).slice(11, 16)}` : "No punch recorded"}
        />
        <StatCard
          label="Documents"
          icon={FileText}
          accent="cyan"
          value={docsCount}
          sub="On file"
        />
        <StatCard
          label="Pending Requests"
          icon={AlertCircle}
          accent={pendingRequests.length > 0 ? "amber" : "emerald"}
          value={pendingRequests.length}
          sub="Awaiting action"
        />
        <StatCard
          label="Approved Leave"
          icon={CalendarDays}
          accent="fuchsia"
          value={approvedLeave.length}
          sub={`${pendingLeave.length} pending`}
        />
      </motion.div>

      {/* Profile completion bar */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/60 shadow-soft">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Profile completeness</p>
                  <p className="text-xs text-muted-foreground">Fill in missing fields to improve data quality</p>
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{completion.pct}%</span>
            </div>
            <Progress value={completion.pct} className="h-2" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Main grid: 2-col on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Employee Summary */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <SectionCard title="Employee Summary">
            <div className="flex items-start gap-3">
              <Avatar className="h-16 w-16 rounded-xl border border-border/60">
                {employee.profilePhotoUrl && <AvatarImage src={employee.profilePhotoUrl} alt={fullName(employee)} />}
                <AvatarFallback className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-primary-foreground font-semibold">
                  {initials(employee)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{fullName(employee)}</p>
                <p className="text-xs text-muted-foreground font-mono">{employee.employeeCode}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <StatusBadge status={employee.employeeStatus} />
                  {employee.employmentType && <Badge variant="outline" className="text-[10px] font-medium">{employee.employmentType}</Badge>}
                  {employee.workMode && <Badge variant="outline" className="text-[10px] font-medium">{employee.workMode}</Badge>}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Row icon={Briefcase} label="Designation" value={employee.designation?.name} />
              <Row icon={UsersIcon} label="Department" value={employee.department?.name} />
              <Row icon={CalendarClock} label="Joined" value={fmtDate(employee.dateOfJoining)} />
              {employee.probationStatus && <Row icon={ShieldCheck} label="Probation" value={employee.probationStatus} />}
            </div>
          </SectionCard>
        </motion.div>

        {/* Job Summary */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <SectionCard title="Job Summary">
            <div className="space-y-2 text-sm">
              <Row icon={HomeIcon} label="Entity" value={employee.entity?.tradeName || employee.entity?.legalName || employee.entity?.code} />
              <Row icon={MapPin} label="Branch" value={employee.branch?.name} />
              <Row icon={MapPin} label="Location" value={employee.location?.name} />
              <Row icon={TrendingUp} label="Grade" value={employee.grade?.name} />
              <Row icon={Briefcase} label="Cost center" value={employee.costCenter} />
              <Row icon={Briefcase} label="Business unit" value={employee.businessUnit} />
              <Row icon={User2} label="Reporting manager" value={mgrName(reportingMgr)} />
            </div>
          </SectionCard>
        </motion.div>

        {/* Payroll Summary */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <SectionCard title="Payroll Summary">
            <div className="space-y-2 text-sm">
              <Row icon={Wallet} label="Annual CTC" value={fmtCurrency(employee.ctc)} />
              <Row icon={Wallet} label="Basic" value={fmtCurrency(employee.basicSalary)} />
              <Row icon={Wallet} label="HRA" value={fmtCurrency(employee.hra)} />
              <Row icon={Wallet} label="Net salary" value={fmtCurrency(employee.netSalary)} />
              <Row icon={Wallet} label="Tax regime" value={employee.taxRegime} />
              <Row icon={ShieldCheck} label="TDS" value={employee.tdsDeclarationStatus} />
            </div>
          </SectionCard>
        </motion.div>

        {/* Statutory snapshot */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <SectionCard title="Statutory Snapshot">
            <div className="space-y-2 text-sm">
              <Row icon={ShieldCheck} label="PAN" value={maskPan(employee.panNumber)} />
              <Row icon={ShieldCheck} label="Aadhaar" value={maskAccount(employee.aadhaarNumber)} />
              <Row icon={ShieldCheck} label="UAN" value={employee.uanNumber} />
              <Row icon={ShieldCheck} label="PF number" value={employee.pfNumber} />
              <Row icon={ShieldCheck} label="PF applicable" value={employee.pfApplicable ? "Yes" : "No"} />
              <Row icon={ShieldCheck} label="Tax regime" value={employee.taxRegime} />
            </div>
          </SectionCard>
        </motion.div>

        {/* Bank Summary */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <SectionCard title="Bank Details">
            <div className="space-y-2 text-sm">
              <Row icon={Wallet} label="Bank" value={employee.bankName} />
              <Row icon={Wallet} label="Account holder" value={employee.accountHolderName} />
              <Row icon={Wallet} label="Account no." value={maskAccount(employee.accountNumber)} />
              <Row icon={Wallet} label="IFSC" value={employee.ifscCode} />
              <Row icon={Wallet} label="Account type" value={employee.accountType} />
              <Row icon={Wallet} label="UPI" value={employee.upiId} />
            </div>
          </SectionCard>
        </motion.div>

        {/* Manager details */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <SectionCard title="Manager Details">
            <div className="space-y-3">
              <ManagerRow icon={User2} label="Reporting" mgr={reportingMgr} />
              <ManagerRow icon={User2} label="Functional" mgr={functionalMgr} />
              <ManagerRow icon={User2} label="HR" mgr={hrMgr} />
            </div>
          </SectionCard>
        </motion.div>

        {/* Emergency Contact */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <SectionCard title="Emergency Contact">
            <div className="space-y-2 text-sm">
              <Row icon={User2} label="Name" value={employee.emergencyContactName} />
              <Row icon={UsersIcon} label="Relation" value={employee.emergencyContactRelation} />
              <Row icon={Phone} label="Phone" value={employee.emergencyContactPhone} />
              <Row icon={Phone} label="Alt phone" value={employee.emergencyContactAltPhone} />
              <Row icon={Mail} label="Email" value={employee.emergencyContactEmail} />
            </div>
          </SectionCard>
        </motion.div>

        {/* Documents Status */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <SectionCard title="Documents Status">
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Total" value={docsCount} accent="emerald" />
              <MiniStat label="Family" value={familyCount} accent="teal" />
              <MiniStat label="Education" value={eduCount} accent="cyan" />
              <MiniStat label="Experience" value={expCount} accent="amber" />
            </div>
          </SectionCard>
        </motion.div>

        {/* Upcoming Holiday */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <SectionCard title="Upcoming Holiday">
            {nextHoliday ? (
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 flex-col">
                  <span className="text-[10px] font-medium uppercase">{new Date(nextHoliday.date).toLocaleDateString("en-IN", { month: "short" })}</span>
                  <span className="text-base font-bold leading-none">{new Date(nextHoliday.date).getDate()}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{nextHoliday.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{nextHoliday.type} holiday</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{fmtRelative(nextHoliday.date)}</p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-3 text-center">
                {loading ? "Loading…" : "No upcoming holiday scheduled."}
              </div>
            )}
            {employee.probationStatus === "On Probation" && employee.probationEndDate && (
              <div className="mt-3 pt-3 border-t border-border/60">
                <p className="text-xs text-muted-foreground">Probation ends</p>
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{fmtDate(employee.probationEndDate)}</p>
              </div>
            )}
          </SectionCard>
        </motion.div>

        {/* Pending Tasks */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <SectionCard title="Pending Tasks" description="Open requests and approvals">
            <ScrollArea className="max-h-72">
              {loading ? (
                <div className="space-y-2 p-1">
                  {Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} className="h-12" />)}
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500/60 mb-2" />
                  <p className="text-sm text-muted-foreground">All caught up — no pending requests.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingRequests.slice(0, 6).map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-2.5 hover:bg-muted/40 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.requestType} · {fmtRelative(r.submittedAt || r.createdAt)}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </SectionCard>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <SectionCard title="Recent Activity" description="Latest timeline events">
            {loading ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-10" />)}
              </div>
            ) : timeline.length === 0 ? (
              <div className="py-6 text-center">
                <Activity className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity recorded.</p>
              </div>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-1 bottom-1 w-px bg-border/60" />
                <div className="space-y-3">
                  {timeline.map((ev) => (
                    <div key={ev.id} className="relative">
                      <div className="absolute -left-[18px] top-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{ev.title}</p>
                          {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
                          {ev.actorName && <p className="text-[10px] text-muted-foreground mt-0.5">by {ev.actorName}</p>}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{fmtRelative(ev.eventDate || ev.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ---------- small subcomponents ----------
function Row({ icon: Icon, label, value }: { icon: any; label: string; value?: React.ReactNode }) {
  const empty = value === undefined || value === null || value === ""
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground min-w-0 truncate">{label}</span>
      <span className={cn("ml-auto text-right truncate", empty ? "text-muted-foreground/50 italic text-xs" : "font-medium")}>
        {empty ? "—" : value}
      </span>
    </div>
  )
}

function ManagerRow({ icon: Icon, label, mgr }: { icon: any; label: string; mgr: any }) {
  const name = mgr ? `${mgr.firstName} ${mgr.lastName || ""}`.trim() : null
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-gradient-to-br from-teal-500/15 to-cyan-500/15 text-teal-700 dark:text-teal-300 text-xs font-medium">
          {name ? name.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase() : "—"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label} manager</p>
        <p className="text-sm font-medium truncate">{name || "Not assigned"}</p>
        {mgr?.employeeCode && <p className="text-[10px] text-muted-foreground font-mono">{mgr.employeeCode}</p>}
      </div>
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent: "emerald" | "teal" | "cyan" | "amber" | "fuchsia" }) {
  const map: Record<string, string> = {
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    teal: "from-teal-500/10 to-teal-500/5 text-teal-600 dark:text-teal-400",
    cyan: "from-cyan-500/10 to-cyan-500/5 text-cyan-600 dark:text-cyan-400",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400",
    fuchsia: "from-fuchsia-500/10 to-fuchsia-500/5 text-fuchsia-600 dark:text-fuchsia-400",
  }
  return (
    <div className={cn("rounded-lg bg-gradient-to-br p-3", map[accent])}>
      <p className="text-[10px] uppercase font-medium opacity-80">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
