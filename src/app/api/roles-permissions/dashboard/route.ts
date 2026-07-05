import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok } from "@/lib/api-helpers"
import { MODULES } from "@/lib/permissions-constants"

export async function GET() {
  const tenantId = DEFAULT_TENANT_ID
  const [totalRoles, activeUsers, pendingRequests, criticalPermissions] = await Promise.all([
    db.role.count({ where: { tenantId, status: "Active" } }),
    db.userRole.count({ where: { tenantId, status: "Active" } }),
    db.accessRequest.count({ where: { tenantId, status: { in: ["Submitted", "PendingApproval"] } } }),
    db.roleModulePermission.count({ where: { tenantId, riskLevel: "Critical", accessLevel: { not: "NoAccess" } } }),
  ])

  const rolesByTypeRaw = await db.role.groupBy({ by: ["roleType"], where: { tenantId }, _count: true })
  const rolesByType = rolesByTypeRaw.map(r => ({ type: r.roleType, count: r._count }))

  const riskRaw = await db.role.groupBy({ by: ["riskLevel"], where: { tenantId }, _count: true })
  const riskDistribution = riskRaw.map(r => ({ level: r.riskLevel, count: r._count }))

  const topRolesRaw = await db.role.findMany({
    where: { tenantId },
    include: { _count: { select: { userRoles: true } } },
    orderBy: { userRoles: { _count: "desc" } },
    take: 6,
  })
  const topRolesByUsers = topRolesRaw.map(r => ({ roleId: r.id, name: r.name, userCount: r._count.userRoles }))

  const modulePerms = await db.roleModulePermission.findMany({ where: { tenantId, accessLevel: { not: "NoAccess" } } })
  const moduleCoverageMap = new Map<string, number>()
  for (const mp of modulePerms) {
    moduleCoverageMap.set(mp.module, (moduleCoverageMap.get(mp.module) || 0) + 1)
  }
  const moduleCoverage = MODULES.map(m => ({ module: m.id, label: m.label, group: m.group, riskLevel: m.riskLevel, roleCount: moduleCoverageMap.get(m.id) || 0 }))

  const recentChanges = await db.permissionAuditLog.findMany({
    where: { tenantId, action: { in: ["RoleCreated", "RoleUpdated", "RoleDeleted", "PermissionChanged", "RoleCloned"] } },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true, action: true, roleName: true, performedByName: true, createdAt: true, status: true },
  })

  return ok({
    stats: { totalRoles, activeUsers, pendingRequests, criticalPermissions },
    rolesByType,
    riskDistribution,
    topRolesByUsers,
    moduleCoverage,
    recentChanges,
  })
}
