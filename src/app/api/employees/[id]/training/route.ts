import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toFloat, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeTraining.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const courseName = strOrNull(body.courseName)
  if (!courseName) return bad("Course name is required")
  const rec = await db.employeeTraining.create({
    data: {
      tenantId,
      employeeId: id,
      courseName,
      trainingType: strOrNull(body.trainingType) || "Online",
      startDate: toDate(body.startDate),
      endDate: toDate(body.endDate),
      status: strOrNull(body.status) || "Assigned",
      score: toFloat(body.score),
      certificateUrl: strOrNull(body.certificateUrl),
      trainerFeedback: strOrNull(body.trainerFeedback),
      employeeFeedback: strOrNull(body.employeeFeedback),
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Profile updated",
    title: "Training assigned",
    description: `${courseName} (${rec.trainingType})`,
  })
  return created(rec)
}
