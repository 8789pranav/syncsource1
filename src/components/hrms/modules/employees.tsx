'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Users, Plus, Pencil, Trash2, ExternalLink,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
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
import {
  PageHeader, ListToolbar, DataTable, StatusBadge, EmptyState, Column,
} from "@/components/hrms/ui"
import { DynamicForm } from "@/components/dynamic-form/dynamic-form"
import { employeeFormSchema } from "@/lib/form-schemas"
import type { FormValues } from "@/lib/types"
import { EmployeeProfile } from "@/components/hrms/employee-profile/employee-profile"
import { apiFetch } from "@/lib/api-client"

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

  // Selected employee (opens full-screen profile)
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null)

  // Add/Edit dialog state (list-level)
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
      const res = await apiFetch(url, { cache: "no-store" })
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
    apiFetch("/api/departments", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setDepartments(data.items || []))
      .catch(() => {})
  }, [])

  // Open full-screen profile on row click
  const onView = (row: any) => {
    setSelectedEmployeeId(row.id)
  }

  const onAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const onEdit = (emp: any) => {
    setEditing(emp)
    setDialogOpen(true)
  }

  const onSubmit = async (values: FormValues) => {
    setSaving(true)
    try {
      const isEdit = !!editing
      const url = isEdit ? `/api/employees/${editing.id}` : "/api/employees"
      const method = isEdit ? "PATCH" : "POST"
      const res = await apiFetch(url, {
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
    } catch (e: any) {
      toast.error(e.message || "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const onConfirmDelete = async () => {
    if (!deletingId) return
    try {
      const res = await apiFetch(`/api/employees/${deletingId}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to delete")
      }
      toast.success("Employee deleted")
      // If the deleted employee was the one being viewed, drop back to list
      if (selectedEmployeeId === deletingId) {
        setSelectedEmployeeId(null)
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

  // ---------------------------------------------------------------
  // Full-screen profile view (replaces the list when an employee
  // is selected).
  // ---------------------------------------------------------------
  if (selectedEmployeeId) {
    return (
      <EmployeeProfile
        employeeId={selectedEmployeeId}
        onBack={() => setSelectedEmployeeId(null)}
        onEdited={load}
      />
    )
  }

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
