import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const rec = await db.salaryStructure.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { assignments: true } } },
  })
  if (!rec) return bad("Salary structure not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const existing = await db.salaryStructure.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Salary structure not found", 404)
  const body = await parseBody(req)

  const data: Record<string, unknown> = {}
  if ("name" in body) data.name = String(body.name)
  if ("description" in body) data.description = body.description ? String(body.description) : null
  const numFields = ["basicPercent", "hraPercent", "specialAllowancePercent", "conveyanceAllowance", "medicalAllowance", "bonusAmount", "pfEmployerPercent", "esiEmployerPercent", "pfEmployeePercent", "esiEmployeePercent", "professionalTax", "tdsPercent"]
  for (const f of numFields) {
    if (f in body) {
      const n = Number(body[f])
      if (!isNaN(n)) data[f] = n
    }
  }
  if ("status" in body) data.status = String(body.status)

  const updated = await db.salaryStructure.update({ where: { id }, data })
  await db.auditLog.create({
    data: { tenantId, module: "Payroll", action: "Update", recordId: id, userName: "HR Admin", details: JSON.stringify({ updatedFields: Object.keys(data) }) },
  })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const existing = await db.salaryStructure.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Salary structure not found", 404)
  await db.salaryStructure.delete({ where: { id } })
  await db.auditLog.create({
    data: { tenantId, module: "Payroll", action: "Delete", recordId: id, userName: "HR Admin", details: JSON.stringify({ code: existing.code }) },
  })
  return ok({ ok: true })
}
