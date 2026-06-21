import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toBool, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeRoleMapping.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ assignedAt: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const role = strOrNull(body.role)
  if (!role) return bad("Role is required")
  const rec = await db.employeeRoleMapping.create({
    data: {
      tenantId,
      employeeId: id,
      role,
      scopeType: strOrNull(body.scopeType) || "Global",
      scopeRef: strOrNull(body.scopeRef),
      modulePermissions: strOrNull(body.modulePermissions),
      fieldPermissions: strOrNull(body.fieldPermissions),
      reportPermissions: strOrNull(body.reportPermissions),
      assignedBy: strOrNull(body.assignedBy) || "HR Admin",
      isActive: toBool(body.isActive, true) ?? true,
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Profile updated",
    title: "Role assigned",
    description: `${role} (${rec.scopeType})`,
  })
  return created(rec)
}
