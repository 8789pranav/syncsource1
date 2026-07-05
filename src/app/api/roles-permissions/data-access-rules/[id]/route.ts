import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok, bad, notFound, parseBody } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rule = await db.dataAccessRule.findUnique({
    where: { id },
    include: { _count: { select: { dataScopes: true } } },
  })
  if (!rule) return notFound("Rule not found")
  return ok(rule)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rule = await db.dataAccessRule.findUnique({ where: { id } })
  if (!rule) return notFound("Rule not found")
  const body = await parseBody(req)
  const updated = await db.dataAccessRule.update({
    where: { id },
    data: {
      name: body.name, description: body.description,
      entityId: body.entityId || null,
      branchIds: body.branchIds ? JSON.stringify(body.branchIds) : null,
      locationIds: body.locationIds ? JSON.stringify(body.locationIds) : null,
      departmentIds: body.departmentIds ? JSON.stringify(body.departmentIds) : null,
      gradeIds: body.gradeIds ? JSON.stringify(body.gradeIds) : null,
      designationIds: body.designationIds ? JSON.stringify(body.designationIds) : null,
      employeeTypeIds: body.employeeTypeIds ? JSON.stringify(body.employeeTypeIds) : null,
      businessUnitIds: body.businessUnitIds ? JSON.stringify(body.businessUnitIds) : null,
      costCenterIds: body.costCenterIds ? JSON.stringify(body.costCenterIds) : null,
      managerRelation: body.managerRelation || null,
      includeEmployees: body.includeEmployees ? JSON.stringify(body.includeEmployees) : null,
      excludeEmployees: body.excludeEmployees ? JSON.stringify(body.excludeEmployees) : null,
      includeFutureJoiners: !!body.includeFutureJoiners,
      includeExited: !!body.includeExited,
      includeNotice: !!body.includeNotice,
      status: body.status,
    },
  })
  await logPermissionAudit({ action: "DataScopeChanged", entityType: "DataAccessRule", entityId: id, oldValue: rule, newValue: updated, performedByName: body.performedByName })
  return ok(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rule = await db.dataAccessRule.findUnique({ where: { id }, include: { _count: { select: { dataScopes: true } } } })
  if (!rule) return notFound("Rule not found")
  if (rule._count.dataScopes > 0) return bad("Cannot delete: rule is linked to roles. Unlink first.", 409)
  await db.dataAccessRule.delete({ where: { id } })
  await logPermissionAudit({ action: "DataScopeChanged", entityType: "DataAccessRule", entityId: id, oldValue: { name: rule.name }, performedByName: "system" })
  return ok({ deleted: true })
}
