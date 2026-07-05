"use client"

// =============================================================
// Documents → Document Requests  (Task ID: 4-c, File 1)
// -------------------------------------------------------------
// Employee-initiated document requests with approval workflow,
// SLA tracking, new request dialog, approve/reject dialog, and
// full request detail dialog.
// =============================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Inbox, Plus, Search, Filter, MoreHorizontal, Eye, Check, X,
  FileText, Send, Download, FileCheck2, Clock, AlertTriangle,
  CheckCircle2, XCircle, Paperclip, CalendarDays, Building2,
  User, ChevronDown, Sparkles, History, ArrowRight,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

import {
  DocumentRequest, DocumentStatus,
  ENTITIES, STATUS_COLORS, APPROVER_TYPES,
  formatDate, formatDateTime, initials, avatarColor,
} from "../shared"
import { DOCUMENT_REQUESTS } from "../data"

// =============================================================
// Constants
// =============================================================

const REQUESTABLE_DOC_TYPES = [
  "Salary Certificate", "Employment Certificate", "Address Proof Letter",
  "Experience Letter", "Visa Letter", "Bank Letter", "NOC", "Custom Letter",
]

const REQUEST_STATUSES: DocumentStatus[] = [
  "Draft", "Submitted", "Pending HR Approval", "Approved",
  "Rejected", "Generated", "Sent to Employee", "Closed",
]

const SLA_STATUSES = ["All", "On Track", "Overdue"] as const

// =============================================================
// MAIN SECTION
// =============================================================

