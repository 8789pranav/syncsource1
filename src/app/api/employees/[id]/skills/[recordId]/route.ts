import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toFloat, toBool, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeSkill.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Skill not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeSkill.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Skill not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("name" in body) data.name = strOrNull(body.name) || existing.name
  if ("category" in body) data.category = strOrNull(body.category)
  if ("proficiency" in body) data.proficiency = strOrNull(body.proficiency)
  if ("yearsOfExperience" in body) data.yearsOfExperience = toFloat(body.yearsOfExperience)
  if ("verifiedByManager" in body) { const b = toBool(body.verifiedByManager); if (b !== undefined) data.verifiedByManager = b }
  if ("lastUsedDate" in body) data.lastUsedDate = toDate(body.lastUsedDate)
  const rec = await db.employeeSkill.update({ where: { id: recordId }, data })
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeSkill.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Skill not found", 404)
  await db.employeeSkill.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
