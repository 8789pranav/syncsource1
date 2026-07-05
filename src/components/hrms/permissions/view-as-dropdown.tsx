'use client'

// ============================================================
// ViewAsRoleDropdown — header dropdown that lets an admin
// preview the entire app as if they had only a selected role.
// ------------------------------------------------------------
// On select, fetches /api/roles-permissions/me?roleId=xxx and
// updates the global store, which immediately filters the
// sidebar, modules, and field-level masking.
// A "View-As" banner appears below the topbar while active.
// ============================================================

import * as React from "react"
import { Eye, EyeOff, ShieldCheck, Loader2, Search, ChevronRight, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { useHrmsStore } from "@/store/hrms-store"
import { ROLE_TYPE_MAP, RISK_LEVEL_MAP } from "@/lib/permissions-constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface RoleOption {
  id: string
  code: string
  name: string
  roleType: string
  riskLevel: string
  description?: string | null
  _count?: { userRoles: number }
}

export function ViewAsRoleDropdown() {
  const { isViewAs, currentRoleName, viewAsRoleId, setCurrentUser, clearCurrentUser, permissionsLoaded } = useHrmsStore()
  const [roles, setRoles] = React.useState<RoleOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [switching, setSwitching] = React.useState(false)
  const [search, setSearch] = React.useState("")

  // Load roles list when dropdown opens
  const loadRoles = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/roles-permissions/roles?pageSize=100")
      const j = await res.json()
      setRoles(j?.data?.items || j?.items || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return roles
    return roles.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      r.roleType.toLowerCase().includes(q)
    )
  }, [roles, search])

  const [open, setOpen] = React.useState(false)

  const handleSelect = async (roleId: string) => {
    setOpen(false) // close dropdown immediately
    setSwitching(true)
    try {
      const res = await fetch(`/api/roles-permissions/me?roleId=${encodeURIComponent(roleId)}`)
      const j = await res.json()
      const d = j?.data || j  // API returns data directly (ok() helper)
      if (!d) throw new Error("Failed")
      setCurrentUser({
        userId: d.userId,
        userName: d.userName,
        roleCode: d.roleCode,
        roleName: d.roleName,
        roleType: d.roleType,
        riskLevel: d.riskLevel,
        allowedModules: d.allowedModules,
        deniedModules: d.deniedModules,
        fieldAccess: d.fieldAccess,
        dataScopes: d.dataScopes,
        conflicts: d.conflicts,
        moduleAccess: d.moduleAccess,
        isViewAs: true,
        viewAsRoleId: roleId,
      })
      const role = roles.find(r => r.id === roleId)
      toast.success(`View-As active`, { description: `Now previewing as "${role?.name}". Sidebar and field masking updated.` })
    } catch {
      toast.error("Failed to switch role")
    } finally {
      setSwitching(false)
    }
  }

  const handleExit = async () => {
    setOpen(false)
    setSwitching(true)
    try {
      // Reload default HR Admin permissions
      const res = await fetch("/api/roles-permissions/me")
      const j = await res.json()
      const d = j?.data || j
      if (d) {
        setCurrentUser({
          userId: d.userId,
          userName: d.userName,
          roleCode: d.roleCode,
          roleName: d.roleName,
          roleType: d.roleType,
          riskLevel: d.riskLevel,
          allowedModules: d.allowedModules,
          deniedModules: d.deniedModules,
          fieldAccess: d.fieldAccess,
          dataScopes: d.dataScopes,
          conflicts: d.conflicts,
          moduleAccess: d.moduleAccess,
          isViewAs: false,
          viewAsRoleId: null,
        })
      } else {
        clearCurrentUser()
      }
      toast.success("Exited View-As mode", { description: "Restored your default permissions." })
    } catch {
      toast.error("Failed to exit View-As")
    } finally {
      setSwitching(false)
    }
  }

  if (!permissionsLoaded) return null

  return (
    <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (o && roles.length === 0) loadRoles() }}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isViewAs ? "default" : "ghost"}
          size="sm"
          className={cn(
            "h-9 gap-1.5 rounded-lg text-xs",
            isViewAs
              ? "bg-amber-500 hover:bg-amber-600 text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="Preview the app as a different role"
        >
          {switching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{isViewAs ? `View-As: ${currentRoleName}` : "View As"}</span>
          <span className="sm:hidden">{isViewAs ? "As" : "As"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">View-As Role</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Preview the entire app with only the selected role's permissions. Sidebar, modules, and field masking will update instantly.
          </p>
        </div>

        {isViewAs && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900">
            <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
              <Eye className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">Currently previewing as <strong>{currentRoleName}</strong></span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-7 w-full text-xs border-amber-300 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-950"
              onClick={handleExit}
              disabled={switching}
            >
              <RotateCcw className="mr-1.5 h-3 w-3" /> Exit View-As
            </Button>
          </div>
        )}

        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search roles..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              Loading roles...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">No roles found.</div>
          ) : (
            filtered.map(r => {
              const isActive = viewAsRoleId === r.id
              const rt = ROLE_TYPE_MAP[r.roleType] || { label: r.roleType, color: "bg-slate-400" }
              const rl = RISK_LEVEL_MAP[r.riskLevel] || { label: r.riskLevel, color: "", dot: "bg-slate-400" }
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r.id)}
                  disabled={switching}
                  className={cn(
                    "w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors border-b border-border/50 last:border-0",
                    isActive && "bg-amber-50 dark:bg-amber-950/30"
                  )}
                >
                  <div className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md text-white text-[10px] font-bold", rt.color)}>
                    {r.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground truncate">{r.name}</span>
                      {isActive && <Badge className="text-[9px] h-4 px-1 bg-amber-500">Active</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{rt.label}</span>
                      <span className={cn("h-1 w-1 rounded-full", rl.dot)} />
                      <span className="text-[10px] text-muted-foreground">{r.riskLevel} risk</span>
                      {r._count?.userRoles !== undefined && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                          <span className="text-[10px] text-muted-foreground">{r._count.userRoles} user{(r._count.userRoles || 0) === 1 ? "" : "s"}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 mt-1" />
                </button>
              )
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
