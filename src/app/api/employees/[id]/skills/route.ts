import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toFloat, toBool, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeSkill.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const name = strOrNull(body.name)
  if (!name) return bad("Skill name is required")
  const rec = await db.employeeSkill.create({
    data: {
      tenantId,
      employeeId: id,
      name,
      category: strOrNull(body.category) || "Technical",
      proficiency: strOrNull(body.proficiency) || "Intermediate",
      yearsOfExperience: toFloat(body.yearsOfExperience),
      verifiedByManager: toBool(body.verifiedByManager, false) ?? false,
      lastUsedDate: toDate(body.lastUsedDate),
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Profile updated",
    title: "Skill added",
    description: `${name} (${rec.proficiency})`,
  })
  return created(rec)
}
