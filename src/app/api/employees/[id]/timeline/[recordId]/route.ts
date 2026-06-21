import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

// Timeline events are append-only — but allow PATCH for correction (e.g., metadata, description).
export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeTimelineEvent.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Timeline event not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeTimelineEvent.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Timeline event not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("eventType" in body) data.eventType = strOrNull(body.eventType) || existing.eventType
  if ("title" in body) data.title = strOrNull(body.title) || existing.title
  if ("description" in body) data.description = strOrNull(body.description)
  if ("eventDate" in body) data.eventDate = toDate(body.eventDate) || existing.eventDate
  if ("actorName" in body) data.actorName = strOrNull(body.actorName)
  if ("actorId" in body) data.actorId = strOrNull(body.actorId)
  if ("metadata" in body) data.metadata = strOrNull(body.metadata)
  const rec = await db.employeeTimelineEvent.update({ where: { id: recordId }, data })
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeTimelineEvent.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Timeline event not found", 404)
  await db.employeeTimelineEvent.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
