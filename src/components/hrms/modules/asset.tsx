'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Package, Boxes, ClipboardList, CheckCircle2, XCircle, PackageCheck, PackageX, Wrench, Search } from "lucide-react"

import { PageHeader, StatCard, ListToolbar, DataTable, StatusBadge, EmptyState, SectionCard, useAsyncAction, type Column } from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { assetFormSchema, assetCategoryFormSchema } from "@/lib/form-schemas"
import { FormSchema } from "@/lib/types"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { apiFetch } from "@/lib/api-client"

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`

// Asset request schema (local; not in default registry)
const assetRequestFormSchema: FormSchema = {
  code: "assetRequest-default",
  name: "New Asset Request",
  module: "assetRequest",
  sections: [{
    id: "sec-1",
    title: "Request Details",
    fields: [
      { id: uid("f"), key: "employeeId", label: "Employee", type: "employee", width: "full", endpoint: "/api/employees/picker", validation: { required: true } },
      { id: uid("f"), key: "categoryId", label: "Asset Category", type: "assetCategory", width: "half", endpoint: "/api/asset-categories" },
      { id: uid("f"), key: "requestType", label: "Request Type", type: "select", width: "half", defaultValue: "New", options: [
        { label: "New", value: "New" }, { label: "Replacement", value: "Replacement" }, { label: "Repair", value: "Repair" },
      ] },
      { id: uid("f"), key: "priority", label: "Priority", type: "select", width: "half", defaultValue: "Medium", options: [
        { label: "Low", value: "Low" }, { label: "Medium", value: "Medium" }, { label: "High", value: "High" }, { label: "Urgent", value: "Urgent" },
      ] },
      { id: uid("f"), key: "reason", label: "Reason / Justification", type: "textarea", width: "full" },
    ],
  }],
}

interface Category { id: string; code: string; name: string; icon?: string | null; description?: string | null; assetCount?: number }
interface Employee { id: string; employeeCode: string; firstName?: string; lastName?: string; displayName?: string }
interface AssetAssignment { id: string; assignedDate: string; returnDate?: string | null; condition: string; notes?: string | null; employee: Employee }
interface Asset {
  id: string
  assetCode: string
  name: string
  category?: { id: string; name: string; code: string } | null
  categoryId?: string | null
  serialNumber?: string | null
  assetTag?: string | null
  purchaseDate?: string | null
  purchaseValue?: number | null
  condition: string
  status: string
  assignedToId?: string | null
  assignedTo?: Employee | null
  assignedDate?: string | null
  returnDate?: string | null
  notes?: string | null
  assignments?: AssetAssignment[]
  createdAt: string
}
interface AssetRequest {
  id: string
  employee: Employee
  category?: { id: string; name: string; code: string } | null
  requestType: string
  reason?: string | null
  status: string
  priority: string
  createdAt: string
}

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—")
const empName = (e?: Employee | null) => e ? (e.displayName || `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.employeeCode) : "—"
const fmtMoney = (v?: number | null) => (v !== null && v !== undefined) ? `₹${Number(v).toLocaleString("en-IN")}` : "—"

// ============================================================
// ASSETS MODULE
// ============================================================

export function AssetsModule() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Asset Management"
        description="Track, assign, and request company assets. Manage categories and approvals in one place."
        icon={Package}
      />
      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="assets" className="gap-1.5"><Package className="h-4 w-4" /> Assets</TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5"><Boxes className="h-4 w-4" /> Categories</TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="assets"><AssetsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="requests"><RequestsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// ASSETS TAB
// ============================================================

