import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toNum, toBool, strOrNull, getEmployee, logTimeline, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeDocument.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Document not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeDocument.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Document not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("name" in body) data.name = strOrNull(body.name) || existing.name
  if ("category" in body) data.category = strOrNull(body.category)
  if ("documentType" in body) data.documentType = strOrNull(body.documentType)
  if ("fileUrl" in body) data.fileUrl = strOrNull(body.fileUrl)
  if ("fileExt" in body) data.fileExt = strOrNull(body.fileExt)
  if ("fileSize" in body) data.fileSize = toNum(body.fileSize)
  if ("expiryDate" in body) data.expiryDate = toDate(body.expiryDate)
  if ("remarks" in body) data.remarks = strOrNull(body.remarks)
  if ("visibleToEmployee" in body) { const b = toBool(body.visibleToEmployee); if (b !== undefined) data.visibleToEmployee = b }
  if ("approvedBy" in body) data.approvedBy = strOrNull(body.approvedBy)

  // Status change to Approved/Rejected → stamp approvedAt + approvedBy
  if ("status" in body) {
    const newStatus = strOrNull(body.status) || existing.status
    data.status = newStatus
    if (newStatus === "Approved") {
      data.approvedAt = new Date()
      if (!data.approvedBy) data.approvedBy = strOrNull(body.actorName, "HR Admin")
    } else if (newStatus === "Rejected") {
      // keep approvedAt null on rejection
      if (!("approvedBy" in data)) data.approvedBy = strOrNull(body.actorName, "HR Admin")
    }
  }

  const rec = await db.employeeDocument.update({ where: { id: recordId }, data })

  // Timeline event for status transitions
  if (existing.status !== rec.status) {
    await logTimeline({
      tenantId, employeeId: id, eventType: "Profile updated",
      title: `Document ${rec.status.toLowerCase()}`,
      description: `${rec.name} — ${rec.documentType || rec.category || ""}`.trim(),
      metadata: { documentId: rec.id, oldStatus: existing.status, newStatus: rec.status },
    })
  }

  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeDocument.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Document not found", 404)
  await db.employeeDocument.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
