'use client'

// ============================================================
// usePermissions — client-side hook for reading the current
// viewer's effective permissions from the Zustand store.
// ------------------------------------------------------------
// The store is hydrated by the Shell's usePermissionInit()
// effect (fetches /api/roles-permissions/me). Components can
// then read module access, field access, and data scopes
// synchronously via this hook.
// ============================================================

import { useHrmsStore, type ModuleAccessDetail, type DataScope } from "@/store/hrms-store"

export interface PermissionsState {
  loaded: boolean
  userId: string | null
  userName: string | null
  roleCode: string | null
  roleName: string | null
  roleType: string | null
  riskLevel: string | null
  isViewAs: boolean
  allowedModules: string[] | null
  deniedModules: string[]
  conflicts: { module: string; field?: string; details: string }[]
  // Module-level
  canView: (module: string) => boolean
  canCreate: (module: string) => boolean
  canEdit: (module: string) => boolean
  canDelete: (module: string) => boolean
  canApprove: (module: string) => boolean
  canExport: (module: string) => boolean
  canImport: (module: string) => boolean
  canDownload: (module: string) => boolean
  canUpload: (module: string) => boolean
  moduleAccess: (module: string) => ModuleAccessDetail | undefined
  // Field-level
  getFieldAccess: (module: string, field: string) => string // "Hidden"|"Masked"|"View"|"Edit"|"Required"|"ViewOnlyOwn"
  isFieldHidden: (module: string, field: string) => boolean
  isFieldMasked: (module: string, field: string) => boolean
  isFieldEditable: (module: string, field: string) => boolean
  // Data scopes
  dataScopes: DataScope[]
}

export function usePermissions(): PermissionsState {
  const s = useHrmsStore()

  const canView = (module: string) => {
    if (!s.allowedModules) return true // not loaded yet
    if (s.allowedModules.includes(module as any)) return true
    const m = s.moduleAccess[module]
    return m?.canView ?? false
  }
  const moduleAccess = (module: string) => s.moduleAccess[module]
  const canCreate = (module: string) => moduleAccess(module)?.canCreate ?? canView(module)
  const canEdit = (module: string) => moduleAccess(module)?.canEdit ?? false
  const canDelete = (module: string) => moduleAccess(module)?.canDelete ?? false
  const canApprove = (module: string) => moduleAccess(module)?.canApprove ?? false
  const canExport = (module: string) => moduleAccess(module)?.canExport ?? canView(module)
  const canImport = (module: string) => moduleAccess(module)?.canImport ?? false
  const canDownload = (module: string) => moduleAccess(module)?.canDownload ?? canView(module)
  const canUpload = (module: string) => moduleAccess(module)?.canUpload ?? false

  const getFieldAccess = (module: string, field: string) => s.fieldAccess[module]?.[field] || "View"
  const isFieldHidden = (module: string, field: string) => getFieldAccess(module, field) === "Hidden"
  const isFieldMasked = (module: string, field: string) => getFieldAccess(module, field) === "Masked"
  const isFieldEditable = (module: string, field: string) => {
    const a = getFieldAccess(module, field)
    return a === "Edit" || a === "Required"
  }

  return {
    loaded: s.permissionsLoaded,
    userId: s.currentUserId,
    userName: s.currentUserName,
    roleCode: s.currentUserRole,
    roleName: s.currentRoleName,
    roleType: s.currentRoleType,
    riskLevel: s.currentRiskLevel,
    isViewAs: s.isViewAs,
    allowedModules: s.allowedModules,
    deniedModules: s.deniedModules,
    conflicts: s.conflicts,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
    canExport,
    canImport,
    canDownload,
    canUpload,
    moduleAccess,
    getFieldAccess,
    isFieldHidden,
    isFieldMasked,
    isFieldEditable,
    dataScopes: s.dataScopes,
  }
}
