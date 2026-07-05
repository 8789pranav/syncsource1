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
  const rec = await db.location.findFirst({ where: { id, tenantId } })
  if (!rec) return bad("Location not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const body = await parseBody(req)
  const existing = await db.location.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Location not found", 404)

  if (body.code !== undefined) {
    const newCode = str(body.code).trim()
    if (!newCode) return bad("Location code cannot be empty")
    if (newCode !== existing.code) {
      const clash = await db.location.findUnique({ where: { tenantId_code: { tenantId, code: newCode } } })
      if (clash) return bad("Location code already exists", 409)
    }
  }

  const data: Record<string, unknown> = {}
  if ("code" in body) data.code = str(body.code).trim()
  if ("name" in body) data.name = str(body.name).trim()
  if ("address" in body) data.address = strOrNull(body.address)
  if ("city" in body) data.city = strOrNull(body.city)
  if ("state" in body) data.state = strOrNull(body.state)
  if ("country" in body) data.country = strOrNull(body.country)
  if ("geoFenceRadius" in body) data.geoFenceRadius = toNum(body.geoFenceRadius)
  if ("timezone" in body) data.timezone = strOrNull(body.timezone)
  if ("attendanceMode" in body) data.attendanceMode = str(body.attendanceMode, "Web")
  if ("status" in body) data.status = str(body.status, "Active")

  const updated = await db.location.update({ where: { id }, data })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const existing = await db.location.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Location not found", 404)
  await db.location.delete({ where: { id } })
  return ok({ ok: true })
}
