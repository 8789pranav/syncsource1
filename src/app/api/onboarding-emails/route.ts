import { ok, created, bad, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// GET /api/onboarding-emails?eventType=Candidate Invite
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant()
  const { searchParams } = new URL(req.url)
  const eventType = searchParams.get("eventType")
  const status = searchParams.get("status")

  const items = await db.onboardingEmailTemplate.findMany({
    where: {
      tenantId,
      ...(eventType ? { eventType } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { updatedAt: "desc" },
  })
  return ok({ items })
}

// POST /api/onboarding-emails
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const { name, code, eventType, scopeType, entityId, workflowId, language, subject, headerHtml, bodyHtml, footerHtml, isDefault, status, recipients, fromEmail, replyToEmail, variablesUsed, effectiveFrom, effectiveTo } = body as any

  if (!name || !code || !eventType || !subject || !bodyHtml) {
    return bad("name, code, eventType, subject and bodyHtml are required")
  }

  const existing = await db.onboardingEmailTemplate.findUnique({ where: { tenantId_code: { tenantId, code } } })
  if (existing) return bad("Template code already exists", 409)

  if (isDefault) {
    await db.onboardingEmailTemplate.updateMany({
      where: { tenantId, eventType, isDefault: true },
      data: { isDefault: false },
    })
  }

  const email = await db.onboardingEmailTemplate.create({
    data: {
      tenantId, name, code, eventType,
      scopeType: scopeType || "tenant",
      entityId: entityId || null,
      workflowId: workflowId || null,
      language: language || "en",
      subject,
      headerHtml: headerHtml || null,
      bodyHtml,
      footerHtml: footerHtml || null,
      isDefault: isDefault || false,
      status: status || "Active",
      recipients: recipients ? (typeof recipients === "string" ? recipients : JSON.stringify(recipients)) : null,
      fromEmail: fromEmail || null,
      replyToEmail: replyToEmail || null,
      variablesUsed: variablesUsed || null,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
    },
  })
  return created(email)
}
