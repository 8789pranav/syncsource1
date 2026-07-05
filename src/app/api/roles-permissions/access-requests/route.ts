import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ensureTenant, ok, created, bad, parseBody } from "@/lib/api-helpers"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || ""
  const requestType = searchParams.get("requestType") || ""
  const requestedById = searchParams.get("requestedById") || ""
  const approverId = searchParams.get("approverId") || ""

  const where: any = { tenantId: DEFAULT_TENANT_ID }
  if (status) where.status = status
  if (requestType) where.requestType = requestType
  if (requestedById) where.requestedById = requestedById
  if (approverId) where.approverId = approverId

  const items = await db.accessRequest.findMany({
    where,
    include: {
      requestedBy: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, workEmail: true } },
      approver: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return ok({ items })
}

export async function POST(req: NextRequest) {
  await ensureTenant()
  const body = await parseBody(req)
  if (!body.requestedById || !body.requestType) return bad("requestedById and requestType are required")
  if (!body.requiredFrom) return bad("requiredFrom is required")

  const ar = await db.accessRequest.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      requestedById: body.requestedById,
      requestType: body.requestType,
      requestedRole: body.requestedRole || null,
      requestedModule: body.requestedModule || null,
      reason: body.reason || null,
      requiredFrom: new Date(body.requiredFrom),
      requiredTo: body.requiredTo ? new Date(body.requiredTo) : null,
      approverId: body.approverId || null,
      status: body.approverId ? "PendingApproval" : "Submitted",
    },
  })
  return created(ar)
}
