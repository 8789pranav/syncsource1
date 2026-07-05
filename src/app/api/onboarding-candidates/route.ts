import { ok, created, bad, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// GET /api/onboarding-candidates — list all candidates (optionally filtered by workflowId)
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant()
  const { searchParams } = new URL(req.url)
  const workflowId = searchParams.get("workflowId")
  const status = searchParams.get("status")

  const items = await db.onboardingCandidate.findMany({
    where: {
      tenantId,
      ...(workflowId ? { workflowId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      workflow: { select: { id: true, name: true, code: true, color: true } },
      currentStage: { select: { id: true, name: true, order: true, color: true, slaDays: true } },
      instance: {
        select: {
          id: true,
          overallProgress: true,
          isComplete: true,
          stages: {
            orderBy: { order: "asc" },
            select: { id: true, status: true, stageId: true, order: true, enteredAt: true, completedAt: true, slaDueAt: true },
          },
          tasks: { select: { id: true, status: true, isBlocking: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
  return ok({ items })
}

// POST /api/onboarding-candidates — create a candidate against a workflow (board selection)
// This instantiates the pipeline: creates OnboardingInstance + OnboardingInstanceStage for every stage
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const {
    workflowId, candidateName, email, phone, employeeCode, designation, department,
    grade, employmentType, joinDate, reportTo, priority, avatarColor, tags, ownerId,
  } = body as any

  if (!workflowId || !candidateName) return bad("workflowId and candidateName are required")

  const wf = await db.onboardingWorkflow.findFirst({
    where: { id: workflowId, tenantId },
    include: { stages: { orderBy: { order: "asc" }, include: { taskTemplates: true } } },
  })
  if (!wf) return bad("Workflow not found", 404)
  if (wf.stages.length === 0) return bad("Workflow has no stages. Add stages first.")

  // Check email uniqueness if provided
  if (email) {
    const dup = await db.onboardingCandidate.findUnique({ where: { tenantId_email: { tenantId, email } } })
    if (dup) return bad("Candidate with this email already exists", 409)
  }

  const firstStage = wf.stages[0]
  const now = new Date()

  // Create candidate + instance + instance stages + tasks in a transaction
  const candidate = await db.$transaction(async (tx) => {
    const cand = await tx.onboardingCandidate.create({
      data: {
        tenantId,
        workflowId,
        candidateName,
        email,
        phone,
        employeeCode,
        designation,
        department,
        grade,
        employmentType: employmentType || "Full-time",
        joinDate: joinDate ? new Date(joinDate) : null,
        reportTo,
        priority: priority || "Medium",
        avatarColor: avatarColor || "#10b981",
        tags: tags ? JSON.stringify(tags) : null,
        ownerId: ownerId || null,
        currentStageId: firstStage.id,
        enteredAt: now,
      },
    })

    // Create instance
    const instance = await tx.onboardingInstance.create({
      data: {
        tenantId,
        candidateId: cand.id,
        workflowId,
        currentStageOrder: 0,
        overallProgress: 0,
        workflowSnapshot: JSON.stringify({
          id: wf.id, name: wf.name, code: wf.code, version: wf.version,
          stages: wf.stages.map((s) => ({ id: s.id, name: s.name, order: s.order })),
        }),
      },
    })

    // Create instance stages
    const slaDue = (slaDays: number | null) =>
      slaDays ? new Date(now.getTime() + slaDays * 24 * 60 * 60 * 1000) : null

    await tx.onboardingInstanceStage.createMany({
      data: wf.stages.map((s) => ({
        tenantId,
        instanceId: instance.id,
        stageId: s.id,
        order: s.order,
        status: s.order === 0 ? "Active" : "Pending",
        enteredAt: s.order === 0 ? now : null,
        slaDueAt: s.order === 0 ? slaDue(s.slaDays) : null,
        ownerId: s.defaultOwnerId,
      })),
    })

    // Create instance tasks from stage 0 task templates
    const firstStageTemplates = wf.stages[0].taskTemplates
    if (firstStageTemplates.length > 0) {
      await tx.onboardingInstanceTask.createMany({
        data: firstStageTemplates.map((t) => ({
          tenantId,
          instanceId: instance.id,
          stageId: firstStage.id,
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

    return cand
  })

  // Fetch full candidate with relations
  const full = await db.onboardingCandidate.findUnique({
    where: { id: candidate.id },
    include: {
      workflow: true,
      currentStage: true,
      instance: {
        include: {
          stages: { orderBy: { order: "asc" } },
          tasks: { orderBy: { order: "asc" } },
        },
      },
    },
  })
  return created(full)
}
