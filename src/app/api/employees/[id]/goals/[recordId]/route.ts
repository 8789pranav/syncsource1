import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toFloat, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeePerformanceGoal.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Goal not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeePerformanceGoal.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Goal not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("title" in body) data.title = strOrNull(body.title) || existing.title
  if ("description" in body) data.description = strOrNull(body.description)
  if ("kra" in body) data.kra = strOrNull(body.kra)
  if ("kpi" in body) data.kpi = strOrNull(body.kpi)
  if ("targetValue" in body) data.targetValue = strOrNull(body.targetValue)
  if ("achievedValue" in body) data.achievedValue = strOrNull(body.achievedValue)
  if ("progress" in body) data.progress = toFloat(body.progress)
  if ("weightage" in body) data.weightage = toFloat(body.weightage)
  if ("cycle" in body) data.cycle = strOrNull(body.cycle)
  if ("status" in body) data.status = strOrNull(body.status) || existing.status
  if ("startDate" in body) data.startDate = toDate(body.startDate)
  if ("endDate" in body) data.endDate = toDate(body.endDate)
  const rec = await db.employeePerformanceGoal.update({ where: { id: recordId }, data })
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeePerformanceGoal.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Goal not found", 404)
  await db.employeePerformanceGoal.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
