import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import {
  toDate, toBool, toFloat, strOrNull, getEmployee, logTimeline, RouteCtx,
} from "@/lib/employee-section-helpers"

// GET /api/employees/[id]/family — list family members
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeFamilyMember.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ isNominee: "desc" }, { dateOfBirth: "asc" }],
  })
  return ok({ items })
}

// POST /api/employees/[id]/family — add family member
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const name = strOrNull(body.name)
  if (!name) return bad("Family member name is required")
  const rec = await db.employeeFamilyMember.create({
    data: {
      tenantId,
      employeeId: id,
      name,
      relationship: strOrNull(body.relationship),
      gender: strOrNull(body.gender),
      dateOfBirth: toDate(body.dateOfBirth),
      mobileNumber: strOrNull(body.mobileNumber),
      occupation: strOrNull(body.occupation),
      isDependent: toBool(body.isDependent, false) ?? false,
      isNominee: toBool(body.isNominee, false) ?? false,
      nomineePercentage: toFloat(body.nomineePercentage),
      insuranceApplicable: toBool(body.insuranceApplicable, false) ?? false,
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Profile updated",
    title: "Family member added",
    description: `${name} (${strOrNull(body.relationship) || "relation"})`,
  })
  return created(rec)
}
