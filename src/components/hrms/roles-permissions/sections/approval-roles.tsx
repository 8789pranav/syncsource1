'use client'

import { apiFetch } from "@/lib/api-client"

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  GitBranch, Plus, Pencil, Trash2, Copy, MoreHorizontal, Layers, Shield, User,
} from "lucide-react"

import { PageHeader, StatCard, DataTable, EmptyState, SectionCard, type Column } from "@/components/hrms/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
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
import {
  APPROVAL_MODULES, APPROVAL_TYPES, APPROVER_TYPES, STATUS_OPTIONS,
} from "@/lib/permissions-constants"

interface ApprovalRole {
  id: string; name: string; code: string; module: string;
  approvalType: string; approverType: string; approverRef: string | null;
  scopeType: string | null; scopeRef: string | null; level: number; mode: string;
  fallbackApproverId: string | null; escalationApproverId: string | null; escalationAfterHours: number | null;
  status: string; createdAt: string; updatedAt: string;
}

const MODULE_COLORS: Record<string, string> = {
  leave: "bg-emerald-500", attendance: "bg-cyan-500", onboarding: "bg-violet-500",
  offboarding: "bg-rose-500", payroll: "bg-amber-500", salaryRevision: "bg-orange-500",
  document: "bg-sky-500", expense: "bg-fuchsia-500", asset: "bg-teal-500", helpdesk: "bg-slate-500",
}

