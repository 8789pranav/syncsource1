'use client'

import * as React from "react"
import { toast } from "sonner"
import {
  Settings as SettingsIcon, Save, RotateCcw, Building2, Globe2, Trash2,
  ChevronDown, Check, AlertCircle, RefreshCw, Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SectionCard } from "@/components/hrms/ui"
import {
  fetchJson, sendJson, useAsync,
} from "../shared"

// ============================================================
// Types
// ============================================================

interface EntityLite {
  id: string
  code: string
  legalName: string
  tradeName?: string | null
  country?: string | null
  status?: string
}

interface LeaveSettings {
  // General
  defaultLeaveYearType: string
  defaultCalendarStartMonth: string
  defaultCountry: string
  allowBackdatedApplications: boolean
  requireReason: boolean
  requireAttachment: boolean
  // Application
  allowHalfDay: boolean
  allowHourly: boolean
  allowQuarterDay: boolean
  enforceAdvanceNotice: boolean
  advanceNoticeDays: number
  enforceSandwichRule: boolean
  allowClubbing: boolean
  // Approval
  autoApproveSingleDay: boolean
  requireCommentOnReject: boolean
  requireCommentOnApprove: boolean
  allowManagerApply: boolean
  allowHrApply: boolean
  allowDelegation: boolean
  notifyEmployeeOnDecision: boolean
  notifyManagerOnApply: boolean
}

interface SettingsResponse {
  scope: "default" | "entity"
  entityId: string
  entity: EntityLite | null
  isDefault: boolean
  settings: LeaveSettings
  defaultSettings: LeaveSettings
  overrideSettings: Partial<LeaveSettings> | null
  hasOverride: boolean
  updatedAt: string | null
  updatedBy: string | null
}

const DEFAULT_ENTITY_ID = "__default__"

