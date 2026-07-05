import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeProbation.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ startDate: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const startDate = toDate(body.startDate)
  if (!startDate) return bad("Start date is required")
  const endDate = toDate(body.endDate)
  if (!endDate) return bad("End date is required")
  const rec = await db.employeeProbation.create({
    data: {
      tenantId,
      employeeId: id,
      startDate,
      endDate,
      reviewDueDate: toDate(body.reviewDueDate),
      status: strOrNull(body.status) || "On Probation",
      managerFeedback: strOrNull(body.managerFeedback),
      hrFeedback: strOrNull(body.hrFeedback),
      extendedEndDate: toDate(body.extendedEndDate),
      confirmedDate: toDate(body.confirmedDate),
      confirmedBy: strOrNull(body.confirmedBy),
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Profile updated",
    title: "Probation record created",
    description: `${startDate.toISOString().slice(0,10)} → ${endDate.toISOString().slice(0,10)}`,
  })
  return created(rec)
}
