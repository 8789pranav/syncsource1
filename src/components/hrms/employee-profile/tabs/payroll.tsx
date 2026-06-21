"use client"

// ============================================================
// PayrollTab — salary structure view + breakdown charts +
// revise salary dialog.
// ------------------------------------------------------------
// Reads compensation fields from the `employee` prop.
// Revise action PATCHes /api/employees/[id] with new comp
// fields — the PATCH route auto-creates an
// EmployeeCompensationHistory entry.
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts"
import {
  Wallet, TrendingUp, Pencil, ShieldCheck, Loader2, Banknote,
  PiggyBank, Receipt, IndianRupee,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { SectionCard, StatCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- helpers ----------

function num(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
function inr(v: number) {
  return "₹" + Math.round(v).toLocaleString("en-IN")
}
function inrShort(v: number) {
  if (v >= 10000000) return "₹" + (v / 10000000).toFixed(2) + " Cr"
  if (v >= 100000) return "₹" + (v / 100000).toFixed(2) + " L"
  if (v >= 1000) return "₹" + (v / 1000).toFixed(1) + "K"
  return "₹" + Math.round(v).toLocaleString("en-IN")
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs shadow-card">
      {label && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground tabular-nums">{inr(Number(p.value))}</span>
        </div>
      ))}
    </div>
  )
}

const CHART_COLORS = ["#10b981", "#06b6d4", "#f59e0b", "#d946ef", "#f43f5e", "#84cc16"]

// ============================================================
// Component
// ============================================================

export default function PayrollTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [reviseOpen, setReviseOpen] = React.useState(false)

  const ctc = num(employee?.ctc)
  const basic = num(employee?.basicSalary)
  const hra = num(employee?.hra)
  const special = num(employee?.specialAllowance)
  const conveyance = num(employee?.conveyanceAllowance)
  const medical = num(employee?.medicalAllowance)
  const bonus = num(employee?.bonusAmount)
  const pfEmployee = num(employee?.pfEmployee)
  const pfEmployer = num(employee?.pfEmployer)
  const esi = num(employee?.esiAmount)
  const pt = num(employee?.professionalTax)
  const tds = num(employee?.tdsAmount)
  const gross = num(employee?.grossSalary) || (basic + hra + special + conveyance + medical + bonus)
  const totalDeductions = pfEmployee + esi + pt + tds
  const net = num(employee?.netSalary) || Math.max(0, gross - totalDeductions)
  const monthlyNet = net / 12

  // Donut data: earnings vs deductions (annual)
  const donutData = [
    { name: "Earnings", value: gross },
    { name: "Deductions", value: totalDeductions },
  ]
  const DONUT_COLORS = ["#10b981", "#f43f5e"]

  // CTC composition bar chart
  const barData = [
    { name: "Basic", value: basic },
    { name: "HRA", value: hra },
    { name: "Special", value: special },
    { name: "Conveyance", value: conveyance },
    { name: "Medical", value: medical },
    { name: "Bonus", value: bonus },
  ]

  const earningsRows = [
    { label: "Basic Salary", value: basic, hint: "Fixed base" },
    { label: "HRA", value: hra, hint: "House rent allowance" },
    { label: "Special Allowance", value: special, hint: "Flexible component" },
    { label: "Conveyance", value: conveyance, hint: "Travel allowance" },
    { label: "Medical", value: medical, hint: "Medical reimbursement" },
    { label: "Bonus", value: bonus, hint: "Performance / festive" },
  ]
  const deductionRows = [
    { label: "PF (Employee)", value: pfEmployee, hint: "12% of basic" },
    { label: "PF (Employer)", value: pfEmployer, hint: "Employer contribution" },
    { label: "ESI", value: esi, hint: "Health insurance" },
    { label: "Professional Tax", value: pt, hint: "State levy" },
    { label: "TDS", value: tds, hint: "Income tax" },
  ]

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
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Payroll</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Salary structure, breakdown and revision history for the current cycle.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" className="gap-1.5" onClick={() => setReviseOpen(true)}>
            <Pencil className="h-4 w-4" /> Revise Salary
          </Button>
        </div>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/20 px-4 py-3 text-sm">
        <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-amber-700 dark:text-amber-400">
          <span className="font-medium">Restricted visibility.</span> Salary information is visible to HR / Payroll admin only.
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Annual CTC" value={inrShort(ctc)} icon={Wallet} accent="emerald" sub={inr(ctc)} />
        <StatCard label="Gross / yr" value={inrShort(gross)} icon={Banknote} accent="cyan" sub={inr(gross)} />
        <StatCard label="Net / month" value={inrShort(monthlyNet)} icon={PiggyBank} accent="amber" sub={inr(monthlyNet)} />
        <StatCard label="Deductions / yr" value={inrShort(totalDeductions)} icon={Receipt} accent="coral" sub={inr(totalDeductions)} />
      </div>

      {/* Salary structure card */}
      <SectionCard title="Salary Structure" description="Annual cost-to-company breakdown">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Earnings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" /> Earnings
              </h4>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                Gross: {inr(gross)}
              </Badge>
            </div>
            <div className="space-y-2">
              {earningsRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="text-[11px] text-muted-foreground">{row.hint}</p>
                  </div>
                  <p className="text-sm font-medium tabular-nums">{inr(row.value)}</p>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 mt-1">
                <p className="text-sm font-semibold">Gross Salary</p>
                <p className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{inr(gross)}</p>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <Receipt className="h-4 w-4" /> Deductions
              </h4>
              <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
                Total: {inr(totalDeductions)}
              </Badge>
            </div>
            <div className="space-y-2">
              {deductionRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="text-[11px] text-muted-foreground">{row.hint}</p>
                  </div>
                  <p className="text-sm font-medium tabular-nums">{inr(row.value)}</p>
                </div>
              ))}
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 mt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Annual Net Salary</p>
                    <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{inr(net)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Monthly In-hand</p>
                    <p className="text-lg font-bold tabular-nums">{inr(monthlyNet)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Earnings vs Deductions" description="Annual gross composition">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  stroke="none"
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="CTC Composition" description="Earnings components (annual)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ left: -8, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklch, var(--muted) 50%, transparent)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={(v) => inrShort(Number(v))} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "color-mix(in oklch, var(--muted) 60%, transparent)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Footnote */}
      <p className="text-xs text-muted-foreground/70 pt-1">
        Payslips, tax declarations and Form 16 generation will be available in Phase 3 (Payroll processing).
      </p>

      {/* Revise dialog */}
      <ReviseSalaryDialog
        open={reviseOpen}
        onOpenChange={setReviseOpen}
        employeeId={employeeId}
        current={{
          ctc, basic, hra, special, conveyance, medical, bonus,
          pfEmployee, pfEmployer, esi, pt, tds, gross, net,
        }}
      />
    </motion.div>
  )
}

