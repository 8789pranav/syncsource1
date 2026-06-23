import { ok, bad, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// PATCH /api/onboarding-candidates/[candidateId]/move — move candidate to a new stage
// Body: { targetStageId: string }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const { targetStageId } = body as any
  if (!targetStageId) return bad("targetStageId is required")

  const cand = await db.onboardingCandidate.findFirst({
    where: { id: candidateId, tenantId },
    include: {
      workflow: { include: { stages: { orderBy: { order: "asc" } } } },
      instance: { include: { stages: true } },
    },
  })
  if (!cand) return bad("Candidate not found", 404)
  if (!cand.instance) return bad("Candidate has no onboarding instance", 400)

  const targetStage = cand.workflow.stages.find((s) => s.id === targetStageId)
  if (!targetStage) return bad("Target stage not found in this workflow", 404)

  const currentInstanceStage = cand.instance.stages.find((s) => s.stageId === cand.currentStageId)
  const targetInstanceStage = cand.instance.stages.find((s) => s.stageId === targetStageId)
  if (!targetInstanceStage) return bad("Target instance stage not found", 404)

  // Check WIP limit on target
  if (targetStage.wipLimit && targetStage.wipLimit > 0) {
    const inTarget = await db.onboardingCandidate.count({
      where: { workflowId: cand.workflowId, currentStageId: targetStageId, status: "Active" },
    })
    if (inTarget >= targetStage.wipLimit && targetStage.blockOnOverflow) {
      return bad(`WIP limit reached for "${targetStage.name}" (${targetStage.wipLimit} max)`, 423)
    }
  }

  const now = new Date()
  const slaDueAt = targetStage.slaDays
    ? new Date(now.getTime() + targetStage.slaDays * 24 * 60 * 60 * 1000)
    : null

  const targetTemplates = await db.onboardingTaskTemplate.findMany({
    where: { stageId: targetStageId },
    orderBy: { order: "asc" },
  })

  await db.$transaction(async (tx) => {
    // 1. Complete the current stage
    if (currentInstanceStage && currentInstanceStage.id !== targetInstanceStage.id) {
      await tx.onboardingInstanceStage.update({
        where: { id: currentInstanceStage.id },
        data: { status: "Completed", completedAt: now },
      })
    }

    // 2. Activate the target stage
    await tx.onboardingInstanceStage.update({
      where: { id: targetInstanceStage.id },
      data: {
        status: "Active",
        enteredAt: now,
        slaDueAt,
        ownerId: targetStage.defaultOwnerId,
      },
    })

    // 3. Create tasks from templates
    if (targetTemplates.length > 0) {
      await tx.onboardingInstanceTask.createMany({
        data: targetTemplates.map((t) => ({
          tenantId,
          instanceId: cand.instance!.id,
          stageId: targetStageId,
          title: t.title,
          description: t.description,
          priority: t.priority,
          category: t.category,
          ownerType: t.ownerType,
          ownerId: t.defaultOwnerId,
          isBlocking: t.isBlocking,
          order: t.order,
          dueDate: t.daysFromStage
            ? new Date(now.getTime() + t.daysFromStage * 24 * 60 * 60 * 1000)
            : null,
        })),
      })
    }

    // 4. Update candidate
    const totalStages = cand.workflow.stages.length
    const progress = Math.round(((targetStage.order + 1) / totalStages) * 100)
    const isLast = targetStage.order === totalStages - 1

    await tx.onboardingCandidate.update({
      where: { id: candidateId },
      data: {
        currentStageId: targetStageId,
        enteredAt: now,
        progress,
        status: isLast ? "Completed" : "Active",
        completedAt: isLast ? now : null,
      },
    })

    // 5. Update instance
    await tx.onboardingInstance.update({
      where: { id: cand.instance!.id },
      data: {
        currentStageOrder: targetStage.order,
        overallProgress: progress,
        isComplete: isLast,
      },
    })
  })

  const updated = await db.onboardingCandidate.findUnique({
    where: { id: candidateId },
    include: {
      currentStage: true,
      workflow: { select: { id: true, name: true, color: true } },
      instance: {
        include: {
          stages: { orderBy: { order: "asc" }, include: { stage: true } },
          tasks: true,
        },
      },
    },
  })
  return ok(updated)
}
