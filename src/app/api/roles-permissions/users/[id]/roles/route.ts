import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok, bad, notFound, parseBody } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userRoles = await db.userRole.findMany({
    where: { employeeId: id, tenantId: DEFAULT_TENANT_ID },
    include: { role: { include: { modulePermissions: true } } },
    orderBy: { createdAt: "desc" },
  })
  return ok({ items: userRoles })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await parseBody(req)
  if (!body.roleId) return bad("roleId is required")

  const employee = await db.employee.findUnique({ where: { id } })
  if (!employee) return notFound("Employee not found")
  const role = await db.role.findUnique({ where: { id: body.roleId } })
  if (!role) return notFound("Role not found")

  // Check duplicate
  const existing = await db.userRole.findFirst({
    where: { employeeId: id, roleId: body.roleId, status: "Active", tenantId: DEFAULT_TENANT_ID },
  })
  if (existing) return bad("User already has this role", 409)

  const userRole = await db.userRole.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      employeeId: id,
      roleId: body.roleId,
      scopeType: body.scopeType || null,
      scopeRef: body.scopeRef || null,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
      effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
      isTemporary: !!body.isTemporary,
      reason: body.reason || null,
      assignedBy: body.assignedBy || null,
      status: "Active",
    },
  })

  await logPermissionAudit({
    action: "UserRoleAssigned", entityType: "User", entityId: id,
    roleName: role.name, newValue: { roleId: body.roleId, isTemporary: !!body.isTemporary },
    performedByName: body.performedByName,
  })
  return ok(userRole)
}
