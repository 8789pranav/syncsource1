import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toBool, toNum, strOrNull, getEmployee, logTimeline, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeLoginAccess.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Login access record not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeLoginAccess.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Login access record not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}

  // resetPassword / block / activate shortcuts
  if (toBool(body.resetPassword)) {
    data.forcePasswordChange = true
    data.passwordResetAt = new Date()
  }
  if (toBool(body.block)) {
    data.status = "Blocked"
  }
  if (toBool(body.activate)) {
    data.status = "Active"
  }

  if ("username" in body) data.username = strOrNull(body.username)
  if ("email" in body) data.email = strOrNull(body.email)
  if ("role" in body) data.role = strOrNull(body.role)
  if ("status" in body) data.status = strOrNull(body.status) || existing.status
  if ("twoFactorEnabled" in body) { const b = toBool(body.twoFactorEnabled); if (b !== undefined) data.twoFactorEnabled = b }
  if ("forcePasswordChange" in body) { const b = toBool(body.forcePasswordChange); if (b !== undefined) data.forcePasswordChange = b }
  if ("passwordResetAt" in body) data.passwordResetAt = toDate(body.passwordResetAt)
  if ("lastLoginAt" in body) data.lastLoginAt = toDate(body.lastLoginAt)
  if ("lastLoginIp" in body) data.lastLoginIp = strOrNull(body.lastLoginIp)
  if ("activeSessions" in body) data.activeSessions = toNum(body.activeSessions) ?? existing.activeSessions

  const rec = await db.employeeLoginAccess.update({ where: { id: recordId }, data })

  if (rec.status !== existing.status) {
    await logTimeline({
      tenantId, employeeId: id, eventType: "Profile updated",
      title: `Login access ${rec.status.toLowerCase()}`,
      description: `Status: ${existing.status} → ${rec.status}`,
    })
  }

  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeLoginAccess.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Login access record not found", 404)
  await db.employeeLoginAccess.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
