import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok } from "@/lib/api-helpers"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action") || ""
  const performedById = searchParams.get("performedById") || ""
  const status = searchParams.get("status") || ""
  const dateFrom = searchParams.get("dateFrom") || ""
  const dateTo = searchParams.get("dateTo") || ""
  const q = searchParams.get("q") || ""
  const take = parseInt(searchParams.get("take") || "100")
  const skip = parseInt(searchParams.get("skip") || "0")

  const where: any = { tenantId: DEFAULT_TENANT_ID }
  if (action) where.action = action
  if (performedById) where.performedById = performedById
  if (status) where.status = status
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) where.createdAt.lte = new Date(dateTo)
  }
  if (q) {
    where.OR = [
      { performedByName: { contains: q } },
      { roleName: { contains: q } },
      { entityId: { contains: q } },
      { reason: { contains: q } },
    ]
  }

  const [items, total] = await Promise.all([
    db.permissionAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, take, skip }),
    db.permissionAuditLog.count({ where }),
  ])
  return ok({ items, total })
}
