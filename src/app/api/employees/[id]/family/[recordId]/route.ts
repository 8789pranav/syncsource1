import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toBool, toFloat, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeFamilyMember.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Family member not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeFamilyMember.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Family member not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("name" in body) data.name = strOrNull(body.name) || existing.name
  if ("relationship" in body) data.relationship = strOrNull(body.relationship)
  if ("gender" in body) data.gender = strOrNull(body.gender)
  if ("dateOfBirth" in body) data.dateOfBirth = toDate(body.dateOfBirth)
  if ("mobileNumber" in body) data.mobileNumber = strOrNull(body.mobileNumber)
  if ("occupation" in body) data.occupation = strOrNull(body.occupation)
  if ("isDependent" in body) { const b = toBool(body.isDependent); if (b !== undefined) data.isDependent = b }
  if ("isNominee" in body) { const b = toBool(body.isNominee); if (b !== undefined) data.isNominee = b }
  if ("nomineePercentage" in body) data.nomineePercentage = toFloat(body.nomineePercentage)
  if ("insuranceApplicable" in body) { const b = toBool(body.insuranceApplicable); if (b !== undefined) data.insuranceApplicable = b }
  const rec = await db.employeeFamilyMember.update({ where: { id: recordId }, data })
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeFamilyMember.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Family member not found", 404)
  await db.employeeFamilyMember.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
