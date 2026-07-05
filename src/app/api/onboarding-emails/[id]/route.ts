import { ok, notFound, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant()
  const { id } = await params
  const email = await db.onboardingEmailTemplate.findUnique({ where: { id } })
  if (!email || email.tenantId !== tenantId) return notFound()
  return ok(email)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant()
  const { id } = await params
  const existing = await db.onboardingEmailTemplate.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== tenantId) return notFound()

  const body = await parseBody(req)
  const { name, eventType, scopeType, entityId, workflowId, language, subject, headerHtml, bodyHtml, footerHtml, isDefault, status, recipients, fromEmail, replyToEmail, variablesUsed, effectiveFrom, effectiveTo, version } = body as any

  if (isDefault && !existing.isDefault) {
    await db.onboardingEmailTemplate.updateMany({
      where: { tenantId, eventType: eventType || existing.eventType, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    })
  }

  const updated = await db.onboardingEmailTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(eventType !== undefined ? { eventType } : {}),
      ...(scopeType !== undefined ? { scopeType } : {}),
      ...(entityId !== undefined ? { entityId: entityId || null } : {}),
      ...(workflowId !== undefined ? { workflowId: workflowId || null } : {}),
      ...(language !== undefined ? { language } : {}),
      ...(subject !== undefined ? { subject } : {}),
      ...(headerHtml !== undefined ? { headerHtml: headerHtml || null } : {}),
      ...(bodyHtml !== undefined ? { bodyHtml } : {}),
      ...(footerHtml !== undefined ? { footerHtml: footerHtml || null } : {}),
      ...(isDefault !== undefined ? { isDefault } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(recipients !== undefined ? { recipients: typeof recipients === "string" ? recipients : JSON.stringify(recipients) } : {}),
      ...(fromEmail !== undefined ? { fromEmail: fromEmail || null } : {}),
      ...(replyToEmail !== undefined ? { replyToEmail: replyToEmail || null } : {}),
      ...(variablesUsed !== undefined ? { variablesUsed } : {}),
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
  const existing = await db.onboardingEmailTemplate.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== tenantId) return notFound()
  await db.onboardingEmailTemplate.delete({ where: { id } })
  return ok({ deleted: true })
}
