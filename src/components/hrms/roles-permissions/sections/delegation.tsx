'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Send, Plus, Pencil, Trash2, MoreHorizontal, Ban, Calendar, ArrowRight, User,
} from "lucide-react"

import { PageHeader, StatCard, DataTable, EmptyState, type Column } from "@/components/hrms/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DELEGATION_TYPES, APPROVAL_MODULES } from "@/lib/permissions-constants"

interface Employee { id: string; employeeCode: string; firstName?: string; lastName?: string; displayName?: string }
interface Delegation {
  id: string; fromEmployeeId: string; toEmployeeId: string; delegationType: string;
  module: string | null; permissionScope: string | null;
  startDate: string; endDate: string; reason: string | null;
  approvalRequired: boolean; status: string; computedStatus: string;
  fromEmployee: Employee; toEmployee: Employee;
}

function empName(e: Employee) { return e.displayName || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "—" }
function initials(e: Employee) { return (empName(e).split(" ").slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("")) || "?" }
function daysBetween(a: string, b: string) { return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000) }

const DELEG_COLORS: Record<string, string> = {
  ApprovalDelegation: "bg-emerald-500", TaskDelegation: "bg-sky-500",
  TemporaryRole: "bg-amber-500", ReadOnlyAccess: "bg-slate-500",
}
const STATUS_COLORS: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700", Pending: "bg-amber-100 text-amber-700",
  Expired: "bg-slate-100 text-slate-600", Revoked: "bg-rose-100 text-rose-700",
}

