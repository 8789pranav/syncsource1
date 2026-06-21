'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Users, Plus, Pencil, Trash2, Mail, Phone, MapPin, Calendar,
  Briefcase, Banknote, FileText, User as UserIcon, Clock, ExternalLink,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  PageHeader, ListToolbar, DataTable, StatusBadge, EmptyState, Column,
} from "@/components/hrms/ui"
import { DynamicForm, FieldValue } from "@/components/dynamic-form/dynamic-form"
import { employeeFormSchema } from "@/lib/form-schemas"
import type { FormValues, FormField as FormFieldDef, FieldType } from "@/lib/types"

// ============================================================
// Utilities
// ============================================================

function getInitials(first?: string | null, middle?: string | null, last?: string | null) {
  const f = (first || "").trim().charAt(0).toUpperCase()
  const m = (middle || "").trim().charAt(0).toUpperCase()
  const l = (last || "").trim().charAt(0).toUpperCase()
  // Prefer first + last; fall back to first + middle if no last
  const out = l ? f + l : (m ? f + m : f)
  return out || "?"
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return "—"
  }
}

function formatCurrency(v?: number | null): string {
  if (v === undefined || v === null) return "—"
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v)
}

function toFormValues(rec: any): FormValues {
  if (!rec) return {}
  const out: FormValues = {}
  for (const [k, v] of Object.entries(rec)) {
    if (v instanceof Date) out[k] = v.toISOString()
    else out[k] = v
  }
  return out
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// Build a FormFieldDef for FieldValue rendering
function fd(key: string, label: string, type: FieldType = "text"): FormFieldDef {
  return { id: `f-${key}`, key, label, type }
}

const EMPLOYEE_STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "Active" },
  { label: "On Notice", value: "On Notice" },
  { label: "Resigned", value: "Resigned" },
  { label: "Inactive", value: "Inactive" },
]

// ============================================================
// Main Employees Module
// ============================================================

