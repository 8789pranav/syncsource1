import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok, bad, parseBody } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

export async function POST(req: NextRequest) {
  const body = await parseBody(req)
  const { roleId, module, accessLevel, performedByName } = body
  if (!roleId || !module || !accessLevel) return bad("roleId, module, accessLevel are required")

  const role = await db.role.findUnique({ where: { id: roleId } })
  if (!role) return bad("Role not found", 404)

  const existing = await db.roleModulePermission.findUnique({
    where: { tenantId_roleId_module: { tenantId: DEFAULT_TENANT_ID, roleId, module } },
  })

  let result
  if (existing) {
    result = await db.roleModulePermission.update({
      where: { id: existing.id },
      data: { accessLevel },
    })
  } else {
    result = await db.roleModulePermission.create({
      data: { tenantId: DEFAULT_TENANT_ID, roleId, module, accessLevel, riskLevel: "Low" },
    })
  }

  await logPermissionAudit({
    action: "PermissionChanged", entityType: "Role", entityId: roleId,
    roleName: role.name, oldValue: { module, accessLevel: existing?.accessLevel || "NoAccess" },
    newValue: { module, accessLevel }, performedByName,
  })
  return ok(result)
}
