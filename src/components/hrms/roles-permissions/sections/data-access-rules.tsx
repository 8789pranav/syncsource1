'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Filter, Plus, Pencil, Trash2, Copy, Eye, MoreHorizontal, Users,
} from "lucide-react"

import { PageHeader, StatCard, DataTable, EmptyState, SectionCard, type Column } from "@/components/hrms/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { DATA_SCOPES, STATUS_OPTIONS, parseJsonArray } from "@/lib/permissions-constants"

interface Rule {
  id: string; name: string; code: string; description: string | null;
  entityId: string | null; branchIds: string | null; locationIds: string | null;
  departmentIds: string | null; gradeIds: string | null; designationIds: string | null;
  employeeTypeIds: string | null; managerRelation: string | null;
  includeEmployees: string | null; excludeEmployees: string | null;
  includeFutureJoiners: boolean; includeExited: boolean; includeNotice: boolean;
  status: string; createdAt: string; updatedAt: string;
  _count?: { dataScopes: number }
}

function scopeSummary(r: Rule): string {
  const parts: string[] = []
  const d = parseJsonArray(r.departmentIds)
  const l = parseJsonArray(r.locationIds)
  const b = parseJsonArray(r.branchIds)
  if (r.managerRelation) parts.push(r.managerRelation)
  if (r.entityId) parts.push(`Entity: ${r.entityId}`)
  if (b.length) parts.push(`${b.length} branch(es)`)
  if (l.length) parts.push(`${l.length} location(s)`)
  if (d.length) parts.push(`${d.length} dept(s)`)
  if (r.includeExited) parts.push("+ Exited")
  if (r.includeNotice) parts.push("+ On Notice")
  if (parts.length === 0) return "All employees"
  return parts.join(" · ")
}

