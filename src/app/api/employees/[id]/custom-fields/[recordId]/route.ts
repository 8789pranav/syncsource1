import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toBool, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeCustomFieldValue.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Custom field not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeCustomFieldValue.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Custom field not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("fieldLabel" in body) data.fieldLabel = strOrNull(body.fieldLabel)
  if ("fieldType" in body) data.fieldType = strOrNull(body.fieldType)
  if ("value" in body) data.value = strOrNull(body.value)
  if ("category" in body) data.category = strOrNull(body.category)
  if ("isMandatory" in body) { const b = toBool(body.isMandatory); if (b !== undefined) data.isMandatory = b }
  if ("approvalRequired" in body) { const b = toBool(body.approvalRequired); if (b !== undefined) data.approvalRequired = b }
  const rec = await db.employeeCustomFieldValue.update({ where: { id: recordId }, data })
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeCustomFieldValue.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Custom field not found", 404)
  await db.employeeCustomFieldValue.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
