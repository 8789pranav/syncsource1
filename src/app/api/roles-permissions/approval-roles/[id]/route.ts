import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, parseBody, bad } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ar = await db.approvalRole.findUnique({ where: { id } })
  if (!ar) return notFound("Approval role not found")
  return ok(ar)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ar = await db.approvalRole.findUnique({ where: { id } })
  if (!ar) return notFound("Approval role not found")
  const body = await parseBody(req)
  const updated = await db.approvalRole.update({
    where: { id },
    data: {
      name: body.name, module: body.module, approvalType: body.approvalType,
      approverType: body.approverType, approverRef: body.approverRef || null,
      scopeType: body.scopeType || null, scopeRef: body.scopeRef || null,
      level: body.level, mode: body.mode,
      fallbackApproverId: body.fallbackApproverId || null,
      escalationApproverId: body.escalationApproverId || null,
      escalationAfterHours: body.escalationAfterHours || null,
      status: body.status,
    },
  })
  await logPermissionAudit({ action: "ApprovalRoleUpdated", entityType: "ApprovalRole", entityId: id, oldValue: ar, newValue: updated, performedByName: body.performedByName })
  return ok(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ar = await db.approvalRole.findUnique({ where: { id } })
  if (!ar) return notFound("Approval role not found")
  await db.approvalRole.delete({ where: { id } })
  await logPermissionAudit({ action: "ApprovalRoleUpdated", entityType: "ApprovalRole", entityId: id, oldValue: { name: ar.name }, performedByName: "system" })
  return ok({ deleted: true })
}
