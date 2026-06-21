import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toFloat, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeExperience.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ startDate: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const companyName = strOrNull(body.companyName)
  if (!companyName) return bad("Company name is required")
  const rec = await db.employeeExperience.create({
    data: {
      tenantId,
      employeeId: id,
      companyName,
      designation: strOrNull(body.designation),
      department: strOrNull(body.department),
      startDate: toDate(body.startDate),
      endDate: toDate(body.endDate),
      totalYears: toFloat(body.totalYears),
      reasonForLeaving: strOrNull(body.reasonForLeaving),
      previousSalary: toFloat(body.previousSalary),
      managerName: strOrNull(body.managerName),
      managerContact: strOrNull(body.managerContact),
      experienceLetterUrl: strOrNull(body.experienceLetterUrl),
      relievingLetterUrl: strOrNull(body.relievingLetterUrl),
      lastPayslipUrl: strOrNull(body.lastPayslipUrl),
      verificationStatus: strOrNull(body.verificationStatus) || "Pending",
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Profile updated",
    title: "Experience record added",
    description: `${companyName} — ${strOrNull(body.designation) || ""}`.trim(),
  })
  return created(rec)
}