export function DocumentRequestsSection() {
  const [requests, setRequests] = useState<DocumentRequest[]>(DOCUMENT_REQUESTS)

  // Filters
  const [search, setSearch] = useState("")
  const [filterEntity, setFilterEntity] = useState("All")
  const [filterType, setFilterType] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")
  const [filterPendingWith, setFilterPendingWith] = useState("All")
  const [filterSLA, setFilterSLA] = useState<(typeof SLA_STATUSES)[number]>("All")
  const [filterFrom, setFilterFrom] = useState("")
  const [filterTo, setFilterTo] = useState("")

  // Dialogs
  const [newOpen, setNewOpen] = useState(false)
  const [viewTarget, setViewTarget] = useState<DocumentRequest | null>(null)
  const [approveTarget, setApproveTarget] = useState<DocumentRequest | null>(null)
  const [rejectTarget, setRejectTarget] = useState<DocumentRequest | null>(null)

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (search) {
        const q = search.toLowerCase()
        if (!r.requestId.toLowerCase().includes(q) &&
            !r.employeeName.toLowerCase().includes(q) &&
            !r.employeeCode.toLowerCase().includes(q) &&
            !r.documentType.toLowerCase().includes(q) &&
            !r.reason.toLowerCase().includes(q)) return false
      }
      if (filterEntity !== "All" && r.entityName !== filterEntity) return false
      if (filterType !== "All" && r.documentType !== filterType) return false
      if (filterStatus !== "All" && r.status !== filterStatus) return false
      if (filterPendingWith !== "All") {
        if (filterPendingWith === "HR" && !r.pendingWith.toLowerCase().includes("hr")) return false
        if (filterPendingWith === "Auto" && !r.pendingWith.toLowerCase().includes("auto") && !r.pendingWith.toLowerCase().includes("system")) return false
        if (filterPendingWith === "Employee" && !r.pendingWith.toLowerCase().includes("employee") && !r.pendingWith.toLowerCase().includes("draft")) return false
        if (filterPendingWith === "Closed" && r.pendingWith.toLowerCase().indexOf("closed") === -1) return false
      }
      if (filterSLA === "Overdue" && r.slaRemaining >= 0) return false
      if (filterSLA === "On Track" && r.slaRemaining < 0) return false
      if (filterFrom) {
        if (new Date(r.requestedDate) < new Date(filterFrom)) return false
      }
      if (filterTo) {
        if (new Date(r.requestedDate) > new Date(filterTo)) return false
      }
      return true
    })
  }, [requests, search, filterEntity, filterType, filterStatus, filterPendingWith, filterSLA, filterFrom, filterTo])

  // Stats
  const stats = useMemo(() => {
    const total = requests.length
    const pendingHR = requests.filter(r => r.status === "Pending HR Approval").length
    const approved = requests.filter(r => r.status === "Approved" || r.status === "Generated").length
    const rejected = requests.filter(r => r.status === "Rejected").length
    const generated = requests.filter(r => r.status === "Generated" || r.status === "Sent to Employee").length
    const overdue = requests.filter(r => r.slaRemaining < 0).length
    return { total, pendingHR, approved, rejected, generated, overdue }
  }, [requests])

  function handleAction(action: string, r: DocumentRequest) {
    switch (action) {
      case "view":
        setViewTarget(r); break
      case "approve":
        setApproveTarget(r); break
      case "reject":
        setRejectTarget(r); break
      case "generate":
        toast.success(`Document generated for ${r.employeeName} — ${r.documentType}`)
        setRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: "Generated" as DocumentStatus, pendingWith: "System (Generated)" } : x))
        break
      case "preview":
        toast.info(`Previewing ${r.documentType} for ${r.employeeName}`)
        break
      case "send":
        toast.success(`Sent ${r.documentType} to ${r.employeeName}`)
        setRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: "Sent to Employee" as DocumentStatus } : x))
        break
      case "download":
        toast.success(`Downloading ${r.documentType} for ${r.employeeName}`)
        break
      case "close":
        setRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: "Closed" as DocumentStatus, pendingWith: "Closed" } : x))
        toast.info(`Request ${r.requestId} closed`)
        break
    }
  }

  function handleApprove(comments: string) {
    if (!approveTarget) return
    setRequests(prev => prev.map(x => x.id === approveTarget.id ? { ...x, status: "Approved" as DocumentStatus, pendingWith: "Approved — Ready to Generate" } : x))
    toast.success(`Request approved for ${approveTarget.employeeName}${comments ? ` — ${comments}` : ""}`)
    setApproveTarget(null)
  }
  function handleReject(comments: string) {
    if (!rejectTarget) return
    setRequests(prev => prev.map(x => x.id === rejectTarget.id ? { ...x, status: "Rejected" as DocumentStatus, pendingWith: "Rejected" } : x))
    toast.error(`Request rejected for ${rejectTarget.employeeName}${comments ? ` — ${comments}` : ""}`)
    setRejectTarget(null)
  }
  function handleNew(req: Partial<DocumentRequest>) {
    const newReq: DocumentRequest = {
      id: `dr-${Date.now()}`,
      requestId: `REQ-DOC-2024-${String(requests.length + 1).padStart(3, "0")}`,
      employeeCode: req.employeeCode || "EMP-NEW",
      employeeName: req.employeeName || "New Employee",
      documentType: req.documentType || REQUESTABLE_DOC_TYPES[0],
      entityId: req.entityId || "ent-1",
      entityName: req.entityName || ENTITIES[0].name,
      reason: req.reason || "—",
      addressedTo: req.addressedTo,
      purpose: req.purpose,
      requestedDate: new Date().toISOString(),
      pendingWith: "Anita Desai (HR Manager)",
      status: "Pending HR Approval",
      attachment: req.attachment || false,
      slaDays: 3,
      slaRemaining: 3,
    }
    setRequests(prev => [newReq, ...prev])
    toast.success(`New request submitted — ${newReq.requestId}`)
    setNewOpen(false)
  }

  function clearFilters() {
    setSearch(""); setFilterEntity("All"); setFilterType("All")
    setFilterStatus("All"); setFilterPendingWith("All"); setFilterSLA("All")
    setFilterFrom(""); setFilterTo("")
  }

  const hasFilters = search || filterEntity !== "All" || filterType !== "All" ||
    filterStatus !== "All" || filterPendingWith !== "All" || filterSLA !== "All" ||
    filterFrom || filterTo

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-soft">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Document Requests</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Employee-initiated document requests with approval workflow & SLA tracking.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.success("Exporting requests to CSV...")}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> New Request
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatTile label="Total Requests" value={stats.total} icon={Inbox} accent="violet" />
        <StatTile label="Pending HR Approval" value={stats.pendingHR} icon={Clock} accent="amber" />
        <StatTile label="Approved" value={stats.approved} icon={CheckCircle2} accent="emerald" />
        <StatTile label="Rejected" value={stats.rejected} icon={XCircle} accent="rose" />
        <StatTile label="Generated" value={stats.generated} icon={FileCheck2} accent="cyan" />
        <StatTile label="Overdue (SLA)" value={stats.overdue} icon={AlertTriangle} accent="rose" />
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
                placeholder="Search by ID, employee, type or reason..."
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect label="Entity" value={filterEntity} onChange={setFilterEntity} options={["All", ...ENTITIES.map(e => e.name)]} />
              <FilterSelect label="Doc Type" value={filterType} onChange={setFilterType} options={["All", ...REQUESTABLE_DOC_TYPES]} />
              <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={["All", ...REQUEST_STATUSES]} />
              <FilterSelect label="Pending With" value={filterPendingWith} onChange={setFilterPendingWith} options={["All", "HR", "Auto", "Employee", "Closed"]} />
              <FilterSelect label="SLA" value={filterSLA} onChange={(v) => setFilterSLA(v as typeof SLA_STATUSES[number])} options={[...SLA_STATUSES]} />
              <div className="flex items-center gap-1">
                <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="h-9 w-[140px] text-xs" />
                <span className="text-muted-foreground text-xs">→</span>
                <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="h-9 w-[140px] text-xs" />
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={clearFilters}>
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
                  <TH>Request ID</TH>
                  <TH>Employee</TH>
                  <TH>Document Type</TH>
                  <TH>Entity</TH>
                  <TH>Reason</TH>
                  <TH>Requested Date</TH>
                  <TH>Pending With</TH>
                  <TH>SLA Remaining</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="border-border/40 hover:bg-violet-50/30 dark:hover:bg-violet-500/5 transition-colors">
                    <TableCell className="text-xs font-medium text-foreground whitespace-nowrap">{r.requestId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5 min-w-[180px]">
                        <div className={cn("grid h-8 w-8 place-items-center rounded-lg text-white text-[11px] font-semibold shrink-0", avatarColor(r.employeeName))}>
                          {initials(r.employeeName)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{r.employeeName}</div>
                          <div className="text-[11px] text-muted-foreground">{r.employeeCode}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{r.documentType}</TableCell>
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{r.entityName}</TableCell>
                    <TableCell className="text-xs text-foreground/90 max-w-[200px] truncate" title={r.reason}>{r.reason}</TableCell>
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap">{formatDateTime(r.requestedDate)}</TableCell>
                    <TableCell className="text-xs text-foreground/90 whitespace-nowrap max-w-[180px] truncate" title={r.pendingWith}>{r.pendingWith}</TableCell>
                    <TableCell>
                      <SLABadge remaining={r.slaRemaining} slaDays={r.slaDays} />
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("font-medium border-0", STATUS_COLORS[r.status] || "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400")}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-violet-500/10">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleAction("view", r)}><Eye className="h-4 w-4 mr-2" /> View Request</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction("approve", r)}><Check className="h-4 w-4 mr-2" /> Approve</DropdownMenuItem>
                          <DropdownMenuItem className="text-rose-600 dark:text-rose-400" onClick={() => handleAction("reject", r)}><X className="h-4 w-4 mr-2" /> Reject</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleAction("generate", r)}><FileText className="h-4 w-4 mr-2" /> Generate Document</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction("preview", r)}><Eye className="h-4 w-4 mr-2" /> Preview</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction("send", r)}><Send className="h-4 w-4 mr-2" /> Send to Employee</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction("download", r)}><Download className="h-4 w-4 mr-2" /> Download</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleAction("close", r)}><X className="h-4 w-4 mr-2" /> Close</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-muted-foreground text-sm">
                      No document requests match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <NewRequestDialog open={newOpen} onClose={() => setNewOpen(false)} onSubmit={handleNew} />
      <ViewRequestDialog request={viewTarget} onClose={() => setViewTarget(null)} onAction={handleAction} />
      <ApproveRejectDialog
        open={!!approveTarget}
        mode="approve"
        request={approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApprove}
      />
      <ApproveRejectDialog
        open={!!rejectTarget}
        mode="reject"
        request={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />
    </div>
  )
}

