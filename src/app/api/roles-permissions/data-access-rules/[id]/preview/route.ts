import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok, notFound } from "@/lib/api-helpers"
import { parseJsonArray } from "@/lib/permissions-constants"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rule = await db.dataAccessRule.findUnique({ where: { id } })
  if (!rule) return notFound("Rule not found")

  const where: any = { tenantId: DEFAULT_TENANT_ID }
  const deptIds = parseJsonArray(rule.departmentIds)
  if (deptIds.length) where.departmentId = { in: deptIds }
  const locIds = parseJsonArray(rule.locationIds)
  // Location not directly on Employee in some schemas; skip if no field
  const includeIds = parseJsonArray(rule.includeEmployees)
  const excludeIds = parseJsonArray(rule.excludeEmployees)
  if (includeIds.length) where.id = { in: includeIds }
  if (excludeIds.length) where.id = { ...(where.id || {}), notIn: excludeIds }
  if (rule.includeExited === false) where.status = { notIn: ["Resigned", "Exited"] }

  const employees = await db.employee.findMany({
    where,
    select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, department: { select: { name: true } } },
    take: 10,
    orderBy: { firstName: "asc" },
  })
  const total = await db.employee.count({ where })
  return ok({ employees, total, sample: employees.length })
}
