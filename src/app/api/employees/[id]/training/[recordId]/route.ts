import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toFloat, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeTraining.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Training not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeTraining.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Training not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("courseName" in body) data.courseName = strOrNull(body.courseName) || existing.courseName
  if ("trainingType" in body) data.trainingType = strOrNull(body.trainingType)
  if ("startDate" in body) data.startDate = toDate(body.startDate)
  if ("endDate" in body) data.endDate = toDate(body.endDate)
  if ("status" in body) data.status = strOrNull(body.status) || existing.status
  if ("score" in body) data.score = toFloat(body.score)
  if ("certificateUrl" in body) data.certificateUrl = strOrNull(body.certificateUrl)
  if ("trainerFeedback" in body) data.trainerFeedback = strOrNull(body.trainerFeedback)
  if ("employeeFeedback" in body) data.employeeFeedback = strOrNull(body.employeeFeedback)
  const rec = await db.employeeTraining.update({ where: { id: recordId }, data })
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeTraining.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Training not found", 404)
  await db.employeeTraining.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
