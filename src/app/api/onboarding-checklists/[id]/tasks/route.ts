import { ok, notFound, parseBody, ensureTenant, bad } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// POST /api/onboarding-checklists/[id]/tasks — add a task to a checklist
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant()
  const { id } = await params
  const checklist = await db.onboardingChecklist.findUnique({ where: { id } })
  if (!checklist || checklist.tenantId !== tenantId) return notFound()

  const body = await parseBody(req)
  const { name, code, description, ownerType, ownerId, dueDateRule, dueDateOffset, priority, isMandatory, isBlocking, requiresAttachment, requiresComment, requiresApproval, autoCompleteCondition, reminderRule, escalationRule, stageMapping, status } = body as any

  if (!name || !code) return bad("name and code are required")

  // Compute next order
  const maxOrder = await db.onboardingChecklistTask.aggregate({
    where: { checklistId: id },
    _max: { order: true },
  })

  const task = await db.onboardingChecklistTask.create({
    data: {
      tenantId, checklistId: id,
      name, code,
      description: description || null,
      ownerType: ownerType || "hr_owner",
      ownerId: ownerId || null,
      dueDateRule: dueDateRule || "on_joining",
      dueDateOffset: dueDateOffset || 0,
      priority: priority || "Medium",
      isMandatory: isMandatory || false,
      isBlocking: isBlocking || false,
      requiresAttachment: requiresAttachment || false,
      requiresComment: requiresComment || false,
      requiresApproval: requiresApproval || false,
      autoCompleteCondition: autoCompleteCondition || null,
      reminderRule: reminderRule ? JSON.stringify(reminderRule) : null,
      escalationRule: escalationRule ? JSON.stringify(escalationRule) : null,
      stageMapping: stageMapping || null,
      status: status || "Active",
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })
  return ok(task)
}

// PATCH /api/onboarding-checklists/[id]/tasks — bulk reorder
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await ensureTenant()
  const { id } = await params
  const checklist = await db.onboardingChecklist.findUnique({ where: { id } })
  if (!checklist || checklist.tenantId !== tenantId) return notFound()

  const body = await parseBody(req)
  const { orderedIds } = body as any
  if (!Array.isArray(orderedIds)) return bad("orderedIds must be an array")

  await db.$transaction(
    orderedIds.map((taskId: string, i: number) =>
      db.onboardingChecklistTask.update({
        where: { id: taskId, checklistId: id },
        data: { order: i },
      })
    )
  )
  return ok({ reordered: true })
}
