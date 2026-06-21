import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad } from "@/lib/api-helpers"

type Ctx = { params: Promise<{ id: string }> }

// POST /api/payroll-runs/[id]/approve
export async function POST(_req: NextRequest, ctx: Ctx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const run = await db.payrollRun.findFirst({ where: { id, tenantId } })
  if (!run) return bad("Payroll run not found", 404)
  if (run.status !== "Completed") return bad("Only completed payroll runs can be approved")

  const updated = await db.payrollRun.update({
    where: { id },
    data: { status: "Approved", approvedAt: new Date(), approvedBy: "HR Admin" },
  })
  // Mark all payslips as Approved
  await db.payslip.updateMany({ where: { payrollRunId: id }, data: { status: "Approved" } })

  await db.auditLog.create({
    data: { tenantId, module: "Payroll", action: "Approve", recordId: id, userName: "HR Admin", details: JSON.stringify({ code: run.code }) },
  })
  return ok(updated)
}
