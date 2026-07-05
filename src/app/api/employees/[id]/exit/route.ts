import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toNum, toFloat, toBool, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeExit.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ resignationDate: "desc" }, { createdAt: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const resignationDate = toDate(body.resignationDate)
  if (!resignationDate) return bad("Resignation date is required")
  const rec = await db.employeeExit.create({
    data: {
      tenantId,
      employeeId: id,
      resignationDate,
      lastWorkingDate: toDate(body.lastWorkingDate),
      reason: strOrNull(body.reason),
      status: strOrNull(body.status) || "Resignation submitted",
      noticePeriodDays: toNum(body.noticePeriodDays),
      noticeRecoveryDays: toNum(body.noticeRecoveryDays),
      noticeRecoveryAmount: toFloat(body.noticeRecoveryAmount),
      exitInterviewNotes: strOrNull(body.exitInterviewNotes),
      clearanceHR: toBool(body.clearanceHR, false) ?? false,
      clearanceIT: toBool(body.clearanceIT, false) ?? false,
      clearanceAdmin: toBool(body.clearanceAdmin, false) ?? false,
      clearanceFinance: toBool(body.clearanceFinance, false) ?? false,
      clearanceManager: toBool(body.clearanceManager, false) ?? false,
      clearancePayroll: toBool(body.clearancePayroll, false) ?? false,
      finalSettlement: toFloat(body.finalSettlement),
      relievingLetterUrl: strOrNull(body.relievingLetterUrl),
      experienceLetterUrl: strOrNull(body.experienceLetterUrl),
      approvedBy: strOrNull(body.approvedBy),
      approvedAt: toDate(body.approvedAt),
    },
  })
  // Sync Employee.exitStatus, resignationDate, lastWorkingDate
  await db.employee.update({
    where: { id },
    data: {
      resignationDate: rec.resignationDate,
      lastWorkingDate: rec.lastWorkingDate,
      resignationReason: rec.reason,
      exitStatus: rec.status,
      employeeStatus: "On Notice",
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Resignation submitted",
    title: "Resignation submitted",
    description: rec.reason || undefined,
  })
  return created(rec)
}
