import { ok, created, bad, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// GET /api/onboarding-workflows/[id]/stages — list stages (ordered)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tenantId = await ensureTenant()
  const wf = await db.onboardingWorkflow.findFirst({ where: { id, tenantId } })
  if (!wf) return bad("Workflow not found", 404)
  const stages = await db.onboardingStage.findMany({
    where: { workflowId: id },
    orderBy: { order: "asc" },
    include: {
      taskTemplates: { orderBy: { order: "asc" } },
      _count: { select: { instanceStages: true, currentCandidates: true } },
    },
  })
  return ok({ items: stages })
}

// POST /api/onboarding-workflows/[id]/stages — add a stage to the workflow
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const wf = await db.onboardingWorkflow.findFirst({ where: { id, tenantId } })
  if (!wf) return bad("Workflow not found", 404)

  const {
    name, code, order, description, color, icon, stageType, category,
    slaDays, slaWarningDays, isMilestone, wipLimit, blockOnOverflow,
    entryGates, exitGates, defaultOwnerId, ownerType, ownerRole,
    requiresForm, formSchemaId, requiredDocuments, automations,
    isSkippable, isRequired, autoAdvance, taskTemplates,
  } = body as any

  if (!name || !code) return bad("name and code are required")

  // Determine order: append to end if not specified
  let ord = order
  if (ord === undefined || ord === null) {
    const cnt = await db.onboardingStage.count({ where: { workflowId: id } })
    ord = cnt
  }

  const stage = await db.onboardingStage.create({
    data: {
      tenantId,
      workflowId: id,
      name,
      code,
      order: ord,
      description,
      color: color || "#64748b",
      icon: icon || "Circle",
      stageType: stageType || "standard",
      category: category || "process",
      slaDays: slaDays ?? null,
      slaWarningDays: slaWarningDays ?? null,
      isMilestone: isMilestone || false,
      wipLimit: wipLimit ?? null,
      blockOnOverflow: blockOnOverflow || false,
      entryGates: entryGates ? JSON.stringify(entryGates) : null,
      exitGates: exitGates ? JSON.stringify(exitGates) : null,
      defaultOwnerId: defaultOwnerId || null,
      ownerType: ownerType || "assignee",
      ownerRole: ownerRole || null,
      requiresForm: requiresForm || false,
      formSchemaId: formSchemaId || null,
      requiredDocuments: requiredDocuments ? JSON.stringify(requiredDocuments) : null,
      automations: automations ? JSON.stringify(automations) : null,
      isSkippable: isSkippable || false,
      isRequired: isRequired ?? true,
      autoAdvance: autoAdvance || false,
      taskTemplates: taskTemplates?.length
        ? {
            create: taskTemplates.map((t: any, i: number) => ({
              tenantId,
              title: t.title,
              description: t.description || null,
              daysFromStage: t.daysFromStage || 0,
              ownerType: t.ownerType || "stage_owner",
              defaultOwnerId: t.defaultOwnerId || null,
              isBlocking: t.isBlocking || false,
              priority: t.priority || "Medium",
              category: t.category || "General",
              order: t.order ?? i,
            })),
          }
        : undefined,
    },
    include: { taskTemplates: true },
  })
  return created(stage)
}

// PATCH /api/onboarding-workflows/[id]/stages — bulk reorder stages
// Body: { orderedIds: ["stageId1", "stageId2", ...] }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const { orderedIds } = body as any
  if (!Array.isArray(orderedIds)) return bad("orderedIds array is required")
  const wf = await db.onboardingWorkflow.findFirst({ where: { id, tenantId } })
  if (!wf) return bad("Workflow not found", 404)

  await db.$transaction(
    orderedIds.map((stageId: string, i: number) =>
      db.onboardingStage.update({ where: { id: stageId, workflowId: id }, data: { order: i } })
    )
  )
  const stages = await db.onboardingStage.findMany({
    where: { workflowId: id },
    orderBy: { order: "asc" },
  })
  return ok({ items: stages })
}
