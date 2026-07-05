import { ok, created, bad, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// GET /api/onboarding-entity-config — list all entity configs (with entity name)
export async function GET() {
  const tenantId = await ensureTenant()
  const items = await db.onboardingEntityConfig.findMany({
    where: { tenantId },
    orderBy: { updatedAt: "desc" },
  })

  // Hydrate entity names
  const entityIds = [...new Set(items.map((i) => i.entityId))]
  const entities = entityIds.length
    ? await db.entity.findMany({ where: { id: { in: entityIds } }, select: { id: true, legalName: true, tradeName: true, code: true } })
    : []
  const entityMap = new Map(entities.map((e) => [e.id, e]))

  return ok({
    items: items.map((i) => {
      const e = entityMap.get(i.entityId)
      return {
        ...i,
        entity: e ? { id: e.id, name: e.tradeName || e.legalName, code: e.code } : null,
      }
    }),
  })
}

// POST /api/onboarding-entity-config
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const {
    entityId, useTenantDefault,
    defaultWorkflowId, defaultKanbanBoardId, defaultCandidateFormId,
    defaultDocumentSet, defaultChecklistSet, defaultEmailGroup,
    defaultVerificationRule, defaultApprovalWorkflow,
    defaultCandidatePortalSetting, defaultEmployeeConversionRule,
    defaultHrOwner, defaultRecruiter, defaultReportingManagerRule, defaultSetupRule,
    effectiveFrom, effectiveTo, status,
  } = body as any

  if (!entityId) return bad("entityId is required")

  const existing = await db.onboardingEntityConfig.findUnique({ where: { tenantId_entityId: { tenantId, entityId } } })
  if (existing) return bad("Entity config already exists. Use PATCH to update.", 409)

  const cfg = await db.onboardingEntityConfig.create({
    data: {
      tenantId, entityId,
      useTenantDefault: useTenantDefault ?? true,
      defaultWorkflowId: defaultWorkflowId || null,
      defaultKanbanBoardId: defaultKanbanBoardId || null,
      defaultCandidateFormId: defaultCandidateFormId || null,
      defaultDocumentSet: defaultDocumentSet ? JSON.stringify(defaultDocumentSet) : null,
      defaultChecklistSet: defaultChecklistSet ? JSON.stringify(defaultChecklistSet) : null,
      defaultEmailGroup: defaultEmailGroup ? JSON.stringify(defaultEmailGroup) : null,
      defaultVerificationRule: defaultVerificationRule || null,
      defaultApprovalWorkflow: defaultApprovalWorkflow || null,
      defaultCandidatePortalSetting: defaultCandidatePortalSetting || null,
      defaultEmployeeConversionRule: defaultEmployeeConversionRule || null,
      defaultHrOwner: defaultHrOwner || null,
      defaultRecruiter: defaultRecruiter || null,
      defaultReportingManagerRule: defaultReportingManagerRule || null,
      defaultSetupRule: defaultSetupRule || null,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      status: status || "Active",
    },
  })
  return created(cfg)
}
