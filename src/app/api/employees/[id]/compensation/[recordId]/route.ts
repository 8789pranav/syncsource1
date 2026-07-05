import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toFloat, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeCompensationHistory.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Compensation record not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeCompensationHistory.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Compensation record not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("effectiveDate" in body) data.effectiveDate = toDate(body.effectiveDate) || existing.effectiveDate
  if ("newCtc" in body) data.newCtc = toFloat(body.newCtc)
  if ("newBasic" in body) data.newBasic = toFloat(body.newBasic)
  if ("newHra" in body) data.newHra = toFloat(body.newHra)
  if ("oldCtc" in body) data.oldCtc = toFloat(body.oldCtc)
  if ("oldBasic" in body) data.oldBasic = toFloat(body.oldBasic)
  if ("oldHra" in body) data.oldHra = toFloat(body.oldHra)
  if ("incrementPercent" in body) data.incrementPercent = toFloat(body.incrementPercent)
  if ("revisionReason" in body) data.revisionReason = strOrNull(body.revisionReason)
  if ("promotionMapping" in body) data.promotionMapping = strOrNull(body.promotionMapping)
  if ("approvedBy" in body) data.approvedBy = strOrNull(body.approvedBy)
  if ("status" in body) data.status = strOrNull(body.status) || existing.status
  if ("letterUrl" in body) data.letterUrl = strOrNull(body.letterUrl)
  const rec = await db.employeeCompensationHistory.update({ where: { id: recordId }, data })
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeCompensationHistory.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Compensation record not found", 404)
  await db.employeeCompensationHistory.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
