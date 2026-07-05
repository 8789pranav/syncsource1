'use client'

import * as React from "react"
import { toast } from "sonner"
import { Users, Check, X, Eye } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { SectionCard, EmptyState, StatusBadge } from "@/components/hrms/ui"
import {
  fetchJson, sendJson, useAsync, empName, empInitials, fmtDate,
  LeaveApplication, EmployeeLite,
} from "../shared"
import { ApplicationDetails } from "./my-leave"

// ============================================================
// Manager view — pick a "manager" employee, show their reports' leaves
// Since we don't have auth/manager context, we just list ALL pending
// applications and let the user pick which employee they are acting as.
// ============================================================

export function TeamLeaveSection() {
  const { data: employees, loading: empLoading } = useAsync<{ label: string; value: string }[]>(
    () => fetchJson("/api/employees/picker?limit=500"),
  )
  const [managerId, setManagerId] = React.useState<string>("")
  React.useEffect(() => { if (!managerId && employees?.length) setManagerId(employees[0].value) }, [employees, managerId])

  // Load all applications; we'll filter to those where employee.reportingManagerId === managerId
  const { data: allApps, loading, reload } = useAsync<LeaveApplication[]>(
    () => fetchJson("/api/leave-applications"),
    [],
  )

  // Best-effort: enrich each app's employee with reportingManagerId via /api/employees?id=
  // For now, we use what the API returns. If no reportingManagerId is included,
  // we just show all pending apps as "team queue".
  const pendingApps = (allApps || []).filter((a) => a.status === "Pending")
  const onLeaveToday = (allApps || []).filter((a) => {
    if (a.status !== "Approved") return false
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const f = new Date(a.fromDate), t = new Date(a.toDate)
    return today >= f && today <= t
  })

  const [decision, setDecision] = React.useState<{ app: LeaveApplication; action: "Approved" | "Rejected" } | null>(null)
  const [comment, setComment] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [viewApp, setViewApp] = React.useState<LeaveApplication | null>(null)

  async function submit() {
    if (!decision) return
    setSubmitting(true)
    try {
      await sendJson(`/api/leave-applications/${decision.app.id}`, {
        status: decision.action, action: decision.action === "Approved" ? "Approve" : "Reject",
        comment, decisionComment: comment,
      }, "PATCH")
      toast.success(`Leave ${decision.action.toLowerCase()}`)
      setDecision(null); setComment("")
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Team Leave</h2>
          <p className="text-sm text-muted-foreground">Manager view — pending approvals & team availability.</p>
        </div>
        <Select value={managerId} onValueChange={setManagerId} disabled={empLoading}>
          <SelectTrigger className="w-[240px] h-9">
            <SelectValue placeholder="Acting as manager" />
          </SelectTrigger>
          <SelectContent>
            {(employees || []).map((e) => (
              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pending approvals */}
      <SectionCard title="Pending Approvals" description={`${pendingApps.length} request(s) awaiting your action`}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : pendingApps.length === 0 ? (
          <EmptyState icon={Check} title="No pending approvals" description="You're all caught up." />
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto [scrollbar-width:thin] pr-1">
            {pendingApps.map((a) => (
              <Card key={a.id} className="border-border/60">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {empInitials(a.employee)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{empName(a.employee)}</p>
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: a.leaveType?.color || "#10b981" }} />
                      <span className="text-xs text-muted-foreground">{a.leaveType?.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(a.fromDate)} → {fmtDate(a.toDate)} · {a.days}d{a.halfDay ? " (½)" : ""}
                    </p>
                    {a.reason && <p className="text-xs text-muted-foreground truncate mt-0.5">“{a.reason}”</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setViewApp(a)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-rose-600 hover:text-rose-700 gap-1" onClick={() => setDecision({ app: a, action: "Rejected" })}>
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button size="sm" className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => setDecision({ app: a, action: "Approved" })}>
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Team availability */}
      <SectionCard title="Team Availability" description="Who's on leave today">
        {onLeaveToday.length === 0 ? (
          <EmptyState icon={Users} title="Everyone's in today" description="No team members on approved leave today." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {onLeaveToday.map((a) => (
              <Card key={a.id} className="border-border/60">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {empInitials(a.employee)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{empName(a.employee)}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ background: a.leaveType?.color || "#10b981" }} />
                      {a.leaveType?.name} · {a.halfDay ? "Half day" : "Full day"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 text-[10px]">
                    On Leave
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Decision dialog */}
      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {decision?.action === "Approved" ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-rose-600" />}
              {decision?.action === "Approved" ? "Approve Leave" : "Reject Leave"}
            </DialogTitle>
            <DialogDescription>
              {decision && (
                <>
                  {empName(decision.app.employee)} · {decision.app.leaveType?.name} · {fmtDate(decision.app.fromDate)} → {fmtDate(decision.app.toDate)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="comment">Comment {decision?.action === "Rejected" && <span className="text-rose-500">*</span>}</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment for the employee…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDecision(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={submitting || (decision?.action === "Rejected" && !comment.trim())}
              onClick={submit}
              className={decision?.action === "Approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
            >
              {submitting ? "Saving…" : decision?.action === "Approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewApp} onOpenChange={(o) => !o && setViewApp(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>Submitted on {fmtDate(viewApp?.appliedAt)}</DialogDescription>
          </DialogHeader>
          {viewApp && <ApplicationDetails app={viewApp} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
