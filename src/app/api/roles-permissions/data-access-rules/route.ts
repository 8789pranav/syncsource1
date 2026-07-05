import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ensureTenant, ok, created, bad, parseBody } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") || ""
  const status = searchParams.get("status") || ""
  const where: any = { tenantId: DEFAULT_TENANT_ID }
  if (q) where.OR = [{ name: { contains: q } }, { code: { contains: q } }, { description: { contains: q } }]
  if (status) where.status = status
  const items = await db.dataAccessRule.findMany({
    where,
    include: { _count: { select: { dataScopes: true } } },
    orderBy: [{ name: "asc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest) {
  await ensureTenant()
  const body = await parseBody(req)
  if (!body.name || !body.code) return bad("Name and code are required")
  const existing = await db.dataAccessRule.findUnique({ where: { tenantId_code: { tenantId: DEFAULT_TENANT_ID, code: body.code } } })
  if (existing) return bad("Rule with this code already exists", 409)

  const rule = await db.dataAccessRule.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      name: body.name, code: body.code, description: body.description || null,
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
      status: body.status || "Active",
      createdBy: body.createdBy || null,
    },
  })
  await logPermissionAudit({ action: "DataScopeChanged", entityType: "DataAccessRule", entityId: rule.id, newValue: { name: body.name, code: body.code }, performedByName: body.performedByName })
  return created(rule)
}
