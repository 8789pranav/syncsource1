import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad } from "@/lib/api-helpers"

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const existing = await db.salaryAssignment.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Salary assignment not found", 404)
  await db.salaryAssignment.delete({ where: { id } })
  await db.auditLog.create({
    data: { tenantId, module: "Payroll", action: "Delete", recordId: id, userName: "HR Admin", details: JSON.stringify({ employeeId: existing.employeeId }) },
  })
  return ok({ ok: true })
}
