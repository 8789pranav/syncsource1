'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  UserCog, Plus, Eye, Check, X, Ban, Clock, AlertCircle, Calendar,
} from "lucide-react"

import { PageHeader, StatCard, DataTable, EmptyState, type Column } from "@/components/hrms/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs"
import {
  ACCESS_REQUEST_TYPES, ACCESS_REQUEST_STATUSES, MODULES,
} from "@/lib/permissions-constants"

interface Employee { id: string; employeeCode: string; firstName?: string; lastName?: string; displayName?: string }
interface Role { id: string; name: string; code: string }
interface AccessRequest {
  id: string; requestedById: string; requestType: string;
  requestedRole: string | null; requestedModule: string | null;
  reason: string | null; requiredFrom: string; requiredTo: string | null;
  approverId: string | null; status: string; approverComments: string | null;
  createdAt: string;
  requestedBy: Employee | null; approver: Employee | null; approvedBy: Employee | null;
}

function empName(e: Employee | null) { return e ? (e.displayName || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "—") : "—" }
function initials(e: Employee | null) { if (!e) return "?"; return (empName(e).split(" ").slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("")) || "?" }

const STATUS_STYLES: Record<string, string> = Object.fromEntries(ACCESS_REQUEST_STATUSES.map(s => [s.value, s.color]))
const TYPE_LABELS: Record<string, string> = Object.fromEntries(ACCESS_REQUEST_TYPES.map(t => [t.value, t.label]))

