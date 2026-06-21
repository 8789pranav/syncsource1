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
  const items = await db.designation.findMany({
    where: { tenantId },
    include: {
      grade: { select: { id: true, code: true, name: true, hierarchyLevel: true } },
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
  if (!code) return bad("Designation code is required")
  if (!name) return bad("Designation name is required")

  const existing = await db.designation.findUnique({ where: { tenantId_code: { tenantId, code } } })
  if (existing) return bad("Designation code already exists", 409)

  const rec = await db.designation.create({
    data: {
      tenantId,
      code,
      name,
      gradeId: strOrNull(body.gradeId),
      level: toNum(body.level),
      departmentId: strOrNull(body.departmentId),
      jobDescription: strOrNull(body.jobDescription),
      status: str(body.status, "Active"),
    },
  })
  return created(rec)
}
