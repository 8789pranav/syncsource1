"use client"

// ============================================================
// AssetsTab — assigned assets + asset requests.
// ------------------------------------------------------------
// APIs:
//   GET /api/assets?status=Assigned (filter client-side by assignedToId)
//   PATCH /api/assets/<assetId> (status=Returned closes assignment)
//   GET /api/asset-requests?employeeId=
//   POST /api/asset-requests
//   GET /api/asset-categories (for request form)
// ============================================================

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Plus, RefreshCw, Loader2, Package, PackageCheck, PackageX,
  Eye, Undo2, History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SectionCard, EmptyState, StatCard } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"

// ---------- types ----------

interface AssetRec {
  id: string
  assetCode: string
  name: string
  serialNumber?: string | null
  assetTag?: string | null
  categoryId?: string | null
  category?: { id: string; name: string; code: string } | null
  condition: string
  status: string
  assignedToId?: string | null
  assignedDate?: string | Date | null
  returnDate?: string | Date | null
  notes?: string | null
}

interface AssetRequestRec {
  id: string
  requestType: string
  reason?: string | null
  priority: string
  status: string
  category?: { id: string; name: string; code: string } | null
  createdAt: string | Date
}

interface CategoryRec { id: string; name: string; code: string }

// ---------- helpers ----------

const CONDITION_COLORS: Record<string, string> = {
  Good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Fair: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Damaged: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Lost: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
}

const REQ_STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Fulfilled: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
}

const REQUEST_TYPES = ["New", "Replacement", "Repair"]
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"]

function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  try { return format(new Date(d), "dd MMM yyyy") } catch { return "—" }
}

// ============================================================
// Component
// ============================================================

