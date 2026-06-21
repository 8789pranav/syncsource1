import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toNum, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeLetter.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Letter not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeLetter.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Letter not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("letterType" in body) data.letterType = strOrNull(body.letterType) || existing.letterType
  if ("issuedDate" in body) data.issuedDate = toDate(body.issuedDate) || existing.issuedDate
  if ("subject" in body) data.subject = strOrNull(body.subject)
  if ("body" in body) data.body = strOrNull(body.body)
  if ("pdfUrl" in body) data.pdfUrl = strOrNull(body.pdfUrl)
  if ("status" in body) data.status = strOrNull(body.status) || existing.status
  if ("issuedBy" in body) data.issuedBy = strOrNull(body.issuedBy)
  if ("approvedBy" in body) data.approvedBy = strOrNull(body.approvedBy)
  if ("version" in body) data.version = toNum(body.version) ?? existing.version
  const rec = await db.employeeLetter.update({ where: { id: recordId }, data })
  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeLetter.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Letter not found", 404)
  await db.employeeLetter.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
