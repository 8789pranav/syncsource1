import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toFloat, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeExperience.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Experience record not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeExperience.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Experience record not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("companyName" in body) data.companyName = strOrNull(body.companyName) || existing.companyName
  if ("designation" in body) data.designation = strOrNull(body.designation)
  if ("department" in body) data.department = strOrNull(body.department)
  if ("startDate" in body) data.startDate = toDate(body.startDate)
  if ("endDate" in body) data.endDate = toDate(body.endDate)
  if ("totalYears" in body) data.totalYears = toFloat(body.totalYears)
  if ("reasonForLeaving" in body) data.reasonForLeaving = strOrNull(body.reasonForLeaving)
  if ("previousSalary" in body) data.previousSalary = toFloat(body.previousSalary)
  if ("managerName" in body) data.managerName = strOrNull(body.managerName)
  if ("managerContact" in body) data.managerContact = strOrNull(body.managerContact)
  if ("experienceLetterUrl" in body) data.experienceLetterUrl = strOrNull(body.experienceLetterUrl)
  if ("relievingLetterUrl" in body) data.relievingLetterUrl = strOrNull(body.relievingLetterUrl)
  if ("lastPayslipUrl" in body) data.lastPayslipUrl = strOrNull(body.lastPayslipUrl)
  if ("verificationStatus" in body) data.verificationStatus = strOrNull(body.verificationStatus)
  const rec = await db.employeeExperience.update({ where: { id: recordId }, data })
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeExperience.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Experience record not found", 404)
  await db.employeeExperience.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
