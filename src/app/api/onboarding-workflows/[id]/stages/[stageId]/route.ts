import { ok, bad, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// PATCH /api/onboarding-workflows/[id]/stages/[stageId] — update a stage (deep customization)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const wf = await db.onboardingWorkflow.findFirst({ where: { id, tenantId } })
  if (!wf) return bad("Workflow not found", 404)
  const stage = await db.onboardingStage.findFirst({ where: { id: stageId, workflowId: id } })
  if (!stage) return bad("Stage not found", 404)

  const {
    name, code, order, description, color, icon, stageType, category,
    slaDays, slaWarningDays, isMilestone, wipLimit, blockOnOverflow,
    entryGates, exitGates, defaultOwnerId, ownerType, ownerRole,
    requiresForm, formSchemaId, requiredDocuments, automations,
    isSkippable, isRequired, autoAdvance,
  } = body as any

  const updated = await db.onboardingStage.update({
    where: { id: stageId },
    data: {
      name, code,
      order: typeof order === "number" ? order : undefined,
      description,
      color, icon, stageType, category,
      slaDays: slaDays === null ? null : slaDays,
      slaWarningDays: slaWarningDays === null ? null : slaWarningDays,
      isMilestone,
      wipLimit: wipLimit === null ? null : wipLimit,
      blockOnOverflow,
      entryGates: entryGates ? JSON.stringify(entryGates) : entryGates === null ? null : undefined,
      exitGates: exitGates ? JSON.stringify(exitGates) : exitGates === null ? null : undefined,
      defaultOwnerId: defaultOwnerId === null ? null : defaultOwnerId,
      ownerType, ownerRole,
      requiresForm,
      formSchemaId: formSchemaId === null ? null : formSchemaId,
      requiredDocuments: requiredDocuments ? JSON.stringify(requiredDocuments) : requiredDocuments === null ? null : undefined,
      automations: automations ? JSON.stringify(automations) : automations === null ? null : undefined,
      isSkippable, isRequired, autoAdvance,
    },
    include: { taskTemplates: { orderBy: { order: "asc" } } },
  })
  return ok(updated)
}

// DELETE /api/onboarding-workflows/[id]/stages/[stageId] — delete a stage
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params
  const tenantId = await ensureTenant()
  const wf = await db.onboardingWorkflow.findFirst({ where: { id, tenantId } })
  if (!wf) return bad("Workflow not found", 404)
  const stage = await db.onboardingStage.findFirst({ where: { id: stageId, workflowId: id } })
  if (!stage) return bad("Stage not found", 404)
  await db.onboardingStage.delete({ where: { id: stageId } })
  // Re-order remaining stages
  const remaining = await db.onboardingStage.findMany({ where: { workflowId: id }, orderBy: { order: "asc" } })
  await db.$transaction(
    remaining.map((s, i) => db.onboardingStage.update({ where: { id: s.id }, data: { order: i } }))
  )
  return ok({ deleted: true })
}
