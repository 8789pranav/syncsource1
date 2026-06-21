import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeTransferHistory.findMany({
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
  const rec = await db.employeeTransferHistory.create({
    data: {
      tenantId,
      employeeId: id,
      oldDepartment: strOrNull(body.oldDepartment),
      newDepartment: strOrNull(body.newDepartment),
      oldLocation: strOrNull(body.oldLocation),
      newLocation: strOrNull(body.newLocation),
      oldManager: strOrNull(body.oldManager),
      newManager: strOrNull(body.newManager),
      oldEntity: strOrNull(body.oldEntity),
      newEntity: strOrNull(body.newEntity),
      effectiveDate: toDate(body.effectiveDate) || new Date(),
      reason: strOrNull(body.reason),
      status: strOrNull(body.status) || "Approved",
      approvedBy: strOrNull(body.approvedBy) || "HR Admin",
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Transferred",
    title: "Transfer logged",
    description: rec.reason || undefined,
  })
  return created(rec)
}
