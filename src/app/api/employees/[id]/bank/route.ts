import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toBool, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeBankDetail.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ isActive: "desc" }, { effectiveDate: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const bankName = strOrNull(body.bankName)
  const accountNumber = strOrNull(body.accountNumber)
  if (!bankName) return bad("Bank name is required")
  if (!accountNumber) return bad("Account number is required")

  // If creating a new active account, set previous active to inactive
  const isActive = toBool(body.isActive, true) ?? true
  if (isActive) {
    const prevActive = await db.employeeBankDetail.findFirst({
      where: { tenantId, employeeId: id, isActive: true },
    })
    if (prevActive) {
      await db.employeeBankDetail.update({
        where: { id: prevActive.id },
        data: { isActive: false, endDate: new Date() },
      })
    }
  }

  const rec = await db.employeeBankDetail.create({
    data: {
      tenantId,
      employeeId: id,
      bankName,
      accountHolderName: strOrNull(body.accountHolderName),
      accountNumber,
      ifscCode: strOrNull(body.ifscCode),
      branchName: strOrNull(body.branchName),
      accountType: strOrNull(body.accountType),
      upiId: strOrNull(body.upiId),
      chequeUrl: strOrNull(body.chequeUrl),
      isActive,
      verified: toBool(body.verified, false) ?? false,
      effectiveDate: toDate(body.effectiveDate) || new Date(),
      endDate: toDate(body.endDate),
    },
  })

  // Also update the Employee's primary bank fields when this is active
  if (isActive) {
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

  await logTimeline({
    tenantId, employeeId: id, eventType: "Profile updated",
    title: "Bank detail added",
    description: `${bankName} — ${accountNumber}`,
  })
  return created(rec)
}
