'use client'

import * as React from "react"
import { toast } from "sonner"
import {
  Sandwich, Pencil, Check, X, Info, Save, Sparkles, CalendarOff,
  CalendarDays, ShieldCheck, ShieldAlert, ArrowRightLeft, AlertTriangle, Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { SectionCard, EmptyState } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"
import {
  fetchJson, sendJson, useAsync,
} from "../shared"

// ============================================================
// Types
// ============================================================

interface LeaveTypeOption {
  id: string
  name: string
  code: string
  color: string
  category?: string
  isPaid?: boolean
}

interface SandwichRow {
  itemId: string
  policyId: string
  policyName: string
  policyCode: string
  policyStatus: string
  isDefaultPolicy: boolean
  leaveTypeId: string
  leaveTypeName: string
  leaveTypeCode: string
  leaveTypeColor: string
  leaveTypeCategory?: string
  leaveTypeIsPaid?: boolean
  displayName?: string | null
  isActive: boolean
  sandwichRule: boolean
  includeHolidays: boolean
  includeWeeklyOffs: boolean
  sandwichConfig: SandwichConfig | null
}

interface SandwichConfig {
  sandwichType?: string
  includeNationalHolidays?: boolean
  includeFestiveHolidays?: boolean
  includeRestrictedHolidays?: boolean
  includeOptionalHolidays?: boolean
  includeWeeklyOffs?: boolean
  prefixRule?: boolean
  suffixRule?: boolean
  bothPrefixSuffixRequired?: boolean
  eitherPrefixOrSuffix?: boolean
  maxSandwichPeriod?: number
  treatInterveningAs?: string
  excludeLeaveTypes?: string[]
  applyToHalfDay?: boolean
  countOnlyWorkingDayLeave?: boolean
  notes?: string
}

const SANDWICH_TYPES = [
  { value: "AnyCombination", label: "Any Combination", desc: "Trigger on any holiday/weekly-off boundary", icon: ArrowRightLeft },
  { value: "HolidayLeaveHoliday", label: "Holiday ↔ Leave ↔ Holiday", desc: "Both ends are holidays", icon: CalendarDays },
  { value: "WeeklyOffLeaveWeeklyOff", label: "Weekly Off ↔ Leave ↔ Weekly Off", desc: "Both ends are weekly offs", icon: CalendarOff },
  { value: "HolidayLeaveWeeklyOff", label: "Holiday ↔ Leave ↔ Weekly Off", desc: "Mixed: holiday + weekly off", icon: CalendarDays },
  { value: "WeeklyOffLeaveHoliday", label: "Weekly Off ↔ Leave ↔ Holiday", desc: "Mixed: weekly off + holiday", icon: CalendarOff },
]

const TREAT_AS = [
  { value: "SameLeaveType", label: "Same Leave Type", desc: "Counted as the same leave type (deducted from balance)" },
  { value: "PaidHoliday", label: "Paid Holiday", desc: "Counted as paid — no balance deduction" },
  { value: "LOP", label: "Loss of Pay", desc: "Counted as unpaid / LOP" },
  { value: "NotCounted", label: "Not Counted", desc: "Excluded from leave duration entirely" },
]

const DEFAULT_CONFIG: SandwichConfig = {
  sandwichType: "AnyCombination",
  includeNationalHolidays: true,
  includeFestiveHolidays: true,
  includeRestrictedHolidays: false,
  includeOptionalHolidays: false,
  includeWeeklyOffs: true,
  prefixRule: true,
  suffixRule: true,
  bothPrefixSuffixRequired: true,
  eitherPrefixOrSuffix: false,
  maxSandwichPeriod: 0,
  treatInterveningAs: "SameLeaveType",
  excludeLeaveTypes: [],
  applyToHalfDay: false,
  countOnlyWorkingDayLeave: false,
  notes: "",
}

// ============================================================
// Main Section
// ============================================================

export function SandwichRulesSection() {
  const [search, setSearch] = React.useState("")
  const [policyFilter, setPolicyFilter] = React.useState<string>("all")
  const [editItem, setEditItem] = React.useState<SandwichRow | null>(null)

  const { data, loading, reload } = useAsync<SandwichRow[]>(
    () => fetchJson("/api/leave-sandwich").catch(() => [] as SandwichRow[]),
    [],
  )

  const { data: leaveTypes } = useAsync<LeaveTypeOption[]>(
    () => fetchJson("/api/leave-types").catch(() => [] as LeaveTypeOption[]),
    [],
  )

  const policies = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>()
    ;(data || []).forEach((r) => {
      if (!map.has(r.policyId)) map.set(r.policyId, { id: r.policyId, name: r.policyName, code: r.policyCode })
    })
    return Array.from(map.values())
  }, [data])

  const filtered = (data || []).filter((r) => {
    if (policyFilter !== "all" && r.policyId !== policyFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.leaveTypeName.toLowerCase().includes(q) ||
      r.leaveTypeCode.toLowerCase().includes(q) ||
      r.policyName.toLowerCase().includes(q)
    )
  })

  const total = filtered.length
  const enabled = filtered.filter((r) => r.sandwichRule).length
  const includeHols = filtered.filter((r) => r.sandwichRule && r.includeHolidays).length
  const includeWO = filtered.filter((r) => r.sandwichRule && r.includeWeeklyOffs).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sandwich className="h-5 w-5 text-teal-500" />
            Sandwich Rules
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure when holidays and weekly-offs between two leave periods are counted as paid leave.
          </p>
        </div>
      </div>

      {/* Info banner with example */}
      <div className="rounded-lg border border-teal-200/60 dark:border-teal-500/20 bg-gradient-to-r from-teal-50/60 to-transparent dark:from-teal-500/5 p-3">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
            <p>
              <b className="text-foreground">Sandwich rule:</b> when an employee takes leave immediately <b>before and after</b> a holiday or weekly-off, the day(s) in between get &quot;sandwiched&quot; and may be counted as leave too.
            </p>
            <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px] bg-background/60 rounded-md p-1.5 border border-border/40">
              <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-0">Fri: Leave</Badge>
              <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300 border-0">Sat–Sun: Weekly Off</Badge>
              <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
              <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-0">Mon: Leave</Badge>
              <ArrowRightLeft className="h-3 w-3 text-emerald-500" />
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-0">4 days counted</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Layers} label="Total Leave Types" value={total} tint="slate" />
        <StatCard icon={ShieldCheck} label="Sandwich Active" value={enabled} tint="emerald" />
        <StatCard icon={CalendarDays} label="Include Holidays" value={includeHols} tint="amber" />
        <StatCard icon={CalendarOff} label="Include Weekly Offs" value={includeWO} tint="teal" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search leave type or policy…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 sm:max-w-xs"
        />
        <Select value={policyFilter} onValueChange={setPolicyFilter}>
          <SelectTrigger className="h-9 sm:w-64">
            <SelectValue placeholder="All policies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All policies</SelectItem>
            {policies.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Sandwich}
          title="No sandwich rules configured"
          description="Leave policy items will appear here. Edit any leave type within a policy to configure its sandwich rules."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => (
            <SandwichRowCard
              key={row.itemId}
              row={row}
              onEdit={() => setEditItem(row)}
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editItem && (
        <SandwichEditDialog
          row={editItem}
          leaveTypes={leaveTypes || []}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); reload() }}
        />
      )}
    </div>
  )
}

