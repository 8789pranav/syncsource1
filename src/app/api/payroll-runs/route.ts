import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, created, bad, parseBody } from "@/lib/api-helpers"

function toDate(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

// GET /api/payroll-runs
export async function GET() {
  const tenantId = await ensureTenant()
  const items = await db.payrollRun.findMany({
    where: { tenantId },
    include: { _count: { select: { payslips: true } } },
    orderBy: { payPeriodStart: "desc" },
  })
  return ok({ items })
}

// POST /api/payroll-runs — create a new payroll run (Draft status)
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const name = String(body.name || "").trim()
  const payPeriod = String(body.payPeriod || "").trim() // "2026-06"
  if (!name) return bad("Payroll run name is required")
  if (!payPeriod) return bad("Pay period is required (e.g. 2026-06)")

  // Parse period
  const [year, month] = payPeriod.split("-").map(Number)
  if (!year || !month) return bad("Invalid pay period format. Use YYYY-MM")
  const payPeriodStart = new Date(year, month - 1, 1, 12, 0, 0, 0)
  const payPeriodEnd = new Date(year, month, 0, 12, 0, 0, 0) // last day of month
  const payDate = toDate(body.payDate) || new Date(year, month, 5, 12, 0, 0, 0) // 5th of next month

  const code = `PR-${payPeriod}`
  const clash = await db.payrollRun.findUnique({ where: { tenantId_code: { tenantId, code } } })
  if (clash) return bad("Payroll run already exists for this period", 409)

  const rec = await db.payrollRun.create({
    data: {
      tenantId,
      code,
      name,
      payPeriod,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      status: "Draft",
    },
  })
  await db.auditLog.create({
    data: { tenantId, module: "Payroll", action: "Create", recordId: rec.id, userName: "HR Admin", details: JSON.stringify({ code, name, payPeriod }) },
  })
  return created(rec)
}
