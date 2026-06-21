import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toNum, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

// Generate next letterCode per tenant: LTR-0001, LTR-0002, …
async function nextLetterCode(tenantId: string): Promise<string> {
  const last = await db.employeeLetter.findFirst({
    where: { tenantId },
    orderBy: { letterCode: "desc" },
    select: { letterCode: true },
  })
  let n = 1
  if (last?.letterCode) {
    const m = last.letterCode.match(/LTR-(\d+)/i)
    if (m) n = parseInt(m[1], 10) + 1
  }
  return `LTR-${String(n).padStart(4, "0")}`
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeLetter.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ issuedDate: "desc" }, { createdAt: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const letterType = strOrNull(body.letterType)
  if (!letterType) return bad("Letter type is required")
  const letterCode = await nextLetterCode(tenantId)
  const rec = await db.employeeLetter.create({
    data: {
      tenantId,
      employeeId: id,
      letterType,
      letterCode,
      issuedDate: toDate(body.issuedDate) || new Date(),
      subject: strOrNull(body.subject),
      body: strOrNull(body.body),
      pdfUrl: strOrNull(body.pdfUrl),
      status: strOrNull(body.status) || "Generated",
      issuedBy: strOrNull(body.issuedBy) || "HR Admin",
      approvedBy: strOrNull(body.approvedBy),
      version: toNum(body.version) ?? 1,
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Profile updated",
    title: "Letter generated",
    description: `${letterCode} — ${letterType}`,
    metadata: { letterId: rec.id, letterCode, letterType },
  })
  return created(rec)
}
