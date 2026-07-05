import { ok, created, bad, parseBody, ensureTenant } from "@/lib/api-helpers"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

// GET /api/onboarding-checklists?category=HR
export async function GET(req: NextRequest) {
  const tenantId = await ensureTenant()
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const status = searchParams.get("status")

  const items = await db.onboardingChecklist.findMany({
    where: {
      tenantId,
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
    },
    include: { _count: { select: { tasks: true } } },
    orderBy: { updatedAt: "desc" },
  })
  return ok({ items })
}

// POST /api/onboarding-checklists
export async function POST(req: NextRequest) {
  const tenantId = await ensureTenant()
  const body = await parseBody(req)
  const { name, code, description, category, scopeType, entityId, departmentId, employeeType, isDefault, status, tasks } = body as any

  if (!name || !code || !category) return bad("name, code and category are required")

  const existing = await db.onboardingChecklist.findUnique({ where: { tenantId_code: { tenantId, code } } })
  if (existing) return bad("Checklist code already exists", 409)

  if (isDefault) {
    await db.onboardingChecklist.updateMany({
      where: { tenantId, category, isDefault: true },
      data: { isDefault: false },
    })
  }

  const checklist = await db.onboardingChecklist.create({
    data: {
      tenantId, name, code, description: description || null, category,
      scopeType: scopeType || "tenant",
      entityId: entityId || null, departmentId: departmentId || null, employeeType: employeeType || null,
      isDefault: isDefault || false,
      status: status || "Active",
      ...(tasks?.length ? {
        tasks: {
          create: tasks.map((t: any, i: number) => ({
            tenantId,
            name: t.name,
            code: t.code || `TASK_${i + 1}`,
            description: t.description || null,
            ownerType: t.ownerType || "hr_owner",
            ownerId: t.ownerId || null,
            dueDateRule: t.dueDateRule || "on_joining",
            dueDateOffset: t.dueDateOffset || 0,
            priority: t.priority || "Medium",
            isMandatory: t.isMandatory || false,
            isBlocking: t.isBlocking || false,
            requiresAttachment: t.requiresAttachment || false,
            requiresComment: t.requiresComment || false,
            requiresApproval: t.requiresApproval || false,
            autoCompleteCondition: t.autoCompleteCondition || null,
            reminderRule: t.reminderRule ? JSON.stringify(t.reminderRule) : null,
            escalationRule: t.escalationRule ? JSON.stringify(t.escalationRule) : null,
            stageMapping: t.stageMapping || null,
            status: t.status || "Active",
            order: t.order ?? i,
          })),
        },
      } : {}),
    },
    include: { tasks: { orderBy: { order: "asc" } }, _count: { select: { tasks: true } } },
  })
  return created(checklist)
}