export function DelegationSection() {
  const [items, setItems] = React.useState<Delegation[]>([])
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState("")
  const [filterType, setFilterType] = React.useState("")
  const [editOpen, setEditOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Delegation | null>(null)
  const [revokeTarget, setRevokeTarget] = React.useState<Delegation | null>(null)
  const [saving, setSaving] = React.useState(false)

  const [form, setForm] = React.useState({
    fromEmployeeId: "", toEmployeeId: "", delegationType: "ApprovalDelegation",
    module: "", permissionScope: "", startDate: new Date().toISOString().slice(0, 10),
    endDate: "", reason: "", approvalRequired: false,
  })

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus && filterStatus !== "__all__") params.set("status", filterStatus)
      if (filterType && filterType !== "__all__") params.set("delegationType", filterType)
      if (search) params.set("q", search)
      const [dr, er] = await Promise.all([
        fetch(`/api/roles-permissions/delegations?${params}`),
        fetch(`/api/roles-permissions/users`),
      ])
      if (dr.ok) setItems((await dr.json()).items)
      if (er.ok) {
        const data = await er.json()
        setEmployees(data.items.map((u: any) => ({ id: u.id, employeeCode: u.employeeCode, firstName: u.firstName, lastName: u.lastName, displayName: u.displayName })))
      }
    } finally { setLoading(false) }
  }, [search, filterStatus, filterType])

  React.useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ fromEmployeeId: "", toEmployeeId: "", delegationType: "ApprovalDelegation", module: "", permissionScope: "", startDate: new Date().toISOString().slice(0, 10), endDate: "", reason: "", approvalRequired: false })
    setEditOpen(true)
  }

  const save = async () => {
    if (!form.fromEmployeeId || !form.toEmployeeId) { toast.error("Select both employees"); return }
    if (form.fromEmployeeId === form.toEmployeeId) { toast.error("Cannot delegate to self"); return }
    if (!form.startDate || !form.endDate) { toast.error("Start and end dates required"); return }
    setSaving(true)
    try {
      const url = editing ? `/api/roles-permissions/delegations/${editing.id}` : `/api/roles-permissions/delegations`
      const method = editing ? "PATCH" : "POST"
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, module: form.module === "__all__" ? "" : form.module, performedByName: "HR Admin" }) })
      if (r.ok) {
        toast.success(editing ? "Delegation updated" : "Delegation created")
        setEditOpen(false); load()
      } else { const e = await r.json(); toast.error(e.error || "Failed") }
    } finally { setSaving(false) }
  }

  const revoke = async () => {
    if (!revokeTarget) return
    const r = await fetch(`/api/roles-permissions/delegations/${revokeTarget.id}/revoke`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ performedByName: "HR Admin" }) })
    if (r.ok) { toast.success("Delegation revoked"); setRevokeTarget(null); load() }
  }

  const columns: Column<Delegation>[] = [
    {
      key: "from", header: "From", width: "180px",
      render: (d) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 border"><AvatarFallback className="bg-sky-500/10 text-sky-600 text-[10px] font-semibold">{initials(d.fromEmployee)}</AvatarFallback></Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{empName(d.fromEmployee)}</p>
            <p className="text-[9px] text-muted-foreground font-mono">{d.fromEmployee.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "arrow", header: "", width: "40px",
      render: () => <ArrowRight className="h-4 w-4 text-muted-foreground" />,
    },
    {
      key: "to", header: "To", width: "180px",
      render: (d) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 border"><AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-[10px] font-semibold">{initials(d.toEmployee)}</AvatarFallback></Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{empName(d.toEmployee)}</p>
            <p className="text-[9px] text-muted-foreground font-mono">{d.toEmployee.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "type", header: "Type",
      render: (d) => <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-white ${DELEG_COLORS[d.delegationType] || "bg-slate-500"}`}>{d.delegationType.replace(/([A-Z])/g, " $1").trim()}</span>,
    },
    { key: "module", header: "Module", render: (d) => <span className="text-xs">{d.module ? <Badge variant="outline" className="text-[10px] capitalize">{d.module}</Badge> : <span className="text-muted-foreground">All</span>}</span> },
    {
      key: "period", header: "Period",
      render: (d) => (
        <div className="text-xs">
          <p>{new Date(d.startDate).toLocaleDateString()} → {new Date(d.endDate).toLocaleDateString()}</p>
          <p className="text-[9px] text-muted-foreground">{daysBetween(d.startDate, d.endDate)} day(s)</p>
        </div>
      ),
    },
    {
      key: "status", header: "Status",
      render: (d) => <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[d.computedStatus] || "bg-muted"}`}>{d.computedStatus}</span>,
    },
    {
      key: "actions", header: "", width: "50px",
      render: (d) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => { setEditing(d); setForm({ fromEmployeeId: d.fromEmployeeId, toEmployeeId: d.toEmployeeId, delegationType: d.delegationType, module: d.module || "", permissionScope: d.permissionScope || "", startDate: d.startDate.slice(0, 10), endDate: d.endDate.slice(0, 10), reason: d.reason || "", approvalRequired: d.approvalRequired }); setEditOpen(true) }}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</DropdownMenuItem>
            {d.computedStatus === "Active" && <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => setRevokeTarget(d)}><Ban className="mr-2 h-3.5 w-3.5" /> Revoke</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  // Stats
  const now = new Date()
  const active = items.filter(d => d.computedStatus === "Active").length
  const upcoming = items.filter(d => d.computedStatus === "Active" && new Date(d.startDate) > now && new Date(d.startDate).getTime() - now.getTime() < 7 * 86400000).length
  const expired = items.filter(d => d.computedStatus === "Expired").length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Active Delegations" value={active} icon={Send} accent="cyan" sub="Currently in effect" />
        <StatCard label="Upcoming (7 days)" value={upcoming} icon={Calendar} accent="emerald" sub="Starting soon" />
        <StatCard label="Expired (30 days)" value={expired} icon={Ban} accent="amber" sub="Auto-expired" />
      </div>

      <PageHeader
        title="Delegation"
        description="Temporarily delegate permissions when a manager or admin is on leave. Supports approval, task, temporary role and read-only access delegation."
        icon={Send}
        actions={<Button size="sm" className="gap-1.5 bg-gradient-to-r from-cyan-500 to-sky-500" onClick={openCreate}><Plus className="h-4 w-4" /> Create Delegation</Button>}
      />

      <div className="flex flex-wrap gap-2">
        <div className="flex-1 max-w-xs"><Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 bg-background" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
            <SelectItem value="Revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Types</SelectItem>
            {DELEGATION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Send} title="No delegations" description="Create a delegation to temporarily transfer permissions." action={<Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="h-4 w-4" /> Create</Button>} />
      ) : (
        <DataTable columns={columns} rows={items} />
      )}

      {/* Edit/Create Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-3 border-b border-border/60">
            <SheetTitle className="flex items-center gap-2"><Send className="h-4 w-4 text-cyan-500" /> {editing ? "Edit Delegation" : "Create Delegation"}</SheetTitle>
            <SheetDescription>Transfer permissions from one user to another temporarily</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">From User *</Label>
                <Select value={form.fromEmployeeId} onValueChange={(v) => setForm({ ...form, fromEmployeeId: v })} disabled={!!editing}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{empName(e)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To User *</Label>
                <Select value={form.toEmployeeId} onValueChange={(v) => setForm({ ...form, toEmployeeId: v })} disabled={!!editing}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{empName(e)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Delegation Type</Label>
                <Select value={form.delegationType} onValueChange={(v) => setForm({ ...form, delegationType: v })} disabled={!!editing}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DELEGATION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Module (or All)</Label>
                <Select value={form.module} onValueChange={(v) => setForm({ ...form, module: v })} disabled={!!editing}>
                  <SelectTrigger><SelectValue placeholder="All Modules" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Modules</SelectItem>
                    {APPROVAL_MODULES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Start Date *</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} disabled={!!editing} /></div>
              <div className="space-y-1.5"><Label className="text-xs">End Date *</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} disabled={!!editing} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Reason</Label><Textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. On annual leave" /></div>
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={form.approvalRequired} onCheckedChange={(c) => setForm({ ...form, approvalRequired: !!c })} id="appr" />
              <label htmlFor="appr">Requires approval (status = Pending)</label>
            </label>
          </div>
          <div className="p-4 border-t border-border/60 bg-muted/30 flex justify-end gap-2 sticky bottom-0">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gap-1.5 bg-gradient-to-r from-cyan-500 to-sky-500">{saving ? "Saving..." : "Save Delegation"}</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Revoke confirm */}
      <Dialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600"><Ban className="h-4 w-4" /> Revoke Delegation</DialogTitle>
            <DialogDescription>
              Revoke the delegation from <strong>{revokeTarget && empName(revokeTarget.fromEmployee)}</strong> to <strong>{revokeTarget && empName(revokeTarget.toEmployee)}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={revoke} className="gap-1.5"><Ban className="h-4 w-4" /> Revoke</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