export function ApprovalRolesSection() {
  const [items, setItems] = React.useState<ApprovalRole[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [filterModule, setFilterModule] = React.useState("")
  const [groupByModule, setGroupByModule] = React.useState(true)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ApprovalRole | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ApprovalRole | null>(null)
  const [saving, setSaving] = React.useState(false)

  const [form, setForm] = React.useState({
    name: "", code: "", module: "leave", approvalType: "Approver", approverType: "ReportingManager",
    approverRef: "", scopeType: "Global", scopeRef: "", level: 1, mode: "Sequential",
    fallbackApproverId: "", escalationApproverId: "", escalationAfterHours: 48,
    status: "Active",
  })

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (filterModule && filterModule !== "__all__") params.set("module", filterModule)
      const r = await apiFetch(`/api/roles-permissions/approval-roles?${params}`)
      if (r.ok) setItems((await r.json()).items)
    } finally { setLoading(false) }
  }, [search, filterModule])

  React.useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", code: "", module: "leave", approvalType: "Approver", approverType: "ReportingManager", approverRef: "", scopeType: "Global", scopeRef: "", level: 1, mode: "Sequential", fallbackApproverId: "", escalationApproverId: "", escalationAfterHours: 48, status: "Active" })
    setEditOpen(true)
  }
  const openEdit = (r: ApprovalRole) => {
    setEditing(r)
    setForm({
      name: r.name, code: r.code, module: r.module, approvalType: r.approvalType, approverType: r.approverType,
      approverRef: r.approverRef || "", scopeType: r.scopeType || "Global", scopeRef: r.scopeRef || "",
      level: r.level, mode: r.mode, fallbackApproverId: r.fallbackApproverId || "",
      escalationApproverId: r.escalationApproverId || "", escalationAfterHours: r.escalationAfterHours || 48, status: r.status,
    })
    setEditOpen(true)
  }

  const save = async () => {
    if (!form.name || !form.code) { toast.error("Name and code required"); return }
    setSaving(true)
    try {
      const url = editing ? `/api/roles-permissions/approval-roles/${editing.id}` : `/api/roles-permissions/approval-roles`
      const method = editing ? "PATCH" : "POST"
      const r = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, performedByName: "HR Admin" }) })
      if (r.ok) {
        toast.success(editing ? "Approval role updated" : "Approval role created")
        setEditOpen(false); load()
      } else { const e = await r.json(); toast.error(e.error || "Failed") }
    } finally { setSaving(false) }
  }

  const clone = async (r: ApprovalRole) => {
    const r2 = await apiFetch(`/api/roles-permissions/approval-roles`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...r, name: `${r.name} (Copy)`, code: `${r.code}_COPY`, performedByName: "HR Admin" }),
    })
    if (r2.ok) { toast.success("Cloned"); load() }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const r = await apiFetch(`/api/roles-permissions/approval-roles/${deleteTarget.id}`, { method: "DELETE" })
    if (r.ok) { toast.success("Deleted"); setDeleteTarget(null); load() }
  }

  // Group by module
  const grouped = React.useMemo(() => {
    if (!groupByModule) return null
    const g: Record<string, ApprovalRole[]> = {}
    for (const it of items) { if (!g[it.module]) g[it.module] = []; g[it.module].push(it) }
    return g
  }, [items, groupByModule])

  const columns: Column<ApprovalRole>[] = [
    {
      key: "name", header: "Approval Role", width: "240px",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className={`grid h-8 w-8 place-items-center rounded-lg ${MODULE_COLORS[r.module] || "bg-slate-500"} text-white`}>
            <GitBranch className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="font-medium text-sm">{r.name}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{r.code}</p>
          </div>
        </div>
      ),
    },
    { key: "module", header: "Module", render: (r) => <Badge variant="outline" className="text-[10px] capitalize">{r.module}</Badge> },
    { key: "approvalType", header: "Type", render: (r) => <span className="text-xs">{r.approvalType}</span> },
    {
      key: "approverType", header: "Approver",
      render: (r) => (
        <div className="text-xs">
          <p>{r.approverType}</p>
          {r.approverRef && <p className="text-[10px] text-muted-foreground">→ {r.approverRef}</p>}
        </div>
      ),
    },
    { key: "level", header: "Level", render: (r) => <Badge variant="secondary" className="text-[10px]">L{r.level}</Badge> },
    { key: "mode", header: "Mode", render: (r) => <span className="text-xs">{r.mode}</span> },
    {
      key: "status", header: "Status",
      render: (r) => <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${r.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{r.status}</span>,
    },
    {
      key: "actions", header: "", width: "50px",
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => openEdit(r)}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => clone(r)}><Copy className="mr-2 h-3.5 w-3.5" /> Clone</DropdownMenuItem>
            <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => setDeleteTarget(r)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Approval Roles" value={items.length} icon={GitBranch} accent="emerald" sub="Defined" />
        <StatCard label="Active" value={items.filter(r => r.status === "Active").length} icon={Shield} accent="cyan" sub="In use" />
        <StatCard label="Multi-Level" value={items.filter(r => r.level > 1).length} icon={Layers} accent="amber" sub="L2+ approvals" />
        <StatCard label="With Fallback" value={items.filter(r => r.fallbackApproverId).length} icon={User} accent="rose" sub="Resilient" />
      </div>

      <PageHeader
        title="Approval Roles"
        description="Define who can approve what, at which level, with fallback approvers and escalation rules."
        icon={GitBranch}
        actions={
          <>
            <Button size="sm" variant="outline" className="gap-1.5 hover:-translate-y-0.5 hover:shadow-md hover:border-violet-300 hover:text-violet-600 transition-all" onClick={() => setGroupByModule(g => !g)}>
              <Layers className="h-4 w-4" /> {groupByModule ? "Flat View" : "Group by Module"}
            </Button>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:shadow-md hover:shadow-teal-500/25 hover:-translate-y-0.5 transition-all" onClick={openCreate}><Plus className="h-4 w-4" /> Create</Button>
          </>
        }
      />

      <div className="flex gap-2">
        <div className="flex-1 max-w-xs"><Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 bg-background focus-visible:ring-violet-400/40" /></div>
        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="All Modules" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Modules</SelectItem>
            {APPROVAL_MODULES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={GitBranch} title="No approval roles" description="Create approval roles to define who approves what." action={<Button size="sm" className="gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:shadow-md hover:shadow-teal-500/25 hover:-translate-y-0.5 transition-all" onClick={openCreate}><Plus className="h-4 w-4" /> Create</Button>} />
      ) : grouped ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([mod, rs]) => (
            <SectionCard key={mod} title={`${mod.charAt(0).toUpperCase() + mod.slice(1)} Approvals`} description={`${rs.length} role(s)`} className="transition-shadow hover:shadow-md">
              <DataTable columns={columns.filter(c => c.key !== "module")} rows={rs} onRowClick={(r) => openEdit(r)} />
            </SectionCard>
          ))}
        </div>
      ) : (
        <DataTable columns={columns} rows={items} onRowClick={(r) => openEdit(r)} />
      )}

      {/* Edit/Create Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-3 border-b border-border/60">
            <SheetTitle className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-emerald-500" /> {editing ? "Edit Approval Role" : "Create Approval Role"}</SheetTitle>
            <SheetDescription>{editing ? editing.name : "Define an approval routing rule"}</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })} className="font-mono" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Module</Label>
                <Select value={form.module} onValueChange={(v) => setForm({ ...form, module: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{APPROVAL_MODULES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Approval Type</Label>
                <Select value={form.approvalType} onValueChange={(v) => setForm({ ...form, approvalType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{APPROVAL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Approver Type</Label>
                <Select value={form.approverType} onValueChange={(v) => setForm({ ...form, approverType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{APPROVER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Approver Reference</Label>
                <Input value={form.approverRef} onChange={(e) => setForm({ ...form, approverRef: e.target.value })} placeholder="Employee ID or Role ID" disabled={["ReportingManager", "DepartmentHead"].includes(form.approverType)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Level</Label><Input type="number" min={1} value={form.level} onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) || 1 })} /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mode</Label>
                <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Sequential">Sequential</SelectItem><SelectItem value="Parallel">Parallel</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Escalation (hrs)</Label><Input type="number" value={form.escalationAfterHours} onChange={(e) => setForm({ ...form, escalationAfterHours: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <Card className="bg-muted/30">
              <CardContent className="p-3 space-y-2">
                <div className="space-y-1.5"><Label className="text-xs">Fallback Approver ID</Label><Input value={form.fallbackApproverId} onChange={(e) => setForm({ ...form, fallbackApproverId: e.target.value })} placeholder="Employee ID" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Escalation Approver ID</Label><Input value={form.escalationApproverId} onChange={(e) => setForm({ ...form, escalationApproverId: e.target.value })} placeholder="Employee ID" /></div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Scope Type</Label>
                <Select value={form.scopeType} onValueChange={(v) => setForm({ ...form, scopeType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Global">Global</SelectItem><SelectItem value="Entity">Entity</SelectItem><SelectItem value="Department">Department</SelectItem><SelectItem value="Location">Location</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-border/60 bg-muted/30 flex justify-end gap-2 sticky bottom-0">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-500">{saving ? "Saving..." : "Save"}</Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600"><Trash2 className="h-4 w-4" /> Delete Approval Role</DialogTitle>
            <DialogDescription>Delete <strong>{deleteTarget?.name}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="gap-1.5"><Trash2 className="h-4 w-4" /> Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