// ============================================================
// Revise Salary Dialog
// ============================================================

function ReviseSalaryDialog({
  open, onOpenChange, employeeId, current,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  current: {
    ctc: number; basic: number; hra: number; special: number
    conveyance: number; medical: number; bonus: number
    pfEmployee: number; pfEmployer: number; esi: number; pt: number; tds: number
    gross: number; net: number
  }
}) {
  const [form, setForm] = React.useState({
    ctc: "", basicSalary: "", hra: "", specialAllowance: "",
    conveyanceAllowance: "", medicalAllowance: "", bonusAmount: "",
    pfEmployee: "", pfEmployer: "", esiAmount: "", professionalTax: "", tdsAmount: "",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setForm({
        ctc: String(current.ctc || ""),
        basicSalary: String(current.basic || ""),
        hra: String(current.hra || ""),
        specialAllowance: String(current.special || ""),
        conveyanceAllowance: String(current.conveyance || ""),
        medicalAllowance: String(current.medical || ""),
        bonusAmount: String(current.bonus || ""),
        pfEmployee: String(current.pfEmployee || ""),
        pfEmployer: String(current.pfEmployer || ""),
        esiAmount: String(current.esi || ""),
        professionalTax: String(current.pt || ""),
        tdsAmount: String(current.tds || ""),
      })
    }
  }, [open, current])

  const fields: { key: keyof typeof form; label: string }[] = [
    { key: "ctc", label: "CTC (annual)" },
    { key: "basicSalary", label: "Basic" },
    { key: "hra", label: "HRA" },
    { key: "specialAllowance", label: "Special Allowance" },
    { key: "conveyanceAllowance", label: "Conveyance" },
    { key: "medicalAllowance", label: "Medical" },
    { key: "bonusAmount", label: "Bonus" },
    { key: "pfEmployee", label: "PF (Employee)" },
    { key: "pfEmployer", label: "PF (Employer)" },
    { key: "esiAmount", label: "ESI" },
    { key: "professionalTax", label: "Professional Tax" },
    { key: "tdsAmount", label: "TDS" },
  ]

  function setField(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit() {
    const payload: Record<string, number> = {}
    for (const f of fields) {
      const v = form[f.key]
      if (v !== "" && v !== null && v !== undefined) {
        const n = Number(v)
        if (!Number.isFinite(n)) {
          toast.error(`${f.label} must be a number`)
          return
        }
        payload[f.key] = n
      }
    }
    if (Object.keys(payload).length === 0) {
      toast.error("Enter at least one new value")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to revise salary")
      toast.success("Salary revised — compensation history updated")
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message || "Failed to revise salary")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revise Salary</DialogTitle>
          <DialogDescription>
            Update compensation components. A compensation history entry will be created automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs">{f.label}</Label>
              <div className="relative">
                <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  className="pl-8 tabular-nums"
                  value={form[f.key]}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            Save Revision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
