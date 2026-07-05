"use client"

// ============================================================================
//  ItAccessSection — Offboarding spec #12
//  IT access revocation tracking. Stats cards, filter bar, IT access table
//  with row actions, and a highlighted Important Rules panel summarising the
//  spec #12 rules (terminate→immediate, normal→LWD EOD, garden leave→start,
//  HRMS self-service→until FnF/letters).
// ============================================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Lock, Clock, CheckCircle2, Calendar, Search, MoreHorizontal,
  Zap, CalendarClock, ShieldCheck, BellRing, MessageSquarePlus,
  Check, Server, Mail, KeyRound, Network, Cloud, FolderOpen,
  Fingerprint, DoorClosed, Trello, Wallet, Settings2, Filter, Inbox,
  AlertTriangle, Info, UserCog, FileText,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"

import {
  EXIT_CASES, IT_ACCESS,
} from "@/components/hrms/offboarding/data"
import type { ITAccessItem } from "@/components/hrms/offboarding/shared"
import {
  initials, formatDate, formatDateTime, STATUS_COLORS,
} from "@/components/hrms/offboarding/shared"

// ---------- Constants ----------
const SYSTEM_NAMES = [
  "HRMS Login", "Official Email", "SSO / Azure AD", "Google Workspace", "VPN",
  "Wi-Fi", "Slack", "Microsoft Teams", "GitHub", "GitLab", "Jira", "Azure DevOps",
  "CRM", "ERP", "Payroll System", "Cloud Storage", "Shared Drives",
  "Biometric Device", "Access Control System", "Project Management Tools",
  "Finance Tools", "Admin Tools",
] as const

const REVOKE_TIMINGS = ["Immediately", "On LWD End of Day", "After Clearance", "Manual"] as const
const REVOCATION_STATUSES = ["Not Started", "Pending", "Scheduled", "Revoked", "Partial"] as const

const SYSTEM_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "HRMS Login": Settings2,
  "Official Email": Mail,
  "SSO / Azure AD": KeyRound,
  "Google Workspace": Mail,
  "VPN": Network,
  "Wi-Fi": Network,
  "Slack": MessageSquarePlus,
  "Microsoft Teams": MessageSquarePlus,
  "GitHub": Server,
  "GitLab": Server,
  "Jira": Trello,
  "Azure DevOps": Trello,
  "CRM": Server,
  "ERP": Server,
  "Payroll System": Wallet,
  "Cloud Storage": Cloud,
  "Shared Drives": FolderOpen,
  "Biometric Device": Fingerprint,
  "Access Control System": DoorClosed,
  "Project Management Tools": Trello,
  "Finance Tools": Wallet,
  "Admin Tools": Settings2,
}

const REVOKE_TIMING_COLORS: Record<string, string> = {
  "Immediately": "#ef4444",
  "On LWD End of Day": "#f59e0b",
  "After Clearance": "#0ea5e9",
  "Manual": "#94a3b8",
}

