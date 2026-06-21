import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, listResponse } from "@/lib/api-helpers"

// GET → { items: [{label, value}] }
// label = `${firstName} ${lastName} (${employeeCode})`
// value = id
// Default: only Active employees, limit 200 for safety
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant()
  const url = new URL(req.url)
  const status = url.searchParams.get("status") || "Active"
  const q = (url.searchParams.get("q") || "").trim()
  const limit = Number(url.searchParams.get("limit")) || 200

  const where: Record<string, unknown> = { tenantId }
  if (status && status !== "all") where.employeeStatus = status
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { employeeCode: { contains: q } },
      { officialEmail: { contains: q } },
    ]
  }

  const employees = await db.employee.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      employeeCode: true,
      employeeStatus: true,
    },
    orderBy: [{ firstName: "asc" }, { employeeCode: "asc" }],
    take: limit,
  })

  const items = employees.map((e) => {
    const full = [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" ")
    return {
      label: `${full} (${e.employeeCode})`,
      value: e.id,
    }
  })
  return listResponse(items)
}
