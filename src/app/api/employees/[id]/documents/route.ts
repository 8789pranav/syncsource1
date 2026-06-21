import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toDate, toNum, toBool, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeDocument.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ uploadedAt: "desc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const name = strOrNull(body.name)
  if (!name) return bad("Document name is required")
  const rec = await db.employeeDocument.create({
    data: {
      tenantId,
      employeeId: id,
      name,
      category: strOrNull(body.category),
      documentType: strOrNull(body.documentType),
      fileUrl: strOrNull(body.fileUrl),
      fileExt: strOrNull(body.fileExt),
      fileSize: toNum(body.fileSize),
      status: strOrNull(body.status) || "Uploaded",
      expiryDate: toDate(body.expiryDate),
      approvedAt: toDate(body.approvedAt),
      approvedBy: strOrNull(body.approvedBy),
      remarks: strOrNull(body.remarks),
      visibleToEmployee: toBool(body.visibleToEmployee, true) ?? true,
    },
  })
  await logTimeline({
    tenantId, employeeId: id, eventType: "Document uploaded",
    title: "Document uploaded",
    description: `${name}${rec.documentType ? ` (${rec.documentType})` : ""}`,
    metadata: { documentId: rec.id, category: rec.category, status: rec.status },
  })
  return created(rec)
}
