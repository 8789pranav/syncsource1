import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok, notFound, parseBody } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; roleId: string }> }) {
  const { id, roleId } = await params
  const body = await parseBody(req).catch(() => ({}))
  const userRole = await db.userRole.findFirst({
    where: { employeeId: id, roleId, tenantId: DEFAULT_TENANT_ID, status: "Active" },
    include: { role: true },
  })
  if (!userRole) return notFound("User role not found")

  await db.userRole.update({ where: { id: userRole.id }, data: { status: "Revoked" } })
  await logPermissionAudit({
    action: "UserRoleRemoved", entityType: "User", entityId: id,
    roleName: userRole.role.name, performedByName: body.performedByName,
  })
  return ok({ removed: true })
}
