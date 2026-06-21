import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toNum, strOrNull, getEmployee, logTimeline, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeHelpdeskTicket.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Ticket not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeHelpdeskTicket.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Ticket not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("subject" in body) data.subject = strOrNull(body.subject) || existing.subject
  if ("category" in body) data.category = strOrNull(body.category)
  if ("priority" in body) data.priority = strOrNull(body.priority) || existing.priority
  if ("description" in body) data.description = strOrNull(body.description)
  if ("assignedTo" in body) data.assignedTo = strOrNull(body.assignedTo)
  if ("slaHours" in body) data.slaHours = toNum(body.slaHours)
  if ("slaStatus" in body) data.slaStatus = strOrNull(body.slaStatus)
  if ("resolution" in body) data.resolution = strOrNull(body.resolution)
  if ("feedback" in body) data.feedback = strOrNull(body.feedback)
  if ("rating" in body) data.rating = toNum(body.rating)
  if ("attachmentUrl" in body) data.attachmentUrl = strOrNull(body.attachmentUrl)

  if ("status" in body) {
    const newStatus = strOrNull(body.status) || existing.status
    data.status = newStatus
    if (newStatus === "Resolved" && !existing.resolvedAt) {
      data.resolvedAt = new Date()
    } else if (newStatus === "Closed" && !existing.resolvedAt) {
      data.resolvedAt = new Date()
    } else if (newStatus === "Reopened") {
      data.resolvedAt = null
    }
  }
  if ("resolvedAt" in body) data.resolvedAt = toDate(body.resolvedAt)

  const rec = await db.employeeHelpdeskTicket.update({ where: { id: recordId }, data })

  if (existing.status !== rec.status) {
    await logTimeline({
      tenantId, employeeId: id, eventType: "Profile updated",
      title: `Ticket ${rec.status.toLowerCase()}`,
      description: `${rec.ticketCode} — ${rec.subject}`,
      metadata: { ticketId: rec.id, ticketCode: rec.ticketCode, oldStatus: existing.status, newStatus: rec.status },
    })
  }

  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeHelpdeskTicket.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Ticket not found", 404)
  await db.employeeHelpdeskTicket.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
