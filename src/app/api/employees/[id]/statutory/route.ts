import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toBool, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeStatutoryDetail.findMany({
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
  const rec = await db.employeeStatutoryDetail.create({
    data: {
      tenantId,
      employeeId: id,
      panNumber: strOrNull(body.panNumber),
      aadhaarNumber: strOrNull(body.aadhaarNumber),
      uanNumber: strOrNull(body.uanNumber),
      pfNumber: strOrNull(body.pfNumber),
      esiNumber: strOrNull(body.esiNumber),
      ptLocation: strOrNull(body.ptLocation),
      lwfApplicability: strOrNull(body.lwfApplicability),
      gratuityApplicability: strOrNull(body.gratuityApplicability),
      pfApplicable: toBool(body.pfApplicable, true) ?? true,
      esiApplicable: toBool(body.esiApplicable, false) ?? false,
      ptApplicable: toBool(body.ptApplicable, true) ?? true,
      taxRegime: strOrNull(body.taxRegime),
      tdsDeclarationStatus: strOrNull(body.tdsDeclarationStatus),
      nomineeDetails: strOrNull(body.nomineeDetails),
      documentUrl: strOrNull(body.documentUrl),
      effectiveDate: toDate(body.effectiveDate) || new Date(),
    },
  })
  // Sync to Employee primary statutory fields
  await db.employee.update({
    where: { id },
    data: {
      panNumber: rec.panNumber,
      aadhaarNumber: rec.aadhaarNumber,
      uanNumber: rec.uanNumber,
      pfNumber: rec.pfNumber,
      esiNumber: rec.esiNumber,
      ptLocation: rec.ptLocation,
      pfApplicable: rec.pfApplicable,
      esiApplicable: rec.esiApplicable,
      ptApplicable: rec.ptApplicable,
      lwfApplicability: rec.lwfApplicability,
      gratuityApplicability: rec.gratuityApplicability,
      taxRegime: rec.taxRegime,
      tdsDeclarationStatus: rec.tdsDeclarationStatus,
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Profile updated",
    title: "Statutory detail added",
  })
  return created(rec)
}
