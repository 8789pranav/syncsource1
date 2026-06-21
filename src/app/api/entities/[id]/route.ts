import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"

// ---------- helpers (mirrored from route.ts) ----------
function toDate(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  return null
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
function strOrNull(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

type Ctx = { params: Promise<{ id: string }> }

// ---------- GET one ----------
export async function GET(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const rec = await db.entity.findFirst({ where: { id, tenantId } })
  if (!rec) return bad("Entity not found", 404)
  return ok(rec)
}

// ---------- PATCH update ----------
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const body = await parseBody(req)
  const existing = await db.entity.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Entity not found", 404)

  // If code changed, ensure uniqueness
  if (body.code !== undefined) {
    const newCode = str(body.code).trim()
    if (!newCode) return bad("Entity code cannot be empty")
    if (newCode !== existing.code) {
      const clash = await db.entity.findUnique({ where: { tenantId_code: { tenantId, code: newCode } } })
      if (clash) return bad("Entity code already exists", 409)
    }
  }

  // Selective update — only fields present in body
  const data: Record<string, unknown> = {}
  if ("code" in body) data.code = str(body.code).trim()
  if ("legalName" in body) data.legalName = str(body.legalName).trim()
  if ("tradeName" in body) data.tradeName = strOrNull(body.tradeName)
  if ("pan" in body) data.pan = strOrNull(body.pan)
  if ("gstin" in body) data.gstin = strOrNull(body.gstin)
  if ("tan" in body) data.tan = strOrNull(body.tan)
  if ("pfNumber" in body) data.pfNumber = strOrNull(body.pfNumber)
  if ("esiNumber" in body) data.esiNumber = strOrNull(body.esiNumber)
  if ("address" in body) data.address = strOrNull(body.address)
  if ("city" in body) data.city = strOrNull(body.city)
  if ("state" in body) data.state = strOrNull(body.state)
  if ("country" in body) data.country = str(body.country, "India")
  if ("currency" in body) data.currency = str(body.currency, "INR")
  if ("payrollApplicable" in body) data.payrollApplicable = toBool(body.payrollApplicable, true)
  if ("attendanceApplicable" in body) data.attendanceApplicable = toBool(body.attendanceApplicable, true)
  if ("leaveApplicable" in body) data.leaveApplicable = toBool(body.leaveApplicable, true)
  if ("status" in body) data.status = str(body.status, "Active")
  if ("effectiveDate" in body) data.effectiveDate = toDate(body.effectiveDate)

  const updated = await db.entity.update({ where: { id }, data })
  return ok(updated)
}

// ---------- DELETE ----------
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const existing = await db.entity.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Entity not found", 404)
  await db.entity.delete({ where: { id } })
  return ok({ ok: true })
}
