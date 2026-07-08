"use client"

// ============================================================
// ExitTab — manage employee exit.
// API: /api/employees/[id]/exit (GET list, POST create,
// PATCH by recordId).
// ------------------------------------------------------------

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format, differenceInDays } from "date-fns"
import {
  LogOut, CheckCircle2, ChevronRight, XCircle, FileText, Award,
  Building2, Cpu, ShieldAlert, UserCog, Wallet, AlertTriangle, ClipboardCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { EmptyState, SectionCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"

// ---------- types ----------

interface ExitRec {
  id: string
  resignationDate: string | Date
  lastWorkingDate?: string | Date | null
  reason?: string | null
  status: string
  noticePeriodDays?: number | null
  noticeRecoveryDays?: number | null
  noticeRecoveryAmount?: number | null
  exitInterviewNotes?: string | null
  clearanceHR: boolean
  clearanceIT: boolean
  clearanceAdmin: boolean
  clearanceFinance: boolean
  clearanceManager: boolean
  clearancePayroll: boolean
  finalSettlement?: number | null
  relievingLetterUrl?: string | null
  experienceLetterUrl?: string | null
  approvedBy?: string | null
  approvedAt?: string | Date | null
}

// ---------- pipeline ----------

const PIPELINE = [
  "Not initiated",
  "Resignation submitted",
  "Manager approved",
  "HR approved",
  "Clearance pending",
  "FnF pending",
  "Exit completed",
] as const

function pipelineIdx(status: string) {
  if (status === "Rejected") return -1
  const idx = PIPELINE.indexOf(status as any)
  return idx === -1 ? 0 : idx
}

// ---------- helpers ----------

const STATUS_COLORS: Record<string, string> = {
  "Resignation submitted": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Manager approved": "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "HR approved": "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  "Clearance pending": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "FnF pending": "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
  "Exit completed": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

function fmtCurrency(n?: number | null) {
  if (n === null || n === undefined || isNaN(Number(n))) return "—"
  return `₹${Number(n).toLocaleString("en-IN")}`
}

// ============================================================
// Component
// ============================================================

export default function ExitTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<ExitRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [submitOpen, setSubmitOpen] = React.useState(false)
  const [fnfTarget, setFnfTarget] = React.useState<ExitRec | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/exit`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load exit record")
      setItems(data?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load exit record")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  // latest exit record
  const exit = items[0] || null
  const isActive = employee?.employeeStatus === "Active" || !employee?.employeeStatus

  async function patchExit(rec: ExitRec, payload: any, successMsg: string) {
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/exit/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to update")
      toast.success(successMsg)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to update")
    }
  }

  async function patchClearance(rec: ExitRec, field: keyof ExitRec, value: boolean) {
    await patchExit(rec, { [field]: value }, "Clearance updated")
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-5"
    >
      {/* Heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Exit / Offboarding</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Manage the full employee exit pipeline — resignation, approvals, clearance, full & final settlement, and relieving letters.
          </p>
        </div>
        {!exit && isActive && (
          <Button size="sm" onClick={() => setSubmitOpen(true)} className="gap-1.5 shrink-0">
            <LogOut className="h-4 w-4" /> Initiate Exit
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !exit ? (
        <div className="rounded-xl border border-border/60">
          <EmptyState
            icon={LogOut}
            title="No exit record"
            description={
              isActive
                ? "This employee is currently active. Initiate an exit to start the offboarding process."
                : "No exit record found for this employee."
            }
            action={isActive ? <Button size="sm" onClick={() => setSubmitOpen(true)}><LogOut className="h-4 w-4 mr-1.5" /> Initiate Exit</Button> : undefined}
          />
        </div>
      ) : (
        <>
          {/* Pipeline visual */}
          <SectionCard title="Exit Pipeline">
            <div className="overflow-x-auto pb-2">
              <div className="flex items-center gap-1 min-w-max">
                {PIPELINE.map((stage, idx) => {
                  const currentIdx = exit.status === "Rejected" ? -1 : pipelineIdx(exit.status)
                  const isCompleted = idx < currentIdx
                  const isCurrent = idx === currentIdx
                  const isRejected = exit.status === "Rejected"
                  return (
                    <React.Fragment key={stage}>
                      <div className="flex flex-col items-center gap-1.5 min-w-[110px]">
                        <div className={cn(
                          "grid h-8 w-8 place-items-center rounded-full text-xs font-semibold border-2 transition-colors",
                          isCompleted && "bg-emerald-500 border-emerald-500 text-white",
                          isCurrent && !isRejected && "bg-amber-500 border-amber-500 text-white animate-pulse",
                          !isCompleted && !isCurrent && "bg-card border-border text-muted-foreground"
                        )}>
                          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : (idx + 1)}
                        </div>
                        <span className={cn(
                          "text-[10px] text-center leading-tight",
                          isCurrent && !isRejected && "font-semibold text-foreground",
                          isCompleted && "text-emerald-700 dark:text-emerald-400",
                          !isCompleted && !isCurrent && "text-muted-foreground"
                        )}>
                          {stage}
                        </span>
                      </div>
                      {idx < PIPELINE.length - 1 && (
                        <ChevronRight className={cn(
                          "h-4 w-4 shrink-0",
                          idx < currentIdx ? "text-emerald-500" : "text-border"
                        )} />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
            {exit.status === "Rejected" && (
              <div className="mt-4 rounded-lg border border-rose-200/70 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/10 p-3 flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <p className="text-rose-700 dark:text-rose-300">Resignation was rejected.</p>
              </div>
            )}
          </SectionCard>

          {/* Exit Details */}
          <SectionCard
            title="Exit Details"
            action={
              <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[exit.status] || "bg-muted text-muted-foreground")}>
                {exit.status}
              </Badge>
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Resignation date</p>
                <p className="text-sm font-medium">{fmtDate(exit.resignationDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last working date</p>
                <p className="text-sm font-medium">{fmtDate(exit.lastWorkingDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Notice period</p>
                <p className="text-sm font-medium">{exit.noticePeriodDays ? `${exit.noticePeriodDays} days` : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Notice recovery</p>
                <p className="text-sm font-medium">
                  {exit.noticeRecoveryDays ? `${exit.noticeRecoveryDays} days` : "—"}
                  {exit.noticeRecoveryAmount ? ` (${fmtCurrency(exit.noticeRecoveryAmount)})` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Final settlement</p>
                <p className="text-sm font-medium text-fuchsia-600 dark:text-fuchsia-400">{fmtCurrency(exit.finalSettlement)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Approved by</p>
                <p className="text-sm font-medium">{exit.approvedBy || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Approved at</p>
                <p className="text-sm font-medium">{fmtDate(exit.approvedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Days since resignation</p>
                <p className="text-sm font-medium">
                  {differenceInDays(new Date(), new Date(exit.resignationDate))} days
                </p>
              </div>
            </div>
            {exit.reason && (
              <div className="mt-3 pt-3 border-t border-border/60">
                <p className="text-xs text-muted-foreground">Reason</p>
                <p className="text-sm mt-0.5">{exit.reason}</p>
              </div>
            )}
            {exit.exitInterviewNotes && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Exit interview notes</p>
                <p className="text-sm mt-0.5 whitespace-pre-wrap">{exit.exitInterviewNotes}</p>
              </div>
            )}
            {(exit.relievingLetterUrl || exit.experienceLetterUrl) && (
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-3 flex-wrap">
                {exit.relievingLetterUrl && (
                  <a href={exit.relievingLetterUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                    <FileText className="h-3.5 w-3.5" /> Relieving letter
                  </a>
                )}
                {exit.experienceLetterUrl && (
                  <a href={exit.experienceLetterUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                    <Award className="h-3.5 w-3.5" /> Experience letter
                  </a>
                )}
              </div>
            )}
          </SectionCard>

          {/* Clearance Checklist */}
          <SectionCard
            title="Clearance Checklist"
            description="Department-wise clearance status"
            action={
              <Badge variant="outline" className="gap-1.5">
                <ClipboardCheck className="h-3 w-3" />
                {[
                  exit.clearanceHR, exit.clearanceIT, exit.clearanceAdmin,
                  exit.clearanceFinance, exit.clearanceManager, exit.clearancePayroll,
                ].filter(Boolean).length} / 6 cleared
              </Badge>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <ClearanceRow icon={Building2} label="HR" field="clearanceHR" rec={exit} onToggle={patchClearance} color="emerald" />
              <ClearanceRow icon={Cpu} label="IT" field="clearanceIT" rec={exit} onToggle={patchClearance} color="cyan" />
              <ClearanceRow icon={ShieldAlert} label="Admin" field="clearanceAdmin" rec={exit} onToggle={patchClearance} color="amber" />
              <ClearanceRow icon={Wallet} label="Finance" field="clearanceFinance" rec={exit} onToggle={patchClearance} color="fuchsia" />
              <ClearanceRow icon={UserCog} label="Manager" field="clearanceManager" rec={exit} onToggle={patchClearance} color="teal" />
              <ClearanceRow icon={Wallet} label="Payroll" field="clearancePayroll" rec={exit} onToggle={patchClearance} color="amber" />
            </div>
          </SectionCard>

          {/* Actions */}
          <SectionCard title="Actions">
            <div className="flex flex-wrap items-center gap-2">
              {exit.status === "Resignation submitted" && (
                <>
                  <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => patchExit(exit, { status: "Manager approved" }, "Manager approved")}>
                    <CheckCircle2 className="h-4 w-4" /> Manager Approve
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-rose-600 hover:bg-rose-500/10"
                    onClick={() => patchExit(exit, { status: "Rejected" }, "Resignation rejected")}>
                    <XCircle className="h-4 w-4" /> Reject Resignation
                  </Button>
                </>
              )}
              {exit.status === "Manager approved" && (
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => patchExit(exit, { status: "HR approved" }, "HR approved")}>
                  <CheckCircle2 className="h-4 w-4" /> HR Approve
                </Button>
              )}
              {exit.status === "HR approved" && (
                <Button size="sm" className="gap-1.5"
                  onClick={() => patchExit(exit, { status: "Clearance pending" }, "Moved to clearance pending")}>
                  <ChevronRight className="h-4 w-4" /> Move to Clearance
                </Button>
              )}
              {exit.status === "Clearance pending" && (
                <Button size="sm" className="gap-1.5"
                  onClick={() => setFnfTarget(exit)}>
                  <Wallet className="h-4 w-4" /> Complete FnF
                </Button>
              )}
              {exit.status === "FnF pending" && (
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => patchExit(exit, {
                    status: "Exit completed",
                    relievingLetterUrl: `/letters/relieving-${employeeId}.pdf`,
                    experienceLetterUrl: `/letters/experience-${employeeId}.pdf`,
                  }, "Exit completed · letters generated")}>
                  <CheckCircle2 className="h-4 w-4" /> Complete Exit
                </Button>
              )}
              {!["Exit completed", "Rejected"].includes(exit.status) && (
                <Button size="sm" variant="outline" className="gap-1.5 text-rose-600 hover:bg-rose-500/10"
                  onClick={() => patchExit(exit, { status: "Rejected" }, "Resignation rejected")}>
                  <XCircle className="h-4 w-4" /> Reject Resignation
                </Button>
              )}
            </div>
          </SectionCard>
        </>
      )}

      {/* Submit resignation dialog */}
      <SubmitResignationDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        employeeId={employeeId}
        onCreated={load}
      />

      {/* FnF dialog */}
      <FnFDialog
        open={!!fnfTarget}
        onOpenChange={(o) => !o && setFnfTarget(null)}
        loading={false}
        onSubmit={(amount, notes) => {
          if (fnfTarget) {
            patchExit(fnfTarget, {
              status: "FnF pending",
              finalSettlement: amount,
              exitInterviewNotes: notes || fnfTarget.exitInterviewNotes || undefined,
            }, "FnF completed")
          }
          setFnfTarget(null)
        }}
      />
    </motion.div>
  )
}

// ============================================================
// ClearanceRow
// ============================================================

function ClearanceRow({
  icon: Icon, label, field, rec, onToggle, color,
}: {
  icon: any; label: string; field: keyof ExitRec; rec: ExitRec;
  onToggle: (rec: ExitRec, field: keyof ExitRec, value: boolean) => void;
  color: "emerald" | "cyan" | "amber" | "fuchsia" | "teal"
}) {
  const checked = Boolean(rec[field])
  const colors: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    cyan: "text-cyan-600 dark:text-cyan-400",
    amber: "text-amber-600 dark:text-amber-400",
    fuchsia: "text-fuchsia-600 dark:text-fuchsia-400",
    teal: "text-teal-600 dark:text-teal-400",
  }
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", colors[color])} />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{checked ? "Cleared" : "Pending"}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(c) => onToggle(rec, field, c)}
      />
    </div>
  )
}

// ============================================================
// Submit Resignation Dialog
// ============================================================

function SubmitResignationDialog({
  open, onOpenChange, employeeId, onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  onCreated: () => void
}) {
  const [form, setForm] = React.useState({
    resignationDate: format(new Date(), "yyyy-MM-dd"),
    lastWorkingDate: "",
    reason: "",
    noticePeriodDays: "60",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setForm({
        resignationDate: format(new Date(), "yyyy-MM-dd"),
        lastWorkingDate: "",
        reason: "",
        noticePeriodDays: "60",
      })
    }
  }, [open])

  async function handleSubmit() {
    if (!form.resignationDate) {
      toast.error("Resignation date is required")
      return
    }
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/employees/${employeeId}/exit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resignationDate: new Date(form.resignationDate).toISOString(),
          lastWorkingDate: form.lastWorkingDate ? new Date(form.lastWorkingDate).toISOString() : undefined,
          reason: form.reason || undefined,
          noticePeriodDays: form.noticePeriodDays ? Number(form.noticePeriodDays) : undefined,
          status: "Resignation submitted",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to submit resignation")
      toast.success("Resignation submitted")
      onOpenChange(false)
      onCreated()
    } catch (e: any) {
      toast.error(e.message || "Failed to submit resignation")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-4 w-4" /> Initiate Exit
          </DialogTitle>
          <DialogDescription>
            Submit resignation to start the exit pipeline. The employee will be marked as On Notice.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Resignation date <span className="text-rose-500">*</span></Label>
              <Input type="date" value={form.resignationDate}
                onChange={(e) => setForm({ ...form, resignationDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Last working date</Label>
              <Input type="date" value={form.lastWorkingDate}
                onChange={(e) => setForm({ ...form, lastWorkingDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notice period (days)</Label>
            <Input type="number" value={form.noticePeriodDays}
              onChange={(e) => setForm({ ...form, noticePeriodDays: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Reason for resignation..." rows={3} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            <LogOut className="h-4 w-4" /> Submit Resignation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// FnF Dialog
// ============================================================

function FnFDialog({
  open, onOpenChange, onSubmit, loading,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSubmit: (amount: number, notes: string) => void
  loading: boolean
}) {
  const [amount, setAmount] = React.useState("")
  const [notes, setNotes] = React.useState("")

  React.useEffect(() => { if (open) { setAmount(""); setNotes("") } }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-fuchsia-700 dark:text-fuchsia-400">
            <Wallet className="h-4 w-4" /> Complete Full & Final Settlement
          </DialogTitle>
          <DialogDescription>
            Enter the final settlement amount to move the exit forward.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Final settlement amount (₹) <span className="text-rose-500">*</span></Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 85000" />
          </div>
          <div className="space-y-1.5">
            <Label>Exit interview notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes from exit interview..." rows={3} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={() => {
            if (!amount) { toast.error("Final settlement amount is required"); return }
            onSubmit(Number(amount), notes)
          }} disabled={loading} className="gap-1.5">
            <Wallet className="h-4 w-4" /> Complete FnF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
