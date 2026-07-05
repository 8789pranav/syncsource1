import { ok, created, bad, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// GET /api/onboarding-documents?documentType=Offer Letter
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant()
  const { searchParams } = new URL(req.url)
  const documentType = searchParams.get("documentType")
  const status = searchParams.get("status")

  const items = await db.onboardingDocumentTemplate.findMany({
    where: {
      tenantId,
      ...(documentType ? { documentType } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { updatedAt: "desc" },
  })
  return ok({ items })
}

// POST /api/onboarding-documents
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const { name, code, documentType, scopeType, entityId, branchId, locationId, departmentId, employeeType, language, headerHtml, bodyHtml, footerHtml, pageSettings, variablesUsed, isDefault, status, effectiveFrom, effectiveTo } = body as any

  if (!name || !code || !documentType) return bad("name, code and documentType are required")
  if (!bodyHtml) return bad("bodyHtml is required")

  const existing = await db.onboardingDocumentTemplate.findUnique({ where: { tenantId_code: { tenantId, code } } })
  if (existing) return bad("Template code already exists", 409)

  if (isDefault) {
    await db.onboardingDocumentTemplate.updateMany({
      where: { tenantId, documentType, isDefault: true },
      data: { isDefault: false },
    })
  }

  const doc = await db.onboardingDocumentTemplate.create({
    data: {
      tenantId, name, code, documentType,
      scopeType: scopeType || "tenant",
      entityId: entityId || null, branchId: branchId || null, locationId: locationId || null,
      departmentId: departmentId || null, employeeType: employeeType || null,
      language: language || "en",
      headerHtml: headerHtml || null,
      bodyHtml,
      footerHtml: footerHtml || null,
      pageSettings: pageSettings ? (typeof pageSettings === "string" ? pageSettings : JSON.stringify(pageSettings)) : null,
      variablesUsed: variablesUsed || null,
      isDefault: isDefault || false,
      status: status || "Active",
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
    },
  })
  return created(doc)
}
