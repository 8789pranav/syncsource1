"use client"

// ============================================================
// DocumentsSettingsSection — Settings (flagship 9-step Entity
// Configuration wizard + 13 settings tabs)
// ------------------------------------------------------------
// Tabs:
//   1. General Settings
//   2. Entity Configuration (FLAGSHIP — 9-step wizard)
//   3. Document Category Settings
//   4. Template Settings
//   5. Header / Footer Settings
//   6. Smart Value Settings
//   7. Document Request Settings
//   8. Approval Settings
//   9. E-Sign Settings
//  10. Visibility Settings
//  11. Email Settings
//  12. Storage Settings
//  13. Versioning Settings
//  14. Audit & Security
// ============================================================

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Settings as SettingsIcon, Building2, SlidersHorizontal, Layers,
  FileSliders, Braces, Inbox, CheckCircle2, PenTool, Eye, Mail,
  HardDrive, GitBranch, ShieldCheck, Plus, Search, MoreHorizontal,
  Check, ChevronRight, ChevronLeft, X, AlertTriangle, Info,
  History, Eye as EyeIcon, Trash2, Copy, FileCheck, Star,
  Upload, Download, Lock, ArrowRight, ArrowLeftRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import { toast } from "sonner"

import {
  EntityDocumentConfig, Entity, ApproverType, VisibilityRule,
  ENTITIES, APPROVER_TYPES, VISIBILITY_RULES, TEMPLATE_CATEGORIES,
  HR_DOC_CATEGORIES, EMPLOYEE_DOC_CATEGORIES, COMMON_EMPLOYEE_DOCS,
  STATUS_COLORS, initials, avatarColor, formatDate,
} from "../shared"
import { ENTITY_DOCUMENT_CONFIGS } from "../data"

// ============================================================================
//  Constants
// ============================================================================

const ACCENT = "from-violet-500 to-purple-600"

const TABS: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "general", label: "General Settings", icon: SlidersHorizontal },
  { id: "entity-configuration", label: "Entity Configuration", icon: Building2 },
  { id: "category", label: "Document Category Settings", icon: Layers },
  { id: "template", label: "Template Settings", icon: FileSliders },
  { id: "header-footer", label: "Header / Footer Settings", icon: FileSliders },
  { id: "smart-value", label: "Smart Value Settings", icon: Braces },
  { id: "request", label: "Document Request Settings", icon: Inbox },
  { id: "approval", label: "Approval Settings", icon: CheckCircle2 },
  { id: "esign", label: "E-Sign Settings", icon: PenTool },
  { id: "visibility", label: "Visibility Settings", icon: Eye },
  { id: "email", label: "Email Settings", icon: Mail },
  { id: "storage", label: "Storage Settings", icon: HardDrive },
  { id: "versioning", label: "Versioning Settings", icon: GitBranch },
  { id: "audit-security", label: "Audit & Security", icon: ShieldCheck },
]

// ============================================================================
//  Small reusable primitives
// ============================================================================

function ToggleRow({
  label, description, defaultChecked = false, onChange,
}: {
  label: string
  description?: string
  defaultChecked?: boolean
  onChange?: (v: boolean) => void
}) {
  const [checked, setChecked] = React.useState(defaultChecked)
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(v) => { setChecked(v); onChange?.(v) }}
        className="data-[state=checked]:bg-violet-600"
      />
    </div>
  )
}