// ============================================================================
//  Component
// ============================================================================
export function ItAccessSection() {
  const [items, setItems] = useState<ITAccessItem[]>(IT_ACCESS)
  const [exitCaseFilter, setExitCaseFilter] = useState<string>("all")
  const [systemFilter, setSystemFilter] = useState<string>("all")
  const [timingFilter, setTimingFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [remarksOpen, setRemarksOpen] = useState(false)
  const [remarksTarget, setRemarksTarget] = useState<ITAccessItem | null>(null)
  const [remarksText, setRemarksText] = useState("")

  // ---------- Derived: filter + search ----------
  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (exitCaseFilter !== "all" && a.exitCaseId !== exitCaseFilter) return false
      if (systemFilter !== "all" && a.systemName !== systemFilter) return false
      if (timingFilter !== "all" && a.revokeTiming !== timingFilter) return false
      if (statusFilter !== "all" && a.revocationStatus !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const ec = EXIT_CASES.find((e) => e.id === a.exitCaseId)
        if (!(
          a.systemName.toLowerCase().includes(q) ||
          a.accessType.toLowerCase().includes(q) ||
          a.ownerTeam.toLowerCase().includes(q) ||
          (ec?.employeeName.toLowerCase().includes(q) ?? false) ||
          (ec?.exitCaseId.toLowerCase().includes(q) ?? false)
        )) return false
      }
      return true
    })
  }, [items, exitCaseFilter, systemFilter, timingFilter, statusFilter, search])

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const total = items.length
    const pending = items.filter((a) => a.revocationStatus === "Pending" || a.revocationStatus === "Not Started" || a.revocationStatus === "Partial").length
    const revoked = items.filter((a) => a.revocationStatus === "Revoked").length
    const scheduled = items.filter((a) => a.revocationStatus === "Scheduled").length
    return { total, pending, revoked, scheduled }
  }, [items])

  // ---------- Actions ----------
  const updateItem = (id: string, patch: Partial<ITAccessItem>) => {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  const handleAction = (action: string, item: ITAccessItem) => {
    const ec = EXIT_CASES.find((e) => e.id === item.exitCaseId)
    const ecLabel = ec ? `${ec.employeeName} (${ec.exitCaseId})` : item.exitCaseId
    const patch: Partial<ITAccessItem> = {}
    switch (action) {
      case "revoke":
        patch.revocationStatus = "Revoked"
        patch.revokeDate = new Date().toISOString().slice(0, 10)
        patch.revokeTime = new Date().toTimeString().slice(0, 5)
        patch.verificationStatus = "Verified"
        break
      case "schedule":
        patch.revocationStatus = "Scheduled"
        break
      case "verify":
        patch.verificationStatus = "Verified"
        break
      default:
        break
    }
    if (Object.keys(patch).length > 0) updateItem(item.id, patch)
    const labels: Record<string, string> = {
      revoke: "Access revoked immediately", schedule: "Revocation scheduled",
      verify: "Marked as verified", reminder: `Reminder sent to ${item.ownerTeam} team`,
      remarks: "Remarks dialog opened",
    }
    toast.success(`${labels[action] || action} — ${item.systemName}`, {
      description: `Exit case: ${ecLabel}`,
    })
  }

  const openRemarks = (item: ITAccessItem) => {
    setRemarksTarget(item)
    setRemarksText(item.remarks || "")
    setRemarksOpen(true)
  }

  const saveRemarks = () => {
    if (!remarksTarget) return
    updateItem(remarksTarget.id, { remarks: remarksText })
    toast.success("Remarks saved")
    setRemarksOpen(false)
    setRemarksTarget(null)
    setRemarksText("")
  }

  // ---------- Render helpers ----------
  const renderStatusBadge = (status: string) => {
    const color = STATUS_COLORS[status] || "#94a3b8"
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {status}
      </span>
    )
  }

  const renderTimingBadge = (timing: string) => {
    const color = REVOKE_TIMING_COLORS[timing] || "#94a3b8"
    return (
      <span
        className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        {timing}
      </span>
    )
  }

  const renderSystemIcon = (system: string) => {
    const Icon = SYSTEM_ICON[system] || Server
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
        <Icon className="h-4 w-4" />
      </span>
    )
  }

  // ============================================================================
  return (
    <div className="flex flex-col gap-5">
      {/* Important Rules panel */}
      <Card className="shadow-sm border-rose-200 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/80 to-orange-50/40 dark:from-rose-950/20 dark:to-orange-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="grid h-7 w-7 place-items-center rounded-lg gradient-rose text-primary-foreground">
              <AlertTriangle className="h-4 w-4" />
            </span>
            Important Rules — IT Access Revocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <RuleCard
              icon={<Zap className="h-4 w-4" />}
              tone="rose"
              title="Termination / High-risk Exit"
              body="Revoke all access immediately on termination effective date. No grace period."
            />
            <RuleCard
              icon={<CalendarClock className="h-4 w-4" />}
              tone="amber"
              title="Normal Resignation"
              body="Revoke on LWD end of day. Email/HRMS may remain accessible until clearance complete."
            />
            <RuleCard
              icon={<Calendar className="h-4 w-4" />}
              tone="sky"
              title="Garden Leave"
              body="Revoke on garden leave start date. Email forwarding configured for transition period."
            />
            <RuleCard
              icon={<Settings2 className="h-4 w-4" />}
              tone="slate"
              title="HRMS Self-service"
              body="Keep limited access until FnF settlement & exit letters if configured."
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Lock className="h-4 w-4" />}
          label="Total Access Items"
          value={stats.total}
          accent="#9f1239"
          tint="#fff1f2"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Pending Revocation"
          value={stats.pending}
          accent="#f59e0b"
          tint="#fffbeb"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Revoked"
          value={stats.revoked}
          accent="#10b981"
          tint="#ecfdf5"
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Scheduled"
          value={stats.scheduled}
          accent="#0ea5e9"
          tint="#f0f9ff"
        />
      </div>

      {/* Filter bar */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by system, access type, employee…"
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:items-center">
              <Select value={exitCaseFilter} onValueChange={setExitCaseFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[170px]"><SelectValue placeholder="Exit Case" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exit Cases</SelectItem>
                  {EXIT_CASES.map((ec) => (
                    <SelectItem key={ec.id} value={ec.id}>{ec.employeeName} · {ec.exitCaseId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={systemFilter} onValueChange={setSystemFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[150px]"><SelectValue placeholder="System" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Systems</SelectItem>
                  {SYSTEM_NAMES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={timingFilter} onValueChange={setTimingFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[160px]"><SelectValue placeholder="Revoke Timing" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Timings</SelectItem>
                  {REVOKE_TIMINGS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {REVOCATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(exitCaseFilter !== "all" || systemFilter !== "all" || timingFilter !== "all" || statusFilter !== "all" || search) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>Showing {filtered.length} of {items.length} access items</span>
              <Button
                variant="ghost" size="sm" className="h-6 px-2 text-xs"
                onClick={() => { setExitCaseFilter("all"); setSystemFilter("all"); setTimingFilter("all"); setStatusFilter("all"); setSearch("") }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IT access table */}
      <Card className="shadow-sm border-border/60 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-rose-600" />
            IT Access Revocation
            <Badge variant="secondary" className="ml-1 font-normal">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
                <TableRow>
                  <TableHead className="min-w-[220px]">System</TableHead>
                  <TableHead>Owner Team</TableHead>
                  <TableHead>Exit Case</TableHead>
                  <TableHead>Revoke Timing</TableHead>
                  <TableHead>Revoke Date/Time</TableHead>
                  <TableHead className="text-center">Backup</TableHead>
                  <TableHead className="text-center">Transfer</TableHead>
                  <TableHead>New Owner</TableHead>
                  <TableHead className="text-center">License</TableHead>
                  <TableHead>Revocation Status</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-12 text-center text-muted-foreground">
                      <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No IT access items match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const ec = EXIT_CASES.find((e) => e.id === item.exitCaseId)
                    return (
                      <TableRow
                        key={item.id}
                        className="hover:bg-rose-50/40 dark:hover:bg-rose-950/10 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            {renderSystemIcon(item.systemName)}
                            <div className="min-w-0">
                              <div className="text-sm font-medium">{item.systemName}</div>
                              <div className="text-xs text-muted-foreground">{item.accessType}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="font-normal">{item.ownerTeam}</Badge>
                        </TableCell>
                        <TableCell>
                          {ec ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold text-white shrink-0"
                                style={{ backgroundColor: ec.avatarColor }}
                              >
                                {initials(ec.employeeName)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium truncate">{ec.employeeName}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{ec.exitCaseId}</div>
                              </div>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{renderTimingBadge(item.revokeTiming)}</TableCell>
                        <TableCell className="text-xs">
                          {item.revokeDate ? (
                            <div>
                              <div>{formatDate(item.revokeDate)}</div>
                              {item.revokeTime && <div className="text-muted-foreground">{item.revokeTime}</div>}
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <YesNoPill yes={item.dataBackupRequired} />
                        </TableCell>
                        <TableCell className="text-center">
                          <YesNoPill yes={item.dataTransferRequired} />
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.newOwner ? (
                            <div className="flex items-center gap-1.5">
                              <UserCog className="h-3 w-3 text-muted-foreground" />
                              <span>{item.newOwner}</span>
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <YesNoPill yes={item.licenseDeactivationRequired} />
                        </TableCell>
                        <TableCell>{renderStatusBadge(item.revocationStatus)}</TableCell>
                        <TableCell>
                          {item.verificationStatus ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] py-0 px-1.5",
                                item.verificationStatus === "Verified"
                                  ? "border-emerald-300 text-emerald-700 dark:text-emerald-300"
                                  : "border-amber-300 text-amber-700 dark:text-amber-300"
                              )}
                            >
                              <Check className="h-2.5 w-2.5 mr-1" />
                              {item.verificationStatus}
                            </Badge>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel className="text-xs">Access Actions</DropdownMenuLabel>
                              <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => handleAction("revoke", item)}>
                                  <Zap className="h-3.5 w-3.5 mr-2 text-rose-600" /> Revoke Now
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction("schedule", item)}>
                                  <CalendarClock className="h-3.5 w-3.5 mr-2" /> Schedule Revocation
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction("verify", item)}>
                                  <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Mark Verified
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => handleAction("reminder", item)}>
                                  <BellRing className="h-3.5 w-3.5 mr-2" /> Send Reminder
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openRemarks(item)}>
                                  <MessageSquarePlus className="h-3.5 w-3.5 mr-2" /> Add Remarks
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Remarks dialog */}
      <Dialog open={remarksOpen} onOpenChange={setRemarksOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4 text-rose-600" />
              Remarks — {remarksTarget?.systemName}
            </DialogTitle>
            <DialogDescription>
              {remarksTarget ? `Access type: ${remarksTarget.accessType} · Owner team: ${remarksTarget.ownerTeam}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={remarksText}
              onChange={(e) => setRemarksText(e.target.value)}
              placeholder="Add remarks (e.g., reason for delay, dependent tasks, escalation notes)…"
              className="min-h-[120px] text-sm"
            />
            {remarksTarget?.remarks && (
              <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground flex items-start gap-2">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Existing remarks will be replaced when you save.</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemarksOpen(false)}>Cancel</Button>
            <Button onClick={saveRemarks} className="gradient-rose text-primary-foreground">
              Save Remarks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
//  Sub-components
// ============================================================================
function StatCard({ icon, label, value, accent, tint }: {
  icon: React.ReactNode; label: string; value: number; accent: string; tint: string
}) {
  return (
    <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
          </div>
          <div
            className="grid h-9 w-9 place-items-center rounded-lg"
            style={{ backgroundColor: tint, color: accent }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function YesNoPill({ yes }: { yes: boolean }) {
  return yes ? (
    <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-rose-300 text-rose-700 dark:text-rose-300">
      Yes
    </Badge>
  ) : (
    <span className="text-xs text-muted-foreground">No</span>
  )
}

function RuleCard({ icon, title, body, tone }: {
  icon: React.ReactNode; title: string; body: string;
  tone: "rose" | "amber" | "sky" | "slate"
}) {
  const tones: Record<string, { bg: string; fg: string; border: string }> = {
    rose: { bg: "bg-rose-100 dark:bg-rose-950/40", fg: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-900/50" },
    amber: { bg: "bg-amber-100 dark:bg-amber-950/40", fg: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-900/50" },
    sky: { bg: "bg-sky-100 dark:bg-sky-950/40", fg: "text-sky-700 dark:text-sky-300", border: "border-sky-200 dark:border-sky-900/50" },
    slate: { bg: "bg-slate-100 dark:bg-slate-900/40", fg: "text-slate-700 dark:text-slate-300", border: "border-slate-200 dark:border-slate-800" },
  }
  const t = tones[tone]
  return (
    <div className={cn("rounded-xl border p-3", t.border)}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={cn("grid h-7 w-7 place-items-center rounded-lg", t.bg, t.fg)}>
          {icon}
        </span>
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pl-9">{body}</p>
    </div>
  )
}

export default ItAccessSection
