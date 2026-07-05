import { ok, bad, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// GET /api/onboarding-workflows/[id] — full workflow with stages + task templates
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tenantId = await ensureTenant()
  const wf = await db.onboardingWorkflow.findFirst({
    where: { id, tenantId },
    include: {
      stages: {
        orderBy: { order: "asc" },
        include: { taskTemplates: { orderBy: { order: "asc" } } },
      },
      _count: { select: { candidates: true } },
    },
  })
  if (!wf) return bad("Workflow not found", 404)
  return ok(wf)
}

// PATCH /api/onboarding-workflows/[id] — update workflow meta
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const {
    name, description, status, category, icon, color, isDefault,
    applicability, cardColorBy, showSla, showOwner, showTaskCount, allowBackward, version,
  } = body as any

  const existing = await db.onboardingWorkflow.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Workflow not found", 404)

  // If setting as default, unset other defaults
  if (isDefault) {
    await db.onboardingWorkflow.updateMany({
      where: { tenantId, isDefault: true, NOT: { id } },
      data: { isDefault: false },
    })
  }

  const wf = await db.onboardingWorkflow.update({
    where: { id },
    data: {
      name, description, status, category, icon, color,
      isDefault: typeof isDefault === "boolean" ? isDefault : undefined,
      applicability: applicability ? JSON.stringify(applicability) : undefined,
      cardColorBy, showSla, showOwner, showTaskCount, allowBackward, version,
    },
    include: { stages: { orderBy: { order: "asc" } } },
  })
  return ok(wf)
}

// DELETE /api/onboarding-workflows/[id] — delete workflow + cascade stages/candidates
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tenantId = await ensureTenant()
  const existing = await db.onboardingWorkflow.findFirst({ where: { id, tenantId } })
  if (!existing) return bad("Workflow not found", 404)
  await db.onboardingWorkflow.delete({ where: { id } })
  return ok({ deleted: true })
}
