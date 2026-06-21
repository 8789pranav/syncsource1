import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, strOrNull, getEmployee, RouteCtx } from "@/lib/employee-section-helpers"

// Status history — GET only at the section level (records are created internally by PATCH on employee).
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeStatusHistory.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
  })
  return ok({ items })
}

// Allow manual log entry (rare use) — but typically created by employee PATCH.
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const newStatus = strOrNull(body.newStatus)
  if (!newStatus) return bad("newStatus is required")
  const rec = await db.employeeStatusHistory.create({
    data: {
      tenantId,
      employeeId: id,
      oldStatus: strOrNull(body.oldStatus),
      newStatus,
      effectiveDate: toDate(body.effectiveDate) || new Date(),
      reason: strOrNull(body.reason),
      changedBy: strOrNull(body.changedBy) || "HR Admin",
    },
  })
  return ok(rec)
}
