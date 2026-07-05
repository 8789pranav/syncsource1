import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok, notFound, parseBody } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await parseBody(req)
  const ar = await db.accessRequest.findUnique({ where: { id } })
  if (!ar) return notFound("Access request not found")
  if (!["PendingApproval", "Submitted"].includes(ar.status)) return ok({ error: "Already processed" })

  const updated = await db.accessRequest.update({
    where: { id },
    data: {
      status: "Approved",
      approvedById: body.approvedById || null,
      approvedAt: new Date(),
      approverComments: body.approverComments || null,
    },
  })

  // If temporary access with role, create a UserRole
  if (ar.requestType === "TemporaryAccess" && ar.requestedRole && ar.requiredTo) {
    const existing = await db.userRole.findFirst({ where: { employeeId: ar.requestedById, roleId: ar.requestedRole, status: "Active" } })
    if (!existing) {
      await db.userRole.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          employeeId: ar.requestedById, roleId: ar.requestedRole,
          effectiveFrom: ar.requiredFrom, effectiveTo: ar.requiredTo,
          isTemporary: true, reason: ar.reason || "Temporary access via request",
          assignedBy: body.approvedById, status: "Active",
        },
      })
    }
    await logPermissionAudit({ action: "TemporaryAccessGranted", entityType: "AccessRequest", entityId: id, roleName: ar.requestedRole, performedByName: body.approvedByName })
  }

  await logPermissionAudit({ action: "AccessRequestApproved", entityType: "AccessRequest", entityId: id, newValue: updated, performedByName: body.approvedByName })
  return ok(updated)
}
