'use client'

import * as React from "react"
import { toast } from "sonner"
import { Scale, SlidersHorizontal, Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Column, DataTable, EmptyState, ListToolbar, SectionCard, StatCard } from "@/components/hrms/ui"
import {
  fetchJson, sendJson, useAsync, empName, empInitials, fmtDate, toNum, toBool, downloadCSV,
  LeaveBalance, LeaveTypeLite,
} from "../shared"

export function BalanceSection() {
  const year = new Date().getFullYear()
  const [yearF, setYearF] = React.useState<string>(String(year))
  const [deptF, setDeptF] = React.useState<string>("all")
  const [ltF, setLtF] = React.useState<string>("all")
  const [search, setSearch] = React.useState("")
  const [adjustB, setAdjustB] = React.useState<LeaveBalance | null>(null)

  const { data: departments } = useAsync<{ id: string; name: string }[]>(
    () => fetchJson("/api/departments").catch(() => []),
    [],
  )
  const { data: leaveTypes } = useAsync<LeaveTypeLite[]>(
    () => fetchJson("/api/leave-types").catch(() => [] as LeaveTypeLite[]),
    [],
  )

  const params = new URLSearchParams({ year: yearF })
  if (deptF !== "all") params.set("departmentId", deptF)
  if (ltF !== "all") params.set("leaveTypeId", ltF)

  const { data, loading, error, reload } = useAsync<LeaveBalance[]>(
    () => fetchJson(`/api/leave-balance?${params.toString()}`).catch(() => []),
    [yearF, deptF, ltF],
  )

  // Group balances per employee
  const byEmp = React.useMemo(() => {
    const m = new Map<string, { employee: LeaveBalance["employee"]; rows: LeaveBalance[] }>()
    for (const b of (data || [])) {
      const key = b.employeeId
      if (!m.has(key)) m.set(key, { employee: b.employee, rows: [] })
      m.get(key)!.rows.push(b)
    }
    return Array.from(m.values())
  }, [data])

  const filtered = byEmp.filter((e) => {
    if (!search) return true
    return empName(e.employee).toLowerCase().includes(search.toLowerCase())
  })

  const ltCols = (leaveTypes || []).filter((lt) => ltF === "all" || lt.id === ltF)

  function exportCsv() {
    const rows: Record<string, any>[] = []
    for (const e of filtered) {
      const r: Record<string, any> = { Employee: empName(e.employee), Code: e.employee?.employeeCode || "" }
      let total = 0
      for (const lt of ltCols) {
        const b = e.rows.find((x) => x.leaveTypeId === lt.id)
        const avail = b ? (b.available ?? (toNum(b.opening) + toNum(b.accrued) + toNum(b.carryForward) + toNum(b.granted) - toNum(b.used) - toNum(b.pending) - toNum(b.encashed) - toNum(b.lapsed) - toNum(b.expired))) : 0
        r[`${lt.code} Avail`] = avail.toFixed(1)
        r[`${lt.code} Used`] = b ? toNum(b.used).toFixed(1) : "0"
        total += avail
      }
      r["Total Avail"] = total.toFixed(1)
      rows.push(r)
    }
    downloadCSV(`leave-balances-${yearF}.csv`, rows)
    toast.success("Exported CSV")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Leave Balance</h2>
          <p className="text-sm text-muted-foreground">View and adjust employee leave balances across leave types.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={yearF} onValueChange={setYearF}>
            <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[year, year - 1, year + 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={deptF} onValueChange={setDeptF}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All depts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {(departments || []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ltF} onValueChange={setLtF}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leave Types</SelectItem>
              {(leaveTypes || []).map((lt) => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Employees" value={byEmp.length} icon={Scale} accent="emerald" sub="With balance records" />
        <StatCard label="Leave Types" value={ltCols.length} icon={SlidersHorizontal} accent="cyan" sub="In current view" />
        <StatCard label="Records" value={data?.length || 0} icon={RefreshCw} accent="amber" sub={`Year ${yearF}`} />
        <StatCard label="Year" value={yearF} icon={Scale} accent="emerald" sub="Calendar year" />
      </div>

      <ListToolbar
        search={search}
        onSearch={setSearch}
        extra={
          <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={() => { reload(); toast.success("Balances refreshed") }}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      {loading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : error ? (
        <SectionCard title="Leave Balance"><EmptyState icon={Scale} title="Unable to load balances" description="Please try again later." /></SectionCard>
      ) : byEmp.length === 0 ? (
        <SectionCard title="Leave Balance">
          <EmptyState icon={Scale} title="No balance records" description="Run a leave recalculation or adjust filters to see balances." />
        </SectionCard>
      ) : (
        <BalanceTable
          rows={filtered}
          leaveTypes={ltCols}
          onAdjust={setAdjustB}
        />
      )}

      {adjustB && (
        <AdjustDialog
          balance={adjustB}
          onClose={() => setAdjustB(null)}
          onDone={() => { setAdjustB(null); reload() }}
        />
      )}
    </div>
  )
}

function BalanceTable({
  rows, leaveTypes, onAdjust,
}: {
  rows: Array<{ employee: LeaveBalance["employee"]; rows: LeaveBalance[] }>
  leaveTypes: LeaveTypeLite[]
  onAdjust: (b: LeaveBalance) => void
}) {
  const columns: Column<any>[] = [
    {
      key: "employee", header: "Employee", className: "min-w-[200px]",
      render: (r: any) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
            {empInitials(r.employee)}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{empName(r.employee)}</p>
            <p className="text-xs text-muted-foreground">{r.employee?.employeeCode || "—"}</p>
          </div>
        </div>
      ),
    },
    ...leaveTypes.map((lt) => ({
      key: lt.id,
      header: lt.code,
      render: (r: any) => {
        const b = r.rows.find((x: LeaveBalance) => x.leaveTypeId === lt.id)
        if (!b) return <span className="text-xs text-muted-foreground">—</span>
        const avail = b.available ?? (toNum(b.opening) + toNum(b.accrued) + toNum(b.carryForward) + toNum(b.granted) - toNum(b.used) - toNum(b.pending) - toNum(b.encashed) - toNum(b.lapsed) - toNum(b.expired))
        return (
          <button
            onClick={() => onAdjust(b)}
            title="Adjust balance"
            className="rounded-md px-2 py-1 text-left hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
          >
            <p className="text-sm font-semibold tabular-nums text-foreground">{avail.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">Used {toNum(b.used).toFixed(1)}</p>
          </button>
        )
      },
    })),
    {
      key: "actions", header: "", width: "80px",
      render: (r: any) => (
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => r.rows[0] && onAdjust(r.rows[0])}>
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1" /> Adjust
        </Button>
      ),
    },
  ]
  return (
    <DataTable
      columns={columns}
      rows={rows.map((r) => ({ id: r.employee?.id || r.rows[0]?.id || Math.random().toString(), ...r }))}
      emptyState={<EmptyState icon={Scale} title="No balances found" description="Adjust filters or run recalculation." />}
    />
  )
}

function AdjustDialog({
  balance, onClose, onDone,
}: {
  balance: LeaveBalance
  onClose: () => void
  onDone: () => void
}) {
  const [type, setType] = React.useState<"Credit" | "Debit">("Credit")
  const [amount, setAmount] = React.useState<string>("1")
  const [reason, setReason] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  async function submit() {
    if (!amount || !reason.trim()) {
      toast.error("Amount and reason are required")
      return
    }
    setSubmitting(true)
    try {
      await sendJson(`/api/leave-balance?employeeId=${balance.employeeId}&leaveTypeId=${balance.leaveTypeId}&year=${balance.year}`, {
        adjustmentType: type, amount: Number(amount), reason,
      })
      toast.success(`Balance ${type.toLowerCase()}ed`)
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to adjust")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-emerald-500" /> Adjust Leave Balance</DialogTitle>
          <DialogDescription>
            {empName(balance.employee)} · {balance.leaveType?.name || "Leave"} · Year {balance.year}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Current Available</Label>
              <p className="text-lg font-semibold tabular-nums">
                {(balance.available ?? (toNum(balance.opening) + toNum(balance.accrued) + toNum(balance.carryForward) + toNum(balance.granted) - toNum(balance.used) - toNum(balance.pending) - toNum(balance.encashed) - toNum(balance.lapsed) - toNum(balance.expired))).toFixed(1)}
              </p>
            </div>
            <div>
              <Label className="text-xs">Used / Pending</Label>
              <p className="text-sm font-medium tabular-nums">{toNum(balance.used).toFixed(1)} / {toNum(balance.pending).toFixed(1)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="t">Adjustment Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger id="t"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Credit">Credit (+)</SelectItem>
                  <SelectItem value="Debit">Debit (−)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amt">Amount (days)</Label>
              <Input id="amt" type="number" min="0.5" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="rs">Reason <span className="text-rose-500">*</span></Label>
            <Input id="rs" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for adjustment" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? "Saving…" : "Apply Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
