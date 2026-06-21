import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toFloat, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeePromotionHistory.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Promotion record not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeePromotionHistory.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Promotion record not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  for (const k of ["oldDesignation", "newDesignation", "oldGrade", "newGrade", "reason", "status", "approvedBy", "letterUrl"]) {
    if (k in body) data[k] = strOrNull(body[k])
  }
  if ("oldCtc" in body) data.oldCtc = toFloat(body.oldCtc)
  if ("newCtc" in body) data.newCtc = toFloat(body.newCtc)
  if ("effectiveDate" in body) data.effectiveDate = toDate(body.effectiveDate) || existing.effectiveDate
  const rec = await db.employeePromotionHistory.update({ where: { id: recordId }, data })
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeePromotionHistory.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Promotion record not found", 404)
  await db.employeePromotionHistory.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
