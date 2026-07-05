import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok, bad, notFound, parseBody } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const role = await db.role.findUnique({
    where: { id },
    include: {
      modulePermissions: true,
      pagePermissions: true,
      actionPermissions: true,
      fieldPermissions: true,
      dataScopes: true,
      _count: { select: { userRoles: true } },
    },
  })
  if (!role) return notFound("Role not found")
  return ok(role)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const role = await db.role.findUnique({ where: { id } })
  if (!role) return notFound("Role not found")
  const body = await parseBody(req)

  // System roles: only allow description/effectiveFrom/effectiveTo/status
  const updateData: any = {}
  if (body.description !== undefined) updateData.description = body.description
  if (body.status !== undefined) updateData.status = body.status
  if (body.riskLevel !== undefined) updateData.riskLevel = body.riskLevel
  if (body.effectiveFrom !== undefined) updateData.effectiveFrom = body.effectiveFrom ? new Date(body.effectiveFrom) : null
  if (body.effectiveTo !== undefined) updateData.effectiveTo = body.effectiveTo ? new Date(body.effectiveTo) : null

  if (!role.isSystem) {
    if (body.name !== undefined) updateData.name = body.name
    if (body.roleType !== undefined) updateData.roleType = body.roleType
    if (body.entityScope !== undefined) updateData.entityScope = body.entityScope
    if (body.isDefault !== undefined) updateData.isDefault = body.isDefault
  }

  const updated = await db.role.update({ where: { id }, data: updateData })

  // Update module permissions if provided
  if (Array.isArray(body.modulePermissions)) {
    await db.roleModulePermission.deleteMany({ where: { roleId: id } })
    if (body.modulePermissions.length) {
      await db.roleModulePermission.createMany({
        data: body.modulePermissions.map((mp: any) => ({
          tenantId: DEFAULT_TENANT_ID, roleId: id, module: mp.module,
          accessLevel: mp.accessLevel || "NoAccess", riskLevel: mp.riskLevel || "Low",
        })),
      })
    }
  }

  await logPermissionAudit({ action: "RoleUpdated", entityType: "Role", entityId: id, roleName: role.name, oldValue: role, newValue: updateData, performedByName: body.performedByName })
  return ok(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const role = await db.role.findUnique({ where: { id }, include: { _count: { select: { userRoles: true } } } })
  if (!role) return notFound("Role not found")
  if (role.isSystem) return bad("System roles cannot be deleted", 403)
  if (role._count.userRoles > 0) return bad(`Cannot delete: ${role._count.userRoles} user(s) are assigned to this role`, 409)

  await db.role.delete({ where: { id } })
  await logPermissionAudit({ action: "RoleDeleted", entityType: "Role", entityId: id, roleName: role.name })
  return ok({ deleted: true })
}
