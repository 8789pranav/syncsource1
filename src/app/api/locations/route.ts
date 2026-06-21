import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, created, bad, parseBody, listResponse } from "@/lib/api-helpers"

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

// ---------- GET list ----------
export async function GET() {
  const tenantId = await ensureTenant()
  const items = await db.location.findMany({
    where: { tenantId },
    include: {
      _count: { select: { employees: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return listResponse(items)
}

// ---------- POST create ----------
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const code = str(body.code).trim()
  const name = str(body.name).trim()
  if (!code) return bad("Location code is required")
  if (!name) return bad("Location name is required")

  const existing = await db.location.findUnique({ where: { tenantId_code: { tenantId, code } } })
  if (existing) return bad("Location code already exists", 409)

  const rec = await db.location.create({
    data: {
      tenantId,
      code,
      name,
      address: strOrNull(body.address),
      city: strOrNull(body.city),
      state: strOrNull(body.state),
      country: strOrNull(body.country),
      geoFenceRadius: toNum(body.geoFenceRadius),
      timezone: strOrNull(body.timezone),
      attendanceMode: str(body.attendanceMode, "Web"),
      status: str(body.status, "Active"),
    },
  })
  return created(rec)
}
