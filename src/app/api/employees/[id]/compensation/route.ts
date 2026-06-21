import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toFloat, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeCompensationHistory.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ effectiveDate: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)

  // Fetch existing employee snapshot for oldCtc/oldBasic/oldHra
  const employee = await db.employee.findFirst({ where: { id, tenantId }, select: { ctc: true, basicSalary: true, hra: true } })
  const oldCtc = employee?.ctc ?? null
  const oldBasic = employee?.basicSalary ?? null
  const oldHra = employee?.hra ?? null

  const newCtc = toFloat(body.newCtc)
  const newBasic = toFloat(body.newBasic)
  const newHra = toFloat(body.newHra)

  const rec = await db.employeeCompensationHistory.create({
    data: {
      tenantId,
      employeeId: id,
      effectiveDate: toDate(body.effectiveDate) || new Date(),
      oldCtc,
      newCtc: newCtc ?? null,
      oldBasic,
      newBasic: newBasic ?? null,
      oldHra,
      newHra: newHra ?? null,
      incrementPercent:
        oldCtc && newCtc && oldCtc > 0
          ? Number((((newCtc - oldCtc) / oldCtc) * 100).toFixed(2))
          : null,
      revisionReason: strOrNull(body.revisionReason) || "Off-cycle",
      promotionMapping: strOrNull(body.promotionMapping),
      approvedBy: strOrNull(body.approvedBy) || "HR Admin",
      status: strOrNull(body.status) || "Approved",
      letterUrl: strOrNull(body.letterUrl),
    },
  })

  // Sync Employee.ctc/basicSalary/hra if provided
  if (newCtc !== undefined || newBasic !== undefined || newHra !== undefined) {
    const empUpdate: Record<string, unknown> = {}
    if (newCtc !== undefined) empUpdate.ctc = newCtc
    if (newBasic !== undefined) empUpdate.basicSalary = newBasic
    if (newHra !== undefined) empUpdate.hra = newHra
    await db.employee.update({ where: { id }, data: empUpdate })
  }

  await logTimeline({
    tenantId, employeeId: id, eventType: "Salary revised",
    title: "Salary revised",
    description: `CTC: ₹${oldCtc ?? 0} → ₹${newCtc ?? oldCtc ?? 0} (${rec.revisionReason})`,
    metadata: { compensationId: rec.id, oldCtc, newCtc },
  })
  return created(rec)
}
