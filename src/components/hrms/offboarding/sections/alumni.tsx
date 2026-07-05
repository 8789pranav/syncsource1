"use client"

// =============================================================
// Offboarding — Alumni (spec section #19) — Task ID 2j
// Ex-employee records, rehire eligibility & status. Rose theme.
// =============================================================

import * as React from "react"
import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Users, UserCheck, UserX, UserPlus, Search, Eye, Pencil, FileText,
  FileSignature, CheckCircle2, XCircle, Ban, Trash2, Mail, Phone,
  Linkedin, ExternalLink, Briefcase, CalendarDays, Building2, Clock,
  Download, ChevronRight, Filter, X, History, ShieldCheck,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"

import { AlumniRecord, EXIT_TYPES, EXIT_TYPE_COLORS, initials, formatDate } from "../shared"
import { ALUMNI, EXIT_DOCUMENT_TEMPLATES } from "../data"

// =============================================================
// Constants & helpers
// =============================================================

const STATUS_OPTIONS = ["All", "Alumni", "Blacklisted", "No-Rehire"] as const

const STATUS_BADGE_STYLES: Record<string, string> = {
  "Alumni":      "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  "Blacklisted": "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  "No-Rehire":   "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
}

const EXIT_TYPE_OPTIONS = ["All", ...EXIT_TYPES] as const

function uniqueDepartments(): string[] {
  return Array.from(new Set(ALUMNI.map((a) => a.department))).sort()
}

function uniqueEntities(): string[] {
  return Array.from(new Set(ALUMNI.map((a) => a.entity))).sort()
}

const DEPARTMENT_OPTIONS = ["All", ...uniqueDepartments()] as const

// ---- Timeline of the alumni's exit process ----
interface TimelineEvent {
  label: string
  description: string
  date?: string
  icon: React.ComponentType<{ className?: string }>
  tone: "rose" | "amber" | "violet" | "cyan" | "teal" | "emerald" | "slate"
}

const TONE_STYLES: Record<TimelineEvent["tone"], { dot: string; ring: string; text: string }> = {
  rose:    { dot: "bg-rose-500",    ring: "ring-rose-500/30",    text: "text-rose-600 dark:text-rose-400" },
  amber:   { dot: "bg-amber-500",   ring: "ring-amber-500/30",   text: "text-amber-600 dark:text-amber-400" },
  violet:  { dot: "bg-violet-500",  ring: "ring-violet-500/30",  text: "text-violet-600 dark:text-violet-400" },
  cyan:    { dot: "bg-cyan-500",    ring: "ring-cyan-500/30",    text: "text-cyan-600 dark:text-cyan-400" },
  teal:    { dot: "bg-teal-500",    ring: "ring-teal-500/30",    text: "text-teal-600 dark:text-teal-400" },
  emerald: { dot: "bg-emerald-500", ring: "ring-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400" },
  slate:   { dot: "bg-slate-500",   ring: "ring-slate-500/30",   text: "text-slate-600 dark:text-slate-400" },
}

function buildTimeline(a: AlumniRecord): TimelineEvent[] {
  const lwd = new Date(a.lastWorkingDay)
  const alumni = new Date(a.alumniSince)
  const resignation = new Date(lwd.getTime() - 60 * 86400000) // ~2 months before LWD
  const day = (n: number) => new Date(lwd.getTime() + n * 86400000).toISOString()
  return [
    { label: "Date of Joining",            description: `Joined ${a.entity} as ${a.designation} in ${a.department}.`, date: a.dateOfJoining,     icon: UserPlus,       tone: "emerald" },
    { label: "Resignation Submitted",      description: `Resignation submitted — reason: ${a.exitReason}.`,          date: resignation.toISOString(), icon: FileText,   tone: "amber" },
    { label: "Manager & HR Approval",      description: "Resignation reviewed and last working day approved.",     date: new Date(resignation.getTime() + 4 * 86400000).toISOString(), icon: ShieldCheck, tone: "violet" },
    { label: "Notice Period Served",       description: "Employee served the contractual notice period.",          date: day(-1),            icon: Clock,          tone: "slate" },
    { label: "Clearance Completed",        description: "All department-wise clearance tasks closed.",              date: day(-2),            icon: CheckCircle2,   tone: "cyan" },
    { label: "Asset Recovery & IT Revocation", description: "Assets returned and IT access revoked.",                date: day(-1),            icon: Building2,      tone: "teal" },
    { label: "FnF Settled",                description: "Full & Final settlement processed and approved.",          date: lwd.toISOString(),  icon: Briefcase,      tone: "emerald" },
    { label: "Last Working Day",           description: `Official last working day at ${a.entity}.`,                  date: a.lastWorkingDay,   icon: CalendarDays,   tone: "rose" },
    { label: "Relieving & Experience Letter", description: "Relieving and experience letters generated and issued.", date: alumni.toISOString(), icon: FileSignature, tone: "violet" },
    { label: "Alumni Profile Created",     description: `Ex-employee record archived under alumni — ${a.status}.`,  date: a.alumniSince,      icon: Users,          tone: "rose" },
  ]
}

