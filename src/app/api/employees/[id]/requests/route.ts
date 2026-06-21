import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeRequest.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const requestType = strOrNull(body.requestType)
  const title = strOrNull(body.title)
  if (!requestType) return bad("Request type is required")
  if (!title) return bad("Title is required")
  const rec = await db.employeeRequest.create({
    data: {
      tenantId,
      employeeId: id,
      requestType,
      referenceId: strOrNull(body.referenceId),
      title,
      description: strOrNull(body.description),
      payload: strOrNull(body.payload),
      status: strOrNull(body.status) || "Pending",
      pendingWith: strOrNull(body.pendingWith),
      submittedAt: toDate(body.submittedAt) || new Date(),
      decidedAt: toDate(body.decidedAt),
      decidedBy: strOrNull(body.decidedBy),
      remarks: strOrNull(body.remarks),
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Profile updated",
    title: "Request raised",
    description: `${requestType} — ${title}`,
    metadata: { requestId: rec.id, requestType },
  })
  return created(rec)
}
