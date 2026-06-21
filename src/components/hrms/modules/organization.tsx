'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Building2, GitBranch, Network, Briefcase, Layers, MapPin,
  Trash2, Pencil,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  PageHeader, ListToolbar, DataTable, StatusBadge, EmptyState, Column,
} from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { getDefaultSchema } from "@/lib/form-schemas"
import type { FormSchema, FormValues } from "@/lib/types"

// ============================================================
// Inline schemas (Branches & Locations don't have a default schema)
// ============================================================

function rid(p: string) {
  return `${p}-${Math.random().toString(36).slice(2, 9)}`
}

const branchFormSchema: FormSchema = {
  code: "branch-default",
  name: "Add Branch",
  module: "branch",
  description: "Branch / office location",
  sections: [{
    id: "sec-1",
    title: "Branch Details",
    fields: [
      { id: rid("f"), key: "code", label: "Branch Code", type: "text", width: "half", validation: { required: true }, placeholder: "BR-MUM" },
      { id: rid("f"), key: "name", label: "Branch Name", type: "text", width: "half", validation: { required: true }, placeholder: "Mumbai HQ" },
      { id: rid("f"), key: "entityId", label: "Entity", type: "entity", width: "half", endpoint: "/api/entities" },
      { id: rid("f"), key: "branchHeadId", label: "Branch Head", type: "employee", width: "half", endpoint: "/api/employees/picker" },
      { id: rid("f"), key: "city", label: "City", type: "text", width: "half" },
      { id: rid("f"), key: "state", label: "State", type: "text", width: "half" },
      { id: rid("f"), key: "country", label: "Country", type: "text", width: "half", defaultValue: "India" },
      { id: rid("f"), key: "workingDays", label: "Working Days", type: "text", width: "half", defaultValue: "Mon,Tue,Wed,Thu,Fri" },
      { id: rid("f"), key: "address", label: "Address", type: "textarea", width: "full" },
      { id: rid("f"), key: "status", label: "Status", type: "select", width: "half", defaultValue: "Active", options: [
        { label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" },
      ] },
    ],
  }],
}

const locationFormSchema: FormSchema = {
  code: "location-default",
  name: "Add Location",
  module: "location",
  description: "Attendance location",
  sections: [{
    id: "sec-1",
    title: "Location Details",
    fields: [
      { id: rid("f"), key: "code", label: "Location Code", type: "text", width: "half", validation: { required: true }, placeholder: "LOC-MUM" },
      { id: rid("f"), key: "name", label: "Location Name", type: "text", width: "half", validation: { required: true }, placeholder: "Mumbai Office" },
      { id: rid("f"), key: "city", label: "City", type: "text", width: "half" },
      { id: rid("f"), key: "state", label: "State", type: "text", width: "half" },
      { id: rid("f"), key: "country", label: "Country", type: "text", width: "half", defaultValue: "India" },
      { id: rid("f"), key: "attendanceMode", label: "Attendance Mode", type: "select", width: "half", defaultValue: "Web", options: [
        { label: "Web", value: "Web" }, { label: "Mobile", value: "Mobile" },
        { label: "Biometric", value: "Biometric" }, { label: "Manual", value: "Manual" },
      ] },
      { id: rid("f"), key: "geoFenceRadius", label: "Geo-fence Radius (m)", type: "number", width: "half" },
      { id: rid("f"), key: "timezone", label: "Timezone", type: "text", width: "half", placeholder: "Asia/Kolkata" },
      { id: rid("f"), key: "address", label: "Address", type: "textarea", width: "full" },
      { id: rid("f"), key: "status", label: "Status", type: "select", width: "half", defaultValue: "Active", options: [
        { label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" },
      ] },
    ],
  }],
}

// ============================================================
// Utilities
// ============================================================

function formatCurrency(v?: number | null): string {
  if (v === undefined || v === null) return "—"
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v)
}

// Convert Prisma record (with ISO date strings) into form values.
function toFormValues(rec: any): FormValues {
  if (!rec) return {}
  const out: FormValues = {}
  for (const [k, v] of Object.entries(rec)) {
    if (v instanceof Date) out[k] = v.toISOString()
    else out[k] = v
  }
  return out
}

// ============================================================
// Generic Resource Panel
// ============================================================

interface PanelConfig {
  title: string
  description: string
  icon: LucideIcon
  endpoint: string
  schema: FormSchema
  addLabel: string
  columns: Column<any>[]
  searchKeys: (row: any) => string
  emptyTitle?: string
  emptyDescription?: string
}

function ResourcePanel(cfg: PanelConfig) {
  const [rows, setRows] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<any | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(cfg.endpoint, { cache: "no-store" })
      if (!res.ok) throw new Error("Request failed")
      const data = await res.json()
      setRows(data.items || [])
    } catch {
      toast.error(`Failed to load ${cfg.title.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }, [cfg.endpoint, cfg.title])

  React.useEffect(() => {
    load()
  }, [load])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => cfg.searchKeys(r).toLowerCase().includes(q))
  }, [rows, search, cfg])

  const onAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const onEdit = (row: any) => {
    setEditing(row)
    setDialogOpen(true)
  }

  const onSubmit = async (values: FormValues) => {
    setSaving(true)
    try {
      const isEdit = !!editing
      const url = isEdit ? `${cfg.endpoint}/${editing.id}` : cfg.endpoint
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to ${isEdit ? "update" : "create"} record`)
      }
      toast.success(isEdit ? `${cfg.title.replace(/s$/, "")} updated` : `${cfg.title.replace(/s$/, "")} created`)
      setDialogOpen(false)
      setEditing(null)
      await load()
    } catch (e: any) {
      toast.error(e.message || "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const onConfirmDelete = async () => {
    if (!deletingId) return
    try {
      const res = await fetch(`${cfg.endpoint}/${deletingId}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to delete")
      }
      toast.success("Record deleted")
      setDeletingId(null)
      await load()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete")
    }
  }

  const cols: Column<any>[] = [
    ...cfg.columns,
    {
      key: "_actions",
      header: "",
      width: "90px",
      className: "text-right",
      render: (row: any) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm" variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(row)}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeletingId(row.id)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  const singularTitle = cfg.title.replace(/s$/, "").toLowerCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <PageHeader
        title={cfg.title}
        description={cfg.description}
        icon={cfg.icon}
        badge={
          <Badge variant="secondary" className="ml-1.5 font-medium">
            {loading ? "…" : `${rows.length} ${rows.length === 1 ? singularTitle : cfg.title.toLowerCase()}`}
          </Badge>
        }
      />
      <ListToolbar
        search={search}
        onSearch={setSearch}
        onAdd={onAdd}
        addLabel={cfg.addLabel}
      />
      <DataTable
        columns={cols}
        rows={filtered}
        loading={loading}
        onRowClick={onEdit}
        emptyState={
          <EmptyState
            icon={cfg.icon}
            title={cfg.emptyTitle || `No ${cfg.title.toLowerCase()} yet`}
            description={cfg.emptyDescription || `Click "${cfg.addLabel}" to create your first record.`}
          />
        }
      />

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${singularTitle}` : cfg.addLabel}
            </DialogTitle>
            <DialogDescription>
              Fill in the details below. Fields marked <span className="text-destructive">*</span> are required.
            </DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={cfg.schema}
            initialValues={editing ? toFormValues(editing) : undefined}
            onSubmit={onSubmit}
            onCancel={() => { setDialogOpen(false); setEditing(null) }}
            submitLabel={editing ? "Update" : "Create"}
            loading={saving}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {singularTitle}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The record and any related data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// ============================================================
// Main Organization module
// ============================================================

export function OrganizationModule() {
  const [tab, setTab] = React.useState("entities")

  return (
    <div className="space-y-5">
      <PageHeader
        title="Organization"
        description="Manage entities, branches, departments, designations, grades, and locations."
        icon={Building2}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="entities" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Entities
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-1.5">
            <GitBranch className="h-3.5 w-3.5" /> Branches
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5">
            <Network className="h-3.5 w-3.5" /> Departments
          </TabsTrigger>
          <TabsTrigger value="designations" className="gap-1.5">
            <Briefcase className="h-3.5 w-3.5" /> Designations
          </TabsTrigger>
          <TabsTrigger value="grades" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Grades
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Locations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="mt-5">
          <EntitiesTab />
        </TabsContent>
        <TabsContent value="branches" className="mt-5">
          <BranchesTab />
        </TabsContent>
        <TabsContent value="departments" className="mt-5">
          <DepartmentsTab />
        </TabsContent>
        <TabsContent value="designations" className="mt-5">
          <DesignationsTab />
        </TabsContent>
        <TabsContent value="grades" className="mt-5">
          <GradesTab />
        </TabsContent>
        <TabsContent value="locations" className="mt-5">
          <LocationsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// Per-tab configurations
// ============================================================

function EntitiesTab() {
  const schema = getDefaultSchema("entity")!
  return (
    <ResourcePanel
      title="Entities"
      description="Legal entities (companies) operating under your tenant."
      icon={Building2}
      endpoint="/api/entities"
      schema={schema}
      addLabel="Add Entity"
      searchKeys={(r) => `${r.code} ${r.legalName} ${r.tradeName || ""} ${r.city || ""} ${r.country}`}
      columns={[
        {
          key: "code", header: "Code",
          render: (r) => <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">{r.code}</span>,
        },
        {
          key: "legalName", header: "Legal Name",
          render: (r) => (
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate">{r.legalName}</div>
              {r.tradeName && <div className="text-xs text-muted-foreground truncate">{r.tradeName}</div>}
            </div>
          ),
        },
        { key: "country", header: "Country", render: (r) => <span className="text-sm">{r.country}</span> },
        { key: "currency", header: "Currency", render: (r) => <span className="font-mono text-xs">{r.currency}</span> },
        {
          key: "_stats", header: "Stats",
          render: (r) => (
            <div className="text-xs text-muted-foreground">
              {r._count?.employees || 0} emp · {r._count?.branches || 0} br · {r._count?.departments || 0} dept
            </div>
          ),
        },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  )
}

function BranchesTab() {
  return (
    <ResourcePanel
      title="Branches"
      description="Physical branches / office locations tied to an entity."
      icon={GitBranch}
      endpoint="/api/branches"
      schema={branchFormSchema}
      addLabel="Add Branch"
      searchKeys={(r) => `${r.code} ${r.name} ${r.city || ""} ${r.state || ""} ${r.entity?.legalName || ""}`}
      columns={[
        {
          key: "code", header: "Code",
          render: (r) => <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">{r.code}</span>,
        },
        {
          key: "name", header: "Name",
          render: (r) => (
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate">{r.name}</div>
              <div className="text-xs text-muted-foreground truncate">{r.city ? `${r.city}${r.state ? ", " + r.state : ""}` : "—"}</div>
            </div>
          ),
        },
        {
          key: "entity", header: "Entity",
          render: (r) => r.entity ? (
            <span className="text-sm">{r.entity.tradeName || r.entity.legalName}</span>
          ) : <span className="text-muted-foreground/50 italic text-sm">—</span>,
        },
        { key: "workingDays", header: "Working Days", render: (r) => <span className="text-xs text-muted-foreground">{r.workingDays}</span> },
        { key: "_empCount", header: "Employees", render: (r) => <span className="text-xs">{r._count?.employees || 0}</span> },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  )
}

function DepartmentsTab() {
  const schema = getDefaultSchema("department")!
  return (
    <ResourcePanel
      title="Departments"
      description="Organizational departments with hierarchy & head assignment."
      icon={Network}
      endpoint="/api/departments"
      schema={schema}
      addLabel="Add Department"
      searchKeys={(r) => `${r.code} ${r.name} ${r.entity?.legalName || ""} ${r.parent?.name || ""} ${r.head?.firstName || ""}`}
      columns={[
        {
          key: "code", header: "Code",
          render: (r) => <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">{r.code}</span>,
        },
        {
          key: "name", header: "Department",
          render: (r) => (
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate">{r.name}</div>
              {r.parent && <div className="text-xs text-muted-foreground truncate">↳ {r.parent.name}</div>}
            </div>
          ),
        },
        {
          key: "entity", header: "Entity",
          render: (r) => r.entity ? (
            <span className="text-sm">{r.entity.tradeName || r.entity.legalName}</span>
          ) : <span className="text-muted-foreground/50 italic text-sm">—</span>,
        },
        {
          key: "head", header: "Head",
          render: (r) => r.head ? (
            <span className="text-sm">{r.head.firstName} {r.head.lastName || ""}</span>
          ) : <span className="text-muted-foreground/50 italic text-sm">—</span>,
        },
        { key: "_empCount", header: "Employees", render: (r) => <span className="text-xs">{r._count?.employees || 0}</span> },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  )
}

function DesignationsTab() {
  const schema = getDefaultSchema("designation")!
  return (
    <ResourcePanel
      title="Designations"
      description="Job titles, levels, and grade mappings."
      icon={Briefcase}
      endpoint="/api/designations"
      schema={schema}
      addLabel="Add Designation"
      searchKeys={(r) => `${r.code} ${r.name} ${r.grade?.name || ""} ${r.level ?? ""}`}
      columns={[
        {
          key: "code", header: "Code",
          render: (r) => <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">{r.code}</span>,
        },
        {
          key: "name", header: "Designation",
          render: (r) => <div className="font-medium text-foreground">{r.name}</div>,
        },
        {
          key: "grade", header: "Grade",
          render: (r) => r.grade ? (
            <span className="text-sm">{r.grade.name} <span className="text-xs text-muted-foreground">L{r.grade.hierarchyLevel}</span></span>
          ) : <span className="text-muted-foreground/50 italic text-sm">—</span>,
        },
        { key: "level", header: "Level", render: (r) => r.level != null ? <span className="font-mono text-xs">{r.level}</span> : <span className="text-muted-foreground/50 italic text-sm">—</span> },
        { key: "_empCount", header: "Employees", render: (r) => <span className="text-xs">{r._count?.employees || 0}</span> },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  )
}

function GradesTab() {
  const schema = getDefaultSchema("grade")!
  return (
    <ResourcePanel
      title="Grades"
      description="Bands / grades used for hierarchy, salary ranges & approval authority."
      icon={Layers}
      endpoint="/api/grades"
      schema={schema}
      addLabel="Add Grade"
      searchKeys={(r) => `${r.code} ${r.name} ${r.hierarchyLevel}`}
      columns={[
        {
          key: "code", header: "Code",
          render: (r) => <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">{r.code}</span>,
        },
        { key: "name", header: "Name", render: (r) => <div className="font-medium text-foreground">{r.name}</div> },
        {
          key: "hierarchyLevel", header: "Level",
          render: (r) => <Badge variant="outline" className="font-mono text-xs">L{r.hierarchyLevel}</Badge>,
        },
        {
          key: "salary", header: "Salary Range",
          render: (r) => (
            <span className="text-xs text-muted-foreground">
              {formatCurrency(r.minSalary)} – {formatCurrency(r.maxSalary)}
            </span>
          ),
        },
        {
          key: "approvalAuthority", header: "Approver",
          render: (r) => r.approvalAuthority
            ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 text-xs">Yes</Badge>
            : <span className="text-muted-foreground/50 italic text-sm">No</span>,
        },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  )
}

function LocationsTab() {
  return (
    <ResourcePanel
      title="Locations"
      description="Attendance-tracking locations with geo-fencing & mode."
      icon={MapPin}
      endpoint="/api/locations"
      schema={locationFormSchema}
      addLabel="Add Location"
      searchKeys={(r) => `${r.code} ${r.name} ${r.city || ""} ${r.state || ""} ${r.attendanceMode}`}
      columns={[
        {
          key: "code", header: "Code",
          render: (r) => <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">{r.code}</span>,
        },
        {
          key: "name", header: "Name",
          render: (r) => (
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate">{r.name}</div>
              <div className="text-xs text-muted-foreground truncate">{r.city ? `${r.city}${r.state ? ", " + r.state : ""}` : "—"}</div>
            </div>
          ),
        },
        {
          key: "attendanceMode", header: "Attendance Mode",
          render: (r) => <Badge variant="outline" className="text-xs">{r.attendanceMode}</Badge>,
        },
        {
          key: "geoFenceRadius", header: "Geo-fence",
          render: (r) => r.geoFenceRadius ? <span className="text-xs text-muted-foreground">{r.geoFenceRadius} m</span> : <span className="text-muted-foreground/50 italic text-sm">—</span>,
        },
        { key: "_empCount", header: "Employees", render: (r) => <span className="text-xs">{r._count?.employees || 0}</span> },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  )
}
