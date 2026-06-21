import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers"
import { toDate, toFloat, strOrNull, getEmployee, logTimeline, RecordCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const rec = await db.employeeExpense.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!rec) return bad("Expense not found", 404)
  return ok(rec)
}

export async function PATCH(req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeExpense.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Expense not found", 404)
  const body = await parseBody(req)
  const data: Record<string, unknown> = {}
  if ("category" in body) data.category = strOrNull(body.category)
  if ("amount" in body) data.amount = toFloat(body.amount) ?? existing.amount
  if ("currency" in body) data.currency = strOrNull(body.currency) || existing.currency
  if ("expenseDate" in body) data.expenseDate = toDate(body.expenseDate) || existing.expenseDate
  if ("description" in body) data.description = strOrNull(body.description)
  if ("billUrl" in body) data.billUrl = strOrNull(body.billUrl)
  if ("project" in body) data.project = strOrNull(body.project)
  if ("client" in body) data.client = strOrNull(body.client)
  if ("remarks" in body) data.remarks = strOrNull(body.remarks)
  if ("approvedBy" in body) data.approvedBy = strOrNull(body.approvedBy)

  if ("status" in body) {
    const newStatus = strOrNull(body.status) || existing.status
    data.status = newStatus
    if (newStatus === "Approved") {
      data.approvedAt = new Date()
      if (!data.approvedBy) data.approvedBy = strOrNull(body.actorName, "HR Admin")
    } else if (newStatus === "Paid") {
      data.paidAt = new Date()
      data.paymentStatus = "Paid"
      if (!data.approvedBy) data.approvedBy = strOrNull(body.actorName, "HR Admin")
    } else if (newStatus === "Rejected") {
      if (!data.approvedBy) data.approvedBy = strOrNull(body.actorName, "HR Admin")
    }
  }
  if ("paymentStatus" in body) data.paymentStatus = strOrNull(body.paymentStatus)
  if ("paidAt" in body) data.paidAt = toDate(body.paidAt)
  if ("approvedAt" in body) data.approvedAt = toDate(body.approvedAt)

  const rec = await db.employeeExpense.update({ where: { id: recordId }, data })

  if (existing.status !== rec.status) {
    await logTimeline({
      tenantId, employeeId: id, eventType: "Profile updated",
      title: `Expense ${rec.status.toLowerCase()}`,
      description: `${rec.category} — ₹${rec.amount}`,
      metadata: { expenseId: rec.id, oldStatus: existing.status, newStatus: rec.status },
    })
  }

  return ok(rec)
}

export async function DELETE(_req: NextRequest, ctx: RecordCtx) {
  const tenantId = await ensureTenant()
  const { id, recordId } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const existing = await db.employeeExpense.findFirst({ where: { id: recordId, tenantId, employeeId: id } })
  if (!existing) return bad("Expense not found", 404)
  await db.employeeExpense.delete({ where: { id: recordId } })
  return ok({ ok: true })
}
