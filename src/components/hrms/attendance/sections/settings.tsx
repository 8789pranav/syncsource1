'use client'

import * as React from "react"
import { toast } from "sonner"
import {
  Settings as SettingsIcon, Save, RotateCcw, Building2, Globe2, Trash2,
  AlertCircle, Layers,
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

interface AttendanceSettings {
  // Capture settings
  allowWebClockIn: boolean
  allowMobileClockIn: boolean
  allowBiometric: boolean
  allowFaceRecognition: boolean
  allowQRCode: boolean
  allowKiosk: boolean
  allowManualAttendance: boolean
  allowAPIAttendance: boolean
  requireSelfie: boolean
  requireGeoLocation: boolean
  requireGeoFence: boolean
  requireDeviceBinding: boolean
  requireWiFiRestriction: boolean
  requireIPRestriction: boolean
  allowMultiplePunches: boolean
  allowBreakPunches: boolean
  allowOfflinePunch: boolean
  autoSyncOfflinePunch: boolean
  // Geo-fencing
  enableGeoFencing: boolean
  geoFenceRadiusMeters: number
  allowOutsideGeoFenceWithApproval: boolean
  captureLatLong: boolean
  captureAddress: boolean
  // Late / Early
  enableLateComing: boolean
  lateGraceMinutes: number
  maxLateComingPerMonth: number
  deductHalfDayAfterLateMarks: number
  deductLeaveAfterLateMarks: number
  enableEarlyGoing: boolean
  earlyGoingGraceMinutes: number
  maxEarlyGoingPerMonth: number
  deductHalfDayAfterEarlyGoingMarks: number
  // Half-day / Full-day
  minHoursForFullDay: number
  minHoursForHalfDay: number
  lessThanHalfDayHoursIsAbsent: number
  includeBreakInWorkingHours: boolean
  useFirstInLastOut: boolean
  // Regularization
  allowRegularization: boolean
  maxRegularizationPerMonth: number
  maxBackdatedDays: number
  attachmentRequiredForReg: boolean
  reasonRequiredForReg: boolean
  regApprovalRequired: boolean
  allowManagerApplyOnBehalf: boolean
  allowHRApplyOnBehalf: boolean
  allowRegAfterAttendanceLock: boolean
  allowRegAfterPayrollLock: boolean
  // Overtime
  enableOvertime: boolean
  otMinHoursRequired: number
  otDailyLimit: number
  otMonthlyLimit: number
  otRoundOffMethod: string
  otApprovalRequired: boolean
  // Attendance lock
  enableAttendanceLock: boolean
  lockFrequency: string
  lockAfterDays: number
  allowUnlock: boolean
  unlockApprovalRequired: boolean
  // Payroll
  sendAttendanceToPayroll: boolean
  attendanceCutOffDate: number
  blockChangesAfterPayrollProcessed: boolean
}

interface SettingsResponse {
  scope: "default" | "entity"
  entityId: string
  entity: EntityLite | null
  isDefault: boolean
  settings: AttendanceSettings
  defaultSettings: AttendanceSettings
  hasOverride: boolean
  updatedAt: string | null
  updatedBy: string | null
}

const DEFAULT_ENTITY_ID = "__default__"

const CANONICAL_DEFAULTS: AttendanceSettings = {
  allowWebClockIn: true, allowMobileClockIn: true, allowBiometric: true,
  allowFaceRecognition: false, allowQRCode: false, allowKiosk: false,
  allowManualAttendance: true, allowAPIAttendance: false,
  requireSelfie: false, requireGeoLocation: false, requireGeoFence: false,
  requireDeviceBinding: false, requireWiFiRestriction: false, requireIPRestriction: false,
  allowMultiplePunches: true, allowBreakPunches: true, allowOfflinePunch: true, autoSyncOfflinePunch: true,
  enableGeoFencing: false, geoFenceRadiusMeters: 100, allowOutsideGeoFenceWithApproval: true,
  captureLatLong: true, captureAddress: false,
  enableLateComing: true, lateGraceMinutes: 15, maxLateComingPerMonth: 3,
  deductHalfDayAfterLateMarks: 3, deductLeaveAfterLateMarks: 5,
  enableEarlyGoing: true, earlyGoingGraceMinutes: 15, maxEarlyGoingPerMonth: 3,
  deductHalfDayAfterEarlyGoingMarks: 3,
  minHoursForFullDay: 8, minHoursForHalfDay: 4, lessThanHalfDayHoursIsAbsent: 2,
  includeBreakInWorkingHours: false, useFirstInLastOut: true,
  allowRegularization: true, maxRegularizationPerMonth: 4, maxBackdatedDays: 7,
  attachmentRequiredForReg: false, reasonRequiredForReg: true, regApprovalRequired: true,
  allowManagerApplyOnBehalf: true, allowHRApplyOnBehalf: true,
  allowRegAfterAttendanceLock: false, allowRegAfterPayrollLock: false,
  enableOvertime: false, otMinHoursRequired: 8, otDailyLimit: 4, otMonthlyLimit: 50,
  otRoundOffMethod: "NoRounding", otApprovalRequired: true,
  enableAttendanceLock: true, lockFrequency: "Monthly", lockAfterDays: 5,
  allowUnlock: false, unlockApprovalRequired: true,
  sendAttendanceToPayroll: true, attendanceCutOffDate: 25, blockChangesAfterPayrollProcessed: true,
}

// ============================================================
// Main section
// ============================================================

export function SettingsSection() {
  const [scopeId, setScopeId] = React.useState<string>(DEFAULT_ENTITY_ID)
  const [s, setS] = React.useState<AttendanceSettings>(CANONICAL_DEFAULTS)
  const [serverSnapshot, setServerSnapshot] = React.useState<AttendanceSettings>(CANONICAL_DEFAULTS)
  const [meta, setMeta] = React.useState<Omit<SettingsResponse, "settings"> | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [resetOpen, setResetOpen] = React.useState(false)

  const { data: entities, loading: entitiesLoading } = useAsync<EntityLite[]>(
    () => fetchJson("/api/entities").catch(() => [] as EntityLite[]),
    [],
  )

  const { data: settingsData, loading: settingsLoading, reload: reloadSettings } = useAsync<SettingsResponse>(
    () => fetchJson(`/api/attendance-settings?entityId=${encodeURIComponent(scopeId)}`),
    [scopeId],
  )

  const lastSyncedScope = React.useRef<string>("")

  React.useEffect(() => {
    if (!settingsData || settingsLoading) return
    if (lastSyncedScope.current === scopeId) return
    const merged = { ...CANONICAL_DEFAULTS, ...settingsData.settings }
    setS(merged)
    setServerSnapshot(merged)
    setMeta(settingsData)
    lastSyncedScope.current = scopeId
  }, [settingsData, settingsLoading, scopeId])

  const isDirty = React.useMemo(() => JSON.stringify(s) !== JSON.stringify(serverSnapshot), [s, serverSnapshot])

  function update<K extends keyof AttendanceSettings>(k: K, v: AttendanceSettings[K]) {
    setS((prev) => ({ ...prev, [k]: v }))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await sendJson<SettingsResponse>(
        `/api/attendance-settings?entityId=${encodeURIComponent(scopeId)}`,
        { settings: s, updatedBy: "HR Admin" },
        "PUT",
      )
      await reloadSettings()
      lastSyncedScope.current = ""
      toast.success(
        scopeId === DEFAULT_ENTITY_ID
          ? "Default attendance settings saved"
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
      await sendJson(`/api/attendance-settings?entityId=${encodeURIComponent(scopeId)}`, {}, "DELETE")
      toast.success("Entity override deleted — reverted to default")
      setResetOpen(false)
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
          <h2 className="text-lg font-semibold text-foreground">Attendance Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure capture, geo-fencing, late/early rules, regularization, overtime, lock &amp; payroll — at the tenant default or per-entity level.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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

      {/* Scope selector */}
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
                Select <b>Default</b> for tenant-wide settings, or pick a specific entity to override.
              </p>
              <Select
                value={scopeId}
                onValueChange={(v) => {
                  if (isDirty) {
                    if (!confirm("You have unsaved changes in the current scope. Discard and switch?")) return
                  }
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
              <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400 border-0 animate-pulse">
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

      {/* Step 2 — Capture Settings */}
      <SectionCard title="Step 2 — Capture Settings" description="Allowed punch sources and capture requirements">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Toggle label="Allow Web clock-in" checked={s.allowWebClockIn} onChange={(v) => update("allowWebClockIn", v)} />
          <Toggle label="Allow Mobile clock-in" checked={s.allowMobileClockIn} onChange={(v) => update("allowMobileClockIn", v)} />
          <Toggle label="Allow Biometric" checked={s.allowBiometric} onChange={(v) => update("allowBiometric", v)} />
          <Toggle label="Allow Face Recognition" checked={s.allowFaceRecognition} onChange={(v) => update("allowFaceRecognition", v)} />
          <Toggle label="Allow QR Code" checked={s.allowQRCode} onChange={(v) => update("allowQRCode", v)} />
          <Toggle label="Allow Kiosk" checked={s.allowKiosk} onChange={(v) => update("allowKiosk", v)} />
          <Toggle label="Allow Manual Entry" checked={s.allowManualAttendance} onChange={(v) => update("allowManualAttendance", v)} />
          <Toggle label="Allow API Attendance" checked={s.allowAPIAttendance} onChange={(v) => update("allowAPIAttendance", v)} />
          <Toggle label="Require Selfie" checked={s.requireSelfie} onChange={(v) => update("requireSelfie", v)} />
          <Toggle label="Require Geo-location" checked={s.requireGeoLocation} onChange={(v) => update("requireGeoLocation", v)} />
          <Toggle label="Require Geo-fence" checked={s.requireGeoFence} onChange={(v) => update("requireGeoFence", v)} />
          <Toggle label="Require Device Binding" checked={s.requireDeviceBinding} onChange={(v) => update("requireDeviceBinding", v)} />
          <Toggle label="Require WiFi Restriction" checked={s.requireWiFiRestriction} onChange={(v) => update("requireWiFiRestriction", v)} />
          <Toggle label="Require IP Restriction" checked={s.requireIPRestriction} onChange={(v) => update("requireIPRestriction", v)} />
          <Toggle label="Allow Multiple Punches" checked={s.allowMultiplePunches} onChange={(v) => update("allowMultiplePunches", v)} />
          <Toggle label="Allow Break Punches" checked={s.allowBreakPunches} onChange={(v) => update("allowBreakPunches", v)} />
          <Toggle label="Allow Offline Punch" checked={s.allowOfflinePunch} onChange={(v) => update("allowOfflinePunch", v)} />
          <Toggle label="Auto-sync Offline Punch" checked={s.autoSyncOfflinePunch} onChange={(v) => update("autoSyncOfflinePunch", v)} />
        </div>
      </SectionCard>

      {/* Step 3 — Geo-Fencing */}
      <SectionCard title="Step 3 — Geo-Fencing" description="Geo-fence radius and outside-fence policy">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Toggle label="Enable Geo-fencing" checked={s.enableGeoFencing} onChange={(v) => update("enableGeoFencing", v)} />
          <Toggle label="Allow outside geo-fence with approval" checked={s.allowOutsideGeoFenceWithApproval} onChange={(v) => update("allowOutsideGeoFenceWithApproval", v)} />
          <Toggle label="Capture Lat/Long" checked={s.captureLatLong} onChange={(v) => update("captureLatLong", v)} />
          <Toggle label="Capture Address" checked={s.captureAddress} onChange={(v) => update("captureAddress", v)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <Label className="text-xs">Geo-fence Radius (meters)</Label>
            <Input type="number" value={s.geoFenceRadiusMeters} onChange={(e) => update("geoFenceRadiusMeters", Number(e.target.value))} className="h-9" />
          </div>
        </div>
      </SectionCard>

      {/* Step 4 — Late / Early Rules */}
      <SectionCard title="Step 4 — Late / Early Rules" description="Grace minutes, monthly caps and deduction rules">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Toggle label="Enable Late-coming rules" checked={s.enableLateComing} onChange={(v) => update("enableLateComing", v)} />
          <Toggle label="Enable Early-going rules" checked={s.enableEarlyGoing} onChange={(v) => update("enableEarlyGoing", v)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumField label="Late Grace (min)" value={s.lateGraceMinutes} onChange={(v) => update("lateGraceMinutes", v)} />
          <NumField label="Max Late / Month" value={s.maxLateComingPerMonth} onChange={(v) => update("maxLateComingPerMonth", v)} />
          <NumField label="Half-day after (late marks)" value={s.deductHalfDayAfterLateMarks} onChange={(v) => update("deductHalfDayAfterLateMarks", v)} />
          <NumField label="Leave after (late marks)" value={s.deductLeaveAfterLateMarks} onChange={(v) => update("deductLeaveAfterLateMarks", v)} />
          <NumField label="Early Grace (min)" value={s.earlyGoingGraceMinutes} onChange={(v) => update("earlyGoingGraceMinutes", v)} />
          <NumField label="Max Early / Month" value={s.maxEarlyGoingPerMonth} onChange={(v) => update("maxEarlyGoingPerMonth", v)} />
          <NumField label="Half-day after (early marks)" value={s.deductHalfDayAfterEarlyGoingMarks} onChange={(v) => update("deductHalfDayAfterEarlyGoingMarks", v)} />
        </div>
      </SectionCard>

      {/* Step 5 — Half-day / Full-day */}
      <SectionCard title="Step 5 — Half-day / Full-day Calculation" description="Working-hours thresholds and break handling">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <NumField label="Min Hours for Full Day" value={s.minHoursForFullDay} onChange={(v) => update("minHoursForFullDay", v)} step="0.5" />
          <NumField label="Min Hours for Half Day" value={s.minHoursForHalfDay} onChange={(v) => update("minHoursForHalfDay", v)} step="0.5" />
          <NumField label="Absent if less than (hrs)" value={s.lessThanHalfDayHoursIsAbsent} onChange={(v) => update("lessThanHalfDayHoursIsAbsent", v)} step="0.5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <Toggle label="Include Break in Working Hours" checked={s.includeBreakInWorkingHours} onChange={(v) => update("includeBreakInWorkingHours", v)} />
          <Toggle label="Use First-In / Last-Out" checked={s.useFirstInLastOut} onChange={(v) => update("useFirstInLastOut", v)} />
        </div>
      </SectionCard>

      {/* Step 6 — Regularization Policy */}
      <SectionCard title="Step 6 — Regularization Policy" description="Allow employees to regularise missing/wrong punches">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Toggle label="Allow Regularization" checked={s.allowRegularization} onChange={(v) => update("allowRegularization", v)} />
          <Toggle label="Attachment Required" checked={s.attachmentRequiredForReg} onChange={(v) => update("attachmentRequiredForReg", v)} />
          <Toggle label="Reason Required" checked={s.reasonRequiredForReg} onChange={(v) => update("reasonRequiredForReg", v)} />
          <Toggle label="Approval Required" checked={s.regApprovalRequired} onChange={(v) => update("regApprovalRequired", v)} />
          <Toggle label="Allow Manager to apply on behalf" checked={s.allowManagerApplyOnBehalf} onChange={(v) => update("allowManagerApplyOnBehalf", v)} />
          <Toggle label="Allow HR to apply on behalf" checked={s.allowHRApplyOnBehalf} onChange={(v) => update("allowHRApplyOnBehalf", v)} />
          <Toggle label="Allow after Attendance Lock" checked={s.allowRegAfterAttendanceLock} onChange={(v) => update("allowRegAfterAttendanceLock", v)} />
          <Toggle label="Allow after Payroll Lock" checked={s.allowRegAfterPayrollLock} onChange={(v) => update("allowRegAfterPayrollLock", v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Max Regularizations / Month" value={s.maxRegularizationPerMonth} onChange={(v) => update("maxRegularizationPerMonth", v)} />
          <NumField label="Max Backdated Days" value={s.maxBackdatedDays} onChange={(v) => update("maxBackdatedDays", v)} />
        </div>
      </SectionCard>

      {/* Step 7 — Overtime Settings */}
      <SectionCard title="Step 7 — Overtime Settings" description="Eligibility, limits and approval flow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Toggle label="Enable Overtime" checked={s.enableOvertime} onChange={(v) => update("enableOvertime", v)} />
          <Toggle label="OT Approval Required" checked={s.otApprovalRequired} onChange={(v) => update("otApprovalRequired", v)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumField label="Min Hours Required" value={s.otMinHoursRequired} onChange={(v) => update("otMinHoursRequired", v)} step="0.5" />
          <NumField label="Daily Limit (hrs)" value={s.otDailyLimit} onChange={(v) => update("otDailyLimit", v)} step="0.5" />
          <NumField label="Monthly Limit (hrs)" value={s.otMonthlyLimit} onChange={(v) => update("otMonthlyLimit", v)} step="0.5" />
          <div>
            <Label className="text-xs">Round-off Method</Label>
            <Select value={s.otRoundOffMethod} onValueChange={(v) => update("otRoundOffMethod", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NoRounding">No Rounding</SelectItem>
                <SelectItem value="QuarterHour">Quarter Hour</SelectItem>
                <SelectItem value="HalfHour">Half Hour</SelectItem>
                <SelectItem value="FullHour">Full Hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* Step 8 — Attendance Lock */}
      <SectionCard title="Step 8 — Attendance Lock" description="Lock attendance after a period to prevent edits">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Toggle label="Enable Attendance Lock" checked={s.enableAttendanceLock} onChange={(v) => update("enableAttendanceLock", v)} />
          <Toggle label="Allow Unlock" checked={s.allowUnlock} onChange={(v) => update("allowUnlock", v)} />
          <Toggle label="Unlock Approval Required" checked={s.unlockApprovalRequired} onChange={(v) => update("unlockApprovalRequired", v)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Lock Frequency</Label>
            <Select value={s.lockFrequency} onValueChange={(v) => update("lockFrequency", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="PayrollCycle">Payroll Cycle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NumField label="Lock After (days)" value={s.lockAfterDays} onChange={(v) => update("lockAfterDays", v)} />
        </div>
      </SectionCard>

      {/* Step 9 — Payroll Integration */}
      <SectionCard title="Step 9 — Payroll Integration" description="Send attendance to payroll and block changes after processing">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Toggle label="Send Attendance to Payroll" checked={s.sendAttendanceToPayroll} onChange={(v) => update("sendAttendanceToPayroll", v)} />
          <Toggle label="Block changes after payroll processed" checked={s.blockChangesAfterPayrollProcessed} onChange={(v) => update("blockChangesAfterPayrollProcessed", v)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <NumField label="Attendance Cut-off Date" value={s.attendanceCutOffDate} onChange={(v) => update("attendanceCutOffDate", v)} />
        </div>
      </SectionCard>

      {/* Inheritance hints */}
      {scopeId !== DEFAULT_ENTITY_ID && !meta?.hasOverride && (
        <div className="rounded-lg border border-dashed border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <p className="font-medium">This entity is inheriting default settings.</p>
          <p className="text-xs mt-0.5">Adjust any setting above and click <b>Save</b> to create a custom override.</p>
        </div>
      )}
      {scopeId !== DEFAULT_ENTITY_ID && meta?.hasOverride && (
        <div className="rounded-lg border border-dashed border-amber-300 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300">
          <p className="font-medium">This entity has a custom override.</p>
          <p className="text-xs mt-0.5">Only changed settings are stored; the rest inherit from default. Click <b>Delete Override</b> to revert.</p>
        </div>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <SettingsIcon className="h-3 w-3" /> Settings persist per entity in the database. The default scope applies to all entities without an explicit override.
      </div>

      {/* Delete override confirm */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-500" /> Delete entity override?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the custom attendance settings for <b>{scopeLabel}</b>. The entity will revert to inheriting the tenant-wide defaults. This action cannot be undone.
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
// Helpers
// ============================================================

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

function NumField({
  label, value, onChange, step = "1",
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: string
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-9" />
    </div>
  )
}