export function AccessRequestsSection() {
  const [items, setItems] = React.useState<AccessRequest[]>([])
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [roles, setRoles] = React.useState<Role[]>([])
  const [loading, setLoading] = React.useState(true)
  const [tab, setTab] = React.useState("all")
  const [filterType, setFilterType] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [viewTarget, setViewTarget] = React.useState<AccessRequest | null>(null)
  const [approveTarget, setApproveTarget] = React.useState<AccessRequest | null>(null)
  const [approveMode, setApproveMode] = React.useState<"approve" | "reject">("approve")
  const [comments, setComments] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const [form, setForm] = React.useState({
    requestedById: "", requestType: "NewRole", requestedRole: "", requestedModule: "",
    requiredFrom: new Date().toISOString().slice(0, 10), requiredTo: "", reason: "", approverId: "",
  })

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType && filterType !== "__all__") params.set("requestType", filterType)
      if (tab === "pending") params.set("status", "PendingApproval")
      const [ar, ur, rr] = await Promise.all([
        fetch(`/api/roles-permissions/access-requests?${params}`),
        fetch(`/api/roles-permissions/users`),
        fetch(`/api/roles-permissions/roles`),
      ])
      if (ar.ok) setItems((await ar.json()).items)
      if (ur.ok) setEmployees((await ur.json()).items.map((u: any) => ({ id: u.id, employeeCode: u.employeeCode, firstName: u.firstName, lastName: u.lastName, displayName: u.displayName })))
      if (rr.ok) setRoles((await rr.json()).items)
    } finally { setLoading(false) }
  }, [filterType, tab])

  React.useEffect(() => { load() }, [load])

  const openCreate = () => {
    setForm({ requestedById: "", requestType: "NewRole", requestedRole: "", requestedModule: "", requiredFrom: new Date().toISOString().slice(0, 10), requiredTo: "", reason: "", approverId: "" })
    setCreateOpen(true)
  }

  const save = async () => {
    if (!form.requestedById || !form.reason) { toast.error("Requester and reason required"); return }
    setSaving(true)
    try {
      const r = await fetch(`/api/roles-permissions/access-requests`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (r.ok) {
        toast.success("Access request submitted")
        setCreateOpen(false); load()
      } else { const e = await r.json(); toast.error(e.error || "Failed") }
    } finally { setSaving(false) }
  }

  const approve = async () => {
    if (!approveTarget) return
    setSaving(true)
    try {
      const url = `/api/roles-permissions/access-requests/${approveTarget.id}/${approveMode}`
      const r = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverComments: comments, approvedByName: "HR Admin" }),
      })
      if (r.ok) {
        toast.success(approveMode === "approve" ? "Request approved" : "Request rejected")
        setApproveTarget(null); setComments(""); load()
      }
    } finally { setSaving(false) }
  }

  const revoke = async (r: AccessRequest) => {
    const rr = await fetch(`/api/roles-permissions/access-requests/${r.id}/revoke`, { method: "POST" })
    if (rr.ok) { toast.success("Revoked"); load() }
  }

  const columns: Column<AccessRequest>[] = [
    {
      key: "requestedBy", header: "Requested By", width: "180px",
      render: (r) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 border"><AvatarFallback className="bg-fuchsia-500/10 text-fuchsia-600 text-[10px] font-semibold">{initials(r.requestedBy)}</AvatarFallback></Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{empName(r.requestedBy)}</p>
            <p className="text-[9px] text-muted-foreground font-mono">{r.requestedBy?.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "type", header: "Type",
      render: (r) => <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[r.requestType] || r.requestType}</Badge>,
    },
    {
      key: "target", header: "Request",
      render: (r) => (
        <div className="text-xs">
          {r.requestedRole && <p>Role: <span className="font-medium">{roles.find(x => x.id === r.requestedRole)?.name || r.requestedRole}</span></p>}
          {r.requestedModule && <p>Module: <span className="font-medium">{MODULES.find(m => m.id === r.requestedModule)?.label || r.requestedModule}</span></p>}
          {!r.requestedRole && !r.requestedModule && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      key: "period", header: "Period",
      render: (r) => (
        <div className="text-xs">
          <p>{new Date(r.requiredFrom).toLocaleDateString()}</p>
          {r.requiredTo && <p className="text-[9px] text-muted-foreground">→ {new Date(r.requiredTo).toLocaleDateString()}</p>}
        </div>
      ),
    },
    { key: "approver", header: "Approver", render: (r) => <span className="text-xs">{empName(r.approver)}</span> },
    {
      key: "status", header: "Status",
      render: (r) => <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[r.status] || "bg-muted"}`}>{r.status}</span>,
    },
    {
      key: "actions", header: "", width: "120px",
      render: (r) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setViewTarget(r) }}><Eye className="h-3.5 w-3.5" /></Button>
          {r.status === "PendingApproval" && (
            <>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700" onClick={(e) => { e.stopPropagation(); setApproveTarget(r); setApproveMode("approve"); setComments("") }}><Check className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" onClick={(e) => { e.stopPropagation(); setApproveTarget(r); setApproveMode("reject"); setComments("") }}><X className="h-3.5 w-3.5" /></Button>
            </>
          )}
          {r.status === "Approved" && <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={(e) => { e.stopPropagation(); revoke(r) }}><Ban className="h-3.5 w-3.5" /></Button>}
        </div>
      ),
    },
  ]

  // Stats
  const pending = items.filter(r => r.status === "PendingApproval").length
  const approved = items.filter(r => r.status === "Approved").length
  const rejected = items.filter(r => r.status === "Rejected").length
  const expiringSoon = items.filter(r => r.requiredTo && new Date(r.requiredTo).getTime() - Date.now() < 7 * 86400000 && r.status === "Approved").length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Approval" value={pending} icon={Clock} accent="amber" sub="Awaiting review" />
        <StatCard label="Approved" value={approved} icon={Check} accent="emerald" sub="All time" />
        <StatCard label="Rejected" value={rejected} icon={X} accent="coral" sub="All time" />
        <StatCard label="Expiring Soon" value={expiringSoon} icon={AlertCircle} accent="fuchsia" sub="Next 7 days" />
      </div>

      <PageHeader
        title="Access Requests"
        description="Users can request new roles, temporary access, module access, report access or document access. Approvers review and approve/reject."
        icon={UserCog}
        actions={<Button size="sm" className="gap-1.5 bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:shadow-md hover:shadow-fuchsia-500/25 hover:-translate-y-0.5 transition-all" onClick={openCreate}><Plus className="h-4 w-4" /> New Request</Button>}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="pending">Pending My Approval ({pending})</TabsTrigger>
          <TabsTrigger value="mine">My Requests</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-3 space-y-3">
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9 w-[200px] focus-visible:ring-violet-400/40"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                {ACCESS_REQUEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : items.length === 0 ? (
            <EmptyState icon={UserCog} title="No access requests" description="Submit a new request to get started." action={<Button size="sm" className="gap-1.5 bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:shadow-md hover:shadow-fuchsia-500/25 hover:-translate-y-0.5 transition-all" onClick={openCreate}><Plus className="h-4 w-4" /> New Request</Button>} />
          ) : (
            <DataTable columns={columns} rows={items} onRowClick={(r) => setViewTarget(r)} />
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCog className="h-4 w-4 text-fuchsia-500" /> New Access Request</DialogTitle>
            <DialogDescription>Request additional access — approver will be notified.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Requested By *</Label>
                <Select value={form.requestedById} onValueChange={(v) => setForm({ ...form, requestedById: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{empName(e)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Request Type *</Label>
                <Select value={form.requestType} onValueChange={(v) => setForm({ ...form, requestType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCESS_REQUEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {form.requestType === "NewRole" || form.requestType === "TemporaryAccess" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Requested Role</Label>
                <Select value={form.requestedRole} onValueChange={(v) => setForm({ ...form, requestedRole: v })}>
                  <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                  <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : null}

            {form.requestType === "ModuleAccess" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Requested Module</Label>
                <Select value={form.requestedModule} onValueChange={(v) => setForm({ ...form, requestedModule: v })}>
                  <SelectTrigger><SelectValue placeholder="Select module..." /></SelectTrigger>
                  <SelectContent>{MODULES.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {form.requestType === "ReportAccess" || form.requestType === "DocumentAccess" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Specify (report/document name)</Label>
                <Input value={form.requestedModule} onChange={(e) => setForm({ ...form, requestedModule: e.target.value })} placeholder="e.g. Payroll Summary Q3" />
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Required From *</Label><Input type="date" value={form.requiredFrom} onChange={(e) => setForm({ ...form, requiredFrom: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Required To</Label><Input type="date" value={form.requiredTo} onChange={(e) => setForm({ ...form, requiredTo: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Approver</Label>
              <Select value={form.approverId} onValueChange={(v) => setForm({ ...form, approverId: v })}>
                <SelectTrigger><SelectValue placeholder="Default to HR Admin" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{empName(e)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason *</Label>
              <Textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why do you need this access?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gap-1.5 bg-gradient-to-r from-fuchsia-500 to-pink-500">{saving ? "Submitting..." : "Submit Request"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> Access Request</DialogTitle>
            <DialogDescription>{viewTarget && TYPE_LABELS[viewTarget.requestType]}</DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-xs text-muted-foreground">Requested By:</span> <span className="font-medium">{empName(viewTarget.requestedBy)}</span></div>
                <div><span className="text-xs text-muted-foreground">Status:</span> <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[viewTarget.status]}`}>{viewTarget.status}</span></div>
                <div><span className="text-xs text-muted-foreground">From:</span> <span>{new Date(viewTarget.requiredFrom).toLocaleDateString()}</span></div>
                <div><span className="text-xs text-muted-foreground">To:</span> <span>{viewTarget.requiredTo ? new Date(viewTarget.requiredTo).toLocaleDateString() : "—"}</span></div>
                <div><span className="text-xs text-muted-foreground">Approver:</span> <span>{empName(viewTarget.approver)}</span></div>
                <div><span className="text-xs text-muted-foreground">Approved By:</span> <span>{empName(viewTarget.approvedBy) || "—"}</span></div>
              </div>
              <div className="rounded-lg border border-border/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">Reason</p>
                <p className="text-sm">{viewTarget.reason || "—"}</p>
              </div>
              {viewTarget.approverComments && (
                <div className="rounded-lg border border-border/40 p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Approver Comments</p>
                  <p className="text-sm">{viewTarget.approverComments}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {approveMode === "approve" ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-rose-500" />}
              {approveMode === "approve" ? "Approve Request" : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {approveTarget && TYPE_LABELS[approveTarget.requestType]} from {approveTarget && empName(approveTarget.requestedBy)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Approver Comments</Label>
            <Textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Optional comments..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button
              variant={approveMode === "approve" ? "default" : "destructive"}
              onClick={approve} disabled={saving}
              className={`gap-1.5 ${approveMode === "approve" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : ""}`}
            >
              {saving ? "Processing..." : approveMode === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
