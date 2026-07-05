import { ok, created, bad, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// GET /api/onboarding-workflows — list all workflows with stage count + candidate count
export async function GET() {
  const tenantId = await ensureTenant()
  const items = await db.onboardingWorkflow.findMany({
    where: { tenantId },
    include: {
      _count: { select: { stages: true, candidates: true } },
      stages: {
        orderBy: { order: "asc" },
        select: { id: true, name: true, order: true, color: true, stageType: true, category: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
  return ok({ items })
}

// POST /api/onboarding-workflows — create a new workflow (optionally with initial stages)
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const { name, code, description, category, icon, color, applicability, stages } = body as any

  if (!name || !code) return bad("name and code are required")
  const existing = await db.onboardingWorkflow.findUnique({ where: { tenantId_code: { tenantId, code } } })
  if (existing) return bad("Workflow code already exists", 409)

  const wf = await db.onboardingWorkflow.create({
    data: {
      tenantId,
      name,
      code,
      description,
      category: category || "General",
      icon: icon || "LayoutGrid",
      color: color || "#10b981",
      applicability: applicability ? JSON.stringify(applicability) : null,
      stages: stages?.length
        ? {
            create: stages.map((s: any, i: number) => ({
              tenantId,
              name: s.name,
              code: s.code || `STAGE_${i + 1}`,
              order: i,
              color: s.color || "#64748b",
              icon: s.icon || "Circle",
              stageType: s.stageType || (i === 0 ? "start" : i === stages.length - 1 ? "end" : "standard"),
              category: s.category || "process",
              slaDays: s.slaDays ?? null,
              slaWarningDays: s.slaWarningDays ?? null,
              isMilestone: s.isMilestone || false,
              wipLimit: s.wipLimit ?? null,
              blockOnOverflow: s.blockOnOverflow || false,
              ownerType: s.ownerType || "assignee",
              ownerRole: s.ownerRole || null,
              defaultOwnerId: s.defaultOwnerId || null,
              requiresForm: s.requiresForm || false,
              formSchemaId: s.formSchemaId || null,
              requiredDocuments: s.requiredDocuments ? JSON.stringify(s.requiredDocuments) : null,
              entryGates: s.entryGates ? JSON.stringify(s.entryGates) : null,
              exitGates: s.exitGates ? JSON.stringify(s.exitGates) : null,
              automations: s.automations ? JSON.stringify(s.automations) : null,
              isSkippable: s.isSkippable || false,
              isRequired: s.isRequired ?? true,
              autoAdvance: s.autoAdvance || false,
              description: s.description || null,
            })),
          }
        : undefined,
    },
    include: { stages: { orderBy: { order: "asc" } } },
  })
  return created(wf)
}
