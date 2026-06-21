import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toBool, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeStatutoryDetail.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Statutory detail not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeStatutoryDetail.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Statutory detail not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("panNumber" in body) data.panNumber = strOrNull(body.panNumber)
  if ("aadhaarNumber" in body) data.aadhaarNumber = strOrNull(body.aadhaarNumber)
  if ("uanNumber" in body) data.uanNumber = strOrNull(body.uanNumber)
  if ("pfNumber" in body) data.pfNumber = strOrNull(body.pfNumber)
  if ("esiNumber" in body) data.esiNumber = strOrNull(body.esiNumber)
  if ("ptLocation" in body) data.ptLocation = strOrNull(body.ptLocation)
  if ("lwfApplicability" in body) data.lwfApplicability = strOrNull(body.lwfApplicability)
  if ("gratuityApplicability" in body) data.gratuityApplicability = strOrNull(body.gratuityApplicability)
  if ("pfApplicable" in body) { const b = toBool(body.pfApplicable); if (b !== undefined) data.pfApplicable = b }
  if ("esiApplicable" in body) { const b = toBool(body.esiApplicable); if (b !== undefined) data.esiApplicable = b }
  if ("ptApplicable" in body) { const b = toBool(body.ptApplicable); if (b !== undefined) data.ptApplicable = b }
  if ("taxRegime" in body) data.taxRegime = strOrNull(body.taxRegime)
  if ("tdsDeclarationStatus" in body) data.tdsDeclarationStatus = strOrNull(body.tdsDeclarationStatus)
  if ("nomineeDetails" in body) data.nomineeDetails = strOrNull(body.nomineeDetails)
  if ("documentUrl" in body) data.documentUrl = strOrNull(body.documentUrl)
  if ("effectiveDate" in body) data.effectiveDate = toDate(body.effectiveDate) || existing.effectiveDate
  const rec = await db.employeeStatutoryDetail.update({ where: { id: recordId }, data })
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
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeStatutoryDetail.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Statutory detail not found", 404)
  await db.employeeStatutoryDetail.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
