'use client'

// ============================================================
// AccessDenied — friendly "no permission" view.
// ------------------------------------------------------------
// Shown when the viewer's role doesn't grant access to the
// active module. Includes: lock icon, module name, role info,
// and quick actions (Request Access / Switch back / Go home).
// ============================================================

import * as React from "react"
import { Lock, ShieldAlert, ArrowLeft, Send, RotateCcw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePermissions } from "@/lib/use-permissions"
import { useHrmsStore } from "@/store/hrms-store"
import { MODULE_MAP } from "@/lib/permissions-constants"

export function AccessDenied({ module: moduleId }: { module: string }) {
  const perm = usePermissions()
  const setModule = useHrmsStore(s => s.setModule)
  const meta = MODULE_MAP[moduleId]

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="relative max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm overflow-hidden">
        {/* Decorative corner glow */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-rose-500/15 to-amber-500/15 ring-1 ring-rose-500/20">
            <Lock className="h-7 w-7 text-rose-600" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Access restricted</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            You don't have permission to view the <span className="font-medium text-foreground">{meta?.label || moduleId}</span> module.
          </p>

          <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Your role</span>
              <Badge variant="outline" className="text-[10px]">
                {perm.roleName || perm.roleCode || "Unknown"}
              </Badge>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Required access</span>
              <span className="font-medium text-foreground">View or higher</span>
            </div>
            {perm.isViewAs && (
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Mode</span>
                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50">
                  <ShieldAlert className="mr-1 h-3 w-3" /> View-As preview
                </Badge>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2">
            {perm.isViewAs ? (
              <Button onClick={() => window.location.reload()} className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" /> Exit View-As mode
              </Button>
            ) : (
              <Button className="w-full">
                <Send className="mr-2 h-4 w-4" /> Request access
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => setModule("dashboard" as any)}>
              <Home className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
