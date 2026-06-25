"use client"

// ============================================================================
//  FnFSection — Offboarding spec #13 (Full & Final Settlement)
//  ----------------------------------------------------------------------------
//  Settlement records table, large detail dialog with all FnF input sections,
//  earnings & deductions side-by-side on desktop / stacked on mobile,
//  highlighted net payable, full action toolbar (Fetch, Calculate, Approve,
//  Pay, Export, etc.) and rose theme accents.
// ============================================================================

import * as React from "react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Wallet, Clock, ShieldCheck, BadgeCheck, Search, MoreHorizontal, Filter,
  Plus, PlusCircle, MinusCircle, Download, FileText, Send, Check, X,
  IndianRupee, RefreshCw, Calculator, Plane, Package, Landmark, Inbox,
  TrendingUp, TrendingDown, Scale, Eye, ArrowRight, Layers, CheckCircle2,
  AlertCircle, PauseCircle, Receipt, FileSpreadsheet,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"

import { EXIT_CASES, FNF_RECORDS } from "@/components/hrms/offboarding/data"
import type { FnFRecord, FnFEntry, FnFStatus, ExitCase } from "@/components/hrms/offboarding/shared"
import {
  initials, formatDate, formatCurrency, formatCurrencyShort,
  STATUS_COLORS, AVATAR_COLORS,
} from "@/components/hrms/offboarding/shared"

// ---------- Constants ----------
const FNF_STATUSES: FnFStatus[] = [
  "Not Started", "Draft", "Inputs Pending", "Calculated", "Under Review",
  "Approved", "Paid", "Closed", "On Hold",
]

const FNF_EARNING_CATEGORIES = [
  "Salary till LWD", "Bonus", "Incentive", "Arrears", "Leave Encashment",
  "Gratuity", "Reimbursement Payable", "Other Earnings",
]

const FNF_DEDUCTION_CATEGORIES = [
  "LWP / LOP", "Notice Recovery", "Loan Recovery", "Advance Recovery",
  "Asset Damage Recovery", "Tax / TDS", "PF / ESI / Statutory", "Other Deductions",
]

const FNF_INPUT_SECTIONS = [
  { name: "Employee & Exit Details", icon: "User" },
  { name: "Attendance & Paid Days", icon: "Calendar" },
  { name: "Leave Encashment", icon: "Plane" },
  { name: "Notice Recovery / Buyout", icon: "AlertCircle" },
  { name: "Salary Hold", icon: "PauseCircle" },
  { name: "Pending Salary", icon: "IndianRupee" },
  { name: "Bonus / Incentive", icon: "BadgeCheck" },
  { name: "Arrears", icon: "TrendingUp" },
  { name: "Expense Reimbursements", icon: "Receipt" },
  { name: "Loans / Advances", icon: "Landmark" },
  { name: "Asset Recovery", icon: "Package" },
  { name: "Tax / Statutory Deductions", icon: "FileText" },
  { name: "Gratuity", icon: "ShieldCheck" },
  { name: "Other Earnings", icon: "PlusCircle" },
  { name: "Other Deductions", icon: "MinusCircle" },
  { name: "Net Payable / Recoverable", icon: "Scale" },
] as const

