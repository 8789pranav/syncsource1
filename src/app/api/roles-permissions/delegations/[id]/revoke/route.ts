import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, parseBody } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await parseBody(req).catch(() => ({}))
  const d = await db.delegation.findUnique({ where: { id } })
  if (!d) return notFound("Delegation not found")
  await db.delegation.update({ where: { id }, data: { status: "Revoked" } })
  await logPermissionAudit({ action: "DelegationRevoked", entityType: "Delegation", entityId: id, performedByName: body.performedByName })
  return ok({ revoked: true })
}
