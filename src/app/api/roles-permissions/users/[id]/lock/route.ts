import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, notFound } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

// POST /api/roles-permissions/users/[id]/lock
// Toggle lock status of a user's login access (creates login access if missing).
// Body: { locked?: boolean (true = lock, false = unlock; omit = toggle) }
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({} as any))

  const employee = await db.employee.findFirst({
    where: { id, tenantId },
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
  })
  if (!employee) return notFound("Employee not found")

  // Find or create the login access record
  let loginAccess = await db.employeeLoginAccess.findFirst({
    where: { employeeId: id, tenantId },
    orderBy: { createdAt: "desc" },
  })

  if (!loginAccess) {
    // Create a fresh one — default Active, then we'll toggle below
    loginAccess = await db.employeeLoginAccess.create({
      data: {
        tenantId, employeeId: id,
        email: employee.employeeCode ? `${employee.employeeCode.toLowerCase()}@hrms.local` : null,
        username: employee.employeeCode,
        status: "Active",
        forcePasswordChange: true,
      },
    })
  }

  const currentLocked = loginAccess.status === "Locked"
  const shouldLock = typeof body.locked === "boolean" ? body.locked : !currentLocked
  const newStatus = shouldLock ? "Locked" : "Active"

  if (loginAccess.status !== newStatus) {
    const updated = await db.employeeLoginAccess.update({
      where: { id: loginAccess.id },
      data: { status: newStatus },
    })

    await logPermissionAudit({
      action: shouldLock ? "LoginAttempt" : "LoginAttempt",
      entityType: "User",
      entityId: id,
      oldValue: { status: loginAccess.status },
      newValue: { status: newStatus },
      performedByName: "Admin",
      reason: shouldLock ? "Account locked by admin" : "Account unlocked by admin",
      status: "Success",
    })

    return ok({
      id: updated.id,
      employeeId: id,
      status: updated.status,
      locked: shouldLock,
    })
  }

  return ok({
    id: loginAccess.id,
    employeeId: id,
    status: loginAccess.status,
    locked: loginAccess.status === "Locked",
    unchanged: true,
  })
}

// Helper for callers: PATCH = alias of POST with body
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return POST(req, ctx)
}

// Suppress unused param lint for `bad` import (kept for parity with other routes)
void bad
