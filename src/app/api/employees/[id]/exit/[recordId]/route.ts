import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toNum, toFloat, toBool, strOrNull, getEmployee, logTimeline, RecordCtx } from "@/lib/employee-section-helpers"

const EXIT_PIPELINE = [
  "Resignation submitted",
  "Manager approved",
  "HR approved",
  "Clearance pending",
  "FnF pending",
  "Exit completed",
  "Rejected",
]

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeExit.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Exit record not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeExit.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Exit record not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}

  // Allow advanceStatus as a convenience: moves to next pipeline stage
  if ("advanceStatus" in body && toBool(body.advanceStatus)) {
    const idx = EXIT_PIPELINE.indexOf(existing.status)
    if (idx >= 0 && idx < EXIT_PIPELINE.length - 2) {
      data.status = EXIT_PIPELINE[idx + 1]
      if (data.status === "Exit completed") {
        data.approvedAt = new Date()
        if (!("approvedBy" in data)) data.approvedBy = strOrNull(body.actorName, "HR Admin")
      }
    }
  } else if ("status" in body) {
    data.status = strOrNull(body.status) || existing.status
    if (data.status === "Exit completed") {
      data.approvedAt = new Date()
      if (!("approvedBy" in data)) data.approvedBy = strOrNull(body.actorName, "HR Admin")
    }
  }

  if ("lastWorkingDate" in body) data.lastWorkingDate = toDate(body.lastWorkingDate)
  if ("reason" in body) data.reason = strOrNull(body.reason)
  if ("noticePeriodDays" in body) data.noticePeriodDays = toNum(body.noticePeriodDays)
  if ("noticeRecoveryDays" in body) data.noticeRecoveryDays = toNum(body.noticeRecoveryDays)
  if ("noticeRecoveryAmount" in body) data.noticeRecoveryAmount = toFloat(body.noticeRecoveryAmount)
  if ("exitInterviewNotes" in body) data.exitInterviewNotes = strOrNull(body.exitInterviewNotes)
  if ("clearanceHR" in body) { const b = toBool(body.clearanceHR); if (b !== undefined) data.clearanceHR = b }
  if ("clearanceIT" in body) { const b = toBool(body.clearanceIT); if (b !== undefined) data.clearanceIT = b }
  if ("clearanceAdmin" in body) { const b = toBool(body.clearanceAdmin); if (b !== undefined) data.clearanceAdmin = b }
  if ("clearanceFinance" in body) { const b = toBool(body.clearanceFinance); if (b !== undefined) data.clearanceFinance = b }
  if ("clearanceManager" in body) { const b = toBool(body.clearanceManager); if (b !== undefined) data.clearanceManager = b }
  if ("clearancePayroll" in body) { const b = toBool(body.clearancePayroll); if (b !== undefined) data.clearancePayroll = b }
  if ("finalSettlement" in body) data.finalSettlement = toFloat(body.finalSettlement)
  if ("relievingLetterUrl" in body) data.relievingLetterUrl = strOrNull(body.relievingLetterUrl)
  if ("experienceLetterUrl" in body) data.experienceLetterUrl = strOrNull(body.experienceLetterUrl)
  if ("approvedBy" in body) data.approvedBy = strOrNull(body.approvedBy)
  if ("approvedAt" in body) data.approvedAt = toDate(body.approvedAt)

  const rec = await db.employeeExit.update({ where: { id: recordId }, data })

  // Sync Employee.exitStatus + employeeStatus
  if (rec.status !== existing.status) {
    const empUpdate: Record<string, unknown> = { exitStatus: rec.status }
    if (rec.status === "Exit completed") empUpdate.employeeStatus = "Resigned"
    if (rec.status === "Rejected") empUpdate.employeeStatus = "Active"
    await db.employee.update({ where: { id }, data: empUpdate })
    await logTimeline({
      tenantId, employeeId: id,
      eventType: rec.status === "Exit completed" ? "Exit completed" : "Profile updated",
      title: `Exit status: ${rec.status}`,
      description: `${existing.status} → ${rec.status}`,
    })
  }

  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeExit.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Exit record not found", 404)
  await db.employeeExit.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
