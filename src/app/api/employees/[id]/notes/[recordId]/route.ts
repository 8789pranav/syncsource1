import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toBool, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeNote.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Note not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeNote.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Note not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("body" in body) data.body = strOrNull(body.body) || existing.body
  if ("category" in body) data.category = strOrNull(body.category) || existing.category
  if ("isPrivate" in body) { const b = toBool(body.isPrivate); if (b !== undefined) data.isPrivate = b }
  if ("visibleToManager" in body) { const b = toBool(body.visibleToManager); if (b !== undefined) data.visibleToManager = b }
  if ("attachmentUrl" in body) data.attachmentUrl = strOrNull(body.attachmentUrl)
  if ("createdBy" in body) data.createdBy = strOrNull(body.createdBy)
  const rec = await db.employeeNote.update({ where: { id: recordId }, data })
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeNote.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Note not found", 404)
  await db.employeeNote.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