function AssetsTab() {
  const [rows, setRows] = React.useState<Asset[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [catFilter, setCatFilter] = React.useState("all")
  const [categories, setCategories] = React.useState<Category[]>([])
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Asset | null>(null)
  const [detail, setDetail] = React.useState<Asset | null>(null)
  const { loading: saving, run } = useAsyncAction()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (catFilter !== "all") params.set("category", catFilter)
      if (search) params.set("q", search)
      const res = await apiFetch(`/api/assets?${params.toString()}`)
      const data = await res.json()
      setRows(data.items || [])
    } catch {
      toast.error("Failed to load assets")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, catFilter, search])

  const loadCategories = React.useCallback(async () => {
    try {
      const res = await apiFetch("/api/asset-categories")
      const data = await res.json()
      setCategories(data.items || [])
    } catch {}
  }, [])

  React.useEffect(() => { load() }, [load])
  React.useEffect(() => { loadCategories() }, [loadCategories])

  const stats = React.useMemo(() => {
    const inStock = rows.filter((r) => r.status === "In Stock").length
    const assigned = rows.filter((r) => r.status === "Assigned").length
    const damagedLost = rows.filter((r) => r.status === "Damaged" || r.status === "Lost").length
    return { inStock, assigned, damagedLost, total: rows.length }
  }, [rows])

  const handleSave = async (values: any) => {
    await run(async () => {
      const isEdit = !!editing
      const url = isEdit ? `/api/assets/${editing!.id}` : "/api/assets"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Save failed")
      }
      toast.success(isEdit ? "Asset updated" : "Asset created")
      setOpen(false)
      setEditing(null)
      load()
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this asset?")) return
    const res = await apiFetch(`/api/assets/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Asset deleted"); setDetail(null); load() }
    else toast.error("Delete failed")
  }

  const columns: Column<Asset>[] = [
    { key: "assetCode", header: "Code", width: "120px", render: (r) => <span className="font-mono text-xs font-semibold text-foreground">{r.assetCode}</span> },
    { key: "name", header: "Name", render: (r) => (
      <div className="min-w-0">
        <p className="font-medium text-foreground truncate">{r.name}</p>
        {r.serialNumber && <p className="text-xs text-muted-foreground truncate">SN: {r.serialNumber}</p>}
      </div>
    ) },
    { key: "category", header: "Category", render: (r) => r.category ? <Badge variant="outline" className="font-normal">{r.category.name}</Badge> : <span className="text-muted-foreground/50 italic text-xs">—</span> },
    { key: "assignedTo", header: "Assigned To", render: (r) => r.assignedTo ? <span className="text-sm">{empName(r.assignedTo)}</span> : <span className="text-muted-foreground/50 italic text-xs">—</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "condition", header: "Condition", render: (r) => <span className="text-xs text-muted-foreground">{r.condition}</span> },
    { key: "purchaseValue", header: "Value", render: (r) => <span className="text-sm tabular-nums">{fmtMoney(r.purchaseValue)}</span>, className: "text-right" },
    { key: "actions", header: "", width: "60px", render: (r) => (
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditing(r); setOpen(true) }}>
        <Pencil className="h-4 w-4" />
      </Button>
    ) },
  ]

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <StatCard label="Total Assets" value={stats.total} icon={Package} accent="emerald" />
        <StatCard label="In Stock" value={stats.inStock} icon={PackageCheck} accent="emerald" />
        <StatCard label="Assigned" value={stats.assigned} icon={ClipboardList} accent="cyan" />
        <StatCard label="Damaged / Lost" value={stats.damagedLost} icon={PackageX} accent="coral" />
      </motion.div>

      <ListToolbar
        search={search}
        onSearch={setSearch}
        onAdd={() => { setEditing(null); setOpen(true) }}
        addLabel="Add Asset"
        extra={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="In Stock">In Stock</SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="Returned">Returned</SelectItem>
                <SelectItem value="Damaged">Damaged</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
                <SelectItem value="Repair">Repair</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onRowClick={(r) => setDetail(r)}
        emptyState={<EmptyState icon={Package} title="No assets found" description="Adjust your filters or add a new asset to get started." />}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Asset" : "Add Asset"}</DialogTitle>
            <DialogDescription>{editing ? `Update ${editing.assetCode}` : "Create a new asset record."}</DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={assetFormSchema}
            initialValues={editing || {}}
            onSubmit={handleSave}
            onCancel={() => { setOpen(false); setEditing(null) }}
            submitLabel={editing ? "Update" : "Create"}
            loading={saving}
            layout="flat"
          />
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Package className="h-5 w-5" /></span>
                  <span>{detail.name}</span>
                </SheetTitle>
                <SheetDescription className="font-mono text-xs">{detail.assetCode}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4">
                <div className="flex items-center gap-2">
                  <StatusBadge status={detail.status} />
                  <Badge variant="outline" className="text-xs">{detail.condition}</Badge>
                  {detail.category && <Badge variant="outline" className="text-xs">{detail.category.name}</Badge>}
                </div>

                <SectionCard title="Details">
                  <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <DetailItem label="Serial #" value={detail.serialNumber} />
                    <DetailItem label="Asset Tag" value={detail.assetTag} />
                    <DetailItem label="Purchase Date" value={fmtDate(detail.purchaseDate)} />
                    <DetailItem label="Purchase Value" value={fmtMoney(detail.purchaseValue)} />
                    <DetailItem label="Assigned To" value={detail.assignedTo ? empName(detail.assignedTo) : null} />
                    <DetailItem label="Assigned Date" value={fmtDate(detail.assignedDate)} />
                  </dl>
                </SectionCard>

                {detail.notes && (
                  <SectionCard title="Notes">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detail.notes}</p>
                  </SectionCard>
                )}

                <SectionCard title="Assignment History">
                  {detail.assignments && detail.assignments.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {detail.assignments.map((a, i) => (
                        <div key={a.id} className="rounded-lg border border-border/60 p-2.5 text-sm">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{empName(a.employee)}</p>
                            {a.returnDate
                              ? <Badge variant="secondary" className="text-[10px] bg-muted">Returned</Badge>
                              : <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">Active</Badge>
                            }
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Assigned: {fmtDate(a.assignedDate)} {a.returnDate && `· Returned: ${fmtDate(a.returnDate)}`}
                          </p>
                          {a.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{a.notes}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No assignments yet.</p>
                  )}
                </SectionCard>

                <Separator />
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(detail); setDetail(null); setOpen(true) }}>
                    <Pencil className="h-4 w-4 mr-1.5" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => handleDelete(detail.id)}>
                    <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-medium text-foreground mt-0.5">{value || <span className="text-muted-foreground/50 italic font-normal">—</span>}</dd>
    </div>
  )
}

// ============================================================
// CATEGORIES TAB
// ============================================================

function CategoriesTab() {
  const [rows, setRows] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(true)
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Category | null>(null)
  const { loading: saving, run } = useAsyncAction()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch("/api/asset-categories")
      const data = await res.json()
      setRows(data.items || [])
    } catch { toast.error("Failed to load categories") }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  const handleSave = async (values: any) => {
    await run(async () => {
      const isEdit = !!editing
      const url = isEdit ? `/api/asset-categories/${editing!.id}` : "/api/asset-categories"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Save failed")
      }
      toast.success(isEdit ? "Category updated" : "Category created")
      setOpen(false); setEditing(null); load()
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return
    const res = await apiFetch(`/api/asset-categories/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Category deleted"); load() }
    else toast.error("Delete failed")
  }

  return (
    <div className="space-y-4">
      <ListToolbar search="" onSearch={() => {}} onAdd={() => { setEditing(null); setOpen(true) }} addLabel="Add Category" />
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Boxes} title="No categories" description="Add categories like Laptops, Monitors, Phones to organize assets." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="group hover:shadow-card transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(c); setOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <p className="mt-3 font-semibold text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{c.code}</p>
                  {c.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.description}</p>}
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                      {c.assetCount || 0} assets
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>{editing ? `Update ${editing.name}` : "Create a new asset category."}</DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={assetCategoryFormSchema}
            initialValues={editing || {}}
            onSubmit={handleSave}
            onCancel={() => { setOpen(false); setEditing(null) }}
            submitLabel={editing ? "Update" : "Create"}
            loading={saving}
            layout="flat"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// REQUESTS TAB
// ============================================================

function RequestsTab() {
  const [rows, setRows] = React.useState<AssetRequest[]>([])
  const [loading, setLoading] = React.useState(true)
  const [open, setOpen] = React.useState(false)
  const { loading: saving, run } = useAsyncAction()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch("/api/asset-requests")
      const data = await res.json()
      setRows(data.items || [])
    } catch { toast.error("Failed to load requests") }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  const handleSave = async (values: any) => {
    await run(async () => {
      const res = await apiFetch("/api/asset-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Save failed")
      }
      toast.success("Request submitted")
      setOpen(false); load()
    })
  }

  const decide = async (id: string, status: "Approved" | "Rejected") => {
    const res = await apiFetch(`/api/asset-requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    if (res.ok) { toast.success(`Request ${status.toLowerCase()}`); load() }
    else toast.error("Action failed")
  }

  const priorityColor: Record<string, string> = {
    Low: "bg-muted text-muted-foreground",
    Medium: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
    High: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    Urgent: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  }

  const columns: Column<AssetRequest>[] = [
    { key: "employee", header: "Employee", render: (r) => (
      <div>
        <p className="font-medium">{empName(r.employee)}</p>
        <p className="text-xs text-muted-foreground">{r.employee.employeeCode}</p>
      </div>
    ) },
    { key: "requestType", header: "Type", render: (r) => <Badge variant="outline" className="font-normal">{r.requestType}</Badge> },
    { key: "category", header: "Category", render: (r) => r.category ? r.category.name : <span className="text-muted-foreground/50 italic text-xs">—</span> },
    { key: "priority", header: "Priority", render: (r) => <Badge variant="secondary" className={`font-normal ${priorityColor[r.priority] || ""}`}>{r.priority}</Badge> },
    { key: "createdAt", header: "Requested", render: (r) => <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "actions", header: "", width: "180px", render: (r) => (
      r.status === "Pending" ? (
        <div className="flex items-center gap-1.5 justify-end">
          <Button size="sm" variant="outline" className="h-7 gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => decide(r.id, "Approved")}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-rose-600 border-rose-500/30 hover:bg-rose-500/10" onClick={() => decide(r.id, "Rejected")}>
            <XCircle className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      ) : <span className="text-xs text-muted-foreground italic">—</span>
    ) },
  ]

  return (
    <div className="space-y-4">
      <ListToolbar search="" onSearch={() => {}} onAdd={() => setOpen(true)} addLabel="New Request" />
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyState={<EmptyState icon={ClipboardList} title="No asset requests" description="Submit a new asset request to start the approval flow." />}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New Asset Request</DialogTitle>
            <DialogDescription>Submit a request for a new, replacement, or repair asset.</DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={assetRequestFormSchema}
            initialValues={{}}
            onSubmit={handleSave}
            onCancel={() => setOpen(false)}
            submitLabel="Submit Request"
            loading={saving}
            layout="flat"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
