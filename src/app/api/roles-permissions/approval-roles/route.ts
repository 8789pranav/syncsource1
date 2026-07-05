import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ensureTenant, ok, created, bad, parseBody } from "@/lib/api-helpers"
import { logPermissionAudit } from "@/lib/permissions-audit"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") || ""
  const modFilter = searchParams.get("module") || ""
  const approvalType = searchParams.get("approvalType") || ""
  const approverType = searchParams.get("approverType") || ""
  const where: any = { tenantId: DEFAULT_TENANT_ID }
  if (q) where.OR = [{ name: { contains: q } }, { code: { contains: q } }]
  if (modFilter) where.module = modFilter
  if (approvalType) where.approvalType = approvalType
  if (approverType) where.approverType = approverType
  const items = await db.approvalRole.findMany({ where, orderBy: [{ module: "asc" }, { level: "asc" }] })
  return ok({ items })
}

export async function POST(req: NextRequest) {
  await ensureTenant()
  const body = await parseBody(req)
  if (!body.name || !body.code) return bad("Name and code are required")
  const existing = await db.approvalRole.findUnique({ where: { tenantId_code: { tenantId: DEFAULT_TENANT_ID, code: body.code } } })
  if (existing) return bad("Approval role with this code already exists", 409)

  const ar = await db.approvalRole.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      name: body.name, code: body.code,
      module: body.module, approvalType: body.approvalType || "Approver",
      approverType: body.approverType || "ReportingManager",
      approverRef: body.approverRef || null,
      scopeType: body.scopeType || null, scopeRef: body.scopeRef || null,
      level: body.level || 1, mode: body.mode || "Sequential",
      fallbackApproverId: body.fallbackApproverId || null,
      escalationApproverId: body.escalationApproverId || null,
      escalationAfterHours: body.escalationAfterHours || null,
      status: body.status || "Active",
    },
  })
  await logPermissionAudit({ action: "ApprovalRoleCreated", entityType: "ApprovalRole", entityId: ar.id, newValue: { name: body.name, code: body.code }, performedByName: body.performedByName })
  return created(ar)
}
