import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, notFound, parseBody, bad } from "@/lib/api-helpers"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const d = await db.delegation.findUnique({
    where: { id },
    include: {
      fromEmployee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true } },
      toEmployee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true } },
    },
  })
  if (!d) return notFound("Delegation not found")
  return ok(d)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await parseBody(req)
  const updated = await db.delegation.update({
    where: { id },
    data: {
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      reason: body.reason, status: body.status,
    },
  })
  return ok(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.delegation.delete({ where: { id } })
  return ok({ deleted: true })
}
