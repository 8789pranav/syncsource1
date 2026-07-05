import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const rec = await db.payslip.findFirst({
    where: { id, tenantId },
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, officialEmail: true, department: { select: { name: true } }, designation: { select: { name: true } }, entity: { select: { legalName: true, tradeName: true } }, location: { select: { name: true, city: true } }, bankName: true, accountNumber: true, panNumber: true } },
      payrollRun: { select: { id: true, code: true, name: true, payPeriod: true, status: true } },
    },
  })
  if (!rec) return bad("Payslip not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const existing = await db.payslip.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Payslip not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("status" in body) data.status = String(body.status)
  if (body.status === "Paid") data.paidAt = new Date()
  const updated = await db.payslip.update({ where: { id }, data })
  return ok(updated)
}
