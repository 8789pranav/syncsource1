import { ok, created, bad, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// GET /api/onboarding-workflows/[id]/stages/[stageId]/tasks — list task templates
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params
  const tenantId = await ensureTenant()
  const stage = await db.onboardingStage.findFirst({ where: { id: stageId, workflowId: id, tenantId } })
  if (!stage) return bad("Stage not found", 404)
  const items = await db.onboardingTaskTemplate.findMany({
    where: { stageId },
    orderBy: { order: "asc" },
  })
  return ok({ items })
}

// POST /api/onboarding-workflows/[id]/stages/[stageId]/tasks — add a task template
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const stage = await db.onboardingStage.findFirst({ where: { id: stageId, workflowId: id, tenantId } })
  if (!stage) return bad("Stage not found", 404)
  const { title, description, daysFromStage, ownerType, defaultOwnerId, isBlocking, priority, category, order } = body as any
  if (!title) return bad("title is required")
  const task = await db.onboardingTaskTemplate.create({
    data: {
      tenantId,
      stageId,
      title,
      description: description || null,
      daysFromStage: daysFromStage || 0,
      ownerType: ownerType || "stage_owner",
      defaultOwnerId: defaultOwnerId || null,
      isBlocking: isBlocking || false,
      priority: priority || "Medium",
      category: category || "General",
      order: order ?? 0,
    },
  })
  return created(task)
}
