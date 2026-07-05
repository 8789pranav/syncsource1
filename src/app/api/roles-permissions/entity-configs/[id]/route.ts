import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, parseBody } from "@/lib/api-helpers"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await parseBody(req)
  const existing = await db.roleEntityConfig.findUnique({ where: { id } })
  if (!existing) return notFound("Config not found")
  const allowedFields = [
    "useTenantDefault", "defaultEmployeeRole", "defaultManagerRole", "defaultHrRole",
    "defaultPayrollRole", "defaultDocumentRole", "defaultOnboardingRole", "defaultOffboardingRole",
    "defaultLeaveAdminRole", "defaultAttendanceAdminRole", "defaultDataScope", "defaultFieldMasking",
    "defaultMfaRule", "defaultLoginPolicy", "effectiveFrom", "effectiveTo", "status",
  ]
  const updateData: any = {}
  for (const f of allowedFields) {
    if (body[f] !== undefined) updateData[f] = body[f]
  }
  const updated = await db.roleEntityConfig.update({ where: { id }, data: updateData })
  return ok(updated)
}
