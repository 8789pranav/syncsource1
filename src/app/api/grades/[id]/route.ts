import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"

// ---------- helpers ----------
function toNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}
function toBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v
  if (typeof v === "string") return v === "true" || v === "on" || v === "1"
  if (typeof v === "number") return v !== 0
  return fallback
}
function str(v: unknown, fallback = ""): string {
  if (v === undefined || v === null) return fallback
  return String(v)
}

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const rec = await db.grade.findFirst({ where: { id, tenantId } })
  if (!rec) return bad("Grade not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const body = await parseBody(req)
  const existing = await db.grade.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Grade not found", 404)

  if (body.code !== undefined) {
    const newCode = str(body.code).trim()
    if (!newCode) return bad("Grade code cannot be empty")
    if (newCode !== existing.code) {
      const clash = await db.grade.findUnique({ where: { tenantId_code: { tenantId, code: newCode } } })
      if (clash) return bad("Grade code already exists", 409)
    }
  }

  const data: Record<string, unknown> = {}
  if ("code" in body) data.code = str(body.code).trim()
  if ("name" in body) data.name = str(body.name).trim()
  if ("hierarchyLevel" in body) {
    const lvl = toNum(body.hierarchyLevel)
    if (lvl === undefined) return bad("Hierarchy level must be a number")
    data.hierarchyLevel = lvl
  }
  if ("minSalary" in body) data.minSalary = toNum(body.minSalary)
  if ("maxSalary" in body) data.maxSalary = toNum(body.maxSalary)
  if ("leaveEligibility" in body) data.leaveEligibility = toNum(body.leaveEligibility)
  if ("approvalAuthority" in body) data.approvalAuthority = toBool(body.approvalAuthority, false)
  if ("status" in body) data.status = str(body.status, "Active")

  const updated = await db.grade.update({ where: { id }, data })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const existing = await db.grade.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Grade not found", 404)
  await db.grade.delete({ where: { id } })
  return ok({ ok: true })
}
