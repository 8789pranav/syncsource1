import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toNum, strOrNull, getEmployee, logTimeline, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeFormSubmission.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Form submission not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeFormSubmission.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Form submission not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("formName" in body) data.formName = strOrNull(body.formName)
  if ("version" in body) data.version = toNum(body.version) ?? existing.version
  if ("data" in body) data.data = strOrNull(body.data)
  if ("remarks" in body) data.remarks = strOrNull(body.remarks)
  if ("pdfUrl" in body) data.pdfUrl = strOrNull(body.pdfUrl)
  if ("approvedBy" in body) data.approvedBy = strOrNull(body.approvedBy)

  if ("status" in body) {
    const newStatus = strOrNull(body.status) || existing.status
    data.status = newStatus
    if (newStatus === "Submitted" && !existing.submittedAt) {
      data.submittedAt = new Date()
    }
    if (newStatus === "Approved") {
      data.approvedAt = new Date()
      if (!data.approvedBy) data.approvedBy = strOrNull(body.actorName, "HR Admin")
    }
  }

  const rec = await db.employeeFormSubmission.update({ where: { id: recordId }, data })

  if (existing.status !== rec.status) {
    await logTimeline({
      tenantId, employeeId: id, eventType: "Profile updated",
      title: `Form ${rec.formCode} ${rec.status.toLowerCase()}`,
    })
  }

  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeFormSubmission.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Form submission not found", 404)
  await db.employeeFormSubmission.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
