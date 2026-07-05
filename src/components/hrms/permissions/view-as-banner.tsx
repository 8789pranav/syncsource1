'use client'

// ============================================================
// ViewAsBanner — shown below the topbar when View-As mode is
// active. Reminds the admin they're previewing as a different
// role, with quick stats (allowed modules, masked fields) and
// an exit button.
// ============================================================

import * as React from "react"
import { Eye, RotateCcw, ShieldAlert, Lock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useHrmsStore } from "@/store/hrms-store"
import { ROLE_TYPE_MAP, RISK_LEVEL_MAP } from "@/lib/permissions-constants"

export function ViewAsBanner() {
  const { isViewAs, currentRoleName, currentRoleType, currentRiskLevel, allowedModules, deniedModules, fieldAccess } = useHrmsStore()
  const [dismissed, setDismissed] = React.useState(false)

  // Count masked/hidden fields
  const maskedFieldCount = React.useMemo(() => {
    let n = 0
    for (const mod of Object.keys(fieldAccess)) {
      for (const f of Object.keys(fieldAccess[mod])) {
        if (fieldAccess[mod][f] === "Masked" || fieldAccess[mod][f] === "Hidden") n++
      }
    }
    return n
  }, [fieldAccess])

  if (!isViewAs || dismissed) return null

  const rt = ROLE_TYPE_MAP[currentRoleType || ""] || { label: currentRoleType, color: "bg-slate-400" }
  const rl = RISK_LEVEL_MAP[currentRiskLevel || ""] || { label: currentRiskLevel, color: "", dot: "bg-slate-400" }

  const handleExit = async () => {
    // Reload default permissions
    try {
      const res = await fetch("/api/roles-permissions/me")
      const j = await res.json()
      const d = j?.data || j
      if (d) {
        useHrmsStore.getState().setCurrentUser({
          userId: d.userId,
          userName: d.userName,
          roleCode: d.roleCode,
          roleName: d.roleName,
          roleType: d.roleType,
          riskLevel: d.riskLevel,
          allowedModules: d.allowedModules,
          deniedModules: d.deniedModules || [],
          fieldAccess: d.fieldAccess || {},
          dataScopes: d.dataScopes || [],
          conflicts: d.conflicts || [],
          moduleAccess: d.moduleAccess || {},
          isViewAs: false,
          viewAsRoleId: null,
        })
      }
    } catch {}
  }

  return (
    <div className="sticky top-16 z-10 border-b border-amber-200 dark:border-amber-900/60 bg-gradient-to-r from-amber-50 via-amber-50/80 to-orange-50 dark:from-amber-950/40 dark:via-amber-950/30 dark:to-orange-950/30 px-4 sm:px-6 py-2">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-amber-500 text-white shadow-sm">
            <Eye className="h-3.5 w-3.5" />
          </div>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              View-As preview active
            </p>
            <p className="text-[10px] text-amber-700 dark:text-amber-300">
              You're seeing the app as <strong>{currentRoleName}</strong> would.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          <Badge variant="outline" className="text-[10px] bg-white/60 dark:bg-transparent border-amber-300 text-amber-800 dark:text-amber-300">
            <span className={cn("h-1.5 w-1.5 rounded-full mr-1", rt.color)} />
            {rt.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-white/60 dark:bg-transparent border-amber-300 text-amber-800 dark:text-amber-300">
            <ShieldAlert className="h-3 w-3 mr-1" /> {rl.label} risk
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-white/60 dark:bg-transparent border-amber-300 text-amber-800 dark:text-amber-300">
            {allowedModules?.length || 0} modules
          </Badge>
          {deniedModules.length > 0 && (
            <Badge variant="outline" className="text-[10px] bg-white/60 dark:bg-transparent border-amber-300 text-amber-800 dark:text-amber-300">
              {deniedModules.length} hidden
            </Badge>
          )}
          {maskedFieldCount > 0 && (
            <Badge variant="outline" className="text-[10px] bg-white/60 dark:bg-transparent border-amber-300 text-amber-800 dark:text-amber-300">
              <Lock className="h-3 w-3 mr-1" /> {maskedFieldCount} masked
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 ml-1 text-xs border-amber-400 text-amber-900 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-200 dark:border-amber-700 dark:hover:bg-amber-950"
            onClick={handleExit}
          >
            <RotateCcw className="mr-1.5 h-3 w-3" /> Exit View-As
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="ml-1 text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-950"
            aria-label="Dismiss banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

