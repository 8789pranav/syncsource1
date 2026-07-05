import { ok, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// GET /api/onboarding-logs?logType=Email&candidateId=X&from=2025-01-01&to=2025-12-31&page=1&pageSize=50
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant()
  const { searchParams } = new URL(req.url)
  const logType = searchParams.get("logType")
  const candidateId = searchParams.get("candidateId")
  const status = searchParams.get("status")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const q = searchParams.get("q") // search candidateName / employeeCode / actionType
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const pageSize = Math.min(200, Math.max(10, parseInt(searchParams.get("pageSize") || "50")))

  const where: any = { tenantId }
  if (logType) where.logType = logType
  if (candidateId) where.candidateId = candidateId
  if (status) where.status = status
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }
  if (q) {
    where.OR = [
      { candidateName: { contains: q } },
      { employeeCode: { contains: q } },
      { actionType: { contains: q } },
      { performedByName: { contains: q } },
      { remarks: { contains: q } },
    ]
  }

  const [items, total] = await Promise.all([
    db.onboardingLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.onboardingLog.count({ where }),
  ])

  return ok({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}
