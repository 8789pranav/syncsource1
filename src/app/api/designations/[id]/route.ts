import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"

// ---------- helpers ----------
function toNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}
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
  const rec = await db.designation.findFirst({
    where: { id, tenantId },
    include: {
      grade: { select: { id: true, code: true, name: true, hierarchyLevel: true } },
    },
  })
  if (!rec) return bad("Designation not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const body = await parseBody(req)
  const existing = await db.designation.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Designation not found", 404)

  if (body.code !== undefined) {
    const newCode = str(body.code).trim()
    if (!newCode) return bad("Designation code cannot be empty")
    if (newCode !== existing.code) {
      const clash = await db.designation.findUnique({ where: { tenantId_code: { tenantId, code: newCode } } })
      if (clash) return bad("Designation code already exists", 409)
    }
  }

  const data: Record<string, unknown> = {}
  if ("code" in body) data.code = str(body.code).trim()
  if ("name" in body) data.name = str(body.name).trim()
  if ("gradeId" in body) data.gradeId = strOrNull(body.gradeId)
  if ("level" in body) data.level = toNum(body.level)
  if ("departmentId" in body) data.departmentId = strOrNull(body.departmentId)
  if ("jobDescription" in body) data.jobDescription = strOrNull(body.jobDescription)
  if ("status" in body) data.status = str(body.status, "Active")

  const updated = await db.designation.update({ where: { id }, data })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const existing = await db.designation.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Designation not found", 404)
  await db.designation.delete({ where: { id } })
  return ok({ ok: true })
}
