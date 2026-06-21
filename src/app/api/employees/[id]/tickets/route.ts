import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toNum, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

// Generate next ticketCode per tenant: TKT-0001, TKT-0002, …
async function nextTicketCode(tenantId: string): Promise<string> {
  const last = await db.employeeHelpdeskTicket.findFirst({
    where: { tenantId },
    orderBy: { ticketCode: "desc" },
    select: { ticketCode: true },
  })
  let n = 1
  if (last?.ticketCode) {
    const m = last.ticketCode.match(/TKT-(\d+)/i)
    if (m) n = parseInt(m[1], 10) + 1
  }
  return `TKT-${String(n).padStart(4, "0")}`
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeHelpdeskTicket.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ createdAt: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const subject = strOrNull(body.subject)
  if (!subject) return bad("Ticket subject is required")
  const ticketCode = await nextTicketCode(tenantId)
  const rec = await db.employeeHelpdeskTicket.create({
    data: {
      tenantId,
      employeeId: id,
      ticketCode,
      subject,
      category: strOrNull(body.category) || "HR",
      priority: strOrNull(body.priority) || "Medium",
      status: strOrNull(body.status) || "Open",
      description: strOrNull(body.description),
      assignedTo: strOrNull(body.assignedTo),
      slaHours: toNum(body.slaHours),
      slaStatus: strOrNull(body.slaStatus) || "Within SLA",
      resolution: strOrNull(body.resolution),
      resolvedAt: toDate(body.resolvedAt),
      feedback: strOrNull(body.feedback),
      rating: toNum(body.rating),
      attachmentUrl: strOrNull(body.attachmentUrl),
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Profile updated",
    title: "Ticket raised",
    description: `${ticketCode} — ${subject}`,
    metadata: { ticketId: rec.id, ticketCode, category: rec.category },
  })
  return created(rec)
}
