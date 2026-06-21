import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toBool, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeRoleMapping.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Role mapping not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeRoleMapping.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Role mapping not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("role" in body) data.role = strOrNull(body.role) || existing.role
  if ("scopeType" in body) data.scopeType = strOrNull(body.scopeType)
  if ("scopeRef" in body) data.scopeRef = strOrNull(body.scopeRef)
  if ("modulePermissions" in body) data.modulePermissions = strOrNull(body.modulePermissions)
  if ("fieldPermissions" in body) data.fieldPermissions = strOrNull(body.fieldPermissions)
  if ("reportPermissions" in body) data.reportPermissions = strOrNull(body.reportPermissions)
  if ("assignedBy" in body) data.assignedBy = strOrNull(body.assignedBy)
  if ("isActive" in body) { const b = toBool(body.isActive); if (b !== undefined) data.isActive = b }
  const rec = await db.employeeRoleMapping.update({ where: { id: recordId }, data })
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeRoleMapping.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Role mapping not found", 404)
  await db.employeeRoleMapping.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
