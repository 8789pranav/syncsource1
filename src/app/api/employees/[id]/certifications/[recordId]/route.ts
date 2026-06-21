import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeCertification.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Certification not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeCertification.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Certification not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("name" in body) data.name = strOrNull(body.name) || existing.name
  if ("issuingAuthority" in body) data.issuingAuthority = strOrNull(body.issuingAuthority)
  if ("issueDate" in body) data.issueDate = toDate(body.issueDate)
  if ("expiryDate" in body) data.expiryDate = toDate(body.expiryDate)
  if ("certificateId" in body) data.certificateId = strOrNull(body.certificateId)
  if ("certificateUrl" in body) data.certificateUrl = strOrNull(body.certificateUrl)
  const rec = await db.employeeCertification.update({ where: { id: recordId }, data })
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeCertification.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Certification not found", 404)
  await db.employeeCertification.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
