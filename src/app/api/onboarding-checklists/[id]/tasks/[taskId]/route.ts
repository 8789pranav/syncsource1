import { ok, notFound, parseBody, ensureTenant, bad } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// PATCH /api/onboarding-checklists/[id]/tasks/[taskId]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const tenantId = await ensureTenant()
  const { id, taskId } = await params
  const task = await db.onboardingChecklistTask.findUnique({ where: { id: taskId } })
  if (!task || task.tenantId !== tenantId || task.checklistId !== id) return notFound()

  const body = await parseBody(req)
  const { name, code, description, ownerType, ownerId, dueDateRule, dueDateOffset, priority, isMandatory, isBlocking, requiresAttachment, requiresComment, requiresApproval, autoCompleteCondition, reminderRule, escalationRule, stageMapping, status, order } = body as any

  const updated = await db.onboardingChecklistTask.update({
    where: { id: taskId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(code !== undefined ? { code } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(ownerType !== undefined ? { ownerType } : {}),
      ...(ownerId !== undefined ? { ownerId: ownerId || null } : {}),
      ...(dueDateRule !== undefined ? { dueDateRule } : {}),
      ...(dueDateOffset !== undefined ? { dueDateOffset } : {}),
      ...(priority !== undefined ? { priority } : {}),
      ...(isMandatory !== undefined ? { isMandatory } : {}),
      ...(isBlocking !== undefined ? { isBlocking } : {}),
      ...(requiresAttachment !== undefined ? { requiresAttachment } : {}),
      ...(requiresComment !== undefined ? { requiresComment } : {}),
      ...(requiresApproval !== undefined ? { requiresApproval } : {}),
      ...(autoCompleteCondition !== undefined ? { autoCompleteCondition: autoCompleteCondition || null } : {}),
      ...(reminderRule !== undefined ? { reminderRule: reminderRule ? (typeof reminderRule === "string" ? reminderRule : JSON.stringify(reminderRule)) : null } : {}),
      ...(escalationRule !== undefined ? { escalationRule: escalationRule ? (typeof escalationRule === "string" ? escalationRule : JSON.stringify(escalationRule)) : null } : {}),
      ...(stageMapping !== undefined ? { stageMapping: stageMapping || null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(order !== undefined ? { order } : {}),
    },
  })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const tenantId = await ensureTenant()
  const { id, taskId } = await params
  const task = await db.onboardingChecklistTask.findUnique({ where: { id: taskId } })
  if (!task || task.tenantId !== tenantId || task.checklistId !== id) return notFound()
  await db.onboardingChecklistTask.delete({ where: { id: taskId } })
  return ok({ deleted: true })
}
