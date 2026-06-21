import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toBool, strOrNull, getEmployee, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeBankDetail.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Bank detail not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeBankDetail.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Bank detail not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("bankName" in body) data.bankName = strOrNull(body.bankName) || existing.bankName
  if ("accountHolderName" in body) data.accountHolderName = strOrNull(body.accountHolderName)
  if ("accountNumber" in body) data.accountNumber = strOrNull(body.accountNumber) || existing.accountNumber
  if ("ifscCode" in body) data.ifscCode = strOrNull(body.ifscCode)
  if ("branchName" in body) data.branchName = strOrNull(body.branchName)
  if ("accountType" in body) data.accountType = strOrNull(body.accountType)
  if ("upiId" in body) data.upiId = strOrNull(body.upiId)
  if ("chequeUrl" in body) data.chequeUrl = strOrNull(body.chequeUrl)
  if ("verified" in body) { const b = toBool(body.verified); if (b !== undefined) data.verified = b }
  if ("effectiveDate" in body) data.effectiveDate = toDate(body.effectiveDate) || existing.effectiveDate
  if ("endDate" in body) data.endDate = toDate(body.endDate)

  // If activating this one, deactivate others
  if ("isActive" in body) {
    const b = toBool(body.isActive)
    if (b !== undefined) {
      data.isActive = b
      if (b) {
        await db.employeeBankDetail.updateMany({
          where: { tenantId, employeeId: id, isActive: true, NOT: { id: recordId } },
          data: { isActive: false, endDate: new Date() },
        })
      }
    }
  }

  const rec = await db.employeeBankDetail.update({ where: { id: recordId }, data })

  // Sync primary bank fields on Employee if this record is now active
  if (rec.isActive) {
    await db.employee.update({
      where: { id },
      data: {
        bankName: rec.bankName,
        accountHolderName: rec.accountHolderName,
        accountNumber: rec.accountNumber,
        ifscCode: rec.ifscCode,
        branchName: rec.branchName,
        accountType: rec.accountType,
        upiId: rec.upiId,
      },
    })
  }

  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeBankDetail.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Bank detail not found", 404)
  await db.employeeBankDetail.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
