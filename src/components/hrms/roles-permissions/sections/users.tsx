'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Users, UserCog, Plus, Shield, X, Eye, Lock, Unlock, Key, History,
  CheckCircle2, XCircle, AlertCircle, Sparkles,
} from "lucide-react"

import { PageHeader, StatCard, ListToolbar, DataTable, EmptyState, SectionCard, type Column } from "@/components/hrms/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs"
import {
  ROLE_TYPE_MAP, ACCESS_LEVEL_MAP, MODULE_MAP, DATA_SCOPES, FIELD_ACCESS,
  SENSITIVE_FIELDS, maskValue,
} from "@/lib/permissions-constants"

interface EmployeeUser {
  id: string; employeeCode: string; firstName?: string; lastName?: string; displayName?: string;
  workEmail?: string; department?: string | null; designation?: string | null; entity?: string | null;
  status: string; roles: { id: string; name: string; code: string; roleType: string; isTemporary: boolean; effectiveFrom: string; effectiveTo: string | null }[];
  roleCount: number;
}
interface Role { id: string; name: string; code: string; roleType: string }
interface EffectivePerm {
  employee: { id: string; employeeCode: string; firstName?: string; lastName?: string; displayName?: string; workEmail?: string; department?: { name: string } | null; designation?: { name: string } | null }
  roles: { id: string; name: string; code: string; roleType: string }[]
  moduleAccess: Record<string, { accessLevel: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean; canApprove: boolean; canExport: boolean; reason: string }>
  fieldAccess: Record<string, Record<string, string>>
  dataScopes: any[]
  deniedModules: string[]
  allowedModules: string[]
  conflicts: { module: string; field?: string; details: string }[]
}

function empName(e: { firstName?: string; lastName?: string; displayName?: string }) {
  return e.displayName || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "—"
}
function initials(e: { firstName?: string; lastName?: string; displayName?: string }) {
  const n = empName(e)
  return n.split(" ").slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("") || "?"
}

