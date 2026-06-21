import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeCertification.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ issueDate: "desc" }],
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
  if (!name) return bad("Certification name is required")
  const rec = await db.employeeCertification.create({
    data: {
      tenantId,
      employeeId: id,
      name,
      issuingAuthority: strOrNull(body.issuingAuthority),
      issueDate: toDate(body.issueDate),
      expiryDate: toDate(body.expiryDate),
      certificateId: strOrNull(body.certificateId),
      certificateUrl: strOrNull(body.certificateUrl),
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Profile updated",
    title: "Certification added",
    description: `${name}${rec.issuingAuthority ? ` — ${rec.issuingAuthority}` : ""}`,
  })
  return created(rec)
}
