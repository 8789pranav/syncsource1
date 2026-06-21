import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, created, bad, parseBody, listResponse } from "@/lib/api-helpers"

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

// ---------- GET list ----------
// Includes parent + children + head employee lookup
export async function GET() {
  const tenantId = await ensureTenant()
  const items = await db.department.findMany({
    where: { tenantId },
    include: {
      entity: { select: { id: true, code: true, legalName: true, tradeName: true } },
      parent: { select: { id: true, code: true, name: true } },
      children: { select: { id: true, code: true, name: true } },
      _count: { select: { employees: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Resolve department head (employeeId stored as `departmentHeadId`) — separate fetch
  const headIds = items.map((d) => d.departmentHeadId).filter(Boolean) as string[]
  const heads = headIds.length
    ? await db.employee.findMany({
        where: { id: { in: headIds } },
        select: { id: true, firstName: true, lastName: true, employeeCode: true },
      })
    : []
  const headMap = new Map(heads.map((h) => [h.id, h]))

  const result = items.map((d) => ({
    ...d,
    head: d.departmentHeadId ? headMap.get(d.departmentHeadId) || null : null,
  }))

  return listResponse(result)
}

// ---------- POST create ----------
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const code = str(body.code).trim()
  const name = str(body.name).trim()
  if (!code) return bad("Department code is required")
  if (!name) return bad("Department name is required")

  const existing = await db.department.findUnique({ where: { tenantId_code: { tenantId, code } } })
  if (existing) return bad("Department code already exists", 409)

  // Validate parent is within same tenant (if provided)
  if (body.parentId) {
    const parent = await db.department.findFirst({ where: { id: String(body.parentId), tenantId } })
    if (!parent) return bad("Parent department not found", 404)
  }

  const rec = await db.department.create({
    data: {
      tenantId,
      code,
      name,
      entityId: strOrNull(body.entityId),
      parentId: strOrNull(body.parentId),
      departmentHeadId: strOrNull(body.departmentHeadId),
      costCenterId: strOrNull(body.costCenterId),
      status: str(body.status, "Active"),
    },
  })
  return created(rec)
}
