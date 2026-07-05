// =====================================================================
// Roles & Permissions — Effective Permission Engine
// =====================================================================
// Computes the final access for a user given their assigned roles.
// Rule: Explicit Deny > Allow > No Access (default Deny-by-default).

import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { parseJsonArray } from "@/lib/permissions-constants"

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
export interface EffectivePermission {
  employeeId: string
  roles: { id: string; name: string; code: string; roleType: string }[]
  moduleAccess: Record<string, {
    accessLevel: string
    canView: boolean
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
    canApprove: boolean
    canExport: boolean
    canImport: boolean
    canDownload: boolean
    canUpload: boolean
    reason: string
  }>
  fieldAccess: Record<string, Record<string, string>> // module -> field -> access
  dataScopes: {
    scopeType: string
    entityId?: string | null
    departmentIds: string[]
    locationIds: string[]
    branchIds: string[]
    gradeIds: string[]
    includeEmployees: string[]
    excludeEmployees: string[]
  }[]
  deniedModules: string[]
  allowedModules: string[]
  conflicts: { module: string; field?: string; details: string }[]
}

// ---------------------------------------------------------------
// Role setting cache
// ---------------------------------------------------------------
let cachedSettings: { conflictHandling: string; defaultMode: string } | null = null

async function getSettings() {
  if (cachedSettings) return cachedSettings
  const s = await db.roleSetting.findUnique({ where: { tenantId: DEFAULT_TENANT_ID } })
  cachedSettings = s
    ? { conflictHandling: s.conflictHandling, defaultMode: s.defaultPermissionMode }
    : { conflictHandling: "ExplicitDenyWins", defaultMode: "DenyByDefault" }
  return cachedSettings
}

export function clearPermissionCache() { cachedSettings = null }

