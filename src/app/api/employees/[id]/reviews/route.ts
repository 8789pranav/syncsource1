import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toFloat, toBool, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeePerformanceReview.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ cycle: "desc" }, { createdAt: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const cycle = strOrNull(body.cycle)
  if (!cycle) return bad("Review cycle is required")
  const rec = await db.employeePerformanceReview.create({
    data: {
      tenantId,
      employeeId: id,
      cycle,
      type: strOrNull(body.type) || "Self",
      reviewerName: strOrNull(body.reviewerName),
      rating: toFloat(body.rating),
      comments: strOrNull(body.comments),
      promotionRecommended: toBool(body.promotionRecommended, false) ?? false,
      incrementRecommended: toFloat(body.incrementRecommended),
      status: strOrNull(body.status) || "Draft",
      pipStatus: strOrNull(body.pipStatus),
      pipNotes: strOrNull(body.pipNotes),
      reviewDate: toDate(body.reviewDate),
      finalizedAt: toDate(body.finalizedAt),
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Profile updated",
    title: "Performance review created",
    description: `${cycle} (${rec.type})`,
  })
  return created(rec)
}