// ============================================================
// Stat card
// ============================================================

function StatCard({ icon: Icon, label, value, tint }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  tint: "emerald" | "amber" | "teal" | "slate"
}) {
  const tints: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    teal: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  }
  return (
    <Card className="border-border/60">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", tints[tint])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-semibold tabular-nums leading-none">{value}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1 truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Row card
// ============================================================

function SandwichRowCard({ row, onEdit }: {
  row: SandwichRow
  onEdit: () => void
}) {
  const cfg = row.sandwichConfig || {}
  const sandwichTypeLabel = SANDWICH_TYPES.find((t) => t.value === cfg.sandwichType)?.label || "Any Combination"
  const treatLabel = TREAT_AS.find((t) => t.value === cfg.treatInterveningAs)?.label || "Same Leave Type"

  return (
    <Card className={cn(
      "border-border/60 transition-all hover:shadow-soft",
      !row.sandwichRule && "opacity-75",
    )}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Leave type chip */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center text-primary-foreground text-xs font-bold"
              style={{ backgroundColor: row.leaveTypeColor || "#14b8a6" }}
            >
              {row.leaveTypeName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-medium text-sm truncate">{row.leaveTypeName}</p>
                <span className="text-[10px] font-mono text-muted-foreground">{row.leaveTypeCode}</span>
                {row.leaveTypeIsPaid === false && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-0">Unpaid</Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {row.policyName} {row.isDefaultPolicy && <span className="text-emerald-600 dark:text-emerald-400">· Default</span>}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5">
            {row.sandwichRule ? (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-0 gap-1">
                <Check className="h-3 w-3" /> Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400 border-0 gap-1">
                <X className="h-3 w-3" /> Off
              </Badge>
            )}
          </div>

          {/* Config badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {row.sandwichRule && (
              <>
                {row.includeHolidays && (
                  <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-0">
                    + Holidays
                  </Badge>
                )}
                {row.includeWeeklyOffs && (
                  <Badge variant="secondary" className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400 border-0">
                    + Weekly Offs
                  </Badge>
                )}
                {cfg.bothPrefixSuffixRequired && (
                  <Badge variant="secondary" className="text-[10px] bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400 border-0">
                    Both sides
                  </Badge>
                )}
                {cfg.treatInterveningAs && cfg.treatInterveningAs !== "SameLeaveType" && (
                  <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300 border-0">
                    {treatLabel}
                  </Badge>
                )}
                {(!cfg.sandwichType || cfg.sandwichType === "AnyCombination") && (
                  <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400 border-0 italic">
                    {sandwichTypeLabel}
                  </Badge>
                )}
              </>
            )}
          </div>

          <Button size="sm" variant="outline" className="h-8 gap-1.5 ml-auto shrink-0" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Edit Dialog — full sandwich configuration
// ============================================================

function SandwichEditDialog({ row, leaveTypes, onClose, onSaved }: {
  row: SandwichRow
  leaveTypes: LeaveTypeOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const [enabled, setEnabled] = React.useState<boolean>(row.sandwichRule)
  const [inclHolidays, setInclHolidays] = React.useState<boolean>(row.includeHolidays)
  const [inclWeeklyOffs, setInclWeeklyOffs] = React.useState<boolean>(row.includeWeeklyOffs)
  const [cfg, setCfg] = React.useState<SandwichConfig>({ ...DEFAULT_CONFIG, ...(row.sandwichConfig || {}) })
  const [saving, setSaving] = React.useState(false)

  const otherLeaveTypes = leaveTypes.filter((lt) => lt.id !== row.leaveTypeId)

  function update<K extends keyof SandwichConfig>(k: K, v: SandwichConfig[K]) {
    setCfg((p) => ({ ...p, [k]: v }))
  }

  function toggleExclude(id: string) {
    setCfg((p) => {
      const cur = new Set(p.excludeLeaveTypes || [])
      if (cur.has(id)) cur.delete(id)
      else cur.add(id)
      return { ...p, excludeLeaveTypes: Array.from(cur) }
    })
  }

  // Sync the boolean fields with the config (keep includeHolidays/WeeklyOffs in sync)
  React.useEffect(() => {
    setInclHolidays(!!cfg.includeNationalHolidays || !!cfg.includeFestiveHolidays || !!cfg.includeRestrictedHolidays || !!cfg.includeOptionalHolidays)
  }, [cfg.includeNationalHolidays, cfg.includeFestiveHolidays, cfg.includeRestrictedHolidays, cfg.includeOptionalHolidays])
  React.useEffect(() => {
    setInclWeeklyOffs(!!cfg.includeWeeklyOffs)
  }, [cfg.includeWeeklyOffs])

  async function save() {
    setSaving(true)
    try {
      await sendJson("/api/leave-sandwich", {
        itemId: row.itemId,
        sandwichRule: enabled,
        includeHolidays: inclHolidays,
        includeWeeklyOffs: inclWeeklyOffs,
        sandwichConfig: cfg,
      }, "PATCH")
      toast.success(`Sandwich rules saved for ${row.leaveTypeName}`)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sandwich className="h-5 w-5 text-teal-500" />
            Sandwich Rules — {row.leaveTypeName}
          </DialogTitle>
          <DialogDescription>
            Policy: {row.policyName} ({row.policyCode}). Configure how holidays and weekly-offs between leave periods are treated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Master toggle */}
          <div className="rounded-lg border border-border/60 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Enable sandwich rule for this leave type</p>
              <p className="text-xs text-muted-foreground mt-0.5">When enabled, holidays/weekly-offs sandwiched between two leave periods may be counted as leave.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {!enabled && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-500/30 bg-slate-50/50 dark:bg-slate-500/5 p-3 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Sandwich rule is disabled. Sandwiched days will not be counted as leave.
            </div>
          )}

          {enabled && (
            <>
              {/* Sandwich type */}
              <SectionCard title="Trigger condition" description="Choose which boundary combinations trigger the sandwich rule.">
                <div className="space-y-2">
                  {SANDWICH_TYPES.map((t) => {
                    const Icon = t.icon
                    return (
                      <label
                        key={t.value}
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors",
                          cfg.sandwichType === t.value
                            ? "border-teal-400 bg-teal-50/60 dark:bg-teal-500/10"
                            : "border-border/60 hover:bg-muted/40",
                        )}
                      >
                        <input
                          type="radio"
                          name="sandwichType"
                          checked={cfg.sandwichType === t.value}
                          onChange={() => update("sandwichType", t.value)}
                          className="mt-0.5 accent-teal-600"
                        />
                        <Icon className="h-4 w-4 mt-0.5 text-teal-500 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.desc}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </SectionCard>

              {/* What to include */}
              <SectionCard title="Days to include in sandwich" description="Select which categories of non-working days get counted as leave when sandwiched.">
                <div className="space-y-2">
                  <ToggleRow
                    label="National / Gazetted holidays"
                    hint="Mandatory public holidays (e.g. Independence Day)"
                    checked={!!cfg.includeNationalHolidays}
                    onChange={(v) => update("includeNationalHolidays", v)}
                    tint="amber"
                  />
                  <ToggleRow
                    label="Festive / Regional holidays"
                    hint="Regional and festival holidays (e.g. Diwali, Pongal)"
                    checked={!!cfg.includeFestiveHolidays}
                    onChange={(v) => update("includeFestiveHolidays", v)}
                    tint="amber"
                  />
                  <ToggleRow
                    label="Restricted holidays"
                    hint="Optional restricted holidays from the restricted list"
                    checked={!!cfg.includeRestrictedHolidays}
                    onChange={(v) => update("includeRestrictedHolidays", v)}
                    tint="amber"
                  />
                  <ToggleRow
                    label="Optional holidays"
                    hint="Company-declared optional holidays"
                    checked={!!cfg.includeOptionalHolidays}
                    onChange={(v) => update("includeOptionalHolidays", v)}
                    tint="amber"
                  />
                  <Separator />
                  <ToggleRow
                    label="Weekly offs"
                    hint="Weekend / rest days (Saturday, Sunday, etc.)"
                    checked={!!cfg.includeWeeklyOffs}
                    onChange={(v) => update("includeWeeklyOffs", v)}
                    tint="teal"
                  />
                </div>
              </SectionCard>

              {/* Prefix / Suffix */}
              <SectionCard title="Prefix / Suffix rule" description="A prefix is leave BEFORE the non-working day; a suffix is leave AFTER. The classic sandwich needs both.">
                <div className="space-y-2">
                  <ToggleRow
                    label="Prefix rule — leave before non-working day counts"
                    checked={!!cfg.prefixRule}
                    onChange={(v) => update("prefixRule", v)}
                  />
                  <ToggleRow
                    label="Suffix rule — leave after non-working day counts"
                    checked={!!cfg.suffixRule}
                    onChange={(v) => update("suffixRule", v)}
                  />
                  <Separator />
                  <ToggleRow
                    label="Require BOTH prefix and suffix (classic sandwich)"
                    hint="Only trigger when leave exists on both sides of the non-working day."
                    checked={!!cfg.bothPrefixSuffixRequired}
                    onChange={(v) => update("bothPrefixSuffixRequired", v)}
                    tint="cyan"
                  />
                  <ToggleRow
                    label="Either prefix OR suffix is enough"
                    hint="Trigger even if leave is only on one side."
                    checked={!!cfg.eitherPrefixOrSuffix}
                    onChange={(v) => update("eitherPrefixOrSuffix", v)}
                    tint="cyan"
                  />
                </div>
              </SectionCard>

              {/* Treatment & limits */}
              <SectionCard title="Treatment & limits" description="How sandwiched days are charged and capped.">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Treat intervening days as</Label>
                    <Select
                      value={cfg.treatInterveningAs || "SameLeaveType"}
                      onValueChange={(v) => update("treatInterveningAs", v)}
                    >
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TREAT_AS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            <div className="flex flex-col">
                              <span>{t.label}</span>
                              <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Max sandwich period (days)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={cfg.maxSandwichPeriod || 0}
                      onChange={(e) => update("maxSandwichPeriod", Math.max(0, Number(e.target.value)))}
                      className="h-9 mt-1"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Maximum consecutive sandwiched days (0 = unlimited).</p>
                  </div>
                </div>
              </SectionCard>

              {/* Edge cases */}
              <SectionCard title="Edge cases" description="Fine-tune behaviour for half-days and working-day-only triggers.">
                <div className="space-y-2">
                  <ToggleRow
                    label="Apply when prefix/suffix is a half-day"
                    hint="Trigger sandwich rule even if the leave on either side is only a half-day."
                    checked={!!cfg.applyToHalfDay}
                    onChange={(v) => update("applyToHalfDay", v)}
                  />
                  <ToggleRow
                    label="Trigger only when actual leave falls on working days"
                    hint="Ignore sandwich if the boundary leave is itself on a holiday/weekly-off."
                    checked={!!cfg.countOnlyWorkingDayLeave}
                    onChange={(v) => update("countOnlyWorkingDayLeave", v)}
                  />
                </div>
              </SectionCard>

              {/* Excluded leave types */}
              <SectionCard title="Exclude leave types" description="These leave types will not be considered as prefix/suffix for the sandwich rule (i.e. if the boundary leave is one of these, sandwich won't trigger).">
                <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto [scrollbar-width:thin] p-1">
                  {otherLeaveTypes.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No other leave types available.</p>
                  )}
                  {otherLeaveTypes.map((lt) => {
                    const sel = (cfg.excludeLeaveTypes || []).includes(lt.id)
                    return (
                      <button
                        key={lt.id}
                        type="button"
                        onClick={() => toggleExclude(lt.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                          sel
                            ? "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                            : "border-border/60 bg-background hover:bg-muted/60 text-muted-foreground",
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: lt.color || "#14b8a6" }}
                        />
                        {lt.name}
                        {sel && <X className="h-3 w-3" />}
                      </button>
                    )
                  })}
                </div>
              </SectionCard>

              {/* Notes */}
              <div>
                <Label className="text-xs">Notes / description</Label>
                <Textarea
                  className="mt-1 min-h-[60px] resize-y"
                  placeholder="Internal notes about this sandwich rule…"
                  value={cfg.notes || ""}
                  onChange={(e) => update("notes", e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gap-1.5 bg-teal-600 hover:bg-teal-700">
            {saving ? <><Sparkles className="h-4 w-4 animate-pulse" /> Saving…</> : <><Save className="h-4 w-4" /> Save Rules</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Small helpers
// ============================================================

function ToggleRow({ label, hint, checked, onChange, tint }: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  tint?: "amber" | "teal" | "cyan"
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium flex items-center gap-1.5">
          {tint && (
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              tint === "amber" && "bg-amber-500",
              tint === "teal" && "bg-teal-500",
              tint === "cyan" && "bg-cyan-500",
            )} />
          )}
          {label}
        </p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