export function UsersSection() {
  const [users, setUsers] = React.useState<EmployeeUser[]>([])
  const [roles, setRoles] = React.useState<Role[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [filterHasRole, setFilterHasRole] = React.useState("")

  const [assignOpen, setAssignOpen] = React.useState(false)
  const [assignTarget, setAssignTarget] = React.useState<EmployeeUser | null>(null)
  const [effectiveTarget, setEffectiveTarget] = React.useState<EmployeeUser | null>(null)
  const [effective, setEffective] = React.useState<EffectivePerm | null>(null)
  const [effectiveLoading, setEffectiveLoading] = React.useState(false)

  // Assign form
  const [form, setForm] = React.useState({ roleId: "", scopeType: "All", effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: "", isTemporary: false, reason: "" })

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (filterHasRole && filterHasRole !== "__all__") params.set("hasRole", filterHasRole)
      const [ur, rr] = await Promise.all([
        fetch(`/api/roles-permissions/users?${params}`),
        fetch(`/api/roles-permissions/roles`),
      ])
      if (ur.ok) setUsers((await ur.json()).items)
      if (rr.ok) setRoles((await rr.json()).items)
    } finally { setLoading(false) }
  }, [search, filterHasRole])

  React.useEffect(() => { load() }, [load])

  const openAssign = (u: EmployeeUser) => {
    setAssignTarget(u)
    setForm({ roleId: "", scopeType: "All", effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: "", isTemporary: false, reason: "" })
    setAssignOpen(true)
  }

  const submitAssign = async () => {
    if (!assignTarget || !form.roleId) { toast.error("Select a role"); return }
    const r = await fetch(`/api/roles-permissions/users/${assignTarget.id}/roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, performedByName: "HR Admin" }),
    })
    if (r.ok) {
      toast.success(`Role assigned to ${empName(assignTarget)}`)
      setAssignOpen(false)
      load()
    } else {
      const e = await r.json()
      toast.error(e.error || "Failed")
    }
  }

  const removeRole = async (userId: string, roleId: string, roleName: string) => {
    const r = await fetch(`/api/roles-permissions/users/${userId}/roles/${roleId}`, { method: "DELETE" })
    if (r.ok) {
      toast.success(`Role "${roleName}" removed`)
      load()
    }
  }

  const viewEffective = async (u: EmployeeUser) => {
    setEffectiveTarget(u)
    setEffective(null)
    setEffectiveLoading(true)
    const r = await fetch(`/api/roles-permissions/users/${u.id}/effective`)
    if (r.ok) setEffective(await r.json())
    setEffectiveLoading(false)
  }

  const columns: Column<EmployeeUser>[] = [
    {
      key: "employee", header: "Employee", width: "240px",
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="bg-violet-500/10 text-violet-600 text-[10px] font-semibold">{initials(u)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{empName(u)}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{u.employeeCode}</p>
          </div>
        </div>
      ),
    },
    { key: "department", header: "Department", render: (u) => <span className="text-xs">{u.department || "—"}</span> },
    { key: "designation", header: "Designation", render: (u) => <span className="text-xs">{u.designation || "—"}</span> },
    {
      key: "roles", header: "Assigned Roles",
      render: (u) => (
        <div className="flex flex-wrap gap-1 max-w-md">
          {u.roles.length === 0 ? <span className="text-xs text-muted-foreground italic">No roles assigned</span> :
            u.roles.map(r => {
              const t = ROLE_TYPE_MAP[r.roleType] || ROLE_TYPE_MAP.Custom
              return (
                <span key={r.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-white ${t.color}`}>
                  {r.isTemporary && <span className="h-1 w-1 rounded-full bg-white/80" />}
                  {r.name}
                </span>
              )
            })
          }
        </div>
      ),
    },
    {
      key: "status", header: "Status",
      render: (u) => <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${u.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{u.status}</span>,
    },
    {
      key: "actions", header: "", width: "180px",
      render: (u) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={(e) => { e.stopPropagation(); openAssign(u) }}>
            <Plus className="h-3 w-3" /> Role
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={(e) => { e.stopPropagation(); viewEffective(u) }} disabled={u.roleCount === 0}>
            <Eye className="h-3 w-3" /> Effective
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={users.length} icon={Users} accent="cyan" sub="In scope" />
        <StatCard label="With Roles" value={users.filter(u => u.roleCount > 0).length} icon={Shield} accent="emerald" sub="Have ≥1 role" />
        <StatCard label="Without Roles" value={users.filter(u => u.roleCount === 0).length} icon={UserCog} accent="amber" sub="Need assignment" />
        <StatCard label="Temporary Access" value={users.filter(u => u.roles.some(r => r.isTemporary)).length} icon={Key} accent="coral" sub="Time-bound" />
      </div>

      <PageHeader
        title="Users & Role Assignments"
        description="Assign one or more roles to each employee. The system calculates effective permissions automatically."
        icon={Users}
        actions={
          <Button size="sm" variant="outline" className="gap-1.5 hover:-translate-y-0.5 hover:shadow-md hover:border-violet-300 hover:text-violet-600 transition-all" onClick={() => toast.info("Use the row 'Role' button to assign")}>
            <Plus className="h-4 w-4" /> Bulk Assign
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 max-w-xs">
          <Input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 bg-background focus-visible:ring-violet-400/40" />
        </div>
        <Select value={filterHasRole} onValueChange={setFilterHasRole}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="All Employees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Employees</SelectItem>
            <SelectItem value="yes">Has Role</SelectItem>
            <SelectItem value="no">No Role</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try a different search." action={<Button size="sm" className="gap-1.5 bg-gradient-to-r from-violet-500 to-emerald-500 hover:shadow-md hover:shadow-violet-500/25 hover:-translate-y-0.5 transition-all" onClick={() => toast.info("Use the row 'Role' button to assign")}><Plus className="h-4 w-4" /> Assign Role</Button>} />
      ) : (
        <DataTable columns={columns} rows={users} onRowClick={(u) => u.roleCount > 0 && viewEffective(u)} />
      )}

      {/* Assign Role Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-4 w-4 text-violet-500" /> Assign Role</DialogTitle>
            <DialogDescription>
              Assign a role to <strong>{assignTarget && empName(assignTarget)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Role *</Label>
              <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => {
                    const t = ROLE_TYPE_MAP[r.roleType] || ROLE_TYPE_MAP.Custom
                    return <SelectItem key={r.id} value={r.id}>{r.name} · {t.label}</SelectItem>
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Effective From</Label>
                <Input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Effective To {form.isTemporary && "*"}</Label>
                <Input type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} disabled={!form.isTemporary} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Scope Type</Label>
                <Select value={form.scopeType} onValueChange={(v) => setForm({ ...form, scopeType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DATA_SCOPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Temporary?</Label>
                <div className="flex items-center h-9 gap-2">
                  <Checkbox checked={form.isTemporary} onCheckedChange={(c) => setForm({ ...form, isTemporary: !!c })} id="temp" />
                  <label htmlFor="temp" className="text-xs text-muted-foreground">Time-bound access</label>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason</Label>
              <Textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why is this role being assigned?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={submitAssign} className="gap-1.5 bg-gradient-to-r from-violet-500 to-emerald-500"><Shield className="h-4 w-4" /> Assign Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Effective Permissions Sheet */}
      <Sheet open={!!effectiveTarget} onOpenChange={(o) => !o && setEffectiveTarget(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-3 border-b border-border/60">
            <SheetTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-500" /> Effective Permissions</SheetTitle>
            <SheetDescription>
              Computed from all assigned roles · Rule: Explicit Deny wins
            </SheetDescription>
          </SheetHeader>

          {effectiveLoading ? (
            <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : effective && effectiveTarget ? (
            <div className="p-4 space-y-4">
              {/* Employee header */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-violet-50 to-emerald-50 dark:from-violet-950/30 dark:to-emerald-950/20 border border-violet-200/50">
                <Avatar className="h-12 w-12 border-2 border-violet-200">
                  <AvatarFallback className="bg-violet-500/15 text-violet-600 font-semibold">{initials(effective.employee)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{empName(effective.employee)}</p>
                  <p className="text-xs text-muted-foreground">{effective.employee.employeeCode} · {effective.employee.department?.name || "—"} · {effective.employee.designation?.name || "—"}</p>
                </div>
              </div>

              {/* Assigned Roles */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Assigned Roles ({effective.roles.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {effective.roles.map(r => {
                    const t = ROLE_TYPE_MAP[r.roleType] || ROLE_TYPE_MAP.Custom
                    return <span key={r.id} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-white ${t.color}`}>{r.name}</span>
                  })}
                </div>
              </div>

              {/* Conflicts */}
              {effective.conflicts.length > 0 && (
                <Card className="border-amber-200/60 bg-amber-50/50 dark:bg-amber-500/5">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <p className="text-xs font-semibold text-amber-700">Permission Conflicts ({effective.conflicts.length})</p>
                    </div>
                    {effective.conflicts.map((c, i) => (
                      <p key={i} className="text-[11px] text-amber-700">{MODULE_MAP[c.module]?.label || c.module}: {c.details}</p>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Allowed Modules */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Allowed Modules ({effective.allowedModules.length})
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {effective.allowedModules.map(m => {
                    const mod = MODULE_MAP[m]
                    const a = effective.moduleAccess[m]
                    if (!mod || !a) return null
                    return (
                      <div key={m} className="rounded-lg border border-emerald-200/40 bg-emerald-50/30 dark:bg-emerald-500/5 p-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium">{mod.label}</p>
                          <span className={`inline-block h-2 w-2 rounded-full ${ACCESS_LEVEL_MAP[a.accessLevel]?.color}`} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{ACCESS_LEVEL_MAP[a.accessLevel]?.label}</p>
                      </div>
                    )
                  })}
                  {effective.allowedModules.length === 0 && <p className="text-xs text-muted-foreground col-span-full">No modules allowed.</p>}
                </div>
              </div>

              {/* Denied Modules */}
              {effective.deniedModules.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 text-rose-500" /> Denied Modules ({effective.deniedModules.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {effective.deniedModules.map(m => (
                      <span key={m} className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 px-2 py-0.5 text-[10px]">
                        <X className="h-2.5 w-2.5" /> {MODULE_MAP[m]?.label || m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Field Restrictions */}
              {Object.keys(effective.fieldAccess).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Field Restrictions</p>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {Object.entries(effective.fieldAccess).map(([mod, fields]) =>
                      Object.entries(fields).map(([field, access]) => {
                        const sf = SENSITIVE_FIELDS.find(s => s.field === field)
                        const masked = access === "Masked" || access === "Hidden"
                        return (
                          <div key={`${mod}|${field}`} className="flex items-center justify-between rounded-lg border border-border/40 p-2 text-xs">
                            <div>
                              <p className="font-medium">{sf?.label || field}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{mod}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {masked && <span className="font-mono text-[10px] text-amber-600">{maskValue("123456789012")}</span>}
                              <Badge variant="outline" className={`text-[10px] ${access === "Hidden" ? "border-rose-300 text-rose-600" : access === "Masked" ? "border-amber-300 text-amber-600" : "border-sky-300 text-sky-600"}`}>{access}</Badge>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState icon={Sparkles} title="No data" description="Failed to load effective permissions." />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
