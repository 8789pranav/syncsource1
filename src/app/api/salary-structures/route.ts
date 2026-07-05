import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, created, bad, parseBody } from "@/lib/api-helpers"

// GET /api/salary-structures — list all salary structures
export async function GET() {
  const tenantId = await ensureTenant()
  const items = await db.salaryStructure.findMany({
    where: { tenantId },
    include: { _count: { select: { assignments: true } } },
    orderBy: { createdAt: "desc" },
  })
  return ok({ items })
}

// POST /api/salary-structures — create a salary structure
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const code = String(body.code || "").trim()
  const name = String(body.name || "").trim()
  if (!code) return bad("Salary structure code is required")
  if (!name) return bad("Salary structure name is required")

  const clash = await db.salaryStructure.findUnique({ where: { tenantId_code: { tenantId, code } } })
  if (clash) return bad("Salary structure code already exists", 409)

  const toF = (v: unknown, fb: number) => {
    if (v === undefined || v === null || v === "") return fb
    const n = Number(v)
    return isNaN(n) ? fb : n
  }

  const rec = await db.salaryStructure.create({
    data: {
      tenantId,
      code,
      name,
      description: body.description ? String(body.description) : null,
      basicPercent: toF(body.basicPercent, 50),
      hraPercent: toF(body.hraPercent, 20),
      specialAllowancePercent: toF(body.specialAllowancePercent, 20),
      conveyanceAllowance: toF(body.conveyanceAllowance, 1600),
      medicalAllowance: toF(body.medicalAllowance, 1250),
      bonusAmount: toF(body.bonusAmount, 0),
      pfEmployerPercent: toF(body.pfEmployerPercent, 12),
      esiEmployerPercent: toF(body.esiEmployerPercent, 3.25),
      pfEmployeePercent: toF(body.pfEmployeePercent, 12),
      esiEmployeePercent: toF(body.esiEmployeePercent, 0.75),
      professionalTax: toF(body.professionalTax, 200),
      tdsPercent: toF(body.tdsPercent, 0),
      status: body.status ? String(body.status) : "Active",
    },
  })
  await db.auditLog.create({
    data: { tenantId, module: "Payroll", action: "Create", recordId: rec.id, userName: "HR Admin", details: JSON.stringify({ code, name }) },
  })
  return created(rec)
}
