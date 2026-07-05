import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toFloat, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeExpense.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const amount = toFloat(body.amount)
  if (amount === undefined || amount <= 0) return bad("Valid amount is required")
  const rec = await db.employeeExpense.create({
    data: {
      tenantId,
      employeeId: id,
      category: strOrNull(body.category) || "Other",
      amount,
      currency: strOrNull(body.currency) || "INR",
      expenseDate: toDate(body.expenseDate) || new Date(),
      description: strOrNull(body.description),
      billUrl: strOrNull(body.billUrl),
      project: strOrNull(body.project),
      client: strOrNull(body.client),
      status: strOrNull(body.status) || "Draft",
      paymentStatus: strOrNull(body.paymentStatus),
      approvedBy: strOrNull(body.approvedBy),
      approvedAt: toDate(body.approvedAt),
      paidAt: toDate(body.paidAt),
      remarks: strOrNull(body.remarks),
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Profile updated",
    title: "Expense claimed",
    description: `${rec.category} — ₹${amount}`,
    metadata: { expenseId: rec.id, status: rec.status },
  })
  return created(rec)
}
