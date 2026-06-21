import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toNum, toFloat, toBool, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeEducation.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Education record not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeEducation.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Education record not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("qualification" in body) data.qualification = strOrNull(body.qualification)
  if ("degree" in body) data.degree = strOrNull(body.degree)
  if ("specialization" in body) data.specialization = strOrNull(body.specialization)
  if ("institute" in body) data.institute = strOrNull(body.institute)
  if ("university" in body) data.university = strOrNull(body.university)
  if ("yearOfPassing" in body) data.yearOfPassing = toNum(body.yearOfPassing)
  if ("percentage" in body) data.percentage = toFloat(body.percentage)
  if ("cgpa" in body) data.cgpa = toFloat(body.cgpa)
  if ("educationType" in body) data.educationType = strOrNull(body.educationType)
  if ("isHighest" in body) { const b = toBool(body.isHighest); if (b !== undefined) data.isHighest = b }
  if ("certificateUrl" in body) data.certificateUrl = strOrNull(body.certificateUrl)
  const rec = await db.employeeEducation.update({ where: { id: recordId }, data })
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeEducation.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Education record not found", 404)
  await db.employeeEducation.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
