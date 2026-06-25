import { ok, notFound, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant()
  const { id } = await params
  const cfg = await db.onboardingEntityConfig.findUnique({ where: { id } })
  if (!cfg || cfg.tenantId !== tenantId) return notFound()
  const entity = cfg.entityId ? await db.entity.findUnique({ where: { id: cfg.entityId }, select: { id: true, legalName: true, tradeName: true, code: true } }) : null
  return ok({ ...cfg, entity: entity ? { id: entity.id, name: entity.tradeName || entity.legalName, code: entity.code } : null })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant()
  const { id } = await params
  const existing = await db.onboardingEntityConfig.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== tenantId) return notFound()

  const body = await parseBody(req)
  const {
    useTenantDefault,
    defaultWorkflowId, defaultKanbanBoardId, defaultCandidateFormId,
    defaultDocumentSet, defaultChecklistSet, defaultEmailGroup,
    defaultVerificationRule, defaultApprovalWorkflow,
    defaultCandidatePortalSetting, defaultEmployeeConversionRule,
    defaultHrOwner, defaultRecruiter, defaultReportingManagerRule, defaultSetupRule,
    effectiveFrom, effectiveTo, status,
  } = body as any

  const updated = await db.onboardingEntityConfig.update({
    where: { id },
    data: {
      ...(useTenantDefault !== undefined ? { useTenantDefault } : {}),
      ...(defaultWorkflowId !== undefined ? { defaultWorkflowId: defaultWorkflowId || null } : {}),
      ...(defaultKanbanBoardId !== undefined ? { defaultKanbanBoardId: defaultKanbanBoardId || null } : {}),
      ...(defaultCandidateFormId !== undefined ? { defaultCandidateFormId: defaultCandidateFormId || null } : {}),
      ...(defaultDocumentSet !== undefined ? { defaultDocumentSet: defaultDocumentSet ? JSON.stringify(defaultDocumentSet) : null } : {}),
      ...(defaultChecklistSet !== undefined ? { defaultChecklistSet: defaultChecklistSet ? JSON.stringify(defaultChecklistSet) : null } : {}),
      ...(defaultEmailGroup !== undefined ? { defaultEmailGroup: defaultEmailGroup ? JSON.stringify(defaultEmailGroup) : null } : {}),
      ...(defaultVerificationRule !== undefined ? { defaultVerificationRule: defaultVerificationRule || null } : {}),
      ...(defaultApprovalWorkflow !== undefined ? { defaultApprovalWorkflow: defaultApprovalWorkflow || null } : {}),
      ...(defaultCandidatePortalSetting !== undefined ? { defaultCandidatePortalSetting: defaultCandidatePortalSetting || null } : {}),
      ...(defaultEmployeeConversionRule !== undefined ? { defaultEmployeeConversionRule: defaultEmployeeConversionRule || null } : {}),
      ...(defaultHrOwner !== undefined ? { defaultHrOwner: defaultHrOwner || null } : {}),
      ...(defaultRecruiter !== undefined ? { defaultRecruiter: defaultRecruiter || null } : {}),
      ...(defaultReportingManagerRule !== undefined ? { defaultReportingManagerRule: defaultReportingManagerRule || null } : {}),
      ...(defaultSetupRule !== undefined ? { defaultSetupRule: defaultSetupRule || null } : {}),
      ...(effectiveFrom !== undefined ? { effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null } : {}),
      ...(effectiveTo !== undefined ? { effectiveTo: effectiveTo ? new Date(effectiveTo) : null } : {}),
      ...(status !== undefined ? { status } : {}),
    },
  })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant()
  const { id } = await params
  const existing = await db.onboardingEntityConfig.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== tenantId) return notFound()
  await db.onboardingEntityConfig.delete({ where: { id } })
  return ok({ deleted: true })
}
