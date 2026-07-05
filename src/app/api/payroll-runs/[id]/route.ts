import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const rec = await db.payrollRun.findFirst({
    where: { id, tenantId },
    include: {
      payslips: {
        include: {
          employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true, department: { select: { name: true } }, designation: { select: { name: true } } } },
        },
        orderBy: { employee: { employeeCode: "asc" } },
      },
    },
  })
  if (!rec) return bad("Payroll run not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const existing = await db.payrollRun.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Payroll run not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("name" in body) data.name = String(body.name)
  if ("status" in body) data.status = String(body.status)
  if ("payDate" in body) {
    const d = body.payDate ? new Date(body.payDate) : null
    if (d && !isNaN(d.getTime())) data.payDate = d
  }
  const updated = await db.payrollRun.update({ where: { id }, data })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const existing = await db.payrollRun.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Payroll run not found", 404)
  // Delete payslips first
  await db.payslip.deleteMany({ where: { payrollRunId: id } })
  await db.payrollRun.delete({ where: { id } })
  await db.auditLog.create({
    data: { tenantId, module: "Payroll", action: "Delete", recordId: id, userName: "HR Admin", details: JSON.stringify({ code: existing.code }) },
  })
  return ok({ ok: true })
}
