import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound } from "@/lib/api-helpers"
import { computeEffectivePermission } from "@/lib/permissions-engine"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const employee = await db.employee.findUnique({
    where: { id },
    select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, officialEmail: true, departmentId: true, department: { select: { name: true } }, designation: { select: { name: true } } },
  })
  if (!employee) return notFound("Employee not found")
  const perm = await computeEffectivePermission(id)
  return ok({ employee, ...perm })
}