// ============================================================================
//  Component
// ============================================================================
export function FnFSection() {
  const [records, setRecords] = useState<FnFRecord[]>(FNF_RECORDS)
  const [exitCaseFilter, setExitCaseFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  const [selectedRecord, setSelectedRecord] = useState<FnFRecord | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // manual entry form state
  const [manualEntryType, setManualEntryType] = useState<"earning" | "deduction" | null>(null)
  const [manualCategory, setManualCategory] = useState("")
  const [manualDescription, setManualDescription] = useState("")
  const [manualAmount, setManualAmount] = useState("")

  // ---------- Helpers ----------
  const exitCaseById = useMemo(() => {
    const map = new Map<string, ExitCase>()
    EXIT_CASES.forEach((ec) => map.set(ec.id, ec))
    return map
  }, [])

  const getExitCase = (id: string) => exitCaseById.get(id)

  // ---------- Derived: filter + search ----------
  const filtered = useMemo(() => {
    return records.filter((r) => {
      const ec = getExitCase(r.exitCaseId)
      if (exitCaseFilter !== "all" && r.exitCaseId !== exitCaseFilter) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const nameHit = ec?.employeeName.toLowerCase().includes(q) ?? false
        const codeHit = ec?.exitCaseId.toLowerCase().includes(q) ?? false
        const empCodeHit = ec?.employeeCode.toLowerCase().includes(q) ?? false
        if (!(nameHit || codeHit || empCodeHit)) return false
      }
      return true
    })
  }, [records, exitCaseFilter, statusFilter, search, getExitCase])

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const total = records.length
    const pendingCalc = records.filter((r) =>
      ["Not Started", "Draft", "Inputs Pending", "Calculated"].includes(r.status)
    ).length
    const underReview = records.filter((r) => r.status === "Under Review").length
    const approvedPaid = records.filter((r) =>
      ["Approved", "Paid", "Closed"].includes(r.status)
    ).length
    return { total, pendingCalc, underReview, approvedPaid }
  }, [records])

  // ---------- Actions ----------
  const recomputeRecord = (rec: FnFRecord): FnFRecord => {
    const totalEarnings = rec.entries.filter((e) => e.type === "earning").reduce((s, e) => s + e.amount, 0)
    const totalDeductions = rec.entries.filter((e) => e.type === "deduction").reduce((s, e) => s + e.amount, 0)
    return {
      ...rec,
      totalEarnings,
      totalDeductions,
      netPayable: totalEarnings - totalDeductions,
    }
  }

  const updateRecord = (exitCaseId: string, patch: Partial<FnFRecord>) => {
    setRecords((prev) =>
      prev.map((r) => (r.exitCaseId === exitCaseId ? recomputeRecord({ ...r, ...patch }) : r))
    )
  }

  const openDetail = (rec: FnFRecord) => {
    setSelectedRecord(rec)
    setDialogOpen(true)
  }

  const addManualEntry = () => {
    if (!selectedRecord) return
    if (!manualCategory || !manualDescription || !manualAmount) {
      toast.error("Please fill in category, description and amount.")
      return
    }
    const amt = Number(manualAmount)
    if (Number.isNaN(amt) || amt <= 0) {
      toast.error("Amount must be a positive number.")
      return
    }
    const newEntry: FnFEntry = {
      id: `${selectedRecord.exitCaseId}-${manualEntryType}-${Date.now()}`,
      exitCaseId: selectedRecord.exitCaseId,
      type: manualEntryType!,
      category: manualCategory,
      description: manualDescription,
      amount: amt,
      source: "manual",
      status: "draft",
    }
    const updated = recomputeRecord({
      ...selectedRecord,
      entries: [...selectedRecord.entries, newEntry],
    })
    setSelectedRecord(updated)
    updateRecord(selectedRecord.exitCaseId, { entries: updated.entries })
    toast.success(
      `${manualEntryType === "earning" ? "Earning" : "Deduction"} added — ${manualCategory}`,
      { description: `${formatCurrency(amt)} · manual` }
    )
    setManualEntryType(null)
    setManualCategory("")
    setManualDescription("")
    setManualAmount("")
  }

  const handleAction = (action: string, rec: FnFRecord) => {
    const ec = getExitCase(rec.exitCaseId)
    const ecLabel = ec ? `${ec.employeeName} (${ec.exitCaseId})` : rec.exitCaseId
    const patch: Partial<FnFRecord> = {}
    let msg = ""
    let desc = ""

    switch (action) {
      case "fetch-payroll":
        msg = "Payroll inputs fetched"
        desc = "Salary till LWD, arrears & pending salary synced"
        break
      case "fetch-leave":
        msg = "Leave encashment fetched"
        desc = "18 earned leaves · encashed at current gross"
        break
      case "fetch-asset":
        msg = "Asset recovery fetched"
        desc = "Damaged / lost items pushed to deductions"
        break
      case "fetch-loan":
        msg = "Loan balance fetched"
        desc = "Outstanding salary advance / loans synced"
        break
      case "calculate":
        patch.status = "Calculated"
        patch.calculatedAt = new Date().toISOString()
        msg = "FnF calculated"
        desc = "Net payable recomputed from current entries"
        break
      case "send-approval":
        patch.status = "Under Review"
        msg = "Sent for approval"
        desc = "Routed to Finance approver"
        break
      case "approve":
        patch.status = "Approved"
        patch.approvedBy = "Anita Desai"
        patch.approvedAt = new Date().toISOString()
        msg = "FnF approved"
        desc = "Approved by Anita Desai"
        break
      case "reject":
        patch.status = "Inputs Pending"
        msg = "FnF rejected"
        desc = "Returned to inputs pending for correction"
        break
      case "mark-paid":
        patch.status = "Paid"
        patch.paidAt = new Date().toISOString()
        msg = "Marked as paid"
        desc = "Settlement disbursed to registered bank account"
        break
      case "letter":
        msg = "Settlement letter generated"
        desc = "FnF settlement letter (PDF) ready for download"
        break
      case "export":
        msg = "FnF exported"
        desc = "Excel workbook with all earnings & deductions"
        break
      default:
        break
    }

    if (Object.keys(patch).length > 0) {
      updateRecord(rec.exitCaseId, patch)
      if (selectedRecord && selectedRecord.exitCaseId === rec.exitCaseId) {
        setSelectedRecord((prev) => (prev ? { ...prev, ...patch } : prev))
      }
    }
    toast.success(msg, { description: `${ecLabel} · ${desc}` })
  }

  // ---------- Render helpers ----------
  const renderStatusBadge = (status: string) => {
    const color = STATUS_COLORS[status] || "#94a3b8"
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {status}
      </span>
    )
  }

  const renderSourceBadge = (src: "auto" | "manual") => (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] py-0 px-1.5 font-medium",
        src === "auto"
          ? "border-sky-300 text-sky-700 dark:text-sky-300"
          : "border-rose-300 text-rose-700 dark:text-rose-300"
      )}
    >
      {src === "auto" ? "Auto" : "Manual"}
    </Badge>
  )

  const netPayColor = (net: number) =>
    net >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"

  // ============================================================================
  return (
    <div className="flex flex-col gap-5">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Total FnF Records"
          value={stats.total}
          accent="#9f1239"
          tint="#fff1f2"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Pending Calculation"
          value={stats.pendingCalc}
          accent="#f59e0b"
          tint="#fffbeb"
        />
        <StatCard
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Under Review"
          value={stats.underReview}
          accent="#0ea5e9"
          tint="#f0f9ff"
        />
        <StatCard
          icon={<BadgeCheck className="h-4 w-4" />}
          label="Approved / Paid"
          value={stats.approvedPaid}
          accent="#10b981"
          tint="#ecfdf5"
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
                placeholder="Search by employee name, exit case ID, employee code…"
                className="pl-9 h-9 bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:flex lg:items-center">
              <Select value={exitCaseFilter} onValueChange={setExitCaseFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[200px]">
                  <SelectValue placeholder="Exit Case" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exit Cases</SelectItem>
                  {EXIT_CASES.map((ec) => (
                    <SelectItem key={ec.id} value={ec.id}>
                      {ec.employeeName} · {ec.exitCaseId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full lg:w-[170px]">
                  <SelectValue placeholder="FnF Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {FNF_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(exitCaseFilter !== "all" || statusFilter !== "all" || search) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span>Showing {filtered.length} of {records.length} records</span>
              <Button
                variant="ghost" size="sm" className="h-6 px-2 text-xs"
                onClick={() => { setExitCaseFilter("all"); setStatusFilter("all"); setSearch("") }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FnF records table */}
      <Card className="shadow-sm border-border/60 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-rose-600" />
            Full & Final Settlement
            <Badge variant="secondary" className="ml-1 font-normal">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[680px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
                <TableRow>
                  <TableHead className="min-w-[220px]">Employee</TableHead>
                  <TableHead>FnF Status</TableHead>
                  <TableHead className="text-right">Total Earnings</TableHead>
                  <TableHead className="text-right">Total Deductions</TableHead>
                  <TableHead className="text-right">Net Payable</TableHead>
                  <TableHead>Calculated At</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Paid At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                      <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No FnF records match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((rec, idx) => {
                    const ec = getExitCase(rec.exitCaseId)
                    return (
                      <motion.tr
                        key={rec.exitCaseId}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.18 }}
                        className="hover:bg-rose-50/40 dark:hover:bg-rose-950/10 transition-colors border-b border-border/60"
                      >
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => openDetail(rec)}
                            className="flex items-center gap-2.5 text-left group"
                          >
                            {ec && (
                              <div
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                                style={{ backgroundColor: ec.avatarColor }}
                              >
                                {initials(ec.employeeName)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                {ec?.employeeName ?? "Unknown Employee"}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {ec?.exitCaseId ?? rec.exitCaseId}
                                {ec ? ` · ${ec.employeeCode}` : ""}
                              </div>
                              {ec && (
                                <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                  {ec.department} · {ec.designation}
                                </div>
                              )}
                            </div>
                          </button>
                        </TableCell>
                        <TableCell>{renderStatusBadge(rec.status)}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(rec.totalEarnings)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                            {formatCurrency(rec.totalDeductions)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("inline-flex flex-col items-end leading-tight")}>
                            <span className={cn("text-sm font-bold", netPayColor(rec.netPayable))}>
                              {formatCurrency(rec.netPayable)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {rec.netPayable >= 0 ? "payable" : "recoverable"}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(rec.calculatedAt)}</TableCell>
                        <TableCell className="text-xs">{rec.approvedBy ?? "—"}</TableCell>
                        <TableCell className="text-xs">{formatDate(rec.paidAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="sm"
                              className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              onClick={() => openDetail(rec)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-60">
                                <DropdownMenuLabel className="text-xs">FnF Actions</DropdownMenuLabel>
                                <DropdownMenuGroup>
                                  <DropdownMenuItem onClick={() => handleAction("fetch-payroll", rec)}>
                                    <RefreshCw className="h-3.5 w-3.5 mr-2" /> Fetch Payroll Inputs
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAction("fetch-leave", rec)}>
                                    <Plane className="h-3.5 w-3.5 mr-2" /> Fetch Leave Encashment
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAction("fetch-asset", rec)}>
                                    <Package className="h-3.5 w-3.5 mr-2" /> Fetch Asset Recovery
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAction("fetch-loan", rec)}>
                                    <Landmark className="h-3.5 w-3.5 mr-2" /> Fetch Loan Balance
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                  <DropdownMenuItem onClick={() => handleAction("calculate", rec)}>
                                    <Calculator className="h-3.5 w-3.5 mr-2" /> Calculate FnF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAction("send-approval", rec)}>
                                    <Send className="h-3.5 w-3.5 mr-2" /> Send for Approval
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAction("approve", rec)}>
                                    <Check className="h-3.5 w-3.5 mr-2" /> Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAction("reject", rec)}>
                                    <X className="h-3.5 w-3.5 mr-2" /> Reject
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAction("mark-paid", rec)}>
                                    <BadgeCheck className="h-3.5 w-3.5 mr-2" /> Mark Paid
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                  <DropdownMenuItem onClick={() => handleAction("letter", rec)}>
                                    <FileText className="h-3.5 w-3.5 mr-2" /> Generate Settlement Letter
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAction("export", rec)}>
                                    <Download className="h-3.5 w-3.5 mr-2" /> Export
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </motion.tr>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* FnF detail dialog */}
      <FnFDetailDialog
        record={selectedRecord}
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) setSelectedRecord(null)
        }}
        exitCase={selectedRecord ? getExitCase(selectedRecord.exitCaseId) : undefined}
        onAction={handleAction}
        onAddManual={(type) => setManualEntryType(type)}
        renderStatusBadge={renderStatusBadge}
        renderSourceBadge={renderSourceBadge}
      />

      {/* Manual entry dialog */}
      <Dialog open={manualEntryType !== null} onOpenChange={(o) => !o && setManualEntryType(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {manualEntryType === "earning" ? (
                <><PlusCircle className="h-4 w-4 text-emerald-600" /> Add Manual Earning</>
              ) : (
                <><MinusCircle className="h-4 w-4 text-rose-600" /> Add Manual Deduction</>
              )}
            </DialogTitle>
            <DialogDescription>
              Manual entries are tagged as <Badge variant="outline" className="text-[10px] py-0 px-1.5 mx-1">Manual</Badge>
              and start in <span className="font-medium">Draft</span> status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label htmlFor="me-cat" className="text-xs">Category</Label>
              <Select value={manualCategory} onValueChange={setManualCategory}>
                <SelectTrigger id="me-cat" className="h-9">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(manualEntryType === "earning" ? FNF_EARNING_CATEGORIES : FNF_DEDUCTION_CATEGORIES).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="me-desc" className="text-xs">Description</Label>
              <Textarea
                id="me-desc"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="e.g. Performance bonus for Q3"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="me-amt" className="text-xs">Amount (₹)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="me-amt"
                  type="number"
                  min="0"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder="0"
                  className="pl-8 h-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualEntryType(null)}>Cancel</Button>
            <Button
              onClick={addManualEntry}
              className={cn(
                manualEntryType === "earning"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              )}
            >
              {manualEntryType === "earning" ? <PlusCircle className="h-4 w-4 mr-1.5" /> : <MinusCircle className="h-4 w-4 mr-1.5" />}
              Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
//  FnF detail dialog — all FnF input sections
// ============================================================================
interface FnFDetailDialogProps {
  record: FnFRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  exitCase?: ExitCase
  onAction: (action: string, rec: FnFRecord) => void
  onAddManual: (type: "earning" | "deduction") => void
  renderStatusBadge: (status: string) => React.ReactNode
  renderSourceBadge: (src: "auto" | "manual") => React.ReactNode
}

function FnFDetailDialog({
  record, open, onOpenChange, exitCase, onAction, onAddManual, renderStatusBadge, renderSourceBadge,
}: FnFDetailDialogProps) {
  if (!record) return null

  const earnings = record.entries.filter((e) => e.type === "earning")
  const deductions = record.entries.filter((e) => e.type === "deduction")
  const isApproved = ["Approved", "Paid", "Closed"].includes(record.status)
  const isPaid = ["Paid", "Closed"].includes(record.status)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/60 shrink-0 bg-gradient-to-r from-rose-50/60 to-transparent dark:from-rose-950/20">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="flex items-center gap-3 min-w-0">
              {exitCase && (
                <div
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: exitCase.avatarColor }}
                >
                  {initials(exitCase.employeeName)}
                </div>
              )}
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight truncate">
                  {exitCase?.employeeName ?? "Unknown"} — FnF Settlement
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                  <span className="font-mono">{exitCase?.exitCaseId ?? record.exitCaseId}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span>{exitCase?.employeeCode}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span>{exitCase?.department}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span>{exitCase?.designation}</span>
                  <span className="text-muted-foreground/60">·</span>
                  {renderStatusBadge(record.status)}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Toolbar of actions */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <ActionBtn icon={<RefreshCw className="h-3.5 w-3.5" />} label="Fetch Payroll" onClick={() => onAction("fetch-payroll", record)} />
            <ActionBtn icon={<Plane className="h-3.5 w-3.5" />} label="Leave Encash" onClick={() => onAction("fetch-leave", record)} />
            <ActionBtn icon={<Package className="h-3.5 w-3.5" />} label="Asset Rec." onClick={() => onAction("fetch-asset", record)} />
            <ActionBtn icon={<Landmark className="h-3.5 w-3.5" />} label="Loan Bal." onClick={() => onAction("fetch-loan", record)} />
            <Separator orientation="vertical" className="h-5 mx-0.5" />
            <ActionBtn icon={<Calculator className="h-3.5 w-3.5" />} label="Calculate" tone="primary" onClick={() => onAction("calculate", record)} />
            <ActionBtn icon={<PlusCircle className="h-3.5 w-3.5" />} label="Add Earning" tone="earning" onClick={() => onAddManual("earning")} />
            <ActionBtn icon={<MinusCircle className="h-3.5 w-3.5" />} label="Add Deduction" tone="deduction" onClick={() => onAddManual("deduction")} />
            <Separator orientation="vertical" className="h-5 mx-0.5" />
            {!isApproved && (
              <ActionBtn icon={<Send className="h-3.5 w-3.5" />} label="Send for Approval" onClick={() => onAction("send-approval", record)} />
            )}
            {!isApproved && (
              <>
                <ActionBtn icon={<Check className="h-3.5 w-3.5" />} label="Approve" tone="success" onClick={() => onAction("approve", record)} />
                <ActionBtn icon={<X className="h-3.5 w-3.5" />} label="Reject" tone="danger" onClick={() => onAction("reject", record)} />
              </>
            )}
            {isApproved && !isPaid && (
              <ActionBtn icon={<BadgeCheck className="h-3.5 w-3.5" />} label="Mark Paid" tone="success" onClick={() => onAction("mark-paid", record)} />
            )}
            <Separator orientation="vertical" className="h-5 mx-0.5" />
            <ActionBtn icon={<FileText className="h-3.5 w-3.5" />} label="Settlement Letter" onClick={() => onAction("letter", record)} />
            <ActionBtn icon={<Download className="h-3.5 w-3.5" />} label="Export" onClick={() => onAction("export", record)} />
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
          {/* Sidebar: input sections */}
          <aside className="lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-border/60 bg-muted/30">
            <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-rose-600" />
              <span className="text-xs font-semibold uppercase tracking-wide">FnF Input Sections</span>
            </div>
            <ScrollArea className="max-h-[200px] lg:max-h-none lg:flex-1">
              <ul className="py-1.5">
                {FNF_INPUT_SECTIONS.map((s, i) => (
                  <li key={s.name}>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-2 px-4 py-1.5 text-xs text-left hover:bg-rose-50/60 dark:hover:bg-rose-950/20 transition-colors",
                        s.name === "Net Payable / Recoverable" && "font-semibold text-rose-700 dark:text-rose-300"
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground font-mono w-4">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 truncate">{s.name}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-5">
                {/* Settlement meta strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetaTile label="Calculated At" value={formatDate(record.calculatedAt)} icon={<Calculator className="h-3.5 w-3.5" />} />
                  <MetaTile label="Approved By" value={record.approvedBy ?? "—"} icon={<ShieldCheck className="h-3.5 w-3.5" />} />
                  <MetaTile label="Approved At" value={formatDate(record.approvedAt)} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
                  <MetaTile label="Paid At" value={formatDate(record.paidAt)} icon={<BadgeCheck className="h-3.5 w-3.5" />} />
                </div>

                {/* Earnings + Deductions side-by-side / stacked */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Earnings */}
                  <Card className="shadow-sm border-emerald-200/60 dark:border-emerald-900/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600">
                            <TrendingUp className="h-4 w-4" />
                          </span>
                          FnF Earnings
                        </span>
                        <Button
                          variant="outline" size="sm"
                          className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                          onClick={() => onAddManual("earning")}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Manual
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="divide-y divide-border/50">
                        {earnings.length === 0 ? (
                          <li className="py-6 text-center text-xs text-muted-foreground">
                            <Inbox className="h-5 w-5 mx-auto mb-1 opacity-40" />
                            No earnings recorded
                          </li>
                        ) : earnings.map((e) => (
                          <li key={e.id} className="py-2 flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-medium">{e.category}</span>
                                {renderSourceBadge(e.source)}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] py-0 px-1.5",
                                    e.status === "confirmed"
                                      ? "border-emerald-300 text-emerald-700 dark:text-emerald-300"
                                      : "border-amber-300 text-amber-700 dark:text-amber-300"
                                  )}
                                >
                                  {e.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{e.description}</div>
                            </div>
                            <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                              +{formatCurrency(e.amount)}
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
                        <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200 uppercase tracking-wide">Total Earnings</span>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(record.totalEarnings)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Deductions */}
                  <Card className="shadow-sm border-rose-200/60 dark:border-rose-900/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600">
                            <TrendingDown className="h-4 w-4" />
                          </span>
                          FnF Deductions
                        </span>
                        <Button
                          variant="outline" size="sm"
                          className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                          onClick={() => onAddManual("deduction")}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Manual
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="divide-y divide-border/50">
                        {deductions.length === 0 ? (
                          <li className="py-6 text-center text-xs text-muted-foreground">
                            <Inbox className="h-5 w-5 mx-auto mb-1 opacity-40" />
                            No deductions recorded
                          </li>
                        ) : deductions.map((e) => (
                          <li key={e.id} className="py-2 flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-medium">{e.category}</span>
                                {renderSourceBadge(e.source)}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] py-0 px-1.5",
                                    e.status === "confirmed"
                                      ? "border-rose-300 text-rose-700 dark:text-rose-300"
                                      : "border-amber-300 text-amber-700 dark:text-amber-300"
                                  )}
                                >
                                  {e.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{e.description}</div>
                            </div>
                            <div className="text-sm font-semibold text-rose-700 dark:text-rose-400 whitespace-nowrap">
                              −{formatCurrency(e.amount)}
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 flex items-center justify-between rounded-lg bg-rose-50 dark:bg-rose-950/30 px-3 py-2">
                        <span className="text-xs font-medium text-rose-800 dark:text-rose-200 uppercase tracking-wide">Total Deductions</span>
                        <span className="text-sm font-bold text-rose-700 dark:text-rose-400">{formatCurrency(record.totalDeductions)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Summary */}
                <Card className="shadow-sm border-border/60 overflow-hidden">
                  <CardHeader className="pb-2 bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-950/20">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Scale className="h-4 w-4 text-rose-600" />
                      Settlement Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-4">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                          <TrendingUp className="h-3 w-3" /> Total Earnings
                        </div>
                        <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                          {formatCurrency(record.totalEarnings)}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{earnings.length} earning items</div>
                      </div>
                      <div className="rounded-xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 p-4">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-rose-700 dark:text-rose-300">
                          <TrendingDown className="h-3 w-3" /> Total Deductions
                        </div>
                        <div className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-1">
                          {formatCurrency(record.totalDeductions)}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{deductions.length} deduction items</div>
                      </div>
                      <div className={cn(
                        "rounded-xl border-2 p-4 relative overflow-hidden",
                        record.netPayable >= 0
                          ? "border-rose-300 bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-background"
                          : "border-red-300 bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-background"
                      )}>
                        <div className={cn(
                          "flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold",
                          record.netPayable >= 0 ? "text-rose-700 dark:text-rose-300" : "text-red-700 dark:text-red-300"
                        )}>
                          <Scale className="h-3 w-3" /> Net {record.netPayable >= 0 ? "Payable" : "Recoverable"}
                        </div>
                        <div className={cn(
                          "text-2xl font-extrabold mt-1",
                          record.netPayable >= 0 ? "text-rose-700 dark:text-rose-400" : "text-red-700 dark:text-red-400"
                        )}>
                          {formatCurrency(Math.abs(record.netPayable))}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          = Earnings − Deductions
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* FnF input sections reference (mobile-friendly accordion-like grid) */}
                <Card className="shadow-sm border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Layers className="h-4 w-4 text-rose-600" />
                      FnF Input Sections — Reference
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {FNF_INPUT_SECTIONS.map((s, i) => (
                        <div
                          key={s.name}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-2 text-xs",
                            s.name === "Net Payable / Recoverable" && "border-rose-300 bg-rose-50/40 dark:bg-rose-950/20 font-semibold text-rose-700 dark:text-rose-300"
                          )}
                        >
                          <span className="text-[10px] text-muted-foreground font-mono">{String(i + 1).padStart(2, "0")}</span>
                          <span className="truncate">{s.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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

function ActionBtn({
  icon, label, onClick, tone = "default",
}: {
  icon: React.ReactNode; label: string; onClick: () => void
  tone?: "default" | "primary" | "earning" | "deduction" | "success" | "danger"
}) {
  const toneCls: Record<string, string> = {
    default: "border-border bg-background hover:bg-muted/50 text-foreground",
    primary: "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50",
    earning: "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50",
    deduction: "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50",
    success: "border-emerald-400 bg-emerald-600 text-white hover:bg-emerald-700",
    danger: "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50",
  }
  return (
    <Button
      variant="outline" size="sm"
      className={cn("h-7 px-2.5 text-xs font-medium gap-1.5", toneCls[tone])}
      onClick={onClick}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label}</span>
    </Button>
  )
}

function MetaTile({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium mt-0.5 truncate">{value}</div>
    </div>
  )
}

export default FnFSection
