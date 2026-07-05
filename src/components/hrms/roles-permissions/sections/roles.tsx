'use client'

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Shield, Plus, Copy, Upload, Download, GitCompare, Pencil, Trash2, Eye,
  UserCog, Lock, MoreHorizontal, Check, ChevronLeft, ChevronRight, X,
  Save,
} from "lucide-react"

import { PageHeader, StatCard, ListToolbar, DataTable, EmptyState, SectionCard, type Column } from "@/components/hrms/ui"
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import {
  MODULES, ROLE_TYPES, ROLE_TYPE_MAP, RISK_LEVELS, RISK_LEVEL_MAP,
  ACCESS_LEVELS, ACCESS_LEVEL_MAP, FIELD_ACCESS, SENSITIVE_FIELDS,
  DATA_SCOPES, STATUS_OPTIONS, STATUS_MAP, ACTIONS,
} from "@/lib/permissions-constants"

interface RoleModulePerm { id: string; module: string; accessLevel: string; riskLevel: string }
interface Role {
  id: string; name: string; code: string; description: string | null;
  roleType: string; riskLevel: string; status: string; isSystem: boolean;
  isDefault: boolean; entityScope: string | null;
  effectiveFrom: string | null; effectiveTo: string | null;
  modulePermissions: RoleModulePerm[];
  _count?: { userRoles: number };
  createdAt: string; updatedAt: string;
}

// ============================================================
// 10-step wizard state shape
// ============================================================
interface WizardState {
  // Step 1
  name: string; code: string; roleType: string; description: string;
  entityScope: string; riskLevel: string; effectiveFrom: string; effectiveTo: string; status: string;
  // Step 3
  modulePermissions: Record<string, string> // module -> accessLevel
  // Step 6
  fieldPermissions: Record<string, string> // `${module}|${field}` -> access
  // Step 7
  scopeType: string
}

const STEPS = [
  { id: 1, label: "Basic Details" },
  { id: 2, label: "Applicability" },
  { id: 3, label: "Module Permissions" },
  { id: 4, label: "Page Permissions" },
  { id: 5, label: "Action Permissions" },
  { id: 6, label: "Field Permissions" },
  { id: 7, label: "Data Access Rules" },
  { id: 8, label: "Approval Permissions" },
  { id: 9, label: "Export/Import" },
  { id: 10, label: "Review & Publish" },
]

const initialWizard: WizardState = {
  name: "", code: "", roleType: "Custom", description: "",
  entityScope: "ALL", riskLevel: "Low", effectiveFrom: "", effectiveTo: "", status: "Active",
  modulePermissions: {},
  fieldPermissions: {},
  scopeType: "All",
}

