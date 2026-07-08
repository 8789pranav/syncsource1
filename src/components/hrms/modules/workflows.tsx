'use client'

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  Workflow as WorkflowIcon, Plus, Pencil, Trash2, Save, X, ArrowUp, ArrowDown,
  UserCog, GitBranch, ShieldCheck, UserCheck, Crown,
  CheckCircle2, XCircle, Clock, Zap, Sparkles, ChevronRight,
} from "lucide-react"

import { PageHeader, ListToolbar, DataTable, StatusBadge, EmptyState, useAsyncAction, type Column } from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { workflowFormSchema } from "@/lib/form-schemas"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`

type ApproverType = "ReportingManager" | "DepartmentHead" | "HRManager" | "SpecificEmployee" | "Role"

interface WfStep {
  id?: string
  level: number
  approverType: ApproverType
  approverId?: string | null
  approverRole?: string | null
  slaHours?: number | null
  name?: string | null
  approver?: { id: string; employeeCode: string; firstName?: string; lastName?: string; displayName?: string } | null
}

interface Wf {
  id: string
  code: string
  name: string
  module: string
  event: string
  description?: string | null
  approvalType: string
  isActive: boolean
  steps: WfStep[]
  updatedAt: string
}

const APPROVER_TYPES: { value: ApproverType; label: string; icon: any; color: string }[] = [
  { value: "ReportingManager", label: "Reporting Manager", icon: UserCog, color: "cyan" },
  { value: "DepartmentHead", label: "Department Head", icon: GitBranch, color: "emerald" },
  { value: "HRManager", label: "HR Manager", icon: ShieldCheck, color: "amber" },
  { value: "SpecificEmployee", label: "Specific Employee", icon: UserCheck, color: "fuchsia" },
  { value: "Role", label: "By Role", icon: Crown, color: "coral" },
]

function approverMeta(t: ApproverType) {
  return APPROVER_TYPES.find((a) => a.value === t) || APPROVER_TYPES[0]
}

function newStep(level: number): WfStep {
  return { level, approverType: "ReportingManager", slaHours: 24, name: null, approverId: null, approverRole: null, id: uid("step") }
}

// ============================================================
// MAIN MODULE
// ============================================================

export function WorkflowsModule() {
  const [rows, setRows] = React.useState<Wf[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [builderOpen, setBuilderOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Wf | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch("/api/workflows")
      const data = await res.json()
      setRows((data.items || []).map((w: any) => ({ ...w, steps: w.steps || [] })))
    } catch { toast.error("Failed to load workflows") }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()))

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this workflow?")) return
    const res = await apiFetch(`/api/workflows/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Workflow deleted"); load() }
    else toast.error("Delete failed")
  }

  const columns: Column<Wf>[] = [
    { key: "name", header: "Workflow", render: (r) => (
      <div className="min-w-0">
        <p className="font-medium text-foreground truncate">{r.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{r.code}</p>
      </div>
    ) },
    { key: "module", header: "Module", render: (r) => <Badge variant="outline" className="font-normal capitalize">{r.module}</Badge> },
    { key: "event", header: "Event", render: (r) => <span className="text-sm text-muted-foreground capitalize">{r.event}</span> },
    { key: "approvalType", header: "Approval", render: (r) => <span className="text-sm">{r.approvalType}</span> },
    { key: "steps", header: "Steps", render: (r) => <Badge variant="secondary" className="bg-muted">{r.steps.length}</Badge> },
    { key: "isActive", header: "Status", render: (r) => r.isActive ? <StatusBadge status="Active" /> : <StatusBadge status="Inactive" /> },
    { key: "actions", header: "", width: "120px", render: (r) => (
      <div className="flex items-center gap-1 justify-end">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditing(r); setBuilderOpen(true) }}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={(e) => { e.stopPropagation(); handleDelete(r.id) }}><Trash2 className="h-4 w-4" /></Button>
      </div>
    ) },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Workflow Builder"
        description="Configure approval chains for leaves, assets, expenses, and more. Visual editor for multi-step approvals."
        icon={WorkflowIcon}
        badge={<Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px]">Approval Engine</Badge>}
      />
      <ListToolbar
        search={search}
        onSearch={setSearch}
        onAdd={() => { setEditing(null); setBuilderOpen(true) }}
        addLabel="Create Workflow"
      />
      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        onRowClick={(r) => { setEditing(r); setBuilderOpen(true) }}
        emptyState={<EmptyState icon={WorkflowIcon} title="No workflows yet" description="Build your first approval chain to enable multi-level sign-offs." />}
      />

      <WorkflowBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        editing={editing}
        onSaved={() => load()}
      />
    </div>
  )
}

// ============================================================
// WORKFLOW BUILDER DIALOG
// ============================================================

