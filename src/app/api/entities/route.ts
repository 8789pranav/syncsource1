import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, created, bad, parseBody, listResponse } from "@/lib/api-helpers"

// ---------- helpers ----------
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

// ---------- GET list ----------
export async function GET() {
  const tenantId = await ensureTenant()
  const items = await db.entity.findMany({
    where: { tenantId },
    include: {
      _count: { select: { employees: true, branches: true, departments: true } },
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
  const legalName = str(body.legalName).trim()
  if (!code) return bad("Entity code is required")
  if (!legalName) return bad("Legal name is required")

  const existing = await db.entity.findUnique({ where: { tenantId_code: { tenantId, code } } })
  if (existing) return bad("Entity code already exists in this tenant", 409)

  const rec = await db.entity.create({
    data: {
      tenantId,
      code,
      legalName,
      tradeName: strOrNull(body.tradeName),
      pan: strOrNull(body.pan),
      gstin: strOrNull(body.gstin),
      tan: strOrNull(body.tan),
      pfNumber: strOrNull(body.pfNumber),
      esiNumber: strOrNull(body.esiNumber),
      address: strOrNull(body.address),
      city: strOrNull(body.city),
      state: strOrNull(body.state),
      country: str(body.country, "India"),
      currency: str(body.currency, "INR"),
      payrollApplicable: toBool(body.payrollApplicable, true),
      attendanceApplicable: toBool(body.attendanceApplicable, true),
      leaveApplicable: toBool(body.leaveApplicable, true),
      status: str(body.status, "Active"),
      effectiveDate: toDate(body.effectiveDate),
    },
  })
  return created(rec)
}