// ============================================================
// Component
// ============================================================
export function RolesSection() {
  const [roles, setRoles] = React.useState<Role[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [filterType, setFilterType] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState("")
  const [filterRisk, setFilterRisk] = React.useState("")

  const [wizardOpen, setWizardOpen] = React.useState(false)
  const [wizardData, setWizardData] = React.useState<WizardState>(initialWizard)
  const [wizardStep, setWizardStep] = React.useState(1)
  const [cloneSource, setCloneSource] = React.useState<Role | null>(null)
  const [saving, setSaving] = React.useState(false)

  const [viewRole, setViewRole] = React.useState<Role | null>(null)
  const [compareOpen, setCompareOpen] = React.useState(false)
  const [compareA, setCompareA] = React.useState("")
  const [compareB, setCompareB] = React.useState("")
  const [compareResult, setCompareResult] = React.useState<any>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Role | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (filterType && filterType !== "__all__") params.set("roleType", filterType)
      if (filterStatus && filterStatus !== "__all__") params.set("status", filterStatus)
      if (filterRisk && filterRisk !== "__all__") params.set("riskLevel", filterRisk)
      const r = await fetch(`/api/roles-permissions/roles?${params}`)
      if (r.ok) {
        const data = await r.json()
        setRoles(data.items)
      }
    } finally { setLoading(false) }
  }, [search, filterType, filterStatus, filterRisk])

  React.useEffect(() => { load() }, [load])

  // ---- Wizard handlers
  const openCreate = () => {
    setWizardData(initialWizard)
    setCloneSource(null)
    setWizardStep(1)
    setWizardOpen(true)
  }

  const openClone = async (role: Role) => {
    // Fetch full permissions
    const r = await fetch(`/api/roles-permissions/roles/${role.id}/permissions`)
    if (r.ok) {
      const full = await r.json()
      const mp: Record<string, string> = {}
      for (const p of full.modulePermissions || []) mp[p.module] = p.accessLevel
      const fp: Record<string, string> = {}
      for (const p of full.fieldPermissions || []) fp[`${p.module}|${p.field}`] = p.access
      setWizardData({
        ...initialWizard,
        name: `${role.name} (Copy)`,
        code: `${role.code}_COPY`,
        roleType: "Custom",
        description: role.description || "",
        riskLevel: role.riskLevel,
        entityScope: role.entityScope || "ALL",
        status: "Active",
        modulePermissions: mp,
        fieldPermissions: fp,
        scopeType: full.dataScopes?.[0]?.scopeType || "All",
      })
      setCloneSource(role)
      setWizardStep(1)
      setWizardOpen(true)
    }
  }

  const publishRole = async () => {
    if (!wizardData.name || !wizardData.code) {
      toast.error("Name and code are required")
      return
    }
    setSaving(true)
    try {
      const modulePermissions = Object.entries(wizardData.modulePermissions).map(([module, accessLevel]) => ({
        module, accessLevel, riskLevel: ACCESS_LEVEL_MAP[accessLevel] ? "Low" : "Low",
      }))
      const fieldPermissions = Object.entries(wizardData.fieldPermissions).map(([k, access]) => {
        const [module, field] = k.split("|")
        return { module, field, access }
      })
      const dataScopes = [{ scopeType: wizardData.scopeType }]

      const r = await fetch("/api/roles-permissions/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wizardData.name, code: wizardData.code, roleType: wizardData.roleType,
          description: wizardData.description, riskLevel: wizardData.riskLevel,
          status: wizardData.status, entityScope: wizardData.entityScope,
          effectiveFrom: wizardData.effectiveFrom || null,
          effectiveTo: wizardData.effectiveTo || null,
          modulePermissions, fieldPermissions, dataScopes,
          performedByName: "HR Admin",
        }),
      })
      if (r.ok) {
        toast.success(cloneSource ? `Role cloned from ${cloneSource.name}` : "Role created successfully")
        setWizardOpen(false)
        load()
      } else {
        const err = await r.json()
        toast.error(err.error || "Failed to create role")
      }
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const r = await fetch(`/api/roles-permissions/roles/${deleteTarget.id}`, { method: "DELETE" })
    if (r.ok) {
      toast.success(`Role "${deleteTarget.name}" deleted`)
      setDeleteTarget(null)
      load()
    } else {
      const err = await r.json()
      toast.error(err.error || "Failed to delete")
    }
  }

  const runCompare = async () => {
    if (!compareA || !compareB || compareA === compareB) {
      toast.error("Pick two different roles to compare")
      return
    }
    const r = await fetch(`/api/roles-permissions/roles/compare?a=${compareA}&b=${compareB}`)
    if (r.ok) {
      setCompareResult(await r.json())
    }
  }

  // ---- Columns
  const columns: Column<Role>[] = [
    {
      key: "name", header: "Role", width: "260px",
      render: (r) => {
        const t = ROLE_TYPE_MAP[r.roleType] || ROLE_TYPE_MAP.Custom
        return (
          <div className="flex items-center gap-2.5">
            <div className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${t.color} text-white shrink-0`}>
              {r.isSystem ? <Lock className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{r.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{r.code}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: "roleType", header: "Type",
      render: (r) => <Badge variant="outline" className={`text-[10px] border-0 ${ROLE_TYPE_MAP[r.roleType]?.color ? `text-white ${ROLE_TYPE_MAP[r.roleType].color}` : ""}`}>{ROLE_TYPE_MAP[r.roleType]?.label || r.roleType}</Badge>,
    },
    {
      key: "riskLevel", header: "Risk",
      render: (r) => {
        const rk = RISK_LEVEL_MAP[r.riskLevel] || RISK_LEVEL_MAP.Low
        return (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${rk.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${rk.dot}`} /> {rk.label}
          </span>
        )
      },
    },
    {
      key: "modules", header: "Module Access",
      render: (r) => {
        const active = r.modulePermissions.filter(m => m.accessLevel !== "NoAccess")
        if (active.length === 0) return <span className="text-xs text-muted-foreground">—</span>
        return (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs font-medium">{active.length} mods</span>
            {active.slice(0, 3).map((m, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${ACCESS_LEVEL_MAP[m.accessLevel]?.color || "bg-slate-400"}`} title={`${m.module}: ${m.accessLevel}`} />
            ))}
            {active.length > 3 && <span className="text-[10px] text-muted-foreground">+{active.length - 3}</span>}
          </div>
        )
      },
    },
    {
      key: "users", header: "Users",
      render: (r) => <span className="text-sm font-medium">{r._count?.userRoles || 0}</span>,
    },
    {
      key: "status", header: "Status",
      render: (r) => {
        const s = STATUS_MAP[r.status] || STATUS_MAP.Active
        return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${s.color}`}>{s.label}</span>
      },
    },
    {
      key: "actions", header: "", width: "60px",
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setViewRole(r)}><Eye className="mr-2 h-3.5 w-3.5" /> View Permissions</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openClone(r)}><Copy className="mr-2 h-3.5 w-3.5" /> Clone</DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info("Edit wizard — use Clone to copy & modify")}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info("User assignment is in the Users tab")}><UserCog className="mr-2 h-3.5 w-3.5" /> Assign Users</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-600 focus:text-rose-600"
              disabled={r.isSystem}
              onClick={() => setDeleteTarget(r)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Roles" value={roles.length} icon={Shield} accent="emerald" sub="All roles" />
        <StatCard label="System Roles" value={roles.filter(r => r.isSystem).length} icon={Lock} accent="cyan" sub="Built-in, cannot delete" />
        <StatCard label="Custom Roles" value={roles.filter(r => !r.isSystem).length} icon={Plus} accent="amber" sub="Admin-created" />
        <StatCard label="Default Role" value={roles.filter(r => r.isDefault).length} icon={Check} accent="fuchsia" sub="Auto-assigned" />
      </div>

      <PageHeader
        title="Roles"
        description="Create and manage enterprise roles with layered permissions, data scopes, and approval authority."
        icon={Shield}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCompareOpen(true)}>
              <GitCompare className="h-4 w-4" /> Compare
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("Export coming soon")}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-violet-500 to-emerald-500" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Create Role
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Input placeholder="Search roles..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 bg-background" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Types</SelectItem>
            {ROLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRisk} onValueChange={setFilterRisk}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="All Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Risk</SelectItem>
            {RISK_LEVELS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : roles.length === 0 ? (
        <EmptyState icon={Shield} title="No roles found" description="Adjust filters or create a new role." action={<Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="h-4 w-4" /> Create Role</Button>} />
      ) : (
        <DataTable columns={columns} rows={roles} onRowClick={(r) => setViewRole(r)} />
      )}

      {/* Create Wizard Sheet */}
      <Sheet open={wizardOpen} onOpenChange={setWizardOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-border/60 sticky top-0 bg-background z-10">
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-violet-500" />
              {cloneSource ? `Clone Role: ${cloneSource.name}` : "Create New Role"}
            </SheetTitle>
            <SheetDescription>
              Step {wizardStep} of {STEPS.length}: {STEPS[wizardStep - 1].label}
            </SheetDescription>
          </SheetHeader>

          {/* Stepper */}
          <div className="px-6 py-3 border-b border-border/60 bg-muted/30 sticky top-[88px] z-10">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {STEPS.map((s, i) => (
                <React.Fragment key={s.id}>
                  <button
                    onClick={() => setWizardStep(s.id)}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium whitespace-nowrap transition-all ${
                      wizardStep === s.id ? "bg-violet-500 text-white" :
                      wizardStep > s.id ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className={`grid h-4 w-4 place-items-center rounded-full text-[9px] ${
                      wizardStep === s.id ? "bg-white/20" : wizardStep > s.id ? "bg-emerald-500 text-white" : "bg-background"
                    }`}>
                      {wizardStep > s.id ? <Check className="h-2.5 w-2.5" /> : s.id}
                    </span>
                    {s.label}
                  </button>
                  {i < STEPS.length - 1 && <div className="h-px w-3 bg-border" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step content */}
          <div className="p-6 space-y-4 min-h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={wizardStep}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
              >
                {/* STEP 1: Basic Details */}
                {wizardStep === 1 && (
                  <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Role Name *</Label>
                        <Input value={wizardData.name} onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })} placeholder="e.g. HR Executive - India" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Role Code *</Label>
                        <Input value={wizardData.code} onChange={(e) => setWizardData({ ...wizardData, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })} placeholder="HR_EXECUTIVE_INDIA" className="font-mono" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Role Type</Label>
                        <Select value={wizardData.roleType} onValueChange={(v) => setWizardData({ ...wizardData, roleType: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ROLE_TYPES.filter(t => t.value !== "System").map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Risk Level</Label>
                        <Select value={wizardData.riskLevel} onValueChange={(v) => setWizardData({ ...wizardData, riskLevel: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RISK_LEVELS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Description</Label>
                      <Textarea rows={2} value={wizardData.description} onChange={(e) => setWizardData({ ...wizardData, description: e.target.value })} placeholder="What is this role for?" />
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Effective From</Label>
                        <Input type="date" value={wizardData.effectiveFrom} onChange={(e) => setWizardData({ ...wizardData, effectiveFrom: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Effective To</Label>
                        <Input type="date" value={wizardData.effectiveTo} onChange={(e) => setWizardData({ ...wizardData, effectiveTo: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Status</Label>
                        <Select value={wizardData.status} onValueChange={(v) => setWizardData({ ...wizardData, status: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Applicability */}
                {wizardStep === 2 && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Control where this role can be assigned. For now, set the entity scope — full org-structure picker is in the Settings tab.</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Entity Scope</Label>
                      <Select value={wizardData.entityScope} onValueChange={(v) => setWizardData({ ...wizardData, entityScope: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Entities (Tenant Default)</SelectItem>
                          <SelectItem value="ENTITY_1">Specific Entity (mock)</SelectItem>
                          <SelectItem value="BRANCH">Specific Branch</SelectItem>
                          <SelectItem value="LOCATION">Specific Location</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Card className="bg-muted/30 border-dashed">
                      <CardContent className="p-4 text-xs text-muted-foreground">
                        Applicability rules determine which employees this role can be assigned to. Full multi-select for branches, locations, departments, grades, employee types is available in the Data Access Rules step.
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* STEP 3: Module Permissions */}
                {wizardStep === 3 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Set the base access level for each module. This controls sidebar visibility and the broadest permission grant.</p>
                    {MODULES.map(m => {
                      const cur = wizardData.modulePermissions[m.id] || "NoAccess"
                      const rk = RISK_LEVEL_MAP[m.riskLevel]
                      return (
                        <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border/40 p-2.5 hover:bg-muted/30 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`h-1.5 w-1.5 rounded-full ${rk?.dot}`} />
                              <p className="text-sm font-medium">{m.label}</p>
                              <Badge variant="outline" className="text-[9px]">{m.group}</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">{m.description}</p>
                          </div>
                          <Select value={cur} onValueChange={(v) => setWizardData({ ...wizardData, modulePermissions: { ...wizardData.modulePermissions, [m.id]: v } })}>
                            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ACCESS_LEVELS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* STEP 4: Page Permissions */}
                {wizardStep === 4 && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Page-level permissions override module access. For modules with sub-pages, you can fine-tune each page.</p>
                    {MODULES.filter(m => m.pages && m.pages.length > 0 && wizardData.modulePermissions[m.id] && wizardData.modulePermissions[m.id] !== "NoAccess").map(m => (
                      <Card key={m.id}>
                        <CardContent className="p-3">
                          <p className="text-sm font-semibold mb-2">{m.label}</p>
                          <div className="space-y-1">
                            {m.pages!.map(p => (
                              <div key={p.id} className="flex items-center justify-between text-xs">
                                <span>{p.label}</span>
                                <Badge variant="outline" className="text-[10px]">{wizardData.modulePermissions[m.id] === "FullAccess" ? "Full" : wizardData.modulePermissions[m.id] === "Manage" ? "Manage" : "View"}</Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {MODULES.every(m => !m.pages || m.pages.length === 0 || !wizardData.modulePermissions[m.id] || wizardData.modulePermissions[m.id] === "NoAccess") && (
                      <EmptyState icon={Shield} title="No modules with pages selected" description="Grant module access in Step 3 to see page-level options." />
                    )}
                  </div>
                )}

                {/* STEP 5: Action Permissions */}
                {wizardStep === 5 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Quick toggle: granting "Manage" or "FullAccess" in Step 3 auto-enables these actions. Use this step to restrict specific actions.</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/40">
                            <th className="text-left p-2 font-medium text-muted-foreground">Module</th>
                            {ACTIONS.slice(0, 8).map(a => <th key={a.value} className="p-2 font-medium text-muted-foreground text-center">{a.label}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {MODULES.filter(m => wizardData.modulePermissions[m.id] && wizardData.modulePermissions[m.id] !== "NoAccess").map(m => {
                            const lvl = wizardData.modulePermissions[m.id]
                            return (
                              <tr key={m.id} className="border-b border-border/20 hover:bg-muted/20">
                                <td className="p-2 font-medium">{m.label}</td>
                                {ACTIONS.slice(0, 8).map(a => {
                                  const enabled = lvl === "FullAccess" || (lvl === "Manage" && ["view", "create", "edit", "approve", "import", "upload"].includes(a.value)) || (lvl === "View" && a.value === "view")
                                  return (
                                    <td key={a.value} className="p-2 text-center">
                                      <span className={`inline-block h-2 w-2 rounded-full ${enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* STEP 6: Field Permissions */}
                {wizardStep === 6 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Control visibility of sensitive HR fields. Masked shows partial data (e.g. XXXX-XXXX-1234).</p>
                    {SENSITIVE_FIELDS.map(f => {
                      const key = `${f.module}|${f.field}`
                      const cur = wizardData.fieldPermissions[key] || "View"
                      return (
                        <div key={key} className="flex items-center gap-3 rounded-lg border border-border/40 p-2.5">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{f.label}</p>
                              <Badge variant="outline" className="text-[9px]">{f.module}</Badge>
                              <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[9px] ${RISK_LEVEL_MAP[f.riskLevel].color}`}>
                                <span className={`h-1 w-1 rounded-full ${RISK_LEVEL_MAP[f.riskLevel].dot}`} /> {f.riskLevel}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{f.field}</p>
                          </div>
                          <Select value={cur} onValueChange={(v) => setWizardData({ ...wizardData, fieldPermissions: { ...wizardData.fieldPermissions, [key]: v } })}>
                            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {FIELD_ACCESS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* STEP 7: Data Access Rules */}
                {wizardStep === 7 && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Define whose data this role can see. Choose a scope type — finer-grained rules (entity/branch/dept picker) are in the Data Access Rules tab.</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data Scope Type</Label>
                      <Select value={wizardData.scopeType} onValueChange={(v) => setWizardData({ ...wizardData, scopeType: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DATA_SCOPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Card className="bg-muted/30 border-dashed">
                      <CardContent className="p-3 text-xs text-muted-foreground">
                        Selected: <strong>{DATA_SCOPES.find(s => s.value === wizardData.scopeType)?.label}</strong>
                        <p className="mt-1">This controls which employee records the role can view/edit.</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* STEP 8: Approval Permissions */}
                {wizardStep === 8 && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Define which modules this role can approve in. Approval routing & fallbacks are configured in the Approval Roles tab.</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {MODULES.filter(m => wizardData.modulePermissions[m.id] && wizardData.modulePermissions[m.id] !== "NoAccess").map(m => (
                        <Card key={m.id}>
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{m.label}</p>
                              <p className="text-[10px] text-muted-foreground">Can approve requests</p>
                            </div>
                            <Switch defaultChecked={["Manage", "FullAccess"].includes(wizardData.modulePermissions[m.id])} />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 9: Export/Import */}
                {wizardStep === 9 && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Bulk set export & import permissions per module.</p>
                    <div className="space-y-1">
                      {MODULES.filter(m => wizardData.modulePermissions[m.id] && wizardData.modulePermissions[m.id] !== "NoAccess").map(m => (
                        <div key={m.id} className="flex items-center justify-between rounded-lg border border-border/40 p-2.5">
                          <span className="text-sm">{m.label}</span>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" defaultChecked className="rounded" /> Export</label>
                            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" defaultChecked={["Manage", "FullAccess"].includes(wizardData.modulePermissions[m.id])} className="rounded" /> Import</label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 10: Review */}
                {wizardStep === 10 && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Review the role configuration and publish.</p>
                    <Card className="bg-gradient-to-br from-violet-50 to-emerald-50 dark:from-violet-950/30 dark:to-emerald-950/20 border-violet-200/50">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-violet-500" />
                          <h3 className="font-semibold">{wizardData.name || "Untitled Role"}</h3>
                          <Badge variant="outline" className="text-[10px] font-mono">{wizardData.code || "—"}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Type:</span> {ROLE_TYPE_MAP[wizardData.roleType]?.label}</div>
                          <div><span className="text-muted-foreground">Risk:</span> {RISK_LEVEL_MAP[wizardData.riskLevel]?.label}</div>
                          <div><span className="text-muted-foreground">Status:</span> {wizardData.status}</div>
                          <div><span className="text-muted-foreground">Scope:</span> {DATA_SCOPES.find(s => s.value === wizardData.scopeType)?.label}</div>
                        </div>
                        <div className="pt-2 border-t border-border/40">
                          <p className="text-xs font-medium mb-1">Module Access Summary</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(wizardData.modulePermissions).filter(([, v]) => v !== "NoAccess").map(([k, v]) => (
                              <span key={k} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-white ${ACCESS_LEVEL_MAP[v]?.color}`}>
                                {MODULES.find(m => m.id === k)?.label || k}: {ACCESS_LEVEL_MAP[v]?.label}
                              </span>
                            ))}
                            {Object.entries(wizardData.modulePermissions).filter(([, v]) => v !== "NoAccess").length === 0 && (
                              <span className="text-[10px] text-muted-foreground italic">No module access granted</span>
                            )}
                          </div>
                        </div>
                        <div className="pt-2 border-t border-border/40">
                          <p className="text-xs font-medium mb-1">Field Restrictions ({Object.keys(wizardData.fieldPermissions).length})</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(wizardData.fieldPermissions).map(([k, v]) => (
                              <span key={k} className="text-[10px] text-muted-foreground">{k.split("|")[1]}: {v}</span>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Button className="w-full gap-2 bg-gradient-to-r from-violet-500 to-emerald-500" onClick={publishRole} disabled={saving}>
                      <Save className="h-4 w-4" /> {saving ? "Publishing..." : "Publish Role"}
                    </Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Wizard nav */}
          {wizardStep < 10 && (
            <div className="px-6 py-3 border-t border-border/60 bg-muted/30 flex items-center justify-between sticky bottom-0">
              <Button variant="outline" size="sm" disabled={wizardStep === 1} onClick={() => setWizardStep(s => Math.max(1, s - 1))} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <span className="text-xs text-muted-foreground">{wizardStep} / {STEPS.length}</span>
              <Button size="sm" onClick={() => setWizardStep(s => Math.min(STEPS.length, s + 1))} className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* View Permissions Modal */}
      <Dialog open={!!viewRole} onOpenChange={(o) => !o && setViewRole(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-violet-500" />
              {viewRole?.name}
              <Badge variant="outline" className="text-[10px] font-mono">{viewRole?.code}</Badge>
            </DialogTitle>
            <DialogDescription>{viewRole?.description || "No description provided"}</DialogDescription>
          </DialogHeader>
          {viewRole && (
            <div className="space-y-4">
              {/* Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-lg border border-border/40 p-2">
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{ROLE_TYPE_MAP[viewRole.roleType]?.label || viewRole.roleType}</p>
                </div>
                <div className="rounded-lg border border-border/40 p-2">
                  <p className="text-muted-foreground">Risk</p>
                  <p className="font-medium">{RISK_LEVEL_MAP[viewRole.riskLevel]?.label}</p>
                </div>
                <div className="rounded-lg border border-border/40 p-2">
                  <p className="text-muted-foreground">Users</p>
                  <p className="font-medium">{viewRole._count?.userRoles || 0}</p>
                </div>
                <div className="rounded-lg border border-border/40 p-2">
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{viewRole.status}</p>
                </div>
              </div>

              {/* Module Permissions */}
              <div>
                <p className="text-sm font-semibold mb-2">Module Access</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {viewRole.modulePermissions.map(mp => {
                    const m = MODULES.find(x => x.id === mp.module)
                    const al = ACCESS_LEVEL_MAP[mp.accessLevel]
                    if (mp.accessLevel === "NoAccess") return null
                    return (
                      <div key={mp.id} className="flex items-center gap-2 rounded-lg border border-border/40 p-2 text-xs">
                        <span className={`h-2 w-2 rounded-full ${al?.color}`} />
                        <span className="flex-1 truncate">{m?.label || mp.module}</span>
                        <span className="text-[10px] text-muted-foreground">{al?.label}</span>
                      </div>
                    )
                  })}
                  {viewRole.modulePermissions.filter(m => m.accessLevel !== "NoAccess").length === 0 && (
                    <p className="text-xs text-muted-foreground col-span-full">No module access granted.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Compare Modal */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><GitCompare className="h-4 w-4" /> Compare Roles</DialogTitle>
            <DialogDescription>See side-by-side module permission differences.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Select value={compareA} onValueChange={setCompareA}>
              <SelectTrigger><SelectValue placeholder="Role A" /></SelectTrigger>
              <SelectContent>
                {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={compareB} onValueChange={setCompareB}>
              <SelectTrigger><SelectValue placeholder="Role B" /></SelectTrigger>
              <SelectContent>
                {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={runCompare} className="gap-1.5"><GitCompare className="h-4 w-4" /> Compare</Button>

          {compareResult && (
            <div className="mt-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left p-2 font-medium text-muted-foreground">Module</th>
                    <th className="p-2 font-medium text-muted-foreground text-center">{compareResult.roleA.name}</th>
                    <th className="p-2 font-medium text-muted-foreground text-center">{compareResult.roleB.name}</th>
                    <th className="p-2 font-medium text-muted-foreground">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map(m => {
                    const a = compareResult.roleA.modulePermissions.find((x: any) => x.module === m.id)?.accessLevel || "NoAccess"
                    const b = compareResult.roleB.modulePermissions.find((x: any) => x.module === m.id)?.accessLevel || "NoAccess"
                    const diff = a !== b
                    return (
                      <tr key={m.id} className={`border-b border-border/20 ${diff ? "bg-amber-50/50 dark:bg-amber-500/5" : ""}`}>
                        <td className="p-2 font-medium">{m.label}</td>
                        <td className="p-2 text-center"><span className={`inline-block h-2 w-2 rounded-full ${ACCESS_LEVEL_MAP[a]?.color}`} /></td>
                        <td className="p-2 text-center"><span className={`inline-block h-2 w-2 rounded-full ${ACCESS_LEVEL_MAP[b]?.color}`} /></td>
                        <td className="p-2">{diff ? <span className="text-amber-600 text-[10px]">≠</span> : <span className="text-emerald-600 text-[10px]">=</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600"><Trash2 className="h-4 w-4" /> Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code})? This action cannot be undone.
            </DialogDescription>
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