// =============================================================
// Sub-components
// =============================================================

function StatTile({
  label, value, icon: Icon, accent,
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  accent: "violet" | "amber" | "emerald" | "rose" | "cyan"
}) {
  const accents: Record<string, string> = {
    violet: "from-violet-500/10 to-violet-500/5 text-violet-600 dark:text-violet-400",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    rose: "from-rose-500/10 to-rose-500/5 text-rose-600 dark:text-rose-400",
    cyan: "from-cyan-500/10 to-cyan-500/5 text-cyan-600 dark:text-cyan-400",
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
        <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
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

function SLABadge({ remaining, slaDays }: { remaining: number; slaDays: number }) {
  let cls = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
  let label = `${remaining}d left`
  if (remaining < 0) {
    cls = "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
    label = `${Math.abs(remaining)}d overdue`
  } else if (remaining <= 2) {
    cls = "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
    label = `${remaining}d left`
  }
  if (remaining === 0 && slaDays === 0) label = "—"
  return (
    <Badge className={cn("font-medium border-0", cls)} title={`SLA: ${slaDays} days`}>
      {label}
    </Badge>
  )
}

// =============================================================
// New Request Dialog
// =============================================================

function NewRequestDialog({
  open, onClose, onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (req: Partial<DocumentRequest>) => void
}) {
  const [docType, setDocType] = useState(REQUESTABLE_DOC_TYPES[0])
  const [reason, setReason] = useState("")
  const [addressedTo, setAddressedTo] = useState("")
  const [purpose, setPurpose] = useState("")
  const [details, setDetails] = useState("")
  const [attachment, setAttachment] = useState(false)
  const [employeeName, setEmployeeName] = useState("Rahul Verma")
  const [employeeCode, setEmployeeCode] = useState("EMP-005")
  const [entityName, setEntityName] = useState(ENTITIES[0].name)

  function reset() {
    setDocType(REQUESTABLE_DOC_TYPES[0]); setReason(""); setAddressedTo("")
    setPurpose(""); setDetails(""); setAttachment(false)
    setEmployeeName("Rahul Verma"); setEmployeeCode("EMP-005")
    setEntityName(ENTITIES[0].name)
  }

  function handleSubmit() {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the request")
      return
    }
    const ent = ENTITIES.find(e => e.name === entityName) || ENTITIES[0]
    onSubmit({
      documentType: docType, reason, addressedTo, purpose: purpose || details,
      attachment, employeeName, employeeCode,
      entityId: ent.id, entityName: ent.name,
    })
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (onClose(), reset())}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-violet-500/8 via-transparent to-transparent shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-violet-600" /> New Document Request
          </DialogTitle>
          <DialogDescription className="text-xs">
            Employee-initiated document request — auto-routed to HR for approval.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FieldInput label="Employee Name" value={employeeName} onChange={setEmployeeName} />
              <FieldInput label="Employee Code" value={employeeCode} onChange={setEmployeeCode} />
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Entity</Label>
                <Select value={entityName} onValueChange={setEntityName}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTITIES.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Document Type *</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REQUESTABLE_DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <FieldInput label="Addressed To (e.g. Bank Manager)" value={addressedTo} onChange={setAddressedTo} placeholder="Bank / Embassy / Landlord..." />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Purpose</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select purpose..." /></SelectTrigger>
                <SelectContent>
                  {["Bank Loan", "Visa", "Government", "Reference", "Travel", "Bank", "Other"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Reason *</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Detailed reason for the document request..." rows={3} className="text-sm" />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Additional Details</Label>
              <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Any additional information required by HR..." rows={2} className="text-sm" />
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 hover:bg-background p-3 transition-colors cursor-pointer">
              <input type="checkbox" checked={attachment} onChange={(e) => setAttachment(e.target.checked)} className="rounded" />
              <div>
                <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" /> Attach supporting document
                </div>
                <div className="text-xs text-muted-foreground">Mock file upload (bank letter request, visa application, etc.)</div>
              </div>
            </label>
          </div>
        </ScrollArea>
        <DialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/30 shrink-0">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { onClose(); reset() }}>
            <X className="h-4 w-4" /> Cancel
          </Button>
          <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white" onClick={handleSubmit}>
            <Send className="h-4 w-4" /> Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldInput({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9" />
    </div>
  )
}

// =============================================================
// View Request Dialog
// =============================================================

function ViewRequestDialog({
  request, onClose, onAction,
}: {
  request: DocumentRequest | null
  onClose: () => void
  onAction: (action: string, r: DocumentRequest) => void
}) {
  if (!request) return null
  const timeline = buildTimeline(request)
  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-violet-500/8 via-transparent to-transparent shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-violet-600" /> {request.requestId}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {request.documentType} · requested by {request.employeeName} ({request.employeeCode})
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Request + Employee info */}
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Request Information</h4>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5 text-xs">
                  <InfoRow label="Request ID" value={request.requestId} />
                  <InfoRow label="Document Type" value={request.documentType} />
                  <InfoRow label="Entity" value={request.entityName} />
                  <InfoRow label="Addressed To" value={request.addressedTo || "—"} />
                  <InfoRow label="Purpose" value={request.purpose || "—"} />
                  <InfoRow label="Reason" value={request.reason} />
                  <InfoRow label="Requested On" value={formatDateTime(request.requestedDate)} />
                  <InfoRow label="Pending With" value={request.pendingWith} />
                  <InfoRow label="Attachment" value={request.attachment ? "Yes" : "No"} />
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Employee Information</h4>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-center gap-3">
                  <div className={cn("grid h-10 w-10 place-items-center rounded-lg text-white text-xs font-semibold", avatarColor(request.employeeName))}>
                    {initials(request.employeeName)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{request.employeeName}</div>
                    <div className="text-xs text-muted-foreground">{request.employeeCode} · {request.entityName}</div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">SLA Tracking</h4>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">SLA Days</span>
                    <span className="font-medium text-foreground">{request.slaDays} days</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">SLA Remaining</span>
                    <SLABadge remaining={request.slaRemaining} slaDays={request.slaDays} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={cn("font-medium border-0", STATUS_COLORS[request.status])}>{request.status}</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Document preview + Timeline */}
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Document Preview</h4>
                <div className="rounded-lg border-2 border-dashed border-border/60 bg-muted/10 p-4 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">{request.documentType} preview will appear here</p>
                  <Button variant="ghost" size="sm" className="mt-2 gap-1.5 text-violet-600" onClick={() => onAction("preview", request)}>
                    <Eye className="h-3.5 w-3.5" /> Preview Document
                  </Button>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" /> Approval Timeline
                </h4>
                <ol className="relative border-l border-border/60 ml-2 space-y-3">
                  {timeline.map((t, idx) => (
                    <li key={idx} className="ml-4">
                      <div className={cn(
                        "absolute -left-2 grid h-4 w-4 place-items-center rounded-full",
                        t.done ? "bg-violet-600" : "bg-slate-300 dark:bg-slate-600",
                      )}>
                        {t.done && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <div className="text-xs font-medium text-foreground">{t.label}</div>
                      <div className="text-[11px] text-muted-foreground">{t.actor} · {t.time}</div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/30 shrink-0 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onClose}>
            <X className="h-4 w-4" /> Close
          </Button>
          <div className="flex-1" />
          {request.status === "Pending HR Approval" && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => onAction("reject", request)}>
                <X className="h-4 w-4" /> Reject
              </Button>
              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onAction("approve", request)}>
                <Check className="h-4 w-4" /> Approve
              </Button>
            </>
          )}
          {(request.status === "Approved" || request.status === "Pending HR Approval") && (
            <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => onAction("generate", request)}>
              <FileText className="h-4 w-4" /> Generate
            </Button>
          )}
          {request.status === "Generated" && (
            <Button size="sm" className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white" onClick={() => onAction("send", request)}>
              <Send className="h-4 w-4" /> Send to Employee
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  )
}

function buildTimeline(r: DocumentRequest) {
  const steps: { label: string; actor: string; time: string; done: boolean }[] = [
    { label: "Draft Saved", actor: r.employeeName, time: formatDateTime(new Date(new Date(r.requestedDate).getTime() - 3600000).toISOString()), done: true },
    { label: "Request Submitted", actor: r.employeeName, time: formatDateTime(r.requestedDate), done: r.status !== "Draft" },
    { label: "HR Review", actor: r.pendingWith, time: r.status !== "Draft" && r.status !== "Submitted" ? formatDateTime(new Date(new Date(r.requestedDate).getTime() + 86400000).toISOString()) : "—", done: ["Pending HR Approval", "Approved", "Rejected", "Generated", "Sent to Employee", "Closed"].includes(r.status) },
    { label: r.status === "Rejected" ? "Rejected" : "Approved", actor: r.status === "Rejected" ? "Anita Desai" : r.pendingWith, time: ["Approved", "Rejected", "Generated", "Sent to Employee", "Closed"].includes(r.status) ? formatDateTime(new Date(new Date(r.requestedDate).getTime() + 2 * 86400000).toISOString()) : "—", done: ["Approved", "Rejected", "Generated", "Sent to Employee", "Closed"].includes(r.status) },
    { label: "Document Generated", actor: "System", time: ["Generated", "Sent to Employee", "Closed"].includes(r.status) ? formatDateTime(new Date(new Date(r.requestedDate).getTime() + 3 * 86400000).toISOString()) : "—", done: ["Generated", "Sent to Employee", "Closed"].includes(r.status) },
    { label: "Sent to Employee", actor: "Anita Desai", time: ["Sent to Employee", "Closed"].includes(r.status) ? formatDateTime(new Date(new Date(r.requestedDate).getTime() + 4 * 86400000).toISOString()) : "—", done: ["Sent to Employee", "Closed"].includes(r.status) },
    { label: "Closed", actor: "System", time: r.status === "Closed" ? formatDateTime(new Date(new Date(r.requestedDate).getTime() + 5 * 86400000).toISOString()) : "—", done: r.status === "Closed" },
  ]
  return steps
}

// =============================================================
// Approve / Reject Dialog
// =============================================================

function ApproveRejectDialog({
  open, mode, request, onClose, onConfirm,
}: {
  open: boolean
  mode: "approve" | "reject"
  request: DocumentRequest | null
  onClose: () => void
  onConfirm: (comments: string) => void
}) {
  const [comments, setComments] = useState("")
  React.useEffect(() => {
    if (!open) setComments("")
  }, [open])
  if (!request) return null
  const isApprove = mode === "approve"
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-border/60 shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            {isApprove ? (
              <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Approve Request</>
            ) : (
              <><XCircle className="h-4 w-4 text-rose-600" /> Reject Request</>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {request.requestId} — {request.documentType} for {request.employeeName}
          </DialogDescription>
        </DialogHeader>
        <div className="p-5 flex flex-col gap-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs space-y-1">
            <InfoRow label="Employee" value={`${request.employeeName} (${request.employeeCode})`} />
            <InfoRow label="Document" value={request.documentType} />
            <InfoRow label="Reason" value={request.reason} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">{isApprove ? "Approval Comments" : "Rejection Reason *"} </Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={isApprove ? "Optional approval comments..." : "Please provide a reason for rejection..."}
              rows={3}
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/30 shrink-0">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onClose}>
            <X className="h-4 w-4" /> Cancel
          </Button>
          {isApprove ? (
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onConfirm(comments)}>
              <Check className="h-4 w-4" /> Confirm Approval
            </Button>
          ) : (
            <Button size="sm" className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white" onClick={() => {
              if (!comments.trim()) { toast.error("Please provide a rejection reason"); return }
              onConfirm(comments)
            }}>
              <X className="h-4 w-4" /> Confirm Rejection
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DocumentRequestsSection
