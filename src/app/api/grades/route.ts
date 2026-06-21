import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, created, bad, parseBody, listResponse } from "@/lib/api-helpers"

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

// ---------- GET list ----------
export async function GET() {
  const tenantId = await ensureTenant()
  const items = await db.grade.findMany({
    where: { tenantId },
    include: {
      _count: { select: { employees: true, designations: true } },
    },
    orderBy: [{ hierarchyLevel: "asc" }, { createdAt: "desc" }],
  })
  return listResponse(items)
}

// ---------- POST create ----------
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const code = str(body.code).trim()
  const name = str(body.name).trim()
  if (!code) return bad("Grade code is required")
  if (!name) return bad("Grade name is required")

  const existing = await db.grade.findUnique({ where: { tenantId_code: { tenantId, code } } })
  if (existing) return bad("Grade code already exists", 409)

  const hierarchyLevel = toNum(body.hierarchyLevel)
  if (hierarchyLevel === undefined) return bad("Hierarchy level is required")

  const rec = await db.grade.create({
    data: {
      tenantId,
      code,
      name,
      hierarchyLevel,
      minSalary: toNum(body.minSalary),
      maxSalary: toNum(body.maxSalary),
      leaveEligibility: toNum(body.leaveEligibility),
      approvalAuthority: toBool(body.approvalAuthority, false),
      status: str(body.status, "Active"),
    },
  })
  return created(rec)
}
