'use client'

import * as React from "react"
import { toast } from "sonner"
import { Repeat, Play, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Column, DataTable, EmptyState, SectionCard, StatCard } from "@/components/hrms/ui"
import {
  fetchJson, sendJson, useAsync, empName, empInitials, fmtDate, fmtDateTime, toNum,
  LeaveCarryForwardLog, LeaveTypeLite, LeavePolicy,
} from "../shared"

export function CarryForwardSection() {
  const year = new Date().getFullYear()
  const [yearF, setYearF] = React.useState<string>(String(year))
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const { data: logs, loading, reload } = useAsync<LeaveCarryForwardLog[]>(
    () => fetchJson("/api/leave-reports?type=carryforward&fromDate=" + yearF + "-01-01&toDate=" + yearF + "-12-31").then((r: any) => r.items || r || []).catch(() => []),
    [yearF],
  )
  const { data: leaveTypes } = useAsync<LeaveTypeLite[]>(
    () => fetchJson("/api/leave-types").catch(() => [] as LeaveTypeLite[]),
    [],
  )
  const { data: policies } = useAsync<LeavePolicy[]>(
    () => fetchJson("/api/leave-policies").catch(() => [] as LeavePolicy[]),
    [],
  )

  const cfTypes = (leaveTypes || []).filter((lt) => (lt as any).carryForward)

  async function process() {
    setSubmitting(true)
    try {
      const res = await sendJson<{ updated?: number; total?: number }>("/api/leave-bulk", {
        action: "carryForward", ids: [], payload: { year: Number(yearF) },
      })
      toast.success(`Carry forward processed: ${res.updated || res.total || 0} employee(s)`)
      setConfirmOpen(false); reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to process")
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<LeaveCarryForwardLog>[] = [
    {
      key: "emp", header: "Employee", className: "min-w-[180px]",
      render: (l) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
            {empInitials(l.employee)}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{empName(l.employee)}</p>
            <p className="text-xs text-muted-foreground">{l.employee?.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "lt", header: "Leave Type",
      render: (l) => (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: l.leaveType?.color || "#10b981" }} />
          <span className="text-sm">{l.leaveType?.name || "—"}</span>
        </div>
      ),
    },
    { key: "fy", header: "From Year", render: (l) => <span className="tabular-nums">{l.fromYear}</span> },
    { key: "ty", header: "To Year", render: (l) => <span className="tabular-nums">{l.toYear}</span> },
    { key: "cf", header: "Carried", render: (l) => <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">+{toNum(l.carriedForward).toFixed(1)}</span> },
    { key: "lap", header: "Lapsed", render: (l) => <span className="tabular-nums text-rose-600 dark:text-rose-400 font-medium">−{toNum(l.lapsed).toFixed(1)}</span> },
    { key: "enc", header: "Encashed", render: (l) => <span className="tabular-nums text-amber-600 dark:text-amber-400 font-medium">{toNum(l.encashed).toFixed(1)}</span> },
    { key: "proc", header: "Processed At", render: (l) => <span className="text-xs text-muted-foreground">{fmtDateTime(l.processedAt)}</span> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Carry Forward</h2>
          <p className="text-sm text-muted-foreground">Year-end carry forward processing for leave balances.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={yearF} onValueChange={setYearF}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[year, year - 1, year - 2].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700" onClick={() => setConfirmOpen(true)}>
            <Play className="h-4 w-4" /> Process {yearF}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Year" value={yearF} icon={Repeat} accent="emerald" sub="Processing year" />
        <StatCard label="CF Types" value={cfTypes.length} icon={Repeat} accent="cyan" sub="Allow carry forward" />
        <StatCard label="Logs" value={logs?.length || 0} icon={RefreshCw} accent="amber" sub="Processed records" />
        <StatCard label="Policies" value={policies?.length || 0} icon={Repeat} accent="emerald" sub="Active rules" />
      </div>

      {/* Rules summary */}
      <SectionCard title="Carry Forward Rules" description="Per-leave-type carry forward configuration">
        {cfTypes.length === 0 ? (
          <EmptyState icon={Repeat} title="No carry-forwardable leave types" description="Enable 'Carry Forward' on leave types to see rules here." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {cfTypes.map((lt) => (
              <Card key={lt.id} className="border-border/60">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-3 w-3 rounded shrink-0" style={{ background: lt.color || "#10b981" }} />
                    <p className="font-medium text-sm">{lt.name}</p>
                    <Badge variant="secondary" className="ml-auto text-[10px] border-0 bg-muted text-muted-foreground font-mono">{lt.code}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>Max CF: <b className="text-foreground">{(lt as any).carryForwardLimit ?? "Unlimited"}</b></span>
                    <span>Encash: <b className="text-foreground">{(lt as any).encashment ? "Yes" : "No"}</b></span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Processing log */}
      <SectionCard title="Carry Forward Log" description="History of processed carry forwards">
        {loading ? <Skeleton className="h-48 w-full" /> : (
          <DataTable
            columns={columns}
            rows={logs || []}
            emptyState={<EmptyState icon={Repeat} title="No carry forward logs" description="Run a process to see logs here." />}
          />
        )}
      </SectionCard>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Play className="h-5 w-5 text-emerald-500" /> Process Carry Forward for {yearF}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will compute carry forwards for all eligible employees, lapping balances that exceed limits. The operation cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={process} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? "Processing…" : "Process"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
