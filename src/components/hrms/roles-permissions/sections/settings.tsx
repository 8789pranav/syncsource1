'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  Settings as SettingsIcon, Shield, Lock, Eye, GitBranch, Database, Key, Save, Bell,
} from "lucide-react"

import { PageHeader, StatCard, SectionCard } from "@/components/hrms/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { SENSITIVE_FIELDS } from "@/lib/permissions-constants"
import { EntityConfigSection } from "./entity-config"
import { apiFetch } from "@/lib/api-client"

interface Settings {
  allowCustomRoles: boolean; allowMultipleRolesPerUser: boolean; allowTemporaryRoles: boolean;
  allowRoleCloning: boolean; allowRoleVersioning: boolean; allowRoleApprovalBeforePublish: boolean;
  allowRoleExpiry: boolean; preventSelfPermissionEscalation: boolean; requireReasonForSensitive: boolean;
  defaultPermissionMode: string; conflictHandling: string;
  allowModuleLevelPermission: boolean; allowPageLevelPermission: boolean; allowActionLevelPermission: boolean;
  allowFieldLevelPermission: boolean; allowRecordLevelPermission: boolean;
  enableFieldMasking: boolean; enableSensitiveFieldRestriction: boolean; enableDocumentFolderPermission: boolean;
  requireMfaForAdmin: boolean; requireMfaForPayroll: boolean; requireMfaForDocumentAdmin: boolean;
  sessionTimeoutMinutes: number; loginIpRestriction: string | null; blockConcurrentLogin: boolean; autoRevokeInactiveDays: number;
}

const TABS = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "levels", label: "Permission Levels", icon: Shield },
  { id: "fields", label: "Field-Level", icon: Eye },
  { id: "security", label: "Security", icon: Lock },
  { id: "entity", label: "Entity Config", icon: Database },
] as const

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border/30 last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

