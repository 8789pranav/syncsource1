import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toBool, toNum, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeLoginAccess.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ createdAt: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const rec = await db.employeeLoginAccess.create({
    data: {
      tenantId,
      employeeId: id,
      username: strOrNull(body.username),
      email: strOrNull(body.email),
      status: strOrNull(body.status) || "Active",
      role: strOrNull(body.role) || "Employee",
      twoFactorEnabled: toBool(body.twoFactorEnabled, false) ?? false,
      forcePasswordChange: toBool(body.forcePasswordChange, true) ?? true,
      passwordResetAt: toDate(body.passwordResetAt),
      lastLoginAt: toDate(body.lastLoginAt),
      lastLoginIp: strOrNull(body.lastLoginIp),
      activeSessions: toNum(body.activeSessions) ?? 0,
    },
  })
  return created(rec)
}
