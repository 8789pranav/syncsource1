import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, strOrNull, getEmployee, logTimeline, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeRequest.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Request not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeRequest.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Request not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("title" in body) data.title = strOrNull(body.title) || existing.title
  if ("description" in body) data.description = strOrNull(body.description)
  if ("payload" in body) data.payload = strOrNull(body.payload)
  if ("pendingWith" in body) data.pendingWith = strOrNull(body.pendingWith)
  if ("remarks" in body) data.remarks = strOrNull(body.remarks)
  if ("decidedBy" in body) data.decidedBy = strOrNull(body.decidedBy)

  if ("status" in body) {
    const newStatus = strOrNull(body.status) || existing.status
    data.status = newStatus
    if (["Approved", "Rejected", "Cancelled", "Withdrawn"].includes(newStatus)) {
      data.decidedAt = new Date()
      if (!data.decidedBy) data.decidedBy = strOrNull(body.actorName, "HR Admin")
    }
  }
  if ("decidedAt" in body) data.decidedAt = toDate(body.decidedAt)
  if ("submittedAt" in body) data.submittedAt = toDate(body.submittedAt) || existing.submittedAt
  if ("referenceId" in body) data.referenceId = strOrNull(body.referenceId)

  const rec = await db.employeeRequest.update({ where: { id: recordId }, data })

  if (existing.status !== rec.status) {
    await logTimeline({
      tenantId, employeeId: id, eventType: "Profile updated",
      title: `Request ${rec.status.toLowerCase()}`,
      description: `${rec.requestType} — ${rec.title}`,
      metadata: { requestId: rec.id, oldStatus: existing.status, newStatus: rec.status },
    })
  }

  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeRequest.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Request not found", 404)
  await db.employeeRequest.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
