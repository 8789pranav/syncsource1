'use client'

import * as React from "react"
import { toast } from "sonner"
import {
  ShieldCheck, Plus, Pencil, Trash2, Copy, Eye, Users, RefreshCw,
  Check, ChevronRight, ChevronLeft, X, Settings2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Column, DataTable, EmptyState, ListToolbar, SectionCard, StatusBadge } from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { leaveRuleBasicSchema } from "@/lib/form-schemas"
import { cn } from "@/lib/utils"
import {
  fetchJson, sendJson, useAsync, toNum, toBool,
  LeavePolicy, LeavePolicyItem, LeaveTypeLite,
} from "../shared"

// ============================================================
// Main Rules section
// ============================================================

export function RulesSection() {
  const [search, setSearch] = React.useState("")
  const [wizard, setWizard] = React.useState<{ open: boolean; policy: LeavePolicy | null }>({ open: false, policy: null })
  const [view, setView] = React.useState<LeavePolicy | null>(null)
  const [del, setDel] = React.useState<LeavePolicy | null>(null)
  const [viewEmployees, setViewEmployees] = React.useState<LeavePolicy | null>(null)
  const [recalc, setRecalc] = React.useState<LeavePolicy | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const { data, loading, reload } = useAsync<LeavePolicy[]>(
    () => fetchJson("/api/leave-policies").catch(() => [] as LeavePolicy[]),
    [],
  )

  const filtered = (data || []).filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.country || "").toLowerCase().includes(q)
  })

  async function confirmDelete() {
    if (!del) return
    setSubmitting(true)
    try {
      await sendJson(`/api/leave-policies/${del.id}`, {}, "DELETE")
      toast.success("Rule deleted")
      setDel(null); reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete")
    } finally {
      setSubmitting(false)
    }
  }

  async function doRecalc() {
    if (!recalc) return
    setSubmitting(true)
    try {
      await sendJson(`/api/leave-policies/${recalc.id}/recalculate`, {})
      toast.success("Balances recalculated")
      setRecalc(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to recalculate")
    } finally {
      setSubmitting(false)
    }
  }

  async function clonePolicy(p: LeavePolicy) {
    setSubmitting(true)
    try {
      const payload: any = {
        name: `${p.name} (Copy)`,
        code: `${p.code}-COPY`,
        description: p.description,
        country: p.country,
        leaveYearType: p.leaveYearType,
        calendarStartMonth: p.calendarStartMonth,
        effectiveFrom: p.effectiveFrom,
        effectiveTo: p.effectiveTo,
        priority: p.priority,
        isDefault: false,
        status: "Draft",
        settingsJson: p.settingsJson,
        items: (p.items || []).map((it) => ({
          leaveTypeId: it.leaveTypeId,
          displayName: it.displayName,
          isActive: it.isActive,
          entitlementType: it.entitlementType,
          totalEntitlement: it.totalEntitlement,
          entitlementUnit: it.entitlementUnit,
          accrualFrequency: it.accrualFrequency,
          accrualAmount: it.accrualAmount,
          carryForward: it.carryForward,
          maxCarryForward: it.maxCarryForward,
          encashment: it.encashment,
        })),
        applicabilities: (p.applicabilities || []).map((a) => ({
          applyTo: a.applyTo,
          entityIds: a.entityIds,
          locationIds: a.locationIds,
          departmentIds: a.departmentIds,
          gender: a.gender,
        })),
      }
      await sendJson("/api/leave-policies", payload)
      toast.success("Rule cloned as draft")
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clone")
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleStatus(p: LeavePolicy) {
    setSubmitting(true)
    try {
      const next = p.status === "Active" ? "Inactive" : "Active"
      await sendJson(`/api/leave-policies/${p.id}`, { status: next }, "PATCH")
      toast.success(`Rule ${next.toLowerCase()}`)
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<LeavePolicy>[] = [
    {
      key: "name", header: "Name", className: "min-w-[220px]",
      render: (p) => (
        <div>
          <p className="font-medium text-sm">{p.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{p.code}</p>
        </div>
      ),
    },
    { key: "country", header: "Country", render: (p) => <span className="text-sm">{p.country || "—"}</span> },
    { key: "lyt", header: "Leave Year", render: (p) => <Badge variant="secondary" className="text-[10px] border-0 bg-muted text-muted-foreground">{p.leaveYearType || "—"}</Badge> },
    { key: "items", header: "Items", render: (p) => <span className="tabular-nums">{p.items?.length || 0}</span> },
    { key: "prio", header: "Priority", render: (p) => <span className="tabular-nums text-sm">{p.priority ?? 0}</span> },
    {
      key: "def", header: "Default",
      render: (p) => p.isDefault ? <Badge className="text-[10px] bg-emerald-600 text-primary-foreground">Default</Badge> : <span className="text-muted-foreground text-xs">—</span>,
    },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status || "Draft"} /> },
    {
      key: "actions", header: "", width: "220px",
      render: (p) => (
        <div className="flex items-center gap-1 justify-end flex-wrap">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="View" onClick={() => setView(p)}><Eye className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Edit" onClick={() => setWizard({ open: true, policy: p })}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="View employees" onClick={() => setViewEmployees(p)}><Users className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-cyan-600" title="Recalculate balances" onClick={() => setRecalc(p)}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Clone" onClick={() => clonePolicy(p)}><Copy className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title={p.status === "Active" ? "Deactivate" : "Activate"} onClick={() => toggleStatus(p)}><Settings2 className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500" title="Delete" onClick={() => setDel(p)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Leave Rules</h2>
        <p className="text-sm text-muted-foreground">The rule engine — define which leave types apply to whom, with what entitlements and restrictions.</p>
      </div>

      <ListToolbar
        search={search}
        onSearch={setSearch}
        onAdd={() => setWizard({ open: true, policy: null })}
        addLabel="Create Rule"
      />

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        emptyState={<EmptyState icon={ShieldCheck} title="No leave rules" description="Create your first leave rule to assign leave types to employees." action={<Button size="sm" onClick={() => setWizard({ open: true, policy: null })} className="gap-1.5"><Plus className="h-4 w-4" /> Create Rule</Button>} />}
      />

      {wizard.open && (
        <RuleWizard
          policy={wizard.policy}
          onClose={() => setWizard({ open: false, policy: null })}
          onDone={() => { setWizard({ open: false, policy: null }); reload() }}
        />
      )}

      {/* View sheet */}
      <Sheet open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-500" /> {view?.name}</SheetTitle>
            <SheetDescription>{view?.code} · {view?.country}</SheetDescription>
          </SheetHeader>
          {view && <RuleDetails rule={view} />}
        </SheetContent>
      </Sheet>

      {/* View employees */}
      <Dialog open={!!viewEmployees} onOpenChange={(o) => !o && setViewEmployees(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-emerald-500" /> Affected Employees</DialogTitle>
            <DialogDescription>Employees matched by this rule&apos;s applicability.</DialogDescription>
          </DialogHeader>
          <ViewEmployeesBody rule={viewEmployees} />
        </DialogContent>
      </Dialog>

      {/* Recalculate confirm */}
      <AlertDialog open={!!recalc} onOpenChange={(o) => !o && setRecalc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-cyan-500" /> Recalculate Balances?</AlertDialogTitle>
            <AlertDialogDescription>
              This will recompute leave balances for all employees affected by <b>{recalc?.name}</b>. The operation may take a few seconds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doRecalc} disabled={submitting} className="bg-cyan-600 hover:bg-cyan-700">
              {submitting ? "Processing…" : "Recalculate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-rose-500" /> Delete Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <b>{del?.name}</b> ({del?.code})? Existing balances and ledger entries will remain but no new entitlements accrue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={submitting} className="bg-rose-600 hover:bg-rose-700">
              {submitting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// Rule Wizard (4 steps)
// ============================================================

const APPLY_TO_OPTIONS = [
  { value: "AllEmployees", label: "All Employees" },
  { value: "SelectedEntities", label: "Selected Entities" },
  { value: "SelectedLocations", label: "Selected Locations" },
  { value: "SelectedDepartments", label: "Selected Departments" },
  { value: "SelectedGrades", label: "Selected Grades" },
  { value: "SelectedEmployeeTypes", label: "Selected Employee Types" },
  { value: "SpecificEmployees", label: "Specific Employees" },
  { value: "CustomGroup", label: "Custom Group" },
]

interface ItemDraft extends LeavePolicyItem {
  _added?: boolean
}

function RuleWizard({
  policy, onClose, onDone,
}: {
  policy: LeavePolicy | null
  onClose: () => void
  onDone: () => void
}) {
  const [step, setStep] = React.useState(1)
  const [basic, setBasic] = React.useState<any>(policy ? {
    name: policy.name,
    code: policy.code,
    description: policy.description || "",
    country: policy.country || "India",
    leaveYearType: policy.leaveYearType || "CalendarYear",
    calendarStartMonth: String(policy.calendarStartMonth || 1),
    effectiveFrom: policy.effectiveFrom ? String(policy.effectiveFrom).slice(0, 10) : "",
    effectiveTo: policy.effectiveTo ? String(policy.effectiveTo).slice(0, 10) : "",
    priority: policy.priority ?? 0,
    isDefault: policy.isDefault ?? false,
    status: policy.status || "Active",
  } : {
    country: "India", leaveYearType: "CalendarYear", calendarStartMonth: "1",
    priority: 0, isDefault: false, status: "Active",
  })
  const [applyTo, setApplyTo] = React.useState<string>(policy?.applicabilities?.[0]?.applyTo || "AllEmployees")
  const [entityIds, setEntityIds] = React.useState<string>(policy?.applicabilities?.[0]?.entityIds || "")
  const [locationIds, setLocationIds] = React.useState<string>(policy?.applicabilities?.[0]?.locationIds || "")
  const [departmentIds, setDepartmentIds] = React.useState<string>(policy?.applicabilities?.[0]?.departmentIds || "")
  const [gradeIds, setGradeIds] = React.useState<string>(policy?.applicabilities?.[0]?.gradeIds || "")
  const [employeeIds, setEmployeeIds] = React.useState<string>(policy?.applicabilities?.[0]?.employeeIds || "")
  const [gender, setGender] = React.useState<string>(policy?.applicabilities?.[0]?.gender || "All")
  const [items, setItems] = React.useState<ItemDraft[]>(
    (policy?.items || []).map((it) => ({ ...it, _added: true })),
  )
  const [submitting, setSubmitting] = React.useState(false)
  const [addPickerOpen, setAddPickerOpen] = React.useState(false)

  // Pickers
  const { data: leaveTypes } = useAsync<LeaveTypeLite[]>(
    () => fetchJson("/api/leave-types").catch(() => [] as LeaveTypeLite[]),
    [],
  )
  const { data: entities } = useAsync<{ id: string; name?: string; code?: string }[]>(
    () => fetchJson("/api/entities").catch(() => []),
    [],
  )
  const { data: locations } = useAsync<{ id: string; name: string }[]>(
    () => fetchJson("/api/locations").catch(() => []),
    [],
  )
  const { data: departments } = useAsync<{ id: string; name: string }[]>(
    () => fetchJson("/api/departments").catch(() => []),
    [],
  )
  const { data: grades } = useAsync<{ id: string; name: string }[]>(
    () => fetchJson("/api/grades").catch(() => []),
    [],
  )
  const { data: employees } = useAsync<{ label: string; value: string }[]>(
    () => fetchJson("/api/employees/picker?limit=500").catch(() => []),
    [],
  )

  function addLeaveType(lt: LeaveTypeLite) {
    if (items.find((i) => i.leaveTypeId === lt.id)) return
    setItems([...items, {
      id: `draft-${lt.id}`,
      leaveTypeId: lt.id, _added: true,
      displayName: lt.name,
      isActive: true,
      entitlementType: "Fixed",
      totalEntitlement: toNum(lt.yearlyAccrual),
      entitlementUnit: "Days",
      creditTiming: "YearStart",
      accrualFrequency: "Yearly",
      accrualAmount: toNum(lt.yearlyAccrual),
      carryForward: toBool(lt.carryForward),
      maxCarryForward: (lt as any).carryForwardLimit ?? null,
      encashment: toBool(lt.encashment),
      leaveType: lt,
    }])
    setAddPickerOpen(false)
  }

  function updateItem(idx: number, patch: Partial<ItemDraft>) {
    setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  async function publish() {
    if (!basic.name || !basic.code) {
      toast.error("Name and code are required")
      setStep(1); return
    }
    setSubmitting(true)
    try {
      const payload = {
        ...basic,
        calendarStartMonth: Number(basic.calendarStartMonth),
        items: items.map((it) => ({
          leaveTypeId: it.leaveTypeId,
          displayName: it.displayName || null,
          isActive: it.isActive ?? true,
          entitlementType: it.entitlementType || "Fixed",
          totalEntitlement: toNum(it.totalEntitlement),
          entitlementUnit: it.entitlementUnit || "Days",
          accrualFrequency: it.accrualFrequency || "Yearly",
          accrualAmount: toNum(it.accrualAmount),
          carryForward: it.carryForward ?? false,
          maxCarryForward: it.maxCarryForward ?? null,
          encashment: it.encashment ?? false,
        })),
        applicabilities: [{
          applyTo,
          entityIds: entityIds || null,
          locationIds: locationIds || null,
          departmentIds: departmentIds || null,
          gradeIds: gradeIds || null,
          employeeIds: employeeIds || null,
          gender,
        }],
      }
      if (policy) {
        await sendJson(`/api/leave-policies/${policy.id}`, payload, "PATCH")
        toast.success("Rule updated")
      } else {
        await sendJson("/api/leave-policies", payload)
        toast.success("Rule created")
      }
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSubmitting(false)
    }
  }

  const steps = [
    { id: 1, title: "Basic Details" },
    { id: 2, title: "Applicability" },
    { id: 3, title: "Leave Types" },
    { id: 4, title: "Review & Publish" },
  ]

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-500" /> {policy ? "Edit Leave Rule" : "Create Leave Rule"}</DialogTitle>
          <DialogDescription>Configure a rule that defines which leave types apply to whom.</DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 py-2">
          {steps.map((s, i) => (
            <React.Fragment key={s.id}>
              <button
                onClick={() => setStep(s.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  step === s.id ? "bg-primary text-primary-foreground" :
                  step > s.id ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" :
                  "bg-muted text-muted-foreground",
                )}
              >
                {step > s.id ? <Check className="h-3.5 w-3.5" /> : <span className="h-5 w-5 grid place-items-center rounded-full bg-black/5 dark:bg-white/10 text-[10px]">{s.id}</span>}
                {s.title}
              </button>
              {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step body */}
        <div className="min-h-[280px]">
          {step === 1 && (
            <DynamicForm
              schema={leaveRuleBasicSchema}
              initialValues={basic}
              onSubmit={(v) => { setBasic(v); setStep(2) }}
              onCancel={onClose}
              submitLabel="Next: Applicability"
              layout="flat"
            />
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Apply To</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {APPLY_TO_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setApplyTo(o.value)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                        applyTo === o.value ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "border-border/60 hover:bg-muted/50",
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {applyTo === "SelectedEntities" && (
                <MultiSelect
                  label="Entities"
                  options={(entities || []).map((e: any) => ({ value: e.id, label: e.name || e.code }))}
                  selected={entityIds}
                  onChange={setEntityIds}
                />
              )}
              {applyTo === "SelectedLocations" && (
                <MultiSelect
                  label="Locations"
                  options={(locations || []).map((l) => ({ value: l.id, label: l.name }))}
                  selected={locationIds}
                  onChange={setLocationIds}
                />
              )}
              {applyTo === "SelectedDepartments" && (
                <MultiSelect
                  label="Departments"
                  options={(departments || []).map((d) => ({ value: d.id, label: d.name }))}
                  selected={departmentIds}
                  onChange={setDepartmentIds}
                />
              )}
              {applyTo === "SelectedGrades" && (
                <MultiSelect
                  label="Grades"
                  options={(grades || []).map((g) => ({ value: g.id, label: g.name }))}
                  selected={gradeIds}
                  onChange={setGradeIds}
                />
              )}
              {applyTo === "SpecificEmployees" && (
                <MultiSelect
                  label="Employees"
                  options={(employees || []).map((e) => ({ value: e.value, label: e.label }))}
                  selected={employeeIds}
                  onChange={setEmployeeIds}
                />
              )}

              <div>
                <Label className="text-xs">Gender applicability</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" size="sm" onClick={() => setStep(1)}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
                <Button size="sm" onClick={() => setStep(3)}>Next: Leave Types <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Add leave types and configure per-type entitlements for this rule.</p>
                <Button size="sm" className="gap-1.5" onClick={() => setAddPickerOpen(true)}><Plus className="h-4 w-4" /> Add Leave Type</Button>
              </div>
              {items.length === 0 ? (
                <EmptyState icon={Plus} title="No leave types added yet" description="Add leave types to define entitlements and accrual rules." />
              ) : (
                <div className="max-h-72 overflow-y-auto [scrollbar-width:thin] space-y-2 pr-1">
                  {items.map((it, idx) => (
                    <Card key={it.leaveTypeId} className="border-border/60">
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded" style={{ background: it.leaveType?.color || "#10b981" }} />
                            <p className="font-medium text-sm">{it.leaveType?.name || "—"}</p>
                            <Badge variant="secondary" className="text-[10px] border-0 bg-muted text-muted-foreground font-mono">{it.leaveType?.code}</Badge>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-500" onClick={() => removeItem(idx)}><X className="h-4 w-4" /></Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <Field label="Display Name"><Input value={it.displayName || ""} onChange={(e) => updateItem(idx, { displayName: e.target.value })} className="h-8 text-sm" /></Field>
                          <Field label="Entitlement Type">
                            <Select value={it.entitlementType || "Fixed"} onValueChange={(v) => updateItem(idx, { entitlementType: v })}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["Fixed", "Accrual", "Experience", "Attendance", "Grant", "Manual", "Unlimited", "None"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="Total Entitlement"><Input type="number" value={it.totalEntitlement ?? 0} onChange={(e) => updateItem(idx, { totalEntitlement: Number(e.target.value) })} className="h-8 text-sm" /></Field>
                          <Field label="Accrual Frequency">
                            <Select value={it.accrualFrequency || "Yearly"} onValueChange={(v) => updateItem(idx, { accrualFrequency: v })}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["Daily", "Weekly", "Monthly", "Quarterly", "HalfYearly", "Yearly", "PayrollCycle", "Attendance"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="Accrual Amount"><Input type="number" value={it.accrualAmount ?? 0} onChange={(e) => updateItem(idx, { accrualAmount: Number(e.target.value) })} className="h-8 text-sm" /></Field>
                          <Field label="Max Carry Forward"><Input type="number" value={it.maxCarryForward ?? 0} onChange={(e) => updateItem(idx, { maxCarryForward: Number(e.target.value) })} className="h-8 text-sm" /></Field>
                          <Field label="Carry Forward">
                            <div className="flex items-center h-8"><Switch checked={!!it.carryForward} onCheckedChange={(c) => updateItem(idx, { carryForward: c })} /></div>
                          </Field>
                          <Field label="Encashment">
                            <div className="flex items-center h-8"><Switch checked={!!it.encashment} onCheckedChange={(c) => updateItem(idx, { encashment: c })} /></div>
                          </Field>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <div className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
                <Button size="sm" onClick={() => setStep(4)}>Next: Review <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <SectionCard title="Basic Details">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <KV k="Name" v={basic.name} />
                  <KV k="Code" v={basic.code} />
                  <KV k="Country" v={basic.country} />
                  <KV k="Leave Year" v={basic.leaveYearType} />
                  <KV k="Start Month" v={basic.calendarStartMonth} />
                  <KV k="Priority" v={String(basic.priority ?? 0)} />
                  <KV k="Default" v={basic.isDefault ? "Yes" : "No"} />
                  <KV k="Status" v={basic.status} />
                </div>
              </SectionCard>
              <SectionCard title="Applicability">
                <div className="text-sm space-y-1">
                  <KV k="Apply To" v={APPLY_TO_OPTIONS.find((o) => o.value === applyTo)?.label || applyTo} />
                  {entityIds && <KV k="Entities" v={entityIds} />}
                  {locationIds && <KV k="Locations" v={locationIds} />}
                  {departmentIds && <KV k="Departments" v={departmentIds} />}
                  {gradeIds && <KV k="Grades" v={gradeIds} />}
                  {employeeIds && <KV k="Employees" v={employeeIds} />}
                  <KV k="Gender" v={gender} />
                </div>
              </SectionCard>
              <SectionCard title={`Leave Types (${items.length})`}>
                <div className="space-y-1 text-sm">
                  {items.map((it) => (
                    <div key={it.leaveTypeId} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.leaveType?.color || "#10b981" }} />
                        <span className="font-medium">{it.leaveType?.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{it.entitlementType} · {toNum(it.totalEntitlement)}d · {it.accrualFrequency}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
              <div className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(3)}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
                <Button size="sm" onClick={publish} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
                  {submitting ? "Publishing…" : "Publish Rule"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Add leave type picker */}
        <Dialog open={addPickerOpen} onOpenChange={setAddPickerOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">Add Leave Type</DialogTitle>
              <DialogDescription>Select a leave type to add to this rule.</DialogDescription>
            </DialogHeader>
            <div className="max-h-72 overflow-y-auto [scrollbar-width:thin] space-y-1 pr-1">
              {(leaveTypes || [])
                .filter((lt) => !items.find((i) => i.leaveTypeId === lt.id))
                .map((lt) => (
                  <button
                    key={lt.id}
                    onClick={() => addLeaveType(lt)}
                    className="w-full flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-left hover:bg-muted/50"
                  >
                    <span className="h-3 w-3 rounded shrink-0" style={{ background: lt.color || "#10b981" }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{lt.name}</p>
                      <p className="text-xs text-muted-foreground">{lt.code} · {lt.category}</p>
                    </div>
                    <Plus className="h-4 w-4 ml-auto text-emerald-500" />
                  </button>
                ))}
              {(leaveTypes || []).filter((lt) => !items.find((i) => i.leaveTypeId === lt.id)).length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">All leave types are already added.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{k}</p>
      <p className="font-medium text-foreground">{v || "—"}</p>
    </div>
  )
}

function MultiSelect({
  label, options, selected, onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string
  onChange: (v: string) => void
}) {
  const sel = new Set(selected.split(",").map((s) => s.trim()).filter(Boolean))
  function toggle(v: string) {
    const next = new Set(sel)
    if (next.has(v)) next.delete(v); else next.add(v)
    onChange(Array.from(next).join(","))
  }
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label} ({sel.size})</Label>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto [scrollbar-width:thin] pr-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
              sel.has(o.value) ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "border-border/60 hover:bg-muted/50",
            )}
          >
            <span className={cn("h-3 w-3 rounded-sm grid place-items-center", sel.has(o.value) ? "bg-emerald-500 text-white" : "border border-border")}>
              {sel.has(o.value) && <Check className="h-2 w-2" />}
            </span>
            <span className="truncate">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Rule details (view sheet body)
// ============================================================

function RuleDetails({ rule }: { rule: LeavePolicy }) {
  const items = rule.items || []
  const apps = rule.applicabilities || []
  return (
    <div className="p-4 space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 p-3">
        <KV k="Name" v={rule.name} />
        <KV k="Code" v={rule.code} />
        <KV k="Country" v={rule.country || "—"} />
        <KV k="Leave Year" v={rule.leaveYearType || "—"} />
        <KV k="Priority" v={String(rule.priority ?? 0)} />
        <KV k="Default" v={rule.isDefault ? "Yes" : "No"} />
        <KV k="Status" v={<StatusBadge status={rule.status || "Draft"} />} />
        <KV k="Version" v={rule.version ?? 1} />
      </div>
      {rule.description && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Description</p>
          <p>{rule.description}</p>
        </div>
      )}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Applicability</p>
        {apps.length === 0 ? <p className="text-muted-foreground">—</p> : (
          <div className="space-y-1">
            {apps.map((a) => (
              <div key={a.id} className="rounded-lg border border-border/60 p-2 text-xs">
                <p><b>Apply to:</b> {APPLY_TO_OPTIONS.find((o) => o.value === a.applyTo)?.label || a.applyTo}</p>
                {a.gender && a.gender !== "All" && <p><b>Gender:</b> {a.gender}</p>}
                {a.entityIds && <p><b>Entities:</b> <span className="font-mono">{a.entityIds}</span></p>}
                {a.locationIds && <p><b>Locations:</b> <span className="font-mono">{a.locationIds}</span></p>}
                {a.departmentIds && <p><b>Departments:</b> <span className="font-mono">{a.departmentIds}</span></p>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Leave Types ({items.length})</p>
        <div className="space-y-1 max-h-60 overflow-y-auto [scrollbar-width:thin] pr-1">
          {items.map((it) => (
            <div key={it.id} className="rounded-lg border border-border/60 p-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: it.leaveType?.color || "#10b981" }} />
                  <span className="font-medium">{it.leaveType?.name || it.displayName || "—"}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] border-0 bg-muted text-muted-foreground">{it.entitlementType}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1 text-muted-foreground">
                <span>Total: <b className="text-foreground">{toNum(it.totalEntitlement)}d</b></span>
                <span>Accrual: <b className="text-foreground">{it.accrualFrequency} · {toNum(it.accrualAmount)}</b></span>
                <span>Carry Fwd: <b className="text-foreground">{it.carryForward ? `Yes (${it.maxCarryForward ?? "—"})` : "No"}</b></span>
                <span>Encashment: <b className="text-foreground">{it.encashment ? "Yes" : "No"}</b></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ViewEmployeesBody({ rule }: { rule: LeavePolicy | null }) {
  const { data, loading } = useAsync<{ id: string; firstName?: string; lastName?: string; displayName?: string; employeeCode?: string; department?: { name: string } }[]>(
    () => rule ? fetchJson("/api/employees?limit=500").catch(() => []) : Promise.resolve([]),
    [rule?.id],
  )
  if (!rule) return null
  // Best-effort filter
  const app = rule.applicabilities?.[0]
  const sel = new Set((app?.departmentIds || "").split(",").map((s) => s.trim()).filter(Boolean))
  const matched = (data || []).filter((e: any) => sel.size === 0 || (e.departmentId && sel.has(e.departmentId)))
  return (
    <div className="space-y-2 max-h-80 overflow-y-auto [scrollbar-width:thin] pr-1">
      {loading ? <Skeleton className="h-16 w-full" /> : null}
      {!loading && matched.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No employees matched (or none loaded).</p>
      ) : (
        matched.map((e) => (
          <div key={e.id} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-sm">
            <span className="font-medium">{[e.firstName, e.lastName].filter(Boolean).join(" ") || e.displayName}</span>
            <span className="text-xs text-muted-foreground">{e.employeeCode}</span>
            {e.department && <Badge variant="secondary" className="text-[10px] border-0 bg-muted text-muted-foreground ml-auto">{e.department.name}</Badge>}
          </div>
        ))
      )}
    </div>
  )
}