function WorkflowBuilder({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Wf | null
  onSaved: () => void
}) {
  const [meta, setMeta] = React.useState<any>({})
  const [steps, setSteps] = React.useState<WfStep[]>([])
  const { loading: saving, run } = useAsyncAction()

  React.useEffect(() => {
    if (!open) return
    if (editing) {
      setMeta({ code: editing.code, name: editing.name, module: editing.module, event: editing.event, approvalType: editing.approvalType, isActive: editing.isActive, description: editing.description || "" })
      setSteps(editing.steps.length ? JSON.parse(JSON.stringify(editing.steps)) : [newStep(1)])
    } else {
      setMeta({ code: "", name: "", module: "leave", event: "apply", approvalType: "Sequential", isActive: true, description: "" })
      setSteps([newStep(1)])
    }
  }, [open, editing])

  const updateMeta = (k: string, v: any) => setMeta((m: any) => ({ ...m, [k]: v }))
  const updateStep = (id: string, patch: Partial<WfStep>) => setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const removeStep = (id: string) => setSteps((prev) => prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, level: i + 1 })))
  const addStep = () => setSteps((prev) => [...prev, newStep(prev.length + 1)])
  const moveStep = (id: string, dir: -1 | 1) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      const next = idx + dir
      if (idx < 0 || next < 0 || next >= prev.length) return prev
      const copy = [...prev]
      const [item] = copy.splice(idx, 1)
      copy.splice(next, 0, item)
      return copy.map((s, i) => ({ ...s, level: i + 1 }))
    })
  }

  const handleSave = async () => {
    if (!meta.name || !meta.code) { toast.error("Name and code are required"); return }
    if (steps.length === 0) { toast.error("Add at least one step"); return }
    await run(async () => {
      const payload = { ...meta, steps: steps.map(({ id, ...rest }, i) => ({ ...rest, level: i + 1 })) }
      const isEdit = !!editing
      const url = isEdit ? `/api/workflows/${editing!.id}` : "/api/workflows"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Save failed")
      }
      toast.success(isEdit ? "Workflow updated" : "Workflow created")
      onOpenChange(false)
      onSaved()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg gradient-emerald text-primary-foreground"><WorkflowIcon className="h-4 w-4" /></span>
            {editing ? "Edit Workflow" : "Create Workflow"}
          </DialogTitle>
          <DialogDescription>{editing ? `Update ${editing.name}` : "Define an approval chain for a module event."}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Metadata */}
          <Card className="border-border/60 shadow-soft">
            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Code" required>
                <Input value={meta.code || ""} onChange={(e) => updateMeta("code", e.target.value.replace(/\s+/g, "-").toUpperCase())} className="h-9 text-sm font-mono" placeholder="LEAVE-2LVL" />
              </Field>
              <Field label="Name" required>
                <Input value={meta.name || ""} onChange={(e) => updateMeta("name", e.target.value)} className="h-9 text-sm" placeholder="Leave Approval" />
              </Field>
              <Field label="Module">
                <Select value={meta.module || "leave"} onValueChange={(v) => updateMeta("module", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["leave", "asset", "attendance", "employee", "expense", "onboarding"].map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Event">
                <Select value={meta.event || "apply"} onValueChange={(v) => updateMeta("event", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["apply", "create", "update", "request"].map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Approval Type">
                <Select value={meta.approvalType || "Sequential"} onValueChange={(v) => updateMeta("approvalType", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Sequential", "Parallel", "Auto"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Active">
                <div className="flex items-center h-9 gap-2">
                  <Switch checked={!!meta.isActive} onCheckedChange={(v) => updateMeta("isActive", v)} />
                  <span className="text-xs text-muted-foreground">{meta.isActive ? "Enabled" : "Disabled"}</span>
                </div>
              </Field>
              <div className="col-span-2 sm:col-span-3">
                <Field label="Description">
                  <Textarea value={meta.description || ""} onChange={(e) => updateMeta("description", e.target.value)} className="text-sm min-h-[60px]" placeholder="Optional description / notes" />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* Approval chain editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold">Approval Chain</p>
                <p className="text-xs text-muted-foreground">Sequential steps the request must pass through.</p>
              </div>
              <Button size="sm" variant="outline" onClick={addStep} className="gap-1.5"><Plus className="h-4 w-4" /> Add Step</Button>
            </div>

            {/* Live preview */}
            <ChainPreview steps={steps} approvalType={meta.approvalType || "Sequential"} />

            <Separator className="my-3" />

            {/* Steps editor */}
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {steps.map((step, i) => (
                  <StepCard
                    key={step.id || `s-${i}`}
                    step={step}
                    isFirst={i === 0}
                    isLast={i === steps.length - 1}
                    onMove={(dir) => moveStep(step.id!, dir)}
                    onChange={(patch) => updateStep(step.id!, patch)}
                    onRemove={() => removeStep(step.id!)}
                  />
                ))}
              </AnimatePresence>
              {steps.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                  No steps yet. Click "Add Step" to define the approval chain.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 sticky bottom-0 bg-background/95 backdrop-blur border-t -mx-6 px-6 py-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Workflow
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
    </div>
  )
}

// ============================================================
// STEP CARD
// ============================================================

function StepCard({ step, isFirst, isLast, onMove, onChange, onRemove }: {
  step: WfStep
  isFirst: boolean
  isLast: boolean
  onMove: (dir: -1 | 1) => void
  onChange: (patch: Partial<WfStep>) => void
  onRemove: () => void
}) {
  const m = approverMeta(step.approverType)
  const Icon = m.icon
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      className="rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-colors"
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary font-semibold text-sm">
            {step.level}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <Field label="Step Name">
              <Input value={step.name || ""} onChange={(e) => onChange({ name: e.target.value })} className="h-8 text-sm" placeholder="e.g. Manager Approval" />
            </Field>
            <Field label="Approver Type">
              <Select value={step.approverType} onValueChange={(v) => onChange({ approverType: v as ApproverType })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPROVER_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {step.approverType === "SpecificEmployee" ? (
              <Field label="Employee">
                <EmployeePicker value={step.approverId || ""} onChange={(v) => onChange({ approverId: v })} />
              </Field>
            ) : step.approverType === "Role" ? (
              <Field label="Role">
                <Input value={step.approverRole || ""} onChange={(e) => onChange({ approverRole: e.target.value })} className="h-8 text-sm" placeholder="e.g. Admin, HR" />
              </Field>
            ) : (
              <Field label="Resolved By">
                <div className="h-8 px-2 rounded-md border border-border/60 bg-muted/30 flex items-center text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 mr-1.5 text-primary" /> {m.label}
                </div>
              </Field>
            )}
            <Field label="SLA (hours)">
              <Input type="number" value={step.slaHours ?? ""} onChange={(e) => onChange({ slaHours: e.target.value ? Number(e.target.value) : null })} className="h-8 text-sm" placeholder="24" />
            </Field>
          </div>
          <div className="flex flex-col gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isFirst} onClick={() => onMove(-1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isLast} onClick={() => onMove(1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </CardContent>
    </motion.div>
  )
}

// ============================================================
// LIVE CHAIN PREVIEW
// ============================================================

function ChainPreview({ steps, approvalType }: { steps: WfStep[]; approvalType: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 overflow-x-auto">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium">Live Preview</span>
        <span className="text-muted-foreground/60">·</span>
        <span className="capitalize">{approvalType} flow</span>
      </div>
      <div className="flex items-center gap-2 min-w-fit">
        {/* Initiator */}
        <PreviewNode color="cyan" icon={UserCheck} label="Initiator" sub="Employee" />
        <Connector />
        {steps.length === 0 ? (
          <PreviewNode color="amber" icon={Clock} label="No steps" sub="Add a step" muted />
        ) : (
          steps.map((s, i) => {
            const m = approverMeta(s.approverType)
            return (
              <React.Fragment key={s.id || i}>
                <PreviewNode
                  color={m.color}
                  icon={m.icon}
                  label={s.name || `Step ${s.level}`}
                  sub={m.label}
                  pending={i > 0}
                />
                <Connector />
              </React.Fragment>
            )
          })
        )}
        <PreviewNode color="emerald" icon={CheckCircle2} label="Approved" sub="Complete" />
      </div>
    </div>
  )
}

function PreviewNode({ color, icon: Icon, label, sub, pending, muted }: {
  color: string
  icon: any
  label: string
  sub: string
  pending?: boolean
  muted?: boolean
}) {
  const colorMap: Record<string, string> = {
    cyan: "border-cyan-500/30 bg-cyan-500/5 text-cyan-700 dark:text-cyan-400",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    fuchsia: "border-fuchsia-500/30 bg-fuchsia-500/5 text-fuchsia-700 dark:text-fuchsia-400",
    coral: "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-400",
  }
  return (
    <div className={cn(
      "shrink-0 rounded-lg border px-3 py-2 min-w-[120px] text-center",
      colorMap[color],
      pending && "opacity-60",
      muted && "opacity-50",
    )}>
      <div className="flex items-center justify-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-xs font-semibold truncate max-w-[120px]">{label}</p>
      </div>
      <p className="text-[10px] opacity-80 mt-0.5 truncate">{sub}</p>
    </div>
  )
}

function Connector() {
  return (
    <div className="flex items-center text-muted-foreground/50 shrink-0">
      <ChevronRight className="h-4 w-4" />
    </div>
  )
}

// ============================================================
// EMPLOYEE PICKER (uses /api/employees/picker)
// ============================================================

function EmployeePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [options, setOptions] = React.useState<{ label: string; value: string }[]>([])
  React.useEffect(() => {
    apiFetch("/api/employees/picker")
      .then((r) => r.json())
      .then((d) => setOptions(d.items || []))
      .catch(() => {})
  }, [])
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select employee…" /></SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        {options.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground text-center">No employees</div>}
      </SelectContent>
    </Select>
  )
}
