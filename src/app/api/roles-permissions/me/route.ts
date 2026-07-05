import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok, bad } from "@/lib/api-helpers"
import { computeEffectivePermission } from "@/lib/permissions-engine"
import { MODULES } from "@/lib/permissions-constants"

// Returns the effective permissions for the current user.
//   ?employeeId=xxx        → view as that employee (uses their assigned roles)
//   ?roleId=xxx            → "View As Role" mode — preview the app as if you had ONLY this role
//   (no params)            → default HR Admin role
//
// Returns:
//   userId, userName, roleCode, roleName, roleType, riskLevel,
//   allowedModules (string[]), deniedModules (string[]),
//   fieldAccess ({ [module]: { [field]: "Hidden"|"Masked"|"View"|"Edit"|"Required"|"ViewOnlyOwn" } }),
//   dataScopes (array), conflicts (array), isViewAs (boolean)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get("employeeId") || ""
  const viewAsRoleId = searchParams.get("roleId") || ""

  // ---------- VIEW AS ROLE mode ----------
  // Admin previews the app with ONLY the selected role's permissions.
  // We synthesise a "virtual" employee by computing permissions directly from the role.
  if (viewAsRoleId) {
    const role = await db.role.findUnique({
      where: { id: viewAsRoleId },
      include: {
        modulePermissions: true,
        pagePermissions: true,
        actionPermissions: true,
        fieldPermissions: true,
        dataScopes: true,
      },
    })
    if (!role) return bad("Role not found", 404)

    const allowedModules = role.modulePermissions
      .filter(mp => mp.accessLevel !== "NoAccess")
      .map(mp => mp.module)
    const deniedModules = role.modulePermissions
      .filter(mp => mp.accessLevel === "NoAccess")
      .map(mp => mp.module)

    // Build field access map { [module]: { [field]: access } }
    const fieldAccess: Record<string, Record<string, string>> = {}
    for (const fp of role.fieldPermissions) {
      if (!fieldAccess[fp.module]) fieldAccess[fp.module] = {}
      fieldAccess[fp.module][fp.field] = fp.access
    }

    // Data scopes
    const dataScopes = role.dataScopes.map(ds => ({
      scopeType: ds.scopeType,
      entityId: ds.entityId,
      departmentIds: JSON.parse(ds.departmentIds || "[]"),
      locationIds: JSON.parse(ds.locationIds || "[]"),
      branchIds: JSON.parse(ds.branchIds || "[]"),
      gradeIds: JSON.parse(ds.gradeIds || "[]"),
      includeEmployees: JSON.parse(ds.includeEmployees || "[]"),
      excludeEmployees: JSON.parse(ds.excludeEmployees || "[]"),
    }))

    // Module access detail (for the "my permissions" panel)
    const moduleAccess: Record<string, any> = {}
    for (const mp of role.modulePermissions) {
      moduleAccess[mp.module] = {
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
    }

    return ok({
      userId: `view-as:${role.id}`,
      userName: `Viewing as: ${role.name}`,
      roleCode: role.code,
      roleName: role.name,
      roleType: role.roleType,
      riskLevel: role.riskLevel,
      allowedModules,
      deniedModules,
      fieldAccess,
      dataScopes,
      conflicts: [] as any[],
      moduleAccess,
      isViewAs: true,
      viewAsRoleId: role.id,
    })
  }

  // ---------- Employee-specific mode ----------
  if (employeeId) {
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, firstName: true, lastName: true, displayName: true, employeeCode: true },
    })
    if (!employee) return bad("Employee not found", 404)

    const perm = await computeEffectivePermission(employeeId)

    return ok({
      userId: employee.id,
      userName: employee.displayName || `${employee.firstName} ${employee.lastName}`,
      roleCode: perm.roles[0]?.code || "EMPLOYEE",
      roleName: perm.roles[0]?.name || "Employee",
      roleType: perm.roles[0]?.roleType || "System",
      roles: perm.roles,
      allowedModules: perm.allowedModules,
      deniedModules: perm.deniedModules,
      fieldAccess: perm.fieldAccess,
      dataScopes: perm.dataScopes,
      conflicts: perm.conflicts,
      moduleAccess: perm.moduleAccess,
      isViewAs: false,
    })
  }

  // ---------- Default: HR Admin role ----------
  const hrAdminRole = await db.role.findUnique({
    where: { tenantId_code: { tenantId: DEFAULT_TENANT_ID, code: "HR_ADMIN" } },
    include: {
      modulePermissions: true,
      fieldPermissions: true,
      dataScopes: true,
    },
  })
  if (hrAdminRole) {
    const allowedModules = hrAdminRole.modulePermissions
      .filter(mp => mp.accessLevel !== "NoAccess")
      .map(mp => mp.module)
    const deniedModules = hrAdminRole.modulePermissions
      .filter(mp => mp.accessLevel === "NoAccess")
      .map(mp => mp.module)

    const fieldAccess: Record<string, Record<string, string>> = {}
    for (const fp of hrAdminRole.fieldPermissions) {
      if (!fieldAccess[fp.module]) fieldAccess[fp.module] = {}
      fieldAccess[fp.module][fp.field] = fp.access
    }
    const dataScopes = hrAdminRole.dataScopes.map(ds => ({
      scopeType: ds.scopeType,
      entityId: ds.entityId,
      departmentIds: JSON.parse(ds.departmentIds || "[]"),
      locationIds: JSON.parse(ds.locationIds || "[]"),
      branchIds: JSON.parse(ds.branchIds || "[]"),
      gradeIds: JSON.parse(ds.gradeIds || "[]"),
      includeEmployees: JSON.parse(ds.includeEmployees || "[]"),
      excludeEmployees: JSON.parse(ds.excludeEmployees || "[]"),
    }))

    return ok({
      userId: "default",
      userName: "HR Admin",
      roleCode: hrAdminRole.code,
      roleName: hrAdminRole.name,
      roleType: hrAdminRole.roleType,
      riskLevel: hrAdminRole.riskLevel,
      allowedModules,
      deniedModules,
      fieldAccess,
      dataScopes,
      conflicts: [] as any[],
      isViewAs: false,
    })
  }

  // Fallback: all modules
  return ok({
    userId: "default",
    userName: "HR Admin",
    roleCode: "HR_ADMIN",
    roleName: "HR Admin",
    roleType: "System",
    riskLevel: "Medium",
    allowedModules: MODULES.map(m => m.id),
    deniedModules: [] as string[],
    fieldAccess: {} as Record<string, Record<string, string>>,
    dataScopes: [] as any[],
    conflicts: [] as any[],
    isViewAs: false,
  })
}
