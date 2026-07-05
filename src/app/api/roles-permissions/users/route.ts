import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok } from "@/lib/api-helpers"

export async function GET(req: NextRequest) {
  const tenantId = DEFAULT_TENANT_ID
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") || ""
  const departmentId = searchParams.get("departmentId") || ""
  const hasRole = searchParams.get("hasRole") || ""

  const where: any = { tenantId }
  if (q) where.OR = [
    { firstName: { contains: q } },
    { lastName: { contains: q } },
    { displayName: { contains: q } },
    { employeeCode: { contains: q } },
    { officialEmail: { contains: q } },
  ]
  if (departmentId) where.departmentId = departmentId

  const employees = await db.employee.findMany({
    where,
    include: {
      userRoles: { include: { role: true }, where: { status: "Active" } },
      department: { select: { name: true } },
      designation: { select: { name: true } },
      entity: { select: { legalName: true } },
    },
    orderBy: [{ firstName: "asc" }],
    take: 200,
  })

  let items = employees.map(e => ({
    id: e.id,
    employeeCode: e.employeeCode,
    firstName: e.firstName,
    lastName: e.lastName,
    displayName: e.displayName,
    workEmail: e.officialEmail,
    department: e.department?.name || null,
    designation: e.designation?.name || null,
    entity: e.entity?.legalName || null,
    status: e.employeeStatus,
    roles: e.userRoles.map(ur => ({ id: ur.role.id, name: ur.role.name, code: ur.role.code, roleType: ur.role.roleType, isTemporary: ur.isTemporary, effectiveFrom: ur.effectiveFrom, effectiveTo: ur.effectiveTo })),
    roleCount: e.userRoles.length,
  }))

  if (hasRole === "yes") items = items.filter(e => e.roleCount > 0)
  if (hasRole === "no") items = items.filter(e => e.roleCount === 0)

  return ok({ items })
}
