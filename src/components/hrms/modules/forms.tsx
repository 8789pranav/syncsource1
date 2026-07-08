'use client'

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  FileEdit, Plus, Pencil, Trash2, Save, X, ArrowUp, ArrowDown, Copy,
  Type, Hash, Calendar, ListChecks, ToggleLeft, Mail, Phone, DollarSign,
  User, Building2, MapPin, Briefcase, GraduationCap, Clock, FileText, FileImage,
  ChevronDown, ChevronRight, LayoutTemplate, Eye, Settings2, Layers, GripVertical,
  Percent, Link, Minus,
} from "lucide-react"

import { PageHeader, ListToolbar, DataTable, StatusBadge, EmptyState, useAsyncAction, type Column } from "@/components/hrms/ui"
import { getDefaultSchema, defaultFormSchemas } from "@/lib/form-schemas"
import { FormSchema, FormField, FormSection, FieldType } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`

// ---- field-type palette ----
const FIELD_PALETTE: { type: FieldType; label: string; icon: any; hint: string }[] = [
  { type: "text", label: "Text", icon: Type, hint: "Single-line text" },
  { type: "textarea", label: "Long Text", icon: FileText, hint: "Multi-line paragraph" },
  { type: "number", label: "Number", icon: Hash, hint: "Whole numbers" },
  { type: "decimal", label: "Decimal", icon: Hash, hint: "Decimal numbers" },
  { type: "currency", label: "Currency", icon: DollarSign, hint: "Money value" },
  { type: "percentage", label: "Percentage", icon: Percent, hint: "Percentage value" },
  { type: "date", label: "Date", icon: Calendar, hint: "Date picker" },
  { type: "time", label: "Time", icon: Clock, hint: "Time picker" },
  { type: "select", label: "Dropdown", icon: ListChecks, hint: "Single-choice list" },
  { type: "multiselect", label: "Multi-Select", icon: ListChecks, hint: "Multiple-choice list" },
  { type: "radio", label: "Radio", icon: ListChecks, hint: "Radio buttons" },
  { type: "switch", label: "Switch", icon: ToggleLeft, hint: "On/Off toggle" },
  { type: "checkbox", label: "Checkbox", icon: ToggleLeft, hint: "Check agreement" },
  { type: "email", label: "Email", icon: Mail, hint: "Email input" },
  { type: "phone", label: "Phone", icon: Phone, hint: "Phone input" },
  { type: "url", label: "URL", icon: Link, hint: "Web URL" },
  { type: "employee", label: "Employee", icon: User, hint: "Employee picker" },
  { type: "department", label: "Department", icon: Building2, hint: "Dept picker" },
  { type: "designation", label: "Designation", icon: Briefcase, hint: "Designation picker" },
  { type: "grade", label: "Grade", icon: GraduationCap, hint: "Grade picker" },
  { type: "location", label: "Location", icon: MapPin, hint: "Location picker" },
  { type: "entity", label: "Entity", icon: Building2, hint: "Entity picker" },
  { type: "shift", label: "Shift", icon: Clock, hint: "Shift picker" },
  { type: "leaveType", label: "Leave Type", icon: Calendar, hint: "Leave type picker" },
  { type: "assetCategory", label: "Asset Cat.", icon: Layers, hint: "Asset category picker" },
  { type: "file", label: "File", icon: FileText, hint: "File upload" },
  { type: "image", label: "Image", icon: FileImage, hint: "Image upload" },
  { type: "divider", label: "Divider", icon: Minus, hint: "Visual separator" },
  { type: "section", label: "Section", icon: LayoutTemplate, hint: "New section" },
]

// (icons re-imported to avoid tree-shake removal above)

function newField(type: FieldType): FormField {
  const base: FormField = {
    id: uid("f"),
    key: `field_${Math.random().toString(36).slice(2, 7)}`,
    label: "New Field",
    type,
    width: "half",
  }
  if (type === "select" || type === "multiselect" || type === "radio") {
    base.options = [
      { label: "Option 1", value: "opt1" },
      { label: "Option 2", value: "opt2" },
    ]
  }
  if (type === "employee" || type === "department" || type === "designation" || type === "grade" || type === "location" || type === "entity" || type === "shift" || type === "leaveType" || type === "assetCategory") {
    base.endpoint = "/api/employees/picker" // sensible default; admin can change
    if (type === "department") base.endpoint = "/api/departments"
    if (type === "designation") base.endpoint = "/api/designations"
    if (type === "grade") base.endpoint = "/api/grades"
    if (type === "location") base.endpoint = "/api/locations"
    if (type === "entity") base.endpoint = "/api/entities"
    if (type === "shift") base.endpoint = "/api/shifts"
    if (type === "leaveType") base.endpoint = "/api/leave-types"
    if (type === "assetCategory") base.endpoint = "/api/asset-categories"
  }
  return base
}

function newSection(title = "New Section"): FormSection {
  return { id: uid("sec"), title, fields: [] }
}

// ============================================================
// MAIN MODULE
// ============================================================

interface FormRow {
  id: string
  code: string
  name: string
  module: string
  description?: string | null
  status: string
  version: number
  sections: FormSection[]
  updatedAt: string
}

export function FormsModule() {
  const [rows, setRows] = React.useState<FormRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [builderOpen, setBuilderOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<FormRow | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch("/api/forms")
      const data = await res.json()
      setRows(data.items || [])
    } catch { toast.error("Failed to load forms") }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()))

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this form schema?")) return
    const res = await apiFetch(`/api/forms/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Form deleted"); load() }
    else toast.error("Delete failed")
  }

  const columns: Column<FormRow>[] = [
    { key: "name", header: "Form Name", render: (r) => (
      <div className="min-w-0">
        <p className="font-medium text-foreground truncate">{r.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{r.code}</p>
      </div>
    ) },
    { key: "module", header: "Module", render: (r) => <Badge variant="outline" className="font-normal capitalize">{r.module}</Badge> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "version", header: "Version", render: (r) => <span className="text-xs text-muted-foreground">v{r.version}</span> },
    { key: "updatedAt", header: "Updated", render: (r) => <span className="text-xs text-muted-foreground">{new Date(r.updatedAt).toLocaleDateString("en-IN")}</span> },
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
        title="Form Builder"
        description="Design dynamic form schemas visually. Forms power every record type — from employees to assets to leaves."
        icon={FileEdit}
        badge={<Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px]">Dynamic Engine</Badge>}
      />
      <ListToolbar
        search={search}
        onSearch={setSearch}
        onAdd={() => { setEditing(null); setBuilderOpen(true) }}
        addLabel="Create Form"
      />
      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        onRowClick={(r) => { setEditing(r); setBuilderOpen(true) }}
        emptyState={<EmptyState icon={FileEdit} title="No form schemas yet" description="Create your first form schema with the visual builder." />}
      />

      <BuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        editing={editing}
        onSaved={() => { load() }}
      />
    </div>
  )
}

