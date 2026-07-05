import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ensureTenant, ok, created, bad, parseBody } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") || ""
  const status = searchParams.get("status") || ""
  const delegationType = searchParams.get("delegationType") || ""
  const modFilter = searchParams.get("module") || ""
  const where: any = { tenantId: DEFAULT_TENANT_ID }
  if (delegationType) where.delegationType = delegationType
  if (modFilter) where.module = modFilter
  const items = await db.delegation.findMany({
    where,
    include: {
      fromEmployee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true } },
      toEmployee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  // Compute dynamic status
  const now = new Date()
  const computed = items.map(d => {
    let dynStatus = d.status
    if (d.status === "Active" && new Date(d.endDate) < now) dynStatus = "Expired"
    return { ...d, computedStatus: dynStatus }
  })
  let filtered = computed
  if (status) filtered = filtered.filter(d => d.computedStatus === status)
  if (q) {
    const ql = q.toLowerCase()
    filtered = filtered.filter(d => (d.fromEmployee.displayName || `${d.fromEmployee.firstName} ${d.fromEmployee.lastName}`).toLowerCase().includes(ql) || (d.toEmployee.displayName || `${d.toEmployee.firstName} ${d.toEmployee.lastName}`).toLowerCase().includes(ql))
  }
  return ok({ items: filtered })
}

export async function POST(req: NextRequest) {
  await ensureTenant()
  const body = await parseBody(req)
  if (!body.fromEmployeeId || !body.toEmployeeId) return bad("fromEmployeeId and toEmployeeId are required")
  if (!body.startDate || !body.endDate) return bad("startDate and endDate are required")
  if (body.fromEmployeeId === body.toEmployeeId) return bad("Cannot delegate to self")

  const d = await db.delegation.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      fromEmployeeId: body.fromEmployeeId, toEmployeeId: body.toEmployeeId,
      delegationType: body.delegationType || "ApprovalDelegation",
      module: body.module || null,
      permissionScope: body.permissionScope ? JSON.stringify(body.permissionScope) : null,
      startDate: new Date(body.startDate), endDate: new Date(body.endDate),
      reason: body.reason || null,
      approvalRequired: !!body.approvalRequired,
      approvedById: body.approvedById || null,
      status: body.approvalRequired ? "Pending" : "Active",
    },
  })
  await logPermissionAudit({ action: "DelegationCreated", entityType: "Delegation", entityId: d.id, newValue: { fromEmployeeId: body.fromEmployeeId, toEmployeeId: body.toEmployeeId }, performedByName: body.performedByName })
  return created(d)
}