const CANONICAL_DEFAULTS: LeaveSettings = {
  defaultLeaveYearType: "CalendarYear",
  defaultCalendarStartMonth: "1",
  defaultCountry: "India",
  allowBackdatedApplications: true,
  requireReason: true,
  requireAttachment: false,
  allowHalfDay: true,
  allowHourly: false,
  allowQuarterDay: false,
  enforceAdvanceNotice: false,
  advanceNoticeDays: 0,
  enforceSandwichRule: false,
  allowClubbing: true,
  autoApproveSingleDay: false,
  requireCommentOnReject: true,
  requireCommentOnApprove: false,
  allowManagerApply: false,
  allowHrApply: true,
  allowDelegation: true,
  notifyEmployeeOnDecision: true,
  notifyManagerOnApply: true,
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

// ============================================================
// Main Settings Section — per-entity (Default / pick entity)
// ============================================================

export function SettingsSection() {
  // Scope selector state
  const [scopeId, setScopeId] = React.useState<string>(DEFAULT_ENTITY_ID)
  const [savedScopeId, setSavedScopeId] = React.useState<string>(DEFAULT_ENTITY_ID)

  // Editable settings (working copy)
  const [s, setS] = React.useState<LeaveSettings>(CANONICAL_DEFAULTS)
  // Server snapshot (for dirty detection)
  const [serverSnapshot, setServerSnapshot] = React.useState<LeaveSettings>(CANONICAL_DEFAULTS)
  // Metadata
  const [meta, setMeta] = React.useState<Omit<SettingsResponse, "settings"> | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [resetOpen, setResetOpen] = React.useState(false)

  // Load entities for the dropdown
  const { data: entities, loading: entitiesLoading } = useAsync<EntityLite[]>(
    () => fetchJson("/api/entities").catch(() => [] as EntityLite[]),
    [],
  )

  // Load settings whenever scopeId changes. We use `data` directly (not a
  // refetch inside useEffect) to avoid re-render loops.
  const { data: settingsData, loading: settingsLoading, reload: reloadSettings } = useAsync<SettingsResponse>(
    () => fetchJson(`/api/leave-settings?entityId=${encodeURIComponent(scopeId)}`),
    [scopeId],
  )

  // Track the last scope we synced from, so we only overwrite local state
  // when the scope actually changes (not on every data refresh).
  const lastSyncedScope = React.useRef<string>("")

  React.useEffect(() => {
    if (!settingsData || settingsLoading) return
    if (lastSyncedScope.current === scopeId) return // already synced for this scope
    const merged = { ...CANONICAL_DEFAULTS, ...settingsData.settings }
    setS(merged)
    setServerSnapshot(merged)
    setMeta(settingsData)
    lastSyncedScope.current = scopeId
  }, [settingsData, settingsLoading, scopeId])

  const isDirty = React.useMemo(() => {
    return JSON.stringify(s) !== JSON.stringify(serverSnapshot)
  }, [s, serverSnapshot])

  function update<K extends keyof LeaveSettings>(k: K, v: LeaveSettings[K]) {
    setS((prev) => ({ ...prev, [k]: v }))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await sendJson<SettingsResponse>(
        `/api/leave-settings?entityId=${encodeURIComponent(scopeId)}`,
        { settings: s, updatedBy: "HR Admin" },
        "PUT",
      )
      // After saving, reload from server so we get the canonical merged view.
      await reloadSettings()
      // Force re-sync from the reloaded data.
      lastSyncedScope.current = ""
      toast.success(
        scopeId === DEFAULT_ENTITY_ID
          ? "Default settings saved"
          : `Settings saved for ${res.entity?.tradeName || res.entity?.legalName || res.entity?.code || "entity"}`,
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  function revertToDefault() {
    if (scopeId === DEFAULT_ENTITY_ID) {
      setS(CANONICAL_DEFAULTS)
      toast.info("Reverted to canonical defaults (not yet saved)")
    } else {
      setS({ ...CANONICAL_DEFAULTS, ...meta?.defaultSettings })
      toast.info("Reverted to inherited defaults (not yet saved)")
    }
  }

  async function deleteOverride() {
    if (scopeId === DEFAULT_ENTITY_ID) return
    setSaving(true)
    try {
      await sendJson(`/api/leave-settings?entityId=${encodeURIComponent(scopeId)}`, {}, "DELETE")
      toast.success("Entity override deleted — reverted to default")
      setResetOpen(false)
      // Switch to default view
      setScopeId(DEFAULT_ENTITY_ID)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete override")
    } finally {
      setSaving(false)
    }
  }

  const scopeLabel = scopeId === DEFAULT_ENTITY_ID
    ? "Default (Tenant-wide)"
    : (entities || []).find((e) => e.id === scopeId)?.tradeName
      || (entities || []).find((e) => e.id === scopeId)?.legalName
      || (entities || []).find((e) => e.id === scopeId)?.code
      || "Unknown entity"

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Leave Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure leave defaults and per-entity overrides. Pick "Default" for tenant-wide settings, or choose a specific entity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={revertToDefault} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Revert
          </Button>
          {scopeId !== DEFAULT_ENTITY_ID && meta?.hasOverride && (
            <Button size="sm" variant="outline" className="text-rose-600 hover:text-rose-700" onClick={() => setResetOpen(true)} disabled={saving}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete Override
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            onClick={save}
            disabled={saving || !isDirty}
          >
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Scope selector — the first thing the user interacts with */}
      <Card className="border-emerald-200/60 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-500/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Step 1 — Choose scope
              </Label>
              <p className="text-sm text-foreground mt-0.5 mb-2">
                First select whether these are the <b>default</b> settings (apply to all entities), or pick a specific entity to override.
              </p>
              <Select
                value={scopeId}
                onValueChange={(v) => {
                  if (isDirty) {
                    if (!confirm("You have unsaved changes in the current scope. Discard and switch?")) return
                  }
                  // Reset sync tracker so the new scope's data loads into state.
                  lastSyncedScope.current = ""
                  setScopeId(v)
                }}
              >
                <SelectTrigger className="h-10 w-full max-w-md">
                  <SelectValue placeholder="Select scope…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_ENTITY_ID}>
                    <div className="flex items-center gap-2">
                      <Globe2 className="h-4 w-4 text-emerald-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">Default (Tenant-wide)</span>
                        <span className="text-[10px] text-muted-foreground">Applies to all entities unless overridden</span>
                      </div>
                    </div>
                  </SelectItem>
                  {(entities || []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <div className="flex flex-col">
                          <span className="font-medium">{e.tradeName || e.legalName}</span>
                          <span className="text-[10px] text-muted-foreground">{e.code} · {e.country || "—"}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {entitiesLoading && <p className="text-xs text-muted-foreground mt-1">Loading entities…</p>}
            </div>
          </div>

          {/* Scope info badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-0">
              {scopeId === DEFAULT_ENTITY_ID ? <Globe2 className="h-3 w-3 mr-1" /> : <Building2 className="h-3 w-3 mr-1" />}
              {scopeLabel}
            </Badge>
            {meta?.hasOverride && scopeId !== DEFAULT_ENTITY_ID && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-0">
                <AlertCircle className="h-3 w-3 mr-1" /> Custom override active
              </Badge>
            )}
            {!meta?.hasOverride && scopeId !== DEFAULT_ENTITY_ID && (
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300 border-0">
                Inheriting from default
              </Badge>
            )}
            {isDirty && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-0 animate-pulse">
                Unsaved changes
              </Badge>
            )}
            {meta?.updatedAt && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                Last saved: {new Date(meta.updatedAt).toLocaleString()} {meta.updatedBy ? `by ${meta.updatedBy}` : ""}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings panels */}
      <SectionCard title="Step 2 — General" description="Default calendar and application defaults">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Default Leave Year Type</Label>
            <Select value={s.defaultLeaveYearType} onValueChange={(v) => update("defaultLeaveYearType", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CalendarYear">Calendar Year</SelectItem>
                <SelectItem value="FinancialYear">Financial Year</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
                <SelectItem value="JoiningDate">Joining Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Default Calendar Start Month</Label>
            <Select value={s.defaultCalendarStartMonth} onValueChange={(v) => update("defaultCalendarStartMonth", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Default Country</Label>
            <Input value={s.defaultCountry} onChange={(e) => update("defaultCountry", e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Advance Notice (days)</Label>
            <Input type="number" value={s.advanceNoticeDays} onChange={(e) => update("advanceNoticeDays", Number(e.target.value))} className="h-9" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <Toggle label="Allow backdated applications" checked={s.allowBackdatedApplications} onChange={(v) => update("allowBackdatedApplications", v)} />
          <Toggle label="Require reason" checked={s.requireReason} onChange={(v) => update("requireReason", v)} />
          <Toggle label="Require attachment" checked={s.requireAttachment} onChange={(v) => update("requireAttachment", v)} />
          <Toggle label="Enforce advance notice" checked={s.enforceAdvanceNotice} onChange={(v) => update("enforceAdvanceNotice", v)} />
        </div>
      </SectionCard>

      <SectionCard title="Step 3 — Application" description="What employees can do when applying for leave">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Toggle label="Allow half-day leave" checked={s.allowHalfDay} onChange={(v) => update("allowHalfDay", v)} />
          <Toggle label="Allow hourly leave" checked={s.allowHourly} onChange={(v) => update("allowHourly", v)} />
          <Toggle label="Allow quarter-day leave" checked={s.allowQuarterDay} onChange={(v) => update("allowQuarterDay", v)} />
          <Toggle label="Enforce sandwich rule" checked={s.enforceSandwichRule} onChange={(v) => update("enforceSandwichRule", v)} />
          <Toggle label="Allow clubbing of leave types" checked={s.allowClubbing} onChange={(v) => update("allowClubbing", v)} />
        </div>
      </SectionCard>

      <SectionCard title="Step 4 — Approval" description="Workflow and notification settings">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Toggle label="Auto-approve single-day leaves" checked={s.autoApproveSingleDay} onChange={(v) => update("autoApproveSingleDay", v)} />
          <Toggle label="Require comment on reject" checked={s.requireCommentOnReject} onChange={(v) => update("requireCommentOnReject", v)} />
          <Toggle label="Require comment on approve" checked={s.requireCommentOnApprove} onChange={(v) => update("requireCommentOnApprove", v)} />
          <Toggle label="Allow manager to apply on behalf" checked={s.allowManagerApply} onChange={(v) => update("allowManagerApply", v)} />
          <Toggle label="Allow HR to apply on behalf" checked={s.allowHrApply} onChange={(v) => update("allowHrApply", v)} />
          <Toggle label="Allow approval delegation" checked={s.allowDelegation} onChange={(v) => update("allowDelegation", v)} />
          <Toggle label="Notify employee on decision" checked={s.notifyEmployeeOnDecision} onChange={(v) => update("notifyEmployeeOnDecision", v)} />
          <Toggle label="Notify manager on application" checked={s.notifyManagerOnApply} onChange={(v) => update("notifyManagerOnApply", v)} />
        </div>
      </SectionCard>

      {/* Inheritance hint for entity scope */}
      {scopeId !== DEFAULT_ENTITY_ID && !meta?.hasOverride && (
        <div className="rounded-lg border border-dashed border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <p className="font-medium">This entity is inheriting default settings.</p>
          <p className="text-xs mt-0.5">Adjust any setting above and click <b>Save</b> to create a custom override for this entity. The default settings will remain unchanged.</p>
        </div>
      )}
      {scopeId !== DEFAULT_ENTITY_ID && meta?.hasOverride && (
        <div className="rounded-lg border border-dashed border-amber-300 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300">
          <p className="font-medium">This entity has a custom override.</p>
          <p className="text-xs mt-0.5">Only the settings you explicitly changed are stored as the override; the rest still inherit from default. Click <b>Delete Override</b> to revert entirely.</p>
        </div>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <SettingsIcon className="h-3 w-3" /> Settings are persisted in the database per entity. The default scope applies to all entities without an explicit override.
      </div>

      {/* Delete override confirm */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-500" /> Delete entity override?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the custom leave settings for <b>{scopeLabel}</b>. The entity will revert to inheriting the tenant-wide default settings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteOverride} disabled={saving} className="bg-rose-600 hover:bg-rose-700">
              {saving ? "Deleting…" : "Delete Override"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// Toggle helper
// ============================================================

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}
