import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toNum, toFloat, toBool, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeEducation.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ isHighest: "desc" }, { yearOfPassing: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const rec = await db.employeeEducation.create({
    data: {
      tenantId,
      employeeId: id,
      qualification: strOrNull(body.qualification),
      degree: strOrNull(body.degree),
      specialization: strOrNull(body.specialization),
      institute: strOrNull(body.institute),
      university: strOrNull(body.university),
      yearOfPassing: toNum(body.yearOfPassing),
      percentage: toFloat(body.percentage),
      cgpa: toFloat(body.cgpa),
      educationType: strOrNull(body.educationType),
      isHighest: toBool(body.isHighest, false) ?? false,
      certificateUrl: strOrNull(body.certificateUrl),
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Profile updated",
    title: "Education record added",
    description: `${rec.degree || rec.qualification || "Qualification"} — ${rec.institute || ""}`.trim(),
  })
  return created(rec)
}
