"use client"

// ============================================================
// TransferPromotionTab — transfers + promotions history.
// APIs:
//   GET/POST /api/employees/[id]/transfers
//   GET/POST /api/employees/[id]/promotions
//   PATCH /api/employees/[id]   (sync current designation/grade/ctc/department/etc.)
// ------------------------------------------------------------

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Shuffle, TrendingUp, ArrowRight, Plus, Briefcase, Building2, MapPin,
  Users as UsersIcon, Wallet, Award,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { EmptyState, SectionCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- types ----------

interface TransferRec {
  id: string
  oldDepartment?: string | null
  newDepartment?: string | null
  oldLocation?: string | null
  newLocation?: string | null
  oldManager?: string | null
  newManager?: string | null
  oldEntity?: string | null
  newEntity?: string | null
  effectiveDate: string | Date
  reason?: string | null
  status: string
  approvedBy?: string | null
}

interface PromotionRec {
  id: string
  oldDesignation?: string | null
  newDesignation?: string | null
  oldGrade?: string | null
  newGrade?: string | null
  oldCtc?: number | null
  newCtc?: number | null
  effectiveDate: string | Date
  reason?: string | null
  status: string
  approvedBy?: string | null
  letterUrl?: string | null
}

// ---------- helpers ----------

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
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

function incrementPct(oldCtc?: number | null, newCtc?: number | null) {
  if (!oldCtc || !newCtc) return null
  const pct = ((newCtc - oldCtc) / oldCtc) * 100
  return pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`
}

function resolveName(obj: any, fallback?: string) {
  if (!obj) return fallback || "—"
  return obj.name || obj.displayName || [obj.firstName, obj.lastName].filter(Boolean).join(" ") || obj.code || fallback || "—"
}

// ============================================================
// Component
// ============================================================

export default function TransferPromotionTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [transfers, setTransfers] = React.useState<TransferRec[]>([])
  const [promotions, setPromotions] = React.useState<PromotionRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [tab, setTab] = React.useState("transfers")
  const [transferOpen, setTransferOpen] = React.useState(false)
  const [promoOpen, setPromoOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, pRes] = await Promise.all([
        fetch(`/api/employees/${employeeId}/transfers`),
        fetch(`/api/employees/${employeeId}/promotions`),
      ])
      const tData = await tRes.json()
      const pData = await pRes.json()
      if (!tRes.ok) throw new Error(tData?.error || "Failed to load transfers")
      if (!pRes.ok) throw new Error(pData?.error || "Failed to load promotions")
      setTransfers(tData?.items || [])
      setPromotions(pData?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load history")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

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
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Transfer & Promotion</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Track all transfers (department / location / manager / entity) and promotions (designation / grade / CTC) for this employee.
          </p>
        </div>
      </div>

      {/* Current role summary */}
      <SectionCard title="Current Role & Compensation">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-start gap-2">
            <Briefcase className="h-4 w-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Designation</p>
              <p className="text-sm font-medium">{resolveName(employee?.designation, "—")}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Award className="h-4 w-4 mt-0.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Grade</p>
              <p className="text-sm font-medium">{resolveName(employee?.grade, "—")}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Wallet className="h-4 w-4 mt-0.5 text-fuchsia-600 dark:text-fuchsia-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">CTC</p>
              <p className="text-sm font-medium">{fmtCurrency(employee?.ctc)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 mt-0.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Department</p>
              <p className="text-sm font-medium">{resolveName(employee?.department, "—")}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="transfers" className="gap-1.5">
            <Shuffle className="h-3.5 w-3.5" /> Transfers ({transfers.length})
          </TabsTrigger>
          <TabsTrigger value="promotions" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Promotions ({promotions.length})
          </TabsTrigger>
        </TabsList>

        {/* Transfers */}
        <TabsContent value="transfers" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setTransferOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Initiate Transfer
            </Button>
          </div>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : transfers.length === 0 ? (
            <div className="rounded-xl border border-border/60">
              <EmptyState
                icon={Shuffle}
                title="No transfers recorded"
                description="Initiate a transfer to log a department / location / manager change."
                action={<Button size="sm" onClick={() => setTransferOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Initiate Transfer</Button>}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map((t, idx) => (
                <TransferCard key={t.id} t={t} idx={idx} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Promotions */}
        <TabsContent value="promotions" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setPromoOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Initiate Promotion
            </Button>
          </div>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : promotions.length === 0 ? (
            <div className="rounded-xl border border-border/60">
              <EmptyState
                icon={TrendingUp}
                title="No promotions recorded"
                description="Initiate a promotion to log a designation / grade / CTC change."
                action={<Button size="sm" onClick={() => setPromoOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Initiate Promotion</Button>}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {promotions.map((p, idx) => (
                <PromotionCard key={p.id} p={p} idx={idx} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Initiate Transfer dialog */}
      <InitiateTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        employeeId={employeeId}
        employee={employee}
        onCreated={load}
      />

      {/* Initiate Promotion dialog */}
      <InitiatePromotionDialog
        open={promoOpen}
        onOpenChange={setPromoOpen}
        employeeId={employeeId}
        employee={employee}
        onCreated={load}
      />
    </motion.div>
  )
}

// ============================================================
// TransferCard
// ============================================================

function TransferCard({ t, idx }: { t: TransferRec; idx: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, delay: Math.min(idx * 0.04, 0.3) }}
      className="rounded-xl border border-border/60 bg-card p-4 shadow-soft"
    >
      <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Shuffle className="h-3 w-3" /> Effective {fmtDate(t.effectiveDate)}
          </Badge>
          <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[t.status] || "bg-muted text-muted-foreground")}>
            {t.status}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">Approved by {t.approvedBy || "—"}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FromToRow icon={Building2} label="Department" from={t.oldDepartment} to={t.newDepartment} />
        <FromToRow icon={MapPin} label="Location" from={t.oldLocation} to={t.newLocation} />
        <FromToRow icon={UsersIcon} label="Manager" from={t.oldManager} to={t.newManager} />
        <FromToRow icon={Briefcase} label="Entity" from={t.oldEntity} to={t.newEntity} />
      </div>

      {t.reason && (
        <div className="mt-3 pt-3 border-t border-border/60">
          <p className="text-xs text-muted-foreground">Reason</p>
          <p className="text-sm mt-0.5">{t.reason}</p>
        </div>
      )}
    </motion.div>
  )
}

// ============================================================
// PromotionCard
// ============================================================

function PromotionCard({ p, idx }: { p: PromotionRec; idx: number }) {
  const inc = incrementPct(p.oldCtc, p.newCtc)
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, delay: Math.min(idx * 0.04, 0.3) }}
      className="rounded-xl border border-border/60 bg-card p-4 shadow-soft"
    >
      <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <TrendingUp className="h-3 w-3" /> Effective {fmtDate(p.effectiveDate)}
          </Badge>
          <Badge variant="secondary" className={cn("font-medium border-0", STATUS_COLORS[p.status] || "bg-muted text-muted-foreground")}>
            {p.status}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">Approved by {p.approvedBy || "—"}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FromToRow icon={Briefcase} label="Designation" from={p.oldDesignation} to={p.newDesignation} />
        <FromToRow icon={Award} label="Grade" from={p.oldGrade} to={p.newGrade} />
        <div className="flex items-start gap-2">
          <Wallet className="h-4 w-4 mt-0.5 text-fuchsia-600 dark:text-fuchsia-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">CTC</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-muted-foreground">{fmtCurrency(p.oldCtc)}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm font-medium">{fmtCurrency(p.newCtc)}</span>
              {inc && (
                <Badge variant="secondary" className="font-medium border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                  {inc}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {(p.reason || p.letterUrl) && (
        <div className="mt-3 pt-3 border-t border-border/60 flex items-start justify-between gap-2">
          {p.reason && (
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Reason</p>
              <p className="text-sm mt-0.5">{p.reason}</p>
            </div>
          )}
          {p.letterUrl && (
            <a href={p.letterUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline shrink-0">
              View letter →
            </a>
          )}
        </div>
      )}
    </motion.div>
  )
}

function FromToRow({
  icon: Icon, label, from, to,
}: {
  icon: any; label: string; from?: string | null; to?: string | null
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-sm text-muted-foreground">{from || "—"}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{to || "—"}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Initiate Transfer Dialog
// ============================================================

function InitiateTransferDialog({
  open, onOpenChange, employeeId, employee, onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  employee: any
  onCreated: () => void
}) {
  const [form, setForm] = React.useState({
    newDepartment: "",
    newLocation: "",
    newEntity: "",
    newManager: "",
    effectiveDate: "",
    reason: "",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setForm({
        newDepartment: "", newLocation: "", newEntity: "", newManager: "",
        effectiveDate: format(new Date(), "yyyy-MM-dd"), reason: "",
      })
    }
  }, [open])

  async function handleSubmit() {
    if (!form.effectiveDate) {
      toast.error("Effective date is required")
      return
    }
    setSubmitting(true)
    try {
      const oldDepartment = resolveName(employee?.department)
      const oldLocation = resolveName(employee?.location)
      const oldManager = resolveName(employee?.reportingManager)
      const oldEntity = resolveName(employee?.entity)

      const res = await fetch(`/api/employees/${employeeId}/transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldDepartment, oldLocation, oldManager, oldEntity,
          newDepartment: form.newDepartment || undefined,
          newLocation: form.newLocation || undefined,
          newEntity: form.newEntity || undefined,
          newManager: form.newManager || undefined,
          effectiveDate: new Date(form.effectiveDate).toISOString(),
          reason: form.reason || undefined,
          status: "Approved",
          approvedBy: "HR Admin",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to initiate transfer")

      // Sync employee record
      const patch: any = {}
      if (form.newDepartment) patch.departmentId = form.newDepartment
      if (form.newLocation) patch.locationId = form.newLocation
      if (form.newManager) patch.reportingManagerId = form.newManager
      if (form.newEntity) patch.entityId = form.newEntity
      if (Object.keys(patch).length > 0) {
        const empRes = await fetch(`/api/employees/${employeeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        if (!empRes.ok) {
          const e = await empRes.json().catch(() => ({}))
          toast.warning(`Transfer logged, but employee sync failed: ${e.error || empRes.status}`)
        }
      }
      toast.success("Transfer initiated")
      onOpenChange(false)
      onCreated()
    } catch (e: any) {
      toast.error(e.message || "Failed to initiate transfer")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="h-4 w-4" /> Initiate Transfer
          </DialogTitle>
          <DialogDescription>
            Log a transfer and update the employee's current department / location / manager / entity.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>New department</Label>
              <Input value={form.newDepartment} onChange={(e) => setForm({ ...form, newDepartment: e.target.value })}
                placeholder="Department name" />
            </div>
            <div className="space-y-1.5">
              <Label>New location</Label>
              <Input value={form.newLocation} onChange={(e) => setForm({ ...form, newLocation: e.target.value })}
                placeholder="Location name" />
            </div>
            <div className="space-y-1.5">
              <Label>New entity</Label>
              <Input value={form.newEntity} onChange={(e) => setForm({ ...form, newEntity: e.target.value })}
                placeholder="Entity name" />
            </div>
            <div className="space-y-1.5">
              <Label>New reporting manager</Label>
              <Input value={form.newManager} onChange={(e) => setForm({ ...form, newManager: e.target.value })}
                placeholder="Manager name" />
            </div>
            <div className="space-y-1.5">
              <Label>Effective date <span className="text-rose-500">*</span></Label>
              <Input type="date" value={form.effectiveDate}
                onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Reason for transfer..." rows={3} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            <Shuffle className="h-4 w-4" /> Initiate Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Initiate Promotion Dialog
// ============================================================

function InitiatePromotionDialog({
  open, onOpenChange, employeeId, employee, onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  employee: any
  onCreated: () => void
}) {
  const [form, setForm] = React.useState({
    newDesignation: "",
    newGrade: "",
    newCtc: "",
    effectiveDate: "",
    reason: "",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setForm({
        newDesignation: "", newGrade: "", newCtc: "",
        effectiveDate: format(new Date(), "yyyy-MM-dd"), reason: "",
      })
    }
  }, [open])

  const oldDesignation = resolveName(employee?.designation)
  const oldGrade = resolveName(employee?.grade)
  const oldCtc = employee?.ctc

  async function handleSubmit() {
    if (!form.effectiveDate) {
      toast.error("Effective date is required")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/promotions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldDesignation, oldGrade, oldCtc: oldCtc ? Number(oldCtc) : undefined,
          newDesignation: form.newDesignation || undefined,
          newGrade: form.newGrade || undefined,
          newCtc: form.newCtc ? Number(form.newCtc) : undefined,
          effectiveDate: new Date(form.effectiveDate).toISOString(),
          reason: form.reason || undefined,
          status: "Approved",
          approvedBy: "HR Admin",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to initiate promotion")

      // Sync employee record
      const patch: any = {}
      if (form.newDesignation) patch.designationId = form.newDesignation
      if (form.newGrade) patch.gradeId = form.newGrade
      if (form.newCtc) {
        patch.ctc = Number(form.newCtc)
        // Also update basicSalary as a portion (50%) if not provided — best-effort
        patch.basicSalary = Math.round(Number(form.newCtc) / 12 * 0.5)
        patch.hra = Math.round(Number(form.newCtc) / 12 * 0.2)
      }
      if (Object.keys(patch).length > 0) {
        const empRes = await fetch(`/api/employees/${employeeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        if (!empRes.ok) {
          const e = await empRes.json().catch(() => ({}))
          toast.warning(`Promotion logged, but employee sync failed: ${e.error || empRes.status}`)
        }
      }
      toast.success("Promotion initiated")
      onOpenChange(false)
      onCreated()
    } catch (e: any) {
      toast.error(e.message || "Failed to initiate promotion")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Initiate Promotion
          </DialogTitle>
          <DialogDescription>
            Log a promotion and update the employee's current designation / grade / CTC.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/40 p-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Current designation</p>
              <p className="font-medium">{oldDesignation}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current grade</p>
              <p className="font-medium">{oldGrade}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current CTC</p>
              <p className="font-medium">{fmtCurrency(oldCtc)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>New designation</Label>
              <Input value={form.newDesignation} onChange={(e) => setForm({ ...form, newDesignation: e.target.value })}
                placeholder="New designation" />
            </div>
            <div className="space-y-1.5">
              <Label>New grade</Label>
              <Input value={form.newGrade} onChange={(e) => setForm({ ...form, newGrade: e.target.value })}
                placeholder="New grade" />
            </div>
            <div className="space-y-1.5">
              <Label>New CTC (annual ₹)</Label>
              <Input type="number" value={form.newCtc} onChange={(e) => setForm({ ...form, newCtc: e.target.value })}
                placeholder="e.g. 1200000" />
            </div>
            <div className="space-y-1.5">
              <Label>Effective date <span className="text-rose-500">*</span></Label>
              <Input type="date" value={form.effectiveDate}
                onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Reason for promotion..." rows={3} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            <TrendingUp className="h-4 w-4" /> Initiate Promotion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
