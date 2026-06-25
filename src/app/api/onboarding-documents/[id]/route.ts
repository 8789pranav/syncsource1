import { ok, bad, notFound, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant()
  const { id } = await params
  const doc = await db.onboardingDocumentTemplate.findUnique({ where: { id } })
  if (!doc || doc.tenantId !== tenantId) return notFound()
  return ok(doc)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant()
  const { id } = await params
  const existing = await db.onboardingDocumentTemplate.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== tenantId) return notFound()

  const body = await parseBody(req)
  const { name, documentType, scopeType, entityId, branchId, locationId, departmentId, employeeType, language, headerHtml, bodyHtml, footerHtml, pageSettings, variablesUsed, isDefault, status, effectiveFrom, effectiveTo, version } = body as any

  if (isDefault && !existing.isDefault) {
    await db.onboardingDocumentTemplate.updateMany({
      where: { tenantId, documentType: documentType || existing.documentType, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    })
  }

  const updated = await db.onboardingDocumentTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(documentType !== undefined ? { documentType } : {}),
      ...(scopeType !== undefined ? { scopeType } : {}),
      ...(entityId !== undefined ? { entityId: entityId || null } : {}),
      ...(branchId !== undefined ? { branchId: branchId || null } : {}),
      ...(locationId !== undefined ? { locationId: locationId || null } : {}),
      ...(departmentId !== undefined ? { departmentId: departmentId || null } : {}),
      ...(employeeType !== undefined ? { employeeType: employeeType || null } : {}),
      ...(language !== undefined ? { language } : {}),
      ...(headerHtml !== undefined ? { headerHtml: headerHtml || null } : {}),
      ...(bodyHtml !== undefined ? { bodyHtml } : {}),
      ...(footerHtml !== undefined ? { footerHtml: footerHtml || null } : {}),
      ...(pageSettings !== undefined ? { pageSettings: typeof pageSettings === "string" ? pageSettings : JSON.stringify(pageSettings) } : {}),
      ...(variablesUsed !== undefined ? { variablesUsed } : {}),
      ...(isDefault !== undefined ? { isDefault } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(version !== undefined ? { version } : {}),
      ...(effectiveFrom !== undefined ? { effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null } : {}),
      ...(effectiveTo !== undefined ? { effectiveTo: effectiveTo ? new Date(effectiveTo) : null } : {}),
    },
  })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant()
  const { id } = await params
  const existing = await db.onboardingDocumentTemplate.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== tenantId) return notFound()
  await db.onboardingDocumentTemplate.delete({ where: { id } })
  return ok({ deleted: true })
}
