import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toFloat, toBool, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeePerformanceReview.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Review not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeePerformanceReview.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Review not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("cycle" in body) data.cycle = strOrNull(body.cycle) || existing.cycle
  if ("type" in body) data.type = strOrNull(body.type)
  if ("reviewerName" in body) data.reviewerName = strOrNull(body.reviewerName)
  if ("rating" in body) data.rating = toFloat(body.rating)
  if ("comments" in body) data.comments = strOrNull(body.comments)
  if ("promotionRecommended" in body) { const b = toBool(body.promotionRecommended); if (b !== undefined) data.promotionRecommended = b }
  if ("incrementRecommended" in body) data.incrementRecommended = toFloat(body.incrementRecommended)
  if ("status" in body) {
    data.status = strOrNull(body.status) || existing.status
    if (data.status === "Finalized") data.finalizedAt = new Date()
  }
  if ("pipStatus" in body) data.pipStatus = strOrNull(body.pipStatus)
  if ("pipNotes" in body) data.pipNotes = strOrNull(body.pipNotes)
  if ("reviewDate" in body) data.reviewDate = toDate(body.reviewDate)
  if ("finalizedAt" in body) data.finalizedAt = toDate(body.finalizedAt)
  const rec = await db.employeePerformanceReview.update({ where: { id: recordId }, data })
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeePerformanceReview.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Review not found", 404)
  await db.employeePerformanceReview.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
