import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, parseBody, bad } from "@/lib/api-helpers"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ar = await db.accessRequest.findUnique({
    where: { id },
    include: {
      requestedBy: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, officialEmail: true } },
      approver: { select: { id: true, firstName: true, lastName: true, displayName: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true, displayName: true } },
    },
  })
  if (!ar) return notFound("Access request not found")
  return ok(ar)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await parseBody(req)
  const ar = await db.accessRequest.findUnique({ where: { id } })
  if (!ar) return notFound("Access request not found")
  if (ar.status !== "Draft") return bad("Only draft requests can be edited", 409)
  const updated = await db.accessRequest.update({
    where: { id },
    data: {
      requestType: body.requestType, requestedRole: body.requestedRole,
      requestedModule: body.requestedModule, reason: body.reason,
      requiredFrom: body.requiredFrom ? new Date(body.requiredFrom) : undefined,
      requiredTo: body.requiredTo ? new Date(body.requiredTo) : null,
      approverId: body.approverId, status: body.status,
    },
  })
  return ok(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.accessRequest.delete({ where: { id } })
  return ok({ deleted: true })
}
