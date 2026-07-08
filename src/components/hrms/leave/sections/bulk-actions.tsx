'use client'

import { apiFetch } from "@/lib/api-client"

import * as React from "react"
import { toast } from "sonner"
import {
  Layers, CheckCheck, XCircle, Ban, SlidersHorizontal, ShieldCheck,
  Repeat, Banknote, Download, Upload, ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { SectionCard, EmptyState } from "@/components/hrms/ui"
import {
  fetchJson, sendJson, useAsync, empName, toNum,
  LeaveTypeLite, LeavePolicy,
} from "../shared"

type ActionKind = "approve" | "reject" | "cancel" | "adjustBalance" | "assignPolicy" | "carryForward" | "encash" | "export"

const ACTION_META: Record<ActionKind, { icon: any; title: string; description: string; accent: string }> = {
  approve: { icon: CheckCheck, title: "Bulk Approve", description: "Approve multiple pending leave requests in one click.", accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400" },
  reject: { icon: XCircle, title: "Bulk Reject", description: "Reject multiple pending leave requests with a comment.", accent: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400" },
  cancel: { icon: Ban, title: "Bulk Cancel", description: "Cancel approved or pending leave requests.", accent: "from-slate-500/15 to-slate-500/5 text-slate-600 dark:text-slate-400" },
  adjustBalance: { icon: SlidersHorizontal, title: "Adjust Balance", description: "Credit or debit leave balances for one or many employees.", accent: "from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400" },
  assignPolicy: { icon: ShieldCheck, title: "Assign Policy", description: "Assign a leave rule/policy to multiple employees.", accent: "from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-400" },
  carryForward: { icon: Repeat, title: "Carry Forward", description: "Run year-end carry forward processing for all employees.", accent: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400" },
  encash: { icon: Banknote, title: "Bulk Encash", description: "Submit encashment requests for multiple employees.", accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400" },
  export: { icon: Download, title: "Export", description: "Download leave data — requests, balances, ledger — as CSV.", accent: "from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400" },
}

export function BulkActionsSection() {
  const [openAction, setOpenAction] = React.useState<ActionKind | null>(null)
  const cards = Object.keys(ACTION_META) as ActionKind[]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Bulk Actions</h2>
        <p className="text-sm text-muted-foreground">Operations hub — perform bulk actions across multiple employees and leave requests.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((k) => {
          const meta = ACTION_META[k]
          const Icon = meta.icon
          return (
            <Card key={k} className="border-border/60 shadow-soft hover:shadow-card transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${meta.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{meta.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-xs gap-1" onClick={() => setOpenAction(k)}>
                      Go <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Import Leave Balance (special card) */}
      <ImportLeaveBalanceCard />

      {openAction && (
        <BulkDialog action={openAction} onClose={() => setOpenAction(null)} />
      )}
    </div>
  )
}

function ImportLeaveBalanceCard() {
  const [open, setOpen] = React.useState(false)
  const [text, setText] = React.useState("")
  const [parsed, setParsed] = React.useState<Array<{ employeeCode: string; leaveTypeCode: string; amount: number; type: string; reason?: string }>>([])
  const [submitting, setSubmitting] = React.useState(false)

  function parse() {
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    const rows: typeof parsed = []
    for (const ln of lines) {
      const parts = ln.split(",").map((s) => s.trim())
      if (parts.length < 4) continue
      rows.push({
        employeeCode: parts[0],
        leaveTypeCode: parts[1],
        type: parts[2],
        amount: Number(parts[3]),
        reason: parts[4],
      })
    }
    setParsed(rows)
    if (rows.length === 0) toast.error("No valid rows parsed (format: code,leaveType,Credit|Debit,amount,reason)")
    else toast.success(`Parsed ${rows.length} row(s)`)
  }

  async function submit() {
    if (parsed.length === 0) { toast.error("Nothing to import"); return }
    setSubmitting(true)
    let ok = 0, fail = 0
    try {
      for (const r of parsed) {
        try {
          await sendJson("/api/leave-bulk", {
            action: "adjustBalance",
            ids: [],
            payload: { employeeCode: r.employeeCode, leaveTypeCode: r.leaveTypeCode, adjustmentType: r.type, amount: r.amount, reason: r.reason || "Bulk import" },
          })
          ok++
        } catch { fail++ }
      }
      toast.success(`Imported ${ok} adjustment(s)${fail ? `, ${fail} failed` : ""}`)
      setOpen(false); setText(""); setParsed([])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SectionCard
      title="Import Leave Balance Adjustments"
      description="Bulk upload credits/debits via CSV paste"
      action={<Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setOpen(true)}><Upload className="h-3.5 w-3.5" /> Import</Button>}
    >
      <p className="text-sm text-muted-foreground">
        Format: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">employeeCode,leaveTypeCode,Credit|Debit,amount,reason</code>
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-emerald-500" /> Import Leave Balance Adjustments</DialogTitle>
            <DialogDescription>Paste CSV rows below. Each row = one adjustment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">CSV rows</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder={"EMP-0001,CL,Credit,2,Year-end bonus\nEMP-0002,SL,Debit,1,Correction"}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={parse}>Parse & Preview</Button>
              <Button size="sm" variant="ghost" onClick={() => setText("EMP-0001,CL,Credit,2,Year-end bonus\nEMP-0002,SL,Debit,1,Correction\nEMP-0003,PL,Credit,5,Migration")}>Load Sample</Button>
            </div>
            {parsed.length > 0 && (
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <div className="max-h-48 overflow-y-auto [scrollbar-width:thin]">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-semibold text-muted-foreground">Emp Code</th>
                        <th className="text-left p-2 font-semibold text-muted-foreground">Leave Type</th>
                        <th className="text-left p-2 font-semibold text-muted-foreground">Type</th>
                        <th className="text-right p-2 font-semibold text-muted-foreground">Amount</th>
                        <th className="text-left p-2 font-semibold text-muted-foreground">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.map((r, i) => (
                        <tr key={i} className="border-t border-border/40">
                          <td className="p-2 font-mono">{r.employeeCode}</td>
                          <td className="p-2 font-mono">{r.leaveTypeCode}</td>
                          <td className="p-2">
                            <Badge variant="secondary" className={`text-[10px] border-0 ${r.type === "Credit" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"}`}>{r.type}</Badge>
                          </td>
                          <td className="p-2 text-right tabular-nums">{r.amount}</td>
                          <td className="p-2 text-muted-foreground truncate max-w-[200px]">{r.reason || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={submitting || parsed.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? "Importing…" : `Import ${parsed.length} row(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  )
}

function BulkDialog({ action, onClose }: { action: ActionKind; onClose: () => void }) {
  const meta = ACTION_META[action]
  const Icon = meta.icon
  const [reason, setReason] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  // For approve/reject/cancel — select pending apps
  // For adjustBalance — pick employee + leave type
  // For assignPolicy — pick policy
  // For carryForward — year
  // For encash — employee + leave type + days
  // For export — format selector

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Icon className="h-5 w-5" /> {meta.title}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>
        <BulkDialogBody action={action} reason={reason} setReason={setReason} submitting={submitting} setSubmitting={setSubmitting} onDone={onClose} />
      </DialogContent>
    </Dialog>
  )
}

function BulkDialogBody({
  action, reason, setReason, submitting, setSubmitting, onDone,
}: {
  action: ActionKind
  reason: string
  setReason: (v: string) => void
  submitting: boolean
  setSubmitting: (v: boolean) => void
  onDone: () => void
}) {
  // Carry forward: select year + button
  const year = new Date().getFullYear()
  const [yearF, setYearF] = React.useState(String(year))

  // adjustBalance: employee + leaveType + amount + type
  const { data: employees } = useAsync<{ label: string; value: string }[]>(
    () => fetchJson("/api/employees/picker?limit=500").catch(() => []),
    [],
  )
  const { data: leaveTypes } = useAsync<LeaveTypeLite[]>(
    () => fetchJson("/api/leave-types").catch(() => []),
    [],
  )
  const { data: policies } = useAsync<LeavePolicy[]>(
    () => fetchJson("/api/leave-policies").catch(() => []),
    [],
  )

  const [empId, setEmpId] = React.useState("")
  const [ltId, setLtId] = React.useState("")
  const [adjType, setAdjType] = React.useState<"Credit" | "Debit">("Credit")
  const [amount, setAmount] = React.useState("1")
  const [policyId, setPolicyId] = React.useState("")

  async function runBulk() {
    setSubmitting(true)
    try {
      if (action === "carryForward") {
        const res = await sendJson<{ updated?: number; total?: number }>("/api/leave-bulk", { action: "carryForward", ids: [], payload: { year: Number(yearF) } })
        toast.success(`Carry forward: ${res.updated || res.total || 0} processed`)
      } else if (action === "adjustBalance") {
        if (!empId || !ltId || !amount) { toast.error("All fields required"); setSubmitting(false); return }
        await sendJson("/api/leave-bulk", { action: "adjustBalance", ids: [empId], payload: { leaveTypeId: ltId, adjustmentType: adjType, amount: Number(amount), reason: reason || "Bulk adjustment" } })
        toast.success("Balance adjusted")
      } else if (action === "assignPolicy") {
        if (!policyId) { toast.error("Select a policy"); setSubmitting(false); return }
        await sendJson("/api/leave-bulk", { action: "assignPolicy", ids: [], payload: { policyId } })
        toast.success("Policy assigned to applicable employees")
      } else if (action === "export") {
        const r = await apiFetch("/api/leave-reports?type=balance&format=csv")
        if (!r.ok) throw new Error("Export failed")
        const blob = await r.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url; a.download = "leave-balances.csv"; a.click()
        URL.revokeObjectURL(url)
        toast.success("Exported CSV")
      } else {
        // approve/reject/cancel/encash — operate on all pending apps
        const res = await sendJson<{ updated?: number; total?: number }>("/api/leave-bulk", { action, ids: [], reason })
        toast.success(`Bulk ${action}: ${res.updated || res.total || 0} processed`)
      }
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {(action === "approve" || action === "reject" || action === "cancel" || action === "encash") && (
        <p className="text-sm text-muted-foreground">
          This will apply to <b>all currently pending leave requests</b>. To select specific requests, use the <i>Leave Requests</i> section.
        </p>
      )}
      {action === "carryForward" && (
        <div>
          <Label className="text-xs">Year to process</Label>
          <Select value={yearF} onValueChange={setYearF}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[year, year - 1, year - 2].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {action === "adjustBalance" && (
        <>
          <div>
            <Label className="text-xs">Employee</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {(employees || []).map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Leave Type</Label>
            <Select value={ltId} onValueChange={setLtId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select leave type" /></SelectTrigger>
              <SelectContent>
                {(leaveTypes || []).map((lt) => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={adjType} onValueChange={(v) => setAdjType(v as any)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Credit">Credit (+)</SelectItem>
                  <SelectItem value="Debit">Debit (−)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Amount (days)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" />
            </div>
          </div>
        </>
      )}
      {action === "assignPolicy" && (
        <div>
          <Label className="text-xs">Policy</Label>
          <Select value={policyId} onValueChange={setPolicyId}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select policy" /></SelectTrigger>
            <SelectContent>
              {(policies || []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">The policy will be applied to all employees matching its applicability rules.</p>
        </div>
      )}
      {action !== "export" && action !== "assignPolicy" && action !== "carryForward" && (
        <div>
          <Label className="text-xs">Reason / Comment</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Optional reason…" />
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onDone}>Cancel</Button>
        <Button size="sm" onClick={runBulk} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
          {submitting ? "Processing…" : "Run"}
        </Button>
      </DialogFooter>
    </div>
  )
}