export function EmployeesModule() {
  // List state
  const [rows, setRows] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [departmentFilter, setDepartmentFilter] = React.useState<string>("")
  const [statusFilter, setStatusFilter] = React.useState<string>("")
  const [departments, setDepartments] = React.useState<any[]>([])

  // Detail sheet state
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [selectedEmp, setSelectedEmp] = React.useState<any | null>(null)
  const [loadingDetail, setLoadingDetail] = React.useState(false)

  // Add/Edit dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<any | null>(null)
  const [saving, setSaving] = React.useState(false)

  // Delete state
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set("q", debouncedSearch)
      if (departmentFilter) params.set("departmentId", departmentFilter)
      if (statusFilter) params.set("status", statusFilter)
      const url = `/api/employees${params.toString() ? "?" + params.toString() : ""}`
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) throw new Error("Request failed")
      const data = await res.json()
      setRows(data.items || [])
    } catch {
      toast.error("Failed to load employees")
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, departmentFilter, statusFilter])

  React.useEffect(() => {
    load()
  }, [load])

  // Load departments for filter
  React.useEffect(() => {
    fetch("/api/departments", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setDepartments(data.items || []))
      .catch(() => {})
  }, [])

  // Open detail sheet
  const onView = async (row: any) => {
    setSelectedId(row.id)
    setSheetOpen(true)
    setLoadingDetail(true)
    setSelectedEmp(row) // initial data from list (lighter)
    try {
      const res = await fetch(`/api/employees/${row.id}`, { cache: "no-store" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSelectedEmp(data)
    } catch {
      toast.error("Failed to load employee details")
    } finally {
      setLoadingDetail(false)
    }
  }

  const onAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const onEdit = (emp: any) => {
    setEditing(emp)
    setDialogOpen(true)
    setSheetOpen(false)
  }

  const onSubmit = async (values: FormValues) => {
    setSaving(true)
    try {
      const isEdit = !!editing
      const url = isEdit ? `/api/employees/${editing.id}` : "/api/employees"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to ${isEdit ? "update" : "create"} employee`)
      }
      toast.success(isEdit ? "Employee updated" : "Employee created")
      setDialogOpen(false)
      setEditing(null)
      await load()
      // Refresh detail if we were editing the currently selected employee
      if (isEdit && selectedId) {
        try {
          const detail = await fetch(`/api/employees/${selectedId}`, { cache: "no-store" }).then((r) => r.json())
          setSelectedEmp(detail)
        } catch {}
      }
    } catch (e: any) {
      toast.error(e.message || "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const onConfirmDelete = async () => {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/employees/${deletingId}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to delete")
      }
      toast.success("Employee deleted")
      if (selectedId === deletingId) {
        setSheetOpen(false)
        setSelectedId(null)
        setSelectedEmp(null)
      }
      setDeletingId(null)
      await load()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete")
    }
  }

  const columns: Column<any>[] = [
    {
      key: "name",
      header: "Employee",
      render: (e) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border/60">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 text-xs font-semibold">
              {getInitials(e.firstName, e.middleName, e.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium text-foreground truncate">
              {e.firstName} {e.middleName || ""} {e.lastName || ""}
            </div>
            <div className="text-xs text-muted-foreground font-mono">{e.employeeCode}</div>
          </div>
        </div>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      render: (e) =>
        e.designation ? <span className="text-sm">{e.designation.name}</span> : <span className="text-muted-foreground/50 italic text-sm">—</span>,
    },
    {
      key: "department",
      header: "Department",
      render: (e) =>
        e.department ? <span className="text-sm">{e.department.name}</span> : <span className="text-muted-foreground/50 italic text-sm">—</span>,
    },
    {
      key: "entity",
      header: "Entity",
      render: (e) =>
        e.entity ? <span className="text-sm">{e.entity.tradeName || e.entity.legalName}</span> : <span className="text-muted-foreground/50 italic text-sm">—</span>,
    },
    {
      key: "location",
      header: "Location",
      render: (e) =>
        e.location ? <span className="text-sm">{e.location.name}</span> : <span className="text-muted-foreground/50 italic text-sm">—</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (e) => <StatusBadge status={e.employeeStatus} />,
    },
    {
      key: "dateOfJoining",
      header: "Joined",
      render: (e) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(e.dateOfJoining)}</span>,
    },
    {
      key: "_actions",
      header: "",
      width: "120px",
      className: "text-right",
      render: (e) => (
        <div className="flex items-center justify-end gap-0.5" onClick={(ev) => ev.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => onView(e)} title="View profile">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => onEdit(e)} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeletingId(e.id)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <PageHeader
          title="Employees"
          description="Manage employee master records — the core of your HRMS."
          icon={Users}
          badge={
            <Badge variant="secondary" className="ml-1.5 font-medium">
              {loading ? "…" : `${rows.length} ${rows.length === 1 ? "employee" : "employees"}`}
            </Badge>
          }
        />

        <ListToolbar
          search={search}
          onSearch={setSearch}
          onAdd={onAdd}
          addLabel="Add Employee"
          extra={
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={departmentFilter || "all"}
                onValueChange={(v) => setDepartmentFilter(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter || "all"}
                onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          onRowClick={onView}
          emptyState={
            <EmptyState
              icon={Users}
              title={search || departmentFilter || statusFilter ? "No employees match your filters" : "No employees yet"}
              description={search || departmentFilter || statusFilter ? "Try adjusting your search or filters." : "Add your first employee to get started."}
              action={
                !search && !departmentFilter && !statusFilter ? (
                  <Button size="sm" onClick={onAdd} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Add Employee
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle>
            <DialogDescription>
              Fill in the employee details below. Fields marked <span className="text-destructive">*</span> are required.
            </DialogDescription>
          </DialogHeader>
          <DynamicForm
            schema={employeeFormSchema}
            initialValues={editing ? toFormValues(editing) : undefined}
            onSubmit={onSubmit}
            onCancel={() => { setDialogOpen(false); setEditing(null) }}
            submitLabel={editing ? "Update Employee" : "Create Employee"}
            loading={saving}
          />
        </DialogContent>
      </Dialog>

      {/* Profile Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) { setSelectedId(null); setSelectedEmp(null) } }}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
          {selectedEmp ? (
            <EmployeeProfile
              emp={selectedEmp}
              loading={loadingDetail}
              onEdit={() => onEdit(selectedEmp)}
              onDelete={() => setDeletingId(selectedEmp.id)}
            />
          ) : (
            <div className="flex items-center justify-center h-full py-20">
              <div className="text-sm text-muted-foreground">Loading employee...</div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The employee record and all related data (leave, attendance, assets, etc.) will be permanently deleted.
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
    </div>
  )
}

// ============================================================
// Employee Profile Drawer (Sheet content)
// ============================================================

function EmployeeProfile({
  emp, loading, onEdit, onDelete,
}: {
  emp: any
  loading: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const fullName = [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ")
  const [tab, setTab] = React.useState("overview")

  return (
    <>
      <SheetHeader className="border-b bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 px-6 py-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border-2 border-background shadow-soft shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xl font-semibold">
              {getInitials(emp.firstName, emp.middleName, emp.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg font-semibold truncate">{fullName}</SheetTitle>
            <SheetDescription className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-mono text-xs">{emp.employeeCode}</span>
              {emp.designation && <span className="text-xs">· {emp.designation.name}</span>}
            </SheetDescription>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <StatusBadge status={emp.employeeStatus} />
              {emp.employmentType && <Badge variant="outline" className="text-xs">{emp.employmentType}</Badge>}
              {emp.grade && <Badge variant="outline" className="text-xs">{emp.grade.name}</Badge>}
            </div>
          </div>
        </div>

        {/* Contact quick row */}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          {emp.officialEmail && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{emp.officialEmail}</span>
            </div>
          )}
          {emp.mobileNumber && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 shrink-0" /> {emp.mobileNumber}
            </div>
          )}
          {emp.dateOfJoining && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 shrink-0" /> Joined {formatDate(emp.dateOfJoining)}
            </div>
          )}
        </div>
      </SheetHeader>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-4">
          <TabsList className="bg-transparent h-auto p-0 justify-start gap-1">
            <TabsTrigger value="overview" className="rounded-b-none">Overview</TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-b-none">Timeline</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-b-none">Documents</TabsTrigger>
            <TabsTrigger value="leave" className="rounded-b-none">Leave Balance</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="p-6 pt-5 m-0 mt-0 focus-visible:outline-none">
            <OverviewTab emp={emp} />
          </TabsContent>
          <TabsContent value="timeline" className="p-6 pt-5 m-0 mt-0 focus-visible:outline-none">
            <TimelineTab emp={emp} />
          </TabsContent>
          <TabsContent value="documents" className="p-6 pt-5 m-0 mt-0 focus-visible:outline-none">
            <DocumentsTab emp={emp} />
          </TabsContent>
          <TabsContent value="leave" className="p-6 pt-5 m-0 mt-0 focus-visible:outline-none">
            <LeaveTab emp={emp} />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <SheetFooter className="border-t flex-row justify-end gap-2 px-6 py-3">
        <Button variant="outline" size="sm" onClick={onDelete} className="gap-1.5 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
        <Button size="sm" onClick={onEdit} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </SheetFooter>
    </>
  )
}

// ============================================================
// Profile sub-tabs
// ============================================================

function FieldGrid({ items }: { items: { field: FormFieldDef; value: unknown }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
      {items.map(({ field, value }) => (
        <div key={field.key} className="space-y-0.5 min-w-0">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{field.label}</div>
          <FieldValue field={field} value={value} />
        </div>
      ))}
    </div>
  )
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <h3 className="text-sm font-semibold text-foreground mb-3.5 flex items-center gap-1.5">
      <Icon className="h-4 w-4 text-emerald-500" /> {title}
    </h3>
  )
}

function OverviewTab({ emp }: { emp: any }) {
  return (
    <div className="space-y-6">
      <section>
        <SectionTitle icon={UserIcon} title="Basic Details" />
        <FieldGrid items={[
          { field: fd("displayName", "Display Name"), value: emp.displayName },
          { field: fd("gender", "Gender"), value: emp.gender },
          { field: fd("dateOfBirth", "Date of Birth", "date"), value: emp.dateOfBirth },
          { field: fd("maritalStatus", "Marital Status"), value: emp.maritalStatus },
          { field: fd("bloodGroup", "Blood Group"), value: emp.bloodGroup },
          { field: fd("nationality", "Nationality"), value: emp.nationality },
          { field: fd("personalEmail", "Personal Email", "email"), value: emp.personalEmail },
          { field: fd("mobileNumber", "Mobile Number", "phone"), value: emp.mobileNumber },
          { field: fd("alternateNumber", "Alternate Number", "phone"), value: emp.alternateNumber },
        ]} />
      </section>

      <Separator />

      <section>
        <SectionTitle icon={Briefcase} title="Employment Details" />
        <FieldGrid items={[
          { field: fd("dateOfJoining", "Date of Joining", "date"), value: emp.dateOfJoining },
          { field: fd("employmentType", "Employment Type"), value: emp.employmentType },
          { field: fd("workerType", "Worker Type"), value: emp.workerType },
          { field: fd("probationStatus", "Probation Status"), value: emp.probationStatus },
          { field: fd("probationEndDate", "Probation End Date", "date"), value: emp.probationEndDate },
          { field: fd("confirmationDate", "Confirmation Date", "date"), value: emp.confirmationDate },
          { field: fd("noticePeriod", "Notice Period (days)", "number"), value: emp.noticePeriod },
          { field: fd("employeeStatus", "Employee Status"), value: emp.employeeStatus },
          { field: fd("entity", "Entity"), value: emp.entity?.tradeName || emp.entity?.legalName },
          { field: fd("department", "Department"), value: emp.department?.name },
          { field: fd("designation", "Designation"), value: emp.designation?.name },
          { field: fd("grade", "Grade"), value: emp.grade?.name },
          { field: fd("branch", "Branch"), value: emp.branch?.name },
          { field: fd("location", "Location"), value: emp.location?.name },
          {
            field: fd("reportingManager", "Reporting Manager"),
            value: emp.reportingManager
              ? `${emp.reportingManager.firstName} ${emp.reportingManager.lastName || ""} (${emp.reportingManager.employeeCode})`
              : null,
          },
        ]} />
      </section>

      <Separator />

      <section>
        <SectionTitle icon={Banknote} title="Bank & Compensation" />
        <FieldGrid items={[
          { field: fd("ctc", "Annual CTC", "currency"), value: emp.ctc },
          { field: fd("basicSalary", "Basic Salary (monthly)", "currency"), value: emp.basicSalary },
          { field: fd("hra", "HRA (monthly)", "currency"), value: emp.hra },
          { field: fd("bankName", "Bank Name"), value: emp.bankName },
          { field: fd("accountNumber", "Account Number"), value: emp.accountNumber },
          { field: fd("ifscCode", "IFSC Code"), value: emp.ifscCode },
          { field: fd("branchName", "Bank Branch"), value: emp.branchName },
        ]} />
      </section>

      <Separator />

      <section>
        <SectionTitle icon={FileText} title="Statutory Details" />
        <FieldGrid items={[
          { field: fd("panNumber", "PAN"), value: emp.panNumber },
          { field: fd("aadhaarNumber", "Aadhaar"), value: emp.aadhaarNumber },
          { field: fd("uanNumber", "UAN"), value: emp.uanNumber },
          { field: fd("pfNumber", "PF Number"), value: emp.pfNumber },
          { field: fd("esiNumber", "ESI Number"), value: emp.esiNumber },
        ]} />
      </section>

      <Separator />

      <section>
        <SectionTitle icon={MapPin} title="Address" />
        <div className="space-y-4">
          <div className="space-y-0.5">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Current Address</div>
            <p className="text-sm whitespace-pre-line">
              {emp.currentAddress || <span className="text-muted-foreground/50 italic">—</span>}
            </p>
          </div>
          <div className="space-y-0.5">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Permanent Address</div>
            <p className="text-sm whitespace-pre-line">
              {emp.permanentAddress || <span className="text-muted-foreground/50 italic">—</span>}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function TimelineTab({ emp }: { emp: any }) {
  type Event = { id: string; title: string; description?: string; date?: string | null; icon: LucideIcon }
  const events: Event[] = [
    {
      id: "created",
      title: "Employee record created",
      description: "Profile added to the system",
      date: emp.createdAt,
      icon: FileText,
    },
    {
      id: "joined",
      title: "Onboarded",
      description: "Date of joining",
      date: emp.dateOfJoining,
      icon: UserIcon,
    },
    ...(emp.probationEndDate
      ? [{ id: "probation", title: "Probation period end", description: "Scheduled probation completion", date: emp.probationEndDate, icon: Clock as LucideIcon }]
      : []),
    ...(emp.confirmationDate
      ? [{ id: "confirmed", title: "Confirmed as permanent employee", date: emp.confirmationDate, icon: Briefcase as LucideIcon }]
      : []),
  ].filter((e) => e.date) as Event[]

  if (events.length === 0) {
    return <EmptyState icon={Clock} title="No timeline events" description="Milestones will appear here as the employee progresses." />
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Key milestones and activity for {emp.firstName}.</p>
      <div className="relative pl-7">
        <div className="absolute left-[10px] top-1 bottom-1 w-px bg-border" />
        {events.map((ev) => (
          <div key={ev.id} className="relative pb-5 last:pb-0">
            <div className="absolute -left-[18px] top-0.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-500/15 ring-2 ring-background">
              <ev.icon className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="ml-1">
              <p className="text-sm font-medium text-foreground">{ev.title}</p>
              {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
              <p className="text-xs text-muted-foreground mt-1">{formatDate(ev.date)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DocumentsTab({ emp }: { emp: any }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Document vault for {emp.firstName} {emp.lastName || ""}.
      </p>
      <EmptyState
        icon={FileText}
        title="No documents uploaded"
        description="Document management (KYC, contracts, certificates) will be available in an upcoming release."
      />
    </div>
  )
}

function LeaveTab({ emp }: { emp: any }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Leave entitlement & balance summary for {emp.firstName}.
      </p>
      <EmptyState
        icon={Calendar}
        title="No leave balances"
        description="Leave balances will appear here once leave policies are assigned to this employee."
      />
    </div>
  )
}
