import { NextRequest } from "next.server"
import { db } from "@/lib/db"
import { ok, notFound, parseBody } from "@/lib/api-helpers"

// ---------- GET single ----------
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await db.roleEntityConfig.findUnique({ where: { id } })
  if (!existing) return notFound("Config not found")
  return ok(existing)
}

// ---------- PATCH update ----------
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
    if (body[f] === undefined) continue
    const v = body[f]
    if (v === "") {
      if (f !== "status") updateData[f] = null
    } else if ((f === "effectiveFrom" || f === "effectiveTo") && v) {
      const d = new Date(v)
      updateData[f] = isNaN(d.getTime()) ? null : d
    } else {
      updateData[f] = v
    }
  }
  const updated = await db.roleEntityConfig.update({ where: { id }, data: updateData })
  return ok(updated)
}

// ---------- DELETE ----------
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = await db.roleEntityConfig.findUnique({ where: { id } })
  if (!existing) return notFound("Config not found")
  await db.roleEntityConfig.delete({ where: { id } })
  return ok({ id, deleted: true })
}
