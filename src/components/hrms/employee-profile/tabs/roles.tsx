"use client"

// ============================================================
// RolesTab — manage role mappings.
// API: /api/employees/[id]/roles (GET list, POST create,
// GET/PATCH/DELETE by recordId).
// ------------------------------------------------------------

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Shield, Plus, Pencil, Trash2, Power, Eye, CheckCircle2, XCircle,
  LayoutGrid, FileText, BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState, SectionCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"

// ---------- types ----------

interface RoleRec {
  id: string
  role: string
  scopeType?: string | null
  scopeRef?: string | null
  modulePermissions?: string | null
  fieldPermissions?: string | null
  reportPermissions?: string | null
  assignedAt: string | Date
  assignedBy?: string | null
  isActive: boolean
}

// ---------- helpers ----------

const ROLES = [
  "Employee", "Manager", "HR admin", "Payroll admin",
  "Finance admin", "IT admin", "Auditor", "Sub-admin",
] as const

const SCOPE_TYPES = ["Global", "Entity", "Department", "Location"] as const

const ROLE_COLORS: Record<string, string> = {
  Employee: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Manager: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  "HR admin": "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  "Payroll admin": "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
  "Finance admin": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "IT admin": "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Auditor: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  "Sub-admin": "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
}

const MODULE_LIST = [
  "dashboard", "employees", "organization", "leave", "attendance", "roster",
  "shift", "payroll", "performance", "expenses", "helpdesk", "assets",
  "recruitment", "settings", "audit", "reports",
]

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

function parsePerms(s?: string | null): Record<string, boolean> {
  if (!s) return {}
  try {
    const o = JSON.parse(s)
    if (Array.isArray(o)) return o.reduce((acc, m) => { acc[m] = true; return acc }, {} as Record<string, boolean>)
    return o
  } catch {
    return {}
  }
}

function permSummary(s?: string | null): string {
  const p = parsePerms(s)
  const keys = Object.keys(p).filter((k) => p[k])
  if (keys.length === 0) return "None"
  if (keys.length <= 3) return keys.join(", ")
  return `${keys.length} modules`
}

// ============================================================
// Component
// ============================================================

