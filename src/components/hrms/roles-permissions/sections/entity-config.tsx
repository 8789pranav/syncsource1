'use client'

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Database, Plus, Pencil, Trash2, Search, Building2, Shield, Sparkles,
  CheckCircle2, Globe2, Crown, Layers, AlertCircle, ChevronRight,
} from "lucide-react"

import { StatCard, EmptyState } from "@/components/hrms/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { DATA_SCOPES, ROLE_TYPE_MAP } from "@/lib/permissions-constants"
import { cn } from "@/lib/utils"

// ============================================================
// Types
// ============================================================
interface Entity {
  id: string; code: string; legalName: string; tradeName?: string | null;
  country: string; currency: string; status: string;
  _count?: { employees: number; branches: number; departments: number }
}
interface Role {
  id: string; name: string; code: string; roleType: string; riskLevel?: string; status: string;
}
interface RoleEntityConfig {
  id: string; tenantId: string; entityId: string;
  useTenantDefault: boolean;
  defaultEmployeeRole: string | null;
  defaultManagerRole: string | null;
  defaultHrRole: string | null;
  defaultPayrollRole: string | null;
  defaultDocumentRole: string | null;
  defaultOnboardingRole: string | null;
  defaultOffboardingRole: string | null;
  defaultLeaveAdminRole: string | null;
  defaultAttendanceAdminRole: string | null;
  defaultDataScope: string | null;
  defaultFieldMasking: string | null;
  defaultMfaRule: string | null;
  defaultLoginPolicy: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Domain definition — drives the per-domain role pickers
// ============================================================
type DomainKey =
  | "defaultEmployeeRole"
  | "defaultManagerRole"
  | "defaultHrRole"
  | "defaultPayrollRole"
  | "defaultDocumentRole"
  | "defaultOnboardingRole"
  | "defaultOffboardingRole"
  | "defaultLeaveAdminRole"
  | "defaultAttendanceAdminRole"

const DOMAINS: { key: DomainKey; label: string; icon: typeof Shield; tone: string }[] = [
  { key: "defaultEmployeeRole", label: "Employee", icon: Shield, tone: "from-emerald-500 to-teal-400" },
  { key: "defaultManagerRole", label: "Manager", icon: Crown, tone: "from-amber-500 to-orange-400" },
  { key: "defaultHrRole", label: "HR", icon: Building2, tone: "from-violet-500 to-fuchsia-400" },
  { key: "defaultPayrollRole", label: "Payroll", icon: Sparkles, tone: "from-rose-500 to-pink-400" },
  { key: "defaultDocumentRole", label: "Document", icon: Layers, tone: "from-sky-500 to-cyan-400" },
  { key: "defaultOnboardingRole", label: "Onboarding", icon: Globe2, tone: "from-cyan-500 to-teal-400" },
  { key: "defaultOffboardingRole", label: "Offboarding", icon: AlertCircle, tone: "from-orange-500 to-rose-400" },
  { key: "defaultLeaveAdminRole", label: "Leave Admin", icon: CheckCircle2, tone: "from-fuchsia-500 to-violet-400" },
  { key: "defaultAttendanceAdminRole", label: "Attendance Admin", icon: Shield, tone: "from-teal-500 to-emerald-400" },
]

const STATUS_OPTS = [
  { value: "Active", label: "Active", tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  { value: "Inactive", label: "Inactive", tone: "bg-muted text-muted-foreground" },
  { value: "Draft", label: "Draft", tone: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
] as const

// Country flag emoji (common HRMS operating countries)
const COUNTRY_FLAGS: Record<string, string> = {
  India: "🇮🇳", "United States": "🇺🇸", USA: "🇺🇸", US: "🇺🇸",
  UAE: "🇦🇪", "United Arab Emirates": "🇦🇪", Dubai: "🇦🇪",
  UK: "🇬🇧", "United Kingdom": "🇬🇧", Britain: "🇬🇧",
  Singapore: "🇸🇬", Canada: "🇨🇦", Australia: "🇦🇺", Germany: "🇩🇪",
  Philippines: "🇵🇭", Malaysia: "🇲🇾", Indonesia: "🇮🇩",
}
function flagFor(country?: string | null) {
  if (!country) return "🌐"
  return COUNTRY_FLAGS[country] || "🌐"
}

// ============================================================
// Empty form state
// ============================================================
const EMPTY_FORM = {
  entityId: "",
  useTenantDefault: true,
  defaultEmployeeRole: "",
  defaultManagerRole: "",
  defaultHrRole: "",
  defaultPayrollRole: "",
  defaultDocumentRole: "",
  defaultOnboardingRole: "",
  defaultOffboardingRole: "",
  defaultLeaveAdminRole: "",
  defaultAttendanceAdminRole: "",
  defaultDataScope: "Self",
  defaultFieldMasking: "",
  defaultMfaRule: "",
  defaultLoginPolicy: "",
  effectiveFrom: "",
  effectiveTo: "",
  status: "Active" as string,
}

type FormState = typeof EMPTY_FORM

// ============================================================
// Component
// ============================================================
export function EntityConfigSection() {
  const [configs, setConfigs] = React.useState<RoleEntityConfig[]>([])
  const [entities, setEntities] = React.useState<Entity[]>([])
  const [roles, setRoles] = React.useState<Role[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState<string>("__all__")
  const [filterEntity, setFilterEntity] = React.useState<string>("__all__")

  const [editOpen, setEditOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<RoleEntityConfig | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<RoleEntityConfig | null>(null)
  const [advancedOpen, setAdvancedOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [cr, er, rr] = await Promise.all([
        fetch("/api/roles-permissions/entity-configs"),
        fetch("/api/entities"),
        fetch("/api/roles-permissions/roles"),
      ])
      if (cr.ok) {
        const data = await cr.json()
        setConfigs(Array.isArray(data) ? data : (data.items || []))
      }
      if (er.ok) {
        const data = await er.json()
        setEntities(data.items || [])
      }
      if (rr.ok) {
        const data = await rr.json()
        setRoles(data.items || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  // ----- helpers
  const entityById = React.useMemo(() => {
    const m: Record<string, Entity> = {}
    for (const e of entities) m[e.id] = e
    return m
  }, [entities])

  const roleById = React.useMemo(() => {
    const m: Record<string, Role> = {}
    for (const r of roles) m[r.id] = r
    return m
  }, [roles])

  const activeRoles = roles.filter(r => r.status === "Active")

  // ----- stats
  const totalConfigs = configs.length
  const activeConfigs = configs.filter(c => c.status === "Active").length
  const entitiesCovered = new Set(configs.map(c => c.entityId)).size
  const customRoleConfigs = configs.filter(c => !c.useTenantDefault).length

  // ----- filtering
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return configs.filter(c => {
      const ent = entityById[c.entityId]
      const entName = ent?.legalName || ent?.code || c.entityId
      if (q && !entName.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q)) return false
      if (filterStatus !== "__all__" && c.status !== filterStatus) return false
      if (filterEntity !== "__all__" && c.entityId !== filterEntity) return false
      return true
    }).sort((a, b) => {
      const an = entityById[a.entityId]?.legalName || ""
      const bn = entityById[b.entityId]?.legalName || ""
      return an.localeCompare(bn)
    })
  }, [configs, search, filterStatus, filterEntity, entityById])

  // ----- counts per role (for picker display)
  const roleUsage = React.useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of configs) {
      for (const d of DOMAINS) {
        const rid = c[d.key] as string | null
        if (rid) m[rid] = (m[rid] || 0) + 1
      }
    }
    return m
  }, [configs])

  // ----- form handlers
  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setAdvancedOpen(false)
    setEditOpen(true)
  }
  const openEdit = (c: RoleEntityConfig) => {
    setEditing(c)
    setForm({
      entityId: c.entityId,
      useTenantDefault: c.useTenantDefault,
      defaultEmployeeRole: c.defaultEmployeeRole || "",
      defaultManagerRole: c.defaultManagerRole || "",
      defaultHrRole: c.defaultHrRole || "",
      defaultPayrollRole: c.defaultPayrollRole || "",
      defaultDocumentRole: c.defaultDocumentRole || "",
      defaultOnboardingRole: c.defaultOnboardingRole || "",
      defaultOffboardingRole: c.defaultOffboardingRole || "",
      defaultLeaveAdminRole: c.defaultLeaveAdminRole || "",
      defaultAttendanceAdminRole: c.defaultAttendanceAdminRole || "",
      defaultDataScope: c.defaultDataScope || "Self",
      defaultFieldMasking: c.defaultFieldMasking || "",
      defaultMfaRule: c.defaultMfaRule || "",
      defaultLoginPolicy: c.defaultLoginPolicy || "",
      effectiveFrom: c.effectiveFrom ? c.effectiveFrom.slice(0, 10) : "",
      effectiveTo: c.effectiveTo ? c.effectiveTo.slice(0, 10) : "",
      status: c.status || "Active",
    })
    setAdvancedOpen(false)
    setEditOpen(true)
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(s => ({ ...s, [key]: value }))
  }

  const save = async () => {
    if (!form.entityId) { toast.error("Select an entity"); return }
    setSaving(true)
    try {
      if (editing) {
        // PATCH — entity is fixed, send all editable fields
        const payload: Record<string, any> = {
          useTenantDefault: form.useTenantDefault,
          defaultEmployeeRole: form.defaultEmployeeRole || null,
          defaultManagerRole: form.defaultManagerRole || null,
          defaultHrRole: form.defaultHrRole || null,
          defaultPayrollRole: form.defaultPayrollRole || null,
          defaultDocumentRole: form.defaultDocumentRole || null,
          defaultOnboardingRole: form.defaultOnboardingRole || null,
          defaultOffboardingRole: form.defaultOffboardingRole || null,
          defaultLeaveAdminRole: form.defaultLeaveAdminRole || null,
          defaultAttendanceAdminRole: form.defaultAttendanceAdminRole || null,
          defaultDataScope: form.defaultDataScope || null,
          defaultFieldMasking: form.defaultFieldMasking || null,
          defaultMfaRule: form.defaultMfaRule || null,
          defaultLoginPolicy: form.defaultLoginPolicy || null,
          effectiveFrom: form.effectiveFrom || null,
          effectiveTo: form.effectiveTo || null,
          status: form.status,
        }
        const r = await fetch(`/api/roles-permissions/entity-configs/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (r.ok) {
          toast.success("Configuration updated")
          setEditOpen(false)
          load()
        } else {
          const e = await r.json().catch(() => ({}))
          toast.error(e.error || "Failed to update")
        }
      } else {
        // CREATE — two-step: POST to create with entityId + useTenantDefault, then PATCH to set the rest
        const createRes = await fetch(`/api/roles-permissions/entity-configs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityId: form.entityId, useTenantDefault: form.useTenantDefault }),
        })
        if (!createRes.ok) {
          const e = await createRes.json().catch(() => ({}))
          toast.error(e.error || "Failed to create (entity may already have a config)")
          return
        }
        const createdRec = await createRes.json()
        const newId = createdRec.id
        if (!newId) {
          toast.success("Configuration created (with defaults)")
          setEditOpen(false)
          load()
          return
        }
        const patchPayload: Record<string, any> = {
          useTenantDefault: form.useTenantDefault,
          defaultEmployeeRole: form.defaultEmployeeRole || null,
          defaultManagerRole: form.defaultManagerRole || null,
          defaultHrRole: form.defaultHrRole || null,
          defaultPayrollRole: form.defaultPayrollRole || null,
          defaultDocumentRole: form.defaultDocumentRole || null,
          defaultOnboardingRole: form.defaultOnboardingRole || null,
          defaultOffboardingRole: form.defaultOffboardingRole || null,
          defaultLeaveAdminRole: form.defaultLeaveAdminRole || null,
          defaultAttendanceAdminRole: form.defaultAttendanceAdminRole || null,
          defaultDataScope: form.defaultDataScope || null,
          defaultFieldMasking: form.defaultFieldMasking || null,
          defaultMfaRule: form.defaultMfaRule || null,
          defaultLoginPolicy: form.defaultLoginPolicy || null,
          effectiveFrom: form.effectiveFrom || null,
          effectiveTo: form.effectiveTo || null,
          status: form.status,
        }
        const pr = await fetch(`/api/roles-permissions/entity-configs/${newId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchPayload),
        })
        if (pr.ok) {
          toast.success("Configuration created")
          setEditOpen(false)
          load()
        } else {
          // Created but patch failed — still reload to show partial state
          toast.success("Created (some fields may need re-saving)")
          setEditOpen(false)
          load()
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const r = await fetch(`/api/roles-permissions/entity-configs/${deleteTarget.id}`, { method: "DELETE" })
      if (r.ok) {
        toast.success("Configuration deleted")
        setDeleteTarget(null)
        load()
      } else {
        const e = await r.json().catch(() => ({}))
        toast.error(e.error || "Failed to delete")
      }
    } catch {
      toast.error("Failed to delete")
    }
  }

  const quickToggleStatus = async (c: RoleEntityConfig, newStatus: string) => {
    // Optimistic update
    setConfigs(prev => prev.map(x => x.id === c.id ? { ...x, status: newStatus } : x))
    try {
      const r = await fetch(`/api/roles-permissions/entity-configs/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (r.ok) toast.success(`${entityById[c.entityId]?.legalName || "Config"} ${newStatus === "Active" ? "activated" : "deactivated"}`)
      else { toast.error("Failed — reverting"); load() }
    } catch {
      toast.error("Failed — reverting"); load()
    }
  }