// ---------------------------------------------------------------
// Main entry: compute effective permission for an employee
// ---------------------------------------------------------------
export async function computeEffectivePermission(employeeId: string): Promise<EffectivePermission> {
  const settings = await getSettings()
  const defaultAllow = settings.defaultMode === "AllowByDefault"

  // Load active user roles (includes expired if status != Active)
  const userRoles = await db.userRole.findMany({
    where: { employeeId, status: "Active", tenantId: DEFAULT_TENANT_ID },
    include: {
      role: {
        include: {
          modulePermissions: true,
          pagePermissions: true,
          actionPermissions: true,
          fieldPermissions: true,
          dataScopes: true,
        },
      },
    },
  })

  // Filter out expired temporary roles
  const now = new Date()
  const activeUserRoles = userRoles.filter(ur => {
    if (!ur.role) return false
    if (ur.effectiveTo && new Date(ur.effectiveTo) < now) return false
    if (new Date(ur.effectiveFrom) > now) return false
    return true
  })

  const roles = activeUserRoles.map(ur => ({
    id: ur.role.id, name: ur.role.name, code: ur.role.code, roleType: ur.role.roleType,
  }))

  // -------------------------------------------------------------
  // Module access — merge across all roles
  // -------------------------------------------------------------
  const moduleMap: EffectivePermission["moduleAccess"] = {}
  const conflicts: EffectivePermission["conflicts"] = []
  const ROLE_PRIORITY: Record<string, number> = { System: 5, Custom: 4, Functional: 3, Workflow: 2, Implicit: 1, Temporary: 1 }

  for (const ur of activeUserRoles) {
    const role = ur.role
    for (const mp of role.modulePermissions) {
      const existing = moduleMap[mp.module]
      if (!existing) {
        moduleMap[mp.module] = {
          accessLevel: mp.accessLevel,
          canView: mp.accessLevel !== "NoAccess",
          canCreate: ["Manage", "FullAccess", "Custom"].includes(mp.accessLevel),
          canEdit: ["Manage", "FullAccess", "Custom"].includes(mp.accessLevel),
          canDelete: mp.accessLevel === "FullAccess",
          canApprove: ["Manage", "FullAccess"].includes(mp.accessLevel),
          canExport: mp.accessLevel !== "NoAccess",
          canImport: ["Manage", "FullAccess"].includes(mp.accessLevel),
          canDownload: mp.accessLevel !== "NoAccess",
          canUpload: ["Manage", "FullAccess", "Custom"].includes(mp.accessLevel),
          reason: `From role: ${role.name}`,
        }
      } else {
        // Merge: if conflict handling = ExplicitDenyWins, any NoAccess wins
        if (settings.conflictHandling === "ExplicitDenyWins") {
          if (mp.accessLevel === "NoAccess") {
            moduleMap[mp.module] = {
              ...moduleMap[mp.module],
              accessLevel: "NoAccess",
              canView: false, canCreate: false, canEdit: false, canDelete: false,
              canApprove: false, canExport: false, canImport: false,
              canDownload: false, canUpload: false,
              reason: `Denied by role: ${role.name}`,
            }
            conflicts.push({ module: mp.module, details: `Denied by ${role.name}` })
          } else {
            // Take the highest access
            const order = ["NoAccess", "View", "Manage", "FullAccess", "Custom"]
            const cur = order.indexOf(existing.accessLevel)
            const next = order.indexOf(mp.accessLevel)
            if (next > cur) {
              moduleMap[mp.module] = {
                accessLevel: mp.accessLevel,
                canView: true,
                canCreate: ["Manage", "FullAccess", "Custom"].includes(mp.accessLevel),
                canEdit: ["Manage", "FullAccess", "Custom"].includes(mp.accessLevel),
                canDelete: mp.accessLevel === "FullAccess",
                canApprove: ["Manage", "FullAccess"].includes(mp.accessLevel),
                canExport: true,
                canImport: ["Manage", "FullAccess"].includes(mp.accessLevel),
                canDownload: true,
                canUpload: ["Manage", "FullAccess", "Custom"].includes(mp.accessLevel),
                reason: `Upgraded by role: ${role.name}`,
              }
            }
          }
        } else if (settings.conflictHandling === "HigherPriorityWins") {
          const curP = ROLE_PRIORITY[role.roleType] || 0
          // Just take from higher-priority role (simplified)
          if (curP >= 3) {
            moduleMap[mp.module] = {
              accessLevel: mp.accessLevel,
              canView: mp.accessLevel !== "NoAccess",
              canCreate: ["Manage", "FullAccess", "Custom"].includes(mp.accessLevel),
              canEdit: ["Manage", "FullAccess", "Custom"].includes(mp.accessLevel),
              canDelete: mp.accessLevel === "FullAccess",
              canApprove: ["Manage", "FullAccess"].includes(mp.accessLevel),
              canExport: mp.accessLevel !== "NoAccess",
              canImport: ["Manage", "FullAccess"].includes(mp.accessLevel),
              canDownload: mp.accessLevel !== "NoAccess",
              canUpload: ["Manage", "FullAccess", "Custom"].includes(mp.accessLevel),
              reason: `Higher priority role: ${role.name}`,
            }
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // Field access — merge (most permissive wins unless Masked required)
  // -------------------------------------------------------------
  const fieldMap: EffectivePermission["fieldAccess"] = {}
  for (const ur of activeUserRoles) {
    for (const fp of ur.role.fieldPermissions) {
      if (!fieldMap[fp.module]) fieldMap[fp.module] = {}
      const cur = fieldMap[fp.module][fp.field]
      if (!cur) {
        fieldMap[fp.module][fp.field] = fp.access
      } else {
        // Hidden is strongest deny, then Masked, then View, then Edit, then Required
        const order = ["Hidden", "Masked", "ViewOnlyOwn", "View", "Required", "Edit"]
        const curIdx = order.indexOf(cur)
        const newIdx = order.indexOf(fp.access)
        if (newIdx > curIdx) fieldMap[fp.module][fp.field] = fp.access
      }
    }
  }

  // -------------------------------------------------------------
  // Data scopes — aggregate
  // -------------------------------------------------------------
  const dataScopes: EffectivePermission["dataScopes"] = []
  for (const ur of activeUserRoles) {
    for (const ds of ur.role.dataScopes) {
      dataScopes.push({
        scopeType: ds.scopeType,
        entityId: ds.entityId,
        departmentIds: parseJsonArray(ds.departmentIds),
        locationIds: parseJsonArray(ds.locationIds),
        branchIds: parseJsonArray(ds.branchIds),
        gradeIds: parseJsonArray(ds.gradeIds),
        includeEmployees: parseJsonArray(ds.includeEmployees),
        excludeEmployees: parseJsonArray(ds.excludeEmployees),
      })
    }
  }

  // -------------------------------------------------------------
  // Allowed / denied modules
  // -------------------------------------------------------------
  const allowedModules = Object.entries(moduleMap).filter(([, v]) => v.canView).map(([k]) => k)
  const deniedModules = Object.entries(moduleMap).filter(([, v]) => !v.canView).map(([k]) => k)

  // Default-allow: if no entry exists for a module, apply default mode
  // (we don't auto-add here — caller can check allowedModules)

  return {
    employeeId,
    roles,
    moduleAccess: moduleMap,
    fieldAccess: fieldMap,
    dataScopes,
    deniedModules,
    allowedModules,
    conflicts,
  }
}

// ---------------------------------------------------------------
// Quick checks
// ---------------------------------------------------------------
export async function canAccessModule(employeeId: string, module: string): Promise<boolean> {
  const perm = await computeEffectivePermission(employeeId)
  if (perm.moduleAccess[module]) return perm.moduleAccess[module].canView
  // Default mode
  const settings = await getSettings()
  return settings.defaultMode === "AllowByDefault"
}

export async function canPerformAction(
  employeeId: string,
  module: string,
  action: "view" | "create" | "edit" | "delete" | "approve" | "export" | "import" | "download" | "upload"
): Promise<boolean> {
  const perm = await computeEffectivePermission(employeeId)
  const m = perm.moduleAccess[module]
  if (!m) {
    const settings = await getSettings()
    return settings.defaultMode === "AllowByDefault" && action === "view"
  }
  switch (action) {
    case "view": return m.canView
    case "create": return m.canCreate
    case "edit": return m.canEdit
    case "delete": return m.canDelete
    case "approve": return m.canApprove
    case "export": return m.canExport
    case "import": return m.canImport
    case "download": return m.canDownload
    case "upload": return m.canUpload
    default: return false
  }
}

export async function getFieldAccess(employeeId: string, module: string, field: string): Promise<string> {
  const perm = await computeEffectivePermission(employeeId)
  return perm.fieldAccess[module]?.[field] || "View"
}
