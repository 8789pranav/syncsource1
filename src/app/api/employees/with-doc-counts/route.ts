import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok } from "@/lib/api-helpers"
import { rawFolderCountsByEmployee } from "@/lib/employee-doc-raw"

// GET — list employees with their document + folder counts and core relations.
// Uses the Prisma ORM for the employee rows (existing schema) and a raw SQL
// query for the new `EmployeeDocumentFolder` model (the dev server's in-memory
// Prisma client may not yet know about it).
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant()
  const url = new URL(req.url)
  const q = (url.searchParams.get("q") || "").trim()
  const departmentId = url.searchParams.get("departmentId") || undefined
  const entityId = url.searchParams.get("entityId") || undefined
  const status = url.searchParams.get("status") || undefined
  const limit = Number(url.searchParams.get("limit")) || 0

  const where: Record<string, unknown> = { tenantId }
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { employeeCode: { contains: q } },
      { officialEmail: { contains: q } },
      { displayName: { contains: q } },
    ]
  }
  if (departmentId && departmentId !== "all") where.departmentId = departmentId
  if (entityId && entityId !== "all") where.entityId = entityId
  if (status && status !== "all") where.employeeStatus = status

  const rows = await db.employee.findMany({
    where,
    include: {
      entity: { select: { id: true, legalName: true, tradeName: true } },
      department: { select: { id: true, name: true } },
      designation: { select: { id: true, name: true } },
      _count: { select: { documents: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    ...(limit && limit > 0 ? { take: limit } : {}),
  })

  const folderCountMap = await rawFolderCountsByEmployee(tenantId)

  const items = rows.map((e) => {
    const displayName =
      e.displayName?.trim() ||
      [e.firstName, e.lastName].filter(Boolean).join(" ").trim() ||
      e.employeeCode
    const folderCount = folderCountMap.get(e.id) ?? 0
    return {
      id: e.id,
      employeeCode: e.employeeCode,
      firstName: e.firstName,
      lastName: e.lastName,
      displayName,
      profilePhotoUrl: e.profilePhotoUrl,
      officialEmail: e.officialEmail,
      employeeStatus: e.employeeStatus,
      department: e.department ? { name: e.department.name } : null,
      designation: e.designation ? { name: e.designation.name } : null,
      entity: e.entity
        ? { legalName: e.entity.legalName, tradeName: e.entity.tradeName }
        : null,
      _count: {
        documents: e._count.documents,
        folders: folderCount,
        pending: 0,
      },
    }
  })

  return ok({ items })
}