  // ============================================================
  // Render
  // ============================================================
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/20">
            <Database className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Entity Configuration</h2>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Default roles &amp; policies per entity (multi-tenant). One config per entity — picks the role new joiners, transfers, and role changes fall back to.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:shadow-md hover:shadow-violet-500/25 transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" /> Add Configuration
        </Button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Configs" value={totalConfigs} icon={Database} accent="emerald" sub="Across all entities" />
        <StatCard label="Active" value={activeConfigs} icon={CheckCircle2} accent="cyan" sub="Currently applied" />
        <StatCard label="Entities Covered" value={entitiesCovered} icon={Building2} accent="amber" sub={`of ${entities.length} entities`} />
        <StatCard label="Custom Defaults" value={customRoleConfigs} icon={Crown} accent="fuchsia" sub="Override tenant default" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by entity name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-background focus-visible:ring-2 focus-visible:ring-violet-400/40"
          />
        </div>
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="h-9 w-[200px] focus-visible:ring-2 focus-visible:ring-violet-400/40">
            <SelectValue placeholder="All Entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Entities</SelectItem>
            {entities.map(e => (
              <SelectItem key={e.id} value={e.id}>
                <span className="mr-1.5">{flagFor(e.country)}</span>
                {e.legalName} <span className="text-muted-foreground text-[10px]">· {e.code}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[140px] focus-visible:ring-2 focus-visible:ring-violet-400/40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Status</SelectItem>
            {STATUS_OPTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Database}
          title={configs.length === 0 ? "No entity configurations yet" : "No matches"}
          description={configs.length === 0
            ? "Create your first entity config to define default roles per entity (multi-tenant)."
            : "Try adjusting your search or filters."}
          action={configs.length === 0 ? (
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Create First Config
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((c, i) => (
              <ConfigCard
                key={c.id}
                config={c}
                entity={entityById[c.entityId]}
                roleById={roleById}
                index={i}
                onEdit={() => openEdit(c)}
                onDelete={() => setDeleteTarget(c)}
                onToggleStatus={(newStatus) => quickToggleStatus(c, newStatus)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit / Create Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-3 border-b border-border/60">
            <SheetTitle className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                <Database className="h-3.5 w-3.5" />
              </span>
              {editing ? "Edit Entity Configuration" : "Create Entity Configuration"}
            </SheetTitle>
            <SheetDescription>
              {editing
                ? `Editing ${entityById[editing.entityId]?.legalName || "entity"}`
                : "Pick an entity and define its default roles per domain."}
            </SheetDescription>
          </SheetHeader>

          <div className="p-4 space-y-4">
            {/* Entity picker */}
            <div className="space-y-1.5">
              <Label className="text-xs">Entity *</Label>
              <Select
                value={form.entityId}
                onValueChange={(v) => update("entityId", v)}
                disabled={!!editing}
              >
                <SelectTrigger className="focus-visible:ring-2 focus-visible:ring-violet-400/40">
                  <SelectValue placeholder="Select entity..." />
                </SelectTrigger>
                <SelectContent>
                  {entities.map(e => {
                    const alreadyConfigured = configs.some(c => c.entityId === e.id) && !editing
                    return (
                      <SelectItem key={e.id} value={e.id} disabled={alreadyConfigured}>
                        <span className="mr-1.5">{flagFor(e.country)}</span>
                        {e.legalName}
                        <span className="text-muted-foreground text-[10px] ml-1">· {e.code}</span>
                        {alreadyConfigured && <span className="text-[9px] text-amber-600 ml-1">(configured)</span>}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {!editing && entities.length === 0 && (
                <p className="text-[10px] text-amber-600">No entities found. Create an entity first.</p>
              )}
            </div>

            {/* Use tenant default toggle */}
            <Card className="bg-muted/30 border-border/40">
              <CardContent className="p-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">Use Tenant Defaults</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    When ON, entity inherits tenant-wide role defaults. Turn OFF to set custom roles per domain below.
                  </p>
                </div>
                <Switch
                  checked={form.useTenantDefault}
                  onCheckedChange={(v) => update("useTenantDefault", !!v)}
                  className="data-[state=checked]:bg-violet-500"
                />
              </CardContent>
            </Card>

            {/* Per-domain role pickers */}
            <div className={cn("space-y-2 transition-opacity", form.useTenantDefault && "opacity-50 pointer-events-none")}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Default Role per Domain</p>
                <Badge variant="outline" className="text-[10px]">{DOMAINS.length} domains</Badge>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {DOMAINS.map(d => {
                  const Icon = d.icon
                  const val = form[d.key] as string
                  return (
                    <div key={d.key} className="space-y-1">
                      <Label className="text-[10px] flex items-center gap-1.5 text-muted-foreground">
                        <span className={cn("grid h-4 w-4 place-items-center rounded text-white bg-gradient-to-br", d.tone)}>
                          <Icon className="h-2.5 w-2.5" />
                        </span>
                        {d.label}
                      </Label>
                      <Select value={val} onValueChange={(v) => v === "__none__" ? update(d.key, "") : update(d.key, v)}>
                        <SelectTrigger className="h-9 focus-visible:ring-2 focus-visible:ring-violet-400/40">
                          <SelectValue placeholder="Inherit / None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Inherit / None —</SelectItem>
                          {activeRoles.map(r => {
                            const t = ROLE_TYPE_MAP[r.roleType] || ROLE_TYPE_MAP.Custom
                            return (
                              <SelectItem key={r.id} value={r.id}>
                                <span className="flex items-center gap-1.5">
                                  <span className={cn("h-1.5 w-1.5 rounded-full", t.color)} />
                                  {r.name}
                                  <span className="text-[10px] text-muted-foreground ml-1">{t.label}</span>
                                </span>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Data scope + status */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Default Data Scope</Label>
                <Select value={form.defaultDataScope} onValueChange={(v) => update("defaultDataScope", v)}>
                  <SelectTrigger className="focus-visible:ring-2 focus-visible:ring-violet-400/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_SCOPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => update("status", v)}>
                  <SelectTrigger className="focus-visible:ring-2 focus-visible:ring-violet-400/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Effective dates */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Effective From</Label>
                <Input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => update("effectiveFrom", e.target.value)}
                  className="focus-visible:ring-2 focus-visible:ring-violet-400/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Effective To</Label>
                <Input
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) => update("effectiveTo", e.target.value)}
                  className="focus-visible:ring-2 focus-visible:ring-violet-400/40"
                />
              </div>
            </div>

            {/* Advanced (collapsible) */}
            <Card className="border-border/40">
              <button
                type="button"
                onClick={() => setAdvancedOpen(o => !o)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/30 transition-colors rounded-t-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40"
              >
                <div>
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-violet-500" />
                    Advanced Rules
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Field masking JSON, MFA rule, login policy</p>
                </div>
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", advancedOpen && "rotate-90")} />
              </button>
              {advancedOpen && (
                <CardContent className="pt-0 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Field Masking Rule (JSON)</Label>
                    <Textarea
                      rows={3}
                      value={form.defaultFieldMasking}
                      onChange={(e) => update("defaultFieldMasking", e.target.value)}
                      placeholder='{"salary":"Masked","pan":"Masked","bankAccount":"Masked"}'
                      className="font-mono text-[11px] focus-visible:ring-2 focus-visible:ring-violet-400/40"
                    />
                    <p className="text-[10px] text-muted-foreground">Per-field masking override for this entity.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">MFA Rule</Label>
                      <Input
                        value={form.defaultMfaRule}
                        onChange={(e) => update("defaultMfaRule", e.target.value)}
                        placeholder="e.g. RequiredForAdmin"
                        className="focus-visible:ring-2 focus-visible:ring-violet-400/40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Login Policy</Label>
                      <Input
                        value={form.defaultLoginPolicy}
                        onChange={(e) => update("defaultLoginPolicy", e.target.value)}
                        placeholder="e.g. AllowConcurrent"
                        className="focus-visible:ring-2 focus-visible:ring-violet-400/40"
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          <div className="p-4 border-t border-border/60 bg-muted/30 flex justify-end gap-2 sticky bottom-0">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={save}
              disabled={saving}
              className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:shadow-md hover:shadow-violet-500/25 transition-all"
            >
              <Database className="h-4 w-4" /> {saving ? "Saving..." : editing ? "Save Changes" : "Create Config"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-4 w-4" /> Delete Configuration
            </DialogTitle>
            <DialogDescription>
              Delete the configuration for <strong>{deleteTarget && (entityById[deleteTarget.entityId]?.legalName || "this entity")}</strong>?
              The entity will fall back to tenant defaults. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="gap-1.5">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Config Card (sub-component)
// ============================================================
function ConfigCard({
  config, entity, roleById, index, onEdit, onDelete, onToggleStatus,
}: {
  config: RoleEntityConfig
  entity?: Entity
  roleById: Record<string, Role>
  index: number
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: (newStatus: string) => void
}) {
  const ent = entity
  const statusOpt = STATUS_OPTS.find(s => s.value === config.status) || STATUS_OPTS[1]
  const isActive = config.status === "Active"

  // Collect assigned roles
  const assigned: { domain: string; role: Role }[] = []
  for (const d of DOMAINS) {
    const rid = config[d.key] as string | null
    if (rid && roleById[rid]) assigned.push({ domain: d.label, role: roleById[rid] })
  }

  const flag = flagFor(ent?.country)
  const initials = (ent?.legalName || ent?.code || "?").slice(0, 2).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className={cn(
        "group relative rounded-xl border bg-card shadow-soft transition-all hover:shadow-md hover:-translate-y-0.5",
        isActive ? "border-border/60" : "border-border/40 opacity-80",
      )}
    >
      {/* Top accent bar */}
      <div className={cn(
        "absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r",
        isActive ? "from-violet-500 to-fuchsia-500" : "from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800",
      )} />

      <div className="p-4 pt-5 space-y-3">
        {/* Header: entity */}
        <div className="flex items-start gap-2.5">
          <div className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white shadow-sm bg-gradient-to-br",
            isActive ? "from-violet-500 to-fuchsia-500" : "from-slate-400 to-slate-500",
          )}>
            <span className="text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{ent?.legalName || "Unknown entity"}</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <span>{flag}</span>
              <span>{ent?.country || "—"}</span>
              {ent?.code && <span className="font-mono">· {ent.code}</span>}
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={(v) => onToggleStatus(v ? "Active" : "Inactive")}
            className="data-[state=checked]:bg-emerald-500"
            aria-label="Toggle active"
          />
        </div>

        {/* Status + tenant-default badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", statusOpt.tone)}>
            {config.status}
          </span>
          {config.useTenantDefault ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 px-2 py-0.5 text-[10px] font-medium">
              <Crown className="h-2.5 w-2.5" /> Tenant Default
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 px-2 py-0.5 text-[10px] font-medium">
              <Sparkles className="h-2.5 w-2.5" /> Custom
            </span>
          )}
          {assigned.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-medium">
              {assigned.length} role{assigned.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Assigned roles */}
        {assigned.length === 0 ? (
          <div className="rounded-lg bg-muted/40 border border-dashed border-border/40 p-2.5 text-center">
            <p className="text-[11px] text-muted-foreground italic">
              {config.useTenantDefault ? "Inheriting tenant-wide defaults" : "No default roles configured"}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {assigned.map(({ domain, role }) => {
              const t = ROLE_TYPE_MAP[role.roleType] || ROLE_TYPE_MAP.Custom
              return (
                <div key={domain} className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-muted-foreground w-28 shrink-0 truncate">{domain}</span>
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-white text-[10px] font-medium truncate", t.color)}>
                    {role.name}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer: dates + actions */}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {config.effectiveFrom && `From ${new Date(config.effectiveFrom).toLocaleDateString()}`}
            {config.effectiveTo && ` → ${new Date(config.effectiveTo).toLocaleDateString()}`}
            {!config.effectiveFrom && !config.effectiveTo && "No effective date set"}
          </p>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 focus-visible:ring-2 focus-visible:ring-violet-400/40"
              onClick={onEdit}
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 focus-visible:ring-2 focus-visible:ring-rose-400/40"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