// =============================================================
// Stat cards
// =============================================================

interface StatDef {
  label: string
  value: number
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  accent: "rose" | "emerald" | "amber" | "violet"
}

const ACCENT_TILE: Record<StatDef["accent"], { grad: string; ring: string; text: string }> = {
  rose:    { grad: "from-rose-500/15 to-rose-500/5",    ring: "ring-rose-500/20",    text: "text-rose-600 dark:text-rose-400" },
  emerald: { grad: "from-emerald-500/15 to-emerald-500/5", ring: "ring-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" },
  amber:   { grad: "from-amber-500/15 to-amber-500/5",   ring: "ring-amber-500/20",   text: "text-amber-600 dark:text-amber-400" },
  violet:  { grad: "from-violet-500/15 to-violet-500/5", ring: "ring-violet-500/20",  text: "text-violet-600 dark:text-violet-400" },
}

function AlumniStatCard({ def }: { def: StatDef }) {
  const a = ACCENT_TILE[def.accent]
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 220, damping: 22 }}>
      <Card className={cn("relative overflow-hidden border border-border/60 rounded-xl shadow-soft hover:shadow-card transition-all duration-200 bg-gradient-to-br", a.grad)}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{def.label}</p>
              <p className="text-2xl sm:text-3xl font-semibold mt-1 text-foreground tabular-nums leading-none">{def.value}</p>
              {def.sub && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{def.sub}</p>}
            </div>
            <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background/70 ring-1 backdrop-blur-sm", a.ring, a.text)}>
              <def.icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// =============================================================
// Row actions dropdown
// =============================================================

interface RowAction {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  tone?: "default" | "danger" | "success"
}

const ROW_ACTIONS: RowAction[] = [
  { key: "view",            label: "View Profile",             icon: Eye },
  { key: "edit",            label: "Edit Contact",             icon: Pencil },
  { key: "relieving",       label: "Download Relieving Letter", icon: FileText },
  { key: "experience",      label: "Download Experience Letter", icon: FileSignature },
  { key: "markRehire",      label: "Mark Eligible for Rehire", icon: CheckCircle2, tone: "success" },
  { key: "markNoRehire",    label: "Mark No-Rehire",           icon: XCircle, tone: "danger" },
  { key: "blacklist",       label: "Add to Blacklist",         icon: Ban, tone: "danger" },
  { key: "remove",          label: "Remove from Alumni",       icon: Trash2, tone: "danger" },
]

function handleRowAction(action: string, a: AlumniRecord, mutate: (id: string, patch: Partial<AlumniRecord>) => void) {
  switch (action) {
    case "view":
      // handled by parent
      return
    case "edit":
      toast.info(`Edit contact for ${a.employeeName}`, {
        description: "Contact editor would open here.",
      })
      return
    case "relieving":
      toast.success(`Relieving letter download started for ${a.employeeName}`, {
        description: "PDF will be generated from the Standard Relieving Letter template.",
      })
      return
    case "experience":
      toast.success(`Experience letter download started for ${a.employeeName}`, {
        description: "PDF will be generated from the Standard Experience Letter template.",
      })
      return
    case "markRehire":
      mutate(a.id, { eligibleRehire: true, status: "Alumni" })
      toast.success(`${a.employeeName} marked as eligible for rehire`)
      return
    case "markNoRehire":
      mutate(a.id, { eligibleRehire: false, status: "No-Rehire" })
      toast.success(`${a.employeeName} marked as no-rehire`)
      return
    case "blacklist":
      mutate(a.id, { eligibleRehire: false, status: "Blacklisted" })
      toast.success(`${a.employeeName} added to blacklist`)
      return
    case "remove":
      mutate(a.id, { status: "Alumni" })
      toast.info(`${a.employeeName} archived from active alumni view`)
      return
  }
}