// ============================================================
// BUILDER DIALOG
// ============================================================

function BuilderDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: FormRow | null
  onSaved: () => void
}) {
  const [name, setName] = React.useState("")
  const [code, setCode] = React.useState("")
  const [module, setModule] = React.useState("employee")
  const [description, setDescription] = React.useState("")
  const [status, setStatus] = React.useState("Published")
  const [sections, setSections] = React.useState<FormSection[]>([])
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null)
  const [templateOpen, setTemplateOpen] = React.useState(false)
  const { loading: saving, run } = useAsyncAction()

  // Initialize state when opening
  React.useEffect(() => {
    if (!open) return
    if (editing) {
      setName(editing.name)
      setCode(editing.code)
      setModule(editing.module)
      setDescription(editing.description || "")
      setStatus(editing.status)
      setSections(editing.sections && editing.sections.length ? JSON.parse(JSON.stringify(editing.sections)) : [newSection("Section 1")])
    } else {
      setName("")
      setCode("")
      setModule("employee")
      setDescription("")
      setStatus("Published")
      setSections([newSection("Section 1")])
    }
    setSelectedKey(null)
  }, [open, editing])

  // ---- mutations ----
  const addField = (sectionId: string, type: FieldType) => {
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, fields: [...s.fields, newField(type)] } : s))
  }
  const updateField = (sectionId: string, fieldId: string, patch: Partial<FormField>) => {
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, fields: s.fields.map((f) => f.id === fieldId ? { ...f, ...patch } : f) } : s))
  }
  const removeField = (sectionId: string, fieldId: string) => {
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) } : s))
    if (selectedKey === fieldId) setSelectedKey(null)
  }
  const moveField = (sectionId: string, fieldId: string, dir: -1 | 1) => {
    setSections((prev) => prev.map((s) => {
      if (s.id !== sectionId) return s
      const idx = s.fields.findIndex((f) => f.id === fieldId)
      const next = idx + dir
      if (idx < 0 || next < 0 || next >= s.fields.length) return s
      const copy = [...s.fields]
      const [item] = copy.splice(idx, 1)
      copy.splice(next, 0, item)
      return { ...s, fields: copy }
    }))
  }
  const addSection = () => {
    setSections((prev) => [...prev, newSection(`Section ${prev.length + 1}`)])
  }
  const updateSection = (sectionId: string, patch: Partial<FormSection>) => {
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, ...patch } : s))
  }
  const removeSection = (sectionId: string) => {
    setSections((prev) => prev.length === 1 ? prev : prev.filter((s) => s.id !== sectionId))
  }

  const loadTemplate = (m: string) => {
    const tmpl = getDefaultSchema(m)
    if (!tmpl) { toast.error("No template found"); return }
    setName(tmpl.name)
    setCode(tmpl.code)
    setModule(m)
    setDescription(tmpl.description || "")
    setSections(JSON.parse(JSON.stringify(tmpl.sections)))
    setSelectedKey(null)
    setTemplateOpen(false)
    toast.success(`Loaded template: ${tmpl.name}`)
  }

  const totalFields = sections.reduce((a, s) => a + s.fields.length, 0)

  const handleSave = async () => {
    if (!name.trim() || !code.trim()) { toast.error("Name and code are required"); return }
    await run(async () => {
      const payload = { name, code, module, description, status, sections }
      const isEdit = !!editing
      const url = isEdit ? `/api/forms/${editing!.id}` : "/api/forms"
      const method = isEdit ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Save failed")
      }
      toast.success(isEdit ? "Form updated" : "Form created")
      onOpenChange(false)
      onSaved()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2 min-w-0">
            <div className="grid h-8 w-8 place-items-center rounded-lg gradient-emerald text-primary-foreground">
              <FileEdit className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{editing ? "Edit Form Schema" : "Form Builder"}</p>
              <p className="text-[11px] text-muted-foreground">{sections.length} sections · {totalFields} fields</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setTemplateOpen(true)} className="gap-1.5">
              <LayoutTemplate className="h-3.5 w-3.5" /> Templates
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="gap-1.5">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Form
            </Button>
          </div>
        </div>

        {/* Metadata bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-3 border-b bg-background">
          <LabeledInput label="Form Name" value={name} onChange={setName} placeholder="Add Employee" />
          <LabeledInput label="Code" value={code} onChange={(v) => setCode(v.replace(/\s+/g, "-").toLowerCase())} placeholder="employee-default" />
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Module</Label>
            <Select value={module} onValueChange={setModule}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(defaultFormSchemas).map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                <SelectItem value="custom">custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Two-pane builder */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] overflow-hidden min-h-0">
          {/* Canvas */}
          <div className="overflow-y-auto bg-muted/20 border-r">
            <div className="px-5 py-4 space-y-3">
              {description && <p className="text-xs text-muted-foreground italic">{description}</p>}
              <AnimatePresence initial={false}>
                {sections.map((section, si) => (
                  <motion.div key={section.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                    <Card className="border-border/60 shadow-soft">
                      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Input
                            value={section.title}
                            onChange={(e) => updateSection(section.id, { title: e.target.value })}
                            className="h-7 text-sm font-semibold border-0 px-1 focus-visible:ring-1 bg-transparent"
                          />
                          <Badge variant="secondary" className="text-[10px] bg-muted">{section.fields.length} fields</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" disabled={sections.length === 1} onClick={() => removeSection(section.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pb-3">
                        {section.fields.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
                            Add a field from the palette on the right →
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {section.fields.map((f, fi) => {
                              const isSel = selectedKey === f.id
                              return (
                                <button
                                  key={f.id}
                                  onClick={() => setSelectedKey(f.id)}
                                  className={cn(
                                    "group relative rounded-lg border bg-background px-3 py-2.5 text-left transition-all hover:border-primary/40",
                                    isSel ? "border-primary ring-2 ring-primary/20" : "border-border/60",
                                    f.width === "full" && "sm:col-span-2",
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <TypeIcon type={f.type} />
                                        <p className="text-xs font-medium text-foreground truncate">
                                          {f.label}
                                          {f.validation?.required && <span className="text-destructive ml-0.5">*</span>}
                                        </p>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">{f.key} · {f.type}</p>
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={(e) => { e.stopPropagation(); moveField(section.id, f.id, -1) }} disabled={fi === 0} className="grid h-6 w-6 place-items-center rounded hover:bg-muted disabled:opacity-30">
                                        <ArrowUp className="h-3 w-3" />
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); moveField(section.id, f.id, 1) }} disabled={fi === section.fields.length - 1} className="grid h-6 w-6 place-items-center rounded hover:bg-muted disabled:opacity-30">
                                        <ArrowDown className="h-3 w-3" />
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); removeField(section.id, f.id) }} className="grid h-6 w-6 place-items-center rounded hover:bg-rose-100 text-rose-600">
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <FieldPreview field={f} />
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              <Button variant="outline" size="sm" onClick={addSection} className="w-full border-dashed gap-1.5">
                <Plus className="h-4 w-4" /> Add Section
              </Button>
            </div>
          </div>

          {/* Right: palette + inspector */}
          <div className="overflow-y-auto bg-background">
            <Tabs2
              tabs={[
                { id: "palette", label: "Palette", icon: Plus },
                { id: "inspector", label: "Inspector", icon: Settings2 },
              ]}
            >
              {(active) => active === "palette" ? (
                <Palette onAdd={(type) => {
                  // Add to first section (or last) — prefer the section containing the selected field, else last
                  const target = sections.find((s) => s.fields.some((f) => f.id === selectedKey)) || sections[sections.length - 1]
                  if (!target) return
                  if (type === "section") { addSection(); return }
                  addField(target.id, type)
                }} />
              ) : (
                <Inspector
                  sections={sections}
                  selectedKey={selectedKey}
                  onUpdate={(patch) => {
                    for (const s of sections) {
                      if (s.fields.some((f) => f.id === selectedKey)) {
                        updateField(s.id, selectedKey!, patch)
                        return
                      }
                    }
                  }}
                />
              )}
            </Tabs2>
          </div>
        </div>
      </DialogContent>

      {/* Template picker */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Load from template</DialogTitle>
            <DialogDescription>Start from a built-in default schema. You can customize it freely.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            {Object.keys(defaultFormSchemas).map((m) => {
              const s = defaultFormSchemas[m]
              return (
                <button key={m} onClick={() => loadTemplate(m)} className="text-left rounded-lg border border-border/60 p-3 hover:border-primary/40 hover:bg-muted/40 transition-colors">
                  <p className="text-sm font-medium capitalize">{m}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{s.name}</p>
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

// Simple internal tabs (no radix dependency for compact switching)
function Tabs2({ tabs, children }: { tabs: { id: string; label: string; icon: any }[]; children: (active: string) => React.ReactNode }) {
  const [active, setActive] = React.useState(tabs[0].id)
  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b bg-muted/30">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActive(t.id)} className={cn("flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors", active === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">{children(active)}</div>
    </div>
  )
}

function LabeledInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
    </div>
  )
}

// ============================================================
// PALETTE
// ============================================================

function Palette({ onAdd }: { onAdd: (type: FieldType) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Click to add field</p>
        <div className="grid grid-cols-2 gap-1.5">
          {FIELD_PALETTE.filter((p) => p.type !== "section" && p.type !== "divider").map((p) => (
            <button
              key={p.type}
              onClick={() => onAdd(p.type)}
              className="group flex flex-col items-start gap-1 rounded-lg border border-border/60 p-2.5 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
              title={p.hint}
            >
              <div className="flex items-center gap-1.5">
                <p.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                <span className="text-xs font-medium">{p.label}</span>
              </div>
              <span className="text-[10px] text-muted-foreground line-clamp-1">{p.hint}</span>
            </button>
          ))}
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={() => onAdd("section")} className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 p-2.5 text-xs font-medium hover:bg-muted/40 transition-colors">
          <LayoutTemplate className="h-3.5 w-3.5" /> Add Section
        </button>
        <button onClick={() => onAdd("divider")} className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 p-2.5 text-xs font-medium hover:bg-muted/40 transition-colors">
          <Minus className="h-3.5 w-3.5" /> Divider
        </button>
      </div>
    </div>
  )
}

// ============================================================
// INSPECTOR
// ============================================================

function Inspector({ sections, selectedKey, onUpdate }: {
  sections: FormSection[]
  selectedKey: string | null
  onUpdate: (patch: Partial<FormField>) => void
}) {
  const field = React.useMemo(() => {
    for (const s of sections) {
      const f = s.fields.find((x) => x.id === selectedKey)
      if (f) return f
    }
    return null
  }, [sections, selectedKey])

  if (!field) {
    return (
      <div className="text-center py-10">
        <div className="grid h-12 w-12 mx-auto place-items-center rounded-xl bg-muted text-muted-foreground mb-3">
          <Settings2 className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium">No field selected</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[220px] mx-auto">Click a field on the canvas to edit its label, key, options, validation, and visibility.</p>
      </div>
    )
  }

  const hasOptions = field.type === "select" || field.type === "multiselect" || field.type === "radio"
  const isPicker = ["employee", "department", "designation", "grade", "location", "entity", "shift", "leaveType", "assetCategory"].includes(field.type)

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Field Inspector</p>
          <Badge variant="outline" className="text-[10px] font-normal">{field.type}</Badge>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Label</Label>
          <Input value={field.label} onChange={(e) => onUpdate({ label: e.target.value })} className="h-8 text-sm" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Key</Label>
          <Input value={field.key} onChange={(e) => onUpdate({ key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "_") })} className="h-8 text-sm font-mono" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Type</Label>
            <Select value={field.type} onValueChange={(v) => onUpdate({ type: v as FieldType })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {FIELD_PALETTE.map((p) => <SelectItem key={p.type} value={p.type}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Width</Label>
            <Select value={field.width || "half"} onValueChange={(v) => onUpdate({ width: v as any })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="half">Half</SelectItem>
                <SelectItem value="third">Third</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Placeholder</Label>
          <Input value={field.placeholder || ""} onChange={(e) => onUpdate({ placeholder: e.target.value })} className="h-8 text-sm" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Help Text</Label>
          <Input value={field.helpText || ""} onChange={(e) => onUpdate({ helpText: e.target.value })} className="h-8 text-sm" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Default Value</Label>
          <Input value={String(field.defaultValue ?? "")} onChange={(e) => onUpdate({ defaultValue: e.target.value })} className="h-8 text-sm" />
        </div>

        {isPicker && (
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Endpoint</Label>
            <Input value={field.endpoint || ""} onChange={(e) => onUpdate({ endpoint: e.target.value })} className="h-8 text-sm font-mono" />
          </div>
        )}

        {hasOptions && (
          <OptionsEditor
            options={field.options || []}
            onChange={(options) => onUpdate({ options })}
          />
        )}

        <Separator />

        <div className="space-y-2">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Validation</Label>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <span className="text-sm">Required</span>
            <Switch checked={!!field.validation?.required} onCheckedChange={(v) => onUpdate({ validation: { ...field.validation, required: v } })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Min Length</Label>
              <Input type="number" value={field.validation?.minLength ?? ""} onChange={(e) => onUpdate({ validation: { ...field.validation, minLength: e.target.value ? Number(e.target.value) : undefined } })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Max Length</Label>
              <Input type="number" value={field.validation?.maxLength ?? ""} onChange={(e) => onUpdate({ validation: { ...field.validation, maxLength: e.target.value ? Number(e.target.value) : undefined } })} className="h-8 text-sm" />
            </div>
          </div>
        </div>

        <Separator />

        <VisibilityEditor
          field={field}
          sections={sections}
          onChange={(visibilityConditions) => onUpdate({ visibilityConditions })}
        />
      </div>
    </ScrollArea>
  )
}

function OptionsEditor({ options, onChange }: { options: { label: string; value: string }[]; onChange: (o: { label: string; value: string }[]) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Options</Label>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => onChange([...options, { label: `Option ${options.length + 1}`, value: `opt${options.length + 1}` }])}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
      <div className="space-y-1.5">
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input value={o.label} onChange={(e) => { const c = [...options]; c[i] = { ...c[i], label: e.target.value }; onChange(c) }} className="h-8 text-sm flex-1" placeholder="Label" />
            <Input value={o.value} onChange={(e) => { const c = [...options]; c[i] = { ...c[i], value: e.target.value }; onChange(c) }} className="h-8 text-sm flex-1 font-mono" placeholder="value" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => onChange(options.filter((_, j) => j !== i))}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function VisibilityEditor({ field, sections, onChange }: {
  field: FormField
  sections: FormSection[]
  onChange: (v: { field: string; operator: "eq" | "neq"; value: unknown }[]) => void
}) {
  const conds = field.visibilityConditions || []
  const allFields = sections.flatMap((s) => s.fields).filter((f) => f.id !== field.id)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Visibility Conditions</Label>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" disabled={allFields.length === 0} onClick={() => onChange([...conds, { field: allFields[0]?.key || "", operator: "eq", value: "" }])}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
      {conds.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">Show this field always. Add a condition to show it only when another field matches.</p>
      ) : (
        <div className="space-y-2">
          {conds.map((c, i) => (
            <div key={i} className="rounded-lg border border-border/60 p-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Select value={c.field} onValueChange={(v) => { const arr = [...conds]; arr[i] = { ...arr[i], field: v }; onChange(arr) }}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Field" /></SelectTrigger>
                  <SelectContent>{allFields.map((f) => <SelectItem key={f.id} value={f.key}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => onChange(conds.filter((_, j) => j !== i))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-1.5">
                <Select value={c.operator} onValueChange={(v: any) => { const arr = [...conds]; arr[i] = { ...arr[i], operator: v }; onChange(arr) }}>
                  <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eq">equals</SelectItem>
                    <SelectItem value="neq">not equals</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={String(c.value)} onChange={(e) => { const arr = [...conds]; arr[i] = { ...arr[i], value: e.target.value }; onChange(arr) }} className="h-7 text-xs flex-1" placeholder="value" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// FIELD PREVIEW (mini control on canvas)
// ============================================================

function FieldPreview({ field }: { field: FormField }) {
  if (field.type === "divider") return <div className="mt-2 h-px bg-border" />
  if (field.type === "section") return null
  let control: React.ReactNode = <div className="mt-2 h-7 rounded-md border border-border/60 bg-muted/30 px-2 text-[10px] text-muted-foreground flex items-center">{field.placeholder || "Input…"}</div>
  if (field.type === "textarea") control = <div className="mt-2 h-12 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground">Multi-line text…</div>
  if (field.type === "select" || ["employee", "department", "designation", "grade", "location", "entity", "shift", "leaveType", "assetCategory"].includes(field.type)) {
    control = <div className="mt-2 h-7 rounded-md border border-border/60 bg-muted/30 px-2 text-[10px] text-muted-foreground flex items-center justify-between">Select… <ChevronDown className="h-3 w-3" /></div>
  }
  if (field.type === "switch" || field.type === "checkbox") {
    control = <div className="mt-2 flex items-center gap-2"><div className="h-4 w-7 rounded-full bg-primary/30" /><span className="text-[10px] text-muted-foreground">Off</span></div>
  }
  if (field.type === "radio") {
    control = <div className="mt-2 flex gap-3">{(field.options || []).slice(0, 3).map((o, i) => (
      <div key={i} className="flex items-center gap-1">
        <div className="h-3 w-3 rounded-full border border-border" />
        <span className="text-[10px] text-muted-foreground">{o.label}</span>
      </div>
    ))}</div>
  }
  if (field.type === "date") control = <div className="mt-2 h-7 rounded-md border border-border/60 bg-muted/30 px-2 text-[10px] text-muted-foreground flex items-center">📅 Pick a date</div>
  if (field.type === "multiselect") {
    control = <div className="mt-2 flex gap-1">{(field.options || []).slice(0, 3).map((o, i) => (
      <span key={i} className="rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[9px] text-muted-foreground">{o.label}</span>
    ))}</div>
  }
  return <>{control}</>
}

function TypeIcon({ type }: { type: FieldType }) {
  const entry = FIELD_PALETTE.find((p) => p.type === type)
  if (!entry) return <Type className="h-3 w-3 text-muted-foreground" />
  return <entry.icon className="h-3 w-3 text-muted-foreground" />
}