export function DataAccessRulesSection() {
  const [rules, setRules] = React.useState<Rule[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState("")
  const [editOpen, setEditOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Rule | null>(null)
  const [previewRule, setPreviewRule] = React.useState<Rule | null>(null)
  const [previewData, setPreviewData] = React.useState<{ employees: any[]; total: number } | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Rule | null>(null)
  const [saving, setSaving] = React.useState(false)

  const [form, setForm] = React.useState({
    name: "", code: "", description: "", status: "Active",
    managerRelation: "", entityId: "",
    departmentIds: "", locationIds: "", branchIds: "",
    includeExited: false, includeNotice: false, includeFutureJoiners: false,
  })

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (filterStatus && filterStatus !== "__all__") params.set("status", filterStatus)
      const r = await fetch(`/api/roles-permissions/data-access-rules?${params}`)
      if (r.ok) setRules((await r.json()).items)
    } finally { setLoading(false) }
  }, [search, filterStatus])

  React.useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", code: "", description: "", status: "Active", managerRelation: "", entityId: "", departmentIds: "", locationIds: "", branchIds: "", includeExited: false, includeNotice: false, includeFutureJoiners: false })
    setEditOpen(true)
  }
  const openEdit = (r: Rule) => {
    setEditing(r)
    setForm({
      name: r.name, code: r.code, description: r.description || "", status: r.status,
      managerRelation: r.managerRelation || "", entityId: r.entityId || "",
      departmentIds: parseJsonArray(r.departmentIds).join(", "),
      locationIds: parseJsonArray(r.locationIds).join(", "),
      branchIds: parseJsonArray(r.branchIds).join(", "),
      includeExited: r.includeExited, includeNotice: r.includeNotice, includeFutureJoiners: r.includeFutureJoiners,
    })
    setEditOpen(true)
  }

  const save = async () => {
    if (!form.name || !form.code) { toast.error("Name and code required"); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        managerRelation: form.managerRelation === "__all__" ? "" : form.managerRelation,
        departmentIds: form.departmentIds ? form.departmentIds.split(",").map(s => s.trim()).filter(Boolean) : [],
        locationIds: form.locationIds ? form.locationIds.split(",").map(s => s.trim()).filter(Boolean) : [],
        branchIds: form.branchIds ? form.branchIds.split(",").map(s => s.trim()).filter(Boolean) : [],
        performedByName: "HR Admin",
      }
      const url = editing ? `/api/roles-permissions/data-access-rules/${editing.id}` : `/api/roles-permissions/data-access-rules`
      const method = editing ? "PATCH" : "POST"
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (r.ok) {
        toast.success(editing ? "Rule updated" : "Rule created")
        setEditOpen(false)
        load()
      } else {
        const e = await r.json(); toast.error(e.error || "Failed")
      }
    } finally { setSaving(false) }
  }

  const clone = async (r: Rule) => {
    const r2 = await fetch(`/api/roles-permissions/data-access-rules`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...r, name: `${r.name} (Copy)`, code: `${r.code}_COPY`, performedByName: "HR Admin" }),
    })
    if (r2.ok) { toast.success("Rule cloned"); load() }
  }

  const viewPreview = async (r: Rule) => {
    setPreviewRule(r); setPreviewData(null)
    const pr = await fetch(`/api/roles-permissions/data-access-rules/${r.id}/preview`)
    if (pr.ok) setPreviewData(await pr.json())
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const r = await fetch(`/api/roles-permissions/data-access-rules/${deleteTarget.id}`, { method: "DELETE" })
    if (r.ok) { toast.success("Rule deleted"); setDeleteTarget(null); load() }
    else { const e = await r.json(); toast.error(e.error || "Failed") }
  }

  const columns: Column<Rule>[] = [
    {
      key: "name", header: "Rule", width: "240px",
      render: (r) => (
        <div>
          <p className="font-medium text-sm">{r.name}</p>
          <p className="text-[10px] text-muted-foreground font-mono">{r.code}</p>
        </div>
      ),
    },
    { key: "description", header: "Description", render: (r) => <span className="text-xs text-muted-foreground truncate">{r.description || "—"}</span> },
    { key: "scope", header: "Scope", render: (r) => <span className="text-xs">{scopeSummary(r)}</span> },
    { key: "linked", header: "Linked Roles", render: (r) => <span className="text-sm font-medium">{r._count?.dataScopes || 0}</span> },
    {
      key: "status", header: "Status",
      render: (r) => <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${r.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{r.status}</span>,
    },
    {
      key: "actions", header: "", width: "60px",
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => viewPreview(r)}><Eye className="mr-2 h-3.5 w-3.5" /> Preview Employees</DropdownMenuItem>
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Rules" value={rules.length} icon={Filter} accent="rose" sub="Reusable scopes" />
        <StatCard label="Active" value={rules.filter(r => r.status === "Active").length} icon={Filter} accent="emerald" sub="In use" />
        <StatCard label="Linked to Roles" value={rules.filter(r => (r._count?.dataScopes || 0) > 0).length} icon={Users} accent="cyan" sub="In production" />
      </div>

      <PageHeader
        title="Data Access Rules"
        description="Reusable data scopes that control which employee records a role can see. Link them to roles for fine-grained row-level access."
        icon={Filter}
        actions={<Button size="sm" className="gap-1.5 bg-gradient-to-r from-rose-500 to-pink-500" onClick={openCreate}><Plus className="h-4 w-4" /> Create Rule</Button>}
      />

      <div className="flex gap-2">
        <div className="flex-1 max-w-xs"><Input placeholder="Search rules..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 bg-background" /></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : rules.length === 0 ? (
        <EmptyState icon={Filter} title="No data access rules" description="Create reusable data scopes to control row-level access." action={<Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="h-4 w-4" /> Create Rule</Button>} />
      ) : (
        <DataTable columns={columns} rows={rules} onRowClick={(r) => viewPreview(r)} />
      )}

      {/* Edit/Create Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-3 border-b border-border/60">
            <SheetTitle className="flex items-center gap-2"><Filter className="h-4 w-4 text-rose-500" /> {editing ? "Edit Rule" : "Create Data Access Rule"}</SheetTitle>
            <SheetDescription>{editing ? `Editing ${editing.name}` : "Define a reusable data scope"}</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Rule Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })} className="font-mono" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

            <div className="pt-2 border-t border-border/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Scope Definition</p>
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Manager Relationship</Label>
                  <Select value={form.managerRelation} onValueChange={(v) => setForm({ ...form, managerRelation: v })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">None</SelectItem>
                      <SelectItem value="Self">Self</SelectItem>
                      <SelectItem value="DirectReports">Direct Reports</SelectItem>
                      <SelectItem value="DirectIndirectReports">Direct + Indirect Reports</SelectItem>
                      <SelectItem value="DottedLine">Dotted Line Reports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Entity ID</Label>
                  <Input value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })} placeholder="Entity ID or leave blank for all" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5"><Label className="text-xs">Department IDs</Label><Input value={form.departmentIds} onChange={(e) => setForm({ ...form, departmentIds: e.target.value })} placeholder="comma-sep" className="text-[11px]" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Location IDs</Label><Input value={form.locationIds} onChange={(e) => setForm({ ...form, locationIds: e.target.value })} placeholder="comma-sep" className="text-[11px]" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Branch IDs</Label><Input value={form.branchIds} onChange={(e) => setForm({ ...form, branchIds: e.target.value })} placeholder="comma-sep" className="text-[11px]" /></div>
                </div>
                <Card className="bg-muted/30">
                  <CardContent className="p-3 space-y-2">
                    <label className="flex items-center justify-between text-xs"><span>Include Future Joiners</span><Switch checked={form.includeFutureJoiners} onCheckedChange={(c) => setForm({ ...form, includeFutureJoiners: !!c })} /></label>
                    <label className="flex items-center justify-between text-xs"><span>Include Exited Employees</span><Switch checked={form.includeExited} onCheckedChange={(c) => setForm({ ...form, includeExited: !!c })} /></label>
                    <label className="flex items-center justify-between text-xs"><span>Include On-Notice Employees</span><Switch checked={form.includeNotice} onCheckedChange={(c) => setForm({ ...form, includeNotice: !!c })} /></label>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-4 border-t border-border/60 bg-muted/30 flex justify-end gap-2 sticky bottom-0">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gap-1.5 bg-gradient-to-r from-rose-500 to-pink-500">{saving ? "Saving..." : "Save Rule"}</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Preview Dialog */}
      <Dialog open={!!previewRule} onOpenChange={(o) => !o && setPreviewRule(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> {previewRule?.name}</DialogTitle>
            <DialogDescription>{previewRule ? scopeSummary(previewRule) : ""}</DialogDescription>
          </DialogHeader>
          {!previewData ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Sample employees in scope (showing {previewData.employees.length} of {previewData.total}):</p>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {previewData.employees.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-2 rounded-lg border border-border/40 p-2 text-xs">
                    <div className="grid h-7 w-7 place-items-center rounded bg-rose-500/10 text-rose-600 text-[10px] font-semibold">
                      {(e.firstName?.[0] || "?") + (e.lastName?.[0] || "")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{e.displayName || `${e.firstName} ${e.lastName}`}</p>
                      <p className="text-[10px] text-muted-foreground">{e.employeeCode} · {e.department?.name || "—"}</p>
                    </div>
                  </div>
                ))}
                {previewData.employees.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No employees match this scope.</p>}
              </div>
              <div className="mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                Total matching: <strong>{previewData.total}</strong> employee(s)
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600"><Trash2 className="h-4 w-4" /> Delete Rule</DialogTitle>
            <DialogDescription>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</DialogDescription>
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
