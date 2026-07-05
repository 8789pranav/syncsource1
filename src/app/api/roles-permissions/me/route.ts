import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok, bad } from "@/lib/api-helpers"

// Returns the allowed modules for a given employee (by query param) or defaults to "HR Admin" role
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get("employeeId") || ""

  // If no employee specified, return the default HR Admin permissions
  if (!employeeId) {
    const hrAdminRole = await db.role.findUnique({
      where: { tenantId_code: { tenantId: DEFAULT_TENANT_ID, code: "HR_ADMIN" } },
      include: { modulePermissions: true },
    })
    if (hrAdminRole) {
      const allowedModules = hrAdminRole.modulePermissions
        .filter(mp => mp.accessLevel !== "NoAccess")
        .map(mp => mp.module)
      return ok({
        userId: "default",
        userName: "HR Admin",
        roleCode: "HR_ADMIN",
        roleName: hrAdminRole.name,
        allowedModules,
      })
    }
    // Fallback: all modules
    return ok({
      userId: "default",
      userName: "HR Admin",
      roleCode: "HR_ADMIN",
      roleName: "HR Admin",
      allowedModules: ["dashboard", "organization", "employees", "onboarding", "offboarding", "leave", "shift", "roster", "attendance", "holiday", "payroll", "documents", "asset", "announcements", "forms", "workflows", "roles-permissions", "audit", "settings"],
    })
  }

  // Load user's active roles
  const userRoles = await db.userRole.findMany({
    where: { employeeId, status: "Active", tenantId: DEFAULT_TENANT_ID },
    include: { role: { include: { modulePermissions: true } } },
  })

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, firstName: true, lastName: true, displayName: true, employeeCode: true },
  })

  if (!employee) return bad("Employee not found", 404)

  // Merge allowed modules across all roles
  const allowedSet = new Set<string>()
  let primaryRoleCode = "EMPLOYEE"
  let primaryRoleName = "Employee"

  for (const ur of userRoles) {
    if (ur.role) {
      for (const mp of ur.role.modulePermissions) {
        if (mp.accessLevel !== "NoAccess") allowedSet.add(mp.module)
      }
      // First non-employee role becomes the primary
      if (primaryRoleCode === "EMPLOYEE" && ur.role.code !== "EMPLOYEE") {
        primaryRoleCode = ur.role.code
        primaryRoleName = ur.role.name
      }
    }
  }

  // If user has no roles at all, give employee default
  if (userRoles.length === 0) {
    const empRole = await db.role.findUnique({
      where: { tenantId_code: { tenantId: DEFAULT_TENANT_ID, code: "EMPLOYEE" } },
      include: { modulePermissions: true },
    })
    if (empRole) {
      for (const mp of empRole.modulePermissions) {
        if (mp.accessLevel !== "NoAccess") allowedSet.add(mp.module)
      }
      primaryRoleCode = empRole.code
      primaryRoleName = empRole.name
    }
  }

  return ok({
    userId: employee.id,
    userName: employee.displayName || `${employee.firstName} ${employee.lastName}`,
    roleCode: primaryRoleCode,
    roleName: primaryRoleName,
    allowedModules: Array.from(allowedSet),
  })
}