function FieldRow({
  label, children, hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function SettingsCard({
  title, description, icon: Icon, children, actions,
}: {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            {Icon && (
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              {description && <CardDescription className="text-xs mt-0.5">{description}</CardDescription>}
            </div>
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}

// ============================================================================
//  TAB: General Settings
// ============================================================================

function GeneralTab() {
  const [saved, setSaved] = React.useState(false)
  return (
    <div className="space-y-4">
      <SettingsCard
        title="Module Feature Toggles"
        description="Enable or disable top-level Documents module features. Disabled features are hidden from the sidebar."
        icon={SlidersHorizontal}
        actions={
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => { setSaved(true); toast.success("General settings saved") }}>
            {saved ? "Saved" : "Save Changes"}
          </Button>
        }
      >
        <div className="divide-y divide-border/60">
          <ToggleRow label="Enable Document Module" description="Master switch for the entire Documents module" defaultChecked />
          <ToggleRow label="Enable Employee Documents" description="Allow employee-wise document storage & verification" defaultChecked />
          <ToggleRow label="Enable HR Documents" description="Allow company/HR policy documents with acknowledgment" defaultChecked />
          <ToggleRow label="Enable Document Library" description="Universal template library with rich-text editor" defaultChecked />
          <ToggleRow label="Enable Document Requests" description="Employees can request documents from HR" defaultChecked />
          <ToggleRow label="Enable Generated Documents" description="Store every generated letter with audit trail" defaultChecked />
          <ToggleRow label="Enable Template Versioning" description="Allow multiple versions of templates" defaultChecked />
          <ToggleRow label="Enable E-Sign" description="Digital signature integration (Adobe Sign / DocuSign)" defaultChecked />
          <ToggleRow label="Enable Document Expiry Tracking" description="Track document expiry dates & send reminders" defaultChecked />
          <ToggleRow label="Enable Employee Acknowledgment" description="Require employees to acknowledge HR documents" defaultChecked />
        </div>
      </SettingsCard>
    </div>
  )
}

// ============================================================================
//  TAB: Entity Configuration (FLAGSHIP 9-step wizard)
// ============================================================================

type WizardForm = EntityDocumentConfig

const STEPS = [
  { id: 1, name: "Basic Entity Setup", short: "Basic" },
  { id: 2, name: "Template Defaults", short: "Templates" },
  { id: 3, name: "Employee Document Rules", short: "Emp Docs" },
  { id: 4, name: "HR Document Rules", short: "HR Docs" },
  { id: 5, name: "Document Request Rules", short: "Requests" },
  { id: 6, name: "Approval & E-Sign Rules", short: "Approvals" },
  { id: 7, name: "Email & Notification Rules", short: "Email" },
  { id: 8, name: "Storage & Security Rules", short: "Storage" },
  { id: 9, name: "Review & Publish", short: "Review" },
]

function StepIndicator({
  current, completed, useTenantDefault, onJump,
}: {
  current: number
  completed: number[]
  useTenantDefault: boolean
  onJump: (step: number) => void
}) {
  const progress = Math.round(((completed.length + (current > 0 ? 1 : 0)) / STEPS.length) * 100)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
            Step {current} of {STEPS.length}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {STEPS[current - 1]?.name || "Review"}
          </span>
        </div>
        <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">{progress}%</span>
      </div>
      <Progress value={progress} className="h-1.5 bg-violet-100 dark:bg-violet-500/15" />
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s) => {
          const isDone = completed.includes(s.id)
          const isCurrent = current === s.id
          const isDisabled = useTenantDefault && s.id >= 3 && s.id <= 8
          return (
            <button
              key={s.id}
              onClick={() => !isDisabled && onJump(s.id)}
              disabled={isDisabled}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap transition-all",
                isCurrent && "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm",
                !isCurrent && isDone && !isDisabled && "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
                !isCurrent && !isDone && !isDisabled && "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
                isDisabled && "text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50 border border-dashed border-slate-300 dark:border-slate-700",
              )}
            >
              <span className={cn(
                "grid h-4 w-4 place-items-center rounded-full text-[9px]",
                isCurrent ? "bg-white/20" : isDone ? "bg-violet-600 text-white" : "bg-slate-200 dark:bg-slate-700",
              )}>
                {isDone ? <Check className="h-2.5 w-2.5" /> : s.id}
              </span>
              {s.short}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TenantDefaultNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Using Tenant Default</p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
            This entity inherits all document configuration from the tenant default. Steps 3–8 are disabled. Disable "Use Tenant Default" to customize this entity's configuration.
          </p>
        </div>
      </div>
    </div>
  )
}

function Step1Basic({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  return (
    <div className="space-y-5">
      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Basic Entity Setup</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow label="Entity / Company *">
            <Select value={form.entityId} onValueChange={(v) => {
              const e = ENTITIES.find(x => x.id === v)
              setForm(f => ({ ...f, entityId: v, entityName: e?.name || "", country: e?.country || "", state: e?.state || "" }))
            }}>
              <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
              <SelectContent>{ENTITIES.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Country">
            <Input value={form.country} readOnly className="bg-muted/40" />
          </FieldRow>
          <FieldRow label="State / Province">
            <Input value={form.state} readOnly className="bg-muted/40" />
          </FieldRow>
          <FieldRow label="Status">
            <Select value={form.status} onValueChange={(v: "Active" | "Inactive") => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Effective From">
            <Input type="date" value={form.effectiveFrom ? form.effectiveFrom.slice(0, 10) : ""} onChange={(e) => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
          </FieldRow>
          <FieldRow label="Effective To">
            <Input type="date" value={form.effectiveTo ? form.effectiveTo.slice(0, 10) : ""} onChange={(e) => setForm(f => ({ ...f, effectiveTo: e.target.value || null }))} />
          </FieldRow>
          <FieldRow label="Version">
            <Input type="number" value={form.version} readOnly className="bg-muted/40" />
          </FieldRow>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">Use Tenant Default</p>
                <p className="text-[11px] text-muted-foreground">Inherit all settings from tenant default</p>
              </div>
              <Switch checked={form.useTenantDefault} onCheckedChange={(v) => setForm(f => ({ ...f, useTenantDefault: v }))} className="data-[state=checked]:bg-violet-600" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">Override Tenant Default</p>
                <p className="text-[11px] text-muted-foreground">Allow entity-level overrides on top of tenant default</p>
              </div>
              <Switch checked={!form.useTenantDefault} onCheckedChange={() => setForm(f => ({ ...f, useTenantDefault: false }))} className="data-[state=checked]:bg-violet-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Step2Templates({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  const fields: { key: keyof WizardForm; label: string }[] = [
    { key: "defaultHeader", label: "Default Header Template" },
    { key: "defaultFooter", label: "Default Footer Template" },
    { key: "defaultWatermark", label: "Default Watermark" },
    { key: "defaultSignature", label: "Default Signature" },
    { key: "defaultOfferLetter", label: "Default Offer Letter" },
    { key: "defaultAppointmentLetter", label: "Default Appointment Letter" },
    { key: "defaultIncrementLetter", label: "Default Increment Letter" },
    { key: "defaultPromotionLetter", label: "Default Promotion Letter" },
    { key: "defaultTransferLetter", label: "Default Transfer Letter" },
    { key: "defaultRelievingLetter", label: "Default Relieving Letter" },
    { key: "defaultExperienceLetter", label: "Default Experience Letter" },
    { key: "defaultFnFLetter", label: "Default FnF Letter" },
    { key: "defaultSalaryCertificate", label: "Default Salary Certificate" },
    { key: "defaultTemplateGroup", label: "Default Custom Template Group" },
  ]
  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Template Defaults</CardTitle>
          <CardDescription className="text-xs">Set default templates for this entity. Templates are picked from the Document Library.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(f => (
            <FieldRow key={f.key} label={f.label}>
              <Input
                value={(form[f.key] as string) || ""}
                onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={`Select ${f.label}`}
              />
            </FieldRow>
          ))}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-500/30 dark:bg-violet-500/10">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-2">India Example</p>
            <ul className="text-[11px] text-violet-600 dark:text-violet-400 space-y-1">
              <li>• Header: <strong>ACME India Header</strong></li>
              <li>• Footer: <strong>ACME India Footer</strong></li>
              <li>• Offer Letter: <strong>India Offer Letter</strong></li>
              <li>• Appointment: <strong>India Appointment Letter</strong></li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-fuchsia-200 bg-fuchsia-50/50 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300 mb-2">UAE Example</p>
            <ul className="text-[11px] text-fuchsia-600 dark:text-fuchsia-400 space-y-1">
              <li>• Header: <strong>ACME UAE Header</strong></li>
              <li>• Footer: <strong>ACME UAE Footer</strong></li>
              <li>• Offer Letter: <strong>UAE Offer Letter</strong></li>
              <li>• Appointment: <strong>UAE Appointment Letter</strong></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Step3EmpDocs({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  const addRow = () => setForm(f => ({
    ...f,
    mandatoryDocs: [...f.mandatoryDocs, { docType: "", mandatory: true, appliesTo: "All Employees", verificationRequired: false, expiryRequired: false }],
  }))
  const removeRow = (i: number) => setForm(f => ({ ...f, mandatoryDocs: f.mandatoryDocs.filter((_, idx) => idx !== i) }))
  const updateRow = (i: number, patch: Partial<WizardForm["mandatoryDocs"][number]>) =>
    setForm(f => ({ ...f, mandatoryDocs: f.mandatoryDocs.map((r, idx) => idx === i ? { ...r, ...patch } : r) }))

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Employee Document Rules</CardTitle>
              <CardDescription className="text-xs">Define mandatory documents, file types, and verification rules</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enableEmployeeDocs} onCheckedChange={(v) => setForm(f => ({ ...f, enableEmployeeDocs: v }))} className="data-[state=checked]:bg-violet-600" />
              <span className="text-xs text-muted-foreground">{form.enableEmployeeDocs ? "Enabled" : "Disabled"}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Allowed File Types"><Input value={form.allowedFileTypes} onChange={(e) => setForm(f => ({ ...f, allowedFileTypes: e.target.value }))} /></FieldRow>
            <FieldRow label="Max File Size"><Input value={form.maxFileSize} onChange={(e) => setForm(f => ({ ...f, maxFileSize: e.target.value }))} /></FieldRow>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <ToggleRow label="Verification Required" defaultChecked onChange={() => {}} />
            <ToggleRow label="Expiry Tracking" defaultChecked onChange={() => {}} />
            <ToggleRow label="Employee Upload" defaultChecked onChange={() => {}} />
            <ToggleRow label="HR Upload" defaultChecked onChange={() => {}} />
            <ToggleRow label="Employee Download" defaultChecked onChange={() => {}} />
            <ToggleRow label="Versioning" defaultChecked onChange={() => {}} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Mandatory Documents</CardTitle>
              <CardDescription className="text-xs">Documents required from employees at joining or per stage</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addRow} className="border-violet-300 text-violet-700 hover:bg-violet-50">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Document
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[360px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="border-border/60">
                  <TableHead className="text-xs">Document Type</TableHead>
                  <TableHead className="text-xs w-20">Mandatory</TableHead>
                  <TableHead className="text-xs">Applies To</TableHead>
                  <TableHead className="text-xs w-24">Verification</TableHead>
                  <TableHead className="text-xs w-20">Expiry</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.mandatoryDocs.map((row, i) => (
                  <TableRow key={i} className="border-border/40 hover:bg-violet-50/30">
                    <TableCell>
                      <Input value={row.docType} onChange={(e) => updateRow(i, { docType: e.target.value })} className="h-8 text-xs" placeholder="e.g. PAN Card" />
                    </TableCell>
                    <TableCell>
                      <Switch checked={row.mandatory} onCheckedChange={(v) => updateRow(i, { mandatory: v })} className="data-[state=checked]:bg-violet-600" />
                    </TableCell>
                    <TableCell>
                      <Input value={row.appliesTo} onChange={(e) => updateRow(i, { appliesTo: e.target.value })} className="h-8 text-xs" />
                    </TableCell>
                    <TableCell>
                      <Switch checked={row.verificationRequired} onCheckedChange={(v) => updateRow(i, { verificationRequired: v })} className="data-[state=checked]:bg-violet-600" />
                    </TableCell>
                    <TableCell>
                      <Switch checked={row.expiryRequired} onCheckedChange={(v) => updateRow(i, { expiryRequired: v })} className="data-[state=checked]:bg-violet-600" />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" onClick={() => removeRow(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {form.mandatoryDocs.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">No mandatory documents configured</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function Step4HRDocs({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">HR Document Rules</CardTitle>
              <CardDescription className="text-xs">Publish approval, acknowledgment & visibility rules</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enableHRDocs} onCheckedChange={(v) => setForm(f => ({ ...f, enableHRDocs: v }))} className="data-[state=checked]:bg-violet-600" />
              <span className="text-xs text-muted-foreground">{form.enableHRDocs ? "Enabled" : "Disabled"}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 divide-y divide-border/60">
          <ToggleRow label="Publish Approval Required" description="HR documents require approval before publishing" defaultChecked={form.publishApprovalRequired} onChange={(v) => setForm(f => ({ ...f, publishApprovalRequired: v }))} />
          <ToggleRow label="Acknowledgment Required (Default)" description="New HR documents require employee acknowledgment by default" defaultChecked={form.defaultAcknowledgment} onChange={(v) => setForm(f => ({ ...f, defaultAcknowledgment: v }))} />
          <ToggleRow label="Allow Department-wise Visibility" description="HR docs can be restricted to specific departments" defaultChecked />
          <ToggleRow label="Allow Employee Type-wise Visibility" description="HR docs can be restricted by employee type" defaultChecked />
          <ToggleRow label="Allow Versioning" description="Multiple versions of HR documents allowed" defaultChecked />
          <ToggleRow label="Allow Archive" description="HR documents can be archived" defaultChecked />
        </CardContent>
      </Card>
      <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-500/30 dark:bg-violet-500/10">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1">Example: POSH Policy</p>
          <p className="text-[11px] text-violet-600 dark:text-violet-400">Visible To: All India Employees · Acknowledgment Required: Yes · Reminder: Every 3 Days · Escalation: HR Manager</p>
        </CardContent>
      </Card>
    </div>
  )
}

function Step5Requests({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  const requestable = ["Salary Certificate", "Employment Certificate", "Address Proof Letter", "Experience Letter", "Visa Letter", "Bank Letter", "NOC", "Custom Letter"]
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Document Request Rules</CardTitle>
            <CardDescription className="text-xs">Control how employees request documents from HR</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.enableDocumentRequest} onCheckedChange={(v) => setForm(f => ({ ...f, enableDocumentRequest: v }))} className="data-[state=checked]:bg-violet-600" />
            <span className="text-xs text-muted-foreground">{form.enableDocumentRequest ? "Enabled" : "Disabled"}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs font-medium mb-2 block">Allowed Request Documents</Label>
          <div className="flex flex-wrap gap-2">
            {requestable.map(r => {
              const selected = form.enableDocumentRequest
              return (
                <Badge key={r} variant="outline" className={cn("cursor-pointer text-xs", selected ? "border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" : "opacity-50")}>
                  {r}
                </Badge>
              )
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToggleRow label="Approval Required" description="HR must approve before generating" defaultChecked={form.requestApprovalRequired} onChange={(v) => setForm(f => ({ ...f, requestApprovalRequired: v }))} />
          <ToggleRow label="Auto Generate After Approval" description="Generate document immediately on approval" defaultChecked={form.autoGenerateAfterApproval} onChange={(v) => setForm(f => ({ ...f, autoGenerateAfterApproval: v }))} />
          <ToggleRow label="Allow Employee Reason" description="Employees can provide a reason for the request" defaultChecked />
          <ToggleRow label="Allow Addressed To Field" description="Employees can specify addressee (e.g. Bank Manager)" defaultChecked />
          <ToggleRow label="Allow Attachment" description="Employees can attach supporting documents" defaultChecked />
          <ToggleRow label="Allow Employee Download" description="Employees can download the generated document" defaultChecked />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow label="Default Approver">
            <Select value={form.defaultApprover} onValueChange={(v) => setForm(f => ({ ...f, defaultApprover: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{APPROVER_TYPES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="SLA Days" hint="Turnaround time for request processing">
            <Input type="number" value={form.slaDays} onChange={(e) => setForm(f => ({ ...f, slaDays: parseInt(e.target.value) || 0 }))} />
          </FieldRow>
        </div>
      </CardContent>
    </Card>
  )
}

function Step6Approvals({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Approval Requirements</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border/60">
          <ToggleRow label="Template Publish" description="Templates require approval before publishing" defaultChecked={form.approvalRequiredForPublish} onChange={(v) => setForm(f => ({ ...f, approvalRequiredForPublish: v }))} />
          <ToggleRow label="Document Generation" description="Generated documents require approval before sending" defaultChecked={form.approvalRequiredForGeneration} onChange={(v) => setForm(f => ({ ...f, approvalRequiredForGeneration: v }))} />
          <ToggleRow label="Employee Request" description="Employee document requests require approval" defaultChecked={form.approvalRequiredForRequest} onChange={(v) => setForm(f => ({ ...f, approvalRequiredForRequest: v }))} />
          <ToggleRow label="HR Document Publish" description="HR documents require approval before publishing" defaultChecked={form.publishApprovalRequired} onChange={(v) => setForm(f => ({ ...f, publishApprovalRequired: v }))} />
        </CardContent>
      </Card>
      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm">E-Sign Rules</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow label="E-Sign Provider">
            <Select value={form.eSignProvider} onValueChange={(v) => setForm(f => ({ ...f, eSignProvider: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Adobe Sign">Adobe Sign</SelectItem>
                <SelectItem value="DocuSign">DocuSign</SelectItem>
                <SelectItem value="PandaDoc">PandaDoc</SelectItem>
                <SelectItem value="—">None</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Signatory">
            <Input value={form.signatory} onChange={(e) => setForm(f => ({ ...f, signatory: e.target.value }))} />
          </FieldRow>
          <FieldRow label="Signature Position">
            <Select defaultValue="bottom-right">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                <SelectItem value="bottom-center">Bottom Center</SelectItem>
                <SelectItem value="top-right">Top Right</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="E-Sign Enabled">
            <div className="flex items-center h-9">
              <Switch checked={form.eSignEnabled} onCheckedChange={(v) => setForm(f => ({ ...f, eSignEnabled: v }))} className="data-[state=checked]:bg-violet-600" />
            </div>
          </FieldRow>
        </CardContent>
      </Card>
    </div>
  )
}

function Step7Email({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  const events = [
    "Document Request Submitted", "Document Request Approved", "Document Request Rejected",
    "Document Generated", "Document Sent", "Document Expiry Reminder",
    "Acknowledgment Reminder", "Template Approval", "Document Shared",
  ]
  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Email Template Group</CardTitle></CardHeader>
        <CardContent>
          <FieldRow label="Email Template Group">
            <Input value={form.emailTemplateGroup} onChange={(e) => setForm(f => ({ ...f, emailTemplateGroup: e.target.value }))} />
          </FieldRow>
        </CardContent>
      </Card>
      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Email Events</CardTitle>
          <CardDescription className="text-xs">Toggle which document events trigger emails</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          {events.map((e, i) => <ToggleRow key={e} label={e} defaultChecked={i % 3 !== 2} />)}
        </CardContent>
      </Card>
      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Notification Channels</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border/60">
          <ToggleRow label="Email" defaultChecked />
          <ToggleRow label="In-App" defaultChecked />
          <ToggleRow label="SMS" />
          <ToggleRow label="WhatsApp" />
        </CardContent>
      </Card>
    </div>
  )
}

function Step8Storage({ form, setForm }: { form: WizardForm; setForm: React.Dispatch<React.SetStateAction<WizardForm>> }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Storage Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow label="Storage Location" hint="Cloud provider + region">
            <Input value={form.storageLocation} onChange={(e) => setForm(f => ({ ...f, storageLocation: e.target.value }))} />
          </FieldRow>
          <FieldRow label="Folder Structure" hint="Example: {Entity}/{Department}/{EmployeeCode}/{DocumentType}">
            <Input value={form.folderStructure} onChange={(e) => setForm(f => ({ ...f, folderStructure: e.target.value }))} className="font-mono text-xs" />
          </FieldRow>
          <FieldRow label="File Naming Rule" hint="Example: {EmployeeCode}_{DocumentType}_{YYYYMMDD}_v{Version}">
            <Input value={form.fileNamingRule} onChange={(e) => setForm(f => ({ ...f, fileNamingRule: e.target.value }))} className="font-mono text-xs" />
          </FieldRow>
          <FieldRow label="Retention Period">
            <Input value={form.retentionPeriod} onChange={(e) => setForm(f => ({ ...f, retentionPeriod: e.target.value }))} />
          </FieldRow>
        </CardContent>
      </Card>
      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Security Rules</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border/60">
          <ToggleRow label="Encryption Required" description="Encrypt documents at rest" defaultChecked={form.encryptionRequired} onChange={(v) => setForm(f => ({ ...f, encryptionRequired: v }))} />
          <ToggleRow label="Sensitive Document Masking" description="Mask Aadhaar/PAN/SSN numbers in previews" defaultChecked />
          <ToggleRow label="Download Permission" description="Allow document download" defaultChecked />
          <ToggleRow label="Print Permission" description="Allow document printing" defaultChecked />
          <ToggleRow label="Share Permission" description="Allow document sharing via email" defaultChecked />
        </CardContent>
      </Card>
    </div>
  )
}

function Step9Review({ form }: { form: WizardForm }) {
  const missing: string[] = []
  if (!form.entityId) missing.push("Entity not selected")
  if (!form.defaultHeader) missing.push("Default header template not set")
  if (!form.defaultFooter) missing.push("Default footer template not set")
  if (form.country === "India" && !form.mandatoryDocs.some(d => d.docType === "PAN Card")) missing.push("PAN Card not in mandatory docs (India requirement)")
  if (form.country === "UAE" && !form.mandatoryDocs.some(d => d.docType === "Passport")) missing.push("Passport not in mandatory docs (UAE requirement)")

  const conflicts: string[] = []
  if (form.useTenantDefault && !form.entityId) conflicts.push("Cannot use tenant default without selecting an entity")
  if (form.country === "UAE" && form.eSignProvider === "—") conflicts.push("UAE entities typically require e-sign provider")
  if (form.enableDocumentRequest && form.slaDays <= 0) conflicts.push("SLA days must be greater than 0 when document request is enabled")

  const summary: { step: string; fields: { label: string; value: string }[] }[] = [
    { step: "1. Basic", fields: [
      { label: "Entity", value: form.entityName || "—" },
      { label: "Country", value: form.country },
      { label: "Use Tenant Default", value: form.useTenantDefault ? "Yes" : "No" },
      { label: "Status", value: form.status },
    ]},
    { step: "2. Templates", fields: [
      { label: "Default Header", value: form.defaultHeader || "—" },
      { label: "Default Footer", value: form.defaultFooter || "—" },
      { label: "Default Offer Letter", value: form.defaultOfferLetter || "—" },
    ]},
    { step: "3. Employee Docs", fields: [
      { label: "Enabled", value: form.enableEmployeeDocs ? "Yes" : "No" },
      { label: "Mandatory Docs Count", value: String(form.mandatoryDocs.length) },
      { label: "Max File Size", value: form.maxFileSize },
    ]},
    { step: "4. HR Docs", fields: [
      { label: "Enabled", value: form.enableHRDocs ? "Yes" : "No" },
      { label: "Publish Approval", value: form.publishApprovalRequired ? "Required" : "Not Required" },
      { label: "Default Acknowledgment", value: form.defaultAcknowledgment ? "Yes" : "No" },
    ]},
    { step: "5. Requests", fields: [
      { label: "Enabled", value: form.enableDocumentRequest ? "Yes" : "No" },
      { label: "Approval Required", value: form.requestApprovalRequired ? "Yes" : "No" },
      { label: "SLA Days", value: String(form.slaDays) },
    ]},
    { step: "6. Approvals & E-Sign", fields: [
      { label: "E-Sign Enabled", value: form.eSignEnabled ? "Yes" : "No" },
      { label: "E-Sign Provider", value: form.eSignProvider },
      { label: "Signatory", value: form.signatory },
    ]},
    { step: "7. Email", fields: [
      { label: "Email Group", value: form.emailTemplateGroup },
    ]},
    { step: "8. Storage", fields: [
      { label: "Location", value: form.storageLocation },
      { label: "Encryption", value: form.encryptionRequired ? "Enabled" : "Disabled" },
      { label: "Retention", value: form.retentionPeriod },
    ]},
  ]

  return (
    <div className="space-y-4">
      {missing.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Missing Configuration ({missing.length})</p>
              <ul className="mt-1 space-y-0.5">{missing.map((m, i) => <li key={i} className="text-xs text-amber-700 dark:text-amber-300">• {m}</li>)}</ul>
            </div>
          </div>
        </div>
      )}
      {conflicts.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">Conflict Warnings ({conflicts.length})</p>
              <ul className="mt-1 space-y-0.5">{conflicts.map((c, i) => <li key={i} className="text-xs text-rose-700 dark:text-rose-300">• {c}</li>)}</ul>
            </div>
          </div>
        </div>
      )}
      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Configuration Summary</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={["1"]} className="w-full">
            {summary.map((s, i) => (
              <AccordionItem key={i} value={String(i + 1)}>
                <AccordionTrigger className="text-sm py-2 hover:no-underline">
                  <span className="font-medium text-violet-700 dark:text-violet-400">{s.step}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-2">
                    {s.fields.map((f, j) => (
                      <div key={j} className="rounded-lg bg-muted/40 p-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{f.label}</p>
                        <p className="text-xs font-medium text-foreground mt-0.5 truncate">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-500/30 dark:bg-violet-500/10">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Entity-wise Fallback Logic</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
            {["Employee-specific", "Dept + Type", "Grade", "Location", "Entity", "Tenant Default"].map((l, i, arr) => (
              <React.Fragment key={l}>
                <Badge variant="outline" className="border-violet-300 text-violet-700 dark:text-violet-400 bg-white dark:bg-slate-900">{l}</Badge>
                {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-violet-400" />}
              </React.Fragment>
            ))}
          </div>
          <p className="text-[11px] text-violet-600 dark:text-violet-400 mt-2">When an employee-specific config is not found, the system walks up this hierarchy to find the most specific applicable configuration.</p>
        </CardContent>
      </Card>
    </div>
  )
}

function EntityConfigWizard({
  open, onClose, editConfig,
}: {
  open: boolean
  onClose: () => void
  editConfig: EntityDocumentConfig | null
}) {
  const [step, setStep] = React.useState(1)
  const [completed, setCompleted] = React.useState<number[]>([])
  const [form, setForm] = React.useState<WizardForm>(() => editConfig ? { ...editConfig } : { ...ENTITY_DOCUMENT_CONFIGS[0] })

  React.useEffect(() => {
    if (open) {
      setStep(1)
      setCompleted([])
      setForm(editConfig ? { ...editConfig } : { ...ENTITY_DOCUMENT_CONFIGS[0] })
    }
  }, [open, editConfig])

  const useTD = form.useTenantDefault
  const canJumpTo = (s: number) => !(useTD && s >= 3 && s <= 8)

  const next = () => {
    if (step < 9) {
      setCompleted(c => Array.from(new Set([...c, step])))
      let nextStep = step + 1
      while (useTD && nextStep >= 3 && nextStep <= 8) nextStep++
      setStep(nextStep)
    }
  }
  const back = () => { if (step > 1) setStep(step - 1) }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border/60 flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="text-base">Entity Configuration Wizard</DialogTitle>
            <DialogDescription className="text-xs">
              {editConfig ? `Editing: ${editConfig.entityName}` : "Create new entity document configuration"}
            </DialogDescription>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </DialogHeader>

        <div className="px-6 py-3 border-b border-border/60">
          <StepIndicator current={step} completed={completed} useTenantDefault={useTD} onJump={(s) => canJumpTo(s) && setStep(s)} />
        </div>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4">
            {step === 1 && <Step1Basic form={form} setForm={setForm} />}
            {step === 2 && <Step2Templates form={form} setForm={setForm} />}
            {step === 3 && (useTD ? <TenantDefaultNotice /> : <Step3EmpDocs form={form} setForm={setForm} />)}
            {step === 4 && (useTD ? <TenantDefaultNotice /> : <Step4HRDocs form={form} setForm={setForm} />)}
            {step === 5 && (useTD ? <TenantDefaultNotice /> : <Step5Requests form={form} setForm={setForm} />)}
            {step === 6 && (useTD ? <TenantDefaultNotice /> : <Step6Approvals form={form} setForm={setForm} />)}
            {step === 7 && (useTD ? <TenantDefaultNotice /> : <Step7Email form={form} setForm={setForm} />)}
            {step === 8 && (useTD ? <TenantDefaultNotice /> : <Step8Storage form={form} setForm={setForm} />)}
            {step === 9 && <Step9Review form={form} />}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-3 border-t border-border/60 bg-muted/30 flex-row items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {useTD && step >= 3 && step <= 8 ? "Tenant default mode — steps 3-8 disabled" : `Step ${step} of 9`}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            {step > 1 && <Button variant="outline" size="sm" onClick={back}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>}
            {step < 9 && <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={next}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>}
            {step === 9 && (
              <>
                <Button variant="outline" size="sm" onClick={() => toast.success("Draft saved")}>Save Draft</Button>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => { toast.success("Configuration published successfully"); onClose() }}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Publish
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ViewConfigDialog({ config, open, onClose }: { config: EntityDocumentConfig | null; open: boolean; onClose: () => void }) {
  if (!config) return null
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-base">Configuration Preview — {config.entityName}</DialogTitle>
          <DialogDescription className="text-xs">Read-only view of entity document configuration (v{config.version})</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3 text-sm">
            {[
              { label: "Entity", value: config.entityName },
              { label: "Country", value: `${config.country} / ${config.state}` },
              { label: "Use Tenant Default", value: config.useTenantDefault ? "Yes" : "No" },
              { label: "Default Header", value: config.defaultHeader },
              { label: "Default Footer", value: config.defaultFooter },
              { label: "Default Offer Letter", value: config.defaultOfferLetter || "—" },
              { label: "Employee Docs Enabled", value: config.enableEmployeeDocs ? "Yes" : "No" },
              { label: "Mandatory Docs", value: config.mandatoryDocs.map(d => d.docType).join(", ") || "—" },
              { label: "Document Request", value: config.enableDocumentRequest ? `Enabled (SLA: ${config.slaDays}d)` : "Disabled" },
              { label: "E-Sign", value: config.eSignEnabled ? `${config.eSignProvider} — ${config.signatory}` : "Disabled" },
              { label: "Storage", value: config.storageLocation },
              { label: "Encryption", value: config.encryptionRequired ? "Enabled" : "Disabled" },
              { label: "Retention", value: config.retentionPeriod },
            ].map((row, i) => (
              <div key={i} className="flex justify-between gap-4 py-2 border-b border-border/40">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <span className="text-xs font-medium text-foreground text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function HistoryDialog({ config, open, onClose }: { config: EntityDocumentConfig | null; open: boolean; onClose: () => void }) {
  if (!config) return null
  const versions = Array.from({ length: config.version }, (_, i) => ({
    v: config.version - i,
    date: i === 0 ? config.effectiveFrom : new Date(new Date(config.effectiveFrom).getTime() - (i + 1) * 86400000 * 30).toISOString(),
    by: i === 0 ? "Current" : `Previous v${config.version - i}`,
    current: i === 0,
  }))
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Version History — {config.entityName}</DialogTitle>
          <DialogDescription className="text-xs">Track configuration changes over time</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-3">
            {versions.map((ver) => (
              <div key={ver.v} className={cn("rounded-lg border p-3", ver.current ? "border-violet-300 bg-violet-50/50 dark:bg-violet-500/10" : "border-border/60")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={ver.current ? "border-violet-400 text-violet-700" : ""}>v{ver.v}</Badge>
                    {ver.current && <Badge className="bg-violet-600 text-white text-[10px]">Current</Badge>}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{formatDate(ver.date)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{ver.by}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter><Button variant="outline" size="sm" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EntityConfigurationTab() {
  const [search, setSearch] = React.useState("")
  const [countryFilter, setCountryFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [tdFilter, setTdFilter] = React.useState("all")
  const [wizardOpen, setWizardOpen] = React.useState(false)
  const [wizardKey, setWizardKey] = React.useState(0)
  const [editConfig, setEditConfig] = React.useState<EntityDocumentConfig | null>(null)
  const [viewConfig, setViewConfig] = React.useState<EntityDocumentConfig | null>(null)
  const [historyConfig, setHistoryConfig] = React.useState<EntityDocumentConfig | null>(null)
  const [deleteConfig, setDeleteConfig] = React.useState<EntityDocumentConfig | null>(null)

  const filtered = ENTITY_DOCUMENT_CONFIGS.filter(c => {
    if (search && !c.entityName.toLowerCase().includes(search.toLowerCase())) return false
    if (countryFilter !== "all" && c.country !== countryFilter) return false
    if (statusFilter !== "all" && c.status !== statusFilter) return false
    if (tdFilter === "yes" && !c.useTenantDefault) return false
    if (tdFilter === "no" && c.useTenantDefault) return false
    return true
  })

  const stats = {
    total: ENTITY_DOCUMENT_CONFIGS.length,
    active: ENTITY_DOCUMENT_CONFIGS.filter(c => c.status === "Active").length,
    tenantDefault: ENTITY_DOCUMENT_CONFIGS.filter(c => c.useTenantDefault).length,
    override: ENTITY_DOCUMENT_CONFIGS.filter(c => !c.useTenantDefault).length,
    requestEnabled: ENTITY_DOCUMENT_CONFIGS.filter(c => c.enableDocumentRequest).length,
  }

  const openNewWizard = () => { setEditConfig(null); setWizardKey(k => k + 1); setWizardOpen(true) }
  const openEditWizard = (c: EntityDocumentConfig) => { setEditConfig(c); setWizardKey(k => k + 1); setWizardOpen(true) }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={cn("rounded-xl bg-gradient-to-br p-2.5 text-white shadow-sm", ACCENT)}>
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Entity Configuration</h3>
            <p className="text-xs text-muted-foreground">Configure document defaults, mandatory docs, approvals & storage per entity</p>
          </div>
        </div>
        <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={openNewWizard}>
          <Plus className="h-4 w-4 mr-1" /> Configure Entity
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Entities", value: stats.total, color: "from-violet-500 to-purple-600" },
          { label: "Active", value: stats.active, color: "from-emerald-500 to-teal-600" },
          { label: "Using Tenant Default", value: stats.tenantDefault, color: "from-amber-500 to-orange-600" },
          { label: "Override", value: stats.override, color: "from-sky-500 to-cyan-600" },
          { label: "Request Enabled", value: stats.requestEnabled, color: "from-fuchsia-500 to-pink-600" },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border/60 shadow-soft overflow-hidden">
              <CardContent className="p-3">
                <div className={cn("h-1 w-full rounded-full bg-gradient-to-r mb-2", s.color)} />
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-border/60">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search entity..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="India">India</SelectItem>
                <SelectItem value="UAE">UAE</SelectItem>
                <SelectItem value="USA">USA</SelectItem>
                <SelectItem value="Singapore">Singapore</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-32 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tdFilter} onValueChange={setTdFilter}>
              <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue placeholder="Tenant Default" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Using Tenant Default</SelectItem>
                <SelectItem value="no">Custom Override</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[560px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="border-border/60">
                  {["Entity", "Country", "Default Header", "Default Footer", "Template Group", "Approval Workflow", "Email Group", "Req", "E-Sign", "Tenant Default", "Status", "Effective", "Actions"].map(h => (
                    <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} className="border-border/40 hover:bg-violet-50/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7"><AvatarFallback className={cn("text-[10px] text-white", avatarColor(c.entityName))}>{initials(c.entityName)}</AvatarFallback></Avatar>
                        <div>
                          <p className="text-xs font-medium">{c.entityName}</p>
                          <p className="text-[10px] text-muted-foreground">{c.entityId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{c.country}</TableCell>
                    <TableCell className="text-xs">{c.defaultHeader}</TableCell>
                    <TableCell className="text-xs">{c.defaultFooter}</TableCell>
                    <TableCell className="text-xs">{c.defaultTemplateGroup}</TableCell>
                    <TableCell className="text-xs">{c.defaultApprovalWorkflow}</TableCell>
                    <TableCell className="text-xs">{c.defaultEmailTemplateGroup}</TableCell>
                    <TableCell>{c.documentRequestEnabled ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-rose-400" />}</TableCell>
                    <TableCell>{c.eSignEnabled ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-rose-400" />}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]", c.useTenantDefault ? "border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-500/10" : "border-violet-400 text-violet-700 bg-violet-50 dark:bg-violet-500/10")}>
                        {c.useTenantDefault ? "Yes" : "Override"}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge className={cn("text-[10px]", c.status === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-slate-100 text-slate-600")}>{c.status}</Badge></TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{formatDate(c.effectiveFrom)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setViewConfig(c)}><EyeIcon className="mr-2 h-3.5 w-3.5" /> View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditWizard(c)}><SlidersHorizontal className="mr-2 h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Cloned from tenant default")}><Copy className="mr-2 h-3.5 w-3.5" /> Clone From Tenant Default</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Cloned from another entity")}><Building2 className="mr-2 h-3.5 w-3.5" /> Clone From Entity</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Preview generated")}><Eye className="mr-2 h-3.5 w-3.5" /> Preview Configuration</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Validation: 0 errors, 0 warnings")}><CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Validate</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setHistoryConfig(c)}><History className="mr-2 h-3.5 w-3.5" /> View History</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => setDeleteConfig(c)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Wizard */}
      <div key={wizardKey}>
        <EntityConfigWizard open={wizardOpen} onClose={() => setWizardOpen(false)} editConfig={editConfig} />
      </div>

      {/* View Dialog */}
      <ViewConfigDialog config={viewConfig} open={!!viewConfig} onClose={() => setViewConfig(null)} />

      {/* History Dialog */}
      <HistoryDialog config={historyConfig} open={!!historyConfig} onClose={() => setHistoryConfig(null)} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfig} onOpenChange={(o) => !o && setDeleteConfig(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete Configuration?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will permanently delete the document configuration for <strong>{deleteConfig?.entityName}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={() => { toast.success("Configuration deleted"); setDeleteConfig(null) }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================================
//  TAB: Document Category Settings
// ============================================================================

function CategoryTab() {
  const cats = [
    ...EMPLOYEE_DOC_CATEGORIES.map(c => ({ ...c, appliesTo: "Employee" })),
    ...HR_DOC_CATEGORIES.map(c => ({ ...c, appliesTo: "HR" })),
    ...TEMPLATE_CATEGORIES.map(c => ({ value: c.value, label: c.label, color: "bg-indigo-100 text-indigo-700", appliesTo: "Template" })),
  ]
  return (
    <SettingsCard title="Document Categories" description="Manage categories for Employee, HR & Template documents" icon={Layers}
      actions={<Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => toast.success("Category created")}><Plus className="h-4 w-4 mr-1" /> Add Category</Button>}>
      <ScrollArea className="max-h-[560px]">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs">Code</TableHead>
              <TableHead className="text-xs">Applies To</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cats.map((c, i) => (
              <TableRow key={i} className="hover:bg-violet-50/30">
                <TableCell><Badge variant="outline" className={cn("text-[10px]", c.color)}>{c.label}</Badge></TableCell>
                <TableCell className="text-xs font-mono">{String(c.value).toUpperCase().replace(/\s+/g, "_").slice(0, 20)}</TableCell>
                <TableCell className="text-xs">{c.appliesTo}</TableCell>
                <TableCell><Badge className="bg-emerald-100 text-emerald-700 text-[10px] dark:bg-emerald-500/15 dark:text-emerald-400">Active</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast.info("Edit category")}><SlidersHorizontal className="mr-2 h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-rose-600" onClick={() => toast.success("Category deleted")}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </SettingsCard>
  )
}

// ============================================================================
//  TAB: Template Settings
// ============================================================================

function TemplateTab() {
  return (
    <SettingsCard title="Template Settings" description="Global rules for document templates" icon={FileSliders}>
      <div className="divide-y divide-border/60">
        <ToggleRow label="Allow Header / Body / Footer Sections" description="Templates can have separate header, body & footer sections" defaultChecked />
        <ToggleRow label="Allow Smart Values" description="Templates support {{slug}} smart value placeholders" defaultChecked />
        <ToggleRow label="Allow Rich Text Editor" description="WYSIWYG editor for template body" defaultChecked />
        <ToggleRow label="Allow Page Settings" description="Page size, orientation, margins configurable per template" defaultChecked />
        <ToggleRow label="Allow Preview" description="Live preview while editing templates" defaultChecked />
        <ToggleRow label="Allow PDF Generation" description="Templates can be generated as PDF" defaultChecked />
        <ToggleRow label="Allow Template Clone" description="Templates can be cloned to create new ones" defaultChecked />
        <ToggleRow label="Allow Template Versioning" description="Multiple versions of templates can be maintained" defaultChecked />
        <ToggleRow label="Allow Favourite Templates" description="Templates can be marked as favourite for quick access" defaultChecked />
        <ToggleRow label="Require Approval Before Publish" description="New templates require approval before publishing" defaultChecked />
      </div>
    </SettingsCard>
  )
}

// ============================================================================
//  TAB: Header / Footer Settings
// ============================================================================

function HeaderFooterTab() {
  const templates = [
    { name: "ACME India Header", type: "Header", entity: "ACME India Pvt Ltd", default: true },
    { name: "ACME India Footer", type: "Footer", entity: "ACME India Pvt Ltd", default: true },
    { name: "ACME UAE Header", type: "Header", entity: "ACME UAE FZE", default: true },
    { name: "ACME UAE Footer", type: "Footer", entity: "ACME UAE FZE", default: true },
    { name: "US Standard Header", type: "Header", entity: "ACME US Inc", default: true },
    { name: "Generic Footer", type: "Footer", entity: "All Entities", default: false },
  ]
  return (
    <SettingsCard title="Header / Footer Templates" description="Manage reusable header & footer templates per entity" icon={FileSliders}
      actions={<Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => toast.success("Template created")}><Plus className="h-4 w-4 mr-1" /> New Template</Button>}>
      <ScrollArea className="max-h-[480px]">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="text-xs">Template Name</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Entity</TableHead>
              <TableHead className="text-xs">Default</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t, i) => (
              <TableRow key={i} className="hover:bg-violet-50/30">
                <TableCell className="text-xs font-medium">{t.name}</TableCell>
                <TableCell><Badge variant="outline" className={cn("text-[10px]", t.type === "Header" ? "border-violet-300 text-violet-700" : "border-fuchsia-300 text-fuchsia-700")}>{t.type}</Badge></TableCell>
                <TableCell className="text-xs">{t.entity}</TableCell>
                <TableCell>{t.default ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : <Star className="h-3.5 w-3.5 text-slate-300" />}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toast.info("Edit template")}><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <Separator className="my-4" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FieldRow label="Logo Position"><Select defaultValue="top-left"><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="top-left">Top Left</SelectItem><SelectItem value="top-right">Top Right</SelectItem><SelectItem value="top-center">Top Center</SelectItem></SelectContent></Select></FieldRow>
        <FieldRow label="Address Position"><Select defaultValue="header-right"><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="header-right">Header Right</SelectItem><SelectItem value="header-left">Header Left</SelectItem><SelectItem value="footer-center">Footer Center</SelectItem></SelectContent></Select></FieldRow>
        <FieldRow label="Page Number Position"><Select defaultValue="footer-right"><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="footer-right">Footer Right</SelectItem><SelectItem value="footer-left">Footer Left</SelectItem><SelectItem value="footer-center">Footer Center</SelectItem></SelectContent></Select></FieldRow>
      </div>
    </SettingsCard>
  )
}

// ============================================================================
//  TAB: Smart Value Settings
// ============================================================================

function SmartValueTab() {
  const cats = ["Employee Details", "Candidate Details", "Job Details", "Manager / HR", "Salary Details", "Company Details", "Document Request", "Exit Details", "Date Values", "Custom Fields"]
  return (
    <SettingsCard title="Smart Value Settings" description="Enable which slug categories are available in the template editor" icon={Braces}>
      <div className="divide-y divide-border/60">
        {cats.map((c, i) => <ToggleRow key={c} label={c} description={`${["Employee", "Job", "Salary"][i % 3]}-related smart values`} defaultChecked={i % 4 !== 3} />)}
      </div>
    </SettingsCard>
  )
}

// ============================================================================
//  TAB: Document Request Settings
// ============================================================================

function RequestTab() {
  return (
    <div className="space-y-4">
      <SettingsCard title="Global Request Rules" description="Default rules for employee document requests" icon={Inbox}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToggleRow label="Enable Document Requests" description="Master switch for employee document requests" defaultChecked />
          <ToggleRow label="Auto Generate After Approval" description="Generate document immediately on approval" defaultChecked />
          <ToggleRow label="Allow Attachment" description="Employees can attach supporting documents" defaultChecked />
          <ToggleRow label="Allow Employee Download" description="Employees can download generated documents" defaultChecked />
        </div>
        <Separator className="my-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow label="Default SLA Days" hint="Turnaround time"><Input type="number" defaultValue={3} /></FieldRow>
          <FieldRow label="Default Approver"><Select defaultValue="HR Owner"><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{APPROVER_TYPES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></FieldRow>
          <FieldRow label="Max Attachments"><Input type="number" defaultValue={3} /></FieldRow>
          <FieldRow label="Auto-Cancel After (Days)"><Input type="number" defaultValue={30} /></FieldRow>
        </div>
      </SettingsCard>
    </div>
  )
}

// ============================================================================
//  TAB: Approval Settings
// ============================================================================

function ApprovalTab() {
  return (
    <SettingsCard title="Approval Settings" description="Configure approval requirements & escalation" icon={CheckCircle2}>
      <div className="divide-y divide-border/60 mb-4">
        <ToggleRow label="Approval Required for Template Publish" defaultChecked />
        <ToggleRow label="Approval Required for Document Generation" defaultChecked />
        <ToggleRow label="Approval Required for Employee Request" defaultChecked />
        <ToggleRow label="Approval Required for HR Document Publish" defaultChecked />
        <ToggleRow label="Parallel Approval Quorum" description="Allow parallel approvals with minimum quorum" />
      </div>
      <Separator className="my-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldRow label="Escalation After (Days)"><Input type="number" defaultValue={2} /></FieldRow>
        <FieldRow label="Escalate To"><Select defaultValue="HR Manager"><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="HR Manager">HR Manager</SelectItem><SelectItem value="Department Head">Department Head</SelectItem><SelectItem value="Entity Admin">Entity Admin</SelectItem></SelectContent></Select></FieldRow>
        <FieldRow label="Auto-Approve Threshold (₹)"><Input type="number" defaultValue={0} /></FieldRow>
        <FieldRow label="Rejection Feedback Required"><Select defaultValue="yes"><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Required</SelectItem><SelectItem value="no">Optional</SelectItem></SelectContent></Select></FieldRow>
      </div>
    </SettingsCard>
  )
}

// ============================================================================
//  TAB: E-Sign Settings
// ============================================================================

function ESignTab() {
  return (
    <SettingsCard title="E-Sign Settings" description="Digital signature integration configuration" icon={PenTool}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldRow label="E-Sign Provider"><Select defaultValue="Adobe Sign"><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Adobe Sign">Adobe Sign</SelectItem><SelectItem value="DocuSign">DocuSign</SelectItem><SelectItem value="PandaDoc">PandaDoc</SelectItem></SelectContent></Select></FieldRow>
        <FieldRow label="API Key"><Input type="password" defaultValue="••••••••••••" /></FieldRow>
        <FieldRow label="Default Signatory"><Input defaultValue="Anita Desai — HR Manager" /></FieldRow>
        <FieldRow label="Signature Position"><Select defaultValue="bottom-right"><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bottom-right">Bottom Right</SelectItem><SelectItem value="bottom-left">Bottom Left</SelectItem><SelectItem value="bottom-center">Bottom Center</SelectItem></SelectContent></Select></FieldRow>
      </div>
      <Separator className="my-4" />
      <div className="divide-y divide-border/60">
        <ToggleRow label="Auto-Sign Approved Documents" description="Automatically apply signature on approval" />
        <ToggleRow label="Require Employee Signature" description="Employees must also e-sign certain documents" defaultChecked />
        <ToggleRow label="Audit Trail" description="Capture detailed audit trail for every e-signature" defaultChecked />
      </div>
    </SettingsCard>
  )
}

// ============================================================================
//  TAB: Visibility Settings
// ============================================================================

function VisibilityTab() {
  const rules = [
    { doc: "Employee Documents", rule: "Owner + HR + Reporting Manager" },
    { doc: "HR Documents", rule: "All Employees (per visibility rule)" },
    { doc: "Document Library", rule: "HR + Document Admin" },
    { doc: "Generated Documents", rule: "Owner + HR + Generated By" },
    { doc: "Sensitive (Aadhaar/PAN/SSN)", rule: "Owner + HR Only" },
    { doc: "Compliance Documents", rule: "HR + Compliance Team" },
  ]
  return (
    <SettingsCard title="Visibility Settings" description="Default visibility rules per document type" icon={Eye}>
      <Table>
        <TableHeader>
          <TableRow><TableHead className="text-xs">Document Type</TableHead><TableHead className="text-xs">Default Visibility</TableHead><TableHead className="w-10" /></TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((r, i) => (
            <TableRow key={i} className="hover:bg-violet-50/30">
              <TableCell className="text-xs font-medium">{r.doc}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px] border-violet-300 text-violet-700 dark:text-violet-400">{r.rule}</Badge></TableCell>
              <TableCell><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toast.info("Edit rule")}><MoreHorizontal className="h-3.5 w-3.5" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SettingsCard>
  )
}

// ============================================================================
//  TAB: Email Settings
// ============================================================================

function EmailTab() {
  return (
    <SettingsCard title="Email Settings" description="Email template groups & delivery configuration" icon={Mail}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <FieldRow label="Email Template Group"><Select defaultValue="India Document Emails"><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="India Document Emails">India Document Emails</SelectItem><SelectItem value="UAE Document Emails">UAE Document Emails</SelectItem><SelectItem value="US Document Emails">US Document Emails</SelectItem></SelectContent></Select></FieldRow>
        <FieldRow label="Default Sender Name"><Input defaultValue="ACME HRMS" /></FieldRow>
        <FieldRow label="Default Sender Email"><Input defaultValue="hrms@acme.com" /></FieldRow>
        <FieldRow label="Reply-To Email"><Input defaultValue="noreply@acme.com" /></FieldRow>
      </div>
      <Separator className="my-4" />
      <div className="divide-y divide-border/60">
        <ToggleRow label="Retry Failed Emails" description="Retry failed email deliveries automatically" defaultChecked />
        <ToggleRow label="BCC Finance Team" description="BCC finance team on payment-related emails" />
        <ToggleRow label="Send Document Generated Email" defaultChecked />
        <ToggleRow label="Send Document Request Emails" defaultChecked />
        <ToggleRow label="Send Expiry Reminder Emails" defaultChecked />
        <ToggleRow label="Send Acknowledgment Reminder Emails" defaultChecked />
      </div>
      <Separator className="my-4" />
      <FieldRow label="Retry Count"><Input type="number" defaultValue={3} className="max-w-24" /></FieldRow>
    </SettingsCard>
  )
}

// ============================================================================
//  TAB: Storage Settings
// ============================================================================

function StorageTab() {
  return (
    <SettingsCard title="Storage Settings" description="Document storage, retention & archival configuration" icon={HardDrive}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <FieldRow label="Storage Provider"><Select defaultValue="AWS S3"><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AWS S3">AWS S3</SelectItem><SelectItem value="Azure Blob">Azure Blob Storage</SelectItem><SelectItem value="Google Cloud Storage">Google Cloud Storage</SelectItem><SelectItem value="Local">Local Filesystem</SelectItem></SelectContent></Select></FieldRow>
        <FieldRow label="Default Region"><Input defaultValue="ap-south-1 (Mumbai)" /></FieldRow>
        <FieldRow label="Folder Structure" hint="{Entity}/{Department}/{EmployeeCode}/{DocumentType}"><Input defaultValue="{Entity}/{Department}/{EmployeeCode}/{DocumentType}" className="font-mono text-xs" /></FieldRow>
        <FieldRow label="File Naming Rule" hint="{EmployeeCode}_{DocumentType}_{YYYYMMDD}_v{Version}"><Input defaultValue="{EmployeeCode}_{DocumentType}_{YYYYMMDD}_v{Version}" className="font-mono text-xs" /></FieldRow>
        <FieldRow label="Retention Period"><Input defaultValue="7 Years Post Exit" /></FieldRow>
        <FieldRow label="Archive After (Days)"><Input type="number" defaultValue={365} /></FieldRow>
        <FieldRow label="Delete After (Days)"><Input type="number" defaultValue={2555} /></FieldRow>
      </div>
      <Separator className="my-4" />
      <div className="divide-y divide-border/60">
        <ToggleRow label="Encryption at Rest" description="AES-256 encryption for stored documents" defaultChecked />
        <ToggleRow label="Encryption in Transit" description="TLS 1.2+ for document transfers" defaultChecked />
        <ToggleRow label="Auto-Archive" description="Automatically archive documents after archive threshold" defaultChecked />
        <ToggleRow label="Backup Enabled" description="Cross-region backup of documents" defaultChecked />
      </div>
    </SettingsCard>
  )
}

// ============================================================================
//  TAB: Versioning Settings
// ============================================================================

function VersioningTab() {
  return (
    <SettingsCard title="Versioning Settings" description="Document & template versioning policy" icon={GitBranch}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <FieldRow label="Max Versions Per Document"><Input type="number" defaultValue={10} /></FieldRow>
        <FieldRow label="Version Naming Rule"><Select defaultValue="semver"><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="semver">Semantic (v1.0, v1.1)</SelectItem><SelectItem value="incremental">Incremental (v1, v2, v3)</SelectItem><SelectItem value="date">Date-based (v20240115)</SelectItem></SelectContent></Select></FieldRow>
      </div>
      <Separator className="my-4" />
      <div className="divide-y divide-border/60">
        <ToggleRow label="Enable Versioning" description="Master switch for document versioning" defaultChecked />
        <ToggleRow label="Auto-Versioning" description="Bump version automatically on every edit" defaultChecked />
        <ToggleRow label="Keep Old Versions" description="Retain old versions when new one is uploaded" defaultChecked />
        <ToggleRow label="Require Version Comment" description="Editors must add a comment when creating new version" />
        <ToggleRow label="Allow Rollback" description="Allow rolling back to previous versions" defaultChecked />
      </div>
    </SettingsCard>
  )
}

// ============================================================================
//  TAB: Audit & Security
// ============================================================================

function AuditSecurityTab() {
  const accessMatrix = [
    { role: "HR Admin", emp: "Full", hr: "Full", lib: "Full", gen: "Full", req: "Full" },
    { role: "HR Manager", emp: "Full", hr: "Full", lib: "View", gen: "Full", req: "Full" },
    { role: "Document Admin", emp: "View", hr: "View", lib: "Full", gen: "Full", req: "View" },
    { role: "Reporting Manager", emp: "View", hr: "View", lib: "None", gen: "View", req: "None" },
    { role: "Employee", emp: "View (Own)", hr: "View", lib: "None", gen: "View (Own)", req: "View (Own)" },
  ]
  const accessColor = (a: string) => a === "Full" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : a === "View" || a.startsWith("View") ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
  return (
    <div className="space-y-4">
      <SettingsCard title="Audit Tracking" description="Track document activities for compliance" icon={ShieldCheck}>
        <div className="divide-y divide-border/60">
          <ToggleRow label="Track Template Changes" defaultChecked />
          <ToggleRow label="Track Document Upload" defaultChecked />
          <ToggleRow label="Track Document Download" defaultChecked />
          <ToggleRow label="Track Document Preview" defaultChecked />
          <ToggleRow label="Track Document Send" defaultChecked />
          <ToggleRow label="Track Document Delete" defaultChecked />
          <ToggleRow label="Track Version Changes" defaultChecked />
          <ToggleRow label="Track Approval Decisions" defaultChecked />
          <ToggleRow label="Track E-Sign Events" defaultChecked />
        </div>
      </SettingsCard>
      <SettingsCard title="Security Settings" description="Additional security controls" icon={Lock}>
        <div className="divide-y divide-border/60">
          <ToggleRow label="Two-Factor Authentication" description="Require 2FA for document admin actions" defaultChecked />
          <ToggleRow label="IP Whitelist" description="Restrict document access to whitelisted IPs" />
          <ToggleRow label="Session Timeout" description="Auto-logout after inactivity" defaultChecked />
          <ToggleRow label="Data Masking" description="Mask sensitive numbers (Aadhaar/PAN/SSN) in previews" defaultChecked />
          <ToggleRow label="Watermark on Preview" description="Apply user watermark on document previews" defaultChecked />
        </div>
      </SettingsCard>
      <SettingsCard title="Access Control Matrix" description="Role-based access to document modules" icon={Eye}>
        <ScrollArea className="max-h-[400px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Emp Docs</TableHead>
                <TableHead className="text-xs">HR Docs</TableHead>
                <TableHead className="text-xs">Library</TableHead>
                <TableHead className="text-xs">Generated</TableHead>
                <TableHead className="text-xs">Requests</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessMatrix.map((row, i) => (
                <TableRow key={i} className="hover:bg-violet-50/30">
                  <TableCell className="text-xs font-medium">{row.role}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px]", accessColor(row.emp))}>{row.emp}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px]", accessColor(row.hr))}>{row.hr}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px]", accessColor(row.lib))}>{row.lib}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px]", accessColor(row.gen))}>{row.gen}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px]", accessColor(row.req))}>{row.req}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </SettingsCard>
    </div>
  )
}

// ============================================================================
//  Main Section Component
// ============================================================================

export function DocumentsSettingsSection() {
  const [activeTab, setActiveTab] = React.useState("entity-configuration")

  const renderTab = () => {
    switch (activeTab) {
      case "general": return <GeneralTab />
      case "entity-configuration": return <EntityConfigurationTab />
      case "category": return <CategoryTab />
      case "template": return <TemplateTab />
      case "header-footer": return <HeaderFooterTab />
      case "smart-value": return <SmartValueTab />
      case "request": return <RequestTab />
      case "approval": return <ApprovalTab />
      case "esign": return <ESignTab />
      case "visibility": return <VisibilityTab />
      case "email": return <EmailTab />
      case "storage": return <StorageTab />
      case "versioning": return <VersioningTab />
      case "audit-security": return <AuditSecurityTab />
      default: return null
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left sidebar */}
      <aside className="lg:w-64 lg:flex-shrink-0">
        <div className="sticky top-2 rounded-xl border border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 p-2">
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Settings</p>
          <nav className="space-y-0.5">
            {TABS.map(t => {
              const active = activeTab === t.id
              const isFlagship = t.id === "entity-configuration"
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-all",
                    active
                      ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  )}
                >
                  <t.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left text-xs">{t.label}</span>
                  {isFlagship && !active && <Badge className="bg-violet-100 text-violet-700 text-[9px] dark:bg-violet-500/15 dark:text-violet-400">Flagship</Badge>}
                  {active && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default DocumentsSettingsSection