export default function RolesTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [items, setItems] = React.useState<RoleRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<RoleRec | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<RoleRec | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/roles`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load roles")
      setItems(data?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load roles")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  async function patch(rec: RoleRec, payload: any, successMsg: string) {
    try {
      const res = await fetch(`/api/employees/${employeeId}/roles/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to update")
      toast.success(successMsg)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to update")
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/employees/${employeeId}/roles/${deleteTarget.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to delete")
      toast.success("Role mapping deleted")
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete")
    }
  }

  // Aggregate permissions matrix across active roles
  const matrix = React.useMemo(() => {
    const activeRoles = items.filter((r) => r.isActive)
    const modules = new Set<string>()
    const fields = new Set<string>()
    const reports = new Set<string>()
    activeRoles.forEach((r) => {
      const m = parsePerms(r.modulePermissions)
      const f = parsePerms(r.fieldPermissions)
      const rep = parsePerms(r.reportPermissions)
      Object.keys(m).forEach((k) => { if (m[k]) modules.add(k) })
      Object.keys(f).forEach((k) => { if (f[k]) fields.add(k) })
      Object.keys(rep).forEach((k) => { if (rep[k]) reports.add(k) })
    })
    return {
      modules: Array.from(modules).sort(),
      fields: Array.from(fields).sort(),
      reports: Array.from(reports).sort(),
    }
  }, [items])

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-5"
    >
      {/* Heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Assign and manage role mappings. Each role can be scoped globally or to a specific entity / department / location.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Assign Role
        </Button>
      </div>

      {/* Role Mappings table */}
      {loading ? (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="p-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border/60">
          <EmptyState
            icon={Shield}
            title="No role mappings"
            description="Assign a role to give this employee system access."
            action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Assign Role</Button>}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
          <ScrollArea className="max-h-[480px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scope</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Module perms</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Field perms</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Report perms</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">By</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-medium border-0", ROLE_COLORS[r.role] || "bg-muted text-muted-foreground")}>
                        {r.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span>{r.scopeType || "—"}</span>
                        {r.scopeRef && <span className="text-xs text-muted-foreground ml-1">({r.scopeRef})</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{permSummary(r.modulePermissions)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{permSummary(r.fieldPermissions)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{permSummary(r.reportPermissions)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.assignedAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{r.assignedBy || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={r.isActive ? "text-emerald-600 border-emerald-200 dark:border-emerald-500/30 dark:text-emerald-400" : "text-muted-foreground"}>
                        {r.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditTarget(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => patch(r, { isActive: !r.isActive }, `Role ${!r.isActive ? "activated" : "deactivated"}`)}>
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10"
                          onClick={() => setDeleteTarget(r)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}

      {/* Permissions Matrix (read-only summary) */}
      {items.length > 0 && (
        <SectionCard
          title="Effective Permissions Matrix"
          description="Aggregated from all active role mappings"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PermBlock icon={LayoutGrid} title="Modules" items={matrix.modules} color="emerald" />
            <PermBlock icon={FileText} title="Fields" items={matrix.fields} color="cyan" />
            <PermBlock icon={BarChart3} title="Reports" items={matrix.reports} color="fuchsia" />
          </div>
          {matrix.modules.length === 0 && matrix.fields.length === 0 && matrix.reports.length === 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              No explicit permissions configured on active roles. The role itself determines default access.
            </p>
          )}
        </SectionCard>
      )}

      {/* Create / Edit dialog */}
      <RoleFormDialog
        open={createOpen || !!editTarget}
        editTarget={editTarget}
        employeeId={employeeId}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditTarget(null) } }}
        onSaved={load}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role mapping?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the <strong>{deleteTarget?.role}</strong> role from this employee. They will lose the associated permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// ============================================================
// PermBlock
// ============================================================

function PermBlock({
  icon: Icon, title, items, color,
}: {
  icon: any; title: string; items: string[]; color: "emerald" | "cyan" | "fuchsia"
}) {
  const colors: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    cyan: "text-cyan-600 dark:text-cyan-400",
    fuchsia: "text-fuchsia-600 dark:text-fuchsia-400",
  }
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", colors[color])} />
        <p className="text-sm font-semibold">{title}</p>
        <Badge variant="outline" className="ml-auto text-xs">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">None granted</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((m) => (
            <Badge key={m} variant="secondary" className="text-[10px] font-mono">
              <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> {m}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Role Form Dialog
// ============================================================

function RoleFormDialog({
  open, editTarget, employeeId, onOpenChange, onSaved,
}: {
  open: boolean
  editTarget: RoleRec | null
  employeeId: string
  onOpenChange: (o: boolean) => void
  onSaved: () => void
}) {
  const [form, setForm] = React.useState({
    role: "Employee",
    scopeType: "Global",
    scopeRef: "",
    modulePermissions: [] as string[],
    fieldPermissions: [] as string[],
    reportPermissions: [] as string[],
    isActive: true,
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (editTarget) {
        setForm({
          role: editTarget.role,
          scopeType: editTarget.scopeType || "Global",
          scopeRef: editTarget.scopeRef || "",
          modulePermissions: Object.keys(parsePerms(editTarget.modulePermissions)).filter((k) => parsePerms(editTarget.modulePermissions)[k]),
          fieldPermissions: Object.keys(parsePerms(editTarget.fieldPermissions)).filter((k) => parsePerms(editTarget.fieldPermissions)[k]),
          reportPermissions: Object.keys(parsePerms(editTarget.reportPermissions)).filter((k) => parsePerms(editTarget.reportPermissions)[k]),
          isActive: editTarget.isActive,
        })
      } else {
        setForm({
          role: "Employee", scopeType: "Global", scopeRef: "",
          modulePermissions: [], fieldPermissions: [], reportPermissions: [],
          isActive: true,
        })
      }
    }
  }, [open, editTarget])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const payload: any = {
        role: form.role,
        scopeType: form.scopeType,
        scopeRef: form.scopeRef || undefined,
        modulePermissions: JSON.stringify(form.modulePermissions),
        fieldPermissions: JSON.stringify(form.fieldPermissions),
        reportPermissions: JSON.stringify(form.reportPermissions),
        isActive: form.isActive,
      }
      const url = editTarget
        ? `/api/employees/${employeeId}/roles/${editTarget.id}`
        : `/api/employees/${employeeId}/roles`
      const method = editTarget ? "PATCH" : "POST"
      if (!editTarget) payload.assignedBy = "HR Admin"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to save role")
      toast.success(editTarget ? "Role mapping updated" : "Role assigned")
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      toast.error(e.message || "Failed to save role")
    } finally {
      setSubmitting(false)
    }
  }

  function toggleModule(m: string) {
    setForm((f) => ({
      ...f,
      modulePermissions: f.modulePermissions.includes(m)
        ? f.modulePermissions.filter((x) => x !== m)
        : [...f.modulePermissions, m],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {editTarget ? "Edit Role Mapping" : "Assign Role"}
          </DialogTitle>
          <DialogDescription>
            Assign a role with module / field / report permissions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Role <span className="text-rose-500">*</span></Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Scope type</Label>
              <Select value={form.scopeType} onValueChange={(v) => setForm({ ...form, scopeType: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Scope reference</Label>
              <Input value={form.scopeRef} onChange={(e) => setForm({ ...form, scopeRef: e.target.value })}
                placeholder="Entity / dept / location id" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Module permissions</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg border border-border/60 p-3">
              {MODULE_LIST.map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={form.modulePermissions.includes(m)}
                    onCheckedChange={() => toggleModule(m)}
                  />
                  <span className="font-mono text-xs">{m}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Field permissions (comma-separated)</Label>
            <Input
              value={form.fieldPermissions.join(", ")}
              onChange={(e) => setForm({ ...form, fieldPermissions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder="salary, ctc, bankAccount..."
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Report permissions (comma-separated)</Label>
            <Input
              value={form.reportPermissions.join(", ")}
              onChange={(e) => setForm({ ...form, reportPermissions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder="payroll_register, headcount..."
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div className="flex items-center gap-2">
              {form.isActive ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Active</span>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(c) => setForm({ ...form, isActive: c })}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {editTarget ? "Save Changes" : "Assign Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
