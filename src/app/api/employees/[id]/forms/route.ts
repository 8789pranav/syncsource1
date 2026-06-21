import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toNum, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeFormSubmission.findMany({
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
  const formCode = strOrNull(body.formCode)
  if (!formCode) return bad("formCode is required")
  const rec = await db.employeeFormSubmission.create({
    data: {
      tenantId,
      employeeId: id,
      formCode,
      formName: strOrNull(body.formName),
      version: toNum(body.version) ?? 1,
      data: strOrNull(body.data),
      status: strOrNull(body.status) || "Draft",
      submittedAt: toDate(body.submittedAt),
      approvedAt: toDate(body.approvedAt),
      approvedBy: strOrNull(body.approvedBy),
      remarks: strOrNull(body.remarks),
      pdfUrl: strOrNull(body.pdfUrl),
    },
  })
  return created(rec)
}
