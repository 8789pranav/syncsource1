import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { strOrNull, getEmployee, RouteCtx } from "@/lib/employee-section-helpers"

// Audit log is read-only at the section level. POST/PATCH/DELETE not exposed.
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeAuditLog.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ createdAt: "desc" }],
  })
  return ok({ items })
}
