'use client'

import * as React from "react"
import { toast } from "sonner"
import {
  GitMerge, Plus, Pencil, ShieldCheck, ShieldAlert, Check, X, Info,
  CalendarRange, Layers, AlertTriangle, Save, Sparkles,
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
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import { SectionCard, EmptyState } from "@/components/hrms/ui"
import { cn } from "@/lib/utils"
import {
  fetchJson, sendJson, useAsync, toNum, toBool,
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

interface ClubbingRow {
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
  clubbingAllowed: boolean
  clubbingConfig: ClubbingConfig | null
}

interface ClubbingConfig {
  allowedWith?: string[]
  restrictedWith?: string[]
  maxClubbedDays?: number
  maxConsecutiveClubbed?: number
  maxTypesPerApplication?: number
  deductionOrder?: string
  requireSpecialApproval?: boolean
  approvalLevel?: string
  coolOffDays?: number
  prefixSuffixOnly?: boolean
  allowWithLop?: boolean
  allowWithCompOff?: boolean
  allowWithUnpaid?: boolean
  notes?: string
}

const DEDUCTION_ORDERS = [
  { value: "PrimaryFirst", label: "Primary First", desc: "Deduct from the primary leave type until exhausted" },
  { value: "ProRata", label: "Pro-rata", desc: "Split deduction proportionally across all clubbed types" },
  { value: "HighestBalanceFirst", label: "Highest Balance First", desc: "Deduct from the type with the highest available balance" },
  { value: "LowestBalanceFirst", label: "Lowest Balance First", desc: "Deduct from the type with the lowest balance first" },
  { value: "EqualSplit", label: "Equal Split", desc: "Divide equally across all clubbed types" },
]

const APPROVAL_LEVELS = ["Manager", "HR", "Director"]

const DEFAULT_CONFIG: ClubbingConfig = {
  allowedWith: [],
  restrictedWith: [],
  maxClubbedDays: 0,
  maxConsecutiveClubbed: 0,
  maxTypesPerApplication: 3,
  deductionOrder: "PrimaryFirst",
  requireSpecialApproval: false,
  approvalLevel: "HR",
  coolOffDays: 0,
  prefixSuffixOnly: false,
  allowWithLop: true,
  allowWithCompOff: true,
  allowWithUnpaid: true,
  notes: "",
}

// ============================================================
// Main Section
// ============================================================

export function ClubbingRulesSection() {
  const [search, setSearch] = React.useState("")
  const [policyFilter, setPolicyFilter] = React.useState<string>("all")
  const [editItem, setEditItem] = React.useState<ClubbingRow | null>(null)

  const { data, loading, reload } = useAsync<ClubbingRow[]>(
    () => fetchJson("/api/leave-clubbing").catch(() => [] as ClubbingRow[]),
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

  // Stats
  const total = filtered.length
  const enabled = filtered.filter((r) => r.clubbingAllowed).length
  const restricted = filtered.filter((r) => {
    const cfg = r.clubbingConfig
    return cfg && ((cfg.restrictedWith?.length || 0) > 0)
  }).length
  const specialApproval = filtered.filter((r) => r.clubbingConfig?.requireSpecialApproval).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-emerald-500" />
            Clubbing Rules
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure which leave types can be combined in a single application, deduction order, limits and special approvals.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-emerald-200/60 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-50/60 to-transparent dark:from-emerald-500/5 p-3 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <b className="text-foreground">Leave clubbing</b> lets an employee apply for multiple leave types in one request (e.g. 2 days CL + 3 days EL). Rules here control whether clubbing is allowed, which combinations are permitted, how balances are deducted, and whether extra approvals are needed.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Layers} label="Total Leave Types" value={total} tint="slate" />
        <StatCard icon={ShieldCheck} label="Clubbing Enabled" value={enabled} tint="emerald" />
        <StatCard icon={ShieldAlert} label="With Restrictions" value={restricted} tint="amber" />
        <StatCard icon={AlertTriangle} label="Special Approval" value={specialApproval} tint="rose" />
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
          icon={GitMerge}
          title="No clubbing rules configured"
          description="Leave policy items will appear here. Edit any leave type within a policy to configure its clubbing rules."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => (
            <ClubbingRowCard
              key={row.itemId}
              row={row}
              leaveTypes={leaveTypes || []}
              onEdit={() => setEditItem(row)}
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editItem && (
        <ClubbingEditDialog
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
  tint: "emerald" | "amber" | "rose" | "slate"
}) {
  const tints: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
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

function ClubbingRowCard({ row, leaveTypes, onEdit }: {
  row: ClubbingRow
  leaveTypes: LeaveTypeOption[]
  onEdit: () => void
}) {
  const cfg = row.clubbingConfig || {}
  const allowedCount = cfg.allowedWith?.length || 0
  const restrictedCount = cfg.restrictedWith?.length || 0
  const isConfigured = row.clubbingAllowed && (allowedCount > 0 || restrictedCount > 0 || !!cfg.deductionOrder && cfg.deductionOrder !== "PrimaryFirst" || cfg.requireSpecialApproval)

  return (
    <Card className={cn(
      "border-border/60 transition-all hover:shadow-soft",
      !row.clubbingAllowed && "opacity-75",
    )}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Leave type chip */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center text-primary-foreground text-xs font-bold"
              style={{ backgroundColor: row.leaveTypeColor || "#10b981" }}
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
            {row.clubbingAllowed ? (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-0 gap-1">
                <Check className="h-3 w-3" /> Allowed
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-0 gap-1">
                <X className="h-3 w-3" /> Blocked
              </Badge>
            )}
          </div>

          {/* Config badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {allowedCount > 0 && (
              <Badge variant="secondary" className="text-[10px] bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400 border-0">
                {allowedCount} allowed
              </Badge>
            )}
            {restrictedCount > 0 && (
              <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-0">
                {restrictedCount} blocked
              </Badge>
            )}
            {cfg.requireSpecialApproval && (
              <Badge variant="secondary" className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-0">
                Special approval
              </Badge>
            )}
            {cfg.deductionOrder && cfg.deductionOrder !== "PrimaryFirst" && (
              <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300 border-0">
                {DEDUCTION_ORDERS.find((d) => d.value === cfg.deductionOrder)?.label || cfg.deductionOrder}
              </Badge>
            )}
            {row.clubbingAllowed && !isConfigured && (
              <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400 border-0 italic">
                Default rules
              </Badge>
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
// Edit Dialog — full clubbing configuration
// ============================================================

function ClubbingEditDialog({ row, leaveTypes, onClose, onSaved }: {
  row: ClubbingRow
  leaveTypes: LeaveTypeOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const [allowed, setAllowed] = React.useState<boolean>(row.clubbingAllowed)
  const [cfg, setCfg] = React.useState<ClubbingConfig>({ ...DEFAULT_CONFIG, ...(row.clubbingConfig || {}) })
  const [saving, setSaving] = React.useState(false)

  // Other leave types available for clubbing (exclude self)
  const otherLeaveTypes = leaveTypes.filter((lt) => lt.id !== row.leaveTypeId)

  function update<K extends keyof ClubbingConfig>(k: K, v: ClubbingConfig[K]) {
    setCfg((p) => ({ ...p, [k]: v }))
  }

  function toggleInList(list: "allowedWith" | "restrictedWith", id: string) {
    setCfg((p) => {
      const cur = new Set(p[list] || [])
      if (cur.has(id)) cur.delete(id)
      else cur.add(id)
      return { ...p, [list]: Array.from(cur) }
    })
  }

  async function save() {
    setSaving(true)
    try {
      await sendJson("/api/leave-clubbing", {
        itemId: row.itemId,
        clubbingAllowed: allowed,
        clubbingConfig: cfg,
      }, "PATCH")
      toast.success(`Clubbing rules saved for ${row.leaveTypeName}`)
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
            <GitMerge className="h-5 w-5 text-emerald-500" />
            Clubbing Rules — {row.leaveTypeName}
          </DialogTitle>
          <DialogDescription>
            Policy: {row.policyName} ({row.policyCode}). Configure how this leave type can be combined with others.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Master toggle */}
          <div className="rounded-lg border border-border/60 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Allow clubbing for this leave type</p>
              <p className="text-xs text-muted-foreground mt-0.5">When disabled, employees cannot combine this leave with any other type in a single application.</p>
            </div>
            <Switch checked={allowed} onCheckedChange={setAllowed} />
          </div>

          {!allowed && (
            <div className="rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/5 p-3 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Clubbing is blocked. This leave type must be applied for separately.
            </div>
          )}

          {allowed && (
            <>
              {/* Allowed with */}
              <SectionCard title="Allowed combinations" description="Select which leave types CAN be clubbed with this one. Leave empty to allow all (except restricted).">
                <LeaveTypeMultiSelect
                  options={otherLeaveTypes}
                  selected={cfg.allowedWith || []}
                  onToggle={(id) => toggleInList("allowedWith", id)}
                  emptyHint="No restrictions — all leave types allowed"
                  accent="emerald"
                />
              </SectionCard>

              {/* Restricted with */}
              <SectionCard title="Restricted combinations" description="Select leave types that can NEVER be clubbed with this one. Restrictions override the allowed list.">
                <LeaveTypeMultiSelect
                  options={otherLeaveTypes}
                  selected={cfg.restrictedWith || []}
                  onToggle={(id) => toggleInList("restrictedWith", id)}
                  emptyHint="No restrictions"
                  accent="rose"
                />
              </SectionCard>

              {/* Deduction order */}
              <SectionCard title="Balance deduction" description="When leaves are clubbed, decide how balance is deducted across the leave types.">
                <div className="space-y-2">
                  {DEDUCTION_ORDERS.map((d) => (
                    <label
                      key={d.value}
                      className={cn(
                        "flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors",
                        cfg.deductionOrder === d.value
                          ? "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-500/10"
                          : "border-border/60 hover:bg-muted/40",
                      )}
                    >
                      <input
                        type="radio"
                        name="deductionOrder"
                        checked={cfg.deductionOrder === d.value}
                        onChange={() => update("deductionOrder", d.value)}
                        className="mt-0.5 accent-emerald-600"
                      />
                      <div>
                        <p className="text-sm font-medium">{d.label}</p>
                        <p className="text-xs text-muted-foreground">{d.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </SectionCard>

              {/* Limits */}
              <SectionCard title="Limits & cool-off" description="Cap the total clubbed duration and enforce gaps.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <NumField
                    label="Max clubbed days"
                    hint="Total days across all clubbed leaves (0 = no limit)"
                    value={cfg.maxClubbedDays || 0}
                    onChange={(v) => update("maxClubbedDays", v)}
                  />
                  <NumField
                    label="Max consecutive clubbed days"
                    hint="Consecutive days across clubbed types (0 = no limit)"
                    value={cfg.maxConsecutiveClubbed || 0}
                    onChange={(v) => update("maxConsecutiveClubbed", v)}
                  />
                  <NumField
                    label="Max leave types per application"
                    hint="Different leave types allowed in one request"
                    value={cfg.maxTypesPerApplication || 0}
                    onChange={(v) => update("maxTypesPerApplication", v)}
                  />
                  <NumField
                    label="Cool-off days"
                    hint="Gap required before re-applying same type after clubbing"
                    value={cfg.coolOffDays || 0}
                    onChange={(v) => update("coolOffDays", v)}
                  />
                </div>
              </SectionCard>

              {/* Approval & toggles */}
              <SectionCard title="Approval & behaviour" description="Extra gates and edge-case rules for clubbed applications.">
                <div className="space-y-2.5">
                  <ToggleRow
                    label="Require special approval for clubbed leaves"
                    hint="Route clubbed applications through an extra approval step."
                    checked={!!cfg.requireSpecialApproval}
                    onChange={(v) => update("requireSpecialApproval", v)}
                  />
                  {cfg.requireSpecialApproval && (
                    <div className="pl-4 border-l-2 border-emerald-200 dark:border-emerald-500/30">
                      <Label className="text-xs">Approval level</Label>
                      <Select
                        value={cfg.approvalLevel || "HR"}
                        onValueChange={(v) => update("approvalLevel", v)}
                      >
                        <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {APPROVAL_LEVELS.map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Separator />
                  <ToggleRow
                    label="Allow only as prefix/suffix"
                    hint="Clubbing permitted only when this leave is adjacent to an existing approved leave."
                    checked={!!cfg.prefixSuffixOnly}
                    onChange={(v) => update("prefixSuffixOnly", v)}
                  />
                  <ToggleRow
                    label="Allow clubbing with Loss of Pay (LOP)"
                    hint="Let employees combine this paid leave with unpaid/LOP days."
                    checked={!!cfg.allowWithLop}
                    onChange={(v) => update("allowWithLop", v)}
                  />
                  <ToggleRow
                    label="Allow clubbing with Comp-Off"
                    hint="Combine with compensatory off credits."
                    checked={!!cfg.allowWithCompOff}
                    onChange={(v) => update("allowWithCompOff", v)}
                  />
                  <ToggleRow
                    label="Allow clubbing with other unpaid leaves"
                    hint="Combine with unpaid leave types (sabbatical, etc.)."
                    checked={!!cfg.allowWithUnpaid}
                    onChange={(v) => update("allowWithUnpaid", v)}
                  />
                </div>
              </SectionCard>

              {/* Notes */}
              <div>
                <Label className="text-xs">Notes / description</Label>
                <Textarea
                  className="mt-1 min-h-[60px] resize-y"
                  placeholder="Internal notes about this clubbing rule…"
                  value={cfg.notes || ""}
                  onChange={(e) => update("notes", e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            {saving ? <><Sparkles className="h-4 w-4 animate-pulse" /> Saving…</> : <><Save className="h-4 w-4" /> Save Rules</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Leave-type multi-select (chip grid)
// ============================================================

function LeaveTypeMultiSelect({ options, selected, onToggle, emptyHint, accent }: {
  options: LeaveTypeOption[]
  selected: string[]
  onToggle: (id: string) => void
  emptyHint: string
  accent: "emerald" | "rose"
}) {
  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground italic py-2">No other leave types available.</p>
  }
  const accentCls = accent === "emerald"
    ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
    : "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto [scrollbar-width:thin] p-1">
        {options.map((lt) => {
          const sel = selected.includes(lt.id)
          return (
            <button
              key={lt.id}
              type="button"
              onClick={() => onToggle(lt.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                sel
                  ? accentCls
                  : "border-border/60 bg-background hover:bg-muted/60 text-muted-foreground",
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: lt.color || "#10b981" }}
              />
              {lt.name}
              {sel && (accent === "emerald" ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />)}
            </button>
          )
        })}
      </div>
      {selected.length === 0 && (
        <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
          <Info className="h-3 w-3" /> {emptyHint}
        </p>
      )}
    </div>
  )
}

// ============================================================
// Small helpers
// ============================================================

function NumField({ label, hint, value, onChange }: {
  label: string
  hint?: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="h-9 mt-1"
      />
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  )
}

function ToggleRow({ label, hint, checked, onChange }: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
