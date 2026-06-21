import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ensureTenant, ok, bad, created, parseBody } from "@/lib/api-helpers"
import { toBool, strOrNull, getEmployee, logTimeline, RouteCtx } from "@/lib/employee-section-helpers"

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const items = await db.employeeCustomFieldValue.findMany({
    where: { tenantId, employeeId: id },
    orderBy: [{ category: "asc" }, { fieldKey: "asc" }],
  })
  return ok({ items })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const tenantId = await ensureTenant()
  const { id } = await ctx.params
  const emp = await getEmployee(tenantId, id)
  if (!emp) return bad("Employee not found", 404)
  const body = await parseBody(req)
  const fieldKey = strOrNull(body.fieldKey)
  if (!fieldKey) return bad("fieldKey is required")

  // Upsert by (employeeId, fieldKey)
  const existing = await db.employeeCustomFieldValue.findUnique({
    where: { employeeId_fieldKey: { employeeId: id, fieldKey } },
  })

  let rec
  if (existing) {
    rec = await db.employeeCustomFieldValue.update({
      where: { id: existing.id },
      data: {
        fieldLabel: strOrNull(body.fieldLabel) || existing.fieldLabel,
        fieldType: strOrNull(body.fieldType) || existing.fieldType,
        value: strOrNull(body.value),
        category: strOrNull(body.category) || existing.category,
        isMandatory: body.isMandatory !== undefined ? (toBool(body.isMandatory, false) ?? existing.isMandatory) : existing.isMandatory,
        approvalRequired: body.approvalRequired !== undefined ? (toBool(body.approvalRequired, false) ?? existing.approvalRequired) : existing.approvalRequired,
      },
    })
  } else {
    rec = await db.employeeCustomFieldValue.create({
      data: {
        tenantId,
        employeeId: id,
        fieldKey,
        fieldLabel: strOrNull(body.fieldLabel),
        fieldType: strOrNull(body.fieldType) || "text",
        value: strOrNull(body.value),
        category: strOrNull(body.category) || "General",
        isMandatory: toBool(body.isMandatory, false) ?? false,
        approvalRequired: toBool(body.approvalRequired, false) ?? false,
      },
    })
    await logTimeline({
      tenantId, employeeId: id, eventType: "Profile updated",
      title: "Custom field added",
      description: `${fieldKey} = ${strOrNull(body.value)}`,
    })
  }
  return created(rec)
}
