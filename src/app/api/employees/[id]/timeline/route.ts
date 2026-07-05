import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, strOrNull, getEmployee, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeTimelineEvent.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const eventType = strOrNull(body.eventType) || "Profile updated"
  const title = strOrNull(body.title) || eventType
  const rec = await db.employeeTimelineEvent.create({
    data: {
      tenantId,
      employeeId: id,
      eventType,
      title,
      description: strOrNull(body.description),
      eventDate: toDate(body.eventDate) || new Date(),
      actorId: strOrNull(body.actorId),
      actorName: strOrNull(body.actorName) || "HR Admin",
      metadata: strOrNull(body.metadata),
    },
  })
  return created(rec)
}
