import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toFloat, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeePromotionHistory.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const rec = await db.employeePromotionHistory.create({
    data: {
      tenantId,
      employeeId: id,
      oldDesignation: strOrNull(body.oldDesignation),
      newDesignation: strOrNull(body.newDesignation),
      oldGrade: strOrNull(body.oldGrade),
      newGrade: strOrNull(body.newGrade),
      oldCtc: toFloat(body.oldCtc),
      newCtc: toFloat(body.newCtc),
      effectiveDate: toDate(body.effectiveDate) || new Date(),
      reason: strOrNull(body.reason),
      status: strOrNull(body.status) || "Approved",
      approvedBy: strOrNull(body.approvedBy) || "HR Admin",
      letterUrl: strOrNull(body.letterUrl),
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Promoted",
    title: "Promotion logged",
    description: `${rec.oldDesignation || ""} → ${rec.newDesignation || ""}`.trim() || undefined,
  })
  return created(rec)
}
