import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, strOrNull, getEmployee, logTimeline, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeProbation.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Probation record not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeProbation.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Probation record not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("startDate" in body) data.startDate = toDate(body.startDate) || existing.startDate
  if ("endDate" in body) data.endDate = toDate(body.endDate) || existing.endDate
  if ("reviewDueDate" in body) data.reviewDueDate = toDate(body.reviewDueDate)
  if ("managerFeedback" in body) data.managerFeedback = strOrNull(body.managerFeedback)
  if ("hrFeedback" in body) data.hrFeedback = strOrNull(body.hrFeedback)
  if ("extendedEndDate" in body) data.extendedEndDate = toDate(body.extendedEndDate)
  if ("confirmedBy" in body) data.confirmedBy = strOrNull(body.confirmedBy)

  const oldStatus = existing.status
  if ("status" in body) {
    const newStatus = strOrNull(body.status) || existing.status
    data.status = newStatus
    if (newStatus === "Confirmed" && !existing.confirmedDate) {
      data.confirmedDate = new Date()
      data.confirmedBy = strOrNull(body.confirmedBy) || strOrNull(body.actorName) || "HR Admin"
    }
    if (newStatus === "Extended" && !existing.extendedEndDate) {
      data.extendedEndDate = toDate(body.extendedEndDate) || undefined
    }
  }

  const rec = await db.employeeProbation.update({ where: { id: recordId }, data })

  // Sync to Employee.probationStatus when status changes to Confirmed/Extended
  if (oldStatus !== rec.status) {
    const empUpdate: Record<string, unknown> = {}
    if (rec.status === "Confirmed") {
      empUpdate.probationStatus = "Confirmed"
      empUpdate.confirmationDate = rec.confirmedDate
    } else if (rec.status === "Extended") {
      empUpdate.probationStatus = "Extended"
      if (rec.extendedEndDate) empUpdate.probationEndDate = rec.extendedEndDate
    } else if (rec.status === "On Probation") {
      empUpdate.probationStatus = "On Probation"
    } else if (rec.status === "Not Confirmed") {
      empUpdate.probationStatus = "Not Confirmed"
    }
    if (Object.keys(empUpdate).length) {
      await db.employee.update({ where: { id }, data: empUpdate })
    }
    await logTimeline({
      tenantId, employeeId: id,
      eventType: rec.status === "Confirmed" ? "Probation confirmed" : "Profile updated",
      title: `Probation ${rec.status.toLowerCase()}`,
      description: `Status: ${oldStatus} → ${rec.status}`,
    })
  }

  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeProbation.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Probation record not found", 404)
  await db.employeeProbation.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
