import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, parseBody } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await parseBody(req)
  const ar = await db.accessRequest.findUnique({ where: { id } })
  if (!ar) return notFound("Access request not found")
  const updated = await db.accessRequest.update({
    where: { id },
    data: {
      status: "Rejected",
      approvedById: body.approvedById || null,
      approvedAt: new Date(),
      approverComments: body.approverComments || null,
    },
  })
  await logPermissionAudit({ action: "AccessRequestRejected", entityType: "AccessRequest", entityId: id, newValue: updated, performedByName: body.approvedByName })
  return ok(updated)
}