export default function AssetsTab({
  employeeId,
  employee,
}: {
  employeeId: string
  employee: any
}) {
  const [assets, setAssets] = React.useState<AssetRec[]>([])
  const [requests, setRequests] = React.useState<AssetRequestRec[]>([])
  const [categories, setCategories] = React.useState<CategoryRec[]>([])
  const [loading, setLoading] = React.useState(true)
  const [tab, setTab] = React.useState<string>("assigned")
  const [requestOpen, setRequestOpen] = React.useState(false)
  const [viewAsset, setViewAsset] = React.useState<AssetRec | null>(null)
  const [returnTarget, setReturnTarget] = React.useState<AssetRec | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, rRes, cRes] = await Promise.all([
        apiFetch(`/api/assets`),
        apiFetch(`/api/asset-requests?employeeId=${encodeURIComponent(employeeId)}`),
        apiFetch(`/api/asset-categories`),
      ])
      const aData = await aRes.json()
      const rData = await rRes.json()
      const cData = await cRes.json()
      if (!aRes.ok) throw new Error(aData?.error || "Failed to load assets")
      if (!rRes.ok) throw new Error(rData?.error || "Failed to load requests")
      // Filter assets assigned to this employee OR previously returned (for history)
      const all: AssetRec[] = aData?.items || []
      setAssets(all.filter((a) => a.assignedToId === employeeId))
      setRequests(rData?.items || [])
      setCategories(cData?.items || [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load asset data")
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  React.useEffect(() => { load() }, [load])

  // Stats
  const assignedNow = assets.filter((a) => a.status === "Assigned")
  const byCategory = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const a of assignedNow) {
      const k = a.category?.name || "Uncategorized"
      m.set(k, (m.get(k) || 0) + 1)
    }
    return Array.from(m.entries()).map(([name, count]) => ({ name, count }))
  }, [assignedNow])
  const byCondition = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const a of assignedNow) {
      m.set(a.condition, (m.get(a.condition) || 0) + 1)
    }
    return Array.from(m.entries()).map(([name, count]) => ({ name, count }))
  }, [assignedNow])

  async function handleReturn() {
    if (!returnTarget) return
    try {
      const res = await apiFetch(`/api/assets/${returnTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Returned" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to return asset")
      toast.success("Asset returned — assignment closed")
      setReturnTarget(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to return asset")
    }
  }

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
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Assets</h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Assets currently assigned to this employee, plus their asset request history.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setRequestOpen(true)}>
            <Plus className="h-4 w-4" /> Request Asset
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Assigned Now" value={assignedNow.length} icon={PackageCheck} accent="emerald" />
        <StatCard label="Total Records" value={assets.length} icon={Package} accent="cyan" />
        <StatCard label="Requests" value={requests.length} icon={History} accent="amber" />
        <StatCard label="Pending Requests" value={requests.filter((r) => r.status === "Pending").length} icon={PackageX} accent="coral" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="By Category" description="Distribution of currently assigned assets">
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No assets currently assigned.</p>
          ) : (
            <div className="space-y-2">
              {byCategory.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <span className="text-sm">{c.name}</span>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 tabular-nums">{c.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="By Condition" description="Asset condition of assigned items">
          {byCondition.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No assets currently assigned.</p>
          ) : (
            <div className="space-y-2">
              {byCondition.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <span className="text-sm">{c.name}</span>
                  <Badge variant="secondary" className={cn("font-medium border-0 tabular-nums", CONDITION_COLORS[c.name] || "bg-muted text-muted-foreground")}>{c.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="assigned" className="gap-1.5"><Package className="h-3.5 w-3.5" /> Assigned Assets</TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5"><History className="h-3.5 w-3.5" /> Request History</TabsTrigger>
        </TabsList>

        {/* Assigned assets */}
        <TabsContent value="assigned" className="space-y-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : assets.length === 0 ? (
            <EmptyState icon={Package} title="No assets assigned"
              description="This employee has no asset assignments on record."
              action={<Button size="sm" onClick={() => setRequestOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Request Asset</Button>} />
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
              <ScrollArea className="max-h-[560px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asset Code</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Serial</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Condition</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Returned</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((a) => (
                      <TableRow key={a.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setViewAsset(a)}>
                        <TableCell className="font-mono text-xs">{a.assetCode}</TableCell>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{a.serialNumber || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{a.category?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium border-0", CONDITION_COLORS[a.condition] || "bg-muted text-muted-foreground")}>
                            {a.condition}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(a.assignedDate)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(a.returnDate)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium border-0",
                            a.status === "Assigned" ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400"
                            : a.status === "Returned" ? "bg-muted text-muted-foreground"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                          )}>
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewAsset(a)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {a.status === "Assigned" && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                                onClick={() => setReturnTarget(a)}>
                                <Undo2 className="h-3.5 w-3.5" /> Return
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </TabsContent>

        {/* Requests */}
        <TabsContent value="requests" className="space-y-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : requests.length === 0 ? (
            <EmptyState icon={History} title="No asset requests"
              description="Asset requests raised by this employee will appear here."
              action={<Button size="sm" onClick={() => setRequestOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Request Asset</Button>} />
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
              <ScrollArea className="max-h-[560px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r) => (
                      <TableRow key={r.id} className="hover:bg-muted/30">
                        <TableCell>
                          <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400">{r.requestType}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.category?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium border-0",
                            r.priority === "Urgent" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                            : r.priority === "High" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                            : "bg-muted text-muted-foreground"
                          )}>{r.priority}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[240px] truncate" title={r.reason || ""}>{r.reason || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium border-0", REQ_STATUS_COLORS[r.status] || "bg-muted text-muted-foreground")}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Request dialog */}
      <RequestAssetDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        employeeId={employeeId}
        categories={categories}
        onCreated={load}
      />

      {/* View dialog */}
      <Dialog open={!!viewAsset} onOpenChange={(o) => !o && setViewAsset(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {viewAsset?.name}
            </DialogTitle>
            <DialogDescription>{viewAsset?.assetCode}</DialogDescription>
          </DialogHeader>
          {viewAsset && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Serial Number</p>
                <p className="font-medium font-mono text-xs">{viewAsset.serialNumber || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Asset Tag</p>
                <p className="font-medium font-mono text-xs">{viewAsset.assetTag || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="font-medium">{viewAsset.category?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Condition</p>
                <Badge variant="secondary" className={cn("font-medium border-0", CONDITION_COLORS[viewAsset.condition] || "bg-muted text-muted-foreground")}>
                  {viewAsset.condition}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned Date</p>
                <p className="font-medium">{fmtDate(viewAsset.assignedDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Return Date</p>
                <p className="font-medium">{fmtDate(viewAsset.returnDate)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="font-medium">{viewAsset.notes || "—"}</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {viewAsset?.status === "Assigned" && (
              <Button variant="outline" className="gap-1.5 text-amber-600 hover:bg-amber-500/10"
                onClick={() => { setReturnTarget(viewAsset); setViewAsset(null) }}>
                <Undo2 className="h-4 w-4" /> Return Asset
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return confirm */}
      <AlertDialog open={!!returnTarget} onOpenChange={(o) => !o && setReturnTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return this asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark <span className="font-medium">{returnTarget?.name}</span> ({returnTarget?.assetCode}) as Returned.
              The open assignment will be closed with today's return date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white" onClick={handleReturn}>
              <Undo2 className="h-4 w-4" /> Return Asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// ============================================================
// Request Asset Dialog
// ============================================================

function RequestAssetDialog({
  open, onOpenChange, employeeId, categories, onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employeeId: string
  categories: CategoryRec[]
  onCreated: () => void
}) {
  const [form, setForm] = React.useState({
    requestType: "New",
    categoryId: "",
    reason: "",
    priority: "Medium",
  })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) setForm({ requestType: "New", categoryId: "", reason: "", priority: "Medium" })
  }, [open])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/asset-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          requestType: form.requestType,
          categoryId: form.categoryId || undefined,
          reason: form.reason || undefined,
          priority: form.priority,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to submit request")
      toast.success("Asset request submitted")
      onOpenChange(false)
      onCreated()
    } catch (e: any) {
      toast.error(e.message || "Failed to submit request")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Asset</DialogTitle>
          <DialogDescription>Raise a new asset request. It will be created in Pending status.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Request Type</Label>
              <Select value={form.requestType} onValueChange={(v) => setForm({ ...form, requestType: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select category (optional)" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3}
              placeholder="Why is this asset needed?" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
