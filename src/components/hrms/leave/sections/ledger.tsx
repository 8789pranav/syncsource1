'use client'

import * as React from "react"
import { toast } from "sonner"
import { BookOpen, Download, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Column, DataTable, EmptyState, SectionCard, StatCard } from "@/components/hrms/ui"
import { format as fmtIso } from "date-fns"
import {
  fetchJson, useAsync, empName, empInitials, fmtDate, fmtDateTime, toNum, downloadCSV,
  LeaveLedgerEntry, LeaveTypeLite, LEAVE_TRANSACTION_TYPES,
} from "../shared"

const TX_COLOR: Record<string, string> = {
  OpeningBalance: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Accrual: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  ManualCredit: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  ManualDebit: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  LeaveApplied: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  LeaveApproved: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  LeaveCancelled: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  LeaveRejected: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  CarryForward: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Encashment: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Lapse: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  PayrollAdjustment: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Migration: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
}

export function LedgerSection() {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [empF, setEmpF] = React.useState<string>("all")
  const [ltF, setLtF] = React.useState<string>("all")
  const [txF, setTxF] = React.useState<string>("all")
  const [fromDate, setFromDate] = React.useState<string>(fmtDateISO(startOfMonth))
  const [toDate, setToDate] = React.useState<string>(fmtDateISO(today))

  const { data: employees } = useAsync<{ label: string; value: string }[]>(
    () => fetchJson("/api/employees/picker?limit=500").catch(() => []),
    [],
  )
  const { data: leaveTypes } = useAsync<LeaveTypeLite[]>(
    () => fetchJson("/api/leave-types").catch(() => [] as LeaveTypeLite[]),
    [],
  )

  const params = new URLSearchParams()
  if (empF !== "all") params.set("employeeId", empF)
  if (ltF !== "all") params.set("leaveTypeId", ltF)
  if (txF !== "all") params.set("transactionType", txF)
  if (fromDate) params.set("fromDate", fromDate)
  if (toDate) params.set("toDate", toDate)

  const { data, loading, error } = useAsync<LeaveLedgerEntry[]>(
    () => fetchJson(`/api/leave-ledger?${params.toString()}`).catch(() => []),
    [empF, ltF, txF, fromDate, toDate],
  )

  const rows = data || []

  function exportCsv() {
    const csv = rows.map((r) => ({
      Date: fmtDate(r.transactionDate),
      Employee: empName(r.employee),
      LeaveType: r.leaveType?.name || "",
      TxType: r.transactionType,
      Credit: toNum(r.credit),
      Debit: toNum(r.debit),
      BalanceAfter: toNum(r.balanceAfter),
      Reference: r.referenceType || "",
      Remarks: r.remarks || "",
      CreatedBy: r.createdBy || "",
    }))
    downloadCSV("leave-ledger.csv", csv)
    toast.success("Exported CSV")
  }

  const totalCredit = rows.reduce((s, r) => s + toNum(r.credit), 0)
  const totalDebit = rows.reduce((s, r) => s + toNum(r.debit), 0)

  const columns: Column<LeaveLedgerEntry>[] = [
    {
      key: "date", header: "Date",
      render: (r) => <span className="text-xs">{fmtDate(r.transactionDate)}</span>,
    },
    {
      key: "employee", header: "Employee", className: "min-w-[180px]",
      render: (r) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[9px] font-semibold">
            {empInitials(r.employee)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{empName(r.employee)}</p>
            <p className="text-[10px] text-muted-foreground">{r.employee?.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "lt", header: "Leave Type",
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: r.leaveType?.color || "#10b981" }} />
          <span className="text-sm">{r.leaveType?.name || "—"}</span>
        </div>
      ),
    },
    {
      key: "tx", header: "Tx Type",
      render: (r) => <Badge variant="secondary" className={`text-[10px] font-medium border-0 ${TX_COLOR[r.transactionType] || "bg-muted"}`}>{r.transactionType}</Badge>,
    },
    { key: "credit", header: "Credit", render: (r) => <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">{toNum(r.credit) > 0 ? `+${toNum(r.credit).toFixed(1)}` : "—"}</span> },
    { key: "debit", header: "Debit", render: (r) => <span className="tabular-nums text-rose-600 dark:text-rose-400 font-medium">{toNum(r.debit) > 0 ? `−${toNum(r.debit).toFixed(1)}` : "—"}</span> },
    { key: "bal", header: "Balance", render: (r) => <span className="tabular-nums text-sm font-medium">{toNum(r.balanceAfter).toFixed(1)}</span> },
    { key: "ref", header: "Reference", render: (r) => <span className="text-xs text-muted-foreground">{r.referenceType || "—"}</span> },
    { key: "rem", header: "Remarks", render: (r) => <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{r.remarks || "—"}</span> },
    { key: "by", header: "Created By", render: (r) => <span className="text-xs text-muted-foreground">{r.createdBy || "—"}</span> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Leave Ledger</h2>
          <p className="text-sm text-muted-foreground">Immutable transaction log with running balances.</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Transactions" value={rows.length} icon={BookOpen} accent="emerald" sub="Matching filters" />
        <StatCard label="Total Credit" value={`+${totalCredit.toFixed(1)}`} icon={BookOpen} accent="emerald" sub="Days credited" />
        <StatCard label="Total Debit" value={`−${totalDebit.toFixed(1)}`} icon={BookOpen} accent="coral" sub="Days debited" />
      </div>

      {/* Filters */}
      <SectionCard title="Filters" action={<Filter className="h-4 w-4 text-muted-foreground" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
          <Select value={empF} onValueChange={setEmpF}>
            <SelectTrigger className="h-9"><SelectValue placeholder="All employees" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {(employees || []).map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ltF} onValueChange={setLtF}>
            <SelectTrigger className="h-9"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leave Types</SelectItem>
              {(leaveTypes || []).map((lt) => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={txF} onValueChange={setTxF}>
            <SelectTrigger className="h-9"><SelectValue placeholder="All tx types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tx Types</SelectItem>
              {LEAVE_TRANSACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9" />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9" />
        </div>
      </SectionCard>

      {loading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : error ? (
        <SectionCard title="Leave Ledger"><EmptyState icon={BookOpen} title="Unable to load ledger" description="Please try again later." /></SectionCard>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          emptyState={<EmptyState icon={BookOpen} title="No transactions" description="Adjust filters to see ledger entries." />}
        />
      )}
    </div>
  )
}

function fmtDateISO(d: Date): string {
  try { return fmtIso(d, "yyyy-MM-dd") } catch { return "" }
}