export function SettingsSection() {
  const [settings, setSettings] = React.useState<Settings | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [tab, setTab] = React.useState<(typeof TABS)[number]["id"]>("general")

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiFetch(`/api/roles-permissions/settings`)
      if (r.ok) setSettings(await r.json())
    } finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const r = await apiFetch(`/api/roles-permissions/settings`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, performedByName: "HR Admin" }),
      })
      if (r.ok) { toast.success("Settings saved"); load() }
      else toast.error("Failed to save")
    } finally { setSaving(false) }
  }

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(s => s ? { ...s, [key]: value } : s)
  }

  if (loading || !settings) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roles & Permissions Settings"
        description="Configure how the access control system behaves across the entire tenant."
        icon={SettingsIcon}
        actions={<Button size="sm" className="gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:shadow-md hover:shadow-violet-500/25 hover:-translate-y-0.5 transition-all" onClick={save} disabled={saving}><Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}</Button>}
      />

      <div className="grid lg:grid-cols-[200px_1fr] gap-4">
        {/* Tabs sidebar */}
        <Card className="lg:sticky lg:top-20 h-fit transition-shadow hover:shadow-md">
          <CardContent className="p-2">
            {TABS.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 ${
                    tab === t.id ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-500/25" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              )
            })}
          </CardContent>
        </Card>

        {/* Tab content */}
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          {tab === "general" && (
            <SectionCard title="General Settings" description="Default permission mode, conflict resolution, and role policies">
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Default Permission Mode</Label>
                    <Select value={settings.defaultPermissionMode} onValueChange={(v) => update("defaultPermissionMode", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DenyByDefault">Deny by Default (recommended)</SelectItem>
                        <SelectItem value="AllowByDefault">Allow by Default</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">When a permission is not explicitly set, deny is safer.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Conflict Handling</Label>
                    <Select value={settings.conflictHandling} onValueChange={(v) => update("conflictHandling", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ExplicitDenyWins">Explicit Deny Wins (recommended)</SelectItem>
                        <SelectItem value="HigherPriorityWins">Higher Priority Role Wins</SelectItem>
                        <SelectItem value="AdminResolve">Admin Manual Resolve</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">How to handle conflicting permissions across roles.</p>
                  </div>
                </div>
                <Card className="bg-muted/30"><CardContent className="p-3 divide-y divide-border/30">
                  <ToggleRow label="Allow Custom Roles" desc="Admins can create new roles beyond system roles" checked={settings.allowCustomRoles} onChange={(v) => update("allowCustomRoles", v)} />
                  <ToggleRow label="Multiple Roles per User" desc="A user can hold more than one role at a time" checked={settings.allowMultipleRolesPerUser} onChange={(v) => update("allowMultipleRolesPerUser", v)} />
                  <ToggleRow label="Allow Temporary Roles" desc="Time-bound role assignments with effectiveTo date" checked={settings.allowTemporaryRoles} onChange={(v) => update("allowTemporaryRoles", v)} />
                  <ToggleRow label="Allow Role Cloning" desc="Admins can duplicate existing roles" checked={settings.allowRoleCloning} onChange={(v) => update("allowRoleCloning", v)} />
                  <ToggleRow label="Role Versioning" desc="Track versions when a role is updated" checked={settings.allowRoleVersioning} onChange={(v) => update("allowRoleVersioning", v)} />
                  <ToggleRow label="Approval Before Publish" desc="New roles require approval before going live" checked={settings.allowRoleApprovalBeforePublish} onChange={(v) => update("allowRoleApprovalBeforePublish", v)} />
                  <ToggleRow label="Role Expiry" desc="Roles can have effectiveFrom / effectiveTo" checked={settings.allowRoleExpiry} onChange={(v) => update("allowRoleExpiry", v)} />
                  <ToggleRow label="Prevent Self Permission Escalation" desc="Users cannot grant themselves higher permissions" checked={settings.preventSelfPermissionEscalation} onChange={(v) => update("preventSelfPermissionEscalation", v)} />
                  <ToggleRow label="Require Reason for Sensitive Permission" desc="Editing critical permissions requires a reason" checked={settings.requireReasonForSensitive} onChange={(v) => update("requireReasonForSensitive", v)} />
                </CardContent></Card>
              </div>
            </SectionCard>
          )}

          {tab === "levels" && (
            <SectionCard title="Permission Levels" description="Enable or disable each permission granularity layer">
              <Card className="bg-muted/30"><CardContent className="p-3 divide-y divide-border/30">
                <ToggleRow label="Module-Level Permission" desc="Grant access to entire modules (sidebar visibility)" checked={settings.allowModuleLevelPermission} onChange={(v) => update("allowModuleLevelPermission", v)} />
                <ToggleRow label="Page-Level Permission" desc="Fine-tune access to sub-pages within a module" checked={settings.allowPageLevelPermission} onChange={(v) => update("allowPageLevelPermission", v)} />
                <ToggleRow label="Action-Level Permission" desc="Control view/create/edit/delete/approve per action" checked={settings.allowActionLevelPermission} onChange={(v) => update("allowActionLevelPermission", v)} />
                <ToggleRow label="Field-Level Permission" desc="Restrict viewing/editing of sensitive fields" checked={settings.allowFieldLevelPermission} onChange={(v) => update("allowFieldLevelPermission", v)} />
                <ToggleRow label="Record-Level Permission" desc="Row-level access via data scopes" checked={settings.allowRecordLevelPermission} onChange={(v) => update("allowRecordLevelPermission", v)} />
              </CardContent></Card>
            </SectionCard>
          )}

          {tab === "fields" && (
            <SectionCard title="Field-Level Permissions" description="Masking and restriction rules for sensitive HR data">
              <Card className="bg-muted/30 mb-3"><CardContent className="p-3 divide-y divide-border/30">
                <ToggleRow label="Enable Field Masking" desc="Show partial values (e.g. XXXX-XXXX-1234) instead of hiding" checked={settings.enableFieldMasking} onChange={(v) => update("enableFieldMasking", v)} />
                <ToggleRow label="Enable Sensitive Field Restriction" desc="Force restrictions on salary, bank, statutory fields" checked={settings.enableSensitiveFieldRestriction} onChange={(v) => update("enableSensitiveFieldRestriction", v)} />
                <ToggleRow label="Document Folder Permission" desc="Restrict document folders by role" checked={settings.enableDocumentFolderPermission} onChange={(v) => update("enableDocumentFolderPermission", v)} />
              </CardContent></Card>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Sensitive Fields Catalog ({SENSITIVE_FIELDS.length})</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {SENSITIVE_FIELDS.map(f => (
                    <div key={f.field} className="rounded-lg border border-border/40 p-2 transition-all hover:border-violet-300/60 hover:bg-violet-50/30 dark:hover:bg-violet-500/5 hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">{f.label}</p>
                        <Badge variant="outline" className="text-[9px]">{f.riskLevel}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{f.field} · {f.module}</p>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}

          {tab === "security" && (
            <SectionCard title="Security Settings" description="MFA, session, IP restrictions and inactive-user handling">
              <Card className="bg-muted/30 mb-3"><CardContent className="p-3 divide-y divide-border/30">
                <ToggleRow label="Require MFA for Admin Roles" desc="Multi-factor auth required for Super Admin, HR Admin" checked={settings.requireMfaForAdmin} onChange={(v) => update("requireMfaForAdmin", v)} />
                <ToggleRow label="Require MFA for Payroll Roles" desc="MFA required for Payroll Admin and Finance Approver" checked={settings.requireMfaForPayroll} onChange={(v) => update("requireMfaForPayroll", v)} />
                <ToggleRow label="Require MFA for Document Admin" desc="MFA required for Document Admin role" checked={settings.requireMfaForDocumentAdmin} onChange={(v) => update("requireMfaForDocumentAdmin", v)} />
                <ToggleRow label="Block Concurrent Login" desc="Only one active session per user" checked={settings.blockConcurrentLogin} onChange={(v) => update("blockConcurrentLogin", v)} />
              </CardContent></Card>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Session Timeout (minutes)</Label>
                  <Input type="number" value={settings.sessionTimeoutMinutes} onChange={(e) => update("sessionTimeoutMinutes", parseInt(e.target.value) || 30)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Auto-Revoke Inactive (days)</Label>
                  <Input type="number" value={settings.autoRevokeInactiveDays} onChange={(e) => update("autoRevokeInactiveDays", parseInt(e.target.value) || 90)} />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <Label className="text-xs">Login IP Restriction (CIDR, comma-separated)</Label>
                <Input value={settings.loginIpRestriction || ""} onChange={(e) => update("loginIpRestriction", e.target.value)} placeholder="e.g. 192.168.1.0/24, 10.0.0.0/8" />
                <p className="text-[10px] text-muted-foreground">Leave empty to allow all IPs.</p>
              </div>
            </SectionCard>
          )}

          {tab === "entity" && (
            <EntityConfigSection />
          )}
        </motion.div>
      </div>
    </div>
  )
}
