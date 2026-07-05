'use client'

// ============================================================
// MyPermissionsDialog — quick-view modal showing the current
// viewer's effective permissions: roles, allowed/denied modules,
// field restrictions, and data scopes.
// ------------------------------------------------------------
// Accessible from the Topbar user menu ("My Permissions").
// Especially useful in View-As mode to verify what the
// previewed role can/can't do.
// ============================================================

import * as React from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Shield, ShieldCheck, ShieldAlert, Lock, Eye, EyeOff, CheckCircle2,
  XCircle, Layers, Users, MapPin, Building2, AlertCircle, Sparkles,
} from "lucide-react"
import { usePermissions } from "@/lib/use-permissions"
import { useHrmsStore } from "@/store/hrms-store"
import {
  MODULES, MODULE_MAP, ROLE_TYPE_MAP, RISK_LEVEL_MAP,
  ACCESS_LEVEL_MAP, FIELD_ACCESS_MAP, SENSITIVE_FIELDS,
} from "@/lib/permissions-constants"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MyPermissionsDialog({ open, onOpenChange }: Props) {
  const perm = usePermissions()
  const { isViewAs, conflicts } = useHrmsStore()

  // Build allowed/denied module lists (React Compiler auto-memoizes)
  const allowedModules = perm.allowedModules
    ? MODULES.filter(m => perm.allowedModules!.includes(m.id as any))
    : []

  const deniedModules = perm.allowedModules
    ? MODULES.filter(m => !perm.allowedModules!.includes(m.id as any) && m.id !== "dashboard")
    : []

  // Build field restriction list (only modules/fields that have non-default access)
  const fieldRestrictions = SENSITIVE_FIELDS
    .filter(sf => {
      const access = perm.fieldAccess?.[sf.module]?.[sf.field] || "View"
      return access === "Hidden" || access === "Masked" || access === "ViewOnlyOwn"
    })
    .map(sf => ({
      module: sf.module,
      field: sf.field,
      access: perm.fieldAccess?.[sf.module]?.[sf.field] || "View",
      label: sf.label,
    }))

  const rt = ROLE_TYPE_MAP[perm.roleType || ""] || null
  const rl = RISK_LEVEL_MAP[perm.riskLevel || ""] || null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-br from-violet-50/50 to-fuchsia-50/30 dark:from-violet-950/20 dark:to-fuchsia-950/10">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/25">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span>My Permissions</span>
              {isViewAs && (
                <Badge variant="outline" className="ml-2 text-[10px] border-amber-400 text-amber-700 bg-amber-50">
                  <Eye className="h-3 w-3 mr-1" /> View-As active
                </Badge>
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="mt-1">
            Your effective access across all assigned roles. {isViewAs ? "Showing preview permissions for the selected role." : "Updates automatically when your roles change."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-120px)]">
          <div className="p-6 space-y-5">
            {/* Role summary card */}
            <Card className="overflow-hidden border-violet-200/60 dark:border-violet-900/40">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shrink-0">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-semibold text-foreground">{perm.roleName || perm.roleCode || "Unknown role"}</p>
                      {rt && <Badge variant="outline" className="text-[10px] gap-1"><span className={cn("h-1.5 w-1.5 rounded-full", rt.color)} />{rt.label}</Badge>}
                      {rl && <Badge variant="outline" className="text-[10px]">{rl.label} risk</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {perm.userName || "Unknown user"} · {perm.allowedModules?.length || 0} modules accessible · {deniedModules.length} restricted
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stat row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox icon={CheckCircle2} label="Allowed" value={allowedModules.length} color="emerald" />
              <StatBox icon={XCircle} label="Denied" value={deniedModules.length} color="rose" />
              <StatBox icon={Lock} label="Field Rules" value={fieldRestrictions.length} color="amber" />
              <StatBox icon={AlertCircle} label="Conflicts" value={conflicts.length} color={conflicts.length > 0 ? "rose" : "slate"} />
            </div>

            {/* Allowed modules */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-foreground">Accessible Modules</h3>
                <Badge variant="secondary" className="text-[10px]">{allowedModules.length}</Badge>
              </div>
              {allowedModules.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No modules accessible.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {allowedModules.map(m => {
                    const access = perm.moduleAccess(m.id)
                    const level = access?.accessLevel || "View"
                    const al = ACCESS_LEVEL_MAP[level] || ACCESS_LEVEL_MAP.View
                    return (
                      <div key={m.id} className="flex items-center gap-2 rounded-lg border border-emerald-200/60 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10 px-2.5 py-2">
                        <div className="grid h-7 w-7 place-items-center rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                          {m.label.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{m.label}</p>
                          <p className="text-[10px] text-muted-foreground">{al.label}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Denied modules */}
            {deniedModules.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-rose-600" />
                  <h3 className="text-sm font-semibold text-foreground">Restricted Modules</h3>
                  <Badge variant="secondary" className="text-[10px]">{deniedModules.length}</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {deniedModules.map(m => (
                    <div key={m.id} className="flex items-center gap-2 rounded-lg border border-rose-200/60 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-950/10 px-2.5 py-2 opacity-75">
                      <div className="grid h-7 w-7 place-items-center rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-xs font-medium text-foreground/70 truncate">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Field restrictions */}
            {fieldRestrictions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-foreground">Field Restrictions</h3>
                  <Badge variant="secondary" className="text-[10px]">{fieldRestrictions.length}</Badge>
                </div>
                <div className="space-y-1.5">
                  {fieldRestrictions.map(r => {
                    const fam = FIELD_ACCESS_MAP[r.access] || { label: r.access, color: "bg-slate-400" }
                    return (
                      <div key={`${r.module}-${r.field}`} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                        <div className={cn("grid h-6 w-6 place-items-center rounded text-white text-[10px] font-bold shrink-0", fam.color)}>
                          {r.access === "Hidden" ? <EyeOff className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{r.label}</p>
                          <p className="text-[10px] text-muted-foreground">{MODULE_MAP[r.module]?.label || r.module}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{fam.label}</Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Conflicts */}
            {conflicts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <h3 className="text-sm font-semibold text-foreground">Permission Conflicts</h3>
                  <Badge variant="secondary" className="text-[10px] bg-rose-100 text-rose-700">{conflicts.length}</Badge>
                </div>
                <div className="space-y-1.5">
                  {conflicts.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-rose-200/60 dark:border-rose-900/30 bg-rose-50/40 dark:bg-rose-950/10 px-3 py-2">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                      <p className="text-xs text-foreground">
                        <span className="font-medium">{MODULE_MAP[c.module]?.label || c.module}</span>
                        {c.field && <span className="text-muted-foreground"> · {c.field}</span>}
                        <span className="text-muted-foreground"> — {c.details}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data scopes summary */}
            {perm.dataScopes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-violet-600" />
                  <h3 className="text-sm font-semibold text-foreground">Data Scopes</h3>
                  <Badge variant="secondary" className="text-[10px]">{perm.dataScopes.length}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {perm.dataScopes.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] gap-1">
                      {s.scopeType === "All" && <Users className="h-3 w-3" />}
                      {s.scopeType === "SameDepartment" && <Building2 className="h-3 w-3" />}
                      {s.scopeType === "SameLocation" && <MapPin className="h-3 w-3" />}
                      {s.scopeType === "Self" && <Sparkles className="h-3 w-3" />}
                      {s.scopeType}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function StatBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/30",
    rose: "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/30",
    amber: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/30",
    violet: "bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-400 border-violet-200/60 dark:border-violet-900/30",
    slate: "bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400 border-slate-200/60 dark:border-slate-800/30",
  }
  return (
    <div className={cn("rounded-xl border p-3", colors[color] || colors.slate)}>
      <Icon className="h-4 w-4 mb-1" />
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide opacity-80">{label}</p>
    </div>
  )
}
