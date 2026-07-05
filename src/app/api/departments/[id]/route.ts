import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"

// ---------- helpers ----------
function str(v: unknown, fallback = ""): string {
  if (v === undefined || v === null) return fallback
  return String(v)
}
function strOrNull(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const rec = await db.department.findFirst({
    where: { id, tenantId },
    include: {
      entity: { select: { id: true, code: true, legalName: true, tradeName: true } },
      parent: { select: { id: true, code: true, name: true } },
      children: { select: { id: true, code: true, name: true } },
    },
  })
  if (!rec) return bad("Department not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const body = await parseBody(req)
  const existing = await db.department.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Department not found", 404)

  if (body.code !== undefined) {
    const newCode = str(body.code).trim()
    if (!newCode) return bad("Department code cannot be empty")
    if (newCode !== existing.code) {
      const clash = await db.department.findUnique({ where: { tenantId_code: { tenantId, code: newCode } } })
      if (clash) return bad("Department code already exists", 409)
    }
  }

  if (body.parentId) {
    const parent = await db.department.findFirst({ where: { id: String(body.parentId), tenantId } })
    if (!parent) return bad("Parent department not found", 404)
  }

  const data: Record<string, unknown> = {}
  if ("code" in body) data.code = str(body.code).trim()
  if ("name" in body) data.name = str(body.name).trim()
  if ("entityId" in body) data.entityId = strOrNull(body.entityId)
  if ("parentId" in body) data.parentId = strOrNull(body.parentId)
  if ("departmentHeadId" in body) data.departmentHeadId = strOrNull(body.departmentHeadId)
  if ("costCenterId" in body) data.costCenterId = strOrNull(body.costCenterId)
  if ("status" in body) data.status = str(body.status, "Active")

  const updated = await db.department.update({ where: { id }, data })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const existing = await db.department.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Department not found", 404)
  await db.department.delete({ where: { id } })
  return ok({ ok: true })
}
