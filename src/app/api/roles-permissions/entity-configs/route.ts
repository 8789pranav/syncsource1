import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { DEFAULT_TENANT_ID } from "@/lib/db"
import { ok, created, parseBody } from "@/lib/api-helpers"

export async function GET() {
  const items = await db.roleEntityConfig.findMany({ where: { tenantId: DEFAULT_TENANT_ID } })
  return ok({ items })
}

export async function POST(req: NextRequest) {
  const body = await parseBody(req)
  const existing = await db.roleEntityConfig.findUnique({ where: { tenantId_entityId: { tenantId: DEFAULT_TENANT_ID, entityId: body.entityId } } })
  if (existing) return ok(existing)
  const created_rec = await db.roleEntityConfig.create({
    data: { tenantId: DEFAULT_TENANT_ID, entityId: body.entityId, useTenantDefault: body.useTenantDefault ?? true },
  })
  return created(created_rec)
}