// =============================================================
// Rehire badge
// =============================================================

function RehireBadge({ eligible }: { eligible: boolean }) {
  return eligible ? (
    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-0 font-medium gap-1">
      <CheckCircle2 className="h-3 w-3" /> Yes
    </Badge>
  ) : (
    <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-0 font-medium gap-1">
      <XCircle className="h-3 w-3" /> No
    </Badge>
  )
}

function ExitTypeBadge({ exitType }: { exitType: string }) {
  const color = EXIT_TYPE_COLORS[exitType] || "#64748b"
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium border"
      style={{
        color: color,
        borderColor: `${color}40`,
        backgroundColor: `${color}14`,
      }}
    >
      {exitType}
    </span>
  )
}

// =============================================================
// Avatar
// =============================================================

function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-full font-semibold text-white shrink-0 shadow-sm"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}


// =============================================================
// Main Section
// =============================================================

export function AlumniSection() {
  const [alumni, setAlumni] = useState<AlumniRecord[]>(ALUMNI)
  const [search, setSearch] = useState("")
  const [exitTypeFilter, setExitTypeFilter] = useState<string>(EXIT_TYPE_OPTIONS[0])
  const [deptFilter, setDeptFilter] = useState<string>(DEPARTMENT_OPTIONS[0])
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_OPTIONS[0])
  const [profileId, setProfileId] = useState<string | null>(null)

  const mutate = React.useCallback((id: string, patch: Partial<AlumniRecord>) => {
    setAlumni((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }, [])

  const stats = useMemo<StatDef[]>(() => {
    const total = alumni.length
    const eligible = alumni.filter((a) => a.eligibleRehire).length
    const noRehireBlacklist = alumni.filter(
      (a) => a.status === "No-Rehire" || a.status === "Blacklisted",
    ).length
    const nowMonth = new Date().getMonth()
    const nowYear = new Date().getFullYear()
    const addedThisMonth = alumni.filter((a) => {
      const d = new Date(a.alumniSince)
      return d.getMonth() === nowMonth && d.getFullYear() === nowYear
    }).length
    return [
      { label: "Total Alumni", value: total, sub: "All ex-employee records", icon: Users, accent: "rose" as const },
      { label: "Eligible for Rehire", value: eligible, sub: "Available for re-hire", icon: UserCheck, accent: "emerald" as const },
      { label: "No-Rehire / Blacklisted", value: noRehireBlacklist, sub: "Restricted rehire status", icon: UserX, accent: "amber" as const },
      { label: "Added This Month", value: addedThisMonth, sub: "New alumni this month", icon: UserPlus, accent: "violet" as const },
    ]
  }, [alumni])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return alumni.filter((a) => {
      if (exitTypeFilter !== "All" && a.exitType !== exitTypeFilter) return false
      if (deptFilter !== "All" && a.department !== deptFilter) return false
      if (statusFilter !== "All" && a.status !== statusFilter) return false
      if (q && !(`${a.employeeName} ${a.employeeCode}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [alumni, search, exitTypeFilter, deptFilter, statusFilter])

  const hasActiveFilters =
    search !== "" || exitTypeFilter !== "All" || deptFilter !== "All" || statusFilter !== "All"

  function resetFilters() {
    setSearch("")
    setExitTypeFilter(EXIT_TYPE_OPTIONS[0])
    setDeptFilter(DEPARTMENT_OPTIONS[0])
    setStatusFilter(STATUS_OPTIONS[0])
  }

  const profileAlumni = profileId ? alumni.find((a) => a.id === profileId) || null : null

  return (
    <div className="flex flex-col gap-5">
      {/* ---------- Page header ---------- */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                Alumni
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Ex-employee records, rehire eligibility &amp; status tracking.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("Export to CSV", { description: "Alumni export would download here." })}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white" onClick={() => toast.info("Add alumni", { description: "Manually add an alumni record." })}>
            <UserPlus className="h-4 w-4" /> Add Alumni
          </Button>
        </div>
      </div>

      {/* ---------- Stat cards ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => <AlumniStatCard key={s.label} def={s} />)}
      </div>

      {/* ---------- Filter bar ---------- */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] text-muted-foreground font-medium">Exit Type</Label>
              <Select value={exitTypeFilter} onValueChange={setExitTypeFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXIT_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t === "All" ? "All Exit Types" : t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] text-muted-foreground font-medium">Department</Label>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d === "All" ? "All Departments" : d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] text-muted-foreground font-medium">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s === "All" ? "All Statuses" : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] text-muted-foreground font-medium">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or employee code..."
                  className="h-9 pl-8 pr-8"
                />
                {search && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{filtered.length}</span> of {alumni.length} alumni
              </p>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={resetFilters}>
                <Filter className="h-3 w-3" /> Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------- Alumni table ---------- */}
      <Card className="rounded-xl border-border/60 shadow-soft">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[640px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
                <TableRow className="hover:bg-transparent border-border/60">
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[200px]">Employee</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[160px]">Entity</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[120px]">Department</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[140px]">Designation</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[110px]">Date of Joining</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[110px]">Last Working Day</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[170px]">Exit Type</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[150px]">Exit Reason</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[200px]">Email</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[140px]">Phone</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[80px] text-center">LinkedIn</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[120px]">Rehire</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[110px]">Alumni Since</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[110px]">Status</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold min-w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={15} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
                          <Users className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-medium">No alumni match your filters</p>
                        {hasActiveFilters && (
                          <Button variant="outline" size="sm" className="h-7 text-xs mt-1" onClick={resetFilters}>
                            <X className="h-3 w-3" /> Reset filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                <AnimatePresence>
                  {filtered.map((a) => (
                    <motion.tr
                      key={a.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group border-b border-border/40 hover:bg-rose-50/40 dark:hover:bg-rose-500/5 transition-colors"
                    >
                      <TableCell className="py-2.5">
                        <button
                          onClick={() => setProfileId(a.id)}
                          className="flex items-center gap-2.5 text-left min-w-0"
                        >
                          <Avatar name={a.employeeName} color={a.avatarColor} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                              {a.employeeName}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">{a.employeeCode}</div>
                          </div>
                        </button>
                      </TableCell>
                      <TableCell className="text-xs text-foreground/90">{a.entity}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-medium border-border/60 text-foreground/80">
                          {a.department}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-foreground/90">{a.designation}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(a.dateOfJoining)}</TableCell>
                      <TableCell className="text-xs text-rose-600 dark:text-rose-400 font-medium whitespace-nowrap">{formatDate(a.lastWorkingDay)}</TableCell>
                      <TableCell><ExitTypeBadge exitType={a.exitType} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]">{a.exitReason}</TableCell>
                      <TableCell>
                        <a href={`mailto:${a.email}`} className="text-xs text-foreground/90 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1 truncate max-w-[200px]">
                          <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{a.email}</span>
                        </a>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {a.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {a.phone}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {a.linkedin ? (
                          <a
                            href={`https://${a.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-sky-600 hover:bg-sky-500/10 dark:text-sky-400"
                            title={a.linkedin}
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell><RehireBadge eligible={a.eligibleRehire} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(a.alumniSince)}</TableCell>
                      <TableCell>
                        <Badge className={cn("font-medium border-0", STATUS_BADGE_STYLES[a.status])}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-rose-500/10">
                              <ChevronRight className="h-4 w-4 rotate-90 text-muted-foreground" />
                              <span className="sr-only">Open actions for {a.employeeName}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                              {a.employeeName} · {a.employeeCode}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {ROW_ACTIONS.map((act) => {
                              const Icon = act.icon
                              const toneCls =
                                act.tone === "danger"
                                  ? "text-rose-600 dark:text-rose-400 focus:bg-rose-500/10 focus:text-rose-700 dark:focus:text-rose-300"
                                  : act.tone === "success"
                                  ? "text-emerald-600 dark:text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-700 dark:focus:text-emerald-300"
                                  : "focus:bg-accent"
                              return (
                                <DropdownMenuItem
                                  key={act.key}
                                  className={cn("gap-2 cursor-pointer", toneCls)}
                                  onClick={() => {
                                    if (act.key === "view") {
                                      setProfileId(a.id)
                                    } else {
                                      handleRowAction(act.key, a, mutate)
                                    }
                                  }}
                                >
                                  <Icon className="h-4 w-4" /> {act.label}
                                </DropdownMenuItem>
                              )
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ---------- Profile dialog ---------- */}
      <AlumniProfileDialog
        alumni={profileAlumni}
        open={!!profileAlumni}
        onOpenChange={(o) => { if (!o) setProfileId(null) }}
        onMutate={mutate}
      />
    </div>
  )
}

// =============================================================
// Alumni Profile Dialog
// =============================================================

function AlumniProfileDialog({
  alumni, open, onOpenChange, onMutate,
}: {
  alumni: AlumniRecord | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onMutate: (id: string, patch: Partial<AlumniRecord>) => void
}) {
  if (!alumni) return null
  const timeline = buildTimeline(alumni)
  const relievingLetter = EXIT_DOCUMENT_TEMPLATES.find((d) => d.documentType === "Relieving Letter")
  const experienceLetter = EXIT_DOCUMENT_TEMPLATES.find((d) => d.documentType === "Experience Letter")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-rose-500/8 via-transparent to-transparent">
          <div className="flex items-start gap-3">
            <Avatar name={alumni.employeeName} color={alumni.avatarColor} size={48} />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-semibold text-foreground">
                {alumni.employeeName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                <span>{alumni.employeeCode}</span>
                <span className="text-border">·</span>
                <span>{alumni.designation}</span>
                <span className="text-border">·</span>
                <span>{alumni.department}</span>
              </DialogDescription>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <Badge className={cn("font-medium border-0", STATUS_BADGE_STYLES[alumni.status])}>
                  {alumni.status}
                </Badge>
                <RehireBadge eligible={alumni.eligibleRehire} />
                <Badge variant="outline" className="text-[11px] font-medium border-border/60">
                  <CalendarDays className="h-3 w-3 mr-1 text-muted-foreground" />
                  Alumni since {formatDate(alumni.alumniSince)}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[68vh]">
          <div className="px-5 py-4 flex flex-col gap-5">
            {/* Employee details + Exit details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailCard title="Employee Details" icon={Users} tone="rose">
                <DetailRow label="Entity" value={alumni.entity} />
                <DetailRow label="Department" value={alumni.department} />
                <DetailRow label="Designation" value={alumni.designation} />
                <DetailRow label="Date of Joining" value={formatDate(alumni.dateOfJoining)} />
                <DetailRow label="Last Working Day" value={formatDate(alumni.lastWorkingDay)} />
              </DetailCard>
              <DetailCard title="Exit Details" icon={FileText} tone="amber">
                <DetailRow label="Exit Type">
                  <ExitTypeBadge exitType={alumni.exitType} />
                </DetailRow>
                <DetailRow label="Exit Reason" value={alumni.exitReason} />
                <DetailRow label="Exit Case ID">
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); toast.info("Open exit case", { description: `Exit case for ${alumni.employeeName} would open here.` }) }}
                    className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    EXIT-{alumni.employeeCode.replace("EMP-", "2025-")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </DetailRow>
                <DetailRow label="Alumni Since" value={formatDate(alumni.alumniSince)} />
                <DetailRow label="Rehire Eligibility">
                  <RehireBadge eligible={alumni.eligibleRehire} />
                </DetailRow>
              </DetailCard>
            </div>

            {/* Contact info */}
            <DetailCard title="Contact Information" icon={Mail} tone="violet">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ContactItem icon={Mail} label="Email" value={alumni.email} href={`mailto:${alumni.email}`} />
                <ContactItem icon={Phone} label="Phone" value={alumni.phone || "—"} href={alumni.phone ? `tel:${alumni.phone}` : undefined} />
                <ContactItem
                  icon={Linkedin}
                  label="LinkedIn"
                  value={alumni.linkedin || "—"}
                  href={alumni.linkedin ? `https://${alumni.linkedin}` : undefined}
                />
                <ContactItem icon={Building2} label="Entity" value={alumni.entity} />
              </div>
            </DetailCard>

            {/* Documents */}
            <DetailCard title="Available Documents" icon={FileSignature} tone="teal">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DocumentTile
                  title="Relieving Letter"
                  description={relievingLetter?.name || "Standard Relieving Letter"}
                  date={formatDate(alumni.lastWorkingDay)}
                  icon={FileText}
                  onDownload={() => toast.success(`Relieving letter download started for ${alumni.employeeName}`)}
                />
                <DocumentTile
                  title="Experience Letter"
                  description={experienceLetter?.name || "Standard Experience Letter"}
                  date={formatDate(alumni.lastWorkingDay)}
                  icon={FileSignature}
                  onDownload={() => toast.success(`Experience letter download started for ${alumni.employeeName}`)}
                />
              </div>
            </DetailCard>

            {/* Timeline */}
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20">
                    <History className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Exit Process Timeline</h4>
                </div>
                <Badge variant="outline" className="text-[11px] border-border/60">
                  {timeline.length} events
                </Badge>
              </div>
              <ol className="relative pl-5">
                <span className="absolute left-[7px] top-1 bottom-1 w-px bg-border/60" aria-hidden />
                {timeline.map((ev, i) => {
                  const tone = TONE_STYLES[ev.tone]
                  const Icon = ev.icon
                  return (
                    <li key={i} className="relative pb-4 last:pb-0">
                      <span className={cn(
                        "absolute -left-[14px] top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full ring-2 ring-background",
                        tone.dot,
                      )}>
                        <span className="sr-only">{ev.label}</span>
                      </span>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Icon className={cn("h-3.5 w-3.5 shrink-0", tone.text)} />
                            <p className="text-sm font-medium text-foreground">{ev.label}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap pt-0.5">
                          {ev.date ? formatDate(ev.date) : "—"}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/30 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              onMutate(alumni.id, { eligibleRehire: !alumni.eligibleRehire })
              toast.success(`Rehire eligibility toggled for ${alumni.employeeName}`)
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            Toggle Rehire
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-700"
            onClick={() => {
              onMutate(alumni.id, {
                status: alumni.status === "Blacklisted" ? "Alumni" : "Blacklisted",
                eligibleRehire: alumni.status === "Blacklisted" ? alumni.eligibleRehire : false,
              })
              toast.success(
                alumni.status === "Blacklisted"
                  ? `${alumni.employeeName} removed from blacklist`
                  : `${alumni.employeeName} added to blacklist`,
              )
            }}
          >
            <Ban className="h-4 w-4" />
            {alumni.status === "Blacklisted" ? "Un-Blacklist" : "Blacklist"}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 ml-auto bg-rose-600 hover:bg-rose-700 text-white"
            onClick={() => {
              onOpenChange(false)
              toast.success(`Editing contact for ${alumni.employeeName}`)
            }}
          >
            <Pencil className="h-4 w-4" />
            Edit Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================
// Small subcomponents
// =============================================================

function DetailCard({ title, icon: Icon, tone, children }: {
  title: string; icon: React.ComponentType<{ className?: string }>
  tone: TimelineEvent["tone"]; children: React.ReactNode
}) {
  const t = TONE_STYLES[tone]
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("grid h-7 w-7 place-items-center rounded-md ring-1 bg-background/70", t.ring, t.text)}>
          <Icon className="h-4 w-4" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground font-medium text-right min-w-0 break-words">{children || value || "—"}</span>
    </div>
  )
}

function ContactItem({ icon: Icon, label, value, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; href?: string }) {
  const content = (
    <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background/60 p-2.5 hover:border-rose-500/30 hover:bg-rose-500/5 transition-colors">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground truncate">{value}</p>
      </div>
      {href && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />}
    </div>
  )
  if (href) {
    return <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="block">{content}</a>
  }
  return content
}

function DocumentTile({ title, description, date, icon: Icon, onDownload }: {
  title: string; description: string; date: string
  icon: React.ComponentType<{ className?: string }>; onDownload: () => void
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-3 hover:border-rose-500/30 hover:shadow-soft transition-all">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground truncate">{description}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Issued: {date}</p>
        </div>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs shrink-0" onClick={onDownload}>
          <Download className="h-3.5 w-3.5" /> Download
        </Button>
      </div>
    </div>
  )
}

export default AlumniSection
