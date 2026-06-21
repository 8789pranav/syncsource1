import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toBool, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeNote.findMany({
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
  const noteBody = strOrNull(body.body)
  if (!noteBody) return bad("Note body is required")
  const rec = await db.employeeNote.create({
    data: {
      tenantId,
      employeeId: id,
      category: strOrNull(body.category) || "General",
      body: noteBody,
      isPrivate: toBool(body.isPrivate, false) ?? false,
      visibleToManager: toBool(body.visibleToManager, false) ?? false,
      attachmentUrl: strOrNull(body.attachmentUrl),
      createdBy: strOrNull(body.createdBy) || "HR Admin",
    },
  })
  return created(rec)
}
